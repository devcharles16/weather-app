import { useEffect, useMemo, useState } from "react";
import "./index.css";

// Simple, key‑free weather app using Open‑Meteo (no API key required)
// Features: city search, use my location, °F/°C toggle, current conditions, 5‑day forecast

const WMO = {
  0: { label: "Clear", emoji: "☀️" },
  1: { label: "Mainly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Depositing rime fog", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌧️" },
  56: { label: "Light freezing drizzle", emoji: "🌧️" },
  57: { label: "Freezing drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌧️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  66: { label: "Freezing rain", emoji: "🌧️" },
  67: { label: "Heavy freezing rain", emoji: "🌧️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "🌨️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  77: { label: "Snow grains", emoji: "❄️" },
  80: { label: "Light showers", emoji: "🌦️" },
  81: { label: "Showers", emoji: "🌦️" },
  82: { label: "Heavy showers", emoji: "🌧️" },
  85: { label: "Snow showers", emoji: "🌨️" },
  86: { label: "Heavy snow showers", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm + hail", emoji: "⛈️" },
  99: { label: "Thunderstorm + heavy hail", emoji: "⛈️" },
};

export default function App() {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("fahrenheit"); // "fahrenheit" | "celsius"
  const [place, setPlace] = useState(null); // { name, country, lat, lon }
  const [wx, setWx] = useState(null); // weather payload
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const speedUnit = unit === "fahrenheit" ? "mph" : "kmh";

  const tempSuffix = unit === "fahrenheit" ? "°F" : "°C";

  const title = useMemo(() => {
    if (!place) return "Weather";
    return `${place.name}${place.country ? ", " + place.country : ""}`;
  }, [place]);

  useEffect(() => {
    document.title = `${title} • Breezy`;
    document.body.style.background = "#f8fafc"; // slate-50
    document.body.style.overflowX = "hidden";
  }, [title]);

  async function geocodeCity(name) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name
    )}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (!data?.results?.length) throw new Error("No results for that city");
    const r = data.results[0];
    return { name: r.name, country: r.country_code, lat: r.latitude, lon: r.longitude };
  }

  async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${unit}&wind_speed_unit=${speedUnit}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();
    return data;
  }

  async function searchCity(e) {
    e?.preventDefault();
    setError("");
    if (!query.trim()) return;
    try {
      setLoading(true);
      const p = await geocodeCity(query.trim());
      setPlace(p);
      const w = await fetchWeather(p.lat, p.lon);
      setWx(w);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function useMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const w = await fetchWeather(lat, lon);
          setWx(w);
          setPlace({ name: "My location", country: "", lat, lon });
        } catch (err) {
          setError(err.message || "Failed to fetch weather");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Location permission denied");
      }
    );
  }

  // Refetch when units change and we already have a place
  useEffect(() => {
    if (!place) return;
    (async () => {
      setLoading(true);
      try {
        const w = await fetchWeather(place.lat, place.lon);
        setWx(w);
      } catch (err) {
        setError(err.message || "Failed to refresh weather");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const current = wx?.current;
  const daily = wx?.daily;

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      <Header unit={unit} setUnit={setUnit} onUseMyLocation={useMyLocation} />

      <main className="flex-1">
        {/* Search */}
        <section className="px-4 sm:px-6 py-6 border-b border-slate-200 bg-white/80 backdrop-blur">
          <form onSubmit={searchCity} className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city... (e.g., Orlando)"
              className="h-12 rounded-2xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button type="submit" className="h-12 rounded-2xl px-5 bg-indigo-600 text-white hover:bg-indigo-700">Search</button>
              <button type="button" onClick={useMyLocation} className="h-12 rounded-2xl px-5 border border-slate-300 hover:bg-slate-50">Use my location</button>
            </div>
          </form>
          {error && (
            <p className="mx-auto max-w-3xl mt-3 text-sm text-red-600">{error}</p>
          )}
        </section>

        {/* Current conditions */}
        <section className="px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{title}</h2>
                <UnitPill unit={unit} />
              </div>

              {loading ? (
                <p className="mt-6 text-slate-500">Loading...</p>
              ) : current ? (
                <div className="mt-6 flex items-start gap-5">
                  <div className="text-5xl leading-none">{WMO[current.weather_code]?.emoji || "🌤️"}</div>
                  <div>
                    <div className="text-4xl font-bold">{Math.round(current.temperature_2m)}{tempSuffix}</div>
                    <div className="text-slate-600">{WMO[current.weather_code]?.label || "Current conditions"}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>Feels like: <span className="font-medium">{Math.round(current.apparent_temperature)}{tempSuffix}</span></div>
                      <div>Humidity: <span className="font-medium">{current.relative_humidity_2m}%</span></div>
                      <div>Wind: <span className="font-medium">{Math.round(current.wind_speed_10m)} {speedUnit}</span></div>
                      <div>Updated: <span className="font-medium">{formatTime(current.time)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-slate-500">Search a city or use your location to see the weather.</p>
              )}
            </div>

            {/* Daily forecast */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Next 5 Days</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {daily?.time?.slice(0, 5).map((date, i) => (
                  <div key={date} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-sm text-slate-500">{formatDay(date)}</div>
                    <div className="text-3xl mt-1">{WMO[daily.weather_code[i]]?.emoji || "⛅"}</div>
                    <div className="mt-2 text-sm text-slate-600">{WMO[daily.weather_code[i]]?.label || "—"}</div>
                    <div className="mt-2 font-medium">
                      {Math.round(daily.temperature_2m_max[i])}{tempSuffix}
                      <span className="text-slate-400"> / {Math.round(daily.temperature_2m_min[i])}{tempSuffix}</span>
                    </div>
                  </div>
                )) || (
                  <p className="text-slate-500">No forecast yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header({ unit, setUnit, onUseMyLocation }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600" />
          <span>Breezy</span>
        </a>
        <div className="flex items-center gap-2">
          <button onClick={onUseMyLocation} className="hidden sm:inline-flex h-10 items-center rounded-2xl px-4 border border-slate-300 hover:bg-slate-50">Use my location</button>
          <Toggle unit={unit} setUnit={setUnit} />
        </div>
      </div>
    </header>
  );
}

function Toggle({ unit, setUnit }) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-slate-300 p-1">
      <button
        onClick={() => setUnit("fahrenheit")}
        className={`h-8 w-12 rounded-xl text-sm ${unit === "fahrenheit" ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`}
      >
        °F
      </button>
      <button
        onClick={() => setUnit("celsius")}
        className={`h-8 w-12 rounded-xl text-sm ${unit === "celsius" ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`}
      >
        °C
      </button>
    </div>
  );
}

function UnitPill({ unit }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      Unit: {unit === "fahrenheit" ? "°F" : "°C"}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-sm text-slate-600 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Devone Charles</span>
        <a className="hover:text-indigo-600" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Data: Open‑Meteo</a>
      </div>
    </footer>
  );
}

// Utils
function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDay(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { weekday: "short" });
  } catch {
    return iso;
  }
}
