import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hauteurMoteur, etatSon } from '../src/son.js';

test("à l'arrêt, le moteur tourne au ralenti", () => {
  assert.equal(hauteurMoteur(0, false), 55);
});

test('à fond, le moteur monte', () => {
  const h = hauteurMoteur(30, false);
  assert.ok(h > 170 && h < 190, `hauteur ${h}`);
});

test("le turbo ajoute du grave et de l'aigu", () => {
  assert.ok(hauteurMoteur(30, true) > hauteurMoteur(30, false));
});

test('onglet caché, le son se coupe', () => {
  assert.equal(etatSon('cache').volume, 0);
  assert.ok(etatSon('visible').volume > 0);
});
