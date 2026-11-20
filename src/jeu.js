// La boucle du jeu : écran titre, feux de départ, course de 3 tours, arrivée.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { construirePiste, reperer, pointA } from './piste.js';
import { avancerTour, classement } from './course.js';
import { avancerKart, piloteIA, VITESSE_MAX } from './kart.js';
import { creerPiste3D, creerSol, creerKart, creerArbres } from './decor.js';
import { RAYON_ROUE } from './kart3d.js';
import { creerEffets } from './effets.js';
import { volantDepuisInclinaison } from './volant.js';

const TOURS = 3;
const DEMO = new URLSearchParams(location.search).has('demo');
const DEMI_LARGEUR = 7;
const BORDURE = 1.4;
const TURBO_SECONDES = 1.3;
const CIRCUIT = [[0, 0], [0, 70], [18, 110], [60, 125], [95, 105], [100, 65], [80, 40], [90, 10], [130, -5],
  [150, -45], [125, -85], [75, -90], [45, -60], [15, -55], [0, -30]];
const ADVERSAIRES = [
  { nom: 'orange', couleur: '#ff8a1c', casque: '#f7f5ef', couloir: 2.5, nervosite: 1.0, rythme: 0.955 },
  { nom: 'vert', couleur: '#2fbf71', casque: '#ffd23f', couloir: -2.5, nervosite: 1.1, rythme: 0.975 },
  { nom: 'rose', couleur: '#ff5fa2', casque: '#14213d', couloir: 0, nervosite: 0.9, rythme: 0.94 },
];

const piste = construirePiste(CIRCUIT, { pas: 1 });
const L = piste.longueur;
const turbos = [0.18, 0.5, 0.78].map((f) => pointA(piste, L * f));

// --- Scène ---
const toile = document.getElementById('scene');
const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
const MOBILE = matchMedia('(pointer: coarse)').matches;
rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
rendu.toneMapping = THREE.ACESFilmicToneMapping;
rendu.toneMappingExposure = 0.95;
rendu.shadowMap.enabled = true;
rendu.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#d3e2ee', 0.0045);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1500);

// Ciel physique (diffusion de l'atmosphère) avec un soleil bas de fin d'après-midi ; il sert aussi d'éclairage d'ambiance.
const DIRECTION_SOLEIL = new THREE.Vector3(120, 60, 80).normalize();
const ciel = new Sky();
ciel.scale.setScalar(4000);
ciel.material.uniforms.turbidity.value = 3.2;
ciel.material.uniforms.rayleigh.value = 2.2;
ciel.material.uniforms.mieCoefficient.value = 0.004;
ciel.material.uniforms.mieDirectionalG.value = 0.85;
ciel.material.uniforms.sunPosition.value.copy(DIRECTION_SOLEIL);
const pmrem = new THREE.PMREMGenerator(rendu);
const sceneCiel = new THREE.Scene();
sceneCiel.add(ciel.clone());
scene.environment = pmrem.fromScene(sceneCiel, 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(ciel);

scene.add(new THREE.HemisphereLight('#cfe3ff', '#4a6b2f', 0.5));
const soleil = new THREE.DirectionalLight('#ffd9a8', 2.6);
soleil.castShadow = true;
soleil.shadow.mapSize.setScalar(MOBILE ? 1024 : 2048);
Object.assign(soleil.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 });
soleil.shadow.bias = -0.0004;
soleil.shadow.normalBias = 0.03;
scene.add(soleil, soleil.target, creerSol(), creerPiste3D(piste, DEMI_LARGEUR, turbos), creerArbres(piste, reperer, DEMI_LARGEUR + BORDURE, 160));

/** Le soleil suit le joueur : les ombres restent nettes autour de lui. */
function placerSoleil(k) {
  soleil.target.position.set(k.x, 0, k.z);
  soleil.position.set(k.x + DIRECTION_SOLEIL.x * 150, DIRECTION_SOLEIL.y * 150, k.z + DIRECTION_SOLEIL.z * 150);
}

let effets = null;
function redimensionner() {
  rendu.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  effets?.redimensionner(rendu.getDrawingBufferSize(new THREE.Vector2()).y);
}
window.addEventListener('resize', redimensionner);
redimensionner();

// --- Karts ---
function placeDeDepart(rangee, cote) {
  const p = pointA(piste, L - 8 - rangee * 9);
  const lat = cote * 3;
  return { x: p.x - p.tz * lat, z: p.z + p.tx * lat, cap: Math.atan2(p.tx, p.tz) };
}

const joueurMesh = creerKart('#2457ff', '#f7f5ef');
const adversairesMesh = ADVERSAIRES.map((a) => creerKart(a.couleur, a.casque));
scene.add(joueurMesh, ...adversairesMesh);
effets = creerEffets(scene, [joueurMesh, ...adversairesMesh]);
effets.redimensionner(rendu.getDrawingBufferSize(new THREE.Vector2()).y);

