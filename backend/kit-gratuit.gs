/**
 * LinkSharp · kit gratuit contre une adresse email
 * ------------------------------------------------------------
 * À coller dans Google Apps Script, connecté au compte eliad@linksharp.fr.
 * Les mails partent de ce compte.
 *
 * Quand quelqu'un demande le kit sur linksharp.fr/kit.html :
 *   1. vérifie la demande (adresse valide, accord coché, anti-robot) ;
 *   2. limite les envois (1 par adresse toutes les 10 min, 80 par jour) ;
 *   3. envoie le kit : un guide PDF + 4 fichiers à donner à son Claude,
 *      personnalisés avec ce que la personne vend ;
 *   4. note la demande dans le Google Sheet « LinkSharp – Inscrits kit »
 *      (date, email, activité, accord pour les nouvelles, source) ;
 *   5. prévient Eliad à chaque inscrit (NOTIFIER_A).
 *
 * Installation : voir backend/INSTALLATION.md
 */

// ---------- Réglages ----------
const SHEET_ID       = "";   // vide = le Sheet « LinkSharp – Inscrits kit » est créé au 1er envoi
const NOM_EXPEDITEUR = "Eliad · LinkSharp";
const NOTIFIER_A     = "eliad@linksharp.fr";  // "" pour désactiver
const SITE           = "https://linksharp.fr";
const CALENDLY       = "https://calendly.com/egarnault/30min";
const MAX_PAR_JOUR   = 80;

// ---------- Point d'entrée ----------
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (d.website) return rep({ ok: true });                                  // champ caché rempli = robot
    if (typeof d.t === "number" && d.t < 2500) return rep({ ok: false, err: "trop_rapide" });

    const email = String(d.email || "").trim().toLowerCase();
    if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(email) || email.length > 200)
      return rep({ ok: false, err: "email" });
    if (d.consent !== true) return rep({ ok: false, err: "consent" });

    const activite = nettoyer(d.activite, 300);
    const nouvelles = d.nouvelles === true;
    const source = nettoyer(d.source, 100);

    // Limites d'envoi
    const cache = CacheService.getScriptCache();
    const cle = "m:" + Utilities.base64EncodeWebSafe(email).slice(0, 200);
    if (cache.get(cle)) return rep({ ok: false, err: "deja_envoye" });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    const props = PropertiesService.getScriptProperties();
    const jour = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd");
    const n = Number(props.getProperty("n:" + jour) || 0);
    if (n >= MAX_PAR_JOUR) { lock.releaseLock(); return rep({ ok: false, err: "quota" }); }
    props.setProperty("n:" + jour, String(n + 1));
    lock.releaseLock();

    envoyerKit(email, activite);
    cache.put(cle, "1", 600);
    noter(email, activite, nouvelles, source);

    if (NOTIFIER_A) {
      GmailApp.sendEmail(NOTIFIER_A, "Kit gratuit : " + email,
        "Nouvelle demande de kit.\n\nEmail : " + email +
        "\nActivité : " + (activite || "(non précisée)") +
        "\nAccepte les nouvelles : " + (nouvelles ? "oui" : "non") +
        "\nSource : " + (source || "site") +
        "\n\nIdée : lui proposer de l'installer ensemble (20 min).",
        { name: NOM_EXPEDITEUR });
    }
    return rep({ ok: true });
  } catch (err) {
    console.error(err);
    return rep({ ok: false, err: "serveur" });
  }
}

function doGet() { return rep({ ok: true, service: "LinkSharp kit" }); }

