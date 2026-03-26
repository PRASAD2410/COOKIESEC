
# CookieSec - Cookie Security Analyzer

## About

CookieSec is an Express.js + Puppeteer tool that scans website cookies for security issues. It checks flags like HttpOnly, Secure, SameSite, detects sensitive data, and gives each cookie a security score, helping identify weak or unsafe cookie configurations.

**Key Features:**
- 🔍 Automated cookie scanning with Puppeteer
- 🤖 AI-powered security analysis with OpenRouter
- 📊 Security scoring (1-10) for each cookie
- 💾 Redis-based caching for performance
- 📄 PDF report generation
- ⚡ Domain-aware cookie caching to prevent re-scans
