// Jira Quick Logger - Popup UI Logic
// View management
const views = {
  landing: document.getElementById('landing-view'),
  recording: document.getElementById('recording-view'),
  form: document.getElementById('form-view'),
  success: document.getElementById('success-view'),
  settings: document.getElementById('settings-view')
};

let currentView = 'landing';
let recordingData = {
  steps: [],
  environment: {},
  screenshot: null,
  consoleErrors: [],
  networkErrors: []
};
let recordingTimer = null;
let recordingStartTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadRecentBugs();
  await checkSettings();
  await checkRecordingState(); // Check if recording is in progress
  setupEventListeners();
});

// Check if recording is in progress when popup opens
async function checkRecordingState() {
  const { isRecording, recordingStartTime: savedStartTime, recordedSteps } = await chrome.storage.local.get([
    'isRecording', 
    'recordingStartTime', 
    'recordedSteps'
  ]);
  
  if (isRecording) {
    console.log('Recording in progress, loading state...');
    console.log('Loaded steps from storage:', recordedSteps);
    
    // Recording is in progress, show recording view
    recordingData.steps = recordedSteps || [];
    recordingStartTime = savedStartTime || Date.now();
    showView('recording');
    startRecordingTimer();
    updateStepsList();
    
    // Listen for new steps
    chrome.runtime.onMessage.removeListener(handleRecordingMessage);
    chrome.runtime.onMessage.addListener(handleRecordingMessage);
    
    console.log('Recording view restored with', recordingData.steps.length, 'steps');
  }
}

// View Management
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.remove('active');
  });
  views[viewName].classList.add('active');
  currentView = viewName;
}

// Event Listeners
function setupEventListeners() {
  // Landing View
  document.getElementById('quick-bug-btn').addEventListener('click', handleQuickBug);
  document.getElementById('start-recording-btn').addEventListener('click', startRecording);
  document.getElementById('settings-btn').addEventListener('click', () => showView('settings'));
  
  // Recording View
  document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
  document.getElementById('cancel-recording-btn').addEventListener('click', async () => {
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    
    // Get active tab and stop recording
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_RECORDING' });
      }
    } catch (e) {
      console.log('Could not stop content script recording:', e.message);
    }
    
    // Clean up
    chrome.runtime.onMessage.removeListener(handleRecordingMessage);
    await chrome.storage.local.remove(['isRecording', 'recordingStartTime', 'recordedSteps']);
    
    showView('landing');
  });
  
  // Form View
  document.getElementById('back-btn').addEventListener('click', () => showView('landing'));
  document.getElementById('bug-form').addEventListener('submit', handleSubmitBug);
  document.getElementById('use-suggestion-btn')?.addEventListener('click', useSuggestion);
  document.getElementById('edit-steps-btn')?.addEventListener('click', toggleStepsEditing);

  // Priority buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', function() {
      this.classList.toggle('open');
      const content = this.nextElementSibling;
      content.classList.toggle('open');
    });
  });
  
  // Success View
  document.getElementById('view-in-jira-btn').addEventListener('click', viewInJira);
  document.getElementById('log-another-btn').addEventListener('click', () => {
    resetForm();
    showView('landing');
  });
  document.getElementById('done-btn').addEventListener('click', () => window.close());
  
  // Settings View
  document.getElementById('settings-back-btn').addEventListener('click', () => showView('landing'));
  document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
  document.getElementById('test-connection-btn').addEventListener('click', testJiraConnection);
}

// Quick Bug Report
async function handleQuickBug() {
  // Capture screenshot
  const screenshot = await captureScreenshot();
  
  // Collect environment data
  const environment = await collectEnvironmentData();
  
  // Populate form
  recordingData.screenshot = screenshot;
  recordingData.environment = environment;
  recordingData.steps = [];
  
  populateForm();
  showView('form');
}

