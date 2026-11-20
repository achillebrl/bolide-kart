// Le mode capture : une course rejouée à l'identique, image par image, pour filmer le reel.
// Le kart bleu est piloté par une IA rapide qui remonte de 4e à 1er, avec des dérapages bien visibles.
import { piloteIA } from './kart.js';
import { creerMonde, grilleDeDepart, ADVERSAIRES, feuxA, pas, separer, commandesIA, derapage, rangDuJoueur, VERT_A } from './simulation.js';

const AMPLI_DERAPAGE = 2.4; // le volant affiché (fumée, traces, roues) est accentué ; la trajectoire ne change pas
const FIN_FEUX = 3.4;
const RYTHME_CAPTURE = 0.97; // en capture seulement, les adversaires roulent un peu moins vite : le jeu normal n'est pas touché

/** Hasard déterministe (graine fixe → même course). */
function hasardDe(graine) {
  let g = (graine * 48271) % 2147483647 || 1;
  return () => { g = (g * 16807) % 2147483647; return g / 2147483647; };
}

/** Une course pas à pas. `etape(dt)` avance et renvoie l'événement de l'image. */
export function creerCourseCapture(graine) {
  const monde = creerMonde();
  const hasard = hasardDe(graine);
  const pilote = { couloir: (hasard() - 0.5) * 2, nervosite: 1.05 + hasard() * 0.1 };
  let karts = grilleDeDepart(monde, ADVERSAIRES.map((a) => ({ ...a, rythme: a.rythme * RYTHME_CAPTURE })));
  let horloge = 0;
  let depart = null;

  function commandes(k) {
    if (depart === null || k.fini !== null) return { gaz: 0, frein: k.fini !== null ? 0.4 : 1, volant: 0 };
    if (k.profil) return commandesIA(k, monde);
    return piloteIA(k, monde.piste, pilote);
  }

  return {
    monde,
    karts: () => karts,
    horloge: () => horloge,
    depart: () => depart,
    etape(dt) {
      horloge += dt;
      const f = feuxA(horloge);
      if (f.vert && depart === null) depart = horloge;
      const avant = karts[0].fini;
      if (depart !== null) {
        karts = separer(karts.map((k) => pas(k, commandes(k), dt, monde, horloge - depart)));
        karts = karts.map((k) => (k.profil ? k : { ...k, volant: Math.max(-1, Math.min(1, k.volant * AMPLI_DERAPAGE)) }));
      }
      const j = karts[0];
      const feux = horloge < VERT_A ? (f.allumes > 0 ? 'rouge' : null) : (horloge < FIN_FEUX ? 'vert' : null);
      return {
        t: Number(horloge.toFixed(4)),
        vitesse: Number(j.vitesse.toFixed(3)),
        derapage: Number(derapage(j).toFixed(3)),
        turbo: (j.turbo ?? 0) > 0,
        feux,
        arrivee: avant === null && j.fini !== null,
        rang: rangDuJoueur(karts, monde.L),
      };
    },
  };
}

/** La course entière, sans affichage : le rang du joueur et l'événement de chaque image. */
export function simulerCapture(graine, secondes, dt = 1 / 30) {
  const course = creerCourseCapture(graine);
  const evenements = [];
  const n = Math.round(secondes / dt);
  for (let i = 0; i < n; i += 1) evenements.push(course.etape(dt));
  return { rangs: evenements.map((e) => e.rang), evenements };
}
