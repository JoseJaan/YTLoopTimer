// YouTube Loop Timer - Content Script

console.log('[YT Looper] Script carregado');

class YouTubeLooper {
  constructor() {
    console.log('[YT Looper] Construtor chamado');
    this.video = null;
    this.loopStartTime = 0;
    this.isLoopActive = false;
    this.eventListenerAdded = false;
    this.timeUpdateHandler = null;
    this.endedHandler = null;
    this.currentVideoId = null;
    
    this.init();
  }
  
  init() {
    console.log('[YT Looper] Init chamado');
    console.log('[YT Looper] URL atual:', location.href);
    console.log('[YT Looper] Document readyState:', document.readyState);
    
    // Aguarda o carregamento da página
    if (document.readyState === 'loading') {
      console.log('[YT Looper] Aguardando DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[YT Looper] DOMContentLoaded disparado');
        this.setupLooper();
      });
    } else {
      console.log('[YT Looper] DOM já carregado, chamando setupLooper');
      this.setupLooper();
    }
    
    // Monitora mudanças de página no YouTube (SPA)
    let lastUrl = location.href;
    console.log('[YT Looper] Configurando MutationObserver');
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        console.log('[YT Looper] URL mudou de', lastUrl, 'para', url);
        lastUrl = url;
        // Reset do estado quando muda de vídeo
        this.eventListenerAdded = false;
        this.currentVideoId = null;
        setTimeout(() => {
          console.log('[YT Looper] Chamando setupLooper após mudança de URL');
          this.setupLooper();
        }, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }
  
  setupLooper() {
    console.log('[YT Looper] SetupLooper chamado');
    
    // Aguarda o vídeo estar disponível
    const checkForVideo = () => {
      console.log('[YT Looper] Procurando por elemento video...');
      this.video = document.querySelector('video');
      
      if (this.video && !this.eventListenerAdded) {
        console.log('[YT Looper] Vídeo encontrado:', this.video);
        console.log('[YT Looper] Duração do vídeo:', this.video.duration);
        console.log('[YT Looper] Tempo atual:', this.video.currentTime);
        this.addVideoEventListeners();
        this.loadSavedSettings();
      } else if (!this.video) {
        console.log('[YT Looper] Vídeo não encontrado, tentando novamente em 1s');
        setTimeout(checkForVideo, 1000);
      } else {
        console.log('[YT Looper] Vídeo encontrado mas listeners já adicionados');
      }
    };
    
    checkForVideo();
  }
  
  addVideoEventListeners() {
    if (this.eventListenerAdded) {
      console.log('[YT Looper] Event listeners já foram adicionados');
      return;
    }
    
    console.log('[YT Looper] Adicionando event listeners ao vídeo');
    
    // Remove listeners anteriores se existirem
    if (this.timeUpdateHandler) {
      this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
    }
    if (this.endedHandler) {
      this.video.removeEventListener('ended', this.endedHandler);
    }
    
    // Handler para timeupdate - monitora se estamos próximos do fim
    this.timeUpdateHandler = () => {
      if (this.isLoopActive && this.video) {
        const currentTime = this.video.currentTime;
        const duration = this.video.duration;
        
        // Se estamos muito próximos do fim (0.5 segundos), reinicia
        if (duration - currentTime <= 0.5 && currentTime > 0) {
          console.log('[YT Looper] Próximo do fim, reiniciando preventivamente');
          console.log('[YT Looper] CurrentTime:', currentTime, 'Duration:', duration);
          this.restartAtLoopTime();
        }
      }
    };
    
    // Handler para ended - backup caso o timeupdate não funcione
    this.endedHandler = () => {
      console.log('[YT Looper] Evento "ended" disparado');
      console.log('[YT Looper] Loop ativo?', this.isLoopActive);
      console.log('[YT Looper] Tempo de loop:', this.loopStartTime);
      
      if (this.isLoopActive) {
        console.log('[YT Looper] Reiniciando vídeo (backup)...');
        // Pequeno delay para evitar conflitos
        setTimeout(() => {
          this.restartAtLoopTime();
        }, 100);
      } else {
        console.log('[YT Looper] Loop não está ativo, não reiniciando');
      }
    };
    
    // Adiciona os listeners
    this.video.addEventListener('timeupdate', this.timeUpdateHandler);
    this.video.addEventListener('ended', this.endedHandler);
    
    // Adiciona outros listeners úteis para debug
    this.video.addEventListener('loadedmetadata', () => {
      console.log('[YT Looper] Metadata carregada - Duração:', this.video.duration);
    });
    
    // Listener para detectar quando o vídeo é pausado/interrompido
    this.video.addEventListener('pause', () => {
      console.log('[YT Looper] Vídeo pausado');
    });
    
    this.video.addEventListener('play', () => {
      console.log('[YT Looper] Vídeo reproduzindo');
    });
    
    this.eventListenerAdded = true;
    console.log('[YT Looper] Event listeners adicionados com sucesso');
  }
  
  restartAtLoopTime() {
    console.log('[YT Looper] RestartAtLoopTime chamado');
    
    if (!this.video || !this.isLoopActive) {
      console.log('[YT Looper] Vídeo não disponível ou loop inativo');
      return;
    }
    
    // Verifica se ainda estamos no mesmo vídeo
    const currentVideoId = this.getVideoId();
    if (this.currentVideoId && currentVideoId !== this.currentVideoId) {
      console.log('[YT Looper] Vídeo mudou, cancelando restart');
      return;
    }
    
    console.log('[YT Looper] Definindo currentTime para:', this.loopStartTime);
    console.log('[YT Looper] CurrentTime antes:', this.video.currentTime);
    
    try {
      // Previne o YouTube de avançar para o próximo vídeo
      this.preventAutoplay();
      
      this.video.currentTime = this.loopStartTime;
      
      console.log('[YT Looper] CurrentTime depois:', this.video.currentTime);
      console.log('[YT Looper] Tentando dar play...');
      
      // Garante que o vídeo está sendo reproduzido
      const playPromise = this.video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[YT Looper] Play executado com sucesso');
        }).catch(error => {
          console.error('[YT Looper] Erro ao dar play:', error);
          // Tenta novamente após um pequeno delay
          setTimeout(() => {
            console.log('[YT Looper] Tentando play novamente...');
            this.video.play().catch(e => {
              console.error('[YT Looper] Segundo erro ao dar play:', e);
            });
          }, 100);
        });
      } else {
        console.log('[YT Looper] Play() não retornou Promise');
      }
    } catch (error) {
      console.error('[YT Looper] Erro geral ao reiniciar:', error);
    }
  }
  
  // Função para prevenir autoplay do próximo vídeo
  preventAutoplay() {
    console.log('[YT Looper] Prevenindo autoplay...');
    
    try {
      // Tenta desabilitar autoplay através de vários métodos
      const autoplayButton = document.querySelector('[data-tooltip-target-id="ytp-autonav-toggle-button"]');
      if (autoplayButton && autoplayButton.getAttribute('aria-pressed') === 'true') {
        console.log('[YT Looper] Tentando desabilitar autoplay via botão');
        autoplayButton.click();
      }
      
      // Tenta via YouTube API interna se disponível
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        window.ytplayer.config.args.autoplay = '0';
        console.log('[YT Looper] Autoplay desabilitado via ytplayer.config');
      }
      
      // Remove parâmetros de autoplay da URL se necessário
      const url = new URL(window.location.href);
      if (url.searchParams.has('autoplay')) {
        url.searchParams.set('autoplay', '0');
        console.log('[YT Looper] Parâmetro autoplay definido como 0');
      }
      
    } catch (error) {
      console.error('[YT Looper] Erro ao prevenir autoplay:', error);
    }
  }
  
  setLoopTime(timeInSeconds) {
    console.log('[YT Looper] SetLoopTime chamado com:', timeInSeconds);
    
    this.loopStartTime = timeInSeconds;
    this.isLoopActive = true;
    this.currentVideoId = this.getVideoId(); // Salva o ID do vídeo atual
    
    console.log('[YT Looper] Loop configurado - Tempo:', this.loopStartTime, 'Ativo:', this.isLoopActive, 'VideoID:', this.currentVideoId);
    
    // Salva as configurações
    const videoId = this.getVideoId();
    console.log('[YT Looper] Video ID:', videoId);
    
    if (videoId) {
      const data = {
        [videoId]: {
          loopStartTime: timeInSeconds,
          isActive: true
        }
      };
      
      console.log('[YT Looper] Salvando dados:', data);
      
      // Verifica se browser.storage existe
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.set(data).then(() => {
          console.log('[YT Looper] Dados salvos com sucesso');
        }).catch(error => {
          console.error('[YT Looper] Erro ao salvar dados:', error);
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        console.log('[YT Looper] Usando chrome.storage');
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.error('[YT Looper] Erro ao salvar dados (chrome):', chrome.runtime.lastError);
          } else {
            console.log('[YT Looper] Dados salvos com sucesso (chrome)');
          }
        });
      } else {
        console.error('[YT Looper] API de storage não disponível');
      }
    }
    
  }
  
  getCurrentTime() {
    const currentTime = this.video ? Math.floor(this.video.currentTime) : 0;
    console.log('[YT Looper] GetCurrentTime:', currentTime);
    return currentTime;
  }
  
  disableLoop() {
    console.log('[YT Looper] DisableLoop chamado');
    
    this.isLoopActive = false;
    this.currentVideoId = null;
    const videoId = this.getVideoId();
    
    if (videoId) {
      const data = {
        [videoId]: {
          loopStartTime: this.loopStartTime,
          isActive: false
        }
      };
      
      console.log('[YT Looper] Salvando desativação:', data);
      
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.set(data);
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data);
      }
    }
    
    this.showNotification('Loop desativado');
  }
  
  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    console.log('[YT Looper] GetVideoId:', videoId, 'URL:', window.location.href);
    return videoId;
  }
  
  loadSavedSettings() {
    console.log('[YT Looper] LoadSavedSettings chamado');
    
    const videoId = this.getVideoId();
    this.currentVideoId = videoId;
    
    if (videoId) {
      console.log('[YT Looper] Carregando configurações para vídeo:', videoId);
      
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.get(videoId).then(result => {
          console.log('[YT Looper] Dados carregados:', result);
          if (result[videoId]) {
            this.loopStartTime = result[videoId].loopStartTime;
            this.isLoopActive = result[videoId].isActive;
            console.log('[YT Looper] Configurações restauradas - Tempo:', this.loopStartTime, 'Ativo:', this.isLoopActive);
          } else {
            console.log('[YT Looper] Nenhuma configuração salva para este vídeo');
          }
        }).catch(error => {
          console.error('[YT Looper] Erro ao carregar configurações:', error);
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([videoId], (result) => {
          console.log('[YT Looper] Dados carregados (chrome):', result);
          if (result[videoId]) {
            this.loopStartTime = result[videoId].loopStartTime;
            this.isLoopActive = result[videoId].isActive;
            console.log('[YT Looper] Configurações restauradas (chrome) - Tempo:', this.loopStartTime, 'Ativo:', this.isLoopActive);
          }
        });
      }
    } else {
      console.log('[YT Looper] Não é possível carregar configurações - Video ID não encontrado');
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  
  getStatus() {
    const status = {
      isActive: this.isLoopActive,
      loopTime: this.loopStartTime,
      currentTime: this.getCurrentTime(),
      videoId: this.getVideoId()
    };
    
    console.log('[YT Looper] GetStatus retornando:', status);
    return status;
  }
}

// Inicializa o looper
console.log('[YT Looper] Inicializando YouTubeLooper...');
const youtubeLooper = new YouTubeLooper();

// Comunicação com o popup
console.log('[YT Looper] Configurando listener de mensagens...');

// Suporte para Firefox e Chrome
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

if (runtimeAPI && runtimeAPI.onMessage) {
  runtimeAPI.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[YT Looper] Mensagem recebida:', request);
    
    switch (request.action) {
      case 'setLoopTime':
        console.log('[YT Looper] Processando setLoopTime:', request.time);
        youtubeLooper.setLoopTime(request.time);
        sendResponse({ success: true });
        break;
        
      case 'setCurrentTime':
        console.log('[YT Looper] Processando setCurrentTime');
        youtubeLooper.setLoopTime(youtubeLooper.getCurrentTime());
        sendResponse({ success: true });
        break;
        
      case 'disableLoop':
        console.log('[YT Looper] Processando disableLoop');
        youtubeLooper.disableLoop();
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        console.log('[YT Looper] Processando getStatus');
        const status = youtubeLooper.getStatus();
        sendResponse(status);
        break;
        
      default:
        console.log('[YT Looper] Ação não reconhecida:', request.action);
        sendResponse({ error: 'Ação não reconhecida' });
    }
    
    return true; // Indica resposta assíncrona
  });
  
  console.log('[YT Looper] Listener de mensagens configurado');
} else {
  console.error('[YT Looper] API de runtime não disponível');
}