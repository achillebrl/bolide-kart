// Le kart en 3D : châssis arrondi, pontons, pilote casqué, aileron, roues qui tournent et braquent.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texNumero } from './textures.js';

export const RAYON_ROUE = 0.36;
let numero = 0;

const peinture = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.32 });
const mat = (c, rugosite = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rugosite, metalness: metal });

/**
 * Fusionne toutes les pièces fixes d'un groupe en un objet par matière : beaucoup moins d'appels de dessin
 * (un iPhone moyen dessine vite peu d'objets, lentement beaucoup de petits). `garder` : enfants à laisser à part.
 */
function fusionnerParMatiere(groupe, garder = []) {
  groupe.updateMatrixWorld(true);
  const inverse = groupe.matrixWorld.clone().invert();
  const parMatiere = new Map();
  const aRetirer = [];
  groupe.traverse((o) => {
    if (!o.isMesh || garder.some((g) => g === o || g.getObjectById(o.id))) return;
    const m = o.material;
    const cle = `${m.color.getHexString()}-${m.roughness}-${m.metalness}-${m.map?.uuid ?? ''}`;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    ['uv1', 'uv2'].forEach((a) => geo.deleteAttribute(a));
    if (!parMatiere.has(cle)) parMatiere.set(cle, { matiere: m, geos: [], ombre: false });
    const lot = parMatiere.get(cle);
    lot.geos.push(geo);
    lot.ombre ||= o.castShadow;
    aRetirer.push(o);
  });
  aRetirer.forEach((o) => o.parent.remove(o));
  parMatiere.forEach(({ matiere, geos, ombre }) => {
    const mesh = new THREE.Mesh(mergeGeometries(geos), matiere);
    mesh.castShadow = ombre;
    mesh.receiveShadow = true;
    groupe.add(mesh);
  });
}

/** Profil latéral du châssis (z vers l'avant, y vers le haut), extrudé sur la largeur avec des bords arrondis. */
function chassis(couleur) {
  const p = new THREE.Shape();
  p.moveTo(-1.25, 0.22);
  p.lineTo(1.05, 0.22);
  p.quadraticCurveTo(1.55, 0.24, 1.6, 0.42);
  p.lineTo(1.2, 0.55);
  p.quadraticCurveTo(0.4, 0.62, 0.1, 0.75);
  p.lineTo(-0.12, 0.7);
  p.quadraticCurveTo(-0.25, 0.46, -0.45, 0.44);
  p.lineTo(-1.15, 0.42);
  p.quadraticCurveTo(-1.3, 0.38, -1.25, 0.22);
  p.closePath();
  const geo = new THREE.ExtrudeGeometry(p, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 10 });
  geo.rotateY(-Math.PI / 2);
  geo.translate(0.45, 0, 0);
  return new THREE.Mesh(geo, peinture(couleur));
}

function roue() {
  const groupe = new THREE.Group();
  const pneu = new THREE.Mesh(new THREE.CylinderGeometry(RAYON_ROUE, RAYON_ROUE, 0.34, 24, 1), mat('#141518', 0.85));
  pneu.rotation.z = Math.PI / 2;
  const flanc = new THREE.Mesh(new THREE.TorusGeometry(RAYON_ROUE - 0.04, 0.05, 8, 24), mat('#141518', 0.85));
  flanc.rotation.y = Math.PI / 2;
  flanc.position.x = 0.16;
  const jante = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 14), mat('#c9ccd1', 0.25, 0.9));
  jante.rotation.z = Math.PI / 2;
  // Rayons visibles : on voit la roue tourner.
  const rayons = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.05), mat('#e7e9ec', 0.3, 0.8));
    r.rotation.x = (i / 5) * Math.PI;
    rayons.add(r);
  }
  rayons.position.x = 0.185;
  groupe.add(pneu, flanc, jante, rayons);
  pneu.castShadow = true; // le flanc, la jante et les rayons ne font pas d'ombre visible
  fusionnerParMatiere(groupe);
  return groupe;
}

