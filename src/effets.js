// Les effets : fumée de dérapage, traces de pneus, flammes de turbo. Chaque effet tient en un seul objet 3D.
import * as THREE from 'three';
import { derapage } from './simulation.js';

export { derapage };

const MAX_FUMEE = 200;
const MAX_TRACES = 400;
const SEUIL_FUMEE = 0.45;
const SEUIL_TRACE = 0.3;
const VIE_FUMEE = 0.8;
const VIE_TRACE = 6;
const BORD_PISTE = 8.4; // demi-largeur + bordure : pas de traces dans l'herbe
const ROUES_ARRIERE = [[-0.92, -0.95], [0.92, -0.95]];

/** Position monde d'un point local du kart (rotation y = cap). */
function versMonde(k, lx, lz) {
  const c = Math.cos(k.cap);
  const s = Math.sin(k.cap);
  return { x: k.x + lx * c + lz * s, z: k.z - lx * s + lz * c };
}

function creerFumee() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_FUMEE * 3), 3));
  geo.setAttribute('taille', new THREE.BufferAttribute(new Float32Array(MAX_FUMEE), 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAX_FUMEE), 1));
  const matiere = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { echelle: { value: 400 } },
    vertexShader: `attribute float taille; attribute float alpha; varying float vAlpha; uniform float echelle;
      void main() { vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = taille * echelle / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vAlpha;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(0.86, 0.86, 0.84), vAlpha * smoothstep(0.5, 0.1, d)); }`,
  });
  const points = new THREE.Points(geo, matiere);
  points.frustumCulled = false;
  const particules = Array.from({ length: MAX_FUMEE }, () => ({ vie: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0 }));
  let prochaine = 0;
  return {
    objet: points,
    matiere,
    emettre(x, z, force) {
      const p = particules[prochaine];
      prochaine = (prochaine + 1) % MAX_FUMEE;
      Object.assign(p, { vie: VIE_FUMEE, x, y: 0.25, z, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, force });
    },
    maj(dt) {
      const pos = geo.attributes.position.array;
      const taille = geo.attributes.taille.array;
      const alpha = geo.attributes.alpha.array;
      particules.forEach((p, i) => {
        p.vie = Math.max(0, p.vie - dt);
        const age = 1 - p.vie / VIE_FUMEE;
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += dt * 0.9;
        pos.set([p.x, p.y, p.z], i * 3);
        taille[i] = 0.6 + age * 2.4;
        alpha[i] = p.vie > 0 ? (1 - age) * 0.55 * (p.force ?? 1) : 0;
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.taille.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
    },
  };
}

/** Traces : des quadrilatères posés au sol entre la position précédente et l'actuelle de chaque roue arrière. */
function creerTraces() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_TRACES * 6 * 3);
  const couleur = new Float32Array(MAX_TRACES * 6 * 4);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(couleur, 4));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.frustumCulled = false;
  const ages = new Float32Array(MAX_TRACES).fill(VIE_TRACE);
  let prochain = 0;
  const LARGEUR = 0.17;
  return {
    objet: mesh,
    poser(a, b, force) {
      const dx = b.x - a.x; const dz = b.z - a.z;
      const l = Math.hypot(dx, dz);
      if (l < 0.05 || l > 3) return;
      const nx = (-dz / l) * LARGEUR; const nz = (dx / l) * LARGEUR;
      const y = 0.035;
      const coins = [[a.x - nx, a.z - nz], [a.x + nx, a.z + nz], [b.x - nx, b.z - nz], [a.x + nx, a.z + nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz]];
      coins.forEach(([x, z], j) => {
        pos.set([x, y, z], (prochain * 6 + j) * 3);
        couleur.set([0.05, 0.05, 0.06, 0.55 * force], (prochain * 6 + j) * 4);
      });
      ages[prochain] = 0;
      prochain = (prochain + 1) % MAX_TRACES;
    },
    maj(dt) {
      for (let i = 0; i < MAX_TRACES; i += 1) {
        if (ages[i] >= VIE_TRACE) continue;
        ages[i] += dt;
        const fondu = ages[i] > VIE_TRACE - 1.5 ? (VIE_TRACE - ages[i]) / 1.5 : 1;
        for (let j = 0; j < 6; j += 1) couleur[(i * 6 + j) * 4 + 3] = Math.min(couleur[(i * 6 + j) * 4 + 3], 0.5 * Math.max(0, fondu));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/** Deux flammes (cônes lumineux) accrochées aux échappements de chaque kart. */
function creerFlammes(meshes) {
  const matiere = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const coeur = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  return meshes.map((mesh) => mesh.userData.echappements.map((p) => {
    const g = new THREE.Group();
    const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.1, 10, 1, true), matiere);
    flamme.rotation.x = -Math.PI / 2;
    flamme.position.z = -0.55;
    const centre = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 8, 1, true), coeur);
    centre.rotation.x = -Math.PI / 2;
    centre.position.z = -0.3;
    g.add(flamme, centre);
    g.position.copy(p);
    g.visible = false;
    mesh.add(g);
    return g;
  }));
}

/** `meshes` : les karts 3D, dans le même ordre que l'état `karts`. */
export function creerEffets(scene, meshes) {
  const fumee = creerFumee();
  const traces = creerTraces();
  const flammes = creerFlammes(meshes);
  scene.add(fumee.objet, traces.objet);
  const dernieres = meshes.map(() => null);
  let temps = 0;
  return {
    derapage,
    redimensionner(hauteurPixels) { fumee.matiere.uniforms.echelle.value = hauteurPixels * 0.7; },
    maj(karts, dt) {
      temps += dt;
      karts.forEach((k, i) => {
        const d = derapage(k);
        const roues = ROUES_ARRIERE.map(([lx, lz]) => versMonde(k, lx, lz));
        if (d > SEUIL_TRACE && dernieres[i] && Math.abs(k.ecart ?? 0) < BORD_PISTE) roues.forEach((r, j) => traces.poser(dernieres[i][j], r, Math.min(1, (d - SEUIL_TRACE) * 2)));
        if (d > SEUIL_FUMEE) roues.forEach((r) => fumee.emettre(r.x, r.z, Math.min(1, (d - SEUIL_FUMEE) * 2.5)));
        dernieres[i] = roues;
        flammes[i].forEach((g, j) => {
          g.visible = (k.turbo ?? 0) > 0;
          if (g.visible) g.scale.set(1, 1, 0.75 + 0.45 * Math.abs(Math.sin(temps * 40 + j * 2 + i)));
        });
      });
      fumee.maj(dt);
      traces.maj(dt);
    },
  };
}
