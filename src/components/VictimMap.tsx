import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';

let L: any;

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
          const map = useMap();
          useEffect(() => {
                    map.setView(center, zoom);
          }, [center, zoom, map]);
          return null;
}

export default function VictimMap({ victimLoc, teamLoc, teamName, status }: { victimLoc: [number, number], teamLoc?: [number, number], teamName?: string, status: string }) {
          const [mounted, setMounted] = useState(false);
          const [icons, setIcons] = useState<any>(null);

          useEffect(() => {
                    const init = async () => {
                              L = (await import('leaflet')).default;

                              const victimIcon = L.divIcon({
                                        className: 'v-marker',
                                        html: `<div style="background: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #ef4444;"></div>`,
                                        iconSize: [14, 14]
                              });

                              const teamIcon = L.divIcon({
                                        className: 't-marker',
                                        html: `<div style="background: #3b82f6; width: 30px; height: 30px; border-radius: 8px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 8px; box-shadow: 0 4px 10px rgba(59,130,246,0.3);">SAR</div>`,
                                        iconSize: [30, 30]
                              });

                              setIcons({ victim: victimIcon, team: teamIcon });
                              setMounted(true);
                    };
                    init();
          }, []);

          if (!mounted || !icons) return <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-[10px] font-bold text-slate-400">LOADING TACTICAL MAP...</div>;

          return (
                    <div className="h-full w-full relative">
                              <MapContainer
                                        center={victimLoc}
                                        zoom={15}
                                        scrollWheelZoom={false}
                                        dragging={false}
                                        zoomControl={false}
                                        style={{ height: '100%', width: '100%' }}
                              >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <ChangeView center={victimLoc} zoom={15} />

                                        <Marker position={victimLoc} icon={icons.victim}>
                                                  <Popup>YOUR LOCATION</Popup>
                                        </Marker>

                                        {teamLoc && (
                                                  <Marker position={teamLoc} icon={icons.team}>
                                                            <Popup>
                                                                      <strong>{teamName}</strong><br />
                                                                      Status: {status}
                                                            </Popup>
                                                  </Marker>
                                        )}
                              </MapContainer>
                              <div className="absolute top-2 left-2 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded text-[8px] font-black border border-slate-200">
                                        LIVE SAR TRACKING ACTIVE
                              </div>
                    </div>
          );
}
