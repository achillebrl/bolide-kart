// La piste : une courbe fermée échantillonnée tous les `pas` mètres, et le repérage d'un kart sur elle.

const FENETRE_RECHERCHE = 60;

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** Polyligne dense de la courbe fermée (lissée par Catmull-Rom ou non). */
function polyligne(points, lisse) {
  if (!lisse) return [...points, points[0]];
  const n = points.length;
  const dense = [];
  for (let i = 0; i < n; i += 1) {
    const p = (k) => points[(i + k + n) % n];
    for (let j = 0; j < 24; j += 1) dense.push(catmullRom(p(-1), p(0), p(1), p(2), j / 24));
  }
  return [...dense, dense[0]];
}

/** Rééchantillonne une polyligne fermée à pas constant. */
function reechantillonner(ligne, pas) {
  const sortie = [];
  let reste = 0;
  for (let i = 0; i < ligne.length - 1; i += 1) {
    const [ax, az] = ligne[i];
    const [bx, bz] = ligne[i + 1];
    const longueurSegment = Math.hypot(bx - ax, bz - az);
    let d = reste;
    while (d < longueurSegment) {
      const t = d / longueurSegment;
      sortie.push([ax + (bx - ax) * t, az + (bz - az) * t]);
      d += pas;
    }
    reste = d - longueurSegment;
  }
  return sortie;
}

/**
 * @param {[number, number][]} points  points de contrôle (x, z), dans le sens de la course
 * @returns {{ echantillons: {x:number, z:number, tx:number, tz:number}[], cumul: number[], longueur: number, pas: number }}
 */
export function construirePiste(points, { lisse = true, pas = 1 } = {}) {
  const brut = reechantillonner(polyligne(points, lisse), pas);
  const n = brut.length;
  const echantillons = brut.map(([x, z], i) => {
    const [nx, nz] = brut[(i + 1) % n];
    const l = Math.hypot(nx - x, nz - z) || 1;
    return { x, z, tx: (nx - x) / l, tz: (nz - z) / l };
  });
  const cumul = [0];
  for (let i = 1; i < n; i += 1) {
    cumul.push(cumul[i - 1] + Math.hypot(echantillons[i].x - echantillons[i - 1].x, echantillons[i].z - echantillons[i - 1].z));
  }
  const dernier = echantillons[n - 1];
  const longueur = cumul[n - 1] + Math.hypot(echantillons[0].x - dernier.x, echantillons[0].z - dernier.z);
  return { echantillons, cumul, longueur, pas };
}

/**
 * Où est le point (x, z) sur la piste : distance parcourue `s`, écart latéral signé (gauche > 0), indice.
 * `indice` (facultatif) limite la recherche autour de la dernière position connue.
 */
export function reperer(piste, x, z, indice) {
  const { echantillons, cumul, longueur } = piste;
  const n = echantillons.length;
  const debut = indice === undefined ? 0 : indice - FENETRE_RECHERCHE;
  const fin = indice === undefined ? n : indice + FENETRE_RECHERCHE;
  let meilleur = 0;
  let distMin = Infinity;
  for (let k = debut; k < fin; k += 1) {
    const i = ((k % n) + n) % n;
    const d = (echantillons[i].x - x) ** 2 + (echantillons[i].z - z) ** 2;
    if (d < distMin) {
      distMin = d;
      meilleur = i;
    }
  }
  const e = echantillons[meilleur];
  const dx = x - e.x;
  const dz = z - e.z;
  const avance = dx * e.tx + dz * e.tz;
  const s = (((cumul[meilleur] + avance) % longueur) + longueur) % longueur;
  return { indice: meilleur, s, ecart: e.tx * dz - e.tz * dx };
}

/** Le point de la piste à la distance `s` (pour viser plus loin, placer un objet). */
export function pointA(piste, s) {
  const { echantillons, longueur, pas } = piste;
  const n = echantillons.length;
  const sn = ((s % longueur) + longueur) % longueur;
  return echantillons[Math.min(n - 1, Math.floor(sn / pas))];
}