// Recording Functions
async function startRecording() {
  showView('recording');
  recordingData.steps = [];
  recordingStartTime = Date.now();
  
  // Save recording state to storage
  try {
    await chrome.storage.local.set({
      isRecording: true,
      recordingStartTime: recordingStartTime,
      recordedSteps: []
    });
  } catch (error) {
    console.error('Failed to save recording state:', error.message);
  }
  
  // Start timer
  startRecordingTimer();
  
  try {
    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }
    const tab = tabs[0];
    
    // First, ensure content script is injected
    await ensureContentScriptInjected(tab.id);
    
    // Send message to content script to start recording
    chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('Failed to start recording:', error.message);
        alert('Failed to start recording. Please reload the page and try again.\n\nError: ' + error.message);
        stopRecording();
        showView('landing');
        return;
      }
      console.log('Recording started successfully');
      
      // Show notification that popup can be closed
      showRecordingNotification();
    });
    
    // Listen for recorded steps (remove any existing listener first)
    chrome.runtime.onMessage.removeListener(handleRecordingMessage);
    chrome.runtime.onMessage.addListener(handleRecordingMessage);
  } catch (error) {
    console.error('Error starting recording:', error.message || String(error));
    alert('Failed to start recording: ' + (error.message || String(error)));
    await chrome.storage.local.remove(['isRecording', 'recordingStartTime', 'recordedSteps']);
    showView('landing');
  }
}

// Show notification that user can close popup
function showRecordingNotification() {
  // Create a subtle notification in the popup
  const recordingInfo = document.querySelector('.recording-info p');
  if (recordingInfo) {
    recordingInfo.innerHTML = `
      Perform the actions that reproduce the bug<br>
      <small style="color: #10b981;">✓ Recording continues even if you close this popup</small>
    `;
  }
}

// Ensure content script is injected
async function ensureContentScriptInjected(tabId) {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (error) {
    // Content script not loaded, inject it
    console.log('Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
    
    // Wait a bit for script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function startRecordingTimer() {
  recordingTimer = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recording-timer').textContent = `${minutes}:${seconds}`;
    
    // Also check storage for new steps every second (in case messages were missed)
    if (currentView === 'recording') {
      const { recordedSteps } = await chrome.storage.local.get(['recordedSteps']);
      if (recordedSteps && recordedSteps.length > recordingData.steps.length) {
        console.log('Found new steps in storage:', recordedSteps.length, 'vs', recordingData.steps.length);
        recordingData.steps = recordedSteps;
        updateStepsList();
      }
    }
  }, 1000);
}

function handleRecordingMessage(message, sender, sendResponse) {
  if (message.type === 'STEP_RECORDED') {
    console.log('Received step in popup:', message.step);
    recordingData.steps.push(message.step);
    updateStepsList();
    
    // Also save to storage so it's always in sync
    chrome.storage.local.set({
      recordedSteps: recordingData.steps
    });
    
    // Keep the message channel open
    return true;
  }
  return false;
}

function updateStepsList() {
  const stepsList = document.getElementById('steps-list');
  const stepCount = document.getElementById('step-count');

  if (!stepsList) {
    console.error('steps-list element not found');
    return;
  }

  stepCount.textContent = `(${recordingData.steps.length})`;

  stepsList.innerHTML = recordingData.steps.map((step, index) => `
    <li>
      <div class="step-number">${index + 1}</div>
      <div class="step-content">${formatStepDescription(step)}</div>
      <button class="delete-step-btn" data-index="${index}" title="Delete step">×</button>
    </li>
  `).join('');

  // Add event listeners to delete buttons
  stepsList.querySelectorAll('.delete-step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteStep(index);
    });
  });

  // Preserve edit mode if it was active
  if (stepsEditMode) {
    stepsList.classList.add('edit-mode');
    // Manually show delete buttons in edit mode (CSS backup)
    stepsList.querySelectorAll('.delete-step-btn').forEach(btn => {
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
    });
    console.log('Edit mode preserved, delete buttons manually shown');
  }
}

// Toggle steps editing mode
let stepsEditMode = false;
function toggleStepsEditing() {
  stepsEditMode = !stepsEditMode;
  const stepsList = document.getElementById('steps-list');
  const editBtn = document.getElementById('edit-steps-btn');

  console.log('Toggle edit mode:', stepsEditMode);

  if (stepsEditMode) {
    stepsList.classList.add('edit-mode');
    editBtn.textContent = 'Done Editing';
    editBtn.style.color = '#dc2626';

    // Manually show delete buttons (CSS backup solution)
    const deleteButtons = stepsList.querySelectorAll('.delete-step-btn');
    deleteButtons.forEach(btn => {
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.background = '#dc2626';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.width = '20px';
      btn.style.height = '20px';
      btn.style.borderRadius = '50%';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '16px';
      btn.style.padding = '0';
    });

    console.log('Edit mode ENABLED. Classes on list:', stepsList.className);
    console.log('Delete buttons count:', deleteButtons.length);
    console.log('Delete buttons manually shown with inline styles');
  } else {
    stepsList.classList.remove('edit-mode');
    editBtn.textContent = 'Edit Steps';
    editBtn.style.color = '';

    // Manually hide delete buttons
    const deleteButtons = stepsList.querySelectorAll('.delete-step-btn');
    deleteButtons.forEach(btn => {
      btn.style.display = 'none';
    });

    console.log('Edit mode DISABLED');
  }
}

