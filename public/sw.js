var FILE_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/index.js",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
    "https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css",
    "https://cdn.jsdelivr.net/npm/chart.js@2.8.0"
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
        // If we get a post request for information!
        if (evt.request.method == "POST") {
            evt.request.json().then(res => {
                const request = self.indexedDB.open("My Transaction Database");
                request.onsuccess = function(e){
                    const db = request.result;
                    const tx = db.transaction("transactions", "readwrite");
                    const objectStore = tx.objectStore("transactions");
                    const addToDBRequest = objectStore.add(res);
    
                    addToDBRequest.onsuccess = function(){
                        console.log("Added to Indxed DB successfully");
                        return;
                    }
                }
            });
        }

        // This is if we are not using API (request) then we only need to serve static files
        console.log("Serving static files from cache");
        evt.respondWith(
            caches.match(evt.request).then(function (response) {
                console.log(evt.request);
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
    };
}

function processIndexedDBData() {
    const request = self.indexedDB.open("My Transaction Database");
    request.onsuccess = function (e) {
        // Succesfully opened, now grab data from there and console log it 
        const db = request.result;
        const tx = db.transaction("transactions", "readwrite");
        const objectStore = tx.objectStore("transactions");

        const req = objectStore.getAll();

        req.onsuccess = async function (e) {
            let offlineData = req.result;

            if(offlineData){
                // If there is nothing in offlineData then we don't need to do anything
                const response = await fetch("/api/transaction/bulk", {
                    method: "POST",
                    body: JSON.stringify(offlineData),
                    headers: {
                      Accept: "application/json, text/plain, */*",
                      "Content-Type": "application/json"
                    }
                });

                // At this point, we need to open a second transaction in order to delete all offline data
                const tx2 = db.transaction("transactions", "readwrite");
                const sameObjectStore = tx2.objectStore("transactions");
                // Now delete all the data in IndexedDB :) 
                const deleteRequest = sameObjectStore.clear();

                deleteRequest.onsuccess = function(e){
                    console.log("Finished deleting all in IndexedDB");
                }
            }
          
        }

    };
}
