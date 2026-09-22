'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { acceptsRefs } = require('../lib/image-provider/openrouter');

test('keeps a model that outputs images and accepts input_references', () => {
  assert.equal(acceptsRefs({
    id: 'openai/gpt-image-2',
    supported_parameters: { input_references: { max: 4 } },
  }), true);
});

test('drops chat-only models', () => {
  assert.equal(acceptsRefs({
    id: 'openai/gpt-4o',
    architecture: {
      input_modalities: ['text'],
      output_modalities: ['text'],
    },
  }), false);
});

test('drops image models whose reference cap is zero', () => {
  assert.equal(acceptsRefs({
    id: 'some/image-only',
    supported_parameters: { input_references: { max: 0 } },
    architecture: {
      input_modalities: ['text'],
      output_modalities: ['image'],
    },
  }), false);
});

test('keeps image-in image-out when the catalog has no input_references field', () => {
  assert.equal(acceptsRefs({
    id: 'fallback/image',
    architecture: {
      input_modalities: ['text', 'image'],
      output_modalities: ['image'],
    },
  }), true);
});
