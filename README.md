# 🐛 Jira Quick Logger - Chrome Extension

A professional Chrome extension that revolutionizes bug logging by auto-capturing screenshots, environment details, and user interactions in seconds.

---

## 🎨 Design Philosophy

This extension features a **modern, unique color scheme** designed to stand out:

### Color Palette
- **🔵 Teal/Cyan Gradient**: Primary actions (#0d9488 → #06b6d4)
- **🟣 Purple Accents**: Step indicators (#7c3aed → #a78bfa)
- **🟡 Warm Amber**: Recording states (#f59e0b)
- **🟢 Fresh Green**: Success states (#10b981)
- **⚪ Clean Neutrals**: Professional grays

### Design Goals
- ✅ **Original** - Custom design, not generic
- ✅ **Professional** - Enterprise-ready aesthetics
- ✅ **Modern** - Contemporary gradient design
- ✅ **Distinctive** - Memorable and unique
- ✅ **Accessible** - WCAG compliant contrast ratios

---

## ⚡ Key Features

### Auto-Capture Everything
- 📸 **Screenshot**: Automatic capture of current tab
- 🌐 **Environment**: URL, browser, viewport, timestamp
- ⚠️ **Console Errors**: JavaScript errors captured
- 🔗 **Network Errors**: Failed resource loads
- 📝 **User Steps**: Record interactions (optional)

### Smart Recording
- **Quick Bug Report**: 30-second bug logging
- **Step Recording**: Capture user interactions automatically
- **Smart Selectors**: Generates reliable element locators
- **Visual Feedback**: Highlights recorded elements

### Jira Integration
- **Direct API**: No middleware, direct Jira connection
- **All Issue Types**: Bug, Task, Story support
- **Project Auto-load**: Fetches your projects automatically
- **Attachment Upload**: Screenshots uploaded automatically

### Time Savings
- **Before**: 5-10 minutes per bug
- **After**: 30-60 seconds per bug
- **Reduction**: **80-90% time saved!** 🚀

---

## 🚀 Installation & Setup

### Step 1: Load the Extension

1. **Download/Clone the files**
   ```bash
   cd jira-quick-logger
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top right)

3. **Load Unpacked**
   - Click **"Load unpacked"**
   - Select the `jira-quick-logger` folder
   - Extension icon should appear in toolbar

### Step 2: Configure Jira

1. **Get Your Jira API Token**
   - Visit [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click **"Create API token"**
   - Label it: "Jira Quick Logger"
   - **Copy the token** (you can't view it again!)

2. **Configure Extension**
   - Click the extension icon
   - Click **"Settings"**
   - Fill in:
     - **Jira URL**: `https://yourcompany.atlassian.net`
     - **Email**: Your Jira account email
     - **API Token**: Paste the token you copied
   - Click **"Test Connection"**
   - Click **"Save Settings"**

### Step 3: Start Logging!

You're ready to log bugs in seconds! 🎉

---

## 📖 How to Use

### Option 1: Quick Bug Report (30 seconds)

**Best for**: Simple bugs, immediate logging

1. Click extension icon
2. Click **"Quick Bug Report"**
3. Auto-capture happens instantly
4. Fill in:
   - Bug summary
   - Actual behavior
   - Select project & priority
5. Click **"Create Jira Issue"**
6. Done! ✅

### Option 2: Record Steps (60 seconds)

**Best for**: Complex bugs requiring reproduction steps

1. Click extension icon
2. Click **"Record Steps & Report"**
3. Perform actions on the webpage:
   - Click buttons
   - Fill forms
   - Navigate pages
4. Click **"Stop & Create Bug Report"**
5. Review captured steps
6. Fill remaining details
7. Click **"Create Jira Issue"**
8. Done! ✅

---

## 📁 Project Structure

```
jira-quick-logger/
├── manifest.json         # Extension configuration
├── popup.html           # Main UI (all 5 views)
├── popup.css            # Modern teal/purple styling
├── popup.js             # UI logic & interactions
├── background.js        # Jira API & message handler
├── content.js           # Page interaction recording
├── content.css          # Content script styles
├── icons/               # Extension icons (16-128px)
├── ui-mockup.html       # Visual preview
├── FLOW.md             # Technical documentation
└── README.md           # This file
```

---

## 🎯 What Gets Auto-Captured

### Always Captured
- ✅ Current page URL
- ✅ Page title
- ✅ Browser & version
- ✅ Viewport size
- ✅ Timestamp
- ✅ Screenshot (optional)

### If Recording Steps
- ✅ Click actions with element selectors
- ✅ Input actions (without values for security)
- ✅ Navigation events
- ✅ Timestamps for each action

### If Available
- ✅ Console errors with stack traces
- ✅ Network errors (failed resources)
- ✅ JavaScript exceptions

---

## 🔧 Technical Details

### Tech Stack
- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No framework dependencies
- **Jira REST API v3**: Direct API integration
- **Chrome APIs**: tabs, storage, scripting

### Architecture

```
┌─────────────────────────────────────────────┐
│           Chrome Extension                  │
├─────────────────────────────────────────────┤
│  Popup UI (popup.html/js/css)               │
│  ↕ Message Passing                          │
│  Background Worker (background.js)          │
│  ↕ API Calls                                │
│  Jira REST API                              │
│                                             │
│  Content Script (content.js/css)            │
│  ↕ DOM Events                               │
│  Active Webpage                             │
└─────────────────────────────────────────────┘
```

### API Endpoints Used
- `POST /rest/api/3/issue` - Create issue
- `POST /rest/api/3/issue/{key}/attachments` - Upload screenshot
- `GET /rest/api/3/project` - Fetch projects
- `GET /rest/api/3/myself` - Test connection

---

## 🎨 Preview the UI

**Open `ui-mockup.html` in your browser** to see:
- All 4 main screens visualized
- Complete user flow
- Time savings comparison
- Interactive preview

---

## 📊 Benefits

### For QA Testers
- ⚡ **80-90% faster** bug logging
- 🎯 **Consistent format** - no missed details
- 🔄 **Less context switching** - stay in testing flow
- 📸 **Visual proof** - screenshots attached automatically

### For Developers
- 🚀 **Faster triage** - all info in one place
- 🔍 **Better context** - exact reproduction steps
- 🐛 **Easier debugging** - console errors included
- ✅ **Higher quality** - complete environment details

### For Teams
- 📈 **Increased productivity** - more time for actual testing
- 🤝 **Better communication** - standardized bug format
- 💰 **Cost savings** - reduced time spent on admin work
- 😊 **Higher satisfaction** - less frustration with bug logging

---

## 🛡️ Security & Privacy

- ✅ **No external servers**: Direct Jira connection only
- ✅ **Encrypted storage**: API tokens stored securely
- ✅ **No PII capture**: Input values not recorded
- ✅ **Local processing**: All data stays on your machine
- ✅ **Open source**: Review the code yourself

---

## 🔮 Future Enhancements

Potential features for v2.0:
- 🎥 Screen recording
- 🤖 AI-powered bug summaries
- 📊 Analytics dashboard
- 🌙 Dark mode
- ⌨️ Keyboard shortcuts
- 👥 Team templates
- 🔄 Duplicate detection
- 🎨 Custom themes

---

## 🐛 Troubleshooting

### Connection Issues
- ✅ Verify Jira URL format: `https://yourcompany.atlassian.net`
- ✅ Check API token is valid
- ✅ Ensure email matches Jira account
- ✅ Check Jira permissions

### Recording Not Working
- ✅ Reload the page after installing extension
- ✅ Check if page allows content scripts
- ✅ Some sites block extension scripts (banks, secure sites)

### Screenshot Issues
- ✅ Grant "activeTab" permission
- ✅ Ensure Chrome has screen capture access
- ✅ Try different tab/window

---

## 📝 License

This extension is provided as-is for educational and productivity purposes.

---

## 👨‍💻 Developer

Built by **Naveen Automation Labs**
- 🌐 [Website](https://naveenautomationlabs.com)
- 📺 [YouTube](https://youtube.com/naveenautomationlabs)
- 💼 [LinkedIn](https://linkedin.com/in/naveenkhunteta)

---

## 🙏 Feedback

Found a bug? Have a feature request?
Please open an issue or submit a pull request!

---

## 📈 Version History

### v1.0.0 (Initial Release)
- ✅ Quick bug reporting
- ✅ Step recording
- ✅ Screenshot capture
- ✅ Environment auto-capture
- ✅ Jira API integration
- ✅ Modern UI with teal/purple theme

---

**Happy Bug Logging! 🐛✨**
