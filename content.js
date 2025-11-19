// Jira Quick Logger - Content Script
// Runs on all pages to record user interactions

let isRecording = false;
let recordedSteps = [];
let consoleErrors = [];
let networkErrors = [];

// Capture console errors
const originalConsoleError = console.error;
console.error = function(...args) {
  consoleErrors.push({
    message: args.join(' '),
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });
  originalConsoleError.apply(console, args);
};

// Capture network errors
window.addEventListener('error', (event) => {
  if (event.target.tagName) {
    networkErrors.push({
      type: 'Resource Load Error',
      url: event.target.src || event.target.href,
      element: event.target.tagName,
      timestamp: new Date().toISOString()
    });
  }
}, true);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  if (message.type === 'PING') {
    sendResponse({ ready: true });
    return true;
  }
  
  if (message.type === 'START_RECORDING') {
    startRecording();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'STOP_RECORDING') {
    stopRecording();
    sendResponse({ 
      steps: recordedSteps,
      consoleErrors: consoleErrors,
      networkErrors: networkErrors
    });
    return true;
  }
  
  if (message.type === 'GET_ERRORS') {
    sendResponse({
      consoleErrors: consoleErrors,
      networkErrors: networkErrors
    });
    return true;
  }
  
  if (message.type === 'GET_RECORDED_DATA') {
    sendResponse({
      steps: recordedSteps,
      environment: {
        url: window.location.href,
        title: document.title,
        consoleErrors: consoleErrors,
        networkErrors: networkErrors
      }
    });
    return true;
  }
  
  return false;
});

// Recording Functions
function startRecording() {
  console.log('Starting recording in content script');
  isRecording = true;
  recordedSteps = [];
  
  // Add event listeners
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  
  // Show recording indicator
  showRecordingIndicator();
  
  console.log('Recording started successfully');
}

function stopRecording() {
  console.log('Stopping recording in content script');
  isRecording = false;
  
  // Remove event listeners
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  
  // Hide recording indicator
  hideRecordingIndicator();
  
  console.log('Recording stopped. Total steps:', recordedSteps.length);
}

// Event Handlers
function handleClick(event) {
  if (!isRecording) return;
  
  const element = event.target;
  
  // Don't record clicks on our recording indicator
  if (element.closest('#jira-logger-recording-indicator')) {
    return;
  }
  
  const selector = getElementSelector(element);
  const text = getElementText(element);
  
  const step = {
    action: 'Click',
    element: selector,
    text: text,
    timestamp: new Date().toISOString()
  };
  
  recordedSteps.push(step);
  console.log('Step recorded:', step);
  
  // Save to storage immediately so it persists even if popup closes
  chrome.storage.local.get(['recordedSteps'], (result) => {
    const existingSteps = result.recordedSteps || [];
    existingSteps.push(step);
    chrome.storage.local.set({ recordedSteps: existingSteps });
  });
  
  // Update recording indicator
  updateRecordingIndicator();
  
  // Send to popup (if open)
  try {
    chrome.runtime.sendMessage({ 
      type: 'STEP_RECORDED', 
      step: step 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Popup is closed, step saved to storage');
      }
    });
  } catch (error) {
    console.log('Could not send to popup:', error.message);
  }
  
  // Highlight element briefly
  highlightElement(element);
}

function handleInput(event) {
  if (!isRecording) return;
  
  const element = event.target;
  const selector = getElementSelector(element);
  
  // Don't record actual input values for security
  const step = {
    action: 'Type',
    element: selector,
    text: element.placeholder || element.name || 'input field',
    timestamp: new Date().toISOString()
  };
  
  // Debounce input events - only record after 1 second of no typing
  clearTimeout(element._inputTimer);
  element._inputTimer = setTimeout(() => {
    recordedSteps.push(step);
    console.log('Input step recorded:', step);
    
    // Save to storage immediately
    chrome.storage.local.get(['recordedSteps'], (result) => {
      const existingSteps = result.recordedSteps || [];
      existingSteps.push(step);
      chrome.storage.local.set({ recordedSteps: existingSteps });
    });
    
    // Update recording indicator
    updateRecordingIndicator();
    
    try {
      chrome.runtime.sendMessage({ 
        type: 'STEP_RECORDED', 
        step: step 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Popup is closed, step saved to storage');
        }
      });
    } catch (error) {
      console.log('Could not send to popup:', error.message);
    }
  }, 1000);
}

