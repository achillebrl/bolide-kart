// Calculs de la course partagés par le jeu et par le mode capture (sans Three.js).
import { VITESSE_MAX } from './kart.js';

/** Dérapage de 0 à 1 : volant braqué à grande vitesse. Sert à la fumée, aux traces, au crissement et au journal. */
export function derapage(k) {
  return Math.min(1, Math.max(0, Math.abs(k.volant ?? 0) * k.vitesse / VITESSE_MAX));
}
