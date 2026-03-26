// ======================================================================
// COOKIESEC - COOKIE SECURITY ANALYZER
// Main Express Server (Refactored - Modular Architecture)
// ======================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import all modules
const routes = require('./routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../frontend/static')));

// Routes
app.use(routes);

// Health check / frontend


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/dashboard.html'));
});

// ======================================================================
//  START SERVER
// ======================================================================

const server = app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║   🔐 Cookie Security Analyzer Started             ║`);
    console.log(`║   URL: http://localhost:${PORT}`.padEnd(52) + `║`);
    console.log(`║   Architecture: Modular (separate files)           ║`);
    console.log(`║   Endpoints:`.padEnd(52) + `║`);
    console.log(`║     - POST /api/scan                              ║`);
    console.log(`║     - POST /api/download                          ║`);
    console.log(`║     - GET  /api/cache-stats                       ║`);
    console.log(`║     - POST /api/cache-clear                       ║`);
    console.log(`║     - GET  /api/test-openrouter                   ║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);
});

// Handle port already in use error
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
        console.error(`💡 SOLUTION: Kill the process using port ${PORT} first:`);
        console.error(`   pkill -f "node server.js" || lsof -ti:${PORT} | xargs kill -9`);
        process.exit(1);
    }
    throw err;
});

module.exports = app;
