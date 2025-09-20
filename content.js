// YouTube Loop Timer - Content Script

class YouTubeLooper {
  constructor() {
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
    // The 'DOMContentLoaded' event fires when the initial HTML document has been completely loaded and parsed,
    // without waiting for stylesheets, images, and subframes to finish loading.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupLooper();
      });
    } else {
      this.setupLooper();
    }
    
    // YouTube uses a single-page application (SPA) architecture.
    // A MutationObserver is used to detect page changes and re-initialize the looper.
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        // Reset state when the video changes
        this.eventListenerAdded = false;
        this.currentVideoId = null;
        setTimeout(() => {
          this.setupLooper();
        }, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }
  
  setupLooper() {
    const checkForVideo = () => {
      this.video = document.querySelector('video');
      
      if (this.video && !this.eventListenerAdded) {
        this.addVideoEventListeners();
        this.loadSavedSettings();
      } else if (!this.video) {
        setTimeout(checkForVideo, 1000); // Retry if video element is not found
      }
    };
    
    checkForVideo();
  }
  
  addVideoEventListeners() {
    if (this.eventListenerAdded) {
      return;
    }
    
    // Remove previous listeners if they exist to avoid duplicates
    if (this.timeUpdateHandler) {
      this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
    }
    if (this.endedHandler) {
      this.video.removeEventListener('ended', this.endedHandler);
    }
    
    // The 'timeupdate' event is fired when the time indicated by the currentTime attribute has been updated.
    // This is used to preemptively restart the loop before the video ends.
    this.timeUpdateHandler = () => {
      if (this.isLoopActive && this.video) {
        const currentTime = this.video.currentTime;
        const duration = this.video.duration;
        
        // If the video is very close to the end (0.5 seconds), restart it.
        if (duration - currentTime <= 0.5 && currentTime > 0) {
          this.restartAtLoopTime();
        }
      }
    };
    
    // The 'ended' event is a fallback mechanism in case the 'timeupdate' event fails to fire at the end of the video.
    this.endedHandler = () => {
      if (this.isLoopActive) {
        // A small delay is added to prevent potential race conditions.
        setTimeout(() => {
          this.restartAtLoopTime();
        }, 100);
      }
    };
    
    this.video.addEventListener('timeupdate', this.timeUpdateHandler);
    this.video.addEventListener('ended', this.endedHandler);
    
    this.eventListenerAdded = true;
  }
  
  restartAtLoopTime() {
    if (!this.video || !this.isLoopActive) {
      return;
    }
    
    // Ensure that we are still on the same video before restarting.
    const currentVideoId = this.getVideoId();
    if (this.currentVideoId && currentVideoId !== this.currentVideoId) {
      return;
    }
    
    try {
      // Prevent YouTube's autoplay feature from moving to the next video.
      this.preventAutoplay();
      
      this.video.currentTime = this.loopStartTime;
      
      // Ensure the video continues to play after seeking.
      const playPromise = this.video.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Retry playing after a short delay if the first attempt fails.
          setTimeout(() => {
            this.video.play().catch(e => {
              console.error('[YT Looper] Second error on play:', e);
            });
          }, 100);
        });
      }
    } catch (error) {
      console.error('[YT Looper] General error on restart:', error);
    }
  }
  
  // This function attempts to disable YouTube's autoplay feature through various methods.
  preventAutoplay() {
    try {
      // Method 1: Click the autoplay toggle button if it's active.
      const autoplayButton = document.querySelector('[data-tooltip-target-id="ytp-autonav-toggle-button"]');
      if (autoplayButton && autoplayButton.getAttribute('aria-pressed') === 'true') {
        autoplayButton.click();
      }
      
      // Method 2: Use the internal YouTube player API if available.
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        window.ytplayer.config.args.autoplay = '0';
      }
      
      // Method 3: Remove the 'autoplay' parameter from the URL.
      const url = new URL(window.location.href);
      if (url.searchParams.has('autoplay')) {
        url.searchParams.set('autoplay', '0');
      }
      
    } catch (error) {
      console.error('[YT Looper] Error preventing autoplay:', error);
    }
  }
  
  setLoopTime(timeInSeconds) {
    this.loopStartTime = timeInSeconds;
    this.isLoopActive = true;
    this.currentVideoId = this.getVideoId(); // Save the ID of the current video
    
    const videoId = this.getVideoId();
    
    if (videoId) {
      const data = {
        [videoId]: {
          loopStartTime: timeInSeconds,
          isActive: true
        }
      };
      
      // Use browser.storage for Firefox and chrome.storage for Chrome.
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.set(data).catch(error => {
          console.error('[YT Looper] Error saving data:', error);
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.error('[YT Looper] Error saving data (chrome):', chrome.runtime.lastError);
          }
        });
      } else {
        console.error('[YT Looper] Storage API not available');
      }
    }
    
  }
  
  getCurrentTime() {
    return this.video ? Math.floor(this.video.currentTime) : 0;
  }
  
  disableLoop() {
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
      
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.set(data);
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data);
      }
    }
    
    this.showNotification('Loop disabled');
  }
  
  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }
  
  loadSavedSettings() {
    const videoId = this.getVideoId();
    this.currentVideoId = videoId;
    
    if (videoId) {
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.get(videoId).then(result => {
          if (result[videoId]) {
            this.loopStartTime = result[videoId].loopStartTime;
            this.isLoopActive = result[videoId].isActive;
          }
        }).catch(error => {
          console.error('[YT Looper] Error loading settings:', error);
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([videoId], (result) => {
          if (result[videoId]) {
            this.loopStartTime = result[videoId].loopStartTime;
            this.isLoopActive = result[videoId].isActive;
          }
        });
      }
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  
  getStatus() {
    return {
      isActive: this.isLoopActive,
      loopTime: this.loopStartTime,
      currentTime: this.getCurrentTime(),
      videoId: this.getVideoId()
    };
  }
}

const youtubeLooper = new YouTubeLooper();

// Communication with the popup script
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

if (runtimeAPI && runtimeAPI.onMessage) {
  runtimeAPI.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'setLoopTime':
        youtubeLooper.setLoopTime(request.time);
        sendResponse({ success: true });
        break;
        
      case 'setCurrentTime':
        youtubeLooper.setLoopTime(youtubeLooper.getCurrentTime());
        sendResponse({ success: true });
        break;
        
      case 'disableLoop':
        youtubeLooper.disableLoop();
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        const status = youtubeLooper.getStatus();
        sendResponse(status);
        break;
        
      default:
        sendResponse({ error: 'Unrecognized action' });
    }
    
    return true; // Indicates that the response is sent asynchronously.
  });
} else {
  console.error('[YT Looper] Runtime API not available');
}