let karts = [];
function nouvelleGrille() {
  // Le joueur part dernier : il faut doubler.
  const places = [placeDeDepart(0, 1), placeDeDepart(0, -1), placeDeDepart(1, 1), placeDeDepart(1, -1)];
  const ordre = [1, 2, 0];
  karts = [
    { id: 'joueur', ...places[3], vitesse: 0, turbo: 0, tours: 0, s: L - 17, fini: null },
    ...ADVERSAIRES.map((a, i) => ({ id: a.nom, profil: a, ...places[ordre[i]], vitesse: 0, turbo: 0, tours: 0, s: L - 8, fini: null })),
  ];
  karts = karts.map((k) => ({ ...k, ...reperer(piste, k.x, k.z) }));
}

// --- Commandes ---
const appuis = { gauche: false, droite: false, frein: false };
const touches = { ArrowLeft: 'gauche', KeyA: 'gauche', KeyQ: 'gauche', ArrowRight: 'droite', KeyD: 'droite', ArrowDown: 'frein', KeyS: 'frein' };
window.addEventListener('keydown', (e) => { if (touches[e.code]) { appuis[touches[e.code]] = true; e.preventDefault(); } });
window.addEventListener('keyup', (e) => { if (touches[e.code]) appuis[touches[e.code]] = false; });
['gauche', 'droite'].forEach((cote) => {
  const bouton = document.getElementById(cote);
  const poser = (etat) => (e) => { e.preventDefault(); appuis[cote] = etat; bouton.classList.toggle('appuye', etat); };
  bouton.addEventListener('pointerdown', poser(true));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => bouton.addEventListener(ev, poser(false)));
});

// Le volant : pencher le téléphone. Les flèches gardent la main dès qu'on appuie dessus.
let volantActif = false;
let inclinaison = 0;
function ecouterInclinaison() {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma === null) return;
    volantActif = true;
    document.body.classList.add('volant-actif');
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    inclinaison = volantDepuisInclinaison({ beta: e.beta, gamma: e.gamma }, angle);
  });
}
async function activerVolant() {
  const bouton = document.getElementById('volant');
  try {
    const demande = window.DeviceOrientationEvent?.requestPermission;
    const reponse = demande ? await demande.call(DeviceOrientationEvent) : 'granted';
    // iPhone répond 'granted' ou 'denied' ; Chrome peut répondre 'prompt' : on écoute quand même.
    if (reponse === 'denied') throw new Error(reponse);
    ecouterInclinaison();
    bouton.textContent = 'Volant activé : penche le téléphone';
    bouton.disabled = true;
  } catch {
    bouton.textContent = 'Volant refusé : joue avec les flèches';
    bouton.disabled = true;
  }
}
document.getElementById('volant').addEventListener('click', activerVolant);

// --- États ---
const $ = (id) => document.getElementById(id);
let etat = 'titre';
let horloge = 0;
let depart = 0;

function afficher(id, visible) { $(id).hidden = !visible; }

function lancer() {
  nouvelleGrille();
  etat = 'feux';
  horloge = 0;
  afficher('titre', false);
  afficher('arrivee', false);
  afficher('hud', true);
  afficher('feux', true);
  afficher('commandes', true);
}
$('jouer').addEventListener('click', lancer);
$('rejouer').addEventListener('click', lancer);

const suffixe = (r) => (r === 1 ? 'er' : 'e');
const formaterTemps = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;

function majFeux() {
  const feux = document.querySelectorAll('.feu');
  const allumes = Math.min(3, Math.floor(horloge / 0.8));
  const vert = horloge >= 2.6;
  feux.forEach((f, i) => {
    f.classList.toggle('rouge', !vert && i < allumes);
    f.classList.toggle('vert', vert);
  });
  $('feux-texte').textContent = vert ? 'Partez !' : '';
  if (vert && etat === 'feux') { etat = 'course'; depart = horloge; }
  if (horloge > 3.4) afficher('feux', false);
}

// --- Simulation ---
function commandesDe(k) {
  if (etat !== 'course' || k.fini !== null) return { gaz: 0, frein: k.fini !== null ? 0.4 : 1, volant: 0 };
  if (k.profil) return piloteIA(k, piste, k.profil);
  // ?demo : le kart bleu se pilote seul (pour filmer une partie sans téléphone).
  if (DEMO) return piloteIA(k, piste, { couloir: 0, nervosite: 1.05 });
  const fleches = (appuis.gauche ? 1 : 0) - (appuis.droite ? 1 : 0);
  const volant = appuis.gauche || appuis.droite || !volantActif ? fleches : inclinaison;
  return { gaz: appuis.frein ? 0 : 1, frein: appuis.frein ? 1 : 0, volant };
}

