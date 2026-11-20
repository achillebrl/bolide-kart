import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avancerKart, piloteIA, VITESSE_MAX, VITESSE_HORS_PISTE } from '../src/kart.js';
import { construirePiste } from '../src/piste.js';

const ARRET = { x: 0, z: 0, cap: 0, vitesse: 0 };
const PLEIN_GAZ = { gaz: 1, frein: 0, volant: 0 };

function rouler(kart, commandes, secondes, surPiste = true) {
  let k = kart;
  for (let t = 0; t < secondes; t += 1 / 60) k = avancerKart(k, commandes, 1 / 60, surPiste);
  return k;
}

test('plein gaz, le kart accélère sans dépasser la vitesse max', () => {
  const k = rouler(ARRET, PLEIN_GAZ, 10);
  assert.ok(k.vitesse > VITESSE_MAX * 0.95 && k.vitesse <= VITESSE_MAX, `vitesse ${k.vitesse}`);
});

test("hors piste, le kart ne dépasse pas la vitesse d'herbe", () => {
  const k = rouler({ ...ARRET, vitesse: VITESSE_MAX }, PLEIN_GAZ, 4, false);
  assert.ok(k.vitesse <= VITESSE_HORS_PISTE + 0.01, `vitesse ${k.vitesse}`);
});

test("à l'arrêt, tourner le volant ne fait pas pivoter le kart", () => {
  assert.equal(avancerKart(ARRET, { gaz: 0, frein: 0, volant: 1 }, 0.5, true).cap, 0);
});

test('volant à gauche, le kart part vers sa gauche', () => {
  const k = rouler({ ...ARRET, vitesse: 15 }, { gaz: 0.5, frein: 0, volant: 1 }, 0.5);
  assert.ok(k.x < -0.3, `x ${k.x}`);
});

test("l'IA braque vers le centre quand elle est à droite de la piste", () => {
  const piste = construirePiste([[0, 0], [100, 0], [100, 100], [0, 100]], { lisse: false, pas: 1 });
  const kart = { x: 50, z: -6, cap: Math.PI / 2, vitesse: 15 };
  const c = piloteIA(kart, piste, { couloir: 0, nervosite: 1 });
  assert.ok(c.volant > 0, `volant ${c.volant}`);
  assert.equal(c.gaz, 1);
});
