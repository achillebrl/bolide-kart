import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirePiste, reperer } from '../src/piste.js';
import { avancerTour, classement } from '../src/course.js';

// Un carré de 100 m de côté : 400 m de tour, facile à vérifier à la main.
const CARRE = [[0, 0], [100, 0], [100, 100], [0, 100]];

test('la piste fermée mesure à peu près son périmètre', () => {
  const piste = construirePiste(CARRE, { lisse: false, pas: 1 });
  assert.ok(Math.abs(piste.longueur - 400) < 1, `longueur ${piste.longueur}`);
});

test('un point sur la piste a un écart latéral nul et la bonne distance', () => {
  const piste = construirePiste(CARRE, { lisse: false, pas: 1 });
  const r = reperer(piste, 50, 0);
  assert.ok(Math.abs(r.s - 50) < 1.5, `s ${r.s}`);
  assert.ok(Math.abs(r.ecart) < 0.5, `écart ${r.ecart}`);
});

test("l'écart latéral donne la distance au centre de la piste", () => {
  const piste = construirePiste(CARRE, { lisse: false, pas: 1 });
  const r = reperer(piste, 50, 6);
  assert.ok(Math.abs(Math.abs(r.ecart) - 6) < 0.5, `écart ${r.ecart}`);
});

test('passer la ligne vers l’avant compte un tour', () => {
  const etat = { tours: 0, s: 395 };
  const apres = avancerTour(etat, 3, 400);
  assert.equal(apres.tours, 1);
  assert.equal(apres.s, 3);
  assert.equal(etat.tours, 0, "l'état d'origine n'est pas modifié");
});

test('reculer sur la ligne retire le tour au lieu d’en ajouter un', () => {
  const etat = { tours: 1, s: 3 };
  assert.equal(avancerTour(etat, 396, 400).tours, 0);
});

test('avancer sans passer la ligne ne change pas le tour', () => {
  assert.equal(avancerTour({ tours: 2, s: 100 }, 120, 400).tours, 2);
});

test('le classement va du plus avancé au moins avancé', () => {
  const ordre = classement([
    { id: 'a', tours: 1, s: 50 },
    { id: 'b', tours: 2, s: 10 },
    { id: 'c', tours: 1, s: 300 },
  ], 400).map((k) => k.id);
  assert.deepEqual(ordre, ['b', 'c', 'a']);
});
