var FILE_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/index.js",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png"
];

var cacheName = "myCache";

// Upon installment of service worker where "event" represents installation of the service worker
// We will hang on installing service worker UNTIL we cache all the public (static) files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName) // Open the cache using caches interface
        .then(function(cache) {
            console.info('SW cached all files');
            return cache.addAll(FILE_TO_CACHE);
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('Activated sw.js');
    // The code below is to demonstrate if we want to delete old version cache and cache newer version
    // event.waitUntil(
    //     caches.keys()
    //     .then(function(cacheNames) {
    //         return Promise.all(
    //             cacheNames.map(function(cName) {
    //                 if(cName !== cacheName){
    //                     return caches.delete(cName);
    //                 }
    //             })
    //         );
    //     })
    // );
});

// Need fetch event in Offline mode

self.addEventListener('fetch', function(event){
    console.log("This is request ");
    console.log(event.request);
    event.respondWith(
        caches.match(event.request).then(res => {
            if(res){
                return res
            }

            return fetch(event.request, {credentials: 'include'});
        })
    )
});