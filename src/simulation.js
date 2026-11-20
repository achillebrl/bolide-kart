// La course sans affichage (sans Three.js) : circuit, grille, feux, un pas de simulation, collisions.
// Partagée par le jeu et par le mode capture, pour qu'une capture soit exactement une vraie partie.
import { construirePiste, reperer, pointA } from './piste.js';
import { avancerTour, classement } from './course.js';
import { avancerKart, piloteIA, VITESSE_MAX } from './kart.js';

export const TOURS = 3;
export const DEMI_LARGEUR = 7;
export const BORDURE = 1.4;
const TURBO_SECONDES = 1.3;
export const VERT_A = 2.6;
const CIRCUIT = [[0, 0], [0, 70], [18, 110], [60, 125], [95, 105], [100, 65], [80, 40], [90, 10], [130, -5],
  [150, -45], [125, -85], [75, -90], [45, -60], [15, -55], [0, -30]];
export const ADVERSAIRES = [
  { nom: 'orange', couleur: '#ff8a1c', casque: '#f7f5ef', couloir: 2.5, nervosite: 1.0, rythme: 0.955 },
  { nom: 'vert', couleur: '#2fbf71', casque: '#ffd23f', couloir: -2.5, nervosite: 1.1, rythme: 0.975 },
  { nom: 'rose', couleur: '#ff5fa2', casque: '#14213d', couloir: 0, nervosite: 0.9, rythme: 0.94 },
];

export function creerMonde() {
  const piste = construirePiste(CIRCUIT, { pas: 1 });
  const L = piste.longueur;
  return { piste, L, turbos: [0.18, 0.5, 0.78].map((f) => pointA(piste, L * f)) };
}

/** Dérapage de 0 à 1 : volant braqué à grande vitesse. Sert à la fumée, aux traces, au crissement et au journal. */
export function derapage(k) {
  return Math.min(1, Math.max(0, Math.abs(k.volant ?? 0) * k.vitesse / VITESSE_MAX));
}

/** Feux de départ : un rouge de plus toutes les 0,8 s, puis le vert à 2,6 s. */
export function feuxA(horloge) {
  return { allumes: Math.min(3, Math.floor(horloge / 0.8)), vert: horloge >= VERT_A };
}

function placeDeDepart({ piste, L }, rangee, cote) {
  const p = pointA(piste, L - 8 - rangee * 9);
  const lat = cote * 3;
  return { x: p.x - p.tz * lat, z: p.z + p.tx * lat, cap: Math.atan2(p.tx, p.tz) };
}

/** Le joueur part dernier : il faut doubler. */
export function grilleDeDepart(monde, adversaires = ADVERSAIRES) {
  const { piste, L } = monde;
  const places = [[0, 1], [0, -1], [1, 1], [1, -1]].map(([r, c]) => placeDeDepart(monde, r, c));
  const ordre = [1, 2, 0];
  const karts = [
    { id: 'joueur', ...places[3], vitesse: 0, turbo: 0, tours: 0, s: L - 17, fini: null },
    ...adversaires.map((a, i) => ({ id: a.nom, profil: a, ...places[ordre[i]], vitesse: 0, turbo: 0, tours: 0, s: L - 8, fini: null })),
  ];
  return karts.map((k) => ({ ...k, ...reperer(piste, k.x, k.z) }));
}

/** Commandes d'un adversaire. */
export function commandesIA(k, monde) {
  return piloteIA(k, monde.piste, k.profil);
}

/** Un pas de simulation pour un kart. `temps` = temps de course (pour le chrono d'arrivée). */
export function pas(k, commandes, dt, monde, temps) {
  const { piste, L, turbos } = monde;
  const ici = reperer(piste, k.x, k.z, k.indice);
  const surPiste = Math.abs(ici.ecart) < DEMI_LARGEUR + BORDURE;
  let suivant = { ...avancerKart(k, commandes, dt, surPiste), volant: commandes.volant };
  if (k.profil) suivant = { ...suivant, vitesse: Math.min(suivant.vitesse, VITESSE_MAX * k.profil.rythme + (suivant.turbo > 0 ? 8 : 0)) };
  let pos = reperer(piste, suivant.x, suivant.z, ici.indice);
  if (Math.abs(pos.ecart) > 35) {
    // Trop loin dans l'herbe : on revient au bord de la piste.
    const p = pointA(piste, pos.s);
    suivant = { ...suivant, x: p.x, z: p.z, cap: Math.atan2(p.tx, p.tz), vitesse: 4 };
    pos = reperer(piste, suivant.x, suivant.z, pos.indice);
  }
  const surTurbo = turbos.some((t) => Math.hypot(t.x - suivant.x, t.z - suivant.z) < 3.2);
  const tour = avancerTour({ tours: k.tours, s: k.s }, pos.s, L);
  const fini = k.fini === null && tour.tours > TOURS ? temps : k.fini;
  return { ...suivant, indice: pos.indice, ecart: pos.ecart, s: tour.s, tours: tour.tours, fini, turbo: surTurbo ? TURBO_SECONDES : suivant.turbo };
}

/** Deux karts qui se touchent s'écartent l'un de l'autre. */
export function separer(liste) {
  const sortie = liste.map((k) => ({ ...k }));
  for (let i = 0; i < sortie.length; i += 1) {
    for (let j = i + 1; j < sortie.length; j += 1) {
      const a = sortie[i];
      const b = sortie[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < 2.4) {
        const pousse = (2.4 - d) / 2;
        a.x -= (dx / d) * pousse; a.z -= (dz / d) * pousse;
        b.x += (dx / d) * pousse; b.z += (dz / d) * pousse;
      }
    }
  }
  return sortie;
}

/** Classement : les arrivés d'abord (par temps), puis les autres (par distance). Rang du joueur, de 1 à 4. */
export function rangDuJoueur(karts, L) {
  // À égalité (sur la grille), le joueur est classé derrière : il part dernier.
  karts = [...karts.filter((k) => k.id !== 'joueur'), ...karts.filter((k) => k.id === 'joueur')];
  const arrives = karts.filter((k) => k.fini !== null).sort((a, b) => a.fini - b.fini);
  const ordre = [...arrives, ...classement(karts.filter((k) => k.fini === null), L)];
  return ordre.findIndex((k) => k.id === 'joueur') + 1;
}
