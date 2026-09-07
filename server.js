/**
 * ⚔️ AS Adventurer — Local Server + API Proxy
 * Angel's Sword Studios
 *
 * Serves static files from public/ and proxies API requests
 * to the selected image provider and Google Gemini.
 */

const express = require('express');
const fetch = require('node-fetch');
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
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
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
        console.log(`  [PROXY] GET /api/image/models → ${providerId}`);
        const models = await provider.listImageModels(ctx);
        res.json({ provider: providerId, models });
    } catch (err) {
        sendImageError(res, err);
    }
});

app.post('/api/image/test', async (req, res) => {
    try {
        const { providerId, ctx } = imageCtx(req);
        const provider = createProvider(providerId);
        console.log(`  [PROXY] POST /api/image/test → ${providerId}`);
        const result = await provider.test(ctx);
        res.json(result);
    } catch (err) {
        sendImageError(res, err);
    }
});

async function handleImageGenerate(req, res) {
    try {
        const { providerId, ctx } = imageCtx(req);
        const provider = createProvider(providerId);
        const refs = Array.isArray(req.body?.images) ? req.body.images.length : 0;
        console.log(`  [PROXY] POST ${req.path} → ${providerId} model=${req.body?.model || provider.defaultModel} refs=${refs}`);
        const data = await provider.generate(ctx, req.body || {});
        res.json(data);
    } catch (err) {
        sendImageError(res, err);
    }
}

app.post('/api/image/generate', handleImageGenerate);
app.post('/api/generate', handleImageGenerate);
app.post('/api/edits', handleImageGenerate);

app.post('/api/video/generate', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.key;
    if (!apiKey) {
        return res.status(401).json({ error: 'No Google API key provided' });
    }

    try {
        console.log('  [PROXY] POST /api/video/generate → Gemini Interactions API');
        const logBody = { ...req.body };
        if (logBody.input_image) {
            logBody.input_image = { mime_type: logBody.input_image.mime_type, data: `[${logBody.input_image.data?.length || 0} chars base64]` };
        }
        console.log('  [PROXY] Request body:', JSON.stringify(logBody, null, 2));

        const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            timeout: 600000
        });

        const data = await response.text();
        console.log(`  [PROXY] Gemini Interactions → HTTP ${response.status}`);
        if (response.status !== 200) {
            console.error('  [ERROR] Gemini API error response:');
            console.error('  ', data.substring(0, 500));
        }
        res.status(response.status).type('application/json').send(data);
    } catch (err) {
        console.error('  [ERROR] Video generate proxy failed:', err.message);
        res.status(502).json({ error: `Proxy error: ${err.message}` });
    }
});

app.post('/api/video/poll', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.key;
    if (!apiKey) {
        return res.status(401).json({ error: 'No Google API key provided' });
    }

    try {
        const { operationName } = req.body;
        if (!operationName) {
            return res.status(400).json({ error: 'No operationName provided' });
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
        const response = await fetch(url, { method: 'GET', timeout: 30000 });
        const data = await response.text();
        res.status(response.status).type('application/json').send(data);
    } catch (err) {
        console.error('  [ERROR] Video poll failed:', err.message);
        res.status(502).json({ error: `Proxy error: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log('');
    console.log('  ⚔️  AS Adventurer — VTuber Creation Pipeline');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log('  Press Ctrl+C to stop');
    console.log('');

    const url = `http://localhost:${PORT}`;
    const start = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${start} ${url}`);
});