function handleChange(event) {
  if (!isRecording) return;
  
  const element = event.target;
  const selector = getElementSelector(element);
  
  let text = '';
  if (element.tagName === 'SELECT') {
    text = element.options[element.selectedIndex]?.text || 'option';
  } else {
    text = element.value;
  }
  
  const step = {
    action: 'Select',
    element: selector,
    text: text,
    timestamp: new Date().toISOString()
  };
  
  recordedSteps.push(step);
  console.log('Change step recorded:', step);
  
  // Save to storage immediately
  chrome.storage.local.get(['recordedSteps'], (result) => {
    const existingSteps = result.recordedSteps || [];
    existingSteps.push(step);
    chrome.storage.local.set({ recordedSteps: existingSteps });
  });
  
  // Update recording indicator
  updateRecordingIndicator();
  
  try {
    chrome.runtime.sendMessage({ 
      type: 'STEP_RECORDED', 
      step: step 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Popup is closed, step saved to storage');
      }
    });
  } catch (error) {
    console.log('Could not send to popup:', error.message);
  }
}

// Helper Functions
function getElementSelector(element) {
  // Try to get the most readable selector
  
  // 1. ID (best)
  if (element.id) {
    return `#${element.id}`;
  }
  
  // 2. Name attribute
  if (element.name) {
    return `[name="${element.name}"]`;
  }
  
  // 3. Data-testid or similar
  if (element.dataset.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }
  
  // 4. Aria-label
  if (element.getAttribute('aria-label')) {
    return `[aria-label="${element.getAttribute('aria-label')}"]`;
  }
  
  // 5. Class + text (for buttons/links)
  if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.textContent.trim()) {
    const text = element.textContent.trim().substring(0, 20);
    return `${element.tagName.toLowerCase()}:contains("${text}")`;
  }
  
  // 6. Class name
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c).slice(0, 2);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  // 7. Fallback to tag name
  return element.tagName.toLowerCase();
}

function getElementText(element) {
  // Get meaningful text from element
  const text = element.textContent?.trim() || 
               element.value || 
               element.placeholder || 
               element.alt || 
               element.title ||
               element.getAttribute('aria-label') ||
               '';
  
  // Limit to 50 characters
  return text.substring(0, 50);
}

function highlightElement(element) {
  const originalOutline = element.style.outline;
  const originalBackgroundColor = element.style.backgroundColor;
  
  element.style.outline = '3px solid #f59e0b';
  element.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
  
  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.backgroundColor = originalBackgroundColor;
  }, 500);
}

// Recording Indicator
function showRecordingIndicator() {
  // Remove existing indicator if any
  const existing = document.getElementById('jira-logger-recording-indicator');
  if (existing) existing.remove();
  
  // Create floating indicator with stop button
  const indicator = document.createElement('div');
  indicator.id = 'jira-logger-recording-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #92400e;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 2px solid #f59e0b;
      min-width: 280px;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="
          width: 12px;
          height: 12px;
          background: #dc2626;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></span>
        <span>Recording Steps...</span>
        <span id="jira-logger-step-count" style="
          background: #92400e;
          color: #fef3c7;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        ">0</span>
      </div>
      <div style="
        font-size: 11px;
        font-weight: normal;
        color: #78350f;
        border-top: 1px solid #fbbf24;
        padding-top: 8px;
      ">
        💡 Popup closed? Reopen extension to see steps & stop
      </div>
      <button id="jira-logger-stop-btn" style="
        background: #dc2626;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        width: 100%;
      ">⏹ Stop Recording</button>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      #jira-logger-stop-btn:hover {
        background: #b91c1c;
      }
    </style>
  `;
  
  document.body.appendChild(indicator);
  
  // Add click handler for stop button
  document.getElementById('jira-logger-stop-btn').addEventListener('click', () => {
    // Open extension popup programmatically
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP_TO_STOP' });
  });
}

// Update step count in indicator
function updateRecordingIndicator() {
  const stepCountElement = document.getElementById('jira-logger-step-count');
  if (stepCountElement) {
    stepCountElement.textContent = recordedSteps.length;
  }
}

function hideRecordingIndicator() {
  const indicator = document.getElementById('jira-logger-recording-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Initialize error capture on page load
window.addEventListener('load', () => {
  consoleErrors = [];
  networkErrors = [];
});
