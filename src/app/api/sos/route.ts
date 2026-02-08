import { NextResponse } from 'next/server';
import { addSOS, getSOS, updateSOS, getDangerZones, addDangerZone, deleteSOS, removeDangerZone } from '@/lib/store';
import { analyzeSOS } from '@/lib/ai';

// Haversine formula for distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
          const R = 6371; // km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
}

export async function GET(req: Request) {
          const { searchParams } = new URL(req.url);
          const type = searchParams.get('type');

          if (type === 'danger-zones') {
                    return NextResponse.json({ success: true, data: getDangerZones() });
          }

          const data = getSOS();
          return NextResponse.json({ success: true, count: data.length, data });
}

export async function POST(req: Request) {
          try {
                    const body = await req.json();
                    const { lat, lng, message, battery, isOffline, audioUrl, isBatteryOptimized, type } = body;

                    if (type === 'danger-zone') {
                              const dz = addDangerZone({ lat, lng, radius: body.radius || 500, severity: body.severity, description: message, author: 'Dashboard' });
                              return NextResponse.json({ success: true, data: dz });
                    }

                    // AI Classification
                    const { priority, category } = analyzeSOS(message);

                    const sos = addSOS({
                              lat,
                              lng,
                              message,
                              battery,
                              isOffline,
                              priority,
                              category,
                              audioUrl,
                              isBatteryOptimized
                    });

                    // FEATURE 5: NATURAL DISASTER AUTO-RED-ALERT & PROXIMITY BROADCAST
                    const isDisaster = message.toUpperCase().includes("NATURAL DISASTER") || category.includes("Trapped");

                    if (isDisaster) {
                              // 1. Auto-create RED ALERT Danger Zone
                              addDangerZone({
                                        lat,
                                        lng,
                                        radius: 1000, // 1km core red zone
                                        severity: 'Fatal',
                                        description: `RED ALERT: ${message.toUpperCase()}`,
                                        author: 'SYSTEM_AUTO_TRIAGE'
                              });
                    }

                    // PROXIMITY ALERT LOGIC (10KM)
                    const allSOS = getSOS();
                    const nearbyActiveUsers = 42; // Mocking nearby active app users for the demonstration

                    if (isDisaster) {
                              console.log(`[BROADCAST] NATURAL DISASTER DETECTED at (${lat}, ${lng}).`);
                              console.log(`[SMS/WHATSAPP] Sending Emergency Alert to all citizens within 10km: "CRITICAL: A natural disaster has been reported in your vicinity. Please move to higher ground or seek immediate shelter. Stay safe."`);
                              console.log(`[BROADCAST] Notification sent to ${nearbyActiveUsers} potential victims in the 10km radius.`);
                    } else {
                              console.log(`[ALERT] SOS triggered at (${lat}, ${lng}). Notifying emergency contacts and nearby responders.`);
                    }

                    return NextResponse.json({
                              success: true,
                              data: sos,
                              autoDangerZone: isDisaster,
                              broadcastCount: isDisaster ? nearbyActiveUsers : 0
                    });
          } catch (error) {
                    return NextResponse.json({ success: false, error: 'Invalid Data' }, { status: 400 });
          }
}

export async function PATCH(req: Request) {
          try {
                    const { id, status, teamName, audioUrl } = await req.json();

                    let updates: any = {};
                    if (status) updates.status = status;
                    if (audioUrl) updates.audioUrl = audioUrl;

                    if (status === 'Assigned' && teamName) {
                              const sos = getSOS().find(s => s.id === id);
                              if (sos) {
                                        updates.assignedTeam = {
                                                  id: `TEAM-${Math.random().toString(36).substring(5).toUpperCase()}`,
                                                  name: teamName,
                                                  lat: sos.lat - 0.05, // Start 5km away roughly
                                                  lng: sos.lng - 0.05,
                                                  status: 'En-route',
                                                  eta: '12 mins'
                                        };
                              }
                    }

                    const updated = updateSOS(id, updates);
                    if (updated) {
                              return NextResponse.json({ success: true, data: updated });
                    }
                    return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
          } catch (error) {
                    return NextResponse.json({ success: false, error: 'Invalid Data' }, { status: 400 });
          }
}

export async function DELETE(req: Request) {
          try {
                    const { id, type } = await req.json();

                    if (type === 'danger-zone') {
                              const success = removeDangerZone(id);
                              if (success) return NextResponse.json({ success: true });
                              return NextResponse.json({ success: false, error: 'Zone Not Found' }, { status: 404 });
                    }

                    const success = deleteSOS(id);
                    if (success) return NextResponse.json({ success: true });
                    return NextResponse.json({ success: false, error: 'Incident Not Found' }, { status: 404 });
          } catch (error) {
                    return NextResponse.json({ success: false, error: 'Invalid Data' }, { status: 400 });
          }
}
