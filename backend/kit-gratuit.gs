/**
 * LinkSharp · kit gratuit contre une adresse email
 * ------------------------------------------------------------
 * À coller dans Google Apps Script, connecté au compte egarnault@gmail.com.
 * Les mails partent de ce compte.
 *
 * Quand quelqu'un demande le kit sur linksharp.fr/kit.html :
 *   1. vérifie la demande (adresse valide, accord coché, anti-robot) ;
 *   2. limite les envois (1 par adresse toutes les 10 min, 80 par jour) ;
 *   3. envoie un mail court (texte brut, sans pièce jointe) avec le lien
 *      linksharp.fr/mon-kit.html?a=… : la page fabrique les 4 fichiers,
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
const NOTIFIER_A     = "egarnault@gmail.com";  // "" pour désactiver
const SITE           = "https://linksharp.fr";
const BCC_HUBSPOT    = "149816576@bcc.eu1.hubspot.com";  // journalise chaque kit envoyé dans HubSpot ("" pour désactiver)
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
// Mail volontairement simple pour ne pas tomber en spam :
// texte brut, aucune pièce jointe, un seul lien (vers linksharp.fr).
// Le kit lui-même est construit sur la page linksharp.fr/mon-kit.html.
function envoyerKit(email, activite) {
  const lien = SITE + "/mon-kit.html" + (activite ? "?a=" + encodeURIComponent(activite) : "");
  const texte =
    "Bonjour,\n\n" +
    "Merci pour votre demande. Votre kit LinkSharp est prêt ici :\n" +
    lien + "\n\n" +
    "Il permet à votre Claude de vous préparer chaque jour quelques entreprises à contacter, avec un mail court pour chacune. " +
    "L'installation prend 10 minutes, tout est expliqué sur la page.\n\n" +
    "Si vous préférez qu'on l'installe ensemble (20 minutes, gratuit), répondez simplement à ce mail.\n\n" +
    "Bonne journée,\n" +
    "Eliad Garnault\n" +
    "LinkSharp\n";
  const options = { name: NOM_EXPEDITEUR };
  if (BCC_HUBSPOT) options.bcc = BCC_HUBSPOT;
  GmailApp.sendEmail(email, "Votre kit LinkSharp", texte, options);
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
