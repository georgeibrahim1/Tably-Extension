// Load settings when popup opens
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupToggleListeners();
});

// Load settings from chrome storage
function loadSettings() {
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['SHOW_PREVIEW', 'INCLUDE_ALL_WINDOWS'], function(result) {
            // Set show preview toggle (default: true)
            const showPreviewToggle = document.getElementById('showPreview');
            if (showPreviewToggle) {
                showPreviewToggle.checked = result.SHOW_PREVIEW !== undefined ? result.SHOW_PREVIEW : true;
            }

            // Set all windows toggle (default: false)
            const allWindowsToggle = document.getElementById('allWindows');
            if (allWindowsToggle) {
                allWindowsToggle.checked = result.INCLUDE_ALL_WINDOWS !== undefined ? result.INCLUDE_ALL_WINDOWS : false;
            }
        });
    }
}

// Save settings to chrome storage
function saveSettings() {
    if (chrome && chrome.storage && chrome.storage.local) {
        const showPreview = document.getElementById('showPreview').checked;
        const allWindows = document.getElementById('allWindows').checked;

        chrome.storage.local.set({
            SHOW_PREVIEW: showPreview,
            INCLUDE_ALL_WINDOWS: allWindows
        });
    }
}

// Setup event listeners for toggles
function setupToggleListeners() {
    const showPreviewToggle = document.getElementById('showPreview');
    const allWindowsToggle = document.getElementById('allWindows');

    if (showPreviewToggle) {
        showPreviewToggle.addEventListener('change', saveSettings);
    }

    if (allWindowsToggle) {
        allWindowsToggle.addEventListener('change', saveSettings);
    }
}