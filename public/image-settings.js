/* Image API settings + Phase 1 hook. Injects OpenAI/OpenRouter radios into Settings and routes sprite generate through /api/image/generate. */
(function () {
    'use strict';
    function getImageSettings() {
        var provider = localStorage.getItem('image_provider') || (localStorage.getItem('openai_api_key') ? 'openai' : 'openrouter');
        if (provider === 'openrouter') {
            return { provider: 'openrouter', apiKey: localStorage.getItem('openrouter_api_key') || '', model: localStorage.getItem('openrouter_model') || '' };
        }
        return { provider: 'openai', apiKey: localStorage.getItem('openai_api_key') || '', model: 'gpt-image-2' };
    }
    window.ASAdventurer = window.ASAdventurer || {};
    window.ASAdventurer.getImageSettings = getImageSettings;
    function applyProviderUI(provider) {
        var isOr = provider === 'openrouter';
        var radioOpenai = document.getElementById('imageProviderOpenai');
        var radioOr = document.getElementById('imageProviderOpenrouter');
        var openaiBlock = document.getElementById('imageOpenaiBlock');
        var orBlock = document.getElementById('imageOpenrouterBlock');
        if (radioOpenai) radioOpenai.checked = !isOr;
        if (radioOr) radioOr.checked = isOr;
        if (openaiBlock) openaiBlock.hidden = isOr;
        if (orBlock) orBlock.hidden = !isOr;
        localStorage.setItem('image_provider', isOr ? 'openrouter' : 'openai');
    }
    function fillModelSelect(models, selected) {
        var orModel = document.getElementById('settingsOpenRouterModel');
        if (!orModel) return;
        orModel.innerHTML = '';
        if (!models.length) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No image+reference models found';
            orModel.appendChild(empty);
            return;
        }
        models.forEach(function (m) {
            var opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name && m.name !== m.id ? m.name + ' (' + m.id + ')' : m.id;
            orModel.appendChild(opt);
        });
        var pick = selected && models.some(function (m) { return m.id === selected; }) ? selected : models[0].id;
        orModel.value = pick;
        localStorage.setItem('openrouter_model', pick);
    }
    async function providerFetch(path, opts) {
        opts = opts || {};
        var headers = { Authorization: 'Bearer ' + opts.key, 'X-Image-Provider': opts.provider };
        var fetchOpts = { method: opts.method || 'GET', headers: headers };
        if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; fetchOpts.body = JSON.stringify(opts.body); }
        return fetch(path, fetchOpts);
    }
    function injectSettingsCard() {
        if (document.getElementById('imageProviderOpenai')) return true;
        var openaiInput = document.getElementById('settingsOpenAIKey');
        var panel = openaiInput && openaiInput.closest('.glass-panel');
        if (!panel) return false;
        var title = panel.querySelector('.panel-title');
        if (title) title.innerHTML = '<span class="title-icon">🤖</span> Image API';
        var sub = panel.querySelector('.panel-subtitle');
        if (sub) sub.textContent = 'Used by Sprite Prep → AI Generate. Keys stay in this browser.';
        var wrap = document.createElement('div');
        wrap.innerHTML = '<div class="provider-radios" role="radiogroup" aria-label="Image provider">' +
            '<label class="provider-radio"><input type="radio" name="image-provider" id="imageProviderOpenai" value="openai"> <span>OpenAI</span></label>' +
            '<label class="provider-radio"><input type="radio" name="image-provider" id="imageProviderOpenrouter" value="openrouter"> <span>OpenRouter</span></label></div>' +
            '<div id="imageOpenaiBlock"></div>' +
            '<div id="imageOpenrouterBlock" hidden>' +
            '<p class="help-text">OpenRouter models that generate images and accept references, including GPT Image via OpenRouter.</p>' +
            '<div class="api-key-row"><div class="input-password"><input type="password" id="settingsOpenRouterKey" placeholder="sk-or-...">' +
            '<button class="toggle-vis" id="settingsOpenRouterToggle" type="button">👁️</button></div>' +
            '<button class="btn btn-sm btn-secondary" id="settingsOpenRouterSave" type="button">Save</button>' +
            '<button class="btn btn-sm btn-accent" id="settingsOpenRouterTest" type="button">Test</button></div>' +
            '<div class="api-key-row" style="margin-top:0.75rem"><select id="settingsOpenRouterModel" style="flex:1"><option value="">Refresh models to load the list</option></select>' +
            '<button class="btn btn-sm btn-secondary" id="settingsOpenRouterRefresh" type="button">Refresh models</button></div>' +
            '<div id="settingsOpenRouterStatus"></div></div>';
        var openaiBlock = wrap.querySelector('#imageOpenaiBlock');
        var row = panel.querySelector('.api-key-row');
        var status = document.getElementById('settingsOpenAIStatus');
        var help = document.createElement('p');
        help.className = 'help-text';
        help.textContent = 'Static path: GPT Image 2 via api.openai.com.';
        openaiBlock.appendChild(help);
        panel.insertBefore(wrap, row || panel.lastChild);
        if (row) openaiBlock.appendChild(row);
        if (status) openaiBlock.appendChild(status);
        if (!document.getElementById('image-provider-style')) {
            var style = document.createElement('style');
            style.id = 'image-provider-style';
            style.textContent = '.provider-radios{display:flex;gap:1rem;margin:0.75rem 0 1rem}.provider-radio{display:flex;align-items:center;gap:0.4rem;cursor:pointer}.provider-radio input{accent-color:#dbb858}';
            document.head.appendChild(style);
        }
        return true;
    }
    function wireSettings() {
        var orInput = document.getElementById('settingsOpenRouterKey');
        var orToggle = document.getElementById('settingsOpenRouterToggle');
        var orSave = document.getElementById('settingsOpenRouterSave');
        var orTest = document.getElementById('settingsOpenRouterTest');
        var orRefresh = document.getElementById('settingsOpenRouterRefresh');
        var orModel = document.getElementById('settingsOpenRouterModel');
        var orStatus = document.getElementById('settingsOpenRouterStatus');
        var radioOpenai = document.getElementById('imageProviderOpenai');
        var radioOr = document.getElementById('imageProviderOpenrouter');
        if (!orInput) return;
        orInput.value = localStorage.getItem('openrouter_api_key') || '';
        applyProviderUI(getImageSettings().provider);
        try {
            var cached = JSON.parse(localStorage.getItem('openrouter_models_cache') || '[]');
            if (Array.isArray(cached) && cached.length) fillModelSelect(cached, localStorage.getItem('openrouter_model'));
        } catch (e) {}
        if (radioOpenai) radioOpenai.addEventListener('change', function () { applyProviderUI('openai'); });
        if (radioOr) radioOr.addEventListener('change', function () { applyProviderUI('openrouter'); });
        if (orToggle) orToggle.addEventListener('click', function () {
            var hide = orInput.type === 'password';
            orInput.type = hide ? 'text' : 'password';
            orToggle.textContent = hide ? '\ud83d\ude48' : '\ud83d\udc41\ufe0f';
        });
        if (orSave) orSave.addEventListener('click', function () {
            var key = orInput.value.trim();
            if (key) { localStorage.setItem('openrouter_api_key', key); if (window.showToast) showToast('OpenRouter API key saved', 'success'); }
            else { localStorage.removeItem('openrouter_api_key'); if (window.showToast) showToast('OpenRouter API key removed', 'warning'); }
        });
        if (orTest) orTest.addEventListener('click', async function () {
            var key = orInput.value.trim();
            if (!key) { orStatus.innerHTML = '<div class="status-msg error">Enter an API key first</div>'; return; }
            orStatus.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Testing connection...</div>';
            try {
                var resp = await providerFetch('/api/image/test', { method: 'POST', key: key, provider: 'openrouter', body: {} });
                var data = await resp.json().catch(function () { return {}; });
                if (resp.ok) { localStorage.setItem('openrouter_api_key', key); orStatus.innerHTML = '<div class="status-msg success">✅ Connection successful!</div>'; }
                else orStatus.innerHTML = '<div class="status-msg error">❌ ' + ((data.error && data.error.message) || ('HTTP ' + resp.status)) + '</div>';
            } catch (err) { orStatus.innerHTML = '<div class="status-msg error">❌ ' + err.message + '. Is the server running?</div>'; }
        });
        if (orRefresh) orRefresh.addEventListener('click', async function () {
            var key = orInput.value.trim();
            if (!key) { orStatus.innerHTML = '<div class="status-msg error">Enter an API key first</div>'; return; }
            orStatus.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Loading image models...</div>';
            try {
                var resp = await providerFetch('/api/image/models', { method: 'GET', key: key, provider: 'openrouter' });
                var data = await resp.json().catch(function () { return {}; });
                if (!resp.ok) { orStatus.innerHTML = '<div class="status-msg error">❌ ' + ((data.error && data.error.message) || ('HTTP ' + resp.status)) + '</div>'; return; }
                var models = Array.isArray(data.models) ? data.models : [];
                localStorage.setItem('openrouter_api_key', key);
                localStorage.setItem('openrouter_models_cache', JSON.stringify(models));
                fillModelSelect(models, localStorage.getItem('openrouter_model'));
                orStatus.innerHTML = '<div class="status-msg success">✅ ' + models.length + ' model(s) that support image generation and references</div>';
            } catch (err) { orStatus.innerHTML = '<div class="status-msg error">❌ ' + err.message + '. Is the server running?</div>'; }
        });
        if (orModel) orModel.addEventListener('change', function () { if (orModel.value) localStorage.setItem('openrouter_model', orModel.value); });
    }
    function installGenerateHooks() {
        if (window.__imageProviderHooks) return;
        window.__imageProviderHooks = true;
        var rawGet = localStorage.getItem.bind(localStorage);
        localStorage.getItem = function (key) {
            if (key === 'openai_api_key') {
                var settings = getImageSettings();
                if (settings.provider === 'openrouter') return settings.apiKey || rawGet(key);
            }
            return rawGet(key);
        };
        var rawFetch = window.fetch.bind(window);
        window.fetch = function (url, opts) {
            var path = typeof url === 'string' ? url : (url && url.url) || '';
            if (path === '/api/generate' || path === '/api/edits' || path === '/api/image/generate') {
                var settings = getImageSettings();
                if (settings.provider === 'openrouter' && !settings.model) {
                    return Promise.reject(new Error('Pick an OpenRouter image model in Settings (Refresh models).'));
                }
                opts = opts ? Object.assign({}, opts) : {};
                opts.headers = Object.assign({}, opts.headers || {});
                opts.headers.Authorization = 'Bearer ' + settings.apiKey;
                opts.headers['X-Image-Provider'] = settings.provider;
                if (typeof opts.body === 'string') {
                    try {
                        var body = JSON.parse(opts.body);
                        body.model = settings.model || body.model;
                        if (settings.provider === 'openrouter') { delete body.size; delete body.quality; }
                        opts.body = JSON.stringify(body);
                    } catch (e) {}
                }
                return rawFetch('/api/image/generate', opts);
            }
            if (path === '/api/chat') {
                opts = opts ? Object.assign({}, opts) : {};
                opts.headers = Object.assign({}, opts.headers || {});
                opts.headers['X-Image-Provider'] = 'openai';
                return rawFetch('/api/image/test', { method: 'POST', headers: opts.headers, body: JSON.stringify({}) });
            }
            return rawFetch(url, opts);
        };
    }
    function start() {
        installGenerateHooks();
        if (injectSettingsCard()) wireSettings();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
