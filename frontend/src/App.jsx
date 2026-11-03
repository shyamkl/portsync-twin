import React, { useState, useEffect, useRef } from 'react';
import usePortSyncAlerts from './hooks/usePortSyncAlerts';
import YardMatrix from './YardMatrix';
import CommandMap from './CommandMap';
import SimulationLab from './SimulationLab';
import AnalyticsInsights from './AnalyticsInsights';

export default function App() {
  const [activeTab, setActiveTab] = useState('commandMap');
  
  // Real-time WebSocket Triage Notifications State & Connection Status
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Live Database Analytics Summary State from Python backend
  const [gateAnalytics, setGateAnalytics] = useState(null);
  
  // Ref to hold WebSocket instance for safe cleanup and reconnect handling
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Hook into teammate's alert hook for local component state sync
  const { alerts } = usePortSyncAlerts();

  // Fetch Gateway & Gate Analytics Summary periodically from FastAPI backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/analytics/summary');
        if (response.ok) {
          const data = await response.json();
          setGateAnalytics(data);
        }
      } catch (err) {
        console.error("Failed to fetch backend gate analytics summary:", err);
      }
    };

    fetchAnalytics();
    const analyticsInterval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(analyticsInterval);
  }, []);

  // 1. Global Background WebSocket Connection Listener
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = "ws://localhost:8000/ws/alerts";
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const alertData = JSON.parse(event.data);
            
            // Format packet for UI Toast rendering
            const notificationId = alertData.event_id || Date.now();
            const newNotification = {
              id: notificationId,
              title: alertData.priority ? `[${alertData.priority}] REEFER ANOMALY` : "CRITICAL ALERT",
              message: alertData.message || "Temperature disruption detected on reefer container.",
              containerId: alertData.container_id || "UNKNOWN",
              timestamp: alertData.timestamp || new Date().toISOString()
            };

            // 2. Append dynamically to liveNotifications state
            setLiveNotifications((prev) => [newNotification, ...prev]);

            // 3. Auto-dismiss Toast Alert after 5 seconds
            setTimeout(() => {
              setLiveNotifications((prev) => prev.filter((item) => item.id !== notificationId));
            }, 5000);

          } catch (err) {
            console.error("Failed to parse incoming alert JSON packet:", err);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          // 4. Safe Auto-Reconnect Logic after 3 seconds if backend disconnects or isn't ready
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const dismissToast = (id) => {
    setLiveNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#060913',
      color: '#f8fafc',
      fontFamily: 'Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0,
      position: 'relative'
    }}>
      {/* 5. Floating Top-Right Animated Toast Alert Banner Notification Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '380px',
        pointerEvents: 'none'
      }}>
        {liveNotifications.map((note) => (
          <div
            key={note.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderLeft: '4px solid #ef4444',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              padding: '14px 16px',
              boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.05em' }}>
                🚨 {note.title}
              </span>
              <button
                onClick={() => dismissToast(note.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                  padding: '2px 4px'
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.825rem', color: '#fecdd3', lineHeight: 1.4 }}>
              {note.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
              <span>Target: <strong style={{ color: '#f8fafc' }}>{note.containerId}</strong></span>
              <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CSS Keyframes for Top-Right Toast Slide-In Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Left Navigation Panel */}
      <div style={{
        width: '260px',
        backgroundColor: '#090d16',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        flexShrink: 0,
        height: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          {/* Logo / Brand Header */}
          <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#f8fafc', margin: 0 }}>
              PORTSYNC TWIN
            </h2>
            <span style={{ fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.025em' }}>
              Enterprise Console v2.4
            </span>
          </div>

          {/* Navigation Menu Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('commandMap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                backgroundColor: activeTab === 'commandMap' ? '#131c31' : 'transparent',
                color: activeTab === 'commandMap' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                borderLeft: activeTab === 'commandMap' ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              Command Map
            </button>

            <button
              onClick={() => setActiveTab('yardMatrix')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                backgroundColor: activeTab === 'yardMatrix' ? '#131c31' : 'transparent',
                color: activeTab === 'yardMatrix' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                borderLeft: activeTab === 'yardMatrix' ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              Yard Density Matrix
            </button>

            <button
              onClick={() => setActiveTab('simulationLab')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                backgroundColor: activeTab === 'simulationLab' ? '#131c31' : 'transparent',
                color: activeTab === 'simulationLab' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                borderLeft: activeTab === 'simulationLab' ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              Simulation Lab
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                backgroundColor: activeTab === 'analytics' ? '#131c31' : 'transparent',
                color: activeTab === 'analytics' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                borderLeft: activeTab === 'analytics' ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              Analytics &amp; Insights
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Status Box with WebSocket Connection State */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <span style={{ fontSize: '0.7rem', color: wsConnected ? '#22c55e' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: wsConnected ? '#22c55e' : '#ef4444', display: 'inline-block' }}></span> 
            {wsConnected ? 'STREAM ACTIVE' : 'STREAM RECONNECTING'}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
            Live Notifications: {liveNotifications.length}
          </span>
          {gateAnalytics && (
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', display: 'block', marginTop: '4px' }}>
              DB Logs: {gateAnalytics.gate_log_count} | Telemetry: {gateAnalytics.telemetry_count}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Workspace */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        padding: '24px 28px',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'commandMap' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '16px',
              flexShrink: 0
            }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>Command Map</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Real-time telemetry and spatial digital twin engine</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ backgroundColor: '#131c31', border: '1px solid #1e293b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#38bdf8' }}>
                  FastAPI Gateway: Online
                </span>
              </div>
            </div>

            {/* In-View Alert Summary Banner (Syncs with total active warnings) */}
            {alerts.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                border: '1px solid rgba(225, 29, 72, 0.4)',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '20px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚨 CRITICAL PHARMA / REEFER ANOMALY DETECTED ({alerts.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#fda4af' }}>
                    Latest: {alerts[0]?.container_id}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#fecdd3' }}>
                  {alerts[0]?.message}
                </p>
              </div>
            )}

            {/* Quick Status Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px', flexShrink: 0 }}>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Vessels</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>14 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>at berth</span></div>
                <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>+2 today</span>
              </div>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AGVs Operational</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>88% <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>42/48 active</span></div>
                <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>Optimal</span>
              </div>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Gate Log Records</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>{gateAnalytics ? gateAnalytics.gate_log_count : '---'} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>entries</span></div>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Live DB Sync</span>
              </div>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Alert Escalations</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>{alerts.length} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>live triggers</span></div>
                <span style={{ fontSize: '0.7rem', color: alerts.length > 0 ? '#ef4444' : '#22c55e' }}>{alerts.length > 0 ? 'Action Required' : 'All Clear'}</span>
              </div>
            </div>

            {/* Terminal Spatial Overlay Map Component Integration */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingLeft: '4px', paddingRight: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#38bdf8' }}>Terminal Spatial Overlay (JNPT Sector)</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Coordinates: 18.9500° N, 72.9500° E</span>
              </div>
              <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                <CommandMap />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'yardMatrix' && (
          <YardMatrix />
        )}

        {activeTab === 'simulationLab' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <SimulationLab />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <AnalyticsInsights />
          </div>
        )}
      </div>
    </div>
  );
}