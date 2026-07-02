const { playMusic } = require('../core/music-service');

module.exports = {
  name: 'play_music',
  description: 'Spielt einen Song/Künstler über Spotify, YouTube oder Apple Music ab und aktiviert das Oszilloskop-Widget. Nutze dies für "Jarvis, spiele [Song]". WICHTIG: Ohne hinterlegten Spotify/YouTube-API-Zugang öffnet dies die Treffsicherste Such-/Wiedergabeseite - eine exakte automatische Wiedergabe des ersten Ergebnisses kann nicht garantiert werden.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Songtitel und/oder Künstler.' },
      service: { type: 'string', enum: ['spotify', 'youtube', 'apple'], description: 'Bevorzugter Dienst, Standard: spotify.' },
    },
    required: ['query'],
  },
  async run({ query, service }) {
    try {
      const { playedTrack } = await playMusic(query, service || 'spotify');
      if (playedTrack) return { result: `Wiedergabe gestartet: ${playedTrack}, Sir. Das Oszilloskop ist aktiv.` };
      return { result: `Ich öffne "${query}" auf ${service === 'apple' ? 'Apple Music' : service === 'youtube' ? 'YouTube' : 'Spotify'}, Sir. Das Oszilloskop ist aktiv.` };
    } catch (err) {
      return { error: err.message };
    }
  },
};
