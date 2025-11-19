# Jira Quick Logger - User Flow & How It Works

## 📋 Overview
Jira Quick Logger is a Chrome extension that allows testers to quickly log bugs to Jira with auto-captured environment details, screenshots, and recorded steps.

---

## 🔄 Complete User Flow

### **STEP 1: Opening the Extension**

**User Action:**
- Click on the extension icon in Chrome toolbar

**What Happens:**
- Extension popup opens (400px x 500px)
- Shows landing view with 3 main options

**UI State: Landing View**
```
┌─────────────────────────────────────┐
│   🔵 Jira Quick Logger             │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   🐛 Quick Bug Report         │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   ⏺️  Record Steps & Report    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   ⚙️  Settings                 │ │
│  └───────────────────────────────┘ │
│                                     │
│  Recent Bugs                        │
│  No recent bugs logged              │
└─────────────────────────────────────┘
```

---

### **STEP 2A: Quick Bug Report (Fast Path)**

**User Action:**
- Clicks "Quick Bug Report" button

**What Happens:**
1. Extension captures screenshot of current tab
2. Collects environment data automatically:
   - Current URL
   - Browser & version
   - Viewport size
   - Timestamp
   - Console errors (if any)
   - Network errors (if any)
3. Switches to Bug Form view with pre-filled data

**Time Taken:** < 1 second

---

### **STEP 2B: Record Steps & Report (Detailed Path)**

**User Action:**
- Clicks "Record Steps & Report" button

**What Happens:**
1. Extension enters recording mode
2. Content script starts listening to user interactions
3. Timer starts counting
4. UI changes to Recording View

**UI State: Recording View**
```
┌─────────────────────────────────────┐
│ 🔴 Recording Steps...        00:15  │
├─────────────────────────────────────┤
│ Perform the actions that reproduce  │
│ the bug                             │
│                                     │
│ Captured Steps (3)                  │
│  ┌─────────────────────────────┐   │
│  │ 1 Click on Login button     │   │
│  │ 2 Type in Username field    │   │
│  │ 3 Click on Submit button    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ⏹️  Stop & Create Bug Report  │ │
│  └───────────────────────────────┘ │
│  Cancel                             │
└─────────────────────────────────────┘
```

**User Action:**
- User performs steps on the actual webpage
  - Click elements
  - Type in fields
  - Navigate pages
  - etc.

**What Gets Recorded:**
- Each click action → Element selector + text
- Each input action → Field selector + placeholder
- Each navigation → URL change
- Timestamp for each action

**Example Recorded Steps:**
```javascript
[
  {
    action: 'click',
    element: '#login-button',
    text: 'Login',
    timestamp: '2024-11-18T10:30:15.123Z'
  },
  {
    action: 'type',
    element: 'input[name="username"]',
    value: '[REDACTED]',
    timestamp: '2024-11-18T10:30:18.456Z'
  },
  {
    action: 'click',
    element: 'button[type="submit"]',
    text: 'Submit',
    timestamp: '2024-11-18T10:30:22.789Z'
  }
]
```

**User Action:**
- Clicks "Stop & Create Bug Report"

**What Happens:**
1. Stop recording interactions
2. Capture screenshot of final state
3. Collect environment data
4. Switch to Bug Form view with all data pre-filled

---

### **STEP 3: Bug Form (Creating the Report)**

**UI State: Bug Form View**
```
┌─────────────────────────────────────┐
│ ← Back    Create Bug Report         │
├─────────────────────────────────────┤
│ Auto-Captured Information ✓         │
│ 📸 Screenshot  📝 3 Steps            │
│ 🌐 Environment  ⚠️ 2 Errors          │
│                                     │
│ Bug Summary *                       │
│ [Login button not responding...  ] │
│ 💡 Suggestion: "Login fails on...  │
│                                     │
│ Project *        Type               │
│ [PROJECT ▼]      [Bug ▼]            │
│                                     │
│ Priority                            │
│ [Low] [Medium*] [High] [Critical]   │
│                                     │
│ Expected Behavior                   │
│ [Should navigate to dashboard]      │
│                                     │
│ Actual Behavior *                   │
│ [Page remains on login screen]      │
│                                     │
│ Screenshot                          │
│ [Image Preview]                     │
│ ✏️ Annotate  📸 Retake  🗑️ Remove   │
│                                     │
│ ▼ Environment Details               │
│ ▼ Console Errors (2)                │
│                                     │
│ [🚀 Create Jira Issue]              │
│ [Save Draft]                        │
└─────────────────────────────────────┘
```

