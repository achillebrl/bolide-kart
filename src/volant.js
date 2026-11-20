// Le volant : tourner le téléphone dans le plan de l'écran (comme un volant) fait tourner le kart.
export const ZONE_MORTE = 4;
export const INCLINAISON_MAX = 25;
const DEG = 180 / Math.PI;

/** Axes de l'écran (droite, haut) selon le sens dans lequel il est tourné, à partir du vecteur « haut » du téléphone. */
const AXES = {
  0: (a) => [a.x, a.y],
  90: (a) => [-a.y, a.x],
  180: (a) => [-a.x, -a.y],
  '-90': (a) => [a.y, -a.x],
  270: (a) => [a.y, -a.x],
};

/**
 * Inclinaison du téléphone (DeviceOrientationEvent) → volant entre −1 et 1, positif = à gauche.
 * L'angle est lu dans le plan de l'écran à partir de la gravité : il ne dépend pas de l'inclinaison vers l'arrière.
 * Téléphone presque à plat, cet angle n'a plus de sens : on passe en douceur à la simple inclinaison latérale.
 */
export function volantDepuisInclinaison({ beta, gamma }, angleEcran) {
  const b = beta / DEG;
  const g = gamma / DEG;
  const haut = { x: -Math.cos(b) * Math.sin(g), y: Math.sin(b), z: Math.cos(b) * Math.cos(g) };
  const [dx, dy] = (AXES[angleEcran] ?? AXES[0])(haut);
  const dansLePlan = Math.atan2(dx, dy) * DEG;
  const lateral = Math.asin(Math.max(-1, Math.min(1, dx))) * DEG;
  const poids = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 0.2) / 0.3));
  const a = poids * dansLePlan + (1 - poids) * lateral;
  const force = Math.min(1, Math.max(0, (Math.abs(a) - ZONE_MORTE) / (INCLINAISON_MAX - ZONE_MORTE)));
  return force === 0 ? 0 : Math.sign(a) * force;
}