// ---------- Envoi ----------
function envoyerKit(email, activite) {
  const fichiers = kitFichiers(activite);
  const pj = fichiers.map(f => Utilities.newBlob(f.texte, "text/markdown", f.nom));
  pj.unshift(Utilities.newBlob(guideHtml(fichiers), "text/html", "guide.html")
    .getAs("application/pdf").setName("Kit LinkSharp – mode d'emploi.pdf"));

  const texte =
    "Bonjour,\n\n" +
    "Voici votre kit LinkSharp. Il permet à votre Claude de vous préparer chaque jour quelques entreprises à contacter, avec un mail court pour chacune.\n\n" +
    "Pour l'installer (10 minutes) :\n" +
    "1. Ouvrez claude.ai et créez un projet « Mes clients ».\n" +
    "2. Copiez le contenu de « 1-Instructions.md » dans les instructions du projet.\n" +
    "3. Ajoutez les trois autres fichiers dans les fichiers du projet.\n" +
    "4. Écrivez « On commence » dans une conversation du projet.\n\n" +
    "Tout est expliqué dans le PDF joint.\n\n" +
    "Le plus simple reste qu'on l'installe ensemble, en 20 minutes, gratuitement : " + CALENDLY + "\n\n" +
    "Une question ? Répondez simplement à ce mail.\n\n" +
    "Eliad Garnault\nLinkSharp · " + SITE + "\n";

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0E1116;max-width:560px">' +
    "<p>Bonjour,</p>" +
    "<p>Voici votre kit LinkSharp. Il permet à votre Claude de vous préparer chaque jour quelques entreprises à contacter, avec un mail court pour chacune.</p>" +
    "<p><b>Pour l'installer (10 minutes)</b></p>" +
    "<ol style=\"padding-left:20px\">" +
    "<li>Ouvrez <a href=\"https://claude.ai\" style=\"color:#5B76FF\">claude.ai</a> et créez un projet « Mes clients ».</li>" +
    "<li>Copiez le contenu de « 1-Instructions.md » dans les instructions du projet.</li>" +
    "<li>Ajoutez les trois autres fichiers dans les fichiers du projet.</li>" +
    "<li>Écrivez « On commence » dans une conversation du projet.</li></ol>" +
    "<p>Tout est expliqué dans le PDF joint.</p>" +
    "<p>Le plus simple reste qu'on l'installe ensemble, en 20 minutes, gratuitement : " +
    '<a href="' + CALENDLY + '" style="color:#5B76FF">réserver un créneau</a>.</p>' +
    "<p>Une question ? Répondez simplement à ce mail.</p>" +
    '<p style="color:#6B7280">Eliad Garnault<br>LinkSharp · <a href="' + SITE + '" style="color:#6B7280">linksharp.fr</a></p></div>';

  GmailApp.sendEmail(email, "Votre kit LinkSharp", texte,
    { name: NOM_EXPEDITEUR, htmlBody: html, attachments: pj });
}

// ---------- Contenu du kit ----------
function kitFichiers(activite) {
  const quoi = activite || "[décrivez ici ce que vous vendez, à qui, et ce qui vous différencie]";
  return [
    { nom: "1-Instructions.md", texte:
`# Instructions du projet « Mes clients »

Tu es mon assistant pour trouver des clients. Tu travailles pour moi, en français (ou en anglais si l'entreprise est à l'étranger).

## Ce que je vends
${quoi}

## Ton travail, chaque jour
1. Trouver 5 entreprises qui ont une bonne raison d'avoir besoin de moi en ce moment.
   Une bonne raison, c'est un fait public, vérifiable et daté : elle ouvre un site, recrute, change de dirigeant, lance un produit, déménage, grandit.
2. Pour chacune : trouver la personne qui décide, et la source du fait (lien + date).
3. Écrire un mail court pour chacune, en suivant « 2-La-methode.md ».
4. Me présenter le tout dans un tableau : entreprise, personne, le fait et sa source, le mail.

## Tes règles
- Pas de bonne raison d'écrire à une entreprise ? Tu ne lui écris pas, tu passes à la suivante.
- Tu n'inventes jamais un fait, un nom ou une adresse. Si tu n'es pas sûr, tu le dis.
- Tu n'envoies rien. Je relis, je valide, j'envoie moi-même.
- Une seule entreprise par personne contactée, un seul mail à la fois.
- Tu tiens à jour la liste dans « 4-Suivi.md » (ou dans mon Google Sheet si je t'en donne un).

## Quand je t'écris « On commence »
Pose-moi d'abord 3 questions courtes : qui sont mes meilleurs clients aujourd'hui, dans quelle zone je travaille, et ce que je ne veux surtout pas. Puis propose les 5 premières entreprises.

---
Kit LinkSharp · linksharp.fr
` },
    { nom: "2-La-methode.md", texte:
`# La méthode : peu de mails, mais les bons

## Le mail
- Court : il tient sur l'écran d'un téléphone.
- Il commence par le fait réel et daté qui concerne l'entreprise. Pas de compliment vague.
- Il suppose, il n'affirme pas : « J'imagine que… », « Est-ce un sujet chez vous ? »
- Une seule question à la fin, à laquelle on peut répondre en un mot.
- Pas de lien, pas de pièce jointe dans le premier mail.
- Vouvoiement, pas de jargon, pas d'emoji.
- Une dernière phrase pour laisser partir : « Si ce n'est pas le sujet, dites-le-moi et je ne vous écrirai plus. »

## L'objet
3 à 6 mots, qui parlent de leur actualité, pas de vous.

## Les rappels
- Pas de réponse après 3 jours ouvrés : un rappel très court, dans le même fil, avec un élément nouveau.
- Toujours rien 4 jours après : un dernier mot poli, puis on s'arrête.
- Une réponse, même négative : on ne relance plus, on répond.

## Exemple (fictif)
Objet : Votre nouvelle boutique à Lyon

Bonjour Claire,

J'ai vu que vous ouvriez une deuxième boutique à Lyon le mois prochain. J'imagine que le recrutement de l'équipe sur place est un sujet en ce moment.

Nous aidons des commerces comme le vôtre à former une équipe en deux semaines. Est-ce que ce serait utile d'en parler 15 minutes ?

Si ce n'est pas le sujet, dites-le-moi et je ne vous écrirai plus.

Thomas
` },
    { nom: "3-Messages-a-copier.md", texte:
`# Les phrases à copier dans Claude

## Le matin
« Fais-moi le point : qui a répondu, qui je dois relancer aujourd'hui, et les 5 entreprises du jour. »

## Pour la liste du jour
« Trouve-moi 5 entreprises avec une bonne raison de m'écouter en ce moment. Donne la source et la date de chaque fait. »

## Pour écrire
« Écris le mail pour [entreprise], en suivant la méthode. »

## Pour répondre
« [Collez la réponse reçue] Aide-moi à répondre, court et simple. »

## Pour faire le bilan
« Fais le bilan de la semaine : combien de mails, combien de réponses, ce qui a marché, ce qu'on change. »
` },
    { nom: "4-Suivi.md", texte:
`# Suivi

| Date | Entreprise | Personne | Le fait (source, date) | Mail envoyé | Rappel 1 | Rappel 2 | Réponse | Suite |
|------|------------|----------|------------------------|-------------|----------|----------|---------|-------|
` }
  ];
}

