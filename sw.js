// Service Worker for Lottery PWA - Disabled for debugging
// To re-enable, uncomment the code below

// Clear all caches and unregister
if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
    });
}

console.log('Service Worker disabled for debugging');