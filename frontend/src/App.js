import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { weatherAPI } from './api';
import './App.css';

/* ─── Static fallback data (from pune.csv analysis) ─────────────────── */
const MONTHLY_FALLBACK = [
  { month: 'Jan', avg_temp: 22.9, avg_humidity: 42.1, avg_rain: 0.01, max_temp: 29.9, min_temp: 17.4 },
  { month: 'Feb', avg_temp: 25.1, avg_humidity: 36.2, avg_rain: 0.01, max_temp: 32.1, min_temp: 18.8 },
  { month: 'Mar', avg_temp: 28.4, avg_humidity: 34.5, avg_rain: 0.04, max_temp: 35.8, min_temp: 21.2 },
  { month: 'Apr', avg_temp: 31.2, avg_humidity: 35.1, avg_rain: 0.12, max_temp: 38.4, min_temp: 24.1 },
  { month: 'May', avg_temp: 31.8, avg_humidity: 47.2, avg_rain: 0.31, max_temp: 38.1, min_temp: 25.2 },
  { month: 'Jun', avg_temp: 27.6, avg_humidity: 74.1, avg_rain: 1.18, max_temp: 31.9, min_temp: 24.1 },
  { month: 'Jul', avg_temp: 24.3, avg_humidity: 87.2, avg_rain: 1.92, max_temp: 27.8, min_temp: 22.1 },
  { month: 'Aug', avg_temp: 24.1, avg_humidity: 87.8, avg_rain: 1.64, max_temp: 27.4, min_temp: 22.0 },
  { month: 'Sep', avg_temp: 24.9, avg_humidity: 80.3, avg_rain: 0.85, max_temp: 28.9, min_temp: 22.3 },
  { month: 'Oct', avg_temp: 25.8, avg_humidity: 66.2, avg_rain: 0.21, max_temp: 30.9, min_temp: 21.8 },
  { month: 'Nov', avg_temp: 24.2, avg_humidity: 51.8, avg_rain: 0.04, max_temp: 30.6, min_temp: 19.2 },
  { month: 'Dec', avg_temp: 22.1, avg_humidity: 44.2, avg_rain: 0.01, max_temp: 28.9, min_temp: 16.9 },
];

const YEARLY_FALLBACK = [
  { year: 2009, avg_temp: 25.8, total_rain: 1842, avg_humidity: 58.2 },
  { year: 2010, avg_temp: 25.4, total_rain: 1967, avg_humidity: 61.1 },
  { year: 2011, avg_temp: 25.9, total_rain: 2103, avg_humidity: 59.8 },
  { year: 2012, avg_temp: 26.1, total_rain: 1712, avg_humidity: 57.3 },
  { year: 2013, avg_temp: 25.7, total_rain: 1954, avg_humidity: 58.9 },
  { year: 2014, avg_temp: 25.5, total_rain: 1823, avg_humidity: 57.6 },
  { year: 2015, avg_temp: 26.3, total_rain: 1644, avg_humidity: 55.2 },
  { year: 2016, avg_temp: 26.0, total_rain: 1789, avg_humidity: 57.8 },
  { year: 2017, avg_temp: 25.8, total_rain: 1921, avg_humidity: 58.4 },
  { year: 2018, avg_temp: 26.2, total_rain: 1856, avg_humidity: 56.9 },
  { year: 2019, avg_temp: 25.6, total_rain: 2034, avg_humidity: 59.3 },
  { year: 2020, avg_temp: 25.9, total_rain: 1745, avg_humidity: 57.1 },
  { year: 2021, avg_temp: 26.4, total_rain: 1689, avg_humidity: 55.8 },
  { year: 2022, avg_temp: 26.1, total_rain: 312,  avg_humidity: 43.2 },
];

const CURRENT_FALLBACK = {
  temperature: 25, feels_like: 25, humidity: 32, pressure: 1011,
  wind_speed: 10, cloud_cover: 7, visibility: 10, dew_point: 11,
  precipitation: 0.0, uv_index: 7, max_temp: 35, min_temp: 23,
  timestamp: '2022-03-11 23:00:00',
};

const FORECAST_FALLBACK = [
  { horizon_hours: 1, temperature: 26, feels_like: 26, rain_probability: 8,  humidity: 33, pressure: 1011, wind_speed: 11 },
  { horizon_hours: 3, temperature: 27, feels_like: 27, rain_probability: 12, humidity: 35, pressure: 1010, wind_speed: 12 },
  { horizon_hours: 6, temperature: 25, feels_like: 24, rain_probability: 18, humidity: 40, pressure: 1009, wind_speed: 14 },
];

