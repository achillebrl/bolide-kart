# Journal de la session « jeu de kart » (épisode 1 du compte appli)

Vraies heures (Paris), vrais prompts, vrais bugs. Sert au replay de la session dans le reel et au kit.

| Heure | Prompt / étape | Résultat |
|---|---|---|
| 09:27 | « Crée un jeu de kart en 3D jouable sur téléphone : un circuit, 3 adversaires, 3 tours, le chrono. Pas de personnage connu, tout original. » | dossier, plan : logique de course testée d'abord, rendu Three.js ensuite |
| 09:27 | « Écris d'abord les règles de la course et leurs tests : le circuit, les tours, le classement. » | 7 tests passent ✓ (piste.js, course.js) |
| 09:28 | « Ajoute la physique du kart et des adversaires qui suivent la piste, avec des tests. » | 12 tests passent ✓ (kart.js) |
| 12:44 | « Fais le jeu en 3D : le circuit, les karts, l'écran titre, les feux de départ et deux flèches pour jouer au doigt. » | jeu jouable sur iPhone (Three.js), 0 erreur |
| 12:44 | **Bug** : au départ, les feux verts « Partez ! » restent affichés toute la course et cachent la piste. | cause : les feux ne se mettaient à jour que pendant le compte à rebours ; corrigé, ils disparaissent 0,8 s après le départ ✓ |
| 14:07 | **Bug** : à l'arrivée, le chrono retombe à 0:00,0 au lieu d'afficher le temps de la course. | corrigé : il garde le temps du joueur ✓ |
| 14:07 | « Mets le jeu en ligne. » | en ligne sur bolide-kart.vercel.app ✓ |

## Version 2 (20/11, le soir) : réaliste, et on tourne en penchant le téléphone

Bug a joué à la version 1 : « T'avais dit midi ! Et en plus, c'est moche ! ». Séance 2 commencée à 17:39.

| Heure | Prompt / étape | Résultat |
|---|---|---|
| 17:41 | « Fais tourner le kart quand on penche le téléphone, comme un volant. Sur iPhone, un bouton demande l'autorisation ; si c'est refusé, les flèches restent. Teste le calcul de l'inclinaison. » | 18 tests passent ✓ (volant.js : zone morte, maximum, téléphone en paysage) ; pencher à gauche tourne à gauche, comme la flèche ✓ |
| 17:41 | **Bug** : dans Chrome, le volant ne réagit pas : l'autorisation répond « prompt » au lieu de « granted ». | corrigé : seul un vrai refus coupe le volant ✓ |
