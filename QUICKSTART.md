# 🚀 Quick Start Guide

## Get Started in 3 Steps

### Step 1: Install Extension (2 minutes)

1. Open Chrome → Go to `chrome://extensions/`
2. Turn ON "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `jira-quick-logger` folder
5. Pin the extension to toolbar (optional)

### Step 2: Connect to Jira (3 minutes)

1. Get your Jira API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token

2. Configure extension:
   - Click extension icon
   - Click "Settings"
   - Enter:
     * Jira URL: `https://yourcompany.atlassian.net`
     * Email: `your.email@company.com`
     * API Token: [paste token]
   - Click "Test Connection"
   - Click "Save Settings"

### Step 3: Log Your First Bug (30 seconds)

1. Navigate to any webpage with a bug
2. Click extension icon
3. Click "Quick Bug Report"
4. Fill in:
   - Summary: "Login button not working"
   - Actual behavior: "Page stays on login screen"
5. Click "Create Jira Issue"
6. Done! ✅

---

## Two Ways to Log Bugs

### 🚀 Quick Report (30 sec)
**When**: Simple bugs, need to log fast
- Auto-captures: Screenshot + Environment
- You add: Summary + Description
- Perfect for: UI bugs, visual issues

### 📝 Record Steps (60 sec)
**When**: Complex bugs, need reproduction steps
- Auto-captures: Steps + Screenshot + Environment
- You perform: Actual bug reproduction
- Perfect for: Workflow bugs, multi-step issues

---

## Tips for Best Results

✅ **Use Clear Summaries**
- Good: "Login fails when using Google SSO"
- Bad: "Login broken"

✅ **Describe Actual Behavior**
- Good: "Error message appears: 'Invalid credentials'"
- Bad: "It doesn't work"

✅ **Select Correct Priority**
- Critical: System down, data loss
- High: Major feature broken
- Medium: Feature partially working
- Low: Minor cosmetic issue

✅ **Review Before Submitting**
- Check screenshot captures the issue
- Verify steps are complete
- Ensure project is selected

---

## Common Scenarios

### Scenario 1: UI Bug
1. Quick Bug Report
2. Summary: "Button misaligned on mobile"
3. Actual: "Submit button overlaps text field"
4. Submit → Done!

### Scenario 2: Form Submission Error
1. Record Steps & Report
2. Perform: Fill form → Click submit
3. Stop Recording
4. Summary: Auto-suggested
5. Submit → Done!

### Scenario 3: Console Error
1. Quick Bug Report (errors auto-captured!)
2. Summary: "JavaScript error on checkout"
3. Check: Console Errors section (auto-filled)
4. Submit → Done!

---

## Keyboard Workflow (Pro Tip)

1. Spot bug → Alt+Click extension icon
2. Click "Quick Bug"
3. Tab → Type summary
4. Tab Tab → Type actual behavior
5. Enter → Submit
6. Back to testing!

**Total time: 25 seconds** ⚡

---

## What Happens After Submit

1. ✅ Issue created in Jira
2. ✅ Screenshot uploaded as attachment
3. ✅ Success message shown
4. ✅ Link to view in Jira
5. ✅ Saved to recent bugs

---

## Need Help?

### Extension Not Working?
- Reload the page after installing
- Check permissions granted
- Verify Jira credentials

### Can't Connect to Jira?
- Check URL format (no trailing slash)
- Verify API token is fresh
- Ensure you have Jira access

### Recording Not Capturing?
- Some sites block content scripts
- Try clicking "Quick Bug" instead
- Manual steps work too!

---

## Video Tutorial

[Coming Soon]

---

**You're ready to save 80-90% of your bug logging time!** 🚀

Questions? Check the full README.md for details.
