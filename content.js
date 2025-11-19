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

// Helper function to save steps to storage (fixes race condition)
function saveStepsToStorage() {
  try {
    // Save the entire recordedSteps array (source of truth)
    chrome.storage.local.set({ recordedSteps: recordedSteps }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving to storage:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Error in saveStepsToStorage:', error);
  }
}

// Recording Functions
function startRecording() {
  console.log('Starting recording in content script');
  isRecording = true;
  recordedSteps = [];

  // Clear storage when starting new recording
  chrome.storage.local.set({ recordedSteps: [] });

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

// Helper function to find the actual interactive element
function findInteractiveElement(element) {
  // List of interactive element types
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];

  let current = element;
  let maxDepth = 5; // Prevent infinite loops

  while (current && maxDepth > 0) {
    // Check if current element is interactive
    if (interactiveTags.includes(current.tagName)) {
      return current;
    }

    // Check for role attribute
    const role = current.getAttribute('role');
    if (role && interactiveRoles.includes(role)) {
      return current;
    }

    // Check for common button/clickable classes
    const className = current.className && typeof current.className === 'string' ? current.className : '';
    if (className.includes('btn') || className.includes('button') || className.includes('clickable')) {
      return current;
    }

    // Check for onclick attribute
    if (current.hasAttribute('onclick') || current.hasAttribute('ng-click')) {
      return current;
    }

    // Move up to parent
    current = current.parentElement;
    maxDepth--;
  }

  // If no interactive element found, return the original
  return element;
}

// Event Handlers
function handleClick(event) {
  if (!isRecording) return;

  try {
    // Don't record clicks on our recording indicator
    if (event.target.closest('#jira-logger-recording-indicator')) {
      return;
    }

    // Find the actual interactive element (in case user clicked on icon inside button, etc.)
    const element = findInteractiveElement(event.target);

    const selector = getElementSelector(element);
    const text = getElementText(element);

    // Get element type for better description
    const elementType = element.tagName.toLowerCase();
    const elementDescription = getElementDescription(element);

    const step = {
      action: 'Click',
      element: selector,
      text: text,
      elementType: elementType,
      description: elementDescription, // Human-readable description
      timestamp: new Date().toISOString()
    };

    recordedSteps.push(step);
    console.log('✅ Step recorded:', step);

    // Save to storage (using helper to avoid race conditions)
    saveStepsToStorage();

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
  } catch (error) {
    console.error('❌ Error in handleClick:', error);
    // Continue recording even if this step fails
  }
}

function handleInput(event) {
  if (!isRecording) return;

  try {
    const element = event.target;
    const selector = getElementSelector(element);

    // Debounce input events - only record after 500ms of no typing (reduced for faster capture)
    clearTimeout(element._inputTimer);
    element._inputTimer = setTimeout(() => {
      try {
        // Capture the actual typed value
        const typedValue = element.value || '';
        const fieldLabel = element.placeholder || element.name || element.getAttribute('aria-label') || 'input field';

        const step = {
          action: 'Type',
          element: selector,
          text: fieldLabel,
          value: typedValue, // Store actual typed value
          description: typedValue ? `Type "${typedValue}" in ${fieldLabel}` : `Type in ${fieldLabel}`, // Human-readable description
          timestamp: new Date().toISOString()
        };

        recordedSteps.push(step);
        console.log('✅ Input step recorded:', step);

        // Save to storage (using helper to avoid race conditions)
        saveStepsToStorage();

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
      } catch (error) {
        console.error('❌ Error in handleInput timeout:', error);
      }
    }, 500);
  } catch (error) {
    console.error('❌ Error in handleInput:', error);
    // Continue recording even if this step fails
  }
}

function handleChange(event) {
  if (!isRecording) return;

  try {
    const element = event.target;
    const selector = getElementSelector(element);

    let selectedValue = '';
    let fieldLabel = '';

    if (element.tagName === 'SELECT') {
      selectedValue = element.options[element.selectedIndex]?.text || element.value || 'option';
      fieldLabel = element.getAttribute('aria-label') || element.name || 'dropdown';
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      selectedValue = element.checked ? 'checked' : 'unchecked';
      fieldLabel = element.getAttribute('aria-label') || element.name || element.type;
    } else {
      selectedValue = element.value;
      fieldLabel = element.placeholder || element.name || 'field';
    }

    const step = {
      action: 'Select',
      element: selector,
      text: fieldLabel,
      value: selectedValue, // Store actual selected value
      description: `Select "${selectedValue}" from ${fieldLabel}`, // Human-readable description
      timestamp: new Date().toISOString()
    };

    recordedSteps.push(step);
    console.log('✅ Change step recorded:', step);

    // Save to storage (using helper to avoid race conditions)
    saveStepsToStorage();

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
  } catch (error) {
    console.error('❌ Error in handleChange:', error);
    // Continue recording even if this step fails
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

function getElementDescription(element) {
  // Generate a human-readable description of what was clicked
  const tagName = element.tagName.toLowerCase();
  const text = getElementText(element);

  // Get additional attributes for better description
  const ariaLabel = element.getAttribute('aria-label');
  const title = element.getAttribute('title');
  const id = element.id;
  const className = element.className && typeof element.className === 'string' ? element.className : '';

  // Helper to get best available label
  const getLabel = () => {
    return text || ariaLabel || title || id || '';
  };

  // For buttons
  if (tagName === 'button' || element.type === 'button' || element.type === 'submit') {
    const label = getLabel();
    if (label) {
      return `Click on "${label}" button`;
    }
    // Check if it has icon classes
    if (className.includes('btn')) {
      return 'Click on button';
    }
    return 'Click on button';
  }

  // For links
  if (tagName === 'a') {
    const label = getLabel();
    const href = element.getAttribute('href');
    if (label) {
      return `Click on "${label}" link`;
    }
    if (href && href !== '#') {
      return `Click on link to ${href}`;
    }
    return 'Click on link';
  }

  // For inputs
  if (tagName === 'input') {
    const label = getLabel();
    if (element.type === 'checkbox') {
      return label ? `Click on "${label}" checkbox` : 'Click on checkbox';
    }
    if (element.type === 'radio') {
      return label ? `Click on "${label}" radio button` : 'Click on radio button';
    }
    if (element.type === 'submit') {
      return label ? `Click on "${label}" submit button` : 'Click on submit button';
    }
    return label ? `Click on "${label}" input` : 'Click on input field';
  }

  // For images
  if (tagName === 'img') {
    const alt = element.alt || text || title;
    const src = element.src;
    if (alt) {
      return `Click on "${alt}" image`;
    }
    if (src) {
      const filename = src.split('/').pop().split('?')[0];
      return `Click on "${filename}" image`;
    }
    return 'Click on image';
  }

  // For icons (common icon classes) - check parent too
  if (className.includes('icon') || className.includes('fa-') || className.includes('glyphicon')) {
    const label = ariaLabel || title;
    if (label) {
      return `Click on "${label}" icon`;
    }
    // Try to get parent element's label
    const parent = element.parentElement;
    if (parent) {
      const parentText = parent.textContent?.trim();
      const parentLabel = parent.getAttribute('aria-label') || parent.getAttribute('title');
      if (parentLabel) {
        return `Click on "${parentLabel}" icon`;
      }
      if (parentText && parentText.length < 30) {
        return `Click on "${parentText}" icon`;
      }
    }
    return 'Click on icon';
  }

  // For divs and spans that might be clickable elements
  if (tagName === 'div' || tagName === 'span') {
    const label = getLabel();
    if (label && label.length < 50) {
      return `Click on "${label}"`;
    }
    // Check if it looks like a button
    if (className.includes('btn') || className.includes('button')) {
      return label ? `Click on "${label}" button` : 'Click on button';
    }
    return label ? `Click on "${label}" ${tagName}` : `Click on ${tagName}`;
  }

  // Generic elements with text
  if (text && text.length > 0) {
    return `Click on "${text}"`;
  }

  // Check for ID as fallback
  if (id) {
    return `Click on element with id "${id}"`;
  }

  // Final fallback - use selector
  const selector = getElementSelector(element);
  if (selector && selector !== tagName) {
    return `Click on ${selector}`;
  }

  return `Click on ${tagName}`;
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