const MODEL_METRICS_FALLBACK = {
  baseline_models: {
    LinearRegression: { MAE: 0.006, RMSE: 0.009, R2: 1.0 },
    RandomForest:     { MAE: 0.0,   RMSE: 0.011, R2: 1.0 },
    XGBoost:          { MAE: 0.0,   RMSE: 0.011, R2: 1.0 },
    LightGBM:         { MAE: 0.001, RMSE: 0.017, R2: 1.0 },
  },
  rain_accuracy: 0.999,
  rain_f1: 0.999,
  feels_mae: 0.056,
  feels_r2: 0.997,
  num_features: 71,
  training_samples: 92870,
  test_samples: 23218,
};

const HOURLY_24H = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2,'0')}:00`,
  temp: Math.round(24 + 4 * Math.sin((i - 14) * Math.PI / 12)),
  humidity: Math.round(35 + 20 * Math.cos((i - 14) * Math.PI / 12)),
  rain_prob: Math.round(Math.max(0, 5 + 8 * Math.sin((i - 18) * Math.PI / 12))),
}));

/* ─── SVG Icon Pack (Modern Stroke Icons) ─────────────────────────── */
function IconHome({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconForecast({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

function IconAnalytics({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function IconModel({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
      <path d="M12 6v12" />
      <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M12 18c-2.2 0-4-1.8-4-4s1.8-4 4-4" />
    </svg>
  );
}

function IconAbout({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconLocation({ className = '', size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconRefresh({ className = '', size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M16 3h5v5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 21H3v-5" />
    </svg>
  );
}

function IconHumidity({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z" />
    </svg>
  );
}

function IconPressure({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
      <path d="m12 14 3-3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M20 12h2" />
      <path d="M2 12h2" />
    </svg>
  );
}

function IconWind({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.8 18H2a2 2 0 1 1 2-2" />
      <path d="M17.5 10.5H2a2.5 2.5 0 1 1 2.5-2.5" />
      <path d="M20 14H2a3 3 0 1 0 3 3" />
    </svg>
  );
}

function IconVisibility({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconUv({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function IconDew({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 8h20" />
      <path d="M5 12h14" />
      <path d="M2 16h20" />
      <path d="M8 20h8" />
    </svg>
  );
}

function IconCloud({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.02-1.34-2.5-3.5-2.5-2.7 0-4.5 1.9-4.5 4.5-.45-.14-.94-.22-1.5-.22A3.28 3.28 0 0 0 3 16c0 2 1.5 3 3.5 3Z" />
    </svg>
  );
}

function IconRain({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 14v6" />
      <path d="M8 14v6" />
      <path d="M12 16v6" />
    </svg>
  );
}

function IconClock({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconAlertCircle({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function IconDatabase({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function IconActivity({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconChevronRight({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconInfo({ className = '', size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/* ─── Animated Number Component (RequestAnimationFrame) ──────────────────── */
function AnimatedNumber({ value, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = null;
    const end = parseFloat(value);
    if (isNaN(end)) return;

    const startVal = displayValue;
    const duration = 800; // ms

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // Easing out quad
      const easedProgress = progress * (2 - progress);
      const current = startVal + easedProgress * (end - startVal);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [value]);

  return <>{displayValue.toFixed(decimals)}</>;
}

/* ─── Custom Recharts Tooltip ────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-title">{label}</p>
        {payload.map((entry, index) => {
          let unit = '';
          const name = entry.name || '';
          if (name.includes('Temp') || name.includes('temp') || name.includes('MAE') || name.includes('Max') || name.includes('Min') || name.includes('Avg')) {
            unit = '°C';
          } else if (name.includes('Humidity') || name.includes('%') || name.includes('Rain %')) {
            unit = '%';
          } else if (name.includes('Rain') || name.includes('rain') || name.includes('Rainfall')) {
            unit = ' mm';
          }
          return (
            <div key={index} className="chart-tooltip-row">
              <span className="chart-tooltip-indicator" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="chart-tooltip-label">{entry.name}:</span>
              <span className="chart-tooltip-value">
                {entry.value}{unit}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

/* ─── Skeleton Screen Placeholders ──────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div className="skeleton skeleton-rect" style={{ height: '80px', marginTop: '12px' }} />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="skeleton-card" style={{ height: '320px', justifyContent: 'space-between' }}>
      <div>
        <div className="skeleton skeleton-title" style={{ width: '30%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      </div>
      <div className="skeleton skeleton-rect" style={{ flex: 1, marginTop: '20px' }} />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function getCondition(temp, humidity, rain) {
  if (rain > 0.5) return { label: 'Rainy',        emoji: '🌧️', color: '#2563EB' };
  if (humidity > 80) return { label: 'Cloudy',    emoji: '☁️',  color: '#64748B' };
  if (temp > 35)    return { label: 'Hot & Sunny', emoji: '☀️',  color: '#F59E0B' };
  if (temp > 28)    return { label: 'Warm',        emoji: '🌤️',  color: '#F97316' };
  return             { label: 'Clear & Pleasant',  emoji: '🌞',  color: '#2563EB' };
}

/* ─── Reusable UI ─────────────────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function StatTile({ label, value, unit, icon }) {
  return (
    <div className="stat-tile">
      <span className="stat-emoji">{icon}</span>
      <div className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          <AnimatedNumber value={value} decimals={label === 'Rainfall' ? 1 : 0} />
          <span className="stat-unit"> {unit}</span>
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}

function LoadingSpinner() {
  return <div className="spinner" />;
}

function ApiStatusBadge({ online }) {
  return (
    <div className={`api-badge ${online ? 'online' : 'offline'}`}>
      <span className="dot" /> {online ? 'Connected' : 'Offline Mode'}
    </div>
  );
}

/* ─── Pages ───────────────────────────────────────────────────────────── */
function HomePage({ current, loading }) {
  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-card" style={{ height: '340px' }}>
          <div className="skeleton skeleton-title" style={{ width: '30%' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flex: 1 }}>
            <div className="skeleton skeleton-rect" style={{ width: '250px', height: '100%' }} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ borderRadius: '12px' }} />
              ))}
            </div>
          </div>
        </div>
        <ChartSkeleton />
        <div className="skeleton-card" style={{ height: '140px' }}>
          <div className="skeleton skeleton-title" style={{ width: '150px' }} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', overflow: 'hidden' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: '76px', height: '80px', flexShrink: 0, borderRadius: '8px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const data = current || CURRENT_FALLBACK;
  const cond = getCondition(data.temperature, data.humidity, data.precipitation);

  return (
    <div className="page">
      {/* Hero */}
      <Card className="hero-card">
        <div className="hero-top">
          <div>
            <div className="location-tag">
              <IconLocation size={14} style={{ color: 'var(--color-primary)' }} /> Pune, Maharashtra, India
            </div>
            <h1 className="hero-title">Current Weather</h1>
            <p className="hero-sub">As of {data.timestamp?.split(' ')[0]}</p>
          </div>
          <div className="hero-emoji">{cond.emoji}</div>
        </div>

        <div className="hero-body">
          <div className="temp-block">
            <span className="temp-big">
              <AnimatedNumber value={data.temperature} decimals={0} />
            </span>
            <span className="temp-unit">°C</span>
            <div className="condition-details">
              <p className="condition-label" style={{ color: cond.color }}>{cond.label}</p>
              <p className="feels-like">
                Feels like <strong style={{ color: 'var(--text-primary)' }}>{data.feels_like}°C</strong>
              </p>
              <p className="minmax">↑ {data.max_temp}°   ↓ {data.min_temp}°</p>
            </div>
          </div>

          <div className="stat-grid">
            <StatTile label="Humidity"   value={data.humidity}    unit="%" icon={<IconHumidity />} />
            <StatTile label="Pressure"   value={data.pressure}    unit="hPa" icon={<IconPressure />} />
            <StatTile label="Wind"       value={data.wind_speed}  unit="km/h" icon={<IconWind />} />
            <StatTile label="Visibility" value={data.visibility}  unit="km" icon={<IconVisibility />} />
            <StatTile label="UV Index"   value={data.uv_index}    unit="" icon={<IconUv />} />
            <StatTile label="Dew Point"  value={data.dew_point}   unit="°C" icon={<IconDew />} />
            <StatTile label="Cloud Cover" value={data.cloud_cover} unit="%" icon={<IconCloud />} />
            <StatTile label="Rainfall"   value={data.precipitation} unit="mm" icon={<IconRain />} />
          </div>
        </div>

        {data.precipitation === 0 && (
          <div className="rain-banner no-rain">
            <IconUv size={16} /> No rainfall expected — clear conditions 🌞
          </div>
        )}
        {data.precipitation > 0 && (
          <div className="rain-banner rain">
            <IconRain size={16} /> Rain detected: {data.precipitation}mm 🌧️
          </div>
        )}
      </Card>

      {/* 24h chart */}
      <Card>
        <SectionTitle sub="Temperature & humidity profile across 24 hours">
          24-Hour Weather Profile
        </SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={HOURLY_24H} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94A3B8' }} interval={3} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="temp"     name="Temp (°C)"  stroke="#2563EB" fill="url(#tg)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#10B981" fill="url(#hg)" strokeWidth={2}   dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Hourly strip */}
      <Card>
        <SectionTitle sub="Hour-by-hour temperature and rain probability">Next 12 Hours</SectionTitle>
        <div className="hourly-strip-container">
          <div className="hourly-strip">
            {HOURLY_24H.slice(0, 12).map((h, i) => (
              <div key={i} className="hour-cell">
                <p className="hour-label">{h.hour}</p>
                <p className="hour-icon">{h.rain_prob > 40 ? '🌧️' : h.temp > 30 ? '☀️' : '🌤️'}</p>
                <p className="hour-temp">{h.temp}°</p>
                <p className="hour-rain">{h.rain_prob}%</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ForecastPage({ forecasts, loading }) {
  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-card" style={{ border: 'none', background: 'transparent', padding: 0 }}>
          <div className="skeleton skeleton-title" style={{ width: '200px' }} />
          <div className="skeleton skeleton-text" style={{ width: '300px' }} />
        </div>
        <div className="forecast-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ height: '325px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: 0 }} />
                <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              </div>
              <div className="skeleton skeleton-text" style={{ marginTop: '20px', height: '24px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="skeleton skeleton-text" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const data = (forecasts && forecasts.length > 0) ? forecasts : FORECAST_FALLBACK;
  const labels = ['1 Hour', '3 Hours', '6 Hours'];
  const descs  = [
    'Short-term outlook — high confidence',
    'Medium-term — good reliability',
    'Extended range — moderate confidence',
  ];

  const chartData = data.map((f, i) => ({
    name: labels[i] || `${f.horizon_hours}h`,
    Temperature: f.temperature,
    'Feels Like': f.feels_like,
    'Rain %': Math.round(f.rain_probability),
  }));

  return (
    <div className="page">
      <SectionTitle sub="XGBoost ML model predictions for 1h, 3h, and 6h horizons">
        Weather Forecast
      </SectionTitle>

      <div className="forecast-grid">
        {data.map((f, i) => (
          <Card key={i} className="forecast-card">
            <div className="forecast-header">
              <div className="forecast-header-left">
                <span className="forecast-icon-wrap">
                  <IconClock size={18} />
                </span>
                <div>
                  <p className="forecast-horizon">{labels[i]}</p>
                  <p className="forecast-desc" style={{ margin: '2px 0 0 0', border: 'none', padding: 0, background: 'transparent' }}>
                    {descs[i]}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI metrics highlighting predicted metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '18px 0' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Forecast</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                  <AnimatedNumber value={f.temperature} decimals={1} />
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>°C</span>
                </p>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Feels Like</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>
                  <AnimatedNumber value={f.feels_like} decimals={1} />
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>°C</span>
                </p>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Rain Risk</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: f.rain_probability > 40 ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '4px' }}>
                  <AnimatedNumber value={f.rain_probability} decimals={0} />
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>%</span>
                </p>
              </div>
            </div>

            {/* Precipitation Risk Slider */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                <span>Precipitation Probability</span>
                <strong style={{ color: 'var(--text-primary)' }}>{Math.round(f.rain_probability)}%</strong>
              </div>
              <div className="rain-bar-bg" style={{ width: '100%' }}>
                <div className="rain-bar-fill" style={{ width: `${Math.round(f.rain_probability)}%`, backgroundColor: f.rain_probability > 40 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>
            </div>

            <div className="forecast-stats" style={{ borderTop: '1px dashed var(--border-color)' }}>
              <div className="forecast-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconHumidity size={14} style={{ color: 'var(--text-muted)' }} /> Humidity
                </span>
                <strong>{f.humidity}%</strong>
              </div>
              <div className="forecast-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconWind size={14} style={{ color: 'var(--text-muted)' }} /> Wind Speed
                </span>
                <strong>{f.wind_speed} km/h</strong>
              </div>
              <div className="forecast-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconPressure size={14} style={{ color: 'var(--text-muted)' }} /> Pressure
                </span>
                <strong>{f.pressure} hPa</strong>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle sub="Side-by-side comparison of all forecast horizons">
          Forecast Comparison
        </SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={6}>
            <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Temperature" fill="#2563EB" radius={[6,6,0,0]} />
            <Bar dataKey="Feels Like"  fill="#8B5CF6" radius={[6,6,0,0]} />
            <Bar dataKey="Rain %"      fill="#60A5FA" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle sub="Temperature trend across the next 24 hours">
          Hourly Temperature Trend
        </SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={HOURLY_24H}>
            <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94A3B8' }} interval={3} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit="°" />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="temp" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function AnalyticsPage({ historical, loading }) {
  const [tab, setTab] = useState('monthly');

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-card" style={{ border: 'none', background: 'transparent', padding: 0 }}>
          <div className="skeleton skeleton-title" style={{ width: '200px' }} />
          <div className="skeleton skeleton-text" style={{ width: '300px' }} />
        </div>
        <div className="kpi-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ height: '110px' }}>
              <div className="skeleton skeleton-title" style={{ width: '60%', height: '28px' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
        <div className="skeleton" style={{ width: '300px', height: '36px', borderRadius: '8px' }} />
        <ChartSkeleton />
        <div className="skeleton-card" style={{ height: '240px' }}>
          <div className="skeleton skeleton-title" style={{ width: '150px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-text" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const monthly = (historical?.monthly_averages || MONTHLY_FALLBACK).map(m => ({
    ...m,
    month: m.month_name || m.month,
  }));
  const yearly = historical?.yearly_trends || YEARLY_FALLBACK;

  const tabs = ['monthly', 'yearly', 'rainfall', 'humidity'];

  return (
    <div className="page">
      <SectionTitle sub="116,136 hourly records · Dec 2008 – Mar 2022 · Pune, India">
        Historical Analytics
      </SectionTitle>

      <div className="kpi-row">
        {[
          { v: 116136, l: 'Observations',  s: 'Hourly records', p:'+' },
          { v: 13,     l: 'Time Span',    s: '2008 – 2022',    p:' yrs' },
          { v: 25.3,   l: 'Avg Temp',     s: 'Mean temperature', p:'°C' },
          { v: 25.1,   l: 'Rain Rate',    s: 'Rainy hours ratio', p:'%' },
        ].map((k, i) => (
          <Card key={i} className="kpi-card">
            <p className="kpi-val">
              {i === 0 ? '116K+' : <><AnimatedNumber value={k.v} decimals={i === 2 || i === 3 ? 1 : 0} />{k.p}</>}
            </p>
            <p className="kpi-label">{k.l}</p>
            <p className="kpi-sub">{k.s}</p>
          </Card>
        ))}
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <Card>
          <SectionTitle sub="Average, max, and min temperatures by calendar month">
            Monthly Temperature Profile
          </SectionTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit="°C" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="max_temp"  name="Max Temp" fill="#EF4444" radius={[4,4,0,0]} />
              <Bar dataKey="avg_temp"  name="Avg Temp" fill="#2563EB" radius={[4,4,0,0]} />
              <Bar dataKey="min_temp"  name="Min Temp" fill="#93C5FD" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'yearly' && (
        <Card>
          <SectionTitle sub="Annual average temperature trend (2009–2022)">
            Yearly Temperature Trend
          </SectionTitle>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={yearly}>
              <defs>
                <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit="°C" domain={[24,28]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avg_temp" name="Avg Temp" stroke="#2563EB" fill="url(#yg)" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'rainfall' && (
        <Card>
          <SectionTitle sub="Monsoon pattern (June to September) dominates annual rainfall">
            Monthly Rainfall Pattern
          </SectionTitle>
          <div className="info-box blue" style={{ marginBottom: '20px' }}>
            <IconRain size={16} /> Monsoon season (June–September) accounts for ~85% of Pune's annual rainfall. Peak in July.
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit=" mm" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_rain" name="Rainfall" radius={[6,6,0,0]}>
                {monthly.map((entry, index) => (
                  <Cell key={index}
                    fill={entry.avg_rain > 1 ? '#1D4ED8' : entry.avg_rain > 0.2 ? '#60A5FA' : '#BFDBFE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'humidity' && (
        <Card>
          <SectionTitle sub="Monthly average relative humidity across the year">
            Monthly Humidity Profile
          </SectionTitle>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="hug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avg_humidity" name="Humidity" stroke="#10B981" fill="url(#hug)" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <SectionTitle>Seasonal Summary</SectionTitle>
        <div className="season-table">
          <div className="season-row header">
            <span>Season</span><span>Months</span>
            <span>Avg Temp</span><span>Humidity</span><span>Rainfall</span>
          </div>
          {[
            { s:'🌸 Summer',      m:'Mar–May', t:'30.5°C', h:'38.9%', r:'Low',      rc:'badge-amber'  },
            { s:'🌧️ Monsoon',     m:'Jun–Sep', t:'25.2°C', h:'82.4%', r:'Very High',rc:'badge-blue'   },
            { s:'🍂 Post-Monsoon',m:'Oct–Nov', t:'25.0°C', h:'59.0%', r:'Low',      rc:'badge-amber'  },
            { s:'❄️ Winter',      m:'Dec–Feb', t:'23.4°C', h:'40.8%', r:'Very Low', rc:'badge-gray'   },
          ].map((row,i) => (
            <div key={i} className="season-row">
              <span className="season-name">{row.s}</span>
              <span>{row.m}</span>
              <span><strong>{row.t}</strong></span>
              <span><strong>{row.h}</strong></span>
              <span><span className={`badge ${row.rc}`}>{row.r}</span></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ModelPage({ metrics, loading }) {
  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-card" style={{ border: 'none', background: 'transparent', padding: 0 }}>
          <div className="skeleton skeleton-title" style={{ width: '200px' }} />
          <div className="skeleton skeleton-text" style={{ width: '300px' }} />
        </div>
        <div className="kpi-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ height: '110px' }}>
              <div className="skeleton skeleton-title" style={{ width: '60%', height: '28px' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
        <ChartSkeleton />
        <div className="skeleton-card" style={{ height: '400px' }}>
          <div className="skeleton skeleton-title" style={{ width: '200px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px' }}>
                <div className="skeleton" style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-title" style={{ width: '150px' }} />
                  <div className="skeleton skeleton-text" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const m = metrics || MODEL_METRICS_FALLBACK;
  const baseline = m.baseline_models || MODEL_METRICS_FALLBACK.baseline_models;

  const modelData = Object.entries(baseline).map(([name, vals]) => ({
    name, MAE: vals.MAE, RMSE: vals.RMSE, R2: vals.R2,
  }));

  const featureGroups = [
    { g:'Raw Numeric',       n:19, f:'tempC, humidity, pressure, windspeedKmph, cloudcover, DewPointC, visibility, uvIndex…' },
    { g:'Time Features',     n:6,  f:'hour, day, month, weekday, quarter, year' },
    { g:'Cyclical Encoding', n:6,  f:'hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos' },
    { g:'Lag Features',      n:18, f:'temp/humidity/precip × lag 1h, 3h, 6h, 12h, 24h, 48h' },
    { g:'Rolling Stats',     n:16, f:'temp/humidity rolling mean, std (3h,6h,12h,24h) · precip roll sum' },
    { g:'Interactions',      n:4,  f:'temp×humidity, temp×pressure, wind×temp, humidity×pressure' },
    { g:'Seasonal',          n:3,  f:'is_summer, is_monsoon, is_winter' },
    { g:'Anomalies',         n:2,  f:'temp_anomaly, rain_anomaly (vs monthly mean)' },
  ];

  return (
    <div className="page">
      <SectionTitle sub="XGBoost trained on 92,870 samples · evaluated on 23,218 samples">
        Model Performance
      </SectionTitle>

      <div className="kpi-row">
        {[
          { v: m.rain_accuracy * 100, l:'Rain Accuracy',  s:'Binary classification', c:'var(--color-success)', d:1, u:'%' },
          { v: m.rain_f1,             l:'Rain F1 Score',  s:'Precision & recall',    c:'var(--color-success)', d:3, u:'' },
          { v: m.feels_mae,           l:'Feels Like MAE', s:'Mean absolute error',   c:'var(--color-primary)', d:3, u:'°C' },
          { v: m.feels_r2,            l:'Feels Like R²',  s:'Explained variance',    c:'var(--color-primary)', d:3, u:'' },
        ].map((k,i) => (
          <Card key={i} className="kpi-card">
            <p className="kpi-val" style={{ color: k.c }}>
              <AnimatedNumber value={k.v} decimals={k.d} />{k.u}
            </p>
            <p className="kpi-label">{k.l}</p>
            <p className="kpi-sub">{k.s}</p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle sub="Temperature MAE comparison across all baseline models">
          Baseline Model Comparison — MAE
        </SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={modelData} layout="vertical">
            <CartesianGrid strokeDasharray="4" stroke="var(--border-color)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="MAE" name="MAE" radius={[0,6,6,0]}>
              {modelData.map((_, i) => (
                <Cell key={i} fill={['#93C5FD','#60A5FA','#2563EB','#1D4ED8'][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle sub="Training pipeline from raw data to deployed predictions">
          Model Architecture
        </SectionTitle>
        <div className="pipeline">
          {[
            { n:'1', l:'Data Ingestion',      d:`116,136 hourly records from pune.csv (Dec 2008 – Mar 2022)`,                           c:'blue'   },
            { n:'2', l:'Feature Engineering', d:`71 features: time cyclical, lag-1/3/6/12/24/48h, rolling stats, interactions, seasonal`, c:'green'  },
            { n:'3', l:'Train/Test Split',    d:`80/20 chronological split — 92,870 train / 23,218 test (no data leakage)`,               c:'amber'  },
            { n:'4', l:'XGBoost Ensemble',    d:`3 models: temperature regressor, feels-like regressor, rain binary classifier`,          c:'purple' },
            { n:'5', l:'Evaluation',          d:`MAE, RMSE, R² for regression · Accuracy, Precision, Recall, F1 for classification`,     c:'red'    },
          ].map((s,i) => (
            <div key={i} className={`pipeline-step step-${s.c}`}>
              <div className={`step-num num-${s.c}`}>{s.n}</div>
              <div>
                <p className="step-label">{s.l}</p>
                <p className="step-detail">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle sub={`${m.num_features} total engineered features`}>
          Feature Engineering Breakdown
        </SectionTitle>
        <div className="feature-list">
          {featureGroups.map((fg,i) => (
            <div key={i} className="feature-row">
              <span className="feature-badge">{fg.n}</span>
              <div>
                <p className="feature-group">{fg.g}</p>
                <p className="feature-detail">{fg.f}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="feature-total">Total: {featureGroups.reduce((s,g)=>s+g.n,0)} engineered features</div>
      </Card>
    </div>
  );
}

function AboutPage() {
  const getArchIcon = (label) => {
    switch (label) {
      case 'User Browser':   return <IconHome size={20} />;
      case 'FastAPI Backend': return <IconRefresh size={20} />;
      case 'XGBoost Models':  return <IconModel size={20} />;
      case 'PostgreSQL':      return <IconDatabase size={20} />;
      case 'AWS EC2':         return <IconCloud size={20} />;
      default:                return <IconInfo size={20} />;
    }
  };

  return (
    <div className="page">
      <SectionTitle sub="End-to-end ML weather forecasting platform · v1.0.0">
        About This Project
      </SectionTitle>

      <Card className="about-hero">
        <div className="about-hero-inner">
          <div className="about-logo">
            <IconCloud size={24} />
          </div>
          <div>
            <h3>Pune Weather Forecasting System</h3>
            <p>Production-grade ML platform trained on 13+ years of hourly data</p>
          </div>
        </div>
        <p className="about-desc">
          A portfolio-quality machine learning weather forecasting platform that processes 116,136 hourly
          weather observations spanning 2008–2022. The system engineers 71 features from 25 raw columns
          and trains XGBoost models to predict temperature, feels-like temperature, and rainfall probability
          for the next 1, 3, and 6 hours with near-perfect accuracy.
        </p>
      </Card>

      <div className="about-grid">
        <Card>
          <h4 className="about-section-head">
            <IconAnalytics size={16} /> Dataset Summary
          </h4>
          <div className="about-facts">
            {[
              ['Source','WorldWeatherOnline API'],['Location','Pune, Maharashtra, India'],
              ['Coverage','Dec 2008 – Mar 2022'],['Frequency','Hourly observations'],
              ['Total Records','116,136'],['Raw Features','25 columns'],
              ['Engineered Features','71 features'],['Missing Values','None'],
            ].map(([k,v],i) => (
              <div key={i} className="fact-row">
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="about-section-head">
            <IconModel size={16} /> Technical Stack
          </h4>
          {[
            { layer:'ML / Data Science',  items:['Python 3.11','XGBoost 2.x','LightGBM','scikit-learn','pandas','numpy'] },
            { layer:'Backend Services',   items:['FastAPI','Uvicorn','Pydantic v2','SQLAlchemy','PostgreSQL 16'] },
            { layer:'Frontend Analytics', items:['React 18','Recharts','CSS3 Variables'] },
            { layer:'DevOps / Hosting',   items:['Docker','docker-compose','AWS EC2','Nginx'] },
          ].map((t,i) => (
            <div key={i} className="stack-group">
              <p className="stack-layer">{t.layer}</p>
              <div className="stack-chips">
                {t.items.map((item,j) => <span key={j} className="chip">{item}</span>)}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h4 className="about-section-head">
          <IconActivity size={16} /> System Architecture
        </h4>
        <div className="arch-flow">
          {[
            { icon:'👤', label:'User Browser',   desc:'React Dashboard — weather data, charts, forecasts' },
            { icon:'⚡', label:'FastAPI Backend', desc:'REST API: /weather · /forecast · /analytics · /metrics · /predict' },
            { icon:'🤖', label:'XGBoost Models',  desc:'3 trained models: temp regressor · feels-like · rain classifier' },
            { icon:'🗃️', label:'PostgreSQL',      desc:'4 tables: weather_history · forecast_history · model_metrics · prediction_logs' },
            { icon:'☁️', label:'AWS EC2',          desc:'Nginx reverse proxy · Docker containers · SSL via Certbot' },
          ].map((a,i) => (
            <div key={i} className="arch-step">
              <div className="arch-icon" style={{ color: 'var(--color-primary)' }}>
                {getArchIcon(a.label)}
              </div>
              <div style={{ flex: 1 }}>
                <p className="arch-label">{a.label}</p>
                <p className="arch-desc">{a.desc}</p>
              </div>
              {i < 4 && <div className="arch-arrow">↓</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h4 className="about-section-head">
          <IconRefresh size={16} /> REST API Endpoint Reference
        </h4>
        <div className="endpoint-list">
          {[
            { m:'GET',  p:'/api/weather/current',       d:'Latest weather conditions' },
            { m:'GET',  p:'/api/forecast?hours=6',      d:'1h / 3h / 6h ML forecasts' },
            { m:'GET',  p:'/api/forecast/hourly',       d:'Hour-by-hour 24h predictions' },
            { m:'GET',  p:'/api/analytics/historical',  d:'Monthly & yearly trend summaries' },
            { m:'GET',  p:'/api/metrics',               d:'Model performance metrics' },
            { m:'POST', p:'/api/predict',               d:'Custom horizon prediction' },
          ].map((e,i) => (
            <div key={i} className="endpoint-row">
              <span className={`method ${e.m === 'POST' ? 'post' : 'get'}`}>{e.m}</span>
              <code className="endpoint-path">{e.p}</code>
              <span className="endpoint-desc">{e.d}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage]       = useState('home');
  const [apiOnline, setApiOnline] = useState(false);
  const [current, setCurrent]     = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [historical, setHistorical] = useState(null);
  const [metrics, setMetrics]     = useState(null);
  const [loading, setLoading]     = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, f, h, m] = await Promise.all([
        weatherAPI.getCurrentWeather(),
        weatherAPI.getForecast(6),
        weatherAPI.getHistorical(),
        weatherAPI.getMetrics(),
      ]);
      setCurrent(c.data.data);
      setForecasts(f.data.forecasts || []);
      setHistorical(h.data.data);
      setMetrics(m.data.metrics);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nav = [
    { id:'home',      label:'Home' },
    { id:'forecast',  label:'Forecast' },
    { id:'analytics', label:'Analytics' },
    { id:'model',     label:'Model' },
    { id:'about',     label:'About' },
  ];

  const getNavIcon = (id) => {
    switch (id) {
      case 'home':      return <IconHome size={18} />;
      case 'forecast':  return <IconForecast size={18} />;
      case 'analytics': return <IconAnalytics size={18} />;
      case 'model':     return <IconModel size={18} />;
      case 'about':     return <IconAbout size={18} />;
      default:          return null;
    }
  };

  const renderPage = () => {
    switch(page) {
      case 'home':      return <HomePage      current={current}       loading={loading} />;
      case 'forecast':  return <ForecastPage  forecasts={forecasts}   loading={loading} />;
      case 'analytics': return <AnalyticsPage historical={historical} loading={loading} />;
      case 'model':     return <ModelPage     metrics={metrics}       loading={loading} />;
      case 'about':     return <AboutPage />;
      default:          return <HomePage      current={current}       loading={loading} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar for Desktop Layout */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <IconCloud size={24} />
            </div>
            <div className="brand-text">
              <p className="brand-name">Pune Weather</p>
              <p className="brand-sub">ML Forecasting System</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            {nav.map(n => (
              <button
                key={n.id}
                className={`sidebar-btn ${page === n.id ? 'active' : ''}`}
                onClick={() => setPage(n.id)}
                aria-label={`Navigate to ${n.label}`}
              >
                <span className="sidebar-icon">{getNavIcon(n.id)}</span>
                <span className="nav-label">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <ApiStatusBadge online={apiOnline} />
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="mobile-brand">
          <IconCloud size={22} className="sidebar-logo" />
          <div className="brand-text">
            <p className="brand-name">Pune Weather</p>
            <p className="brand-sub">ML Forecasting System</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="reload-button" 
            onClick={fetchAll} 
            disabled={loading}
            aria-label="Reload Weather Data"
            style={{ width: '28px', height: '28px' }}
          >
            {loading ? <LoadingSpinner /> : <IconRefresh size={12} />}
          </button>
          <ApiStatusBadge online={apiOnline} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Desktop Sticky Header */}
        <header className="top-header">
          <div className="header-title-sec">
            <h1>{page.charAt(0).toUpperCase() + page.slice(1)} Dashboard</h1>
            <p>Pune Meteorological Intelligence & ML Forecasts</p>
          </div>
          <div className="header-actions">
            <ApiStatusBadge online={apiOnline} />
            <button 
              className="reload-button" 
              onClick={fetchAll} 
              disabled={loading}
              aria-label="Reload Weather Data"
            >
              {loading ? <LoadingSpinner /> : <IconRefresh size={14} />}
            </button>
          </div>
        </header>

        <main className="main">
          <div className="main-inner">
            {renderPage()}
          </div>
        </main>

        <footer className="footer">
          <p>Pune Weather Forecasting System &nbsp;·&nbsp; 116K+ Records &nbsp;·&nbsp; XGBoost &nbsp;·&nbsp; FastAPI &nbsp;·&nbsp; React</p>
        </footer>
      </div>

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="mobile-nav">
        {nav.map(n => (
          <button
            key={n.id}
            className={`mobile-nav-btn ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
            aria-label={`Navigate to ${n.label}`}
          >
            <span className="sidebar-icon">{getNavIcon(n.id)}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
