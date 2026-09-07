'use strict';

const fetch = require('node-fetch');
const {
    normalizeBaseUrl,
    bearer,
    toDataUrl,
    providerError,
    normalizeImageResponse,
} = require('./helpers');

const id = 'openrouter';
const defaultBaseUrl = 'https://openrouter.ai/api/v1';
const defaultModel = 'openai/gpt-image-2';

function baseOf(ctx) {
    return normalizeBaseUrl(ctx.baseUrl, defaultBaseUrl);
}

function headers(ctx) {
    return {
        Authorization: bearer(ctx.apiKey),
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AS Adventurer Creator',
    };
}

async function fetchJson(ctx, path) {
    const url = `${baseOf(ctx)}${path}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: headers(ctx),
        timeout: 30000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    try {
        return JSON.parse(text);
    } catch {
        throw providerError(id, 502, text);
    }
}

function acceptsRefs(model) {
    const params = model.supported_parameters || {};
    const refs = params.input_references;
    if (refs && typeof refs === 'object') {
        if (typeof refs.max === 'number') return refs.max > 0;
        return true;
    }
    const arch = model.architecture || {};
    const input = arch.input_modalities || model.input_modalities || [];
    const output = arch.output_modalities || model.output_modalities || [];
    return input.map(String).some((m) => m.toLowerCase() === 'image') &&
        output.map(String).some((m) => m.toLowerCase() === 'image');
}

async function test(ctx) {
    const json = await fetchJson(ctx, '/images/models').catch(() => fetchJson(ctx, '/models'));
    const count = Array.isArray(json.data) ? json.data.length : 0;
    if (!count) {
        const err = new Error('openrouter: key worked but catalog was empty');
        err.status = 502;
        throw err;
    }
    return { ok: true, provider: id, models: count };
}

async function listImageModels(ctx) {
    let json;
    try {
        json = await fetchJson(ctx, '/images/models');
    } catch {
        json = await fetchJson(ctx, '/models');
    }
    const models = (json.data || [])
        .filter(acceptsRefs)
        .map((m) => ({
            id: m.id,
            name: m.name || m.id,
            supportsRefs: true,
        }));
    models.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return models;
}

function toRef(img) {
    const raw = typeof img === 'object' && img.data ? img.data : img;
    const url = toDataUrl(raw);
    return { type: 'image_url', image_url: { url } };
}

async function generate(ctx, req) {
    const url = `${baseOf(ctx)}/images`;
    const body = {
        model: req.model || defaultModel,
        prompt: req.prompt,
    };
    const images = Array.isArray(req.images) ? req.images : [];
    if (images.length) body.input_references = images.map(toRef);

    console.log(`  [OPENROUTER] POST /images model=${body.model} refs=${images.length}`);
    const response = await fetch(url, {
        method: 'POST',
        headers: headers(ctx),
        body: JSON.stringify(body),
        timeout: 300000,
    });
    const text = await response.text();
    if (!response.ok) throw providerError(id, response.status, text);
    let json;
    try { json = JSON.parse(text); } catch {
        throw providerError(id, 502, text);
    }
    return normalizeImageResponse(json);
}

module.exports = {
    id,
    defaultBaseUrl,
    defaultModel,
    test,
    listImageModels,
    generate,
};
