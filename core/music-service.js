const { shell } = require('electron');
const visualizerBridge = require('./visualizer-bridge');
const spotifyAuth = require('./spotify-auth');

// Ohne YouTube-Data-API-Key gibt es keine seriöse "spiel exakt dieses eine Video ab"-Steuerung
// (Scraping wäre fragil und ein ToS-Risiko) - dafür bleibt die direkte Suchergebnis-Seite.
// Für Spotify nutzen wir bei verbundenem Konto die echte Web API (sofortiges Abspielen,
// erfordert Spotify Premium + ein bereits geöffnetes aktives Gerät - Spotify-eigene Vorgabe).
async function playViaSpotifyApi(query) {
  const token = await spotifyAuth.refreshIfNeeded();
  if (!token) return null;

  const searchRes = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();
  const track = searchData.tracks && searchData.tracks.items[0];
  if (!track) throw new Error(`Kein Titel für "${query}" auf Spotify gefunden.`);

  const playRes = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [track.uri] }),
  });
  if (playRes.status === 404) throw new Error('Kein aktives Spotify-Gerät gefunden. Bitte öffne Spotify auf einem Gerät und versuche es erneut.');
  if (!playRes.ok && playRes.status !== 204) throw new Error('Wiedergabe über Spotify fehlgeschlagen (Premium-Konto erforderlich).');

  return track.name + ' - ' + track.artists.map((a) => a.name).join(', ');
}

async function playMusic(query, service) {
  if (!visualizerBridge.isActive()) visualizerBridge.toggle();

  if (service === 'spotify' && spotifyAuth.isConnected()) {
    const playedTrack = await playViaSpotifyApi(query);
    if (playedTrack) return { url: null, playedTrack };
  }

  const encoded = encodeURIComponent(query);
  let url;
  if (service === 'spotify') url = `spotify:search:${encoded}`;
  else if (service === 'apple') url = `https://music.apple.com/search?term=${encoded}`;
  else url = `https://www.youtube.com/results?search_query=${encoded}`;

  await shell.openExternal(url);
  return { url };
}

module.exports = { playMusic };
