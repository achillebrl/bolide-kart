// Les objets 3D : piste, bordures, ligne de départ, turbos, karts, arbres. Aucun asset externe.
import * as THREE from 'three';

const BORDURE = 1.4;

function texture(dessin, taille = 64) {
  const toile = document.createElement('canvas');
  toile.width = taille;
  toile.height = taille;
  dessin(toile.getContext('2d'), taille);
  const t = new THREE.CanvasTexture(toile);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Bande le long de la piste, entre les distances latérales `de` et `a` (gauche > 0), couleur par tronçon. */
function bande(piste, de, a, couleurDe, y) {
  const { echantillons } = piste;
  const n = echantillons.length;
  const positions = [];
  const couleurs = [];
  const bord = (e, d) => [e.x - e.tz * d, y, e.z + e.tx * d];
  for (let i = 0; i < n; i += 1) {
    const e0 = echantillons[i];
    const e1 = echantillons[(i + 1) % n];
    const quad = [bord(e0, de), bord(e1, de), bord(e0, a), bord(e1, de), bord(e1, a), bord(e0, a)];
    const c = new THREE.Color(couleurDe(i));
    quad.forEach((p) => { positions.push(...p); couleurs.push(c.r, c.g, c.b); });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}

/** Pose un plan à plat sur la piste, son haut (texture) tourné dans le sens de la course. */
function poser(objet, e, y) {
  objet.position.set(e.x, y, e.z);
  objet.rotation.set(-Math.PI / 2, Math.atan2(e.tx, e.tz), Math.PI, 'YXZ');
  return objet;
}

export function creerPiste3D(piste, demiLargeur, turbos) {
  const groupe = new THREE.Group();
  groupe.add(bande(piste, -demiLargeur, demiLargeur, (i) => (Math.floor(i / 9) % 2 ? '#3b3e44' : '#383b41'), 0.02));
  const rougeBlanc = (i) => (Math.floor(i / 3) % 2 ? '#e8412c' : '#f7f5ef');
  groupe.add(bande(piste, demiLargeur, demiLargeur + BORDURE, rougeBlanc, 0.04));
  groupe.add(bande(piste, -demiLargeur - BORDURE, -demiLargeur, rougeBlanc, 0.04));

  const damier = texture((ctx, t) => {
    const c = t / 8;
    for (let x = 0; x < 8; x += 1) for (let y = 0; y < 8; y += 1) {
      ctx.fillStyle = (x + y) % 2 ? '#14213d' : '#f7f5ef';
      ctx.fillRect(x * c, y * c, c, c);
    }
  });
  damier.wrapS = THREE.RepeatWrapping;
  damier.repeat.set(demiLargeur / 2, 1);
  const ligne = new THREE.Mesh(new THREE.PlaneGeometry(demiLargeur * 2, 2), new THREE.MeshLambertMaterial({ map: damier }));
  groupe.add(poser(ligne, piste.echantillons[0], 0.05));

  const fleches = texture((ctx, t) => {
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(0, 0, t, t);
    ctx.strokeStyle = '#fff4d6';
    ctx.lineWidth = t / 9;
    ctx.lineJoin = 'round';
    [0.62, 0.32].forEach((h) => {
      ctx.beginPath();
      ctx.moveTo(t * 0.2, t * (h + 0.18));
      ctx.lineTo(t * 0.5, t * h);
      ctx.lineTo(t * 0.8, t * (h + 0.18));
      ctx.stroke();
    });
  });
  turbos.forEach((e) => {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ map: fleches }));
    groupe.add(poser(plaque, e, 0.06));
  });
  return groupe;
}

export function creerSol() {
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: '#7cc35a' }));
  sol.rotation.x = -Math.PI / 2;
  return sol;
}

export function creerKart(couleur, casque) {
  const kart = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 2.5), mat(couleur));
  caisse.position.y = 0.45;
  const nez = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.7), mat(couleur));
  nez.position.set(0, 0.42, 1.45);
  const siege = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.4), mat('#14213d'));
  siege.position.set(0, 0.85, -0.55);
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(casque));
  tete.position.set(0, 1.45, -0.25);
  const visiere = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.1), mat('#14213d'));
  visiere.position.set(0, 1.5, 0.12);
  const aileron = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.45), mat('#14213d'));
  aileron.position.set(0, 1.0, -1.35);
  kart.add(caisse, nez, siege, tete, visiere, aileron);
  const roue = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 14);
  roue.rotateZ(Math.PI / 2);
  [[-0.95, 0.9], [0.95, 0.9], [-0.95, -0.9], [0.95, -0.9]].forEach(([x, z]) => {
    const r = new THREE.Mesh(roue, mat('#1b1d22'));
    r.position.set(x, 0.42, z);
    kart.add(r);
  });
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25 }));
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = 0.07;
  ombre.scale.set(0.75, 1.15, 1);
  kart.add(ombre);
  return kart;
}

/** Arbres posés au hasard (graine fixe : le décor est toujours le même), loin de la piste. */
export function creerArbres(piste, reperer, demiLargeur, nombre) {
  const groupe = new THREE.Group();
  let graine = 7;
  const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  const xs = piste.echantillons.map((e) => e.x);
  const zs = piste.echantillons.map((e) => e.z);
  const [x0, x1, z0, z1] = [Math.min(...xs) - 60, Math.max(...xs) + 60, Math.min(...zs) - 60, Math.max(...zs) + 60];
  const feuillage = new THREE.MeshLambertMaterial({ color: '#2f8f4e' });
  const tronc = new THREE.MeshLambertMaterial({ color: '#7a4f2a' });
  let poses = 0;
  for (let essai = 0; essai < nombre * 6 && poses < nombre; essai += 1) {
    const x = x0 + hasard() * (x1 - x0);
    const z = z0 + hasard() * (z1 - z0);
    if (Math.abs(reperer(piste, x, z).ecart) < demiLargeur + 6) continue;
    const h = 4 + hasard() * 5;
    const arbre = new THREE.Group();
    const cime = new THREE.Mesh(new THREE.ConeGeometry(h * 0.38, h, 7), feuillage);
    cime.position.y = h * 0.5 + 1.2;
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.4, 6), tronc);
    pied.position.y = 0.7;
    arbre.add(cime, pied);
    arbre.position.set(x, 0, z);
    groupe.add(arbre);
    poses += 1;
  }
  return groupe;
}
