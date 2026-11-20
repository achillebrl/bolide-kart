import { test } from 'node:test';
import assert from 'node:assert/strict';
import { volantDepuisInclinaison } from '../src/volant.js';

test('à plat, le volant est au centre', () => {
  assert.equal(volantDepuisInclinaison({ beta: 0, gamma: 0 }, 0), 0);
});

test('sous la zone morte, rien ne bouge', () => {
  assert.equal(volantDepuisInclinaison({ beta: 0, gamma: 3 }, 0), 0);
});

test('pencher à gauche en portrait tourne à gauche', () => {
  assert.equal(volantDepuisInclinaison({ beta: 0, gamma: -25 }, 0), 1);
  const moitie = volantDepuisInclinaison({ beta: 0, gamma: -12 }, 0);
  assert.ok(moitie > 0.3 && moitie < 0.5, `valeur ${moitie}`);
});

test("au-delà de l'inclinaison max, on reste à 1", () => {
  assert.equal(volantDepuisInclinaison({ beta: 0, gamma: -60 }, 0), 1);
  assert.equal(volantDepuisInclinaison({ beta: 0, gamma: 60 }, 0), -1);
});

test('en paysage à 90°, on lit beta', () => {
  assert.equal(volantDepuisInclinaison({ beta: -25, gamma: 0 }, 90), 1);
});

test("en paysage à −90°, le sens s'inverse", () => {
  assert.equal(volantDepuisInclinaison({ beta: -25, gamma: 0 }, -90), -1);
});

/** Pose réelle → { beta, gamma } : le téléphone est redressé de `redresse`° (90 = vertical) et tourné de `rotation`° vers la gauche dans le plan de l'écran. */
function pose(redresse, rotation) {
  const p = (redresse * Math.PI) / 180;
  const r = (rotation * Math.PI) / 180;
  const a = { x: Math.sin(r) * Math.sin(p), y: Math.cos(r) * Math.sin(p), z: Math.cos(p) };
  return { beta: (Math.asin(a.y) * 180) / Math.PI, gamma: (Math.atan2(-a.x, a.z) * 180) / Math.PI };
}

test('la même rotation donne le même braquage, téléphone presque droit ou incliné à 30°', () => {
  const attendu = (15 - 4) / 21;
  for (const redresse of [85, 60, 30]) {
    const v = volantDepuisInclinaison(pose(redresse, 15), 0);
    assert.ok(Math.abs(v - attendu) < 0.05, `redressé à ${redresse}° : ${v}`);
  }
});

test('téléphone vertical tenu droit : le volant reste au centre malgré un petit tremblement', () => {
  for (const redresse of [88, 89, 89.5]) {
    assert.ok(Math.abs(volantDepuisInclinaison(pose(redresse, 2), 0)) < 0.05);
  }
});
