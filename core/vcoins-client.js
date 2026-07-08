// Dünner Client für den V-Coins-Verbrauch (website/app/api/consume-vcoins) - eigene,
// von den KI-Credits komplett unabhängige Währung, mit echtem Fehl-Feedback
// (V-Coins-Aktionen dürfen NICHT stillschweigend durchlaufen, wenn nicht genug vorhanden ist).
const auth = require('./auth');
const { WEBSITE_URL } = require('./ai-client');

async function spend(amount) {
  const session = await auth.getFullSession();
  if (!session) throw new Error('Nicht angemeldet.');

  const res = await fetch(`${WEBSITE_URL}/api/consume-vcoins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify({ amount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'V-Coins-Aktion fehlgeschlagen.');
  return data.remaining;
}

module.exports = { spend };
