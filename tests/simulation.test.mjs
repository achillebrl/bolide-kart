import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derapage } from '../src/simulation.js';

test("en ligne droite, on ne dérape pas", () => {
  assert.equal(derapage({ volant: 0, vitesse: 30 }), 0);
});

test('braquer à fond à pleine vitesse donne un dérapage maximal', () => {
  assert.equal(derapage({ volant: -1, vitesse: 30 }), 1);
});

test('le dérapage reste entre 0 et 1, même en turbo ou en marche arrière', () => {
  assert.equal(derapage({ volant: 1, vitesse: 40 }), 1);
  assert.equal(derapage({ volant: 1, vitesse: -6 }), 0);
  assert.equal(derapage({ vitesse: 20 }), 0);
});
