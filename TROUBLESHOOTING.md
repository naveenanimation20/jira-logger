# 🔧 Troubleshooting: "Failed to create issue" Error

## Issue
You get "Failed to create issue: Failed to create issue" even though connection test passes.

## ✅ Fixes Applied

I've updated the extension with:
1. **Better error messages** - Now shows the actual Jira error
2. **ADF format** - Updated description to use proper Atlassian Document Format
3. **Console logging** - Logs full error details to browser console
4. **Plain text fallback** - Alternative format if needed

---

## 🔍 Debug Steps

### Step 1: Check the Detailed Error

1. **Open Browser Console**:
   - Press `F12` or right-click → Inspect
   - Click "Console" tab
   - Keep it open

2. **Try creating a bug again**
   - You should now see detailed error messages
   - Look for red text starting with "Jira API error response:"

3. **Share the error with me**
   - Copy the error message
   - It will tell us exactly what field is causing issues

### Step 2: Common Issues & Solutions

#### Error: "Field 'description' cannot be set"
**Solution**: Your Jira project might not use the description field, or uses a custom field.

**Fix**: 
- Check your Jira project settings
- See which fields are required for "Bug" issue type
- We may need to adjust the payload

#### Error: "Field 'priority' cannot be set"
**Solution**: Priority field might be named differently or not available.

**Fix**: Open `popup.js` and comment out the priority line:
```javascript
// priority: { name: formData.priority }
```

#### Error: "Issue type 'Bug' does not exist"
**Solution**: Your project uses different issue type names.

**Fix**: 
- Check your Jira project → Issue Types
- Update the form or select different type

#### Error: "Field X is required"
**Solution**: Your project has custom required fields.

**Fix**: We need to add those fields to the form and payload.

---

## 🧪 Testing Steps

### Test 1: Minimal Bug Creation

Let's create the simplest possible bug to isolate the issue:

1. **Open `popup.js`**
2. **Find the `createJiraIssue` function**
3. **Replace the payload with this minimal version**:

```javascript
const payload = {
  fields: {
    project: { key: formData.projectKey },
    summary: formData.summary,
    issuetype: { name: formData.issueType }
    // Removed: description, priority - testing minimal payload
  }
};
```

4. **Try creating a bug**
5. **If this works**: The issue is with description or priority fields
6. **If this fails**: The issue is with project/summary/issuetype

### Test 2: Check Project Configuration

1. **Go to your Jira project**
2. **Settings → Issues → Issue Types**
3. **Click on "Bug" (or your issue type)**
4. **Check which fields are**:
   - Required (red asterisk)
   - Available
   - The format they use

### Test 3: Use Plain Text Description

If ADF format doesn't work:

1. **Open `popup.js`**
2. **Find line with `formatJiraDescription(formData)`**
3. **Replace with `formatJiraDescriptionPlainText(formData)`**
4. **Try again**

---

## 📋 Quick Diagnostic Checklist

Run through these:

- [ ] Connection test passes ✅
- [ ] Browser console is open
- [ ] Tried creating bug and saw detailed error
- [ ] Project key is correct (uppercase, matches Jira)
- [ ] Issue type exists in project ("Bug" is common)
- [ ] Summary field is filled
- [ ] Using Chrome (not other browsers)

---

## 🆘 Get More Help

**Please share:**
1. The error message from browser console (F12)
2. Your Jira project type (Scrum, Kanban, Classic)
3. Your Jira version (Cloud or Server)
4. Screenshot of the error

**I'll help you:**
- Fix the payload format
- Add required fields
- Handle your Jira configuration

---

## 🔧 Advanced: Manual API Test

Test your Jira API directly:

```bash
# Replace YOUR_EMAIL, YOUR_TOKEN, YOUR_DOMAIN, YOUR_PROJECT
curl -X POST \
  https://YOUR_DOMAIN.atlassian.net/rest/api/3/issue \
  -H "Content-Type: application/json" \
  -u "YOUR_EMAIL:YOUR_TOKEN" \
  -d '{
    "fields": {
      "project": {"key": "YOUR_PROJECT"},
      "summary": "Test from curl",
      "issuetype": {"name": "Bug"}
    }
  }'
```

If this works, the extension should work too!
If this fails, it's a Jira configuration issue.

---

## 📥 Updated Extension

**Download the fixed version**: [jira-quick-logger.zip](computer:///mnt/user-data/outputs/jira-quick-logger.zip)

**Changes:**
- ✅ Better error messages
- ✅ Proper ADF format
- ✅ Console logging
- ✅ Plain text fallback option

---

## 💡 Next Steps

1. **Download updated zip**
2. **Remove old extension from Chrome**
3. **Load new version**
4. **Try again with console open**
5. **Share the error message with me**

I'll help you fix it! 🚀
