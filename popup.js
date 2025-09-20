// YouTube Loop Timer - Popup Script

console.log('[YT Looper Popup] Script carregado');

document.addEventListener('DOMContentLoaded', function() {
  console.log('[YT Looper Popup] DOM carregado');
  const setLoopBtn = document.getElementById('set-loop');
  const useCurrentBtn = document.getElementById('use-current');
  const disableLoopBtn = document.getElementById('disable-loop');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const videoStatus = document.getElementById('video-status');
  const loopStatus = document.getElementById('loop-status');
  
  // Função para formatar tempo
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Função para enviar mensagem para o content script
  async function sendMessage(message) {
    console.log('[YT Looper Popup] Enviando mensagem:', message);
    
    try {
      // Suporte para Firefox e Chrome
      const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
      
      if (!tabsAPI) {
        console.error('[YT Looper Popup] API de tabs não disponível');
        return { error: 'API de tabs não disponível' };
      }
      
      const tabs = await new Promise((resolve, reject) => {
        tabsAPI.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tabs);
          }
        });
      });
      
      console.log('[YT Looper Popup] Tabs encontradas:', tabs);
      
      if (tabs[0]) {
        console.log('[YT Looper Popup] Enviando para tab:', tabs[0].id, tabs[0].url);
        
        return await new Promise((resolve, reject) => {
          if (typeof browser !== 'undefined' && browser.tabs) {
            browser.tabs.sendMessage(tabs[0].id, message).then(resolve).catch(reject);
          } else if (chrome?.tabs) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
              if (chrome.runtime.lastError) {
                console.error('[YT Looper Popup] Erro ao enviar mensagem:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                console.log('[YT Looper Popup] Resposta recebida:', response);
                resolve(response);
              }
            });
          }
        });
      } else {
        console.error('[YT Looper Popup] Nenhuma tab ativa encontrada');
        return { error: 'Nenhuma tab ativa encontrada' };
      }
    } catch (error) {
      console.error('[YT Looper Popup] Erro ao enviar mensagem:', error);
      return { error: 'Erro de comunicação: ' + error.message };
    }
  }
  
  // Função para verificar se estamos no YouTube
  async function checkYouTube() {
    try {
      const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
      
      const tabs = await new Promise((resolve) => {
        tabsAPI.query({ active: true, currentWindow: true }, resolve);
      });
      
      const isYouTube = tabs[0] && tabs[0].url.includes('youtube.com/watch');
      console.log('[YT Looper Popup] Verificação YouTube:', isYouTube, 'URL:', tabs[0]?.url);
      return isYouTube;
    } catch (error) {
      console.error('[YT Looper Popup] Erro ao verificar YouTube:', error);
      return false;
    }
  }
  
  // Função para atualizar status
  async function updateStatus() {
    console.log('[YT Looper Popup] Atualizando status...');
    
    const isYouTube = await checkYouTube();
    
    if (!isYouTube) {
      console.log('[YT Looper Popup] Não está no YouTube');
      videoStatus.textContent = 'Abra um vídeo do YouTube';
      loopStatus.textContent = '';
      setButtonsEnabled(false);
      return;
    }
    
    console.log('[YT Looper Popup] Está no YouTube, obtendo status...');
    const response = await sendMessage({ action: 'getStatus' });
    
    console.log('[YT Looper Popup] Resposta do getStatus:', response);
    
    if (response && !response.error) {
      videoStatus.textContent = `Tempo atual: ${formatTime(response.currentTime)}`;
      
      if (response.isActive) {
        loopStatus.textContent = `Loop ativo: ${formatTime(response.loopTime)}`;
        loopStatus.className = 'active';
      } else {
        loopStatus.textContent = 'Loop inativo';
        loopStatus.className = 'inactive';
      }
      
      setButtonsEnabled(true);
    } else {
      console.error('[YT Looper Popup] Erro na resposta:', response);
      videoStatus.textContent = 'Erro ao conectar com o vídeo';
      loopStatus.textContent = response ? response.error : 'Sem resposta';
      setButtonsEnabled(false);
    }
  }
  
  // Função para habilitar/desabilitar botões
  function setButtonsEnabled(enabled) {
    setLoopBtn.disabled = !enabled;
    useCurrentBtn.disabled = !enabled;
    disableLoopBtn.disabled = !enabled;
    minutesInput.disabled = !enabled;
    secondsInput.disabled = !enabled;
  }
  
  // Event listeners
  setLoopBtn.addEventListener('click', async function() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds < 0) {
      alert('Por favor, insira um tempo válido');
      return;
    }
    
    const response = await sendMessage({
      action: 'setLoopTime',
      time: totalSeconds
    });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Erro ao definir o loop');
    }
  });
  
  useCurrentBtn.addEventListener('click', async function() {
    const response = await sendMessage({ action: 'setCurrentTime' });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Erro ao definir o tempo atual');
    }
  });
  
  disableLoopBtn.addEventListener('click', async function() {
    const response = await sendMessage({ action: 'disableLoop' });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Erro ao desativar o loop');
    }
  });
  
  // Validação dos inputs
  minutesInput.addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    if (this.value > 999) this.value = 999;
  });
  
  secondsInput.addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    if (this.value > 59) this.value = 59;
  });
  
  // Atualiza status inicialmente e a cada 2 segundos
  updateStatus();
  setInterval(updateStatus, 2000);
});