function guideHtml(fichiers) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocs = fichiers.slice(0, 3).map(f =>
    '<h2>' + esc(f.nom) + '</h2><pre>' + esc(f.texte) + '</pre>').join("");
  return '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#0E1116;font-size:12pt;line-height:1.55;margin:40px}' +
    'h1{font-size:26pt;margin:0 0 6px}h1 em{font-style:normal;color:#5B76FF}' +
    'h2{font-size:14pt;margin:32px 0 8px;border-top:1px solid #ECEDF0;padding-top:20px}' +
    'p,li{margin:0 0 8px}.m{color:#6B7280}pre{white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:11pt}' +
    '</style></head><body>' +
    '<h1>Les bons clients, au bon <em>moment</em>.</h1>' +
    '<p class="m">Kit LinkSharp · mode d\'emploi</p>' +
    '<h2>Installer le kit (10 minutes)</h2><ol>' +
    '<li>Ouvrez claude.ai (abonnement Pro conseillé, environ 22 €/mois) et créez un projet « Mes clients ».</li>' +
    '<li>Copiez le contenu de « 1-Instructions.md » dans les instructions du projet.</li>' +
    '<li>Ajoutez « 2-La-methode.md », « 3-Messages-a-copier.md » et « 4-Suivi.md » dans les fichiers du projet.</li>' +
    '<li>Ouvrez une conversation dans le projet et écrivez « On commence ».</li></ol>' +
    '<p>Ensuite, chaque matin : « Fais-moi le point ». Vous relisez, vous validez, vous envoyez vous-même.</p>' +
    '<p class="m">Le plus simple reste qu\'on l\'installe ensemble, en 20 minutes, gratuitement : ' + CALENDLY + '</p>' +
    blocs +
    '<p class="m" style="margin-top:40px">Eliad Garnault · LinkSharp · linksharp.fr · eliad@linksharp.fr</p>' +
    '</body></html>';
}

// ---------- Google Sheet ----------
function noter(email, activite, nouvelles, source) {
  const ss = classeur();
  const sh = ss.getSheetByName("Inscrits") || ss.insertSheet("Inscrits");
  if (sh.getLastRow() === 0)
    sh.appendRow(["Date", "Email", "Activité", "Accepte les nouvelles", "Source", "Suite"]);
  sh.appendRow([new Date(), email, activite, nouvelles ? "oui" : "non", source || "site", ""]);
}

function classeur() {
  const props = PropertiesService.getScriptProperties();
  const id = SHEET_ID || props.getProperty("sheetId");
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create("LinkSharp – Inscrits kit");
  props.setProperty("sheetId", ss.getId());
  return ss;
}

// ---------- Outils ----------
function nettoyer(v, max) {
  return String(v || "").replace(/[\u0000-\u001F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function rep(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// À lancer une fois à la main pour accepter les autorisations, puis pour tester.
function autoriser() {
  envoyerKit(Session.getActiveUser().getEmail(), "Test : formations en cuisine pour restaurateurs");
  noter(Session.getActiveUser().getEmail(), "test", false, "test");
}
