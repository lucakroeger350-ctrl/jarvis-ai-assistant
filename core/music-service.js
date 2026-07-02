const { shell } = require('electron');
const visualizerBridge = require('./visualizer-bridge');

// Echte, sofortige "spiele genau diesen Song ab"-Steuerung würde einen OAuth-Zugang zur
// Spotify Web API (eigene Client-ID vom Nutzer) bzw. einen YouTube-Data-API-Key voraussetzen -
// beides liegt uns noch nicht vor. Bis dahin: bestmögliche direkte Such-/Wiedergabe-Links,
// die Spotify/YouTube ohne API-Key sofort zum passenden Titel bringen.
async function playMusic(query, service) {
  const encoded = encodeURIComponent(query);
  let url;

  if (service === 'spotify') {
    url = `spotify:search:${encoded}`;
  } else if (service === 'apple') {
    url = `https://music.apple.com/search?term=${encoded}`;
  } else {
    url = `https://www.youtube.com/results?search_query=${encoded}`;
  }

  await shell.openExternal(url);

  if (!visualizerBridge.isActive()) visualizerBridge.toggle();

  return { url };
}

module.exports = { playMusic };
