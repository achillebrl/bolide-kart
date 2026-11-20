// Physique d'un kart (vue de dessus, plan x-z) et pilote des adversaires.
// Cap : le kart avance selon (sin cap, cos cap). Volant > 0 = à gauche.
import { reperer, pointA } from './piste.js';

export const VITESSE_MAX = 30;
export const VITESSE_HORS_PISTE = 11;
export const VITESSE_TURBO = 40;
const ACCELERATION = 16;
const FREINAGE = 34;
const FROTTEMENT = 5;
const FROTTEMENT_HERBE = 26;
const BRAQUAGE = 2.1;
const VISEE = 14;

const borner = (v, min, max) => Math.min(max, Math.max(min, v));

/** Nouvel état du kart après `dt` secondes. `turbo` (secondes restantes) relève la vitesse max. */
export function avancerKart(kart, { gaz, frein, volant }, dt, surPiste) {
  const max = (kart.turbo ?? 0) > 0 ? VITESSE_TURBO : VITESSE_MAX;
  let vitesse = kart.vitesse + (gaz * ACCELERATION - frein * FREINAGE) * dt;
  vitesse -= FROTTEMENT * dt * Math.sign(vitesse);
  if (!surPiste && vitesse > VITESSE_HORS_PISTE) {
    vitesse = Math.max(VITESSE_HORS_PISTE, vitesse - FROTTEMENT_HERBE * dt);
  }
  vitesse = borner(vitesse, -6, max);
  if (Math.abs(vitesse) < 0.05 && gaz === 0) vitesse = 0;
  // On tourne moins vite à l'arrêt et à très haute vitesse.
  const prise = Math.min(1, Math.abs(vitesse) / 8) * (1 - 0.35 * Math.abs(vitesse) / VITESSE_TURBO);
  const cap = kart.cap - volant * BRAQUAGE * prise * dt * Math.sign(vitesse || 1);
  return {
    ...kart,
    cap,
    vitesse,
    x: kart.x + Math.sin(cap) * vitesse * dt,
    z: kart.z + Math.cos(cap) * vitesse * dt,
    turbo: Math.max(0, (kart.turbo ?? 0) - dt),
  };
}

/** Commandes d'un adversaire : il vise un point plus loin sur la piste, dans son couloir. */
export function piloteIA(kart, piste, { couloir, nervosite }) {
  const ici = reperer(piste, kart.x, kart.z, kart.indice);
  const cible = pointA(piste, ici.s + VISEE + kart.vitesse * 0.4);
  // Gauche de la piste = (-tz, tx).
  const cx = cible.x - cible.tz * couloir;
  const cz = cible.z + cible.tx * couloir;
  const fx = Math.sin(kart.cap);
  const fz = Math.cos(kart.cap);
  const dx = cx - kart.x;
  const dz = cz - kart.z;
  const l = Math.hypot(dx, dz) || 1;
  const croise = fx * (dz / l) - fz * (dx / l);
  return { gaz: 1, frein: 0, volant: borner(croise * 2.5 * nervosite, -1, 1) };
}
