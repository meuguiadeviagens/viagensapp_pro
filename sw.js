const CACHE_NAME = 'meu-guia-de-viagens-v1';

// Arquivos que serão salvos em cache para o app funcionar offline
const assetsToCache = [
  './app.html',
  './manifest.json',
  './icon-512.png',
  './logo_meuguiadeviagens.png',
  './favicon.png'
];

// Evento de 'install': Ocorre quando o Service Worker é instalado
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto. Adicionando assets...');
        return cache.addAll(assetsToCache);
      })
  );
});

// Evento de 'fetch': Intercepta todas as requisições de rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrarmos no cache, retornamos a resposta do cache
        if (response) {
          return response;
        }
        // Se não, fazemos a requisição de rede
        return fetch(event.request);
      })
  );
});