// Delete a step from the recording
function deleteStep(index) {
  if (index >= 0 && index < recordingData.steps.length) {
    recordingData.steps.splice(index, 1);

    // Update storage
    chrome.storage.local.set({ recordedSteps: recordingData.steps });

    // Update UI
    updateStepsList();

    // Also update the preview
    const stepsPreview = document.getElementById('steps-preview');
    if (stepsPreview) {
      stepsPreview.innerHTML = recordingData.steps.map((step, index) =>
        `${index + 1}. ${formatStepDescription(step)}`
      ).join('<br>');
    }

    console.log(`Step ${index + 1} deleted. Remaining steps: ${recordingData.steps.length}`);
  }
}

// Clear all steps
function clearAllSteps() {
  if (confirm('Are you sure you want to delete all steps?')) {
    recordingData.steps = [];

    // Update storage
    chrome.storage.local.set({ recordedSteps: [] });

    // Update UI
    updateStepsList();

    console.log('All steps cleared');
  }
}

// Helper function to format step descriptions
function formatStepDescription(step) {
  // If step has a pre-generated description, use it
  if (step.description) {
    return step.description;
  }

  // Otherwise, generate description based on action type
  if (step.action === 'Type' && step.value) {
    return `Type "${step.value}" in ${step.text || step.element}`;
  } else if (step.action === 'Type') {
    return `Type in ${step.text || step.element}`;
  }

  if (step.action === 'Select' && step.value) {
    return `Select "${step.value}" from ${step.text || step.element}`;
  } else if (step.action === 'Select') {
    return `Select from ${step.text || step.element}`;
  }

  if (step.action === 'Click') {
    if (step.text) {
      return `Click on "${step.text}"`;
    }
    return `Click on ${step.element}`;
  }

  // Fallback
  return `${step.action} on ${step.element}`;
}

async function stopRecording() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
  }
  
  try {
    // Get latest steps from storage (in case popup was closed during recording)
    const storageData = await chrome.storage.local.get(['recordedSteps']);
    if (storageData.recordedSteps && storageData.recordedSteps.length > 0) {
      recordingData.steps = storageData.recordedSteps;
    }
    
    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }
    const tab = tabs[0];
    
    // Stop recording in content script (fire and forget, don't wait for response)
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
    } catch (e) {
      console.log('Could not send stop message to content script:', e.message);
    }
    
    // Remove the message listener
    chrome.runtime.onMessage.removeListener(handleRecordingMessage);
    
    // Clear recording state from storage
    await chrome.storage.local.remove(['isRecording', 'recordingStartTime', 'recordedSteps']);
    
    // Capture screenshot
    let screenshot = null;
    try {
      screenshot = await captureScreenshot();
    } catch (e) {
      console.error('Failed to capture screenshot:', e.message);
    }
    
    // Collect environment data
    let environment = {};
    try {
      environment = await collectEnvironmentData();
    } catch (e) {
      console.error('Failed to collect environment data:', e.message);
      environment = {
        url: tab.url,
        title: tab.title,
        timestamp: new Date().toISOString(),
        browser: getBrowserInfo()
      };
    }
    
    recordingData.screenshot = screenshot;
    recordingData.environment = environment;
    
    // Populate form and show it
    populateForm();
    showView('form');
    
  } catch (error) {
    console.error('Error in stopRecording:', error.message || String(error));
    alert('Recording stopped with errors. You can still create the bug report with the captured data.');
    
    // Try to clean up
    try {
      await chrome.storage.local.remove(['isRecording', 'recordingStartTime', 'recordedSteps']);
    } catch (e) {
      console.error('Failed to clear storage:', e.message);
    }
    
    // Still try to show the form with whatever we have
    try {
      populateForm();
      showView('form');
    } catch (e) {
      console.error('Failed to show form:', e.message);
      showView('landing');
    }
  }
}

