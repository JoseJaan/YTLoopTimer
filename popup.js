// YouTube Loop Timer - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  const setLoopBtn = document.getElementById('set-loop');
  const useCurrentBtn = document.getElementById('use-current');
  const disableLoopBtn = document.getElementById('disable-loop');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const loopStatus = document.getElementById('loop-status');
  
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Sends a message to the content script.
  async function sendMessage(message) {
    try {
      // This supports both Firefox (browser) and Chrome (chrome) APIs.
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
      
      if (tabs[0]) {
        return await new Promise((resolve, reject) => {
          if (typeof browser !== 'undefined' && browser.tabs) {
            browser.tabs.sendMessage(tabs[0].id, message).then(resolve).catch(reject);
          } else if (chrome?.tabs) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
              if (chrome.runtime.lastError) {
                console.error('[YT Looper Popup] Error sending message:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
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
  
  // Checks if the current tab is a YouTube video page.
  async function checkYouTube() {
    try {
      const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
      
      const tabs = await new Promise((resolve) => {
        tabsAPI.query({ active: true, currentWindow: true }, resolve);
      });
      
      return tabs[0] && tabs[0].url.includes('youtube.com/watch');
    } catch (error) {
      console.error('[YT Looper Popup] Error checking YouTube:', error);
      return false;
    }
  }
  
  // Updates the popup's status display.
  async function updateStatus() {
    const isYouTube = await checkYouTube();
    
    if (!isYouTube) {
      loopStatus.textContent = 'Open a YouTube video';
      loopStatus.className = 'inactive';
      setButtonsEnabled(false);
      return;
    }
    
    const response = await sendMessage({ action: 'getStatus' });
    
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
      loopStatus.textContent = 'Connection error';
      loopStatus.className = 'inactive';
      setButtonsEnabled(false);
    }
  }
  
  // Enables or disables the input fields and buttons.
  function setButtonsEnabled(enabled) {
    setLoopBtn.disabled = !enabled;
    useCurrentBtn.disabled = !enabled;
    disableLoopBtn.disabled = !enabled;
    minutesInput.disabled = !enabled;
    secondsInput.disabled = !enabled;
  }
  
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
  
  // Input validation and dynamic behavior for the time fields.
  minutesInput.addEventListener('input', function() {
    // Remove non-numeric characters.
    this.value = this.value.replace(/\D/g, '');
    
    if (this.value < 0) this.value = 0;
    if (this.value > 999) this.value = 999;
    
    // Auto-focus the seconds field when 2 digits are entered.
    if (this.value.length >= 2) {
      secondsInput.focus();
      secondsInput.select();
    }
  });
  
  minutesInput.addEventListener('keydown', function(e) {
    // Allow only numbers, backspace, delete, tab, and arrow keys.
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!allowedKeys.includes(e.key) && (e.key < '0' || e.key > '9')) {
      e.preventDefault();
    }
  });
  
  secondsInput.addEventListener('input', function() {
    // Remove non-numeric characters.
    this.value = this.value.replace(/\D/g, '');
    
    if (this.value < 0) this.value = 0;
    if (this.value > 59) this.value = 59;
    
    // Limit to 2 characters.
    if (this.value.length > 2) {
      this.value = this.value.slice(0, 2);
    }
  });
  
  secondsInput.addEventListener('keydown', function(e) {
    // Allow only numbers, backspace, delete, tab, and arrow keys.
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!allowedKeys.includes(e.key) && (e.key < '0' || e.key > '9')) {
      e.preventDefault();
    }
  });
  
  // Auto-format the seconds input to always show 2 digits on blur.
  secondsInput.addEventListener('blur', function() {
    if (this.value && this.value.length === 1) {
      this.value = '0' + this.value;
    }
  });
  
  // When backspace is pressed in an empty seconds field, focus the minutes field.
  secondsInput.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && this.value === '' && this.selectionStart === 0) {
      minutesInput.focus();
      minutesInput.setSelectionRange(minutesInput.value.length, minutesInput.value.length);
    }
  });
  
  // Update the status when the popup is opened and every 2 seconds thereafter.
  updateStatus();
  setInterval(updateStatus, 2000);
});

// Adds a listener for when the popup window is closed.
window.addEventListener('unload', function() {
  // Resource cleanup logic can be added here if necessary.
});

// Adds listeners to update the status when the active tab changes or is updated.
if (typeof browser !== 'undefined' && browser.tabs) {
  browser.tabs.onActivated.addListener(updateStatus);
  browser.tabs.onUpdated.addListener(updateStatus);
} else if (chrome?.tabs) {
  chrome.tabs.onActivated.addListener(updateStatus);
  chrome.tabs.onUpdated.addListener(updateStatus);
}
