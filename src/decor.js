// Le décor 3D : piste texturée, bordures en relief, herbe, départ, tribunes, arbres, collines. Aucun fichier externe.
import * as THREE from 'three';
import { texAsphalte, texHerbe, texTaches, texBordure, texDamier, texTurbo, texPublic, texPanneau } from './textures.js';

export { creerKart } from './kart3d.js';

const BORDURE = 1.4;
const LONGUEUR_MOTIF = 14;

/**
 * Ruban le long de la piste. `profil` = [{ d, y, u }] du bord droit au bord gauche (d latéral, gauche > 0).
 * v avance de 1 tous les `motif` mètres.
 */
function ruban(piste, profil, motif) {
  const { echantillons, cumul, longueur } = piste;
  const n = echantillons.length;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= n; i += 1) {
    const e = echantillons[i % n];
    const v = (i === n ? longueur : cumul[i]) / motif;
    profil.forEach(({ d, y, u }) => {
      positions.push(e.x - e.tz * d, y, e.z + e.tx * d);
      uvs.push(u, v);
    });
  }
  const m = profil.length;
  for (let i = 0; i < n; i += 1) for (let j = 0; j < m - 1; j += 1) {
    const a = i * m + j; const b = a + 1; const c = a + m; const d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Pose un plan à plat sur la piste, son haut (texture) tourné dans le sens de la course. */
function poser(objet, e, y) {
  objet.position.set(e.x, y, e.z);
  objet.rotation.set(-Math.PI / 2, Math.atan2(e.tx, e.tz), Math.PI, 'YXZ');
  return objet;
}

export function creerPiste3D(piste, demiLargeur, turbos) {
  const groupe = new THREE.Group();
  const asphalte = new THREE.Mesh(
    ruban(piste, [{ d: -demiLargeur, y: 0.02, u: 0 }, { d: demiLargeur, y: 0.02, u: 1 }], LONGUEUR_MOTIF),
    new THREE.MeshStandardMaterial({ map: texAsphalte(), roughness: 0.85, metalness: 0.05 }),
  );
  asphalte.receiveShadow = true;
  groupe.add(asphalte);

  // Bordures bombées : bas contre l'asphalte, sommet au milieu, bas côté herbe.
  const bordure = new THREE.MeshStandardMaterial({ map: texBordure(), roughness: 0.6 });
  [1, -1].forEach((cote) => {
    const d0 = cote * demiLargeur;
    const profil = [0, 0.5, 1].map((f) => ({ d: d0 + cote * BORDURE * f, y: f === 0.5 ? 0.12 : 0.03, u: f }));
    const geo = ruban(piste, cote > 0 ? profil : [...profil].reverse(), 6);
    const mesh = new THREE.Mesh(geo, bordure);
    mesh.receiveShadow = true;
    groupe.add(mesh);
  });

  const damier = texDamier();
  damier.repeat.set(demiLargeur / 2, 1);
  const ligne = new THREE.Mesh(new THREE.PlaneGeometry(demiLargeur * 2, 2), new THREE.MeshStandardMaterial({ map: damier, roughness: 0.7 }));
  ligne.receiveShadow = true;
  groupe.add(poser(ligne, piste.echantillons[0], 0.04));

  const fleches = texTurbo();
  turbos.forEach((e) => {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshStandardMaterial({ map: fleches, emissive: '#ff6a00', emissiveIntensity: 0.6, emissiveMap: fleches }));
    groupe.add(poser(plaque, e, 0.05));
  });
  groupe.add(portique(piste.echantillons[0], demiLargeur), tribunes(piste, demiLargeur));
  return groupe;
}

/** Portique de départ au-dessus de la ligne, avec un bandeau. */
function portique(e, demiLargeur) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#d9dce1', metalness: 0.8, roughness: 0.3 });
  const largeur = demiLargeur * 2 + 4;
  [-1, 1].forEach((c) => {
    const pied = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), metal);
    pied.position.set(c * largeur / 2, 3.5, 0);
    g.add(pied);
  });
  const bandeau = new THREE.Mesh(new THREE.BoxGeometry(largeur + 0.6, 1.6, 0.5), [metal, metal, metal, metal,
    new THREE.MeshStandardMaterial({ map: texPanneau('BOLIDE', '#14213d', '#ffd23f') }),
    new THREE.MeshStandardMaterial({ map: texPanneau('BOLIDE', '#14213d', '#ffd23f') })]);
  bandeau.material.forEach((m) => { if (m.map) { m.map.repeat.set(1, 0.25); m.map.offset.set(0, 0.75); } });
  bandeau.position.y = 7.2;
  g.add(bandeau);
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(e.x, 0, e.z);
  g.rotation.y = Math.atan2(e.tx, e.tz);
  return g;
}

