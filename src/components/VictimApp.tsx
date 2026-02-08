"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, MapPin, WifiOff, Send, Radio, Battery, Activity, Loader2, CheckCircle2, Navigation, AlertTriangle, Droplets, Flame, Skull, Globe, RefreshCcw, Mic, Volume2, UserCheck, Settings, Zap, Users, Languages, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';
import { Language, translations } from '@/lib/translations';

const VictimMap = dynamic(() => import('./VictimMap'), { ssr: false });

const QUICK_CONDITIONS = (t: any) => [
  { id: 'women', label: t.women_safety, icon: Shield, color: '#ec4899' },
  { id: 'disaster', label: t.natural_disaster, icon: Globe, color: '#3b82f6' },
  { id: 'medical', label: t.medical_emergency, icon: Activity, color: '#ef4444' },
  { id: 'accident', label: t.road_accident, icon: AlertTriangle, color: '#f59e0b' },
];

export default function VictimApp() {
  const [lang, setLang] = useState<Language>('en');
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');
  const t = translations[lang];

  const [message, setMessage] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "sending" | "sent" | "resolved">("idle");
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locMethod, setLocMethod] = useState<string>("SEARCHING");
  const [error, setError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isBatteryOptimized, setIsBatteryOptimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSOS, setActiveSOS] = useState<any>(null);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [nearbyDZ, setNearbyDZ] = useState<any>(null);
  const [isReportingDanger, setIsReportingDanger] = useState(false);
  const [dangerFeedback, setDangerFeedback] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "listening" | "analyzing" | "triggering">("idle");
  const [meshNodes, setMeshNodes] = useState<number>(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [meshSignal, setMeshSignal] = useState<number>(0);

  // REAL-TIME MESH DISCOVERY SIMULATION
  useEffect(() => {
    if (!isOffline) {
      setMeshNodes(0);
      setActiveNode(null);
      setMeshSignal(0);
      return;
    }

    const interval = setInterval(() => {
      // Simulate finding a subset of the 12 global relay nodes
      const found = Math.floor(Math.random() * 3) + 1; // 1-3 nodes nearby
      setMeshNodes(found);

      const nodeIds = ['NODE-42', 'NODE-17', 'NODE-89', 'G-RELAY-01', 'SAR-MESH-7'];
      setActiveNode(nodeIds[Math.floor(Math.random() * nodeIds.length)]);

      // Simulate signal strength fluctuations (-70dBm to -95dBm is typical for mesh)
      setMeshSignal(Math.floor(Math.random() * 25) + 70);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOffline]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice features not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setAiStatus("listening");
      setSpeechTranscript("LISTENING...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setSpeechTranscript(transcript);

      // AI Intent Detection
      const keywords = [
        { keys: ['medical', 'hospital', 'ambulance', 'doctor', 'चिकित्सा', 'अस्पताल'], val: t.medical_emergency },
        { keys: ['accident', 'crash', 'collision', 'दुर्घटना'], val: t.road_accident },
        { keys: ['women', 'safety', 'girl', 'महिला', 'सुरक्षा'], val: t.women_safety },
        { keys: ['child', 'missing', 'lost', 'बच्चा'], val: t.child_missing },
        { keys: ['disaster', 'flood', 'earthquake', 'आपदा', 'बाढ़'], val: t.natural_disaster },
      ];

      const found = keywords.find(k => k.keys.some(key => transcript.includes(key)));
      if (found) {
        setAiStatus("analyzing");
        setTimeout(() => {
          setMessage(found.val);
          setAiStatus("triggering");
          setTimeout(() => {
            recognition.stop();
            handleSendSOS();
          }, 1000);
        }, 800);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (aiStatus === 'listening') {
        setAiStatus("idle");
        setSpeechTranscript("");
      }
    };

    recognition.start();
  };

  const DISASTER_SUB_TYPES = [
    { id: 'trapped', label: t.trapped, icon: Skull, color: '#4b5563' },
    { id: 'flood', label: t.flood, icon: Droplets, color: '#3b82f6' },
    { id: 'earthquake', label: t.earthquake, icon: Activity, color: '#7c3aed' },
  ];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Persistent storage check
  useEffect(() => {
    const savedSOS = localStorage.getItem('active_sos');
    if (savedSOS) {
      setActiveSOS(JSON.parse(savedSOS));
      setStatus("sent");
    }
    fetchDangerZones();
    const interval = setInterval(fetchDangerZones, 10000); // More frequent DZ updates
    return () => clearInterval(interval);
  }, []);

  const fetchDangerZones = async () => {
    try {
      const res = await fetch('/api/sos?type=danger-zones');
      const data = await res.json();
      if (data.success) {
        setDangerZones(data.data);
        localStorage.setItem('cached_dz', JSON.stringify(data.data));
      }
    } catch (e) {
      const cached = localStorage.getItem('cached_dz');
      if (cached) setDangerZones(JSON.parse(cached));
    }
  };

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const checkDangerProximity = useCallback((loc: { lat: number, lng: number }) => {
    const nearby = dangerZones.find(dz => {
      const dist = getDistance(loc.lat, loc.lng, dz.lat, dz.lng);
      return dist <= (dz.radius / 1000) * 1.5;
    });

    if (nearby && nearby.id !== nearbyDZ?.id) {
      setShowAlertModal(true); // Sudden popup for new proximity
    }
    setNearbyDZ(nearby || null);
  }, [dangerZones, nearbyDZ]);

  const submitDangerReport = async (severity: string) => {
    if (!location) return;
    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'danger-zone',
          lat: location.lat,
          lng: location.lng,
          radius: 300,
          severity: severity,
          message: dangerFeedback || "COMMUNITY ALERT: HARMFUL AREA REPORTED",
        })
      });
      setIsReportingDanger(false);
      setDangerFeedback("");
      fetchDangerZones();
      alert("THANK YOU. YOUR FEEDBACK HAS BEEN LOGGED TO PROTECT OTHERS.");
    } catch (e) { }
  };

  useEffect(() => {
    if (activeSOS && status === "sent") {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/sos');
          const data = await res.json();
          const current = data.data.find((s: any) => s.id === activeSOS.id);
          if (current) {
            setActiveSOS(current);
            localStorage.setItem('active_sos', JSON.stringify(current));
            if (current.status === 'Resolved' || current.status === 'Rescued') {
              setStatus('resolved');
              localStorage.removeItem('active_sos');
            }
          }
        } catch (e) { }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeSOS, status]);

  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.latitude && data.longitude) return { lat: data.latitude, lng: data.longitude };
    } catch (e) { }
    return null;
  };

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(Math.floor(bat.level * 100));
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.floor(bat.level * 100)));
      });
    }
  }, []);

  const syncLocation = useCallback(async (forceLowAccuracy = false): Promise<{ lat: number, lng: number } | null> => {
    setError(null);
    setLocMethod(isBatteryOptimized ? "BATTERY SAVER ACTIVE" : "ACQUIRING GPS...");

    return new Promise(async (resolve) => {
      if (!navigator.geolocation) {
        const ipLoc = await fetchIPLocation();
        if (ipLoc) { setLocation(ipLoc); setLocMethod("NETWORK (IP)"); checkDangerProximity(ipLoc); resolve(ipLoc); }
        else { resolve(null); }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          setLocMethod(isBatteryOptimized ? "GPS (LOW PWR)" : "GPS (HIGH ACCURACY)");
          checkDangerProximity(newLoc);
          resolve(newLoc);
        },
        async (err) => {
          const ipLoc = await fetchIPLocation();
          if (ipLoc) { setLocation(ipLoc); setLocMethod("NETWORK (IP)"); checkDangerProximity(ipLoc); resolve(ipLoc); }
          else { setError("LOCATION ACCESS DENIED"); setLocMethod("FAILED"); resolve(null); }
        },
        { enableHighAccuracy: !isBatteryOptimized, timeout: 4000, maximumAge: isBatteryOptimized ? 60000 : 30000 }
      );
    });
  }, [isBatteryOptimized, checkDangerProximity]);

  useEffect(() => {
    syncLocation();
    const interval = setInterval(() => syncLocation(true), isBatteryOptimized ? 120000 : 30000);
    return () => clearInterval(interval);
  }, [syncLocation, isBatteryOptimized]);

  const startAudioRecording = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data);
          };
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        // Record for 6 seconds for better context
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            setIsRecording(false);
          }
        }, 6000);
      } catch (err) {
        resolve(null);
      }
    });
  };

  const handleSendSOS = async () => {
    if (!message) { setError("SELECT CATEGORY"); return; }
    setError(null);
    setStatus("locating");
    console.log("[DEBUG] Commencing SOS Broadcast...");

    try {
      const audioTask = startAudioRecording();
      const freshLoc = await syncLocation();
      console.log("[DEBUG] Position Lock:", freshLoc);

      if (!freshLoc) {
        throw new Error("GEOLOCATION_TIMEOUT: Ensure GPS is enabled and permissions granted.");
      }

      const sosRecord = await transmitSOS(freshLoc);
      if (sosRecord) {
        audioTask.then(async (audioUrl) => {
          if (audioUrl && sosRecord.id) {
            console.log("[DEBUG] Syncing Situational Audio...");
            await fetch('/api/sos', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: sosRecord.id, audioUrl })
            }).catch(() => { });
          }
        });
      }
    } catch (e: any) {
      console.error("[CRITICAL] Broadcast Interrupted:", e.message);
      setError(e.message || "SIGNAL_TRANSMISSION_ERROR");
      setStatus("idle");
    }
  };

  const transmitSOS = async (loc: { lat: number, lng: number }, audioUrl?: string) => {
    console.log("[SOS] Transmitting signal to Command Center...");
    setStatus("sending");
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: loc.lat,
          lng: loc.lng,
          message: message,
          battery: batteryLevel,
          isOffline,
          isBatteryOptimized,
          audioUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log("[SUCCESS] SOS Handshake confirmed:", data.data.id);
        setStatus("sent");
        setActiveSOS(data.data);
        localStorage.setItem('active_sos', JSON.stringify(data.data));
        return data.data;
      } else {
        console.error("[FAILED] HQ rejected signal:", data.error);
        setError(data.error || "HQ SERVER REJECTED SIGNAL");
        setStatus("idle");
        return null;
      }
    } catch (e) {
      console.error("[FAILED] Network Transceiver Error:", e);
      setError("NETWORK ERROR: CANNOT REACH HQ");
      setStatus("idle");
      return null;
    }
  };

  const handleResolve = async () => {
    setStatus("resolved");
    localStorage.removeItem('active_sos');
    setTimeout(() => setStatus("idle"), 5000);
  };

  return (
    <div className="victim-app-v4 white-theme">
      <div className="app-shell">
        <header className="v4-header">
          <div className="v4-brand">
            <div className="pulse-orb"></div>
            <h1>{t.app_title} <span>{t.v_version}</span></h1>
          </div>
          <div className="flex gap-2 items-center">
            <div className="lang-box">
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
            <button className="refresh-loc" onClick={() => syncLocation()}>
              <RefreshCcw size={16} className={locMethod.includes("ACQUIRING") ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {nearbyDZ && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="area-safety-alert">
            <AlertTriangle size={18} />
            <div>
              <strong>{t.situational_awareness}: {nearbyDZ.severity} {t.risk}</strong>
              <p>{nearbyDZ.description}</p>
            </div>
          </motion.div>
        )}

        <section className="telemetry-box">
          <div className="tele-row">
            <span className="tele-label"><Battery size={14} /> {t.bat_status}</span>
            <span className={clsx("tele-val", batteryLevel < 20 ? "text-red-500" : "text-emerald-500")}>{batteryLevel}%</span>
          </div>
          <div className="tele-row">
            <span className="tele-label"><MapPin size={14} /> {t.loc_protocol}</span>
            <span className="tele-val">{locMethod}</span>
          </div>
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mesh-telemetry-active"
              >
                <div className="tele-row">
                  <span className="tele-label"><Radio size={14} /> ACTIVE RELAY</span>
                  <span className="tele-val text-orange-500">{activeNode || "SEARCHING..."}</span>
                </div>
                <div className="tele-row">
                  <span className="tele-label"><Activity size={14} /> MESH SIGNAL</span>
                  <span className="tele-val text-blue-500">-{meshSignal} dBm</span>
                </div>
                <div className="tele-row">
                  <span className="tele-label"><Globe size={14} /> HOP COUNT</span>
                  <span className="tele-val">2 HOPS (VIA {meshNodes} NODES)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <main className="v4-main">
          <AnimatePresence mode="wait">
            {status === "sent" ? (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="sent-status">
                <div className="status-h">
                  <div className={clsx("check-outer", activeSOS?.status === 'Rescued' && "rescued")}>
                    {activeSOS?.status === 'Rescued' ? <Shield size={40} /> : <CheckCircle2 size={40} />}
                  </div>
                  <h2 className="status-title">
                    {activeSOS?.status === 'Rescued' ? t.rescue_arrived :
                      activeSOS?.assignedTeam ? t.help_on_way : t.signal_broadcasted}
                  </h2>
                  <p className="id-tag">REF: {activeSOS?.id}</p>
                </div>

                {activeSOS?.assignedTeam ? (
                  <div className="rescue-tracking">
                    {!showTracking ? (
                      <div className="help-arrival-box">
                        <div className="pulse-marker red"></div>
                        <div className="help-txt-box">
                          <h3>{t.help_on_way}</h3>
                          <p>{activeSOS.assignedTeam.name} {t.enroute_log}</p>
                        </div>
                        <button className="btn-track-live" onClick={() => setShowTracking(true)}>
                          <Navigation size={18} /> {t.track_live}
                        </button>
                      </div>
                    ) : (
                      <div className="live-tracking-interface">
                        <div className="track-h">
                          <button className="btn-track-back" onClick={() => setShowTracking(false)}><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /></button>
                          <div>
                            <h3>{t.sar_unit}: {activeSOS.assignedTeam.name}</h3>
                            <p className="track-msg">{activeSOS.assignedTeam.status} • {activeSOS.assignedTeam.eta}</p>
                          </div>
                        </div>

                        <div className="live-map-wrapper">
                          {location && (
                            <VictimMap
                              victimLoc={[location.lat, location.lng]}
                              teamLoc={[activeSOS.assignedTeam.lat, activeSOS.assignedTeam.lng]}
                              teamName={activeSOS.assignedTeam.name}
                              status={activeSOS.assignedTeam.status}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="waiting-box">
                    <Loader2 className="animate-spin" size={20} />
                    <p>{t.coms_active}</p>
                    <span>{t.waiting_allotment}</span>
                  </div>
                )}

                <div className="sent-actions">
                  <button onClick={handleResolve} className="btn-resolve"><UserCheck size={18} /> {t.i_am_safe}</button>
                  <button onClick={() => { localStorage.removeItem('active_sos'); setStatus('idle'); }} className="btn-back">{t.cancel_signal}</button>
                </div>
              </motion.div>
            ) : status === "resolved" ? (
              <motion.div key="resolved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sent-status resolved">
                <div className="check-outer safe"><Shield size={60} /></div>
                <h2>{t.status_secured}</h2>
                <p>{t.resolution_logged}</p>
              </motion.div>
            ) : (
              <motion.div key="form" className="sos-panel">
                <div className="grid-section">
                  <label className="sect-label">
                    {message.includes('NATURAL DISASTER') ? t.what_is_situation : t.identify_emergency}
                  </label>

                  <div className="cond-grid-v4">
                    {message.includes('NATURAL DISASTER') ? (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="sub-grid-reveal">
                        {DISASTER_SUB_TYPES.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => { setSubCategory(sub.label); setMessage(`NATURAL DISASTER: ${sub.label}`); }}
                            className={clsx("v4-cond-btn sub", subCategory === sub.label && "active")}
                            style={{ '--accent': sub.color } as any}
                          >
                            <sub.icon size={26} />
                            <span>{sub.label}</span>
                          </button>
                        ))}
                        <button className="btn-go-back" onClick={() => { setMessage(""); setSubCategory(null); }}>
                          {t.back_to_main}
                        </button>
                      </motion.div>
                    ) : (
                      QUICK_CONDITIONS(t).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setMessage(c.label); setSubCategory(null); }}
                          className={clsx("v4-cond-btn", message === c.label && "active")}
                          style={{ '--accent': c.color } as any}
                        >
                          <c.icon size={26} />
                          <span>{c.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid-section">
                  <label className="sect-label">SITUATIONAL INTEL (OPTIONAL)</label>
                  <textarea
                    className="v4-message-input"
                    placeholder="Describe your situation or list injuries..."
                    value={message.includes(':') ? message.split(': ')[1] : message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="v4-sos-barrier">
                  <button
                    className={clsx(
                      "v4-sos-btn",
                      (message && (message !== 'NATURAL DISASTER' || subCategory)) && "ready",
                      status !== "idle" && "busy"
                    )}
                    onClick={handleSendSOS}
                    disabled={status !== "idle" || (message === 'NATURAL DISASTER' && !subCategory)}
                  >
                    <div className="shimmer"></div>
                    <span className="btn-txt">
                      <Mic size={22} style={{ marginBottom: '-4px', marginRight: '8px' }} />
                      {status === "locating" ? "ACQUIRING POSITION..." :
                        status === "sending" ? "UPLOADING SIGNAL..." :
                          (message === 'NATURAL DISASTER' && !subCategory) ? t.choose_situation : t.activate_sos}
                    </span>
                  </button>
                  {(status === "locating" || status === "sending") && (
                    <div className="transmission-log">
                      <div className="spinner-sm"></div>
                      <span>MISSION LOG: {status.toUpperCase()}...</span>
                    </div>
                  )}
                </div>

                <button className="v4-danger-report-btn" onClick={() => setIsReportingDanger(true)}>
                  <AlertTriangle size={14} /> {t.community_feedback}
                </button>
                {error && <div className="v4-error"><AlertTriangle size={18} /> <p>{error}</p></div>}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <div className="v4-footer">
          <div className="v4-voice-trigger" onClick={startListening}>
            <div className="ai-mic-btn">
              <Mic size={24} />
            </div>
            <div className="ai-label">
              <span>AI VOICE ASSISTANT</span>
              <p>SPEAK EMERGENCY TYPE</p>
            </div>
          </div>

          <div className="footer-controls">
            <div className={clsx("v4-mesh-toggle", isOffline && "on")} onClick={() => setIsOffline(!isOffline)}>
              <Radio size={16} /> <span>{isOffline ? t.mesh_mode : t.net_online}</span>
            </div>
            <div className={clsx("v4-battery-toggle", isBatteryOptimized && "on")} onClick={() => setIsBatteryOptimized(!isBatteryOptimized)}>
              <Zap size={16} /> <span>{isBatteryOptimized ? t.lt_pwr : t.hi_pwr}</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ai-voice-overlay"
          >
            <div className="ai-orb-container">
              <div className={clsx("ai-orb", aiStatus)}></div>
              <div className="ai-waves">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div className="ai-transcript">
              <span className="status-label">{aiStatus.toUpperCase()}</span>
              <p className="transcript-text">{speechTranscript || "..."}</p>
            </div>
            <button className="btn-close-ai" onClick={() => setIsListening(false)}>CANCEL VOICE</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUDDEN PROXIMITY MODAL */}
      <AnimatePresence>
        {showAlertModal && nearbyDZ && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="immersive-modal-overlay">
            <motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} className="immersive-modal-content threat">
              <div className="threat-icon-box pulse">
                <AlertTriangle size={48} />
              </div>
              <h2>{t.situational_awareness}</h2>
              <p>{nearbyDZ.severity} {t.risk}</p>
              <div className="threat-desc">
                "{nearbyDZ.description}"
              </div>
              <button className="btn-ack" onClick={() => setShowAlertModal(false)}>{t.proceed_caution}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT DANGER MODAL */}
      <AnimatePresence>
        {isReportingDanger && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="immersive-modal-overlay">
            <motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} className="immersive-modal-content report">
              <h3>{t.secure_community}</h3>
              <p className="modal-sub">{t.warn_others}</p>

              <textarea
                placeholder={t.describe_hazard}
                value={dangerFeedback}
                onChange={(e) => setDangerFeedback(e.target.value)}
                className="modal-textarea"
              />

              <div className="modal-actions-grid">
                <button onClick={() => submitDangerReport('High')} className="btn-dz-submit pink">{t.women_safety}</button>
                <button onClick={() => submitDangerReport('High')} className="btn-dz-submit purple">{t.child_missing}</button>
                <button onClick={() => submitDangerReport('Moderate')} className="btn-dz-submit blue">{t.natural_disaster}</button>
              </div>
              <button className="btn-cancel" onClick={() => setIsReportingDanger(false)}>{t.cancel_signal}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
  .ai-voice-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .ai-orb-container {
    position: relative;
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 3rem;
  }

  .ai-orb {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
    filter: blur(20px);
    transition: all 0.5s;
    opacity: 0.8;
  }

  .ai-orb.listening {
    animation: orb-float 2s infinite, orb-glow 1.5s infinite alternate;
    width: 110px;
    height: 110px;
  }

  .ai-orb.analyzing {
    background: linear-gradient(135deg, #10b981, #3b82f6);
    width: 120px;
    height: 120px;
    animation: orb-rotate 1s infinite linear;
    filter: blur(15px);
  }

  .ai-orb.triggering {
    background: #ef4444;
    width: 150px;
    height: 150px;
    filter: blur(30px);
    animation: orb-pulse 0.5s infinite;
  }

  @keyframes orb-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes orb-glow {
    from {
      opacity: 0.5;
      filter: blur(20px);
    }
    to {
      opacity: 0.9;
      filter: blur(30px);
    }
  }

  @keyframes orb-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes orb-pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.8;
    }
  }

  .ai-waves {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .ai-waves span {
    width: 4px;
    height: 30px;
    background: white;
    border-radius: 10px;
    opacity: 0.5;
  }

  .ai-waves span:nth-child(1) {
    animation: wave 1s infinite;
  }

  .ai-waves span:nth-child(2) {
    animation: wave 1.2s infinite 0.2s;
    height: 50px;
  }

  .ai-waves span:nth-child(3) {
    animation: wave 0.8s infinite 0.4s;
  }

  @keyframes wave {
    0% {
      transform: scaleY(0.5);
    }
    50% {
      transform: scaleY(1.5);
    }
    100% {
      transform: scaleY(0.5);
    }
  }

  .ai-transcript {
    text-align: center;
    margin-bottom: 3rem;
    width: 100%;
    max-width: 400px;
  }

  .status-label {
    font-size: 0.7rem;
    font-weight: 950;
    color: #3b82f6;
    letter-spacing: 2px;
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.5rem;
  }

  .transcript-text {
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
    margin: 10px auto 0;
    font-style: italic;
    max-width: 300px;
    line-height: 1.4;
    word-break: break-word;
  }

  .btn-close-ai {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-close-ai:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .victim-app-v4 :global(*::-webkit-scrollbar) {
    width: 5px;
    height: 5px;
  }

  .victim-app-v4 :global(*::-webkit-scrollbar-track) {
    background: transparent;
  }

  .victim-app-v4 :global(*::-webkit-scrollbar-thumb) {
    background: #e2e8f0;
    border-radius: 10px;
  }

  .victim-app-v4 :global(*::-webkit-scrollbar-thumb:hover) {
    background: #cbd5e1;
  }

  .victim-app-v4.dark :global(*::-webkit-scrollbar-thumb) {
    background: #475569;
  }

  .victim-app-v4.dark :global(*::-webkit-scrollbar-thumb:hover) {
    background: #64748b;
  }

  .victim-app-v4 {
    background: var(--bg-main);
    color: var(--text-main);
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    transition: background 0.3s;
  }

  .victim-app-v4.light {
    --bg-main: #f8fafc;
    --text-main: #0f172a;
    --bg-glass: rgba(255, 255, 255, 0.8);
  }

  .victim-app-v4.dark {
    --bg-main: #0f172a;
    --text-main: #f8fafc;
    --bg-glass: rgba(15, 23, 42, 0.8);
  }

  .app-shell {
    flex: 1;
    max-width: 450px;
    margin: 0 auto;
    width: 100%;
    background: var(--bg-main);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    box-sizing: border-box;
    position: relative;
  }

  .victim-app-v4.dark .app-shell {
    border-color: #1e293b;
  }

  .v4-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    width: 100%;
    flex-shrink: 0;
  }

  .v4-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pulse-orb {
    width: 10px;
    height: 10px;
    background: #ef4444;
    border-radius: 50%;
    box-shadow: 0 0 10px #ef4444;
    flex-shrink: 0;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
    100% {
      opacity: 1;
    }
  }

  .v4-brand h1 {
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin: 0;
    line-height: 1.2;
  }

  .v4-brand span {
    color: #ef4444;
    font-size: 0.9em;
  }

  .v4-header > div:last-child {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .theme-tog {
    background: #e2e8f0;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0f172a;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .victim-app-v4.dark .theme-tog {
    background: #1e293b;
    color: #f8fafc;
  }

  .theme-tog:hover {
    transform: scale(1.05);
  }

  .lang-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    padding: 6px 12px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .victim-app-v4.dark .lang-box {
    background: #1e293b;
  }

  .lang-select {
    background: none;
    border: none;
    font-size: 0.7rem;
    font-weight: 800;
    color: #475569;
    outline: none;
    cursor: pointer;
    padding: 0;
    min-width: 60px;
  }

  .victim-app-v4.dark .lang-select {
    color: #cbd5e1;
  }

  .refresh-loc {
    background: #f1f5f9;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #475569;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .victim-app-v4.dark .refresh-loc {
    background: #1e293b;
    color: #cbd5e1;
  }

  .refresh-loc:hover {
    transform: scale(1.05);
  }

  .area-safety-alert {
    background: #fee2e2;
    border-left: 4px solid #ef4444;
    padding: 1rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    color: #b91c1c;
    margin-bottom: 1.5rem;
    border-radius: 12px;
    font-size: 0.85rem;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .area-safety-alert {
    background: rgba(239, 68, 68, 0.1);
    border-left-color: #ef4444;
    color: #fca5a5;
  }

  .area-safety-alert > svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .area-safety-alert > div {
    flex: 1;
    min-width: 0;
  }

  .area-safety-alert strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .area-safety-alert p {
    margin: 0;
    font-size: 0.75rem;
    opacity: 0.9;
    line-height: 1.4;
  }

  .telemetry-box {
    background: #f8fafc;
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    gap: 0.75rem;
    display: flex;
    flex-direction: column;
    margin-bottom: 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .telemetry-box {
    background: #1e293b;
    border-color: #334155;
  }

  .tele-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 800;
    width: 100%;
  }

  .tele-label {
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .victim-app-v4.dark .tele-label {
    color: #94a3b8;
  }

  .tele-val {
    color: #0f172a;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
  }

  .victim-app-v4.dark .tele-val {
    color: #f8fafc;
  }

  .mesh-telemetry-active {
    padding-top: 0.75rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .victim-app-v4.dark .mesh-telemetry-active {
    border-top-color: #334155;
  }

  .v4-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-y: auto;
    padding-bottom: 0.5rem;
    box-sizing: border-box;
  }

  .grid-section {
    margin-bottom: 2rem;
    width: 100%;
  }

  .sect-label {
    font-size: 0.7rem;
    font-weight: 900;
    color: #94a3b8;
    letter-spacing: 1px;
    margin-bottom: 1rem;
    display: block;
    text-transform: uppercase;
    width: 100%;
  }

  .victim-app-v4.dark .sect-label {
    color: #64748b;
  }

  .cond-grid-v4 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    width: 100%;
  }

  .v4-cond-btn {
    background: #fff;
    border: 2px solid #f1f5f9;
    border-radius: 20px;
    padding: 1.25rem 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    color: #64748b;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .v4-cond-btn {
    background: #1e293b;
    border-color: #334155;
    color: #cbd5e1;
  }

  .v4-cond-btn span {
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.2;
  }

  .v4-cond-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: #f8fafc;
    transform: translateY(-4px);
    box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.05);
  }

  .victim-app-v4.dark .v4-cond-btn.active {
    background: rgba(30, 41, 59, 0.8);
  }

  .v4-cond-btn.active :global(svg) {
    color: var(--accent) !important;
  }

  .sub-grid-reveal {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: #f8fafc;
    padding: 1rem;
    border-radius: 24px;
    border: 1.5px solid #e2e8f0;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .sub-grid-reveal {
    background: #1e293b;
    border-color: #334155;
  }

  .v4-cond-btn.sub {
    background: white;
    padding: 1.25rem 0.5rem;
    border-radius: 18px;
    width: 100%;
  }

  .victim-app-v4.dark .v4-cond-btn.sub {
    background: #0f172a;
  }

  .v4-cond-btn.sub:nth-child(3) {
    grid-column: span 2;
  }

  .btn-go-back {
    grid-column: span 2;
    background: #f1f5f9;
    border: none;
    color: #64748b;
    padding: 1rem;
    border-radius: 16px;
    font-weight: 950;
    font-size: 0.7rem;
    margin-top: 0.5rem;
    cursor: pointer;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    transition: all 0.2s;
  }

  .victim-app-v4.dark .btn-go-back {
    background: #334155;
    color: #cbd5e1;
  }

  .btn-go-back:hover {
    transform: translateY(-1px);
  }

  .v4-message-input {
    width: 100%;
    height: 80px;
    background: #f8fafc;
    border: 2px solid #f1f5f9;
    border-radius: 16px;
    padding: 1rem;
    font-size: 0.85rem;
    font-family: inherit;
    resize: none;
    outline: none;
    transition: border-color 0.2s;
    margin-top: -0.5rem;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .v4-message-input {
    background: #1e293b;
    border-color: #334155;
    color: #f8fafc;
  }

  .v4-message-input:focus {
    border-color: #cbd5e1;
  }

  .victim-app-v4.dark .v4-message-input:focus {
    border-color: #475569;
  }

  .transmission-log {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 1rem;
    color: #64748b;
    font-size: 0.65rem;
    font-weight: 950;
    font-family: 'JetBrains Mono';
    width: 100%;
  }

  .victim-app-v4.dark .transmission-log {
    color: #94a3b8;
  }

  .spinner-sm {
    width: 12px;
    height: 12px;
    border: 2px solid #e2e8f0;
    border-top-color: #ef4444;
    border-radius: 50%;
    animation: spin 0.8s infinite linear;
  }

  .victim-app-v4.dark .spinner-sm {
    border-color: #334155;
    border-top-color: #ef4444;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .v4-footer {
    margin-top: auto;
    padding-top: 1.5rem;
    width: 100%;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .v4-voice-trigger {
    background: linear-gradient(135deg, #0f172a, #1e293b);
    border: 1px solid #334155;
    padding: 1rem;
    border-radius: 24px;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    margin-bottom: 1.5rem;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .v4-voice-trigger:hover {
    border-color: #3b82f6;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
    transform: scale(1.02);
  }

  .ai-mic-btn {
    width: 48px;
    height: 48px;
    background: #3b82f6;
    color: white;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4);
    flex-shrink: 0;
  }

  .ai-label {
    flex: 1;
    min-width: 0;
  }

  .ai-label span {
    display: block;
    font-size: 0.8rem;
    font-weight: 950;
    color: white;
    line-height: 1.2;
  }

  .ai-label p {
    font-size: 0.6rem;
    font-weight: 800;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.2;
  }

  .footer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    width: 100%;
    gap: 1rem;
  }

  .v4-mesh-toggle,
  .v4-battery-toggle {
    font-size: 0.7rem;
    font-weight: 900;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: all 0.2s;
    flex: 1;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid transparent;
  }

  .victim-app-v4.dark .v4-mesh-toggle,
  .victim-app-v4.dark .v4-battery-toggle {
    background: #1e293b;
    color: #94a3b8;
  }

  .v4-mesh-toggle.on {
    color: #f97316;
    background: #ffedd5;
    border-color: #fed7aa;
  }

  .victim-app-v4.dark .v4-mesh-toggle.on {
    background: rgba(249, 115, 22, 0.1);
    color: #fdba74;
    border-color: rgba(249, 115, 22, 0.3);
  }

  .v4-battery-toggle.on {
    color: #3b82f6;
    background: #dbeafe;
    border-color: #bfdbfe;
  }

  .victim-app-v4.dark .v4-battery-toggle.on {
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
  }

  .v4-mesh-toggle:hover,
  .v4-battery-toggle:hover {
    transform: translateY(-1px);
  }

  .v4-sos-barrier {
    width: 100%;
    margin-top: 1rem;
    box-sizing: border-box;
  }

  .v4-sos-btn {
    width: 100%;
    position: relative;
    height: 100px;
    border-radius: 28px;
    background: #f1f5f9;
    border: none;
    overflow: hidden;
    font-weight: 950;
    font-size: 1rem;
    letter-spacing: 1px;
    color: #cbd5e1;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .v4-sos-btn {
    background: #1e293b;
    color: #64748b;
  }

  .btn-txt {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .v4-sos-btn:active {
    transform: scale(0.95);
  }

  .v4-sos-btn.busy {
    font-size: 1.1rem;
    cursor: wait;
    background: #334155;
    color: #94a3b8;
  }

  .victim-app-v4.dark .v4-sos-btn.busy {
    background: #0f172a;
    color: #64748b;
  }

  .v4-sos-btn.ready {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 15px 35px -10px rgba(239, 68, 68, 0.6);
    transform: translateY(-2px);
  }

  .shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    100% {
      left: 200%;
    }
  }

  .sent-status {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
    width: 100%;
    text-align: center;
    box-sizing: border-box;
  }

  .status-h {
    text-align: center;
    width: 100%;
  }

  .check-outer {
    width: 70px;
    height: 70px;
    background: #ecfdf5;
    color: #10b981;
    border: 2px solid #10b981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    transition: all 0.5s;
    flex-shrink: 0;
  }

  .victim-app-v4.dark .check-outer {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-color: #10b981;
  }

  .check-outer.rescued {
    background: #eff6ff;
    color: #3b82f6;
    border-color: #3b82f6;
    transform: scale(1.1);
  }

  .victim-app-v4.dark .check-outer.rescued {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-color: #3b82f6;
  }

  .status-title {
    font-size: 1.25rem;
    font-weight: 950;
    margin-top: 1rem;
    color: #0f172a;
    line-height: 1.3;
    padding: 0 1rem;
  }

  .victim-app-v4.dark .status-title {
    color: #f8fafc;
  }

  .id-tag {
    font-family: 'JetBrains Mono';
    font-size: 0.75rem;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 100px;
    display: inline-block;
    margin-top: 0.75rem;
    font-weight: 800;
    color: #64748b;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .id-tag {
    background: #1e293b;
    color: #94a3b8;
  }

  .rescue-tracking {
    background: #eff6ff;
    border: 1px solid #3b82f633;
    border-radius: 20px;
    text-align: left;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .rescue-tracking {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
  }

  .help-arrival-box {
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    width: 100%;
    box-sizing: border-box;
  }

  .pulse-marker.red {
    width: 10px;
    height: 10px;
    background: #ef4444;
    border-radius: 50%;
    box-shadow: 0 0 10px #ef4444;
    animation: ping 1.5s infinite;
    flex-shrink: 0;
  }

  @keyframes ping {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(3);
      opacity: 0;
    }
  }

  .help-txt-box {
    flex: 1;
    min-width: 0;
  }

  .help-txt-box h3 {
    font-size: 0.95rem;
    font-weight: 950;
    color: #1e3a8a;
    margin: 0 0 4px 0;
    line-height: 1.2;
  }

  .victim-app-v4.dark .help-txt-box h3 {
    color: #60a5fa;
  }

  .help-txt-box p {
    font-size: 0.7rem;
    color: #3b82f6;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
    line-height: 1.2;
  }

  .victim-app-v4.dark .help-txt-box p {
    color: #93c5fd;
  }

  .btn-track-live {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .btn-track-live:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }

  .live-tracking-interface {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .track-h {
    padding: 1.25rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    border-bottom: 1px solid #dbeafe;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .track-h {
    border-bottom-color: rgba(59, 130, 246, 0.2);
  }

  .btn-track-back {
    background: #dbeafe;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1e40af;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .victim-app-v4.dark .btn-track-back {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
  }

  .btn-track-back:hover {
    transform: scale(1.05);
  }

  .track-h > div {
    flex: 1;
    min-width: 0;
  }

  .track-h h3 {
    font-size: 0.85rem;
    font-weight: 900;
    margin: 0 0 4px 0;
    color: #1e3a8a;
    line-height: 1.2;
  }

  .victim-app-v4.dark .track-h h3 {
    color: #60a5fa;
  }

  .track-msg {
    font-size: 0.65rem;
    margin: 0;
    color: #3b82f6;
    font-weight: 700;
    opacity: 0.8;
    text-transform: uppercase;
    line-height: 1.2;
  }

  .victim-app-v4.dark .track-msg {
    color: #93c5fd;
  }

  .live-map-wrapper {
    height: 260px;
    background: #f8fafc;
    width: 100%;
  }

  .victim-app-v4.dark .live-map-wrapper {
    background: #1e293b;
  }

  .sent-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  .btn-resolve {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 1.25rem;
    border-radius: 16px;
    font-weight: 900;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
    transition: all 0.2s;
    cursor: pointer;
  }

  .btn-resolve:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
  }

  .btn-back {
    background: #f1f5f9;
    color: #64748b;
    border: none;
    padding: 1rem;
    border-radius: 16px;
    font-weight: 800;
    font-size: 0.8rem;
    width: 100%;
    transition: all 0.2s;
    cursor: pointer;
  }

  .victim-app-v4.dark .btn-back {
    background: #1e293b;
    color: #94a3b8;
  }

  .btn-back:hover {
    transform: translateY(-1px);
  }

  .waiting-box {
    text-align: center;
    padding: 2.5rem 1rem;
    background: #f8fafc;
    border-radius: 20px;
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .waiting-box {
    background: #1e293b;
    color: #64748b;
  }

  .waiting-box p {
    font-size: 0.75rem;
    font-weight: 900;
    color: #475569;
    margin: 0;
    line-height: 1.2;
  }

  .victim-app-v4.dark .waiting-box p {
    color: #94a3b8;
  }

  .waiting-box span {
    font-size: 0.65rem;
    font-weight: 700;
    opacity: 0.6;
    line-height: 1.2;
  }

  .v4-danger-report-btn {
    margin-top: 1.5rem;
    background: #fff1f2;
    color: #e11d48;
    border: 1px dashed #fda4af;
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 0.65rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .v4-danger-report-btn {
    background: rgba(225, 29, 72, 0.1);
    color: #fda4af;
    border-color: rgba(253, 164, 175, 0.3);
  }

  .v4-danger-report-btn:hover {
    background: #ffe4e6;
  }

  .victim-app-v4.dark .v4-danger-report-btn:hover {
    background: rgba(225, 29, 72, 0.2);
  }

  .v4-error {
    background: #fee2e2;
    border-left: 4px solid #ef4444;
    padding: 1rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    color: #b91c1c;
    margin-top: 1.5rem;
    border-radius: 12px;
    font-size: 0.85rem;
    width: 100%;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .v4-error {
    background: rgba(239, 68, 68, 0.1);
    border-left-color: #ef4444;
    color: #fca5a5;
  }

  .v4-error p {
    margin: 0;
    flex: 1;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  /* IMMERSIVE MODALS */
  .immersive-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
  }

  .immersive-modal-content {
    background: white;
    width: 100%;
    max-width: 400px;
    border-radius: 32px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
  }

  .victim-app-v4.dark .immersive-modal-content {
    background: #1e293b;
    color: #f8fafc;
  }

  .immersive-modal-content.threat {
    border: 2px solid #ef4444;
  }

  .threat-icon-box {
    width: 90px;
    height: 90px;
    background: #fef2f2;
    color: #ef4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
  }

  .victim-app-v4.dark .threat-icon-box {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
  }

  .threat-icon-box.pulse {
    animation: alert-pulse 1s infinite;
  }

  @keyframes alert-pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      transform: scale(1.05);
      box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  .threat-desc {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 16px;
    font-family: 'JetBrains Mono';
    font-size: 0.8rem;
    font-weight: 700;
    color: #475569;
    margin: 1.5rem 0;
    border: 1px solid #e2e8f0;
    line-height: 1.4;
  }

  .victim-app-v4.dark .threat-desc {
    background: #0f172a;
    color: #94a3b8;
    border-color: #334155;
  }

  .btn-ack {
    width: 100%;
    background: #0f172a;
    color: white;
    border: none;
    padding: 1.25rem;
    border-radius: 16px;
    font-weight: 900;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .victim-app-v4.dark .btn-ack {
    background: #3b82f6;
  }

  .btn-ack:hover {
    transform: translateY(-1px);
  }

  .immersive-modal-content h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.3;
  }

  .immersive-modal-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 900;
    line-height: 1.3;
  }

  .modal-sub {
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 1.5rem;
    line-height: 1.4;
  }

  .victim-app-v4.dark .modal-sub {
    color: #94a3b8;
  }

  .modal-textarea {
    width: 100%;
    height: 120px;
    background: #f8fafc;
    border: 1.5px solid #f1f5f9;
    border-radius: 16px;
    padding: 1rem;
    font-size: 0.85rem;
    font-family: inherit;
    resize: none;
    outline: none;
    margin-bottom: 1.5rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .victim-app-v4.dark .modal-textarea {
    background: #0f172a;
    border-color: #334155;
    color: #f8fafc;
  }

  .modal-textarea:focus {
    border-color: #e2e8f0;
  }

  .victim-app-v4.dark .modal-textarea:focus {
    border-color: #475569;
  }

  .modal-actions-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    width: 100%;
  }

  .btn-dz-submit {
    border: none;
    padding: 1rem;
    border-radius: 14px;
    color: white;
    font-weight: 900;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .btn-dz-submit:active {
    transform: scale(0.98);
  }

  .btn-dz-submit.pink {
    background: #ec4899;
    box-shadow: 0 8px 15px -4px rgba(236, 72, 153, 0.4);
  }

  .btn-dz-submit.purple {
    background: #8b5cf6;
    box-shadow: 0 8px 15px -4px rgba(139, 92, 246, 0.4);
  }

  .btn-dz-submit.blue {
    background: #3b82f6;
    box-shadow: 0 8px 15px -4px rgba(59, 130, 246, 0.4);
  }

  .btn-cancel {
    background: none;
    border: none;
    color: #94a3b8;
    font-weight: 800;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
    margin-top: 0.5rem;
  }

  .victim-app-v4.dark .btn-cancel {
    color: #64748b;
  }

  .btn-cancel:hover {
    color: #64748b;
  }

  .victim-app-v4.dark .btn-cancel:hover {
    color: #94a3b8;
  }

  .sent-status.resolved {
    padding: 2rem 1rem;
  }

  .sent-status.resolved h2 {
    font-size: 1.25rem;
    font-weight: 900;
    margin: 1rem 0 0.5rem;
    color: #0f172a;
  }

  .victim-app-v4.dark .sent-status.resolved h2 {
    color: #f8fafc;
  }

  .sent-status.resolved p {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
  }

  .victim-app-v4.dark .sent-status.resolved p {
    color: #94a3b8;
  }

  .check-outer.safe {
    width: 80px;
    height: 80px;
    background: #eff6ff;
    color: #3b82f6;
    border-color: #3b82f6;
  }

  .victim-app-v4.dark .check-outer.safe {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-color: #3b82f6;
  }

  /* Responsive adjustments */
  @media (max-width: 400px) {
    .app-shell {
      padding: 1rem;
    }

    .v4-header {
      margin-bottom: 1rem;
    }

    .cond-grid-v4 {
      gap: 0.5rem;
    }

    .v4-cond-btn {
      padding: 1rem 0.5rem;
      gap: 8px;
    }

    .v4-cond-btn :global(svg) {
      width: 22px;
      height: 22px;
    }

    .v4-cond-btn span {
      font-size: 0.6rem;
    }

    .v4-sos-btn {
      height: 90px;
    }

    .btn-txt {
      font-size: 0.8rem;
      gap: 8px;
    }

    .btn-txt :global(svg) {
      width: 24px;
      height: 24px;
    }

    .v4-message-input {
      height: 70px;
      padding: 0.75rem;
      font-size: 0.8rem;
    }

    .telemetry-box {
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .tele-row {
      font-size: 0.7rem;
    }

    .v4-voice-trigger {
      padding: 0.75rem;
      margin-bottom: 1rem;
    }

    .ai-mic-btn {
      width: 42px;
      height: 42px;
      border-radius: 14px;
    }

    .ai-label span {
      font-size: 0.75rem;
    }

    .ai-label p {
      font-size: 0.55rem;
    }

    .v4-footer {
      padding-top: 1rem;
    }

    .footer-controls {
      gap: 0.5rem;
    }

    .v4-mesh-toggle,
    .v4-battery-toggle {
      font-size: 0.65rem;
      padding: 0.5rem;
    }

    .immersive-modal-overlay {
      padding: 1rem;
    }

    .immersive-modal-content {
      padding: 1.5rem;
      border-radius: 24px;
    }

    .help-arrival-box {
      padding: 1rem;
      gap: 0.75rem;
    }

    .btn-track-live {
      padding: 8px 12px;
      font-size: 0.65rem;
    }

    .track-h {
      padding: 1rem;
    }

    .live-map-wrapper {
      height: 220px;
    }

    .sent-actions {
      gap: 0.5rem;
    }

    .btn-resolve,
    .btn-back {
      padding: 1rem;
    }

    .waiting-box {
      padding: 2rem 1rem;
    }
  }

  @media (max-width: 350px) {
    .v4-brand h1 {
      font-size: 1rem;
    }

    .v4-header > div:last-child {
      gap: 0.5rem;
    }

    .theme-tog,
    .refresh-loc {
      width: 32px;
      height: 32px;
    }

    .lang-box {
      padding: 4px 8px;
    }

    .lang-select {
      min-width: 50px;
      font-size: 0.65rem;
    }

    .cond-grid-v4 {
      grid-template-columns: 1fr;
    }

    .sub-grid-reveal {
      grid-template-columns: 1fr;
    }

    .v4-cond-btn.sub:nth-child(3) {
      grid-column: span 1;
    }

    .btn-go-back {
      grid-column: span 1;
    }
  }
`}</style>
    </div >
  );
}
