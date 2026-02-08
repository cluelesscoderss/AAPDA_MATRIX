export interface DangerZone {
          id: string;
          lat: number;
          lng: number;
          radius: number; // in meters
          severity: 'Fatal' | 'High' | 'Moderate';
          description: string;
          timestamp: string;
          author: string;
}

export interface SOS {
          id: string;
          lat: number;
          lng: number;
          message: string;
          timestamp: string;
          battery: number;
          isOffline: boolean;
          priority: 'Critical' | 'High' | 'Moderate' | 'Low';
          category: string;
          status: 'New' | 'Assigned' | 'Rescued' | 'Resolved';
          audioUrl?: string;
          resolvedAt?: string;
          isBatteryOptimized?: boolean;

          // Rescue Team Tracking
          assignedTeam?: {
                    id: string;
                    name: string;
                    lat: number;
                    lng: number;
                    status: 'En-route' | 'On-site' | 'Returning';
                    eta?: string;
          };
}

// Global scope for in-memory persistence in dev
declare global {
          var sosStore: SOS[] | undefined;
          var dangerZoneStore: DangerZone[] | undefined;
}

const initialSOS: SOS[] = [];
// Pre-fill some "Historical" danger zones for the hackathon
const initialDangerZones: DangerZone[] = [
          { id: 'dz1', lat: 28.6139, lng: 77.2090, radius: 500, severity: 'High', description: 'Frequent Flooding Zone - Avoid in Monsoon', timestamp: new Date().toISOString(), author: 'Admin' },
          { id: 'dz2', lat: 28.6250, lng: 77.2200, radius: 300, severity: 'Fatal', description: 'Structural Instability Reported', timestamp: new Date().toISOString(), author: 'Gov_Audit' },
];

const store = global.sosStore || initialSOS;
const dangerZones = global.dangerZoneStore || initialDangerZones;

if (process.env.NODE_ENV !== 'production') {
          global.sosStore = store;
          global.dangerZoneStore = dangerZones;
}

export const getSOS = () => store;
export const getDangerZones = () => dangerZones;

export const addSOS = (sos: Omit<SOS, 'id' | 'timestamp' | 'status'>) => {
          const newSOS: SOS = {
                    ...sos,
                    id: `SIGNAL-${Math.random().toString(36).substring(7).toUpperCase()}`,
                    timestamp: new Date().toISOString(),
                    status: 'New',
          };
          store.unshift(newSOS);
          return newSOS;
};

export const updateSOS = (id: string, updates: Partial<SOS>) => {
          const index = store.findIndex(s => s.id === id);
          if (index !== -1) {
                    store[index] = { ...store[index], ...updates };
                    return store[index];
          }
          return null;
};

export const deleteSOS = (id: string) => {
          const index = store.findIndex(s => s.id === id);
          if (index !== -1) {
                    store.splice(index, 1);
                    return true;
          }
          return false;
};

export const addDangerZone = (dz: Omit<DangerZone, 'id' | 'timestamp'>) => {
          const newDZ: DangerZone = {
                    ...dz,
                    id: `ZONE-${Math.random().toString(36).substring(7).toUpperCase()}`,
                    timestamp: new Date().toISOString(),
          };
          dangerZones.push(newDZ);
          return newDZ;
};

export const removeDangerZone = (id: string) => {
          const index = dangerZones.findIndex(dz => dz.id === id);
          if (index !== -1) {
                    dangerZones.splice(index, 1);
                    return true;
          }
          return false;
};

// Simulate Team Movement for SOS alerts
if (typeof global !== 'undefined') {
          setInterval(() => {
                    const now = Date.now();
                    const indicesToRemove: number[] = [];

                    store.forEach((sos, index) => {
                              // AUTO-CLEANUP: Remove from store if rescued for more than 10 seconds
                              if (sos.status === 'Rescued') {
                                        const rescueTime = sos.resolvedAt ? new Date(sos.resolvedAt).getTime() : now;
                                        if (!sos.resolvedAt) sos.resolvedAt = new Date().toISOString();

                                        if (now - rescueTime > 10000) {
                                                  indicesToRemove.push(index);
                                        }
                              }

                              if (sos.assignedTeam && sos.assignedTeam.status === 'En-route') {
                                        const distThreshold = 0.0002;
                                        const speed = 0.05; // 5% of distance per step

                                        const dLat = (sos.lat - sos.assignedTeam.lat);
                                        const dLng = (sos.lng - sos.assignedTeam.lng);

                                        if (Math.abs(dLat) < distThreshold && Math.abs(dLng) < distThreshold) {
                                                  sos.assignedTeam.status = 'On-site';
                                                  sos.status = 'Rescued';
                                                  sos.resolvedAt = new Date().toISOString();
                                                  console.log(`[SAR] Team ${sos.assignedTeam.name} reached victim ${sos.id}`);
                                        } else {
                                                  sos.assignedTeam.lat += dLat * speed;
                                                  sos.assignedTeam.lng += dLng * speed;
                                                  // Update ETA simulation
                                                  const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
                                                  sos.assignedTeam.eta = `${Math.ceil(distKm * 2)} mins`;
                                        }
                              }
                    });

                    // Execute cleanup
                    indicesToRemove.sort((a, b) => b - a).forEach(index => {
                              console.log(`[AUTO-PURGE] Removing rescued incident ${store[index].id}`);
                              store.splice(index, 1);
                    });
          }, 1000);
}
