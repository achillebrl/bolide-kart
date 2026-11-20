import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulerCapture } from '../src/capture.js';

test('même graine, même course', () => {
  assert.deepEqual(simulerCapture(7, 90).evenements, simulerCapture(7, 90).evenements);
});

test('le joueur part 4e et finit 1er', () => {
  const { rangs } = simulerCapture(7, 90);
  assert.equal(rangs[0], 4);
  assert.equal(rangs.at(-1), 1);
});

test('les feux passent du rouge au vert avant 3 s', () => {
  const { evenements } = simulerCapture(7, 5);
  const rouge = evenements.findIndex((e) => e.feux === 'rouge');
  const vert = evenements.findIndex((e) => e.feux === 'vert');
  assert.ok(rouge >= 0 && vert > rouge, `rouge ${rouge}, vert ${vert}`);
  assert.ok(evenements[vert].t < 3);
});

test("le joueur dérape vraiment dans les virages", () => {
  const { evenements } = simulerCapture(7, 90);
  assert.ok(evenements.some((e) => e.derapage > 0.45));
});
