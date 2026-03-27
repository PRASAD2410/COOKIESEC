// ======================================================================
// PUPPETEER COOKIE FETCH
// ======================================================================

const puppeteer = require('puppeteer');

async function fetchCookiesWithPuppeteer(url) {
    console.log(`Scanning URL: ${url}`);

    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',  // Hide automation
                '--disable-dev-shm-usage'  // Reduce memory usage
            ]
        });

        const page = await browser.newPage();

        // Spoof user agent to look like real browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });

        // Set timeout - increased from 30s to handle large URLs
        // Use 120 seconds (2 minutes) for large/slow websites
        const TIMEOUT_MS = 120000;
        page.setDefaultTimeout(TIMEOUT_MS);
        page.setDefaultNavigationTimeout(TIMEOUT_MS);

        console.log(`⏳ Navigating to page (timeout: 120s)...`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Scroll multiple times to trigger all lazy-loaded scripts
        console.log(`📜 Scrolling page to trigger all scripts...`);
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 1000));
        }

        // Extra wait for all cookies to be set
        console.log(`⏳ Waiting 10 seconds for all cookies and scripts to load...`);
        await new Promise(r => setTimeout(r, 10000));

        const cookies = await page.cookies();
        console.log(`✅ Puppeteer retrieved ${cookies.length} cookies`);

        return cookies;
    } catch (error) {
        if (error.message.includes('Invalid URL')) {
            return { error: 'Invalid URL format.' };
        }
        if (error.message.includes('Timeout')) {
            return { error: 'Page load timed out (120s). The website may be very large or slow to respond. Try a different URL.' };
        }
        return { error: `Driver error: ${error.message}` };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    fetchCookiesWithPuppeteer
};
