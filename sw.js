let queryData = [...location.search.matchAll(/[\?&]*([^=&]+)(?:=([^&=]+)|)/g)]
const queryVars = {};
for (let q of queryData) {
    queryVars[q[1]] = q[2];
}

let baseURL = location.pathname.split("sw.js")[0];

const precacheResources = [
    "favicon.ico",
    "icon.svg",
    "icon192.png",
    "icon512.png",
    "game.js",
    "style.css",
    "dialogs/credits.md",
    "dialogs/how_to_play.md",
    "wordleblitz.txt",
    "wordlists/wordle.txt",
    "wordlists/wordlecommon.txt",
    "wordlists/CSW2104common.txt",
    "wordlists/CSW2104final.txt",
    "wordlists/CSW2106common.txt",
    "wordlists/CSW2106final.txt",
    "quickElement.js",
].map(v=>baseURL+v);

const allowedOrigins = [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net"
];

const cache = self.caches.open(queryVars["v"]);

async function cacheFirst(req) {
    const c = await cache;
    const cacheRes = await c.match(req);
    if (cacheRes) return cacheRes;
    try {
        const networkRes = await fetch(req);
        if (networkRes.ok) c.put(req,networkRes.clone());
        return networkRes;
    } catch (e) {
        console.error(e);
        return Response.error()
    }
}

async function cacheFirstWithRefresh(req) {
    const c = await cache;
    const fetchRes = fetch(req).then(async networkRes=>{
        if (networkRes.ok) c.put(req,networkRes.clone())
        return networkRes;
    });
    return (await c.match(req)) || (await fetchRes)
}

async function networkFirst(req) {
    const c = await cache;
    try {
        const networkRes = await fetch(req);
        if (networkRes.ok) c.put(req,networkRes.clone());
        return networkRes;
    } catch (e) {
        const cacheRes = await c.match(req)
        return cacheRes || Response.error()
    }
}

async function precache() {
    const c = await cache;
    return c.addAll(precacheResources);
}

self.addEventListener("fetch",(e)=>{
    const url = new URL(e.request.url);
    if (url.origin === location.origin) {
        if (url.pathname == baseURL || url.pathname == baseURL+"index.html") {
            e.respondWith(networkFirst(e.request))
        } else if (precacheResources.includes(url.pathname)) {
            e.respondWith(cacheFirst(e.request))
        } else {
            e.respondWith(cacheFirstWithRefresh(e.request))
        }
    } else if (allowedOrigins.includes(url.origin)) {
        e.respondWith(cacheFirst(e.request))
    }
    
})

self.addEventListener("install",(e)=>{
    e.waitUntil(precache())
})