function pilote(couleur, casque) {
  const groupe = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 6, 12), mat('#1b2236', 0.6));
  corps.position.set(0, 0.92, -0.45);
  corps.rotation.x = -0.25;
  const bande = new THREE.Mesh(new THREE.CapsuleGeometry(0.305, 0.12, 4, 12), peinture(couleur));
  bande.position.copy(corps.position);
  bande.rotation.x = -0.25;
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 18), peinture(casque));
  tete.position.set(0, 1.42, -0.36);
  const visiere = new THREE.Mesh(
    new THREE.SphereGeometry(0.315, 24, 12, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.32, Math.PI * 0.22),
    new THREE.MeshStandardMaterial({ color: '#0b0d12', metalness: 0.9, roughness: 0.08 }),
  );
  visiere.position.copy(tete.position);
  const bras = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), mat('#1b2236', 0.6));
  bras.rotation.set(Math.PI / 2.4, 0, Math.PI / 2);
  bras.position.set(0, 1.12, 0.05);
  const volant = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), mat('#111', 0.5));
  volant.position.set(0, 1.05, 0.35);
  volant.rotation.x = -0.9;
  groupe.add(corps, bande, tete, visiere, bras, volant);
  return groupe;
}

/** `userData.roues` (4 groupes qui tournent sur x), `userData.pivots` (2 avant qui braquent sur y), `userData.echappements` (2 points locaux). */
export function creerKart(couleur, casque) {
  numero += 1;
  const kart = new THREE.Group();
  const caisse = chassis(couleur);
  const plancher = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 2.6), mat('#22252b', 0.6, 0.4));
  plancher.position.y = 0.2;
  const pontons = [-0.78, 0.78].map((x) => {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.0, 6, 12), peinture('#f7f5ef'));
    p.rotation.x = Math.PI / 2;
    p.position.set(x, 0.38, 0.05);
    return p;
  });
  const parechoc = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.3, 4, 8), mat('#2b2f36', 0.4, 0.6));
  parechoc.rotation.z = Math.PI / 2;
  parechoc.position.set(0, 0.3, 1.72);
  const aileron = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.42), peinture(couleur));
  aileron.position.set(0, 1.08, -1.38);
  aileron.rotation.x = 0.12;
  const derives = [-0.82, 0.82].map((x) => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.5), mat('#14161b', 0.5));
    d.position.set(x, 0.95, -1.38);
    return d;
  });
  const mats = [-0.35, 0.35].map((x) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), mat('#14161b', 0.5));
    m.position.set(x, 0.85, -1.3);
    return m;
  });
  const moteur = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.45), mat('#3a3e46', 0.35, 0.7));
  moteur.position.set(0.2, 0.55, -1.0);
  const tuyaux = [-0.18, 0.18].map((x) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 10), mat('#8c8f96', 0.25, 0.95));
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0.45, -1.48);
    return t;
  });
  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), new THREE.MeshStandardMaterial({ map: texNumero(numero, '#14213d'), roughness: 0.5 }));
  plaque.position.set(0, 0.62, 1.48);
  plaque.rotation.x = -1.0;
  const siege = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.35, 6, 12), mat('#15171c', 0.55));
  siege.scale.set(1, 1, 0.45);
  siege.position.set(0, 0.85, -0.78);
  siege.rotation.x = -0.25;
  const arriere = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.55, 4, 10), mat('#2b2f36', 0.4, 0.6));
  arriere.rotation.z = Math.PI / 2;
  arriere.position.set(0, 0.34, -1.62);
  kart.add(caisse, plancher, siege, arriere, ...pontons, parechoc, aileron, ...derives, ...mats, moteur, ...tuyaux, plaque, pilote(couleur, casque));

  const roues = [];
  const pivots = [];
  [[-0.88, 1.0, true], [0.88, 1.0, true], [-0.92, -0.95, false], [0.92, -0.95, false]].forEach(([x, z, avant]) => {
    const r = roue();
    if (x < 0) r.rotation.y = Math.PI;
    const pivot = new THREE.Group();
    pivot.position.set(x, RAYON_ROUE, z);
    const rouleau = new THREE.Group();
    rouleau.add(r);
    pivot.add(rouleau);
    kart.add(pivot);
    roues.push(rouleau);
    if (avant) pivots.push(pivot);
  });
  kart.traverse((o) => { if (o.isMesh && !pivots.some((p) => p.getObjectById(o.id)) && !roues.some((r) => r.getObjectById(o.id))) { o.castShadow = true; o.receiveShadow = true; } });
  fusionnerParMatiere(kart, [...roues]);
  kart.userData = {
    roues,
    pivots,
    echappements: [new THREE.Vector3(-0.18, 0.45, -1.68), new THREE.Vector3(0.18, 0.45, -1.68)],
  };
  return kart;
}
