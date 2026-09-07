/* Image API settings: OpenAI vs OpenRouter radios, keys, model list.
 * Loaded after app.js. Phase 1 reads window.ASAdventurer.getImageSettings().
 */
(function () {
    'use strict';

    function getImageSettings() {
        const provider = localStorage.getItem('image_provider') ||
            (localStorage.getItem('openai_api_key') ? 'openai' : 'openrouter');
        if (provider === 'openrouter') {
            return {
                provider: 'openrouter',
                apiKey: localStorage.getItem('openrouter_api_key') || '',
                model: localStorage.getItem('openrouter_model') || '',
            };
        }
        return {
            provider: 'openai',
            apiKey: localStorage.getItem('openai_api_key') || '',
            model: 'gpt-image-2',
        };
    }

    window.ASAdventurer = window.ASAdventurer || {};
    window.ASAdventurer.getImageSettings = getImageSettings;

    function applyProviderUI(provider) {
        const isOr = provider === 'openrouter';
        const radioOpenai = document.getElementById('imageProviderOpenai');
        const radioOr = document.getElementById('imageProviderOpenrouter');
        const openaiBlock = document.getElementById('imageOpenaiBlock');
        const orBlock = document.getElementById('imageOpenrouterBlock');
        if (radioOpenai) radioOpenai.checked = !isOr;
        if (radioOr) radioOr.checked = isOr;
        if (openaiBlock) openaiBlock.hidden = isOr;
        if (orBlock) orBlock.hidden = !isOr;
        localStorage.setItem('image_provider', isOr ? 'openrouter' : 'openai');
    }

    function fillModelSelect(models, selected) {
        const orModel = document.getElementById('settingsOpenRouterModel');
        if (!orModel) return;
        orModel.innerHTML = '';
        if (!models.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No image+reference models found';
            orModel.appendChild(opt);
            return;
        }
        models.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id;
            orModel.appendChild(opt);
        });
        const pick = selected && models.some((m) => m.id === selected) ? selected : models[0].id;
        orModel.value = pick;
        localStorage.setItem('openrouter_model', pick);
    }

    async function providerFetch(path, { method = 'GET', key, provider, body }) {
        const opts = {
            method,
            headers: {
                Authorization: `Bearer ${key}`,
                'X-Image-Provider': provider,
            },
        };
        if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(path, opts);
    }

    function initImageProviderSettings() {
        if (!document.getElementById('imageProviderOpenai')) return;

        const orInput = document.getElementById('settingsOpenRouterKey');
        const orToggle = document.getElementById('settingsOpenRouterToggle');
        const orSave = document.getElementById('settingsOpenRouterSave');
        const orTest = document.getElementById('settingsOpenRouterTest');
        const orRefresh = document.getElementById('settingsOpenRouterRefresh');
        const orModel = document.getElementById('settingsOpenRouterModel');
        const orStatus = document.getElementById('settingsOpenRouterStatus');
        const radioOpenai = document.getElementById('imageProviderOpenai');
        const radioOr = document.getElementById('imageProviderOpenrouter');

        if (orInput) orInput.value = localStorage.getItem('openrouter_api_key') || '';

        applyProviderUI(getImageSettings().provider);
        try {
            const cached = JSON.parse(localStorage.getItem('openrouter_models_cache') || '[]');
            if (Array.isArray(cached) && cached.length) {
                fillModelSelect(cached, localStorage.getItem('openrouter_model'));
            }
        } catch { /* ignore */ }

        radioOpenai?.addEventListener('change', () => applyProviderUI('openai'));
        radioOr?.addEventListener('change', () => applyProviderUI('openrouter'));

        orToggle?.addEventListener('click', () => {
            const isPassword = orInput.type === 'password';
            orInput.type = isPassword ? 'text' : 'password';
            orToggle.textContent = isPassword ? '\ud83d\ude48' : '\ud83d\udc41\ufe0f';
        });

        orSave?.addEventListener('click', () => {
            const key = orInput.value.trim();
            if (key) {
                localStorage.setItem('openrouter_api_key', key);
                if (window.showToast) showToast('OpenRouter API key saved', 'success');
            } else {
                localStorage.removeItem('openrouter_api_key');
                if (window.showToast) showToast('OpenRouter API key removed', 'warning');
            }
        });

        orTest?.addEventListener('click', async () => {
            const key = orInput.value.trim();
            if (!key) {
                orStatus.innerHTML = '<div class="status-msg error">Enter an API key first</div>';
                return;
            }
            orStatus.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Testing connection...</div>';
            try {
                const resp = await providerFetch('/api/image/test', { method: 'POST', key, provider: 'openrouter', body: {} });
                const data = await resp.json().catch(() => ({}));
                if (resp.ok) {
                    localStorage.setItem('openrouter_api_key', key);
                    orStatus.innerHTML = '<div class="status-msg success">\u2705 Connection successful!</div>';
                } else {
                    orStatus.innerHTML = `<div class="status-msg error">\u274c ${data?.error?.message || 'HTTP ' + resp.status}</div>`;
                }
            } catch (err) {
                orStatus.innerHTML = `<div class="status-msg error">\u274c ${err.message}. Is the server running?</div>`;
            }
        });

        orRefresh?.addEventListener('click', async () => {
            const key = orInput.value.trim();
            if (!key) {
                orStatus.innerHTML = '<div class="status-msg error">Enter an API key first</div>';
                return;
            }
            orStatus.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Loading image models...</div>';
            try {
                const resp = await providerFetch('/api/image/models', { method: 'GET', key, provider: 'openrouter' });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    orStatus.innerHTML = `<div class="status-msg error">\u274c ${data?.error?.message || 'HTTP ' + resp.status}</div>`;
                    return;
                }
                const models = Array.isArray(data.models) ? data.models : [];
                localStorage.setItem('openrouter_api_key', key);
                localStorage.setItem('openrouter_models_cache', JSON.stringify(models));
                fillModelSelect(models, localStorage.getItem('openrouter_model'));
                orStatus.innerHTML = `<div class="status-msg success">\u2705 ${models.length} model(s) that support image generation and references</div>`;
            } catch (err) {
                orStatus.innerHTML = `<div class="status-msg error">\u274c ${err.message}. Is the server running?</div>`;
            }
        });

        orModel?.addEventListener('change', () => {
            if (orModel.value) localStorage.setItem('openrouter_model', orModel.value);
        });
    }

    document.addEventListener('DOMContentLoaded', initImageProviderSettings);
})();