function pas(k, dt) {
  const ici = reperer(piste, k.x, k.z, k.indice);
  const surPiste = Math.abs(ici.ecart) < DEMI_LARGEUR + BORDURE;
  const commandes = commandesDe(k);
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
  const fini = k.fini === null && tour.tours > TOURS ? horloge - depart : k.fini;
  return { ...suivant, indice: pos.indice, ecart: pos.ecart, s: tour.s, tours: tour.tours, fini, turbo: surTurbo ? TURBO_SECONDES : suivant.turbo };
}

/** Deux karts qui se touchent s'écartent l'un de l'autre. */
function separer(liste) {
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

// --- Caméra et affichage ---
const visee = new THREE.Vector3();
function suivreCamera(k, dt, titre) {
  const fx = Math.sin(k.cap);
  const fz = Math.cos(k.cap);
  const recul = titre ? 16 : 6.6;
  const haut = titre ? 7 : 3.1;
  const angle = titre ? horloge * 0.25 : 0;
  const voulu = new THREE.Vector3(
    k.x - (fx * Math.cos(angle) - fz * Math.sin(angle)) * recul,
    haut,
    k.z - (fz * Math.cos(angle) + fx * Math.sin(angle)) * recul,
  );
  camera.position.lerp(voulu, titre ? 1 : 1 - Math.exp(-dt * 8));
  visee.set(k.x + fx * 6, 1.2, k.z + fz * 6);
  camera.lookAt(visee);
  // À plus de 85 % de la vitesse max, la caméra tremble (bruit lissé, toujours le même pour une même horloge).
  const tremble = titre ? 0 : Math.max(0, (k.vitesse - VITESSE_MAX * 0.85) / (VITESSE_MAX * 0.15));
  if (tremble > 0) {
    const a = Math.min(1, tremble) * 0.06;
    camera.position.x += Math.sin(horloge * 31.7) * Math.cos(horloge * 17.3) * a;
    camera.position.y += Math.sin(horloge * 27.1 + 1.3) * a;
  }
  camera.fov = 68 + Math.max(0, k.vitesse) * 0.35;
  camera.updateProjectionMatrix();
  $('vitesse').classList.toggle('actif', !titre && (k.turbo ?? 0) > 0);
}

function dessinerKarts(dt) {
  [joueurMesh, ...adversairesMesh].forEach((mesh, i) => {
    const k = karts[i];
    mesh.position.set(k.x, 0, k.z);
    mesh.rotation.y = k.cap;
    const { roues, pivots } = mesh.userData;
    roues.forEach((r) => { r.rotation.x += (k.vitesse * dt) / RAYON_ROUE; });
    pivots.forEach((p) => { p.rotation.y += ((k.volant ?? 0) * 0.45 - p.rotation.y) * Math.min(1, dt * 12); });
  });
}

function majHud() {
  const rangs = classement(karts.filter((k) => k.fini === null), L);
  const arrives = karts.filter((k) => k.fini !== null).sort((a, b) => a.fini - b.fini);
  const ordre = [...arrives, ...rangs];
  const joueur = karts[0];
  const rang = ordre.findIndex((k) => k.id === 'joueur') + 1;
  $('rang').textContent = rang;
  $('suffixe').textContent = suffixe(rang);
  $('tour').textContent = `Tour ${Math.min(TOURS, Math.max(1, joueur.tours))}/${TOURS}`;
  // Bug du 20/11 : à l'arrivée, le chrono retombait à 0:00,0. Il garde maintenant le temps du joueur.
  const temps = joueur.fini ?? (etat === 'course' ? horloge - depart : 0);
  $('chrono').textContent = formaterTemps(temps);
  if (joueur.fini !== null && etat === 'course') {
    etat = 'arrivee';
    $('rang-final').textContent = rang;
    $('suffixe-final').textContent = suffixe(rang);
    $('resume').textContent = rang === 1
      ? `Tu gagnes en ${formaterTemps(joueur.fini)}. Les 3 adversaires sont derrière toi.`
      : `Tu finis ${rang}${suffixe(rang)} en ${formaterTemps(joueur.fini)}. Les turbos orange font gagner du temps.`;
    afficher('arrivee', true);
    afficher('commandes', false);
  }
}

// --- Boucle ---
nouvelleGrille();
let avant = performance.now();
function boucle(maintenant) {
  const dt = Math.min(1 / 30, (maintenant - avant) / 1000);
  avant = maintenant;
  horloge += dt;
  // Les feux restent à l'écran jusqu'à 0,8 s après le départ (bug du 20/11 : ils ne partaient jamais).
  if (!$('feux').hidden) majFeux();
  if (etat === 'course' || etat === 'arrivee') {
    karts = separer(karts.map((k) => pas(k, dt)));
    majHud();
  }
  dessinerKarts(dt);
  effets.maj(karts, dt);
  placerSoleil(karts[0]);
  suivreCamera(karts[0], dt, etat === 'titre');
  rendu.render(scene, camera);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);

// Pour les tests en navigateur et le tournage.
window.bolide = { lancer, etat: () => etat, karts: () => karts, appuis };
