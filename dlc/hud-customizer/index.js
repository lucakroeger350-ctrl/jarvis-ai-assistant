// HUD Customizer & Shape-Shifter DLC (25€ einmalig).
// Wird von main.js NUR dynamisch geladen (require), wenn Supabase für den eingeloggten
// Nutzer has_dlc_hud_customizer === true meldet - siehe dlc-manager.js. Ohne das Flag
// wird diese Datei nie angefasst; die Free-Version enthält nur den ausgegrauten Teaser
// in den Einstellungen (src/index.html/Design-Tab) + die Weiterleitungslogik in main.js.
//
// Ordner-Muster für künftige DLCs (z.B. Voice-Packs): dlc/<name>/index.js mit derselben
// init(send)-Signatur, Eintrag in core/dlc-manager.js's DLC_MODULES, Supabase-Spalte
// "has_dlc_<name>" + Eintrag in website/lib/stripe-products.ts.

function init(send) {
  // Schaltet den Bearbeitungsmodus (Drag & Drop, alternatives Strahl-Design) frei.
  send('dlc:hud-customizer-ready', {});
}

module.exports = { init };
