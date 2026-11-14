import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkComment, checkText } from '../src/services/moderation.ts';

test('normal ideas pass', () => {
  for (const t of ['I am a superhero saving a cat', 'Christmas adventure with Santa', 'astronaut on Mars']) {
    assert.equal(checkText(t).ok, true, t);
  }
});

test('sexual content is blocked, and with children always', () => {
  assert.equal(checkText('make her naked').ok, false);
  const r = checkText('a sexy 12 year old');
  assert.equal(r.ok, false);
  assert.match(r.reason!, /children/);
});

test('real-person deepfakes are blocked', () => {
  assert.equal(checkText('deepfake of a famous actor').ok, false);
});

test('family mode is stricter', () => {
  assert.equal(checkText('a knight fights a dragon with a knife').ok, true);
  assert.equal(checkText('a knight fights a dragon with a knife', { familyMode: true }).ok, false);
  assert.equal(checkText('a magical trip to the North Pole', { familyMode: true }).ok, true);
});

test('comments', () => {
  assert.equal(checkComment('Amazing!').ok, true);
  assert.equal(checkComment('').ok, false);
  assert.equal(checkComment('visit www.spam.com').ok, false);
  assert.equal(checkComment('you are ugly').ok, false);
});