**Smart Features:**

1. **Auto-Generated Summary** (if user leaves it empty)
   - AI suggests: "Login fails on credential submission"
   - Based on: Last recorded action + page context

2. **Auto-Captured Pills**
   - Shows what was automatically collected
   - User can see at a glance

3. **Collapsible Sections**
   - Environment Details (collapsed by default)
   - Console Errors (collapsed, shows count)
   - Keeps form clean

4. **Screenshot Actions**
   - Annotate: Opens drawing tool to add arrows/highlights
   - Retake: Captures new screenshot
   - Remove: Removes screenshot from report

**User Action:**
- Fills in required fields (Summary, Actual Behavior)
- Optionally edits other fields
- Clicks "Create Jira Issue"

**What Happens (Behind the Scenes):**

1. **Validation**
   ```javascript
   - Check if Jira credentials configured
   - Validate required fields filled
   - Validate project selected
   ```

2. **Data Preparation**
   ```javascript
   {
     project: "PROJ",
     summary: "Login button not responding on click",
     description: [Formatted with steps, environment, errors],
     issuetype: "Bug",
     priority: "Medium",
     expected: "Should navigate to dashboard",
     actual: "Page remains on login screen"
   }
   ```

3. **API Call to Jira**
   ```
   POST https://yourcompany.atlassian.net/rest/api/3/issue
   Authorization: Basic [base64(email:apiToken)]
   Body: [Issue data]
   ```

4. **Upload Screenshot**
   ```
   POST https://yourcompany.atlassian.net/rest/api/3/issue/PROJ-123/attachments
   ```

5. **Response Handling**
   - Success: Get issue key (e.g., PROJ-123)
   - Error: Show error message

---

### **STEP 4: Success View**

**UI State: Success View**
```
┌─────────────────────────────────────┐
│                                     │
│             ✅                       │
│                                     │
│    Bug Logged Successfully!         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Your bug has been created   │   │
│  │                             │   │
│  │      PROJ-123 🔗            │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [View in Jira]                     │
│  [Log Another Bug]                  │
│  [Done]                             │
│                                     │
└─────────────────────────────────────┘
```

**User Action:**
- Click "View in Jira" → Opens Jira issue in new tab
- Click "Log Another Bug" → Returns to landing view
- Click "Done" → Closes popup

---

### **STEP 5: Settings Configuration**

**User Action:**
- From landing view, clicks "Settings"

**UI State: Settings View**
```
┌─────────────────────────────────────┐
│ ← Back    Settings                  │
├─────────────────────────────────────┤
│ Jira URL *                          │
│ [https://company.atlassian.net]     │
│                                     │
│ Email *                             │
│ [user@company.com]                  │
│                                     │
│ API Token *                         │
│ [••••••••••••••]                    │
│ Get API Token                       │
│                                     │
│ Default Project                     │
│ [PROJECT ▼]                         │
│                                     │
│ ☑ Auto-capture console errors       │
│ ☑ Auto-capture screenshot           │
│                                     │
│ [Save Settings]                     │
│ [Test Connection]                   │
│                                     │
│ ✓ Connection successful!            │
└─────────────────────────────────────┘
```

**Configuration Steps:**

1. **Get Jira API Token**
   - User clicks "Get API Token" link
   - Opens: https://id.atlassian.com/manage-profile/security/api-tokens
   - User creates token
   - Copy token back to extension

2. **Test Connection**
   - Clicks "Test Connection"
   - Extension makes API call: `GET /rest/api/3/myself`
   - Shows success/error message

3. **Save Settings**
   - Stores credentials in Chrome Storage (encrypted)
   - Fetches available projects from Jira
   - Shows success message

---

## 🔧 Technical Flow (Behind the Scenes)

### **1. Extension Components**

```
┌─────────────────────────────────────────────┐
│           Chrome Extension                  │
├─────────────────────────────────────────────┤
│                                             │
│  Popup UI (popup.html/js)                   │
│  ↕                                          │
│  Background Service Worker (background.js)  │
│  ↕                                          │
│  Content Script (content.js)                │
│  ↕                                          │
│  Active Webpage                             │
│                                             │
└─────────────────────────────────────────────┘
```

### **2. Message Flow**

