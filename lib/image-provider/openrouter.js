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

function modalitiesOf(model) {
    const arch = model.architecture || {};
    const input = arch.input_modalities || model.input_modalities || [];
    const output = arch.output_modalities || model.output_modalities || [];
    return {
        input: Array.isArray(input) ? input.map(String) : [],
        output: Array.isArray(output) ? output.map(String) : [],
    };
}

function supportsImageGenAndRefs(model) {
    const { input, output } = modalitiesOf(model);
    const outOk = output.some((m) => m.toLowerCase() === 'image');
    const inOk = input.some((m) => m.toLowerCase() === 'image');
    return outOk && inOk;
}

async function fetchModels(ctx) {
    const url = `${baseOf(ctx)}/models`;
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

async function test(ctx) {
    const json = await fetchModels(ctx);
    const count = Array.isArray(json.data) ? json.data.length : 0;
    if (!count) {
        const err = new Error('openrouter: key worked but catalog was empty');
        err.status = 502;
        throw err;
    }
    return { ok: true, provider: id, models: count };
}

async function listImageModels(ctx) {
    const json = await fetchModels(ctx);
    const models = (json.data || [])
        .filter(supportsImageGenAndRefs)
        .map((m) => ({
            id: m.id,
            name: m.name || m.id,
            supportsRefs: true,
        }));
    models.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return models;
}

async function generate(ctx, req) {
    const url = `${baseOf(ctx)}/images`;
    const body = {
        model: req.model || defaultModel,
        prompt: req.prompt,
    };
    const images = Array.isArray(req.images) ? req.images : [];
    if (images.length) {
        body.input_references = images.map((img) => {
            const raw = typeof img === 'object' && img.data ? img.data : img;
            return toDataUrl(raw);
        });
    }

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
