// Les règles de la course : tours comptés à la ligne d'arrivée (s = 0) et classement.

const ZONE_LIGNE = 0.25;

/**
 * Nouvel état après un déplacement jusqu'à `sNouveau` : +1 tour en passant la ligne vers l'avant,
 * -1 en la repassant à reculons (sinon on gagnerait un tour en faisant des allers-retours).
 */
export function avancerTour(etat, sNouveau, longueur) {
  const avantLigne = etat.s > longueur * (1 - ZONE_LIGNE);
  const apresLigne = sNouveau < longueur * ZONE_LIGNE;
  if (avantLigne && apresLigne) return { ...etat, s: sNouveau, tours: etat.tours + 1 };
  if (etat.s < longueur * ZONE_LIGNE && sNouveau > longueur * (1 - ZONE_LIGNE)) {
    return { ...etat, s: sNouveau, tours: etat.tours - 1 };
  }
  return { ...etat, s: sNouveau };
}

/** Copie triée du plus avancé au moins avancé. */
export function classement(karts, longueur) {
  return [...karts].sort((a, b) => (b.tours * longueur + b.s) - (a.tours * longueur + a.s));
}