```
User clicks "Start Recording"
  ↓
Popup → Background Service Worker
  {type: 'START_RECORDING'}
  ↓
Background → Content Script (injected in active tab)
  {type: 'START_RECORDING'}
  ↓
Content Script starts listening to DOM events
  - click
  - input
  - change
  - navigation
  ↓
Each action → Content Script stores in array
  ↓
Content Script → Background Service Worker
  {type: 'STEP_RECORDED', step: {...}}
  ↓
Background → Popup
  {type: 'UPDATE_STEPS', steps: [...]}
  ↓
Popup updates UI with step count

User clicks "Stop Recording"
  ↓
Popup → Content Script
  {type: 'STOP_RECORDING'}
  ↓
Content Script → Popup
  {type: 'RECORDING_DATA', data: {steps, environment}}
  ↓
Popup captures screenshot via Chrome API
  ↓
Popup switches to Form View with all data
```

### **3. Data Storage**

```javascript
// Chrome Storage Sync (encrypted, synced across devices)
{
  jiraUrl: 'https://company.atlassian.net',
  email: 'user@company.com',
  apiToken: 'encrypted_token',
  defaultProject: 'PROJ',
  autoCapture: true
}

// Chrome Storage Local (temporary, per session)
{
  currentRecording: {
    steps: [...],
    startTime: 1700307015000,
    environment: {...}
  },
  recentBugs: [
    {key: 'PROJ-123', summary: '...', timestamp: ...},
    {key: 'PROJ-124', summary: '...', timestamp: ...}
  ]
}
```

### **4. Jira API Integration**

```
Create Issue Flow:
─────────────────

1. Prepare payload
   {
     fields: {
       project: {key: "PROJ"},
       summary: "Bug summary",
       description: "Formatted description",
       issuetype: {name: "Bug"},
       priority: {name: "Medium"}
     }
   }

2. Make API call
   POST /rest/api/3/issue
   Headers:
     Authorization: Basic base64(email:apiToken)
     Content-Type: application/json
   
3. Receive response
   {
     id: "10001",
     key: "PROJ-123",
     self: "https://company.atlassian.net/rest/api/3/issue/10001"
   }

4. Upload screenshot
   POST /rest/api/3/issue/PROJ-123/attachments
   Headers:
     X-Atlassian-Token: no-check
   Body: FormData with screenshot file

5. Return issue key to UI
```

---

## 📊 Data Flow Summary

```
User Action → Content Script (DOM) → Background Worker → Popup UI
                     ↓
              Capture Data:
              - Steps
              - Screenshot
              - Environment
              - Errors
                     ↓
              Format Data
                     ↓
              Jira API
                     ↓
              Create Issue
                     ↓
              Upload Attachment
                     ↓
              Success Response
                     ↓
              Update UI
```

---

## ⏱️ Time Comparison

| Method | Time Required |
|--------|---------------|
| **Manual Bug Logging** | 5-10 minutes |
| - Take screenshot manually | 30 sec |
| - Open Jira | 15 sec |
| - Create new issue | 20 sec |
| - Copy/paste URL | 10 sec |
| - Type all environment details | 2-3 min |
| - Upload screenshot | 30 sec |
| - Write steps | 2-3 min |
| - Fill all fields | 1 min |
| | |
| **With Quick Logger** | **30-60 seconds** |
| - Click extension icon | 1 sec |
| - Click "Record Steps" | 1 sec |
| - Perform actions | 10-20 sec |
| - Stop recording | 1 sec |
| - Review & submit | 15-30 sec |

**Time Saved:** 80-90% reduction in bug logging time!

---

## 🎯 Key Benefits

1. **Auto-Capture Everything**
   - No manual copy-paste of URLs
   - No manual typing of browser info
   - No manual screenshot taking

2. **Visual Steps**
   - No need to write step-by-step instructions
   - Actions recorded automatically

3. **Context Preserved**
   - Console errors captured
   - Network errors captured
   - Exact timestamp recorded

4. **One-Click Submit**
   - Direct integration with Jira
   - No need to switch contexts

5. **Consistent Format**
   - All bugs follow same template
   - Easy for developers to understand

---

## 🚀 Usage Scenarios

### Scenario 1: Quick Bug During Testing
```
Tester finds a bug → Click extension → Quick Bug Report 
→ Add summary → Submit → Done in 30 seconds
```

### Scenario 2: Complex Multi-Step Bug
```
Tester needs to reproduce bug → Click extension 
→ Start Recording → Perform steps → Stop 
→ Review steps → Submit → Done in 1 minute
```

### Scenario 3: Bug with Console Errors
```
Tester sees JS error → Click extension → Quick Report 
→ Extension auto-captures console errors 
→ Submit → Developers see exact error → Done in 30 seconds
```

---

This flow ensures maximum efficiency while maintaining comprehensive bug documentation!
