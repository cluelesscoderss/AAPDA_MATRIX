
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, MapPin, Battery, WifiOff, Shield, Users, Activity, Radio, ChevronRight, Bell, Settings, Search, Globe, ChevronDown, Terminal, Zap, Mic, Volume2, Play, Square, AlertTriangle, Languages, Trash2, Loader2, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOS, DangerZone } from '@/lib/store';
import { clsx } from 'clsx';
import { Language, translations } from '@/lib/translations';

const SOSMap = dynamic(() => import('./SOSMap'), { ssr: false });

const AVAILABLE_TEAMS = (t: any, center?: { lat: number, lng: number }) => {
  const baseLat = center?.lat || 28.6139;
  const baseLng = center?.lng || 77.2090;

  // Deterministic offsets to simulate "real" positions relative to the incident
  return [
    { id: 't1', name: 'NDRF UNIT-01', type: t.natural_disaster, icon: Globe, lat: baseLat + 0.012, lng: baseLng + 0.008, personnel: 12, vehicle: 'Amphibious Truck', color: '#3b82f6' },
    { id: 't2', name: 'APOLLO ICU RED', type: t.medical_emergency, icon: Activity, lat: baseLat - 0.009, lng: baseLng - 0.004, personnel: 4, vehicle: 'Advanced ACLS Ambulance', color: '#ef4444' },
    { id: 't3', name: 'TRAFFIC PATROL-07', type: t.road_accident, icon: AlertTriangle, lat: baseLat + 0.005, lng: baseLng - 0.015, personnel: 2, vehicle: 'Rapid Response Unit', color: '#f59e0b' },
    { id: 't4', name: 'PINK SQUAD DELTA', type: t.women_safety, icon: Shield, lat: baseLat - 0.015, lng: baseLng + 0.010, personnel: 3, vehicle: 'Elite Response Van', color: '#ec4899' },
    { id: 't5', name: 'AERIAL DRONE-X', type: 'Surveillance', icon: Radio, lat: baseLat + 0.002, lng: baseLng + 0.002, personnel: 0, vehicle: 'Quad-Copter UAV', color: '#10b981' },
  ];
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Dashboard() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];
  const [alerts, setAlerts] = useState<SOS[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOS | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'mesh'>('all');
  const [dispatchingTeam, setDispatchingTeam] = useState<string>('ALPHA-1');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isTeamPortalOpen, setIsTeamPortalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setTime(new Date().toLocaleTimeString());
    const refreshData = () => {
      fetchAlerts();
      fetchDangerZones();
    };
    refreshData();
    const dataInterval = setInterval(refreshData, 4000);
    const clockInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const fetchDangerZones = async () => {
    try {
      const res = await fetch('/api/sos?type=danger-zones');
      const data = await res.json();
      if (data.success) setDangerZones(data.data);
    } catch (e) { }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/sos');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, teamName?: string) => {
    try {
      await fetch('/api/sos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, teamName })
      });
      fetchAlerts();
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this alert?")) return;
    try {
      await fetch('/api/sos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setSelectedAlert(null);
      fetchAlerts();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleNormalizeZone = async (id: string) => {
    if (!confirm("CALAMITY NORMALIZATION: Are you sure the area is now safe? This will remove the Red Alert for all citizens.")) return;
    try {
      await fetch('/api/sos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'danger-zone' })
      });
      fetchDangerZones();
    } catch (e) {
      console.error("Normalization failed", e);
    }
  };

  const createDangerZone = async (sos: SOS) => {
    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'danger-zone',
          lat: sos.lat,
          lng: sos.lng,
          radius: 400,
          severity: sos.priority === 'Critical' ? 'Fatal' : 'High',
          message: `AREA SAFETY ALERT: ${sos.category} REPORTED`
        })
      });
      alert("GLOBAL DANGER ZONE LOGGED & BROADCASTED.");
    } catch (e) {
      console.error("DZ creation failed", e);
    }
  };

  const handleOpenRescuePortal = (alert: SOS) => {
    setSelectedAlert(alert);
    // Don't open portal immediately, let user review intel first
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'critical') return a.priority === 'Critical' || a.priority === 'High';
    if (activeTab === 'mesh') return a.isOffline;
    return true;
  });

  const stats = [
    { label: "Active Incidents", value: alerts.length, icon: Activity, color: "text-red-400" },
    { label: "Critical Priority", value: alerts.filter(a => a.priority === 'Critical').length, icon: Shield, color: "text-orange-400" },
    { label: "Relay Nodes", value: 12, icon: Radio, color: "text-blue-400" },
    { label: "SAR Readiness", value: "High", icon: Zap, color: "text-emerald-400" },
  ];

  return (
    <div className={clsx("operational-dashboard", theme)}>
      <nav className="top-global-nav">
        <div className="branding-area">
          <div className="hq-logo"><Shield size={20} fill="#ef4444" color="#ef4444" /></div>
          <div className="hq-text">
            <h1>{t.app_title} <span>GLOBAL HQ</span></h1>
            <div className="live-line"><div className="ping"></div> LIVE DATA STREAM SECURED</div>
          </div>
        </div>

        <div className="hq-ops-hub">
          <button className="btn-team-portal" onClick={() => setIsTeamPortalOpen(true)}>
            <Users size={16} />
            <span>{t.available_units}</span>
          </button>
        </div>

        <div className="search-global">
          <Search size={14} />
          <input type="text" placeholder="Scan IDs, Coordinates, or Regions..." />
        </div>

        <div className="ops-meta">
          <div className="lang-box dashboard">
            <Languages size={14} className="text-slate-400" />
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="lang-select">
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
              <option value="ta">தமிழ்</option>
              <option value="gu">ગુજરાતી</option>
              <option value="es">Español</option>
            </select>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="time-readout">{mounted ? time : "SYNCING..."}</div>
          <div className="user-pill">COMMANDER</div>
        </div>
      </nav>

      <div className="main-ops-layout">
        <aside className="intel-sidebar">
          <div className="intel-section">
            <header className="sect-h">
              <h3>{t.dashboard_title}</h3>
              <Settings size={14} />
            </header>
            <div className="stats-grid">
              {stats.map((s, i) => (
                <div key={i} className="stat-brick">
                  <div className="brick-h"><s.icon size={12} className={s.color} /> {s.label}</div>
                  <div className="brick-v">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-sections">
            <div className="intel-section feed-area">
              <header className="sect-h">
                <div className="flex items-center gap-2">
                  <h3>{t.active_incidents}</h3>
                  <div className="sync-pulse"></div>
                </div>
                <div className="feed-toggles">
                  <button className={activeTab === 'all' ? 'on' : ''} onClick={() => setActiveTab('all')}>ALL</button>
                  <button className={activeTab === 'critical' ? 'on' : ''} onClick={() => setActiveTab('critical')}>CRIT</button>
                </div>
              </header>

              <div className="incident-list">
                {filteredAlerts.length === 0 ? (
                  <div className="empty-state">
                    <Loader2 className="animate-spin mb-2" size={16} />
                    SCANNING FOR LIVE PINGS...
                  </div>
                ) : (
                  filteredAlerts.map(alert => (
                    <motion.div
                      layout
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={clsx("incident-tab", selectedAlert?.id === alert.id && "selected", (alert.priority || 'low').toLowerCase(), alert.status === 'Resolved' && "resolved")}
                    >
                      <div className="tab-h">
                        <span className="p-dot"></span>
                        <span className="p-cat">{alert.category}</span>
                        {alert.isBatteryOptimized && <Zap size={10} className="text-blue-400" />}
                        <span className="p-time">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button className="quick-delete" onClick={(e) => { e.stopPropagation(); handleDeleteAlert(alert.id); }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="tab-b">{alert.message}</div>
                      <div className="tab-f">
                        <span className={clsx("status-tag", (alert.status || 'new').toLowerCase())}>{alert.status || 'NEW'}</span>
                        <span>{alert.id}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="intel-section danger-zone-section">
              <header className="sect-h">
                <div className="flex items-center gap-2">
                  <h3>ACTIVE RED ALERTS</h3>
                  <div className="sync-pulse orange"></div>
                </div>
              </header>
              <div className="dz-list">
                {dangerZones.length === 0 ? (
                  <div className="empty-state">NO ACTIVE RED ALERTS DETECTED</div>
                ) : (
                  dangerZones.map(dz => (
                    <div key={dz.id} className={clsx("dz-card", (dz.severity || 'moderate').toLowerCase())}>
                      <div className="dz-h">
                        <Radio size={14} className="animate-pulse" />
                        <span>{dz.severity} RISK</span>
                        <button className="btn-normalize" onClick={() => handleNormalizeZone(dz.id)}>NORMALIZE</button>
                      </div>
                      <div className="dz-b">"{dz.description}"</div>
                      <div className="dz-f">LOGGED BY: {dz.author}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="map-theatre">
          <div className="map-view-wrapper">
            <SOSMap
              alerts={alerts}
              activeAlert={selectedAlert || undefined}
              onDispatch={(id, team) => handleUpdateStatus(id, 'Assigned', team)}
              onOpenRescuePortal={handleOpenRescuePortal}
            />

            <div className="map-overlay-tl">
              <div className="intel-box">
                <div className="line">CURRENT FOCUS: {selectedAlert ? `ID-${selectedAlert.id.toUpperCase()}` : "SURVEILLANCE MODE"}</div>
                <div className="line">G-IMAGE: SATELLITE (ESRI-WORLD)</div>
                <div className="line">ZOOM: {selectedAlert ? "15.0x (TACTICAL)" : "12.0x (STRATEGIC)"}</div>
              </div>
            </div>

            <div className="map-overlay-br">
              <div className="map-legend">
                <div className="l-item"><div className="dot critical"></div> CRITICAL</div>
                <div className="l-item"><div className="dot high"></div> HIGH</div>
                <div className="l-item"><div className="dot moderate"></div> MODERATE</div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {selectedAlert && (
              <motion.div
                initial={{ x: 500 }}
                animate={{ x: 0 }}
                exit={{ x: 500 }}
                className="tactical-panel"
              >
                <div className="panel-h">
                  <div className="id-code">INTEL REPORT #ID-{selectedAlert.id.toUpperCase()}</div>
                  <div className="panel-h-actions">
                    <button className="btn-delete-sos" onClick={() => handleDeleteAlert(selectedAlert.id)}>
                      <Trash2 size={14} />
                    </button>
                    <button className="btn-share-link" onClick={() => createDangerZone(selectedAlert)}>
                      <AlertTriangle size={14} /> FLAG AREA AS DANGER
                    </button>
                    <button onClick={() => setSelectedAlert(null)} className="close-panel">X</button>
                  </div>
                </div>

                <div className="panel-body">
                  <div className="threat-banner">
                    <div className={clsx("threat-level", selectedAlert.priority.toLowerCase())}>
                      <AlertCircle size={32} />
                      <div>
                        <h2>{selectedAlert.priority.toUpperCase()} {t.risk.toUpperCase()}</h2>
                        <p>{selectedAlert.category} DETECTED</p>
                      </div>
                    </div>
                  </div>

                  {selectedAlert.assignedTeam && (
                    <div className="team-status-box">
                      <div className="team-h">
                        <Users size={18} />
                        <div>
                          <h4>{t.sar_unit}: {selectedAlert.assignedTeam.name}</h4>
                          <p>{t.status}: {selectedAlert.assignedTeam.status} | {t.eta}: {selectedAlert.assignedTeam.eta}</p>
                        </div>
                      </div>
                      <div className="team-geo">
                        GPS: {selectedAlert.assignedTeam.lat.toFixed(5)}, {selectedAlert.assignedTeam.lng.toFixed(5)}
                      </div>
                    </div>
                  )}

                  <div className="intel-grid">
                    <div className="intel-card">
                      <label>SATELLITE IMAGE INTEL</label>
                      <div className="sat-preview">
                        <div className="sat-placeholder" style={{ backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${selectedAlert.lng},${selectedAlert.lat},16,0/400x250?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTAwMHozN282Y3p1M3dic2EifQ.W697FT6rS_m6S_7Bhc9H3w')` }}>
                          <div className="target-crosshair"></div>
                          <div className="sat-overlay-text">SATELLITE INTEL: LIVE ZOOM x16</div>
                        </div>
                      </div>
                    </div>

                    <div className="intel-row">
                      <div className="i-bit">
                        <label>{t.coordinates}</label>
                        <div className="val">{selectedAlert.lat.toFixed(6)}, {selectedAlert.lng.toFixed(6)}</div>
                      </div>
                      <div className="i-bit">
                        <label>{t.sys_energy}</label>
                        <div className="val">{selectedAlert.battery}% <div className="bat-bar"><div className="inner" style={{ width: (selectedAlert.battery || 0) + '%' }}></div></div></div>
                      </div>
                    </div>

                    <div className="intel-card full">
                      <label>TRANSCRIPTION / MESSAGE</label>
                      <div className="msg-log">
                        <Terminal size={14} />
                        <span>"{selectedAlert.message}"</span>
                      </div>
                    </div>

                    {selectedAlert.audioUrl && (
                      <div className="intel-card full">
                        <label>AUDIO LOG / BLACKBOX</label>
                        <div className="audio-player-box">
                          <Volume2 size={24} className="text-blue-500" />
                          <audio controls src={selectedAlert.audioUrl} className="custom-audio" />
                          <div className="audio-meta">VOICE_BURST_SECURED.mp3</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel-f">
                  <button
                    className="btn-dispatch"
                    onClick={() => setIsTeamPortalOpen(true)}
                    disabled={selectedAlert.status === 'Resolved' || selectedAlert.status === 'Assigned'}
                    style={{ background: selectedAlert.status === 'Assigned' ? '#3b82f6' : '#ef4444' }}
                  >
                    {selectedAlert.status === 'Assigned' ? 'UNIT DEPLOYED - TRACKING ACTIVE' : 'OPEN RESCUE PORTAL'}
                  </button>
                  <button className="btn-rescue" onClick={() => handleUpdateStatus(selectedAlert.id, 'Resolved')}>
                    {t.mark_safe}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div >

      <AnimatePresence>
        {isTeamPortalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="portal-overlay">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="portal-modal">
              <header className="portal-h">
                <div className="h-txt">
                  <h2>MISSION ASSET REGISTRY</h2>
                  <p>REAL-TIME DEPLOYMENT STATUS & PROXIMITY MAPPING</p>
                </div>
                <button className="btn-close-portal" onClick={() => setIsTeamPortalOpen(false)}>×</button>
              </header>

              <div className="portal-body">
                {selectedAlert && (
                  <div className="selected-target-context">
                    <div className="target-h">TARGET IDENTIFIED: #{selectedAlert.id} ({selectedAlert.category})</div>
                    <div className="target-loc">LOC: {selectedAlert.lat.toFixed(4)}, {selectedAlert.lng.toFixed(4)}</div>
                  </div>
                )}

                <div className="asset-grid">
                  {AVAILABLE_TEAMS(t, selectedAlert ? { lat: selectedAlert.lat, lng: selectedAlert.lng } : undefined)
                    .map(team => ({
                      ...team,
                      dist: selectedAlert ? calculateDistance(selectedAlert.lat, selectedAlert.lng, team.lat, team.lng) : null
                    }))
                    .sort((a, b) => (a.dist ?? 9999) - (b.dist ?? 9999))
                    .map((team) => (
                      <div key={team.id} className="asset-card">
                        <div className="asset-h" style={{ '--asset-color': team.color } as any}>
                          <div className="asset-icon"><team.icon size={20} /></div>
                          <div className="asset-meta">
                            <h4>{team.name}</h4>
                            <span>{team.type}</span>
                          </div>
                          {team.dist !== null && (
                            <div className="asset-dist">
                              {team.dist.toFixed(1)} KM AWAY
                            </div>
                          )}
                        </div>
                        <div className="asset-specs">
                          <div className="spec"><span>PERSONNEL</span> {team.personnel} MANNED</div>
                          <div className="spec"><span>UNIT TYPE</span> {team.vehicle}</div>
                        </div>
                        <button className="btn-dispatch-portal" onClick={() => {
                          if (selectedAlert) {
                            handleUpdateStatus(selectedAlert.id, 'Assigned', team.name);
                            setIsTeamPortalOpen(false);
                          } else {
                            alert("SELECT A LIVE SOS SIGNAL TO DISPATCH THIS UNIT.");
                          }
                        }}>
                          {selectedAlert?.assignedTeam?.name === team.name ? 'ON MISSION' : 'DEPLOY NOW'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .operational-dashboard {
          height: 100vh;
          width: 100vw;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: background 0.4s ease, color 0.4s ease;
        }

        /* THEME VARIABLES */
        .operational-dashboard.dark {
          --bg-main: #0a0a0b;
          --bg-nav: rgba(18, 18, 20, 0.8);
          --bg-card: #161618;
          --bg-stat: #1c1c1e;
          --bg-input: #1c1c1e;
          --border: rgba(255, 255, 255, 0.08);
          --text-main: #f4f4f5;
          --text-muted: #a1a1aa;
          --accent: #3b82f6;
          --surface: rgba(255, 255, 255, 0.03);
          --glass: rgba(0, 0, 0, 0.4);
        }

        .operational-dashboard.light {
          --bg-main: #f4f4f5;
          --bg-nav: rgba(255, 255, 255, 0.85);
          --bg-card: #ffffff;
          --bg-stat: #f1f5f9;
          --bg-input: #f1f5f9;
          --border: rgba(0, 0, 0, 0.08);
          --text-main: #09090b;
          --text-muted: #71717a;
          --accent: #2563eb;
          --surface: rgba(0, 0, 0, 0.01);
          --glass: rgba(255, 255, 255, 0.5);
        }

        .operational-dashboard {
          background: var(--bg-main);
          color: var(--text-main);
        }

        .operational-dashboard :global(*::-webkit-scrollbar) { width: 6px; height: 6px; }
        .operational-dashboard :global(*::-webkit-scrollbar-track) { background: transparent; }
        .operational-dashboard :global(*::-webkit-scrollbar-thumb) {
          background: var(--border);
          border-radius: 10px;
        }

        .top-global-nav {
          height: 64px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 2rem;
          background: var(--bg-nav);
          backdrop-filter: blur(20px);
          justify-content: space-between;
          z-index: 100;
        }

        .branding-area { display: flex; align-items: center; gap: 1rem; }
        .hq-logo { 
          width: 36px; height: 36px; 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 10px; 
          display: flex; align-items: center; justify-content: center; 
        }
        .hq-text h1 { font-size: 0.85rem; font-weight: 900; margin: 0; letter-spacing: 0.5px; color: var(--text-main); }
        .hq-text h1 span { color: var(--text-muted); font-weight: 500; font-size: 0.65rem; margin-left: 6px; }
        .live-line { font-size: 0.6rem; color: #10b981; display: flex; align-items: center; gap: 6px; font-weight: 800; margin-top: 2px; text-transform: uppercase; }
        .ping { width: 5px; height: 5px; background: #10b981; border-radius: 50%; animation: blink 1.5s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

        .search-global { 
          background: var(--bg-input); 
          border: 1px solid var(--border); 
          border-radius: 8px; 
          padding: 8px 14px; 
          display: flex; align-items: center; gap: 10px; 
          width: 300px; 
          transition: all 0.2s;
        }
        .search-global:focus-within { border-color: var(--accent); scale: 1.02; }
        .search-global input { background: none; border: none; color: var(--text-main); outline: none; width: 100%; font-size: 0.75rem; font-weight: 500; }
        .search-global :global(svg) { color: var(--text-muted); }

        .ops-meta { display: flex; align-items: center; gap: 1.5rem; }
        .lang-box.dashboard { 
          background: var(--surface); 
          border: 1px solid var(--border); 
          padding: 4px 10px; 
          border-radius: 8px; 
          display: flex; align-items: center; gap: 6px; 
        }
        .lang-box.dashboard .lang-select { background: none; border: none; font-size: 0.65rem; font-weight: 700; color: var(--text-muted); outline: none; cursor: pointer; }
        
        .theme-toggle {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-muted);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .theme-toggle:hover { color: var(--text-main); border-color: var(--text-muted); transform: translateY(-1px); }

        .time-readout { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .user-pill { 
          background: var(--text-main); 
          color: var(--bg-main); 
          padding: 5px 12px; 
          border-radius: 6px; 
          font-size: 0.6rem; font-weight: 900; 
          letter-spacing: 0.5px; 
        }

        .main-ops-layout { flex: 1; display: flex; overflow: hidden; }

        .intel-sidebar { width: 380px; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; background: var(--bg-card); }
        .intel-section { padding: 1.25rem; border-bottom: 1px solid var(--border); }
        .sect-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .sect-h h3 { font-size: 0.6rem; font-weight: 950; color: var(--text-muted); letter-spacing: 1.2px; margin: 0; text-transform: uppercase; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .stat-brick { background: var(--bg-stat); border: 1px solid var(--border); padding: 1rem; border-radius: 12px; }
        .brick-h { font-size: 0.55rem; font-weight: 800; color: var(--text-muted); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
        .brick-v { font-size: 1.1rem; font-weight: 950; color: var(--text-main); }

        .sidebar-sections { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .feed-area { flex: 1.5; display: flex; flex-direction: column; overflow: hidden; }
        .danger-zone-section { flex: 0.8; display: flex; flex-direction: column; border-top: 1px solid var(--border); overflow: hidden; background: var(--bg-card); }

        .feed-toggles { display: flex; background: var(--bg-stat); border-radius: 6px; padding: 3px; }
        .feed-toggles button { background: none; border: none; color: var(--text-muted); font-size: 0.6rem; font-weight: 800; padding: 4px 10px; cursor: pointer; border-radius: 4px; }
        .feed-toggles button.on { background: var(--bg-card); color: var(--text-main); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

        .incident-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding: 0.25rem 1.25rem 1.25rem; }
        .dz-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.65rem; padding: 0 1.25rem 1.25rem; }
        
        .incident-tab { 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          padding: 1.25rem; 
          border-radius: 16px; 
          cursor: pointer; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .incident-tab:hover { border-color: var(--text-muted); background: var(--surface); }
        .incident-tab.selected { border-width: 2px; border-color: var(--accent); background: var(--surface); }

        .tab-h { display: flex; align-items: center; gap: 8px; margin-bottom: 0.65rem; }
        .p-dot { width: 6px; height: 6px; border-radius: 50%; }
        .critical .p-dot { background: #ef4444; border: 1px solid rgba(255,255,255,0.2); }
        .high .p-dot { background: #f97316; }
        .moderate .p-dot { background: #3b82f6; }

        .p-cat { font-size: 0.7rem; font-weight: 900; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.3px; }
        .p-time { margin-left: auto; font-size: 0.6rem; color: var(--text-muted); font-weight: 700; }
        .tab-b { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1rem; font-weight: 500; }
        .tab-f { font-size: 0.6rem; color: var(--text-muted); font-weight: 800; display: flex; justify-content: space-between; text-transform: uppercase; }

        .map-theatre { flex: 1; position: relative; display: flex; background: var(--bg-main); }
        .map-view-wrapper { flex: 1; position: relative; z-index: 10; overflow: hidden; }

        .map-overlay-tl { position: absolute; top: 1.25rem; left: 1.25rem; z-index: 50; }
        .intel-box { 
          background: var(--glass); 
          backdrop-filter: blur(12px); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          padding: 1rem; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
        }
        .intel-box .line { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: var(--text-muted); font-weight: 800; margin-bottom: 4px; text-transform: uppercase; }

        .map-overlay-br { position: absolute; bottom: 1.25rem; right: 1.25rem; z-index: 50; }
        .map-legend { 
          background: var(--glass); 
          backdrop-filter: blur(12px); 
          border: 1px solid var(--border); 
          border-radius: 10px; 
          padding: 10px 16px; 
          display: flex; gap: 1.25rem; 
        }
        .l-item { display: flex; align-items: center; gap: 8px; font-size: 0.55rem; font-weight: 950; color: var(--text-muted); text-transform: uppercase; }

        .tactical-panel { 
          width: 480px; 
          background: var(--bg-card); 
          border-left: 1px solid var(--border); 
          display: flex; flex-direction: column; 
          z-index: 80; 
          box-shadow: -15px 0 45px rgba(0,0,0,0.3); 
        }
        .panel-h { padding: 1.25rem 1.75rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
        .panel-h-actions { display: flex; gap: 0.75rem; align-items: center; }
        
        .btn-share-link { 
          background: var(--surface); 
          border: 1px solid var(--border); 
          color: var(--accent); 
          padding: 6px 12px; 
          border-radius: 8px; 
          font-size: 0.6rem; font-weight: 950; 
          cursor: pointer; display: flex; align-items: center; gap: 6px; 
        }

        .panel-body { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
        .threat-banner { border-radius: 20px; overflow: hidden; }
        .threat-level { display: flex; gap: 1.25rem; align-items: center; padding: 1.5rem; }
        .threat-level.critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .threat-level h2 { font-size: 1.1rem; font-weight: 950; margin: 0; letter-spacing: -0.3px; }

        .sat-preview { border-radius: 20px; border: 1px solid var(--border); overflow: hidden; opacity: ${theme === 'dark' ? 0.7 : 1}; filter: ${theme === 'dark' ? 'grayscale(0.4)' : 'none'}; }
        .sat-placeholder { height: 240px; }

        .intel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .i-bit .val { font-size: 0.85rem; font-weight: 800; color: var(--text-main); font-family: 'JetBrains Mono', monospace; }
        
        .msg-log { background: var(--bg-stat); padding: 1.25rem; border-radius: 14px; border: 1px solid var(--border); }
        .msg-log span { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; font-style: italic; }

        .panel-f { padding: 2rem; border-top: 1px solid var(--border); background: var(--bg-stat); display: flex; flex-direction: column; gap: 1rem; }
        .btn-dispatch { 
          background: var(--accent); 
          color: white; border: none; 
          padding: 1.1rem; border-radius: 12px; 
          font-weight: 950; font-size: 0.9rem; 
          cursor: pointer; 
          box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
        }
        
        .dz-card { 
          padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border); 
          border-left: 4px solid var(--accent); background: var(--bg-stat); 
          position: relative;
        }
        .dz-card.fatal { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }

        .quick-delete { padding: 4px; border-radius: 6px; transition: background 0.2s; }
        .quick-delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .btn-team-portal { background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.75rem; font-weight: 950; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-team-portal:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }

        .portal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .portal-modal { background: var(--bg-card); width: 100%; max-width: 900px; border-radius: 24px; border: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
        .portal-h { padding: 2rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-stat); }
        .h-txt h2 { font-size: 1.25rem; font-weight: 950; margin: 0; color: var(--text-main); letter-spacing: 1px; }
        .h-txt p { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.5px; }
        .btn-close-portal { background: none; border: none; color: var(--text-muted); font-size: 2rem; cursor: pointer; }

        .portal-body { padding: 2rem; max-height: 70vh; overflow-y: auto; }
        .selected-target-context { background: rgba(239, 68, 68, 0.05); border: 1.5px dashed #ef4444; padding: 1.25rem; border-radius: 16px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
        .target-h { font-size: 0.85rem; font-weight: 950; color: #ef4444; }
        .target-loc { font-family: 'JetBrains Mono'; font-size: 0.75rem; color: var(--text-muted); }

        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .asset-card { background: var(--bg-stat); border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; display: flex; flex-direction: column; transition: transform 0.2s; }
        .asset-card:hover { transform: translateY(-5px); }
        
        .asset-h { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
        .asset-icon { width: 44px; height: 44px; background: var(--asset-color); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px -4px var(--asset-color); }
        .asset-meta h4 { font-size: 0.95rem; font-weight: 950; margin: 0; color: var(--text-main); }
        .asset-meta span { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        
        .asset-dist { margin-left: auto; background: var(--bg-card); padding: 4px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }

        .asset-specs { display: flex; flex-direction: column; gap: 10px; margin-bottom: 2rem; }
        .spec { font-size: 0.75rem; font-weight: 800; color: var(--text-main); display: flex; justify-content: space-between; }
        .spec span { color: var(--text-muted); font-size: 0.6rem; font-weight: 900; }

        .btn-dispatch-portal { background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border); padding: 1rem; border-radius: 12px; font-weight: 950; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .btn-dispatch-portal:hover { background: var(--text-main); color: var(--bg-main); }

        @media (max-width: 1200px) {
          .intel-sidebar { width: 340px; }
          .tactical-panel { width: 420px; }
        }
      `}</style>
    </div >
  );
}
