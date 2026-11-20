// La boucle du jeu : écran titre, feux de départ, course de 3 tours, arrivée.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { reperer } from './piste.js';
import { piloteIA, VITESSE_MAX } from './kart.js';
import { creerMonde, grilleDeDepart, feuxA, pas, separer, commandesIA, rangDuJoueur, ADVERSAIRES, TOURS, DEMI_LARGEUR, BORDURE } from './simulation.js';
import { creerCourseCapture } from './capture.js';
import { creerPiste3D, creerSol, creerKart, creerArbres } from './decor.js';
import { RAYON_ROUE } from './kart3d.js';
import { creerEffets, derapage } from './effets.js';
import { creerSon } from './son.js';
import { volantDepuisInclinaison } from './volant.js';

const PARAMS = new URLSearchParams(location.search);
const DEMO = PARAMS.has('demo');
// ?capture&graine=7 : le jeu attend, et window.bolide.image() avance d'une image (1/30 s) pour filmer le reel.
const CAPTURE = PARAMS.has('capture');
const PAS_CAPTURE = 1 / 30;
const monde = creerMonde();
const { piste, L, turbos } = monde;

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
const joueurMesh = creerKart('#2457ff', '#f7f5ef');
const adversairesMesh = ADVERSAIRES.map((a) => creerKart(a.couleur, a.casque));
scene.add(joueurMesh, ...adversairesMesh);
effets = creerEffets(scene, [joueurMesh, ...adversairesMesh]);
effets.redimensionner(rendu.getDrawingBufferSize(new THREE.Vector2()).y);

let karts = [];
function nouvelleGrille() {
  karts = grilleDeDepart(monde);
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
const son = creerSon();
let feuxAllumes = 0;

function lancer() {
  if (!CAPTURE) son.demarrer();
  feuxAllumes = 0;
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
  const { allumes, vert } = feuxA(horloge);
  feux.forEach((f, i) => {
    f.classList.toggle('rouge', !vert && i < allumes);
    f.classList.toggle('vert', vert);
  });
  $('feux-texte').textContent = vert ? 'Partez !' : '';
  const etape = vert ? 4 : allumes;
  if (etape > feuxAllumes) son.bip(vert);
  feuxAllumes = etape;
  if (vert && etat === 'feux') { etat = 'course'; depart = horloge; }
  if (horloge > 3.4) afficher('feux', false);
}

// --- Simulation ---
function commandesDe(k) {
  if (etat !== 'course' || k.fini !== null) return { gaz: 0, frein: k.fini !== null ? 0.4 : 1, volant: 0 };
  if (k.profil) return commandesIA(k, monde);
  // ?demo : le kart bleu se pilote seul (pour filmer une partie sans téléphone).
  if (DEMO) return piloteIA(k, piste, { couloir: 0, nervosite: 1.05 });
  const fleches = (appuis.gauche ? 1 : 0) - (appuis.droite ? 1 : 0);
  const volant = appuis.gauche || appuis.droite || !volantActif ? fleches : inclinaison;
  return { gaz: appuis.frein ? 0 : 1, frein: appuis.frein ? 1 : 0, volant };
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
  camera.position.lerp(voulu, titre ? 1 : 1 - Math.exp(-dt * 20));
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
  const joueur = karts[0];
  const rang = rangDuJoueur(karts, L);
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
    son.arrivee();
  }
}

// --- Boucle ---
function dessiner(dt) {
  dessinerKarts(dt);
  effets.maj(karts, dt);
  if (!CAPTURE) son.maj(karts[0], derapage(karts[0]));
  placerSoleil(karts[0]);
  suivreCamera(karts[0], dt, etat === 'titre');
  rendu.render(scene, camera);
}

nouvelleGrille();
let avant = performance.now();
function boucle(maintenant) {
  const dt = Math.min(1 / 30, (maintenant - avant) / 1000);
  avant = maintenant;
  horloge += dt;
  // Les feux restent à l'écran jusqu'à 0,8 s après le départ (bug du 20/11 : ils ne partaient jamais).
  if (!$('feux').hidden) majFeux();
  if (etat === 'course' || etat === 'arrivee') {
    karts = separer(karts.map((k) => pas(k, commandesDe(k), dt, monde, horloge - depart)));
    majHud();
  }
  dessiner(dt);
  requestAnimationFrame(boucle);
}

/** Mode capture : la course de capture.js (identique à simulerCapture) pilote l'état, le jeu ne fait qu'afficher. */
let course = null;
function image() {
  const evenement = course.etape(PAS_CAPTURE);
  horloge = course.horloge();
  karts = course.karts();
  if (!$('feux').hidden) majFeux();
  if (etat === 'course' || etat === 'arrivee') majHud();
  dessiner(PAS_CAPTURE);
  return evenement;
}

if (CAPTURE) {
  course = creerCourseCapture(Number(PARAMS.get('graine') ?? 7));
  lancer();
  karts = course.karts();
  afficher('commandes', false);
  dessiner(0);
} else {
  requestAnimationFrame(boucle);
}

// Pour les tests en navigateur et le tournage.
window.bolide = { lancer, etat: () => etat, karts: () => karts, appuis, image, pret: true };
