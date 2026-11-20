# Bolide, un jeu de kart en 3D pour téléphone

**Jouer : https://bolide-kart.vercel.app**

3 tours, 3 adversaires, un circuit. On tourne en penchant le téléphone comme un volant (ou avec les flèches). Le jeu a été codé avec Claude Code, prompt après prompt : tout le journal, avec les vraies heures et les vrais bugs, est dans [SESSION.md](SESSION.md).

## Ce qu'il y a dedans

- **Three.js** (0.160, chargé depuis jsDelivr), sans étape de build ni fichier à télécharger : les textures (asphalte, herbe, bordures, public) sont dessinées en code au chargement.
- Ciel physique, soleil bas et ombres portées, fumée de dérapage, traces de pneus, flammes de turbo.
- Volant au gyroscope : sur iPhone, le bouton « Activer le volant » demande l'autorisation ; si elle est refusée, les flèches restent.
- Son synthétisé en WebAudio : moteur, crissement, bips des feux.
- Un mode `?capture&graine=7` qui rejoue toujours la même course image par image, pour filmer une vidéo parfaitement fluide.

| Fichier | Rôle |
|---|---|
| `src/piste.js`, `src/course.js`, `src/kart.js` | le circuit, les tours et le classement, la physique et le pilote des adversaires |
| `src/simulation.js` | une course sans affichage, partagée par le jeu et le mode capture |
| `src/volant.js` | inclinaison du téléphone → volant |
| `src/decor.js`, `src/kart3d.js`, `src/textures.js` | le décor et les karts en 3D |
| `src/effets.js`, `src/son.js` | fumée, traces, turbo ; le son |
| `src/capture.js` | la course rejouable du mode capture |
| `src/jeu.js` | la boucle du jeu et l'interface |

## Lancer en local

```bash
python3 -m http.server 5173
```

Puis ouvrir http://localhost:5173. Les tests (Node 20 ou plus) :

```bash
npm test
```

## Licence

MIT : voir [LICENSE](LICENSE).
