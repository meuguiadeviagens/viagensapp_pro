// Define um nome e versão para o seu cache
// IMPORTANTE: Mude este nome (ex: v1.0.2) toda vez que atualizar seus arquivos
const CACHE_NAME = 'meu-guia-de-viagens-v1.2.14';

// Lista de arquivos principais do seu "App Shell"
const APP_SHELL_URLS = [
  './', // O diretório raiz (geralmente seu index.html ou app.html)
  'app.html',
  'manifest.json',
  'logo_meuguiadeviagens.png',
  'favicon.png',
  // Scripts e estilos essenciais que você usa no <head>
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // Scripts do Firebase
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js'
];

// --- 1. Evento de Instalação ---
// Cacheia os arquivos do App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nova versão...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto. Cacheando o App Shell...');
        // Tenta adicionar todos os URLs. Se um falhar, a instalação pode falhar.
        // Assegure-se que todos os caminhos em APP_SHELL_URLS estão corretos.
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => {
        console.log('[SW] App Shell cacheado com sucesso.');
        // NÃO chamamos self.skipWaiting() aqui. Esperamos a mensagem.
      })
      .catch((error) => {
        console.error('[SW] Falha ao cachear o App Shell:', error);
      })
  );
});

// --- 2. Evento de Ativação ---
// Limpa os caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando e assumindo o controle...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Se o nome do cache não for o ATUAL, deleta o cache antigo
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Limpando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Assume o controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// --- 3. Evento de Mensagem ---
// Escuta a mensagem do app para "pular a espera"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Mensagem SKIP_WAITING recebida. Ativando nova versão...');
    self.skipWaiting();
  }
});

// --- 4. Evento de Fetch ---
// Decide como responder às requisições: via cache ou rede
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- Estratégia 1: Ignorar Firebase (Sempre ir para a rede) ---
  // Não cacheamos nada do Auth ou Realtime Database.
  if (url.origin.includes('firebaseio.com') || url.origin.includes('firebaseapp.com')) {
    // Deixa o navegador lidar (network-only)
    return;
  }

  // --- Estratégia 2: Stale-While-Revalidate (Para CDNs e Fontes) ---
  // Responde rápido com o cache, mas busca uma atualização em segundo plano.
  if (url.origin.includes('cdn.tailwindcss.com') ||
      url.origin.includes('cdn.jsdelivr.net') ||
      url.origin.includes('fonts.googleapis.com') ||
      url.origin.includes('fonts.gstatic.com')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Busca na rede em paralelo
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          // Retorna o cache (rápido) ou espera a rede se não tiver no cache
          return cachedResponse || fetchPromise;
        });
      })
    );
    return; // Para a execução aqui
  }

  // --- Estratégia 3: Cache-First (Para nosso App Shell e imagens) ---
  // Responde com o cache. Se não estiver no cache, vai para a rede e salva.
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Se tiver no cache, retorna
        if (response) {
          return response;
        }
        
        // Se não, vai para a rede
        return fetch(request).then((networkResponse) => {
          // Se a resposta for válida, salva no cache para a próxima vez
          if (networkResponse && networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
      .catch(error => {
        // Em caso de falha total (offline e sem cache)
        console.error('[SW] Falha no fetch:', request.url, error);
        // Você pode retornar uma página offline aqui se quiser
      })
  );
});

































































