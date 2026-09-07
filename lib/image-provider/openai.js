'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');
const {
    normalizeBaseUrl,
    bearer,
    stripDataUrl,
    providerError,
    normalizeImageResponse,
} = require('./helpers');

const id = 'openai';
const defaultBaseUrl = 'https://api.openai.com/v1';
const defaultModel = 'gpt-image-2';

function baseOf(ctx) {
    return normalizeBaseUrl(ctx.baseUrl, defaultBaseUrl);
}

async function test(ctx) {
    const url = `${baseOf(ctx)}/models`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: bearer(ctx.apiKey) },
        timeout: 30000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    return { ok: true, provider: id };
}

function isImageModel(model) {
    const mid = String(model.id || model.name || '').toLowerCase();
    return (
        mid.startsWith('gpt-image') ||
        mid.startsWith('dall-e') ||
        mid.startsWith('chatgpt-image') ||
        mid.includes('gpt-image')
    );
}

async function listImageModels(ctx) {
    const url = `${baseOf(ctx)}/models`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: bearer(ctx.apiKey) },
        timeout: 30000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    let json;
    try { json = JSON.parse(text); } catch {
        throw providerError(id, 502, text);
    }
    const models = (json.data || [])
        .filter(isImageModel)
        .map((m) => ({
            id: m.id,
            name: m.id,
            supportsRefs: true,
        }));
    if (!models.some((m) => m.id === defaultModel)) {
        models.unshift({ id: defaultModel, name: defaultModel, supportsRefs: true });
    }
    return models;
}

async function generate(ctx, req) {
    const images = Array.isArray(req.images) ? req.images : [];
    if (images.length) return generateEdits(ctx, req, images);
    return generatePlain(ctx, req);
}

async function generatePlain(ctx, req) {
    const url = `${baseOf(ctx)}/images/generations`;
    const body = {
        model: req.model || defaultModel,
        prompt: req.prompt,
        n: req.n || 1,
        size: req.size || '1536x1024',
        quality: req.quality || 'high',
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: bearer(ctx.apiKey),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        timeout: 300000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    return normalizeImageResponse(JSON.parse(text));
}

async function generateEdits(ctx, req, images) {
    const url = `${baseOf(ctx)}/images/edits`;
    const form = new FormData();
    form.append('model', req.model || defaultModel);
    form.append('prompt', req.prompt);
    form.append('n', String(req.n || 1));
    if (req.size) form.append('size', req.size);
    if (req.quality) form.append('quality', req.quality);

    images.forEach((imgEntry, index) => {
        let raw;
        let fileName;
        if (typeof imgEntry === 'object' && imgEntry.data) {
            raw = imgEntry.data;
            fileName = `${imgEntry.label || 'ref' + index}.png`;
        } else {
            raw = String(imgEntry);
            fileName = `ref${index}.png`;
        }
        const imgBuffer = Buffer.from(stripDataUrl(raw), 'base64');
        form.append('image[]', imgBuffer, {
            filename: fileName,
            contentType: 'image/png',
        });
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: bearer(ctx.apiKey),
            ...form.getHeaders(),
        },
        body: form,
        timeout: 300000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    return normalizeImageResponse(JSON.parse(text));
}

module.exports = {
    id,
    defaultBaseUrl,
    defaultModel,
    test,
    listImageModels,
    generate,
};
