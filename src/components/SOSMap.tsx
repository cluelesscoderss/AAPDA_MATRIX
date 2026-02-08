import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, Circle } from 'react-leaflet';
import { SOS, DangerZone } from '@/lib/store';

let L: any;

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function SOSMap({ alerts = [], activeAlert, onDispatch, onOpenRescuePortal }: { alerts: SOS[], activeAlert?: SOS, onDispatch?: (id: string, teamName: string) => void, onOpenRescuePortal?: (alert: SOS) => void }) {
  const [mounted, setMounted] = useState(false);
  const [icons, setIcons] = useState<Record<string, any>>({});
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('ALPHA-1');

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const fetchDZ = async () => {
      try {
        const res = await fetch('/api/sos?type=danger-zones');
        const data = await res.json();
        if (data.success) setDangerZones(data.data);
      } catch (e) { }
    };
    fetchDZ();
    const inv = setInterval(fetchDZ, 5000);
    return () => clearInterval(inv);
  }, []);

  useEffect(() => {
    const initLeaflet = async () => {
      try {
        addLog("Initializing Leaflet...");
        L = (await import('leaflet')).default;

        const DefaultIcon = L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        L.Marker.prototype.options.icon = DefaultIcon;

        const createPulseIcon = (color: string) => L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px ${color};" class="pulse-marker"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const createTeamIcon = () => L.divIcon({
          className: 'team-div-icon',
          html: `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); border: 2px solid white; color: white; font-weight: 900; font-size: 10px;">TEAM</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        setIcons({
          Critical: createPulseIcon('#ef4444'),
          High: createPulseIcon('#f97316'),
          Moderate: createPulseIcon('#3b82f6'),
          Low: createPulseIcon('#10b981'),
          Team: createTeamIcon()
        });

        addLog("Leaflet Ready.");
        setMounted(true);
      } catch (err: any) {
        addLog(`Leaflet Error: ${err.message}`);
      }
    };
    initLeaflet();
  }, []);

  if (!mounted || !L) return (
    <div style={{ height: '100%', width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      <p style={{ fontSize: '14px', letterSpacing: '2px', marginBottom: '10px', fontWeight: '800' }}>INITIALIZING OPERATIONAL THEATRE...</p>
      <div style={{ fontSize: '10px', fontFamily: 'monospace', opacity: 0.6 }}>
        {debugLog.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );

  const hasAlerts = alerts.length > 0;
  const mapCenter: [number, number] = activeAlert
    ? [activeAlert.lat, activeAlert.lng]
    : hasAlerts
      ? [alerts[0].lat, alerts[0].lng]
      : [28.6139, 77.2090];

  const mapZoom = activeAlert || hasAlerts ? 15 : 4;

  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#f8fafc', zIndex: 1 }}
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OSM'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <ChangeView center={mapCenter} zoom={mapZoom} />

        {/* SOS MARKERS */}
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.lat, alert.lng]}
            icon={icons[alert.priority] || icons.Low}
          >
            <Popup className="disaster-popup">
              <div style={{ minWidth: '200px' }}>
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '900', textTransform: 'uppercase' }}>LIVE INCIDENT</div>
                <h3 style={{ margin: '5px 0', fontSize: '14px', color: '#0f172a', fontWeight: '900' }}>{alert.id} | {alert.category}</h3>
                <p style={{ margin: '10px 0', fontSize: '12px', color: '#475569', fontWeight: '500' }}>{alert.message}</p>

                {alert.assignedTeam ? (
                  <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', border: '1px solid #bfdbfe' }}>
                    UNIT DISPATCHED: {alert.assignedTeam.name}<br />
                    STATUS: {alert.assignedTeam.status}
                  </div>
                ) : (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>IMMEDIATE ACTION</div>
                    <button
                      onClick={() => onOpenRescuePortal?.(alert)}
                      style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '900', fontSize: '10px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>RESCUE SEARCH</span>
                      <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }}></div>
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '8px', color: '#64748b', marginTop: '6px', fontWeight: '600' }}>LOCATE NEARBY ASSETS</div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* TEAM MARKERS */}
        {alerts.map((alert) => alert.assignedTeam && (
          <Marker
            key={`team-${alert.id}`}
            position={[alert.assignedTeam.lat, alert.assignedTeam.lng]}
            icon={icons.Team}
          >
            <Popup className="disaster-popup">
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>RESCUE TEAM</div>
              <div style={{ fontSize: '12px' }}>{alert.assignedTeam.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>STATUS: {alert.assignedTeam.status}</div>
            </Popup>
          </Marker>
        ))}

        {/* DANGER ZONES */}
        {dangerZones.map((dz) => (
          <Circle
            key={dz.id}
            center={[dz.lat, dz.lng]}
            radius={dz.radius}
            pathOptions={{
              color: dz.severity === 'Fatal' ? '#ef4444' : '#f97316',
              fillColor: dz.severity === 'Fatal' ? '#ef4444' : '#f97316',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '10, 10'
            }}
          >
            <Popup>
              <div style={{ fontWeight: 'bold', color: '#ef4444' }}>DANGER ZONE</div>
              <div style={{ fontSize: '12px' }}>{dz.description}</div>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>SEVERITY: {dz.severity}</div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 100, fontSize: '10px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '8px 12px', borderRadius: '8px', color: '#10b981', fontWeight: '900', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        OPERATIONAL THEATRE ACTIVE | ASSETS: {alerts.length} | THREATS: {dangerZones.length}
      </div>

      <style jsx global>{`
        .leaflet-container { background: #f8fafc !important; outline: none; }
        .pulse-marker { animation: map-pulse 1.5s infinite; }
        @keyframes map-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .disaster-popup .leaflet-popup-content-wrapper {
          background: white !important;
          color: #0f172a !important;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        }
        .disaster-popup .leaflet-popup-tip {
          background: white !important;
        }
      `}</style>
    </div>
  );
}
