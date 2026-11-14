import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyInstruction, detectStyle, planFromPrompt, splitIntoBeats, totalDuration } from '../src/ai/director.ts';

test('one idea becomes a three-scene movie', () => {
  const p = planFromPrompt('I am a superhero saving a cat in New York');
  assert.equal(p.scenes.length, 3);
  assert.equal(p.scenes[1].description, 'I am a superhero saving a cat in New York');
  assert.equal(p.style, 'Cinematic');
  assert.match(p.scenes[0].description, /for I am a superhero/);
});

test('steps become separate scenes', () => {
  const beats = splitIntoBeats('I land on Mars. Then I find a cave, and then I meet a friendly robot');
  assert.deepEqual(beats, ['I land on Mars.', 'I find a cave', 'I meet a friendly robot']);
  assert.equal(planFromPrompt('I land on Mars. Then I find a cave').scenes.length, 2);
});

test('empty idea gives no scenes', () => {
  assert.equal(planFromPrompt('   ').scenes.length, 0);
});

test('style is detected', () => {
  assert.equal(detectStyle('make it anime please'), 'Anime');
  assert.equal(detectStyle('a pixar style adventure'), 'Animated 3D');
  assert.equal(detectStyle('hello'), undefined);
  assert.equal(planFromPrompt('a watercolor walk in the park').style, 'Watercolor');
});

const base = () => planFromPrompt('I land on Mars. Then I find a cave. Then I meet a robot');

test('add, remove, swap and move scenes', () => {
  let p = base();
  let r = applyInstruction(p, 'add a scene where I fly home');
  assert.equal(r.scenes.length, 4);
  assert.equal(r.scenes[3].description, 'I fly home');
  r = applyInstruction(r, 'remove scene 2');
  assert.deepEqual(r.scenes.map((s) => s.description), ['I land on Mars', 'I meet a robot', 'I fly home']);
  r = applyInstruction(r, 'swap scenes 1 and 3');
  assert.equal(r.scenes[0].description, 'I fly home');
  r = applyInstruction(r, 'move scene 1 to the end');
  assert.equal(r.scenes[2].description, 'I fly home');
  r = applyInstruction(r, 'delete the last scene');
  assert.equal(r.scenes.length, 2);
});

test('bad scene numbers are refused politely', () => {
  const r = applyInstruction(base(), 'remove scene 9');
  assert.equal(r.changed, false);
  assert.equal(r.scenes.length, 3);
});

test('rewrite and adjust one scene', () => {
  let r = applyInstruction(base(), 'change scene 2 to a snowy forest');
  assert.equal(r.scenes[1].description, 'A snowy forest');
  r = applyInstruction(r, 'make the third scene darker');
  assert.equal(r.scenes[2].description, 'I meet a robot, darker');
});

test('longer and shorter', () => {
  const p = base();
  const r = applyInstruction(p, 'make it longer');
  assert.ok(totalDuration(r.scenes) > totalDuration(p.scenes));
  const r2 = applyInstruction(p, 'make scene 1 shorter');
  assert.ok(r2.scenes[0].durationSec < p.scenes[0].durationSec);
  assert.equal(r2.scenes[1].durationSec, p.scenes[1].durationSec);
});

test('style change and notes', () => {
  let r = applyInstruction(base(), 'make it anime');
  assert.equal(r.style, 'Anime');
  r = applyInstruction(r, 'make it night time with snow');
  assert.deepEqual(r.notes, ['Night time with snow']);
  const again = applyInstruction(r, 'make it night time with snow');
  assert.equal(again.changed, false);
});

test('start over', () => {
  const r = applyInstruction(base(), 'start over: a pirate adventure on the sea');
  assert.equal(r.scenes.length, 3);
  assert.match(r.scenes[1].description, /pirate/);
});
