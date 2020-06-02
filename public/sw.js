var FILE_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/index.js",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png"
];

var cacheName = "myCache";
var dataCache = "dataCache";

// Upon installment of service worker where "event" represents installation of the service worker
// We will hang on installing service worker UNTIL we cache all the public (static) files
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(cacheName) // Open the cache using caches interface
        .then(function (cache) {
            console.info('SW cached all files');
            return cache.addAll(FILE_TO_CACHE);
        })
    );
});

self.addEventListener('activate', function (event) {
    console.log('Activated Service Worker and Initializing IndexedDB');
    // The code below is to demonstrate if we want to delete old version cache and cache newer version
    event.waitUntil(
        initializeIndexedDB()
    );
});

// Need fetch event in Offline mode

self.addEventListener('fetch', function (evt) {

    // We are offline
    if (!navigator.onLine) {
        if (evt.request.url.includes("/api/")) {
            evt.respondWith(
                caches.open(dataCache).then(cache => {
                    return fetch(evt.request)
                        .then(response => {
                            // If the response was good, clone it and store it in the cache.
                            if (response.status === 200) {
                                cache.put(evt.request.url, response.clone());
                            }

                            return response;
                        })
                        .catch(err => {
                            // Network request failed, try to get it from the cache.
                            return cache.match(evt.request);
                        });
                }).catch(err => console.log(err))
            );

            return;
        }

        // This is if we are not using API (request)

        evt.respondWith(
            caches.match(evt.request).then(function (response) {
                return response || fetch(evt.request);
            })
        );

    } else {
        console.log("We are online... Let's send data from IndexedDB to MongoDB");
        processIndexedDBData();
    }

});

// Operation with IndexedDB (Event- driven, need to use addEventListener)

function initializeIndexedDB() {
    var request = self.indexedDB.open("My Transaction Database", 1);
    request.onsuccess = function (e) {
        console.log("IndexedDB successful");
    };

    request.onupgradeneeded = function (event) {
        var db = request.result;
        var store = db.createObjectStore("transactions", {
            keyPath: 'id',
            autoIncrement: true
        });

        // OPen an transaction
        var tx = event.target.transaction;

        tx.onsuccess = function (event) {
            console.log('[Transaction] ALL DONE!');
        };

        // Select the write store for transaction
        var selectedStore = tx.objectStore("transactions");

        for (var i = 0; i < 3; i++) {
            var addReq = selectedStore.add({
                "name": "Khoi",
                "value": 1,
                "date": Date.now()
            });
        }

        // var req = selectedStore.getAll();
        // req.onsuccess = function (e) {
        //     console.log(req.result);
        // }
        // Now we get it to display, now just need to find out 1) How to get it from offline mode
        // 2) Give it back when go back online
    };
}

function processIndexedDBData() {
    const request = self.indexedDB.open("My Transaction Database");
    request.onsuccess = function (e) {
        // Succesffuly opened, now grab data in there and console log it 
        const db = request.result;
        const tx = db.transaction("transactions", "readwrite");
        const objectStore = tx.objectStore("transactions");

        const req = objectStore.getAll();

        req.onsuccess = async function (e) {
            let offlineData = req.result;
            const response = await fetch("/api/transaction/bulk", {
                method: "POST",
                body: JSON.stringify(offlineData),
                headers: {
                  Accept: "application/json, text/plain, */*",
                  "Content-Type": "application/json"
                }
              });
        }

    };
}