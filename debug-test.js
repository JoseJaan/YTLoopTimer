// Arquivo de teste para debug - Cole no console do YouTube para testar manualmente

console.log('=== TESTE DE DEBUG DA EXTENSÃO ===');

// Teste 1: Verificar se há elemento video
console.log('1. Procurando elemento video...');
const video = document.querySelector('video');
console.log('Video encontrado:', video);

if (video) {
  console.log('- Duração:', video.duration);
  console.log('- Tempo atual:', video.currentTime);
  console.log('- Estado:', video.paused ? 'pausado' : 'tocando');
}

// Teste 2: Verificar URL e Video ID
console.log('2. Verificando URL...');
console.log('- URL atual:', location.href);
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('v');
console.log('- Video ID:', videoId);

// Teste 3: Verificar APIs disponíveis
console.log('3. Verificando APIs...');
console.log('- browser definido:', typeof browser !== 'undefined');
console.log('- chrome definido:', typeof chrome !== 'undefined');

if (typeof browser !== 'undefined') {
  console.log('- browser.storage:', !!browser.storage);
  console.log('- browser.runtime:', !!browser.runtime);
  console.log('- browser.tabs:', !!browser.tabs);
}

if (typeof chrome !== 'undefined') {
  console.log('- chrome.storage:', !!chrome.storage);
  console.log('- chrome.runtime:', !!chrome.runtime);
  console.log('- chrome.tabs:', !!chrome.tabs);
}

// Teste 4: Testar evento ended
if (video) {
  console.log('4. Testando evento ended...');
  let endedListenerAdded = false;
  
  const testEndedListener = () => {
    console.log('EVENTO ENDED DISPARADO!');
  };
  
  video.addEventListener('ended', testEndedListener);
  console.log('Listener de teste adicionado. Termine o vídeo para testar.');
  
  // Remove o listener após 30 segundos
  setTimeout(() => {
    video.removeEventListener('ended', testEndedListener);
    console.log('Listener de teste removido.');
  }, 30000);
}

// Teste 5: Verificar se content script está carregado
console.log('5. Verificando content script...');
console.log('- youtubeLooper existe:', typeof youtubeLooper !== 'undefined');

console.log('=== FIM DO TESTE ===');