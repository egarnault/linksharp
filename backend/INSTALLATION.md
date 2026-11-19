# Brancher l'envoi automatique du kit (10 minutes)

À faire une fois que l'adresse @linksharp.fr existe.

1. Connecté au compte @linksharp.fr, ouvrir https://script.google.com, puis **Nouveau projet**. Le nommer « LinkSharp – envoi du kit ».
2. Effacer le contenu de `Code.gs` et coller tout `envoi-kit.gs`.
3. En haut du fichier, vérifier `NOTIFIER_A` (l'adresse qui est prévenue à chaque inscrit). `SHEET_ID` peut rester vide : le Sheet « LinkSharp – Inscrits bêta » se crée tout seul.
4. Choisir la fonction `autoriser`, cliquer sur **Exécuter** et accepter les autorisations (Gmail et Sheets). Une ligne de test apparaît dans le Sheet : vous pouvez la supprimer.
5. **Déployer → Nouveau déploiement → Application Web**
   - Exécuter en tant que : **Moi** (l'adresse @linksharp.fr)
   - Qui a accès : **Tout le monde**
   - Copier l'URL qui finit par `/exec`.
6. Dans `outil.html`, remplacer `const KIT_ENDPOINT = "";` par `const KIT_ENDPOINT = "https://script.google.com/macros/s/…/exec";`
7. Pousser sur GitHub, puis tester avec votre propre adresse sur https://linksharp.fr/outil.html#outil.

Tant que `KIT_ENDPOINT` est vide, le site fonctionne quand même : le kit s'affiche à l'écran, mais il n'est pas envoyé et l'email n'est pas enregistré.

Après une modification du script, faites **Déployer → Gérer les déploiements → Modifier → Nouvelle version**. L'URL ne change pas.

Limites prévues dans le script : 1 kit par adresse toutes les 10 minutes, 80 kits par jour au total, vérification que le contenu sort bien du générateur LinkSharp, et un champ caché contre les robots.