/** Tribune couverte le long de la ligne droite de départ, et panneaux inventés. */
function tribunes(piste, demiLargeur) {
  const g = new THREE.Group();
  const n = piste.echantillons.length;
  const e = piste.echantillons[n - 20];
  const cote = demiLargeur + BORDURE + 9;
  const beton = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.9 });
  const publicTex = texPublic();
  publicTex.repeat.set(6, 1);
  const tribune = new THREE.Group();
  for (let r = 0; r < 6; r += 1) {
    const gradin = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 40), [beton, new THREE.MeshStandardMaterial({ map: publicTex, roughness: 0.9 }), beton, beton, beton, beton]);
    gradin.position.set(r * 1.6, 0.45 + r * 0.9, 0);
    tribune.add(gradin);
  }
  const toit = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 42), new THREE.MeshStandardMaterial({ color: '#e8412c', roughness: 0.5 }));
  toit.position.set(4.5, 8.4, 0);
  toit.rotation.z = -0.12;
  const piliers = [-20, 0, 20].map((z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8.2, 8), beton);
    p.position.set(9.5, 4.1, z);
    return p;
  });
  tribune.add(toit, ...piliers);
  tribune.position.set(e.x + e.tz * cote, 0, e.z - e.tx * cote);
  tribune.rotation.y = Math.atan2(e.tx, e.tz);
  g.add(tribune);

  const panneaux = [['TURBO', '#ff7a00', '#14213d'], ['3 TOURS', '#2457ff', '#f7f5ef'], ['PLEIN GAZ', '#2fbf71', '#14213d']];
  [0.2, 0.47, 0.75].forEach((f, i) => {
    const p = piste.echantillons[Math.floor(n * f)];
    const [texte, fond, encre] = panneaux[i];
    const tex = texPanneau(texte, fond, encre);
    tex.repeat.set(1, 0.25); tex.offset.set(0, 0.75);
    const panneau = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    const d = -(demiLargeur + BORDURE + 6);
    panneau.position.set(p.x - p.tz * d, 1.6, p.z + p.tx * d);
    panneau.rotation.y = Math.atan2(p.tx, p.tz) - Math.PI / 2;
    panneau.castShadow = true;
    g.add(panneau);
  });
  return g;
}

export function creerSol() {
  const geo = new THREE.PlaneGeometry(1400, 1400);
  geo.setAttribute('uv1', geo.attributes.uv.clone());
  const herbe = texHerbe();
  herbe.repeat.set(220, 220);
  const taches = texTaches();
  taches.channel = 1;
  const sol = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: herbe, aoMap: taches, aoMapIntensity: 1, roughness: 0.95 }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  const groupe = new THREE.Group();
  groupe.add(sol, collines());
  return groupe;
}

/** Collines basses tout autour, au loin : elles ferment l'horizon dans la brume. */
function collines() {
  const g = new THREE.Group();
  const matiere = new THREE.MeshStandardMaterial({ color: '#4f8a3a', roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2;
    const r = 330 + (i % 3) * 40;
    const h = 30 + ((i * 37) % 50);
    const colline = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matiere);
    colline.scale.set(90 + (i % 4) * 25, h, 70);
    colline.position.set(70 + Math.cos(a) * r, -2, 20 + Math.sin(a) * r);
    colline.rotation.y = a;
    g.add(colline);
  }
  return g;
}

/** Arbres posés au hasard (graine fixe : le décor est toujours le même), loin de la piste. 3 sortes, en instances. */
export function creerArbres(piste, reperer, demiLargeur, nombre) {
  let graine = 7;
  const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  const xs = piste.echantillons.map((e) => e.x);
  const zs = piste.echantillons.map((e) => e.z);
  const [x0, x1, z0, z1] = [Math.min(...xs) - 80, Math.max(...xs) + 80, Math.min(...zs) - 80, Math.max(...zs) + 80];
  const places = [];
  for (let essai = 0; essai < nombre * 8 && places.length < nombre; essai += 1) {
    const x = x0 + hasard() * (x1 - x0);
    const z = z0 + hasard() * (z1 - z0);
    if (Math.abs(reperer(piste, x, z).ecart) < demiLargeur + 7) continue;
    places.push({ x, z, h: 0.8 + hasard() * 0.7, sorte: Math.floor(hasard() * 3), a: hasard() * Math.PI * 2, teinte: hasard() });
  }
  const parties = [
    // [sorte, géométrie, matériau, décalage (x, y, z) pour une taille 1]
    [0, new THREE.CylinderGeometry(0.25, 0.4, 3, 7), '#6b4426', [0, 1.5, 0]],
    [0, new THREE.ConeGeometry(2.6, 4.5, 9), '#2d6e3e', [0, 4.2, 0]],
    [0, new THREE.ConeGeometry(2.0, 3.8, 9), '#327a44', [0, 6.2, 0]],
    [0, new THREE.ConeGeometry(1.3, 3.0, 9), '#3a8a4c', [0, 8.0, 0]],
    [1, new THREE.CylinderGeometry(0.3, 0.45, 3.4, 7), '#73502f', [0, 1.7, 0]],
    [1, new THREE.IcosahedronGeometry(2.4, 1), '#4c8f35', [0, 5.0, 0]],
    [1, new THREE.IcosahedronGeometry(1.8, 1), '#5a9c3c', [1.5, 4.2, 0.6]],
    [1, new THREE.IcosahedronGeometry(1.7, 1), '#438530', [-1.2, 4.4, -0.8]],
    [2, new THREE.IcosahedronGeometry(1.4, 1), '#4a8a34', [0, 0.9, 0]],
    [2, new THREE.IcosahedronGeometry(1.0, 1), '#57993d', [1.0, 0.7, 0.4]],
  ];
  const groupe = new THREE.Group();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const couleur = new THREE.Color();
  parties.forEach(([sorte, geo, teinte, [dx, dy, dz]]) => {
    const ici = places.filter((p) => p.sorte === sorte);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: sorte > 0 }), ici.length);
    ici.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.a);
      const decale = new THREE.Vector3(dx, dy, dz).applyQuaternion(q).multiplyScalar(p.h);
      m.compose(new THREE.Vector3(p.x + decale.x, decale.y, p.z + decale.z), q, new THREE.Vector3(p.h, p.h, p.h));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, couleur.set(teinte).offsetHSL((p.teinte - 0.5) * 0.04, 0, (p.teinte - 0.5) * 0.12));
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    groupe.add(inst);
  });
  return groupe;
}
