'use strict';

function normalizeBaseUrl(url, fallback) {
    const raw = (url || fallback || '').trim();
    return raw.replace(/\/+$/, '');
}

function bearer(apiKey) {
    const key = String(apiKey || '').trim();
    if (!key) {
        const err = new Error('No API key provided');
        err.status = 401;
        throw err;
    }
    return key.startsWith('Bearer ') ? key : `Bearer ${key}`;
}

function stripDataUrl(raw) {
    const s = String(raw || '');
    return s.includes(',') ? s.substring(s.indexOf(',') + 1) : s;
}

function toDataUrl(raw) {
    const s = String(raw || '');
    if (s.startsWith('data:')) return s;
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    return `data:image/png;base64,${stripDataUrl(s)}`;
}

function providerError(providerId, status, bodyText) {
    let detail = '';
    try {
        const parsed = JSON.parse(bodyText);
        detail = parsed?.error?.message || parsed?.message || '';
    } catch { /* ignore */ }
    if (!detail) detail = String(bodyText || '').slice(0, 240);
    const err = new Error(`${providerId}: ${status}${detail ? ' ' + detail : ''}`);
    err.status = status >= 400 && status < 600 ? status : 502;
    return err;
}

function normalizeImageResponse(json) {
    const list = json?.data || json?.images || [];
    const first = Array.isArray(list) ? list[0] : null;
    const b64 = first?.b64_json || first?.b64Json || first?.base64;
    if (b64) return { data: [{ b64_json: stripDataUrl(b64) }] };
    const url = first?.url;
    if (url) return { data: [{ url }] };
    const err = new Error('No image in API response');
    err.status = 502;
    throw err;
}

module.exports = {
    normalizeBaseUrl,
    bearer,
    stripDataUrl,
    toDataUrl,
    providerError,
    normalizeImageResponse,
};
