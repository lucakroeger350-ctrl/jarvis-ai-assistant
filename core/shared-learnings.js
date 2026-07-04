const memory = require('./memory');

// Öffentlicher Projekt-Key - siehe website/supabase-shared-learnings.sql für die
// zugehörige Row-Level-Security (jeder darf einreichen und lesen, niemand ändern/löschen,
// keine personenbezogenen Daten enthalten).
const SUPABASE_URL = 'https://mhlldrhhbuskszmdwedp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGxkcmhoYnVza3N6bWR3ZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTQxNTMsImV4cCI6MjA5ODY3MDE1M30.-jnRCUQD3-7n_eSQJk6p2Gl5mLoBRYUzXI_smkr7pyQ';

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

// Teilt eine neu gelernte Fähigkeit mit der Community-Datenbank - nur wenn der Nutzer
// das in den Einstellungen ("Wissen & Lernen") aktiv erlaubt hat (opt-in, Standard: aus).
async function shareLearning(trigger, action) {
  const settings = memory.getSettings();
  if (!settings.shareLearningsWithCloud) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/shared_learnings`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ trigger, action }),
    });
  } catch {
    // stille Fehlbehandlung - Cloud-Sync ist nicht kritisch für die lokale Funktion
  }
}

// Holt geteilte Erkenntnisse anderer JARVIS-Installationen und übernimmt neue (noch nicht
// lokal bekannte) Trigger in die eigenen gelernten Skills - läuft nur bei aktiviertem Opt-in.
async function syncSharedLearnings() {
  const settings = memory.getSettings();
  if (!settings.shareLearningsWithCloud) return { added: 0 };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shared_learnings?select=trigger,action&order=created_at.desc&limit=200`, {
      headers: HEADERS,
    });
    if (!res.ok) return { added: 0 };
    const remote = await res.json();

    const local = memory.getLearnedSkills().skills;
    const knownTriggers = new Set(local.map((s) => s.trigger.toLowerCase()));

    let added = 0;
    for (const entry of remote) {
      if (!entry.trigger || knownTriggers.has(entry.trigger.toLowerCase())) continue;
      memory.addLearnedSkill({ trigger: entry.trigger, action: entry.action });
      knownTriggers.add(entry.trigger.toLowerCase());
      added++;
    }
    return { added };
  } catch {
    return { added: 0 };
  }
}

module.exports = { shareLearning, syncSharedLearnings };