// Screenshot Capture
async function captureScreenshot() {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    return dataUrl;
  } catch (error) {
    console.error('Screenshot failed:', error);
    return null;
  }
}

// Environment Data Collection
async function collectEnvironmentData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const environment = {
    url: tab.url,
    title: tab.title,
    timestamp: new Date().toISOString(),
    browser: getBrowserInfo(),
    viewport: await getViewportSize(tab.id)
  };
  
  // Get console errors from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ERRORS' });
    environment.consoleErrors = response?.consoleErrors || [];
    environment.networkErrors = response?.networkErrors || [];
  } catch (error) {
    environment.consoleErrors = [];
    environment.networkErrors = [];
  }
  
  return environment;
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = 'Unknown';
  
  if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge';
    version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }
  
  return `${browser} ${version}`;
}

async function getViewportSize(tabId) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => ({ width: window.innerWidth, height: window.innerHeight })
    });
    return result[0]?.result || { width: 0, height: 0 };
  } catch (error) {
    return { width: 0, height: 0 };
  }
}

// Form Population
function populateForm() {
  // Update pills
  document.getElementById('steps-pill').textContent = `📝 ${recordingData.steps.length} Steps`;
  document.getElementById('errors-pill').textContent = 
    `⚠️ ${recordingData.environment.consoleErrors?.length || 0} Errors`;
  
  // Show screenshot
  if (recordingData.screenshot) {
    document.getElementById('screenshot-img').src = recordingData.screenshot;
  }
  
  // Show steps if recorded
  if (recordingData.steps.length > 0) {
    document.getElementById('steps-section').style.display = 'block';
    const stepsPreview = document.getElementById('steps-preview');
    stepsPreview.innerHTML = recordingData.steps.map((step, index) =>
      `${index + 1}. ${formatStepDescription(step)}`
    ).join('<br>');
  }
  
  // Populate environment details
  document.getElementById('env-url').textContent = recordingData.environment.url || '-';
  document.getElementById('env-browser').textContent = recordingData.environment.browser || '-';
  document.getElementById('env-viewport').textContent = 
    `${recordingData.environment.viewport?.width || 0}x${recordingData.environment.viewport?.height || 0}`;
  document.getElementById('env-timestamp').textContent = 
    new Date(recordingData.environment.timestamp).toLocaleString();
  
  // Show console errors if any
  if (recordingData.environment.consoleErrors?.length > 0) {
    document.getElementById('errors-section').style.display = 'block';
    document.getElementById('error-count').textContent = recordingData.environment.consoleErrors.length;
    document.getElementById('console-errors').textContent = 
      JSON.stringify(recordingData.environment.consoleErrors, null, 2);
  }
  
  // Generate smart suggestion
  generateSmartSuggestion();
}

function generateSmartSuggestion() {
  if (recordingData.steps.length > 0) {
    const lastStep = recordingData.steps[recordingData.steps.length - 1];
    const domain = new URL(recordingData.environment.url).hostname;
    const stepDescription = formatStepDescription(lastStep);
    const suggestion = `${stepDescription} - failed on ${domain}`;

    document.getElementById('suggestion-text').textContent = suggestion;
    document.getElementById('smart-suggestion').style.display = 'flex';
  }
}

function useSuggestion() {
  const suggestion = document.getElementById('suggestion-text').textContent;
  document.getElementById('summary').value = suggestion;
  document.getElementById('smart-suggestion').style.display = 'none';
}

