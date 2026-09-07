/**
 * ⚔️ AS Adventurer — Local Server + API Proxy
 */

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { createProvider } = require('./lib/image-provider');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Image-Provider, X-Image-Base-Url, X-Api-Key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

function sendIndex(_req, res) {
    const file = path.join(APP_DIR, 'public', 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('image-settings.js')) {
        html = html.replace('</body>', '<script src="image-settings.js"></script>\n</body>');
    }
    res.type('html').send(html);
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);

app.use(express.static(path.join(APP_DIR, 'public')));

function imageCtx(req) {
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providerId = String(req.headers['x-image-provider'] || req.query.provider || req.body?.provider || 'openai').toLowerCase();
    const baseUrl = req.headers['x-image-base-url'] || req.body?.baseUrl || '';
    return { providerId, ctx: { apiKey, baseUrl } };
}

function sendImageError(res, err) {
    const status = err.status || 502;
    console.error('  [ERROR] Image provider:', err.message);
    res.status(status).json({ error: { message: err.message } });
}

app.get('/api/image/models', async (req, res) => {
    try {
        const { providerId, ctx } = imageCtx(req);
        const provider = createProvider(providerId);
        const models = await provider.listImageModels(ctx);
        res.json({ provider: providerId, models });
    } catch (err) { sendImageError(res, err); }
});

app.post('/api/image/test', async (req, res) => {
    try {
        const { providerId, ctx } = imageCtx(req);
        const provider = createProvider(providerId);
        const result = await provider.test(ctx);
        res.json(result);
    } catch (err) { sendImageError(res, err); }
});

async function handleImageGenerate(req, res) {
    try {
        const { providerId, ctx } = imageCtx(req);
        const provider = createProvider(providerId);
        const data = await provider.generate(ctx, req.body || {});
        res.json(data);
    } catch (err) { sendImageError(res, err); }
}

app.post('/api/image/generate', handleImageGenerate);
app.post('/api/generate', handleImageGenerate);
app.post('/api/edits', handleImageGenerate);

app.post('/api/video/generate', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.key;
    if (!apiKey) return res.status(401).json({ error: 'No Google API key provided' });
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            timeout: 600000
        });
        const data = await response.text();
        res.status(response.status).type('application/json').send(data);
    } catch (err) {
        res.status(502).json({ error: `Proxy error: ${err.message}` });
    }
});

app.post('/api/video/poll', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.key;
    if (!apiKey) return res.status(401).json({ error: 'No Google API key provided' });
    try {
        const { operationName } = req.body;
        if (!operationName) return res.status(400).json({ error: 'No operationName provided' });
        const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
        const response = await fetch(url, { method: 'GET', timeout: 30000 });
        const data = await response.text();
        res.status(response.status).type('application/json').send(data);
    } catch (err) {
        res.status(502).json({ error: `Proxy error: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`  ⚔️  AS Adventurer — http://localhost:${PORT}`);
    const url = `http://localhost:${PORT}`;
    const start = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${start} ${url}`);
});
