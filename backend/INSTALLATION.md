# Brancher l'envoi automatique du kit gratuit (5 minutes)

Le formulaire de https://linksharp.fr/kit.html envoie l'adresse à un petit script Google.
Le script envoie un mail court (texte brut, sans pièce jointe) avec un lien vers https://linksharp.fr/mon-kit.html, qui fabrique les 4 fichiers du kit, et note l'inscrit dans un Google Sheet.

Pourquoi pas de pièce jointe : un premier mail automatique avec des fichiers (.md, PDF) part en spam chez beaucoup d'entreprises.

1. Connecté à **eliad@linksharp.fr**, ouvrir https://script.google.com → **Nouveau projet**. Le nommer « LinkSharp – kit gratuit ».
2. Effacer le contenu de `Code.gs` et coller tout `kit-gratuit.gs`.
3. Choisir la fonction `autoriser` en haut, cliquer sur **Exécuter**, accepter les autorisations (Gmail, Sheets, Drive).
   Vous recevez un kit de test sur eliad@linksharp.fr, et le Sheet « LinkSharp – Inscrits kit » apparaît dans le Drive.
4. **Déployer → Nouveau déploiement → Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - Copier l'URL qui finit par `/exec`.
5. Dans `kit.html`, remplacer `const KIT_ENDPOINT = "";` par `const KIT_ENDPOINT = "https://script.google.com/macros/s/…/exec";`, puis pousser sur GitHub.
6. Tester avec une autre adresse sur https://linksharp.fr/kit.html.

Tant que `KIT_ENDPOINT` est vide, le formulaire affiche : « écrivez kit à eliad@linksharp.fr ».

Après une modification du script : **Déployer → Gérer les déploiements → Modifier → Nouvelle version** (l'URL ne change pas).

Limites : 1 kit par adresse toutes les 10 minutes, 80 kits par jour, champ caché anti-robot.
Pour suivre la source d'un inscrit, ajoutez `?src=linkedin` (par exemple) au lien du kit.
