'use strict';

const openai = require('./openai');
const openrouter = require('./openrouter');

const PROVIDERS = {
    openai,
    openrouter,
};

function createProvider(id) {
    const provider = PROVIDERS[id];
    if (!provider) {
        const err = new Error(`Unknown image provider: ${id || '(empty)'}`);
        err.status = 400;
        throw err;
    }
    return provider;
}

module.exports = {
    createProvider,
    PROVIDERS,
};
