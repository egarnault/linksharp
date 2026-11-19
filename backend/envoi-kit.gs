/**
 * LinkSharp · envoi automatique du kit bêta
 * ------------------------------------------------------------
 * À coller dans Google Apps Script, connecté au compte Google Workspace
 * de LinkSharp (l'adresse @linksharp.fr). Les mails partent de ce compte.
 *
 * Ce que fait le script quand quelqu'un demande son kit sur le site :
 *   1. vérifie la demande (adresse valide, kit LinkSharp authentique, taille, anti-robot) ;
 *   2. limite les envois (par adresse et par jour) pour qu'on ne puisse pas
 *      s'en servir pour envoyer du spam depuis linksharp.fr ;
 *   3. envoie le kit en pièce jointe (.md), avec un texte fixe, signé LinkSharp ;
 *   4. note la demande dans l'onglet « Inscrits » du Google Sheet
 *      (date, email, entreprise, IA, accord pour les nouvelles). Le contenu du kit
 *      n'est PAS stocké dans le Sheet ;
 *   5. vous prévient par mail à chaque nouvel inscrit (NOTIFIER_A).
 *
 * Installation : voir backend/INSTALLATION.md
 */

// ---------- Réglages ----------
const SHEET_ID     = "";                        // ID du Google Sheet « LinkSharp – Inscrits bêta » (vide = créé automatiquement au 1er envoi)
const NOM_EXPEDITEUR = "Eliad · LinkSharp";
const REPONDRE_A   = "";                        // vide = l'adresse du compte qui exécute le script
const NOTIFIER_A   = "egarnault@gmail.com";     // reçoit un mail à chaque inscrit ("" pour désactiver)
const SITE         = "https://linksharp.fr";
const CALENDLY     = "https://calendly.com/egarnault/30min";
const MAX_PAR_JOUR = 80;                        // plafond global d'envois de kits par jour
const MAX_KIT_OCTETS = 200000;                  // un vrai kit fait ~30 à 90 Ko

// ---------- Point d'entrée ----------
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Anti-robot : champ caché rempli, ou formulaire envoyé en moins de 3 s
    if (d.website) return rep({ ok: true });
    if (typeof d.t === "number" && d.t < 3000) return rep({ ok: false, err: "trop_rapide" });

    const email = String(d.email || "").trim().toLowerCase();
    if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(email) || email.length > 200)
      return rep({ ok: false, err: "email" });
    if (d.consent !== true) return rep({ ok: false, err: "consent" });

    const kit = String(d.kit || "");
    if (kit.length < 2000 || kit.length > MAX_KIT_OCTETS) return rep({ ok: false, err: "kit" });
    // Le kit doit sortir du générateur LinkSharp
    if (kit.indexOf("Généré avec LinkSharp") === -1 || kit.indexOf("LinkSharp") > 2000)
      return rep({ ok: false, err: "kit" });

    // Limites d'envoi
    const cache = CacheService.getScriptCache();
    const cleMail = "m:" + Utilities.base64EncodeWebSafe(email).slice(0, 200);
    if (cache.get(cleMail)) return rep({ ok: false, err: "deja_envoye" });   // 1 kit / adresse / 10 min
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    const props = PropertiesService.getScriptProperties();
    const jour = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd");
    const n = Number(props.getProperty("n:" + jour) || 0);
    if (n >= MAX_PAR_JOUR) { lock.releaseLock(); return rep({ ok: false, err: "quota" }); }
    props.setProperty("n:" + jour, String(n + 1));
    lock.releaseLock();
    cache.put(cleMail, "1", 600);

    const entreprise = propre(d.entreprise, 120) || "votre entreprise";
    const ia = propre(d.ia, 40) || "votre IA";
    const fichier = "kit-linksharp-" + slug(entreprise) + ".md";

    GmailApp.sendEmail(email, "Votre kit de prospection LinkSharp", texteMail(entreprise, ia, false), {
      htmlBody: texteMail(entreprise, ia, true),
      name: NOM_EXPEDITEUR,
      replyTo: REPONDRE_A || undefined,
      attachments: [Utilities.newBlob(kit, "text/markdown", fichier)]
    });

    noter([new Date(), email, entreprise, ia, d.news === true ? "oui" : "non", d.mode || "", d.page || ""]);

    if (NOTIFIER_A) {
      GmailApp.sendEmail(NOTIFIER_A, "Nouveau kit LinkSharp : " + entreprise,
        "Email : " + email + "\nEntreprise : " + entreprise + "\nIA : " + ia +
        "\nNouvelles LinkSharp : " + (d.news === true ? "oui" : "non") + "\n\n(kits envoyés aujourd'hui : " + (n + 1) + ")",
        { name: "LinkSharp (site)" });
    }
    return rep({ ok: true });
  } catch (err) {
    console.error(err);
    return rep({ ok: false, err: "serveur" });
  }
}

// Test rapide dans le navigateur : l'URL du script doit répondre « ok »
function doGet() { return ContentService.createTextOutput("ok"); }

// ---------- Mail envoyé ----------
function texteMail(entreprise, ia, html) {
  const lignes = [
    "Bonjour,",
    "",
    "Voici votre kit de prospection LinkSharp pour " + entreprise + ", en pièce jointe.",
    "",
    "Pour l'installer :",
    "1. Ouvrez " + ia + " (un abonnement Claude Pro suffit).",
    "2. Glissez le fichier dans une nouvelle conversation et écrivez : « Installe ce pack ».",
    "3. L'IA vérifie tout, vous pose ses questions s'il manque une information, puis fait un premier test sans rien envoyer.",
    "",
    "Le kit est en bêta. Relisez chaque lot avant envoi : une IA peut se tromper.",
    "",
    "Une seule chose en échange : répondez à ce mail dans quelques jours pour me dire ce qui a marché et ce qui a coincé. C'est ce qui améliore le kit.",
    "",
    "Vous préférez que je le fasse pour vous ? 20 minutes pour regarder votre cas : " + CALENDLY,
    "",
    "Eliad Garnault",
    "LinkSharp · " + SITE,
    "",
    "Vous recevez ce mail parce que vous avez demandé ce kit sur " + SITE.replace("https://", "") + ". Pour que vos données soient supprimées, répondez simplement « supprimer »."
  ];
  if (!html) return lignes.join("\n");
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0E1116;max-width:560px">' +
    lignes.map(l => l === "" ? "<br>" : "<div>" + esc(l).replace(/(https:\/\/[^\s]+)/g, '<a href="$1">$1</a>') + "</div>").join("") +
    "</div>";
}

// ---------- Outils ----------
function noter(ligne) {
  const props = PropertiesService.getScriptProperties();
  let id = SHEET_ID || props.getProperty("sheetId");
  let ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create("LinkSharp – Inscrits bêta");
    props.setProperty("sheetId", ss.getId());
  }
  let sh = ss.getSheetByName("Inscrits");
  if (!sh) {
    sh = ss.getSheets()[0]; sh.setName("Inscrits");
    sh.appendRow(["Date", "Email", "Entreprise", "IA", "Accepte les nouvelles", "Mode", "Page"]);
    sh.setFrozenRows(1);
  }
  sh.appendRow(ligne);
}
function propre(s, max) { return String(s || "").replace(/[\r\n\t<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function slug(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "kit"; }
function rep(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// À lancer une fois à la main dans l'éditeur pour autoriser Gmail et Sheets
function autoriser() {
  GmailApp.getAliases();
  noter([new Date(), "test@exemple.fr", "Test installation", "Claude", "non", "test", "editeur"]);
}
