chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === "getTabs") {

    chrome.storage.local.get("INCLUDE_ALL_WINDOWS", (storage) => {

      chrome.tabs.query(storage.INCLUDE_ALL_WINDOWS ? {} : { windowId: sender.tab.windowId }, (tabs) => {
        sendResponse(tabs);
      });

    });

    return true;
  }

  if (msg.action === "activateTab") {
    chrome.tabs.update(msg.id, { active: true }, (tab) => {
      chrome.windows.update(tab.windowId, { focused: true });
    });

    return true;
  }

  if (msg.action === "deleteTab") {
    chrome.tabs.remove(msg.id);
    return true;
  }

  if (msg.action == 'getPreview') {
    screenshotDB.getAllScreenshots()
      .then(async screenshots => {

        const transferableData = await Promise.all(
          screenshots.map(async (item) => {
            const arrayBuffer = await item.blob.arrayBuffer();

            return {
              tabId: item.tabId,
              timestamp: item.timestamp,
              // Convert ArrayBuffer to regular array for JSON serialization
              byteArray: Array.from(new Uint8Array(arrayBuffer)),
              type: item.blob.type || 'image/png'
            };
          })
          
        );

        sendResponse({ success: true, screenshots: transferableData });
      })
      .catch(e => {
        console.error(e);
        sendResponse({ screenshots: [] });
      });
    return true;
  }

});


chrome.commands.onCommand.addListener((command) => {
  if (command === "open_content_script") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, "is_open_content", (response) => {
        if (chrome.runtime.lastError || !response) {

          chrome.scripting.executeScript({
            target: { tabId },
            files: ["src/content.js"]
          });

        } else {
          chrome.tabs.sendMessage(tabId, "moveQ");
        }
      });
    });
  }
});


// Function to take screenshot and convert to blob
async function takeScreenshotAsBlob() {
  try {
    // Get active tab
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    if (!activeTab || activeTab.url.startsWith('chrome://')) {
      console.log('Cannot capture chrome:// or no active tab');
      return null;
    }

    // Capture screenshot as data URL
    const dataUrl = await chrome.tabs.captureVisibleTab();

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return {
      tabId: activeTab.id,
      blob: blob,
      url: activeTab.url,
      title: activeTab.title
    };

  } catch (error) {
    console.error('Error taking screenshot:', error);
    return null;
  }
}

// Function to capture and store screenshot
async function captureAndStoreScreenshot() {
  try {
    // Take screenshot and get blob
    const result = await takeScreenshotAsBlob();

    if (result) {
      // Store in IndexedDB
      await screenshotDB.storeScreenshot(result.tabId, result.blob);
      console.log('Screenshot captured and stored successfully');
    }
  } catch (error) {
    console.error('Error capturing/storing screenshot:', error);
  }
}


class ScreenshotDB {
  constructor() {
    this.dbName = 'ScreenshotStorage';
    this.dbVersion = 1;
    this.storeName = 'screenshots';
    this.maxScreenshots = 50; // Maximum number of screenshots to keep
    this.db = null;
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;

        // Create object store with tabId as key
        const objectStore = this.db.createObjectStore(this.storeName, {
          keyPath: 'tabId'
        });

        // Create index for timestamp to help with cleanup
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });

        console.log('Database setup complete');
      };
    });
  }

  // Store screenshot blob with tabId
  async storeScreenshot(tabId, blob) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      const screenshotData = {
        tabId: tabId,
        blob: blob,
        timestamp: Date.now()
      };

      const request = objectStore.put(screenshotData);

      request.onerror = () => {
        console.error('Failed to store screenshot');
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Screenshot stored for tab ${tabId}`);
        resolve(tabId);

        // Clean up old screenshots after storing
        this.cleanupOldScreenshots();
      };
    });
  }

  // Delete old screenshots to maintain storage limit
  async cleanupOldScreenshots() {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('timestamp');

      // Get all screenshots ordered by timestamp (oldest first)
      const request = index.openCursor();
      const screenshots = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          screenshots.push({
            tabId: cursor.value.tabId,
            timestamp: cursor.value.timestamp
          });
          cursor.continue();
        } else {
          // Delete excess screenshots
          if (screenshots.length > this.maxScreenshots) {
            const toDelete = screenshots
              .sort((a, b) => a.timestamp - b.timestamp)
              .slice(0, screenshots.length - this.maxScreenshots);

            this.deleteScreenshots(toDelete.map(s => s.tabId));
          }
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get all stored screenshots
  async getAllScreenshots() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // Clear all screenshots
  async clearAllScreenshots() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('All screenshots cleared');
        resolve();
      };
    });
  }

  // Delete specific screenshots by tabIds
  async deleteScreenshots(tabIds) {
    if (!this.db || !Array.isArray(tabIds)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      let deletedCount = 0;

      tabIds.forEach(tabId => {
        const deleteRequest = objectStore.delete(tabId);

        deleteRequest.onsuccess = () => {
          deletedCount++;
          if (deletedCount === tabIds.length) {
            console.log(`Deleted ${deletedCount} old screenshots`);
            resolve(deletedCount);
          }
        };

        deleteRequest.onerror = () => {
          reject(deleteRequest.error);
        };
      });
    });
  }

}

const screenshotDB = new ScreenshotDB();

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepAlive') { // Keep service worker alive
    console.log('Service worker kept alive');
  } else if (alarm.name === 'screenshotAlarm') {
    // Take screenshot on alarm
    await captureAndStoreScreenshot();
  }
});

// Take screenshot when tab finishes loading and is active
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(changeInfo);
  if (changeInfo.status === 'complete' && tab.active) {
    await captureAndStoreScreenshot();
  }
});

//Remove screenshot from db when tab is closed
chrome.tabs.onRemoved.addListener(function (tabId) {
  screenshotDB.deleteScreenshots([tabId]);
})

// Keep service worker alive using alarms
chrome.runtime.onInstalled.addListener(() => {

  chrome.alarms.create('keepAlive', {
    delayInMinutes: 1,
    periodInMinutes: 1
  });

  chrome.alarms.create('screenshotAlarm', {
    delayInMinutes: 0.5, // 30 seconds
    periodInMinutes: 0.5
  });

});

async function BlobToArrayBufferChunks(blob, chunkSize) {
  const arrayBuffer = await blob.arrayBuffer();
  const chunks = [];

  for (let i = 0; i < arrayBuffer.byteLength; i += chunkSize) {
    chunks.push(arrayBuffer.slice(i, i + chunkSize));
  }

  return chunks;
}