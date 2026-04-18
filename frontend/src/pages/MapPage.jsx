// ─────────────────────────────────────────────────────────────
// src/pages/MapPage.jsx
// World map of problems, grouped by location_tag
// Uses Leaflet + OpenStreetMap (free) + Nominatim geocoding (free)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../config';

// Geocode a location string using Nominatim (free, no key)
const geocodeCache = {};
async function geocode(location) {
  if (geocodeCache[location]) return geocodeCache[location];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[location] = coords;
      return coords;
    }
  } catch {}
  return null;
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 6);
    } else {
      const lats = positions.map(p => p.lat);
      const lngs = positions.map(p => p.lng);
      map.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [40, 40], maxZoom: 8 }
      );
    }
  }, [positions]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    loadMap();
    return () => { cancelRef.current = true; };
  }, []);

  async function loadMap() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/problems`);
      const data = await res.json();
      const problems = data.problems || [];

      const byLocation = {};
      for (const p of problems) {
        const loc = p.location_tag.trim();
        if (!byLocation[loc]) byLocation[loc] = [];
        byLocation[loc].push(p);
      }

      const locations = Object.keys(byLocation);
      setProgress({ done: 0, total: locations.length });
      setGeocoding(true);
      setLoading(false);

      const resolved = [];
      for (let i = 0; i < locations.length; i++) {
        if (cancelRef.current) break;
        const loc = locations[i];
        const coords = await geocode(loc);
        setProgress({ done: i + 1, total: locations.length });
        if (coords) {
          resolved.push({ location: loc, ...coords, problems: byLocation[loc] });
        }
        if (i < locations.length - 1) await new Promise(r => setTimeout(r, 1100));
      }

      setGroups(resolved);
      setGeocoding(false);
    } catch {
      setLoading(false);
      setGeocoding(false);
    }
  }

  const filtered = filter === 'all'
    ? groups
    : groups.map(g => ({ ...g, problems: g.problems.filter(p => p.status === filter) }))
            .filter(g => g.problems.length > 0);

  const positions = filtered.map(g => ({ lat: g.lat, lng: g.lng }));
  const totalProblems = filtered.reduce((sum, g) => sum + g.problems.length, 0);

  function markerColor(problems) {
    if (problems.every(p => p.status === 'resolved')) return '#0369a1';
    if (problems.some(p => p.status === 'in_progress')) return '#d97706';
    return '#16a34a';
  }

  const STATUS_LABEL = {
    open: t('map.open'),
    in_progress: t('map.inProgress'),
    resolved: t('map.resolved'),
  };

  const filters = [
    { key: 'all', label: t('map.all') },
    { key: 'open', label: t('map.open') },
    { key: 'in_progress', label: t('map.inProgress') },
    { key: 'resolved', label: t('map.resolved') },
  ];

  const STATUS_STYLES = {
    open:        { bg: '#f0fdf4', color: '#15803d' },
    in_progress: { bg: '#fefce8', color: '#92400e' },
    resolved:    { bg: '#f0f9ff', color: '#0369a1' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Top bar */}
      <div style={{
        background: 'var(--navbar-bg)', borderBottom: '1px solid rgba(168,85,247,0.15)',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        gap: 12, flexWrap: 'wrap', flexShrink: 0, backdropFilter: 'blur(12px)',
      }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>{t('map.title')}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10 }}>
            {geocoding
              ? t('map.locating', { done: progress.done, total: progress.total })
              : `${totalProblems === 1 ? t('map.problemCount', { count: totalProblems }) : t('map.problemCountPlural', { count: totalProblems })} · ${filtered.length === 1 ? t('map.locationCount', { count: filtered.length }) : t('map.locationCountPlural', { count: filtered.length })}`
            }
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer', boxShadow: 'none', transform: 'none',
                border: `1px solid ${filter === f.key ? 'var(--accent-border)' : 'var(--border)'}`,
                background: filter === f.key ? 'var(--accent-bg)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--text)',
                fontWeight: filter === f.key ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {t('map.loadingProblems')}
        </div>
      )}

      {!loading && (
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={[5, 20]}
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds positions={positions} />

            {filtered.map((group, i) => (
              <CircleMarker
                key={`${group.location}-${i}`}
                center={[group.lat, group.lng]}
                radius={Math.min(6 + group.problems.length * 2, 24)}
                pathOptions={{
                  color: markerColor(group.problems),
                  fillColor: markerColor(group.problems),
                  fillOpacity: 0.75,
                  weight: 2,
                }}
              >
                <Popup maxWidth={280} minWidth={220}>
                  <div style={{ fontFamily: 'inherit' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#111' }}>
                      {group.location}
                      <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>
                        {group.problems.length === 1
                          ? t('map.problemCount', { count: group.problems.length })
                          : t('map.problemCountPlural', { count: group.problems.length })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {group.problems.map(p => {
                        const st = STATUS_STYLES[p.status] || STATUS_STYLES.open;
                        return (
                          <div
                            key={p.id}
                            onClick={() => navigate(`/problems/${p.id}`)}
                            style={{
                              background: '#f9f9f9', borderRadius: 7, padding: '8px 10px',
                              cursor: 'pointer', border: '0.5px solid #eee',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f9f9f9'}
                          >
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#111', marginBottom: 4, lineHeight: 1.3 }}>
                              {p.title}
                            </div>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 20, background: st.bg, color: st.color }}>
                                {STATUS_LABEL[p.status] || p.status}
                              </span>
                              <span style={{
                                fontSize: 10, padding: '1px 6px', borderRadius: 20,
                                background: p.scope === 'national' ? '#eff6ff' : '#f0fdf4',
                                color: p.scope === 'national' ? '#1d4ed8' : '#15803d',
                              }}>
                                {p.scope === 'national' ? t('problems.national') : t('problems.local')}
                              </span>
                              <span style={{ fontSize: 10, color: '#aaa' }}>
                                {p.solution_count} {p.solution_count === 1 ? t('map.solution') : t('map.solutionPlural')}
                              </span>
                            </div>
                            {p.tags && p.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                {p.tags.map(tag => (
                                  <span key={tag} style={{ fontSize: 10, color: '#888' }}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {geocoding && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, zIndex: 1000, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              {t('map.locatingOverlay', { done: progress.done, total: progress.total })}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'var(--navbar-bg)', border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', zIndex: 1000, fontSize: 12,
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-h)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.5px' }}>{t('map.markerColour')}</div>
            {[
              { color: 'var(--emerald)', label: t('map.open') },
              { color: 'var(--honey)',   label: t('map.inProgress') },
              { color: 'var(--accent-2)', label: t('map.resolved') },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text)' }}>{label}</span>
              </div>
            ))}
            <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 11 }}>{t('map.larger')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
