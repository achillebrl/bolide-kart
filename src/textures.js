// Textures dessinées en canvas au chargement : aucun fichier à télécharger.
import * as THREE from 'three';

let graine = 11;
const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };

/** Dessine dans un canvas et en fait une texture répétable, filtrée proprement (mipmaps + anisotropie). */
export function texture(dessin, taille = 512, { couleur = true, repeter = true } = {}) {
  const toile = document.createElement('canvas');
  toile.width = taille;
  toile.height = taille;
  dessin(toile.getContext('2d'), taille);
  const t = new THREE.CanvasTexture(toile);
  if (couleur) t.colorSpace = THREE.SRGBColorSpace;
  if (repeter) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

/** Saupoudre `n` petits points de couleurs prises dans `teintes`. */
function grain(ctx, t, n, teintes, rayon = 1.2) {
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = teintes[Math.floor(hasard() * teintes.length)];
    ctx.globalAlpha = 0.25 + hasard() * 0.5;
    ctx.fillRect(hasard() * t, hasard() * t, rayon * (0.5 + hasard()), rayon * (0.5 + hasard()));
  }
  ctx.globalAlpha = 1;
}

/** Asphalte : u = travers de la piste (0 → 1), v = le long. Grain, trajectoire plus sombre, lignes blanches au bord. */
export function texAsphalte() {
  return texture((ctx, t) => {
    const fond = ctx.createLinearGradient(0, 0, t, 0);
    fond.addColorStop(0, '#4a4d52');
    fond.addColorStop(0.3, '#3d4044');
    fond.addColorStop(0.5, '#33363a');
    fond.addColorStop(0.7, '#3d4044');
    fond.addColorStop(1, '#4a4d52');
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, t, t);
    grain(ctx, t, 26000, ['#2a2c30', '#5b5e63', '#6b6e72', '#232528', '#4f5257']);
    // Gomme laissée sur la trajectoire.
    for (let i = 0; i < 40; i += 1) {
      ctx.strokeStyle = `rgba(20,20,22,${0.04 + hasard() * 0.05})`;
      ctx.lineWidth = 4 + hasard() * 14;
      const x = t * (0.38 + hasard() * 0.24);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (hasard() - 0.5) * 20, t); ctx.stroke();
    }
    // Fissures fines.
    ctx.strokeStyle = 'rgba(15,15,17,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      let x = hasard() * t; let y = hasard() * t;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 6; j += 1) { x += (hasard() - 0.5) * 30; y += hasard() * 22; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = '#e9e7df';
    ctx.fillRect(t * 0.012, 0, t * 0.016, t);
    ctx.fillRect(t * 0.972, 0, t * 0.016, t);
  }, 1024);
}

/** Herbe tondue : 2 tons, brins, petites fleurs claires. */
export function texHerbe() {
  return texture((ctx, t) => {
    ctx.fillStyle = '#5f9a3e';
    ctx.fillRect(0, 0, t, t);
    grain(ctx, t, 30000, ['#4f8a33', '#6eab48', '#7dba52', '#3f7a2a', '#86c25a'], 2);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5000; i += 1) {
      const x = hasard() * t; const y = hasard() * t;
      ctx.strokeStyle = hasard() > 0.5 ? 'rgba(140,200,90,0.5)' : 'rgba(45,95,30,0.5)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (hasard() - 0.5) * 3, y - 3 - hasard() * 4); ctx.stroke();
    }
    grain(ctx, t, 120, ['#f4f1d0', '#f3e27a'], 2);
  });
}

/** Grandes taches claires et sombres pour casser la répétition de l'herbe (sert d'aoMap, en niveaux de gris). */
export function texTaches() {
  return texture((ctx, t) => {
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, t, t);
    for (let i = 0; i < 260; i += 1) {
      const x = hasard() * t; const y = hasard() * t; const r = 6 + hasard() * 28;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = hasard() > 0.5 ? 255 : 150;
      g.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 256, { couleur: false, repeter: false });
}

/** Bordure : bandes rouges et blanches le long de v, un peu salies. */
export function texBordure() {
  return texture((ctx, t) => {
    ctx.fillStyle = '#d93a25';
    ctx.fillRect(0, 0, t, t / 2);
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, t / 2, t, t / 2);
    grain(ctx, t, 3000, ['#8a8a8a', '#3a3a3a', '#ffffff'], 1.5);
  }, 128);
}

/** Damier de la ligne de départ. */
export function texDamier() {
  return texture((ctx, t) => {
    const c = t / 8;
    for (let x = 0; x < 8; x += 1) for (let y = 0; y < 8; y += 1) {
      ctx.fillStyle = (x + y) % 2 ? '#111318' : '#f2efe6';
      ctx.fillRect(x * c, y * c, c, c);
    }
    grain(ctx, t, 1500, ['#555', '#999'], 1.5);
  }, 256);
}

/** Plaque de turbo : chevrons orange lumineux. */
export function texTurbo() {
  return texture((ctx, t) => {
    ctx.fillStyle = '#ff7a00';
    ctx.fillRect(0, 0, t, t);
    ctx.strokeStyle = '#fff1c2';
    ctx.lineWidth = t / 10;
    ctx.lineJoin = 'round';
    [0.6, 0.3].forEach((h) => {
      ctx.beginPath(); ctx.moveTo(t * 0.18, t * (h + 0.2)); ctx.lineTo(t * 0.5, t * h); ctx.lineTo(t * 0.82, t * (h + 0.2)); ctx.stroke();
    });
  }, 128, { repeter: false });
}

/** Public des tribunes : rangées de points colorés. */
export function texPublic() {
  return texture((ctx, t) => {
    ctx.fillStyle = '#6b6f78';
    ctx.fillRect(0, 0, t, t);
    const teintes = ['#e63946', '#f1faee', '#1d3557', '#ffb703', '#2a9d8f', '#ff7a00', '#8ecae6', '#3a3a3a'];
    for (let y = 4; y < t; y += 16) for (let x = 3; x < t; x += 7 + hasard() * 3) {
      ctx.fillStyle = teintes[Math.floor(hasard() * teintes.length)];
      ctx.beginPath(); ctx.arc(x, y + hasard() * 3, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0b48f';
      ctx.beginPath(); ctx.arc(x, y - 3.5 + hasard() * 2, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }, 256);
}

/** Panneau publicitaire inventé (aucune vraie marque). */
export function texPanneau(texte, fond, encre) {
  return texture((ctx, t) => {
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, t, t / 4);
    ctx.fillStyle = encre;
    ctx.font = `bold ${t / 7}px "Bowlby One", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, t / 2, t / 8);
  }, 512, { repeter: false });
}

/** Numéro de course sur fond blanc rond. */
export function texNumero(n, couleur) {
  return texture((ctx, t) => {
    ctx.fillStyle = '#f7f5ef';
    ctx.beginPath(); ctx.arc(t / 2, t / 2, t * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = couleur;
    ctx.font = `bold ${t * 0.55}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), t / 2, t * 0.54);
  }, 128, { repeter: false });
}
