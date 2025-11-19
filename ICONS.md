# Icon Files Required

The extension manifest references icon files that need to be created. You'll need to create icon images in these sizes:

## Required Icon Sizes

Create an `icons/` directory and add:

- `icon16.png` - 16x16 pixels (toolbar icon, small)
- `icon32.png` - 32x32 pixels (toolbar icon, retina)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Design Suggestions

### Color Palette (Matching Extension Theme)
- Primary: Teal gradient (#0d9488 to #06b6d4)
- Accent: Purple (#7c3aed)
- Background: White or transparent

### Icon Ideas

**Option 1: Bug with Test Tube**
- Simple bug icon
- Combined with laboratory flask/test tube
- Modern, flat design
- Represents "test automation"

**Option 2: Bug with Checkmark**
- Bug silhouette
- Green checkmark overlay
- Represents "logged/tracked bug"

**Option 3: Bug with Jira J**
- Stylized bug
- Combined with "J" letter
- Clear Jira connection

**Option 4: Lightning Bug**
- Bug with lightning bolt
- Represents "quick logging"
- Dynamic and fast

### Tools to Create Icons

1. **Figma** (Free)
   - Professional design tool
   - Export at multiple resolutions
   - Vector-based

2. **Canva** (Free)
   - Easy to use
   - Templates available
   - Good for beginners

3. **Pixlr** (Free online)
   - Quick edits
   - No install needed
   - Export PNG

4. **GIMP** (Free desktop)
   - Full Photoshop alternative
   - All features needed
   - Open source

### Quick Placeholder

For testing, you can use a simple colored square:
- Create 128x128 canvas
- Fill with teal gradient
- Add white "JQL" text
- Export at 128, 48, 32, 16 sizes

## Important Notes

- ✅ Use PNG format for transparency
- ✅ Ensure icons are square (1:1 ratio)
- ✅ Use consistent style across all sizes
- ✅ Test on light and dark backgrounds
- ✅ Keep design simple and recognizable at 16px

## Directory Structure

```
jira-quick-logger/
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json
└── ... other files
```

Without these icons, the extension will still work but will show a default placeholder icon in Chrome.

---

## Need Icons Designed?

You can:
1. Design them yourself using tools above
2. Use AI image generators (Midjourney, DALL-E)
3. Hire a designer on Fiverr ($5-20)
4. Use icon libraries (Flaticon, Icons8)

For now, Chrome will use a default icon if these files don't exist.
