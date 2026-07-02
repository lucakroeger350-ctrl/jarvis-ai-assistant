const CITY_TIMEZONES = {
  berlin: { name: 'Berlin', tz: 'Europe/Berlin', lon: 13 },
  'new york': { name: 'New York', tz: 'America/New_York', lon: -74 },
  tokyo: { name: 'Tokio', tz: 'Asia/Tokyo', lon: 139 },
  london: { name: 'London', tz: 'Europe/London', lon: 0 },
};

function getTimeFor(cityKey) {
  const city = CITY_TIMEZONES[cityKey.toLowerCase()];
  if (!city) return null;
  const time = new Intl.DateTimeFormat('de-DE', {
    timeZone: city.tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  return { ...city, time };
}

function getWorldTimes(cityKeys = ['berlin', 'new york', 'tokyo']) {
  return cityKeys.map(getTimeFor).filter(Boolean);
}

module.exports = { getWorldTimes, CITY_TIMEZONES };
