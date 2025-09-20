// YouTube Loop Timer - Popup Script

console.log('[YT Looper Popup] Script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('[YT Looper Popup] DOM loaded');
  const setLoopBtn = document.getElementById('set-loop');
  const useCurrentBtn = document.getElementById('use-current');
  const disableLoopBtn = document.getElementById('disable-loop');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const loopStatus = document.getElementById('loop-status');
  
  // Format time function
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Send message to content script
  async function sendMessage(message) {
    console.log('[YT Looper Popup] Sending message:', message);
    
    try {
      // Support for Firefox and Chrome
      const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
      
      if (!tabsAPI) {
        console.error('[YT Looper Popup] Tabs API not available');
        return { error: 'Tabs API not available' };
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
      
      console.log('[YT Looper Popup] Found tabs:', tabs);
      
      if (tabs[0]) {
        console.log('[YT Looper Popup] Sending to tab:', tabs[0].id, tabs[0].url);
        
        return await new Promise((resolve, reject) => {
          if (typeof browser !== 'undefined' && browser.tabs) {
            browser.tabs.sendMessage(tabs[0].id, message).then(resolve).catch(reject);
          } else if (chrome?.tabs) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
              if (chrome.runtime.lastError) {
                console.error('[YT Looper Popup] Error sending message:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                console.log('[YT Looper Popup] Response received:', response);
                resolve(response);
              }
            });
          }
        });
      } else {
        console.error('[YT Looper Popup] No active tab found');
        return { error: 'No active tab found' };
      }
    } catch (error) {
      console.error('[YT Looper Popup] Error sending message:', error);
      return { error: 'Communication error: ' + error.message };
    }
  }
  
  // Check if we're on YouTube
  async function checkYouTube() {
    try {
      const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
      
      const tabs = await new Promise((resolve) => {
        tabsAPI.query({ active: true, currentWindow: true }, resolve);
      });
      
      const isYouTube = tabs[0] && tabs[0].url.includes('youtube.com/watch');
      console.log('[YT Looper Popup] YouTube check:', isYouTube, 'URL:', tabs[0]?.url);
      return isYouTube;
    } catch (error) {
      console.error('[YT Looper Popup] Error checking YouTube:', error);
      return false;
    }
  }
  
  // Update status
  async function updateStatus() {
    console.log('[YT Looper Popup] Updating status...');
    
    const isYouTube = await checkYouTube();
    
    if (!isYouTube) {
      console.log('[YT Looper Popup] Not on YouTube');
      loopStatus.textContent = 'Open a YouTube video';
      loopStatus.className = 'inactive';
      setButtonsEnabled(false);
      return;
    }
    
    console.log('[YT Looper Popup] On YouTube, getting status...');
    const response = await sendMessage({ action: 'getStatus' });
    
    console.log('[YT Looper Popup] getStatus response:', response);
    
    if (response && !response.error) {
      if (response.isActive) {
        loopStatus.textContent = `Loop active at ${formatTime(response.loopTime)}`;
        loopStatus.className = 'active';
      } else {
        loopStatus.textContent = 'Loop inactive';
        loopStatus.className = 'inactive';
      }
      
      setButtonsEnabled(true);
    } else {
      console.error('[YT Looper Popup] Error in response:', response);
      loopStatus.textContent = 'Connection error';
      loopStatus.className = 'inactive';
      setButtonsEnabled(false);
    }
  }
  
  // Enable/disable buttons
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
      alert('Please enter a valid time');
      return;
    }
    
    const response = await sendMessage({
      action: 'setLoopTime',
      time: totalSeconds
    });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Error setting loop');
    }
  });
  
  useCurrentBtn.addEventListener('click', async function() {
    const response = await sendMessage({ action: 'setCurrentTime' });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Error setting current time');
    }
  });
  
  disableLoopBtn.addEventListener('click', async function() {
    const response = await sendMessage({ action: 'disableLoop' });
    
    if (response && response.success) {
      setTimeout(updateStatus, 100);
    } else {
      alert('Error disabling loop');
    }
  });
  
  // Input validation
  minutesInput.addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    if (this.value > 999) this.value = 999;
  });
  
  secondsInput.addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    if (this.value > 59) this.value = 59;
  });
  
  // Auto-format seconds input to always show 2 digits
  secondsInput.addEventListener('blur', function() {
    if (this.value && this.value.length === 1) {
      this.value = '0' + this.value;
    }
  });
  
  // Update status initially and every 2 seconds
  updateStatus();
  setInterval(updateStatus, 2000);
});