// Le volant : pencher le téléphone à gauche ou à droite fait tourner le kart.
export const ZONE_MORTE = 4;
export const INCLINAISON_MAX = 25;

/**
 * Inclinaison du téléphone (DeviceOrientationEvent) → volant entre −1 et 1, positif = à gauche.
 * En portrait on lit gamma, en paysage beta ; le signe dépend du sens dans lequel l'écran est tourné.
 */
export function volantDepuisInclinaison({ beta, gamma }, angleEcran) {
  const axes = { 0: -gamma, 180: gamma, 90: -beta, '-90': beta, 270: beta };
  const a = axes[angleEcran] ?? -gamma;
  const force = Math.min(1, Math.max(0, (Math.abs(a) - ZONE_MORTE) / (INCLINAISON_MAX - ZONE_MORTE)));
  return force === 0 ? 0 : Math.sign(a) * force;
}
