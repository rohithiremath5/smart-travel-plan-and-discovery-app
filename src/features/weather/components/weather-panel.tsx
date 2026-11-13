import { useEffect, useRef, useState } from 'react';
import { CloudSun, CloudRain, Wind, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/features/trips/domain/trip';
import {
  weatherAvailability,
  temperature,
  weatherDescription,
  type WeatherRecord,
} from '../domain/weather';
import { weatherClient, weatherCacheMs } from '../services/weather-client';
export function WeatherPanel({ trip }: { trip: Trip }) {
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const [record, setRecord] = useState<WeatherRecord | undefined>(() => weatherClient.peek(trip));
  const [unit, setUnit] = useState<'C' | 'F'>(() => {
    try {
      return localStorage.getItem('smart-travel-temperature') === 'F' ? 'F' : 'C';
    } catch {
      return 'C';
    }
  });
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!record) return;
    const delay = Math.max(0, weatherCacheMs - (Date.now() - Date.parse(record.fetchedAt)));
    const timer = setTimeout(() => setCheckedAt(Date.now()), delay + 10);
    return () => clearTimeout(timer);
  }, [record]);
  const unavailable = weatherAvailability(trip);
  const days =
    record?.forecast.daily.time
      .map((date, i) => ({ date, i }))
      .filter((x) => x.date >= trip.startDate && x.date <= trip.endDate) ?? [];
  async function load(refresh: boolean) {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    try {
      setRecord(await weatherClient.load(trip, controller.signal, refresh));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="budget-section weather-panel" aria-labelledby="weather-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A LITTLE LOOK AHEAD</p>
          <h2 id="weather-title">Weather for your journey</h2>
        </div>
        <CloudSun aria-hidden="true" />
      </div>
      <p>
        Forecasts for your destination, only when you ask. No current-location access. Forecast
        availability follows the provider’s local calendar, up to 16 days.
      </p>
      {unavailable ? (
        <p className="budget-info" role="status">
          {unavailable}
        </p>
      ) : (
        <>
          <label className="organizer-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              This is personal, non-commercial use. Load weather by sharing only this destination’s
              coordinates with Open-Meteo.
            </span>
          </label>
          <div className="trip-actions">
            <Button disabled={!consent || busy} onClick={() => void load(false)}>
              {record ? 'Use cached forecast' : 'Load weather'}
            </Button>
            {record && (
              <Button
                variant="secondary"
                disabled={!consent || busy}
                onClick={() => void load(true)}
              >
                Refresh forecast
              </Button>
            )}
            {busy && (
              <Button variant="ghost" onClick={() => abort.current?.abort()}>
                Cancel weather request
              </Button>
            )}
          </div>
        </>
      )}
      {busy && <p role="status">Loading forecast…</p>}
      {error && (
        <p className="field-error" role="alert">
          {error} {record ? 'The last successful forecast remains below.' : ''}
        </p>
      )}
      {record && !unavailable && (
        <>
          <div className="weather-meta">
            <label>
              Temperature unit{' '}
              <select
                className="select"
                value={unit}
                onChange={(e) => {
                  const next = e.target.value as 'C' | 'F';
                  setUnit(next);
                  try {
                    localStorage.setItem('smart-travel-temperature', next);
                  } catch {
                    /* Display preference only. */
                  }
                }}
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </label>
            <p>
              Retrieved{' '}
              {new Date(record.fetchedAt).toLocaleString('en-GB', {
                timeZone: record.forecast.timezone,
              })}{' '}
              · {record.forecast.timezone}
              <br />
              {checkedAt - Date.parse(record.fetchedAt) >= weatherCacheMs
                ? 'Stale cached forecast — refresh explicitly when online.'
                : 'Cached forecast (up to one hour).'}{' '}
              Provider issue time is not supplied.
            </p>
          </div>
          {!days.length ? (
            <p className="budget-info">
              Weather forecast is not available for these travel dates yet. Past dates are not
              historical observations.
            </p>
          ) : (
            <>
              <p className="field-hint">
                Forecast dates are local to {record.forecast.timezone}.{' '}
                {days.length <
                (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000 + 1
                  ? 'Only part of this trip is within the available forecast.'
                  : ''}
              </p>
              <div className="weather-grid">
                {days.map(({ date, i }) => (
                  <article className="weather-day" key={date}>
                    <p>
                      {new Intl.DateTimeFormat('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(date + 'T12:00:00Z'))}
                    </p>
                    <CloudSun aria-hidden="true" />
                    <h3>{weatherDescription(record.forecast.daily.weather_code[i]!)}</h3>
                    <p>
                      <Thermometer aria-hidden="true" />
                      {temperature(record.forecast.daily.temperature_2m_min[i]!, unit)} –{' '}
                      {temperature(record.forecast.daily.temperature_2m_max[i]!, unit)}
                    </p>
                    <p>
                      <CloudRain aria-hidden="true" />
                      {record.forecast.daily.precipitation_probability_max[i] ?? '—'}% ·{' '}
                      {record.forecast.daily.precipitation_sum[i] ?? '—'} mm
                    </p>
                    <p>
                      <Wind aria-hidden="true" />
                      {record.forecast.daily.wind_speed_10m_max[i] ?? '—'} km/h
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <p className="field-hint">
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Weather data by Open-Meteo
        </a>{' '}
        ·{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Values summarized; optional Fahrenheit conversion.{' '}
        <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">
          Free service: non-commercial use only.
        </a>{' '}
        No forecast is a travel guarantee.
      </p>
    </section>
  );
}
