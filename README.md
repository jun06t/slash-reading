# Slash Reading Chrome Extension

A Chrome extension that automatically inserts learning slashes (/) into English text on web pages to help with reading comprehension.

## Features

- **One-click activation**: Toggle slash reading on/off for any page
- **Selection mode**: Apply slash reading to selected text only
- **AI-powered chunking**: Uses OpenAI to intelligently break text into meaningful phrases
- **Non-destructive display**: Uses CSS pseudo-elements to preserve original text
- **Customizable appearance**: Configure slash color and display method
- **Smart caching**: Reduces API calls with intelligent response caching
- **Keyboard shortcuts**: Quick access with Alt+S (toggle) and Alt+D (selection)

## Installation

### For Development

1. Open `icons/generate_icons.html` in a browser and save the 4 icon files (16.png, 32.png, 48.png, 128.png) to the `icons` folder

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select this directory

5. The extension will appear in your extensions list

## Setup

1. Click the extension icon and go to Settings

2. Enter your OpenAI API key (get one from https://platform.openai.com/api-keys)

3. Configure your preferences:
   - AI Model (GPT-4o Mini recommended)
   - Slash color
   - Display method
   - Processing settings

## Usage

### Page Mode
- Click the extension icon and toggle "Enable for this page"
- Or right-click and select "Toggle Slash Reading (Page)"
- Or use keyboard shortcut Alt+S

### Selection Mode
- Select text on the page
- Click "Apply to Selection" in the popup
- Or right-click and select "Apply Slash Reading (Selection)"
- Or use keyboard shortcut Alt+D

## Configuration

### Required Settings
- **OpenAI API Key**: Your API key for OpenAI services

### Display Settings
- **Slash Color**: Customize the color of slash markers
- **Display Method**: Choose between CSS pseudo-elements or actual text insertion

### Processing Settings
- **Target Selectors**: CSS selectors for elements to process
- **Exclude Selectors**: CSS selectors for elements to skip
- **Dynamic Monitoring**: Auto-process new content added to pages

## Project Structure

```
slash-reading-extension/
├── manifest.json         # Extension configuration
├── background.js         # Service worker
├── content.js           # DOM manipulation
├── popup.html/js        # Extension popup
├── options.html/js      # Settings page
├── lib/                 # Core modules
│   ├── api.js          # OpenAI integration
│   ├── dom.js          # DOM utilities
│   ├── text.js         # Text processing
│   ├── queue.js        # Request queue
│   └── storage.js      # Storage wrapper
├── styles/             # CSS files
│   ├── content.css     # Page styles
│   ├── popup.css       # Popup styles
│   └── options.css     # Settings styles
└── icons/              # Extension icons
```

## Privacy

- API keys are stored locally in Chrome's sync storage
- Text processing is done via OpenAI's API
- Responses are cached locally to reduce API calls

## License

MIT