// Bug Submission
async function handleSubmitBug(e) {
  e.preventDefault();
  
  const settings = await chrome.storage.sync.get(['jiraUrl', 'email', 'apiToken']);
  
  if (!settings.jiraUrl || !settings.email || !settings.apiToken) {
    alert('Please configure Jira settings first');
    showView('settings');
    return;
  }
  
  const formData = {
    projectKey: document.getElementById('project').value,
    summary: document.getElementById('summary').value,
    issueType: document.getElementById('issue-type').value,
    priority: document.querySelector('.priority-btn.active').dataset.priority,
    expected: document.getElementById('expected').value,
    actual: document.getElementById('actual').value,
    steps: recordingData.steps,
    environment: recordingData.environment,
    screenshot: recordingData.screenshot
  };
  
  // Show loading
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="icon">⏳</span> Creating Issue...';
  submitBtn.disabled = true;
  
  try {
    const issueKey = await createJiraIssue(formData, settings);
    
    // Show success
    document.getElementById('issue-key').textContent = issueKey;
    document.getElementById('jira-issue-link').href = `${settings.jiraUrl}/browse/${issueKey}`;
    
    // Save to recent bugs
    await saveRecentBug({ key: issueKey, summary: formData.summary, timestamp: Date.now() });
    
    showView('success');
  } catch (error) {
    console.error('Failed to create issue:', error);
    alert('Failed to create issue: ' + error.message + '\n\nCheck browser console (F12) for details.');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Jira API
async function createJiraIssue(formData, settings) {
  // Format description
  const description = formatJiraDescription(formData);
  
  // Create issue payload
  const payload = {
    fields: {
      project: { key: formData.projectKey },
      summary: formData.summary,
      description: description,
      issuetype: { name: formData.issueType },
      priority: { name: formData.priority }
    }
  };
  
  // Make API call via background script
  const response = await chrome.runtime.sendMessage({
    type: 'CREATE_JIRA_ISSUE',
    payload: payload,
    settings: settings
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Upload screenshot if available
  if (formData.screenshot && response.issueKey) {
    await uploadScreenshot(response.issueKey, formData.screenshot, settings);
  }
  
  return response.issueKey;
}

function formatJiraDescription(formData) {
  // Jira API v3 requires Atlassian Document Format (ADF)
  // If you get errors, your Jira might need plain text instead
  // See formatJiraDescriptionPlainText() below for alternative
  
  const content = [];
  
  // Steps to Reproduce
  if (formData.steps.length > 0) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Steps to Reproduce' }]
    });
    
    content.push({
      type: 'orderedList',
      content: formData.steps.map(step => ({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: formatStepDescription(step) }]
        }]
      }))
    });
  }
  
  // Expected vs Actual
  content.push({
    type: 'heading',
    attrs: { level: 3 },
    content: [{ type: 'text', text: 'Expected vs Actual' }]
  });
  
  content.push({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Expected: ', marks: [{ type: 'strong' }] },
      { type: 'text', text: formData.expected || 'N/A' }
    ]
  });
  
  content.push({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Actual: ', marks: [{ type: 'strong' }] },
      { type: 'text', text: formData.actual }
    ]
  });
  
  // Environment Details
  content.push({
    type: 'heading',
    attrs: { level: 3 },
    content: [{ type: 'text', text: 'Environment Details' }]
  });
  
  content.push({
    type: 'bulletList',
    content: [
      {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: `URL: ${formData.environment.url}` }]
        }]
      },
      {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: `Browser: ${formData.environment.browser}` }]
        }]
      },
      {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: `Viewport: ${formData.environment.viewport?.width}x${formData.environment.viewport?.height}` }]
        }]
      },
      {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: `Timestamp: ${formData.environment.timestamp}` }]
        }]
      }
    ]
  });
  
  // Console Errors
  if (formData.environment.consoleErrors?.length > 0) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Console Errors' }]
    });
    
    content.push({
      type: 'codeBlock',
      attrs: { language: 'javascript' },
      content: [{
        type: 'text',
        text: JSON.stringify(formData.environment.consoleErrors, null, 2)
      }]
    });
  }
  
  return {
    type: 'doc',
    version: 1,
    content: content
  };
}

// ALTERNATIVE: Plain text format (if ADF doesn't work for your Jira)
// To use this, replace formatJiraDescription with this function name in createJiraIssue()
function formatJiraDescriptionPlainText(formData) {
  let description = '';
  
  // Steps to Reproduce
  if (formData.steps.length > 0) {
    description += 'Steps to Reproduce:\n';
    formData.steps.forEach((step, index) => {
      description += `${index + 1}. ${formatStepDescription(step)}\n`;
    });
    description += '\n';
  }
  
  // Expected vs Actual
  description += 'Expected vs Actual:\n';
  description += `Expected: ${formData.expected || 'N/A'}\n`;
  description += `Actual: ${formData.actual}\n\n`;
  
  // Environment
  description += 'Environment Details:\n';
  description += `- URL: ${formData.environment.url}\n`;
  description += `- Browser: ${formData.environment.browser}\n`;
  description += `- Viewport: ${formData.environment.viewport?.width}x${formData.environment.viewport?.height}\n`;
  description += `- Timestamp: ${formData.environment.timestamp}\n\n`;
  
  // Console Errors
  if (formData.environment.consoleErrors?.length > 0) {
    description += 'Console Errors:\n';
    description += JSON.stringify(formData.environment.consoleErrors, null, 2);
    description += '\n';
  }
  
  return description;
}

