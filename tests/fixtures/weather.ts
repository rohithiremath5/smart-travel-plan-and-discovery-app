export function weatherFixture(start = '2030-03-20') {
  const time = Array.from({ length: 16 }, (_, i) =>
    new Date(Date.parse(start + 'T00:00:00Z') + i * 86400000).toISOString().slice(0, 10),
  );
  return {
    latitude: 24.58,
    longitude: 73.71,
    timezone: 'Asia/Kolkata',
    timezone_abbreviation: 'IST',
    utc_offset_seconds: 19800,
    generationtime_ms: 0.3,
    daily_units: {
      time: 'iso8601',
      temperature_2m_min: '°C',
      temperature_2m_max: '°C',
      weather_code: 'wmo code',
      precipitation_probability_max: '%',
      precipitation_sum: 'mm',
      wind_speed_10m_max: 'km/h',
    },
    daily: {
      time,
      temperature_2m_min: time.map(() => 18),
      temperature_2m_max: time.map(() => 29),
      weather_code: time.map((_, i) => (i === 1 ? 61 : 2)),
      precipitation_probability_max: time.map(() => 20),
      precipitation_sum: time.map(() => 1.2),
      wind_speed_10m_max: time.map(() => 14),
    },
  };
}
