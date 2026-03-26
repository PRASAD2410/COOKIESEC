# CookieSec - JavaScript Backend

This is the JavaScript/Node.js version of the Cookie Security Analyzer, originally built with Python/Flask.

## Features

- 🍪 **Cookie Scanning** - Analyzes cookies from any website using Puppeteer
- 🔐 **Security Scoring** - Evaluates HTTP-Only, Secure, and SameSite flags
- 🤖 **AI-Powered Analysis** - Uses Google Gemini API for intelligent security summaries
- 📊 **Pattern Detection** - Identifies UUID, JWT, Base64, and session tokens
- 📄 **PDF Reports** - Generates detailed security reports
- 💎 **Beautiful UI** - Neon-styled interface with real-time results

## Prerequisites

- Node.js 14+ installed
- npm or yarn
- Google Gemini API key (optional, but required for AI summaries)

## Installation

1. Clone or navigate to the project directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
PORT=5001
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start at `http://localhost:5001`

## API Endpoints

### GET /
Returns the main HTML interface.

### POST /api/scan
Scans cookies from a given URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "average_score": 7.5,
  "cookies": [...],
  "ai_summary": "..."
}
```

### POST /api/download
Downloads a PDF report of the scan results.

**Request:**
```json
{
  "url": "https://example.com",
  "score": 7.5,
  "aiSummary": "...",
  "cookies": [...]
}
```

## Technology Stack

- **Backend**: Express.js
- **Browser Automation**: Puppeteer
- **PDF Generation**: PDFKit
- **AI Integration**: Google Gemini API
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## Key Differences from Python Version

| Feature | Python | JavaScript |
|---------|--------|-----------|
| Framework | Flask | Express.js |
| Browser Automation | Selenium + Firefox | Puppeteer + Chromium |
| PDF Generation | ReportLab | PDFKit |
| Server | Flask dev server | Express |
| Configuration | app.py | server.js |

## Notes

- Puppeteer automatically downloads Chromium on first install
- The application requires internet access to use Gemini AI features
- Ensure JavaScript is enabled in your browser
- PDF downloads require a working `/api/download` endpoint

## Troubleshooting

**Issue: "Chromium not found"**
- Run: `npm install` again or `npm install puppeteer --save`

**Issue: "Timeout when loading page"**
- Check your internet connection
- Verify the URL is accessible
- Try increasing timeout in server.js (line ~150)

**Issue: "AI summary not working"**
- Verify your Gemini API key is set correctly in `.env`
- Check your API quota on Google Cloud Console

## License

ISC

## Support

For issues or questions, please reach out or check the original Python implementation.
# COOKIEJS
# COOKISECJSB
# COOKISECJSB