async function uploadScreenshot(issueKey, screenshotDataUrl, settings) {
  await chrome.runtime.sendMessage({
    type: 'UPLOAD_SCREENSHOT',
    issueKey: issueKey,
    screenshot: screenshotDataUrl,
    settings: settings
  });
}

// Settings
async function handleSaveSettings(e) {
  e.preventDefault();
  
  const settings = {
    jiraUrl: document.getElementById('jira-url').value.replace(/\/$/, ''), // Remove trailing slash
    email: document.getElementById('email').value,
    apiToken: document.getElementById('api-token').value,
    defaultProject: document.getElementById('default-project').value,
    autoCapture: document.getElementById('auto-capture-errors').checked,
    autoScreenshot: document.getElementById('auto-screenshot').checked
  };
  
  await chrome.storage.sync.set(settings);
  
  showStatus('Settings saved successfully!', 'success');
  
  // Load projects
  await loadProjects(settings);
}

async function testJiraConnection() {
  const jiraUrl = document.getElementById('jira-url').value;
  const email = document.getElementById('email').value;
  const apiToken = document.getElementById('api-token').value;
  
  if (!jiraUrl || !email || !apiToken) {
    showStatus('Please fill in all fields', 'error');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_JIRA_CONNECTION',
      settings: { jiraUrl, email, apiToken }
    });
    
    if (response.success) {
      showStatus('✓ Connection successful!', 'success');
    } else {
      showStatus('✗ Connection failed: ' + response.error, 'error');
    }
  } catch (error) {
    showStatus('✗ Connection failed: ' + error.message, 'error');
  }
}

async function loadProjects(settings) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_PROJECTS',
      settings: settings
    });
    
    if (response.projects) {
      const projectSelect = document.getElementById('project');
      const defaultProjectSelect = document.getElementById('default-project');
      
      // Clear existing options
      projectSelect.innerHTML = '<option value="">Select Project</option>';
      defaultProjectSelect.innerHTML = '<option value="">None</option>';
      
      // Add project options
      response.projects.forEach(project => {
        const option1 = new Option(project.name, project.key);
        const option2 = new Option(project.name, project.key);
        projectSelect.add(option1);
        defaultProjectSelect.add(option2);
      });
    }
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

async function checkSettings() {
  const settings = await chrome.storage.sync.get(['jiraUrl', 'email', 'apiToken']);
  if (settings.jiraUrl && settings.email && settings.apiToken) {
    await loadProjects(settings);
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('connection-status');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Recent Bugs
async function saveRecentBug(bug) {
  const { recentBugs = [] } = await chrome.storage.local.get(['recentBugs']);
  recentBugs.unshift(bug);
  
  // Keep only last 5 bugs
  if (recentBugs.length > 5) {
    recentBugs.pop();
  }
  
  await chrome.storage.local.set({ recentBugs });
}

async function loadRecentBugs() {
  const { recentBugs = [] } = await chrome.storage.local.get(['recentBugs']);
  const recentList = document.getElementById('recent-list');
  
  if (recentBugs.length === 0) {
    recentList.innerHTML = '<p class="empty-state">No recent bugs logged</p>';
  } else {
    recentList.innerHTML = recentBugs.map(bug => `
      <div style="padding: 10px; background: white; border-radius: 4px; margin-bottom: 8px;">
        <div style="font-weight: 600; color: #0d9488;">${bug.key}</div>
        <div style="font-size: 12px; color: #64748b;">${bug.summary}</div>
      </div>
    `).join('');
  }
}

// Helper Functions
function viewInJira() {
  const link = document.getElementById('jira-issue-link').href;
  chrome.tabs.create({ url: link });
}

function resetForm() {
  document.getElementById('bug-form').reset();
  recordingData = {
    steps: [],
    environment: {},
    screenshot: null,
    consoleErrors: [],
    networkErrors: []
  };
}