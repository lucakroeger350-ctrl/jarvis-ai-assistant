const { app } = require('electron');
const os = require('os');
const auth = require('./auth');

// Öffentliche Projekt-URL + anon-Key - bewusst unbedenklich, da per Row-Level-Security
// (siehe website/supabase-bug-reports.sql) NUR das Einfügen neuer Reports erlaubt ist,
// niemals das Lesen fremder Einträge.
const SUPABASE_URL = 'https://mhlldrhhbuskszmdwedp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGxkcmhoYnVza3N6bWR3ZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTQxNTMsImV4cCI6MjA5ODY3MDE1M30.-jnRCUQD3-7n_eSQJk6p2Gl5mLoBRYUzXI_smkr7pyQ';

async function submitBugReport(description) {
  const session = auth.getSession();
  const body = {
    description,
    app_version: app.getVersion(),
    os_info: `${os.platform()} ${os.release()}`,
    user_email: session ? session.email : null,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/bug_reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Bug-Report konnte nicht gesendet werden (Status ${res.status}).`);
  return true;
}

module.exports = { submitBugReport };
