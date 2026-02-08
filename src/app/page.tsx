
"use client";

import Link from 'next/link';
import { Shield, AlertCircle, LayoutDashboard, Radio, Wifi, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <header className="hero-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="branding"
        >
          <div className="logo-wrapper">
            <Shield size={48} className="text-red-500" />
            <div className="pulse-ring"></div>
          </div>
          <h1>AAPDA MATRIX</h1>
          <p className="tagline">Next-Gen AI Disaster Response Network</p>
        </motion.div>
      </header>

      <main className="choices-grid">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/sos" className="choice-card victim">
            <div className="card-icon">
              <AlertCircle size={40} />
            </div>
            <div className="card-content">
              <h2>I NEED HELP</h2>
              <p>Victim Port - Report Emergency SOS</p>
              <ul className="features">
                <li><Wifi size={14} /> One-Tap SOS</li>
                <li><Radio size={14} /> Bluetooth Mesh Mode</li>
                <li><MapPin size={14} /> Auto-Location</li>
              </ul>
            </div>
            <div className="card-action">Open Victim App →</div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/dashboard" className="choice-card authority">
            <div className="card-icon">
              <LayoutDashboard size={40} />
            </div>
            <div className="card-content">
              <h2>COMMAND CENTER</h2>
              <p>Authority Portal - Rescue Coordination</p>
              <ul className="features">
                <li><Shield size={14} /> AI Triage Engine</li>
                <li><MapPin size={14} /> Real-time Mapping</li>
                <li><AlertCircle size={14} /> Incident Management</li>
              </ul>
            </div>
            <div className="card-action">Enter Dashboard →</div>
          </Link>
        </motion.div>
      </main>

      <footer className="landing-footer">
        <p>Built for the first critical 72 hours of disaster response.</p>
      </footer>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          background: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Inter', sans-serif;
          background-image: 
            radial-gradient(circle at 20% 20%, rgba(239, 68, 68, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
        }

        .hero-section {
          text-align: center;
          margin-bottom: 4rem;
        }

        .logo-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid #ef4444;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }

        h1 { font-size: 3rem; font-weight: 900; letter-spacing: -2px; margin: 0; }
        .tagline { font-size: 1.125rem; color: #94a3b8; margin-top: 0.5rem; }

        .choices-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1000px;
          width: 100%;
        }

        .choice-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid #334155;
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-decoration: none;
          color: white;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          height: 100%;
        }

        .choice-card:hover {
          transform: translateY(-10px);
          background: rgba(30, 41, 59, 0.8);
          border-color: #475569;
        }

        .choice-card.victim:hover { box-shadow: 0 20px 40px -10px rgba(239, 68, 68, 0.2); border-color: #ef4444; }
        .choice-card.authority:hover { box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.2); border-color: #3b82f6; }

        .card-icon {
          width: 80px;
          height: 80px;
          background: #334155;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .victim .card-icon { color: #ef4444; }
        .authority .card-icon { color: #3b82f6; }

        .choice-card:hover .card-icon { transform: scale(1.1) rotate(-5deg); }

        .card-content h2 { margin: 0; font-size: 1.5rem; font-weight: 800; }
        .card-content p { color: #94a3b8; margin-top: 0.5rem; font-size: 0.875rem; }

        .features {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .card-action {
          margin-top: auto;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .victim .card-action { color: #f87171; }
        .authority .card-action { color: #60a5fa; }

        .landing-footer {
          margin-top: 4rem;
          opacity: 0.5;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .choices-grid { grid-template-columns: 1fr; }
          h1 { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}
