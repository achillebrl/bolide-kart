// Le son du jeu, synthétisé en WebAudio (aucun fichier) : moteur, crissement, bips des feux, arrivée.

const RALENTI = 55;
const MONTEE = 4.2;
const BONUS_TURBO = 1.15;
const VOLUME = 0.32;

/** Hauteur du moteur (Hz) selon la vitesse ; le turbo la pousse un cran plus haut. */
export function hauteurMoteur(vitesse, turbo) {
  const h = RALENTI + Math.max(0, vitesse) * MONTEE;
  return turbo ? h * BONUS_TURBO : h;
}

/** Onglet caché ou écran verrouillé : silence. */
export function etatSon(visibilite) {
  return { volume: visibilite === 'cache' ? 0 : VOLUME };
}

function bruit(ctx) {
  const tampon = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < donnees.length; i += 1) donnees[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  source.loop = true;
  return source;
}

export function creerSon() {
  let ctx = null;
  let general; let moteurs; let filtre; let crissement;
  const lisser = (param, valeur, temps = 0.06) => param.setTargetAtTime(valeur, ctx.currentTime, temps);

  function note(frequence, debut, duree, volume = 0.25, forme = 'sine') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = forme;
    osc.frequency.value = frequence;
    g.gain.setValueAtTime(0, ctx.currentTime + debut);
    g.gain.linearRampToValueAtTime(volume, ctx.currentTime + debut + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + debut + duree);
    osc.connect(g).connect(general);
    osc.start(ctx.currentTime + debut);
    osc.stop(ctx.currentTime + debut + duree + 0.05);
  }

  return {
    /** À appeler au clic sur « Démarrer » : sur iPhone, le son ne peut démarrer qu'après un geste. */
    demarrer() {
      if (ctx) { ctx.resume(); return; }
      const Contexte = window.AudioContext || window.webkitAudioContext;
      if (!Contexte) return;
      ctx = new Contexte();
      general = ctx.createGain();
      general.gain.value = etatSon(document.hidden ? 'cache' : 'visible').volume;
      general.connect(ctx.destination);
      filtre = ctx.createBiquadFilter();
      filtre.type = 'lowpass';
      filtre.frequency.value = 600;
      filtre.Q.value = 3;
      const gainMoteur = ctx.createGain();
      gainMoteur.gain.value = 0.35;
      filtre.connect(gainMoteur).connect(general);
      moteurs = [1, 0.5, 1.01].map((mult) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = RALENTI * mult;
        o.connect(filtre);
        o.start();
        return { o, mult };
      });
      const passeBande = ctx.createBiquadFilter();
      passeBande.type = 'bandpass';
      passeBande.frequency.value = 2400;
      passeBande.Q.value = 5;
      crissement = ctx.createGain();
      crissement.gain.value = 0;
      const b = bruit(ctx);
      b.connect(passeBande).connect(crissement).connect(general);
      b.start();
      document.addEventListener('visibilitychange', () => {
        lisser(general.gain, etatSon(document.hidden ? 'cache' : 'visible').volume, 0.02);
      });
    },
    maj(joueur, derapage) {
      if (!ctx) return;
      const h = hauteurMoteur(joueur.vitesse, (joueur.turbo ?? 0) > 0);
      moteurs.forEach(({ o, mult }) => lisser(o.frequency, h * mult));
      lisser(filtre.frequency, 500 + Math.max(0, joueur.vitesse) * 45);
      lisser(crissement.gain, derapage > 0.3 ? (derapage - 0.3) * 0.5 : 0, 0.04);
    },
    bip(aigu) { if (ctx) note(aigu ? 880 : 660, 0, aigu ? 0.5 : 0.22, 0.3); },
    arrivee() { if (ctx) [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.35, 0.22, 'triangle')); },
    couper() { if (ctx) lisser(general.gain, 0, 0.02); },
  };
}
