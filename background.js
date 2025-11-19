// Jira Quick Logger - Background Service Worker

// Message Handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_POPUP_TO_STOP') {
    // Show a notification to user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Jira Quick Logger',
      message: 'Click the extension icon to stop recording and create your bug report.'
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'CREATE_JIRA_ISSUE') {
    handleCreateIssue(message.payload, message.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'UPLOAD_SCREENSHOT') {
    handleUploadScreenshot(message.issueKey, message.screenshot, message.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.type === 'TEST_JIRA_CONNECTION') {
    handleTestConnection(message.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_PROJECTS') {
    handleGetProjects(message.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true;
  }
});

// Create Jira Issue
async function handleCreateIssue(payload, settings) {
  try {
    const auth = btoa(`${settings.email}:${settings.apiToken}`);
    
    console.log('Creating Jira issue with payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${settings.jiraUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Jira API error response:', errorData);
      
      // Extract detailed error message
      let errorMessage = 'Failed to create issue';
      
      if (errorData.errorMessages && errorData.errorMessages.length > 0) {
        errorMessage = errorData.errorMessages.join(', ');
      } else if (errorData.errors) {
        // Field-specific errors
        const fieldErrors = Object.entries(errorData.errors)
          .map(([field, error]) => `${field}: ${error}`)
          .join(', ');
        errorMessage = fieldErrors || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Issue created successfully:', result);
    return { issueKey: result.key, issueId: result.id };
  } catch (error) {
    console.error('Create issue error:', error);
    throw error;
  }
}

// Upload Screenshot
async function handleUploadScreenshot(issueKey, screenshotDataUrl, settings) {
  try {
    // Convert data URL to blob
    const blob = dataURLtoBlob(screenshotDataUrl);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', blob, 'screenshot.png');
    
    const auth = btoa(`${settings.email}:${settings.apiToken}`);
    
    const response = await fetch(`${settings.jiraUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'X-Atlassian-Token': 'no-check'
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errorMessages?.[0] || 'Failed to upload screenshot');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Upload screenshot error:', error);
    throw error;
  }
}

// Test Jira Connection
async function handleTestConnection(settings) {
  try {
    const auth = btoa(`${settings.email}:${settings.apiToken}`);
    
    const response = await fetch(`${settings.jiraUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    return { 
      success: true, 
      user: {
        displayName: data.displayName,
        emailAddress: data.emailAddress
      }
    };
  } catch (error) {
    console.error('Test connection error:', error);
    throw error;
  }
}

// Get Jira Projects
async function handleGetProjects(settings) {
  try {
    const auth = btoa(`${settings.email}:${settings.apiToken}`);
    
    const response = await fetch(`${settings.jiraUrl}/rest/api/3/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    
    const projects = await response.json();
    return { 
      projects: projects.map(p => ({ 
        key: p.key, 
        name: p.name,
        id: p.id
      }))
    };
  } catch (error) {
    console.error('Get projects error:', error);
    throw error;
  }
}

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(':')[1].split(';')[0];
  
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeString });
}

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings on first install
    chrome.tabs.create({ url: 'popup.html' });
  }
});
