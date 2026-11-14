import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCues, cueAt } from './cues.js';

test('splits chunks into timed word groups', () => {
  const cues = makeCues([{ timestamp: [0, 8], text: ' um dois tres quatro cinco seis sete oito' }], 10);
  assert.deepEqual(cues, [
    { start: 0, end: 4, text: 'um dois tres quatro' },
    { start: 4, end: 8, text: 'cinco seis sete oito' },
  ]);
  assert.equal(cueAt(cues, 5), 'cinco seis sete oito');
  assert.equal(cueAt(cues, 9), '');
});

test('last chunk without an end runs to the video end; empty chunks are skipped', () => {
  const cues = makeCues([{ timestamp: [2, 2], text: 'x' }, { timestamp: [6, null], text: 'fim' }], 10);
  assert.deepEqual(cues, [{ start: 6, end: 10, text: 'fim' }]);
});
