// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import NetworkDiagnostics from './NetworkDiagnostics';
import { Bell, ShieldAlert, AlertTriangle, CheckCircle2, X, Volume2, VolumeX, Download, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import usePortSyncAlerts from './hooks/usePortSyncAlerts';
import YardMatrix from './YardMatrix';
import CommandMap from './CommandMap';
import SimulationLab from './SimulationLab';
import AnalyticsInsights from './AnalyticsInsights';
import ContainerInventoryGrid from './ContainerInventoryGrid';
import PortConfigPanel, { PortConfigProvider } from './PortConfigPanel';


/**
 * Web Audio API synthesizer helper to generate a professional dual-tone alarm pulse.
 * Avoids broken external audio URLs by synthesizing directly in the browser.
 */
const playCriticalAlarmTone = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Dual-frequency pulse for high-visibility industrial alert sound
    [880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      // Volume envelope: rapid attack, quick decay
      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.26);
    });
  } catch (err) {
    console.warn('Audio playback restricted or unsupported:', err);
  }
};

export default function App() {
  
  const [activeTab, setActiveTab] = useState('commandMap');
  
  // Requirement 1: RBAC State Hook initialized to "Field Operator"
  const [currentUserRole, setCurrentUserRole] = useState('Field Operator');
  
  // Disruption state toggle for infrastructure data transit simulations
  const [isDisruptionActive, setIsDisruptionActive] = useState(false);

  // Security Exception Toast Notification State (Requirement 4)
  const [securityToast, setSecurityToast] = useState(null);

  // Real-time WebSocket Triage Notifications State & Connection Status
  const [liveNotifications, setLiveNotifications] = useState([]);
  
  // Persistent notifications history log for the active session
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  
  // Operations Notification Hub sidebar state & audio mute toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioMutedRef = useRef(audioMuted);

  const [wsConnected, setWsConnected] = useState(false);

  // Live Database Analytics Summary State from Python backend
  const [gateAnalytics, setGateAnalytics] = useState(null);
  
  // Ref to hold WebSocket instance for safe cleanup and reconnect handling
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Sync ref to maintain current mute state inside WebSocket callback closures
  useEffect(() => {
    audioMutedRef.current = audioMuted;
  }, [audioMuted]);

  // Hook into teammate's alert hook for local component state sync
  const { alerts } = usePortSyncAlerts();

  // Requirement 4: Security Exception Toast Trigger Handler
  const handleSecurityRestriction = () => {
    const toastId = Date.now();
    setSecurityToast({
      id: toastId,
      message: "SECURITY EXCEPTION: Administrative Elevation Required"
    });

    setTimeout(() => {
      setSecurityToast(null);
    }, 4000);
  };

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

  // Fetch initial persisted alerts history from backend database on mount
  useEffect(() => {
    const fetchAlertHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/alerts/history');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.alerts)) {
            const formattedAlerts = data.alerts.map(alert => ({
              id: alert.id,
              title: `[${alert.priority}] ${alert.alert_type}`,
              message: alert.message,
              containerId: alert.container_id || alert.asset_id || "UNKNOWN",
              timestamp: alert.created_at,
              severity: alert.priority ? alert.priority.toUpperCase() : 'CRITICAL',
              targetTemp: alert.details?.target_temp || '-20.0°C',
              temp: alert.details?.temperature_c ? `+${alert.details.temperature_c}°C` : '+4.2°C',
              acknowledged: alert.status === 'ACKNOWLEDGED'
            }));
            setNotificationsHistory(formattedAlerts);
          }
        }
      } catch (err) {
        console.warn("Could not fetch alert history from backend database:", err);
      }
    };

    fetchAlertHistory();
  }, []);

  // Global Background WebSocket Connection Listener & Audio Chime Trigger
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
            
            const notificationId = alertData.id || alertData.event_id || Date.now();
            const severity = alertData.priority ? alertData.priority.toUpperCase() : 'CRITICAL';
            
            const newNotification = {
              id: notificationId,
              title: alertData.priority ? `[${alertData.priority}] REEFER ANOMALY` : "CRITICAL ALERT",
              message: alertData.message || "Temperature disruption detected on reefer container.",
              containerId: alertData.container_id || alertData.asset_id || "UNKNOWN",
              timestamp: alertData.timestamp || new Date().toISOString(),
              severity: severity,
              targetTemp: alertData.target_temp || '-20.0°C',
              temp: alertData.temp || '+4.2°C',
              acknowledged: false
            };

            setNotificationsHistory((prev) => {
              // Avoid duplicates if ID already exists
              if (prev.some(item => item.id === newNotification.id)) return prev;
              return [newNotification, ...prev];
            });

            if (newNotification.severity === 'CRITICAL' && !audioMutedRef.current) {
              playCriticalAlarmTone();
            }

            setLiveNotifications((prev) => [newNotification, ...prev]);

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

  const toggleAcknowledgeAlert = async (id) => {
    try {
      // If the alert ID is a temporary client-side timestamp, update local state directly
      if (typeof id === 'number' && id > 1000000000000) {
        setNotificationsHistory((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, acknowledged: true } : item
          )
        );
        return;
      }

      // Fire the network command directly to our custom backend endpoint route
      const response = await fetch(`http://localhost:8000/api/v1/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acknowledged_by: currentUserRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📡 Backend Acknowledgment Confirmed:", data);

        // Instantly update our local frontend array state so the card dims out smoothly
        setNotificationsHistory((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, acknowledged: true } : item
          )
        );
      } else {
        console.error("⚠️ Server rejected acknowledgment:", response.status);
        // Fallback local update for UI responsiveness
        setNotificationsHistory((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, acknowledged: true } : item
          )
        );
      }
    } catch (err) {
      console.error("❌ Failed to transmit alert acknowledgment over HTTP pipe:", err);
      // Fallback local update so button click always responds visually
      setNotificationsHistory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, acknowledged: true } : item
        )
      );
    }
  };

  const clearAllNotifications = () => {
    setNotificationsHistory([]);
  };

  const unacknowledgedCount = notificationsHistory.filter((n) => !n.acknowledged).length;

  // System Operational Audit Log CSV Export Utility (Locked down for Field Operator)
  const exportAuditLogCSV = () => {
    if (currentUserRole === 'Field Operator') {
      handleSecurityRestriction();
      return;
    }

    const headers = ['Timestamp', 'Asset ID', 'Event Type', 'Metrics/Speed', 'Operational Status'];
    
    const rows = notificationsHistory.length > 0
      ? notificationsHistory.map((item) => [
          `"${item.timestamp || new Date().toISOString()}"`,
          `"${item.containerId || 'UNKNOWN'}"`,
          `"${item.title || item.severity || 'TELEMETRY_EVENT'}"`,
          `"${item.temp ? `Temp: ${item.temp} (Target: ${item.targetTemp})` : 'Nominal'}"`,
          `"${item.acknowledged ? 'Resolved' : 'Active/Unacknowledged'}"`
        ])
      : [
          [
            `"${new Date().toISOString()}"`,
            '"PORT-GATEWAY-SYS"',
            '"SYSTEM_INITIALIZED"',
            '"Nominal"',
            '"Active"'
          ]
        ];

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'PortSync_Twin_AuditLog_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PortConfigProvider>
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
        {/* Security Exception Flashing Red Banner Notification Toast */}
        {securityToast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '12px 24px',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'flashBanner 0.4s ease-in-out infinite alternate',
            backdropFilter: 'blur(8px)'
          }}>
            <AlertTriangle size={20} color="#f8fafc" />
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
              {securityToast.message}
            </span>
          </div>
        )}

        {/* Floating Top-Right Animated Toast Alert Banner Notification Container */}
        <div style={{
          position: 'fixed',
          top: '80px',
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

        {/* CSS Keyframes */}
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
          @keyframes flashBanner {
            from { opacity: 0.8; transform: translateX(-50%) scale(0.98); }
            to { opacity: 1; transform: translateX(-50%) scale(1); }
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
                onClick={() => setActiveTab('inventory')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: activeTab === 'inventory' ? '#131c31' : 'transparent',
                  color: activeTab === 'inventory' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  borderLeft: activeTab === 'inventory' ? '3px solid #38bdf8' : '3px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                Container Inventory
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
              Session Log: {notificationsHistory.length}
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
          {/* Top Header Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexShrink: 0
          }}>
            {/* Active Session Profile Dropdown Selector Widget */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 14px'
            }}>
              {currentUserRole === 'Terminal Operations Director' ? (
                <ShieldCheck size={18} color="#38bdf8" />
              ) : (
                <UserCheck size={18} color="#94a3b8" />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Active Session Profile
                </span>
                <select
                  value={currentUserRole}
                  onChange={(e) => setCurrentUserRole(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: currentUserRole === 'Terminal Operations Director' ? '#38bdf8' : '#f8fafc',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    paddingRight: '4px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="Field Operator" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Field Operator (Read-Only Mode)</option>
                  <option value="Terminal Operations Director" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Terminal Operations Director (Full Access Mode)</option>
                </select>
              </div>
            </div>

            {/* Right Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  if (currentUserRole === 'Field Operator') {
                    handleSecurityRestriction();
                  } else {
                    setIsDisruptionActive((prev) => !prev);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: isDisruptionActive ? 'rgba(239, 68, 68, 0.2)' : '#0f172a',
                  border: isDisruptionActive ? '1px solid #ef4444' : '1px solid #334155',
                  borderRadius: '8px',
                  color: isDisruptionActive ? '#f87171' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <AlertTriangle size={16} color={isDisruptionActive ? '#ef4444' : '#94a3b8'} />
                <span>{isDisruptionActive ? 'Crisis Active' : 'Simulate Network Crisis'}</span>
              </button>

              <button
                onClick={exportAuditLogCSV}
                title={currentUserRole === 'Field Operator' ? 'Locked: Administrative Elevation Required' : 'Download System Operational Audit Log CSV'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: currentUserRole === 'Field Operator' ? '#131b2e' : '#0f172a',
                  border: currentUserRole === 'Field Operator' ? '1px dashed #475569' : '1px solid #334155',
                  borderRadius: '8px',
                  color: currentUserRole === 'Field Operator' ? '#64748b' : '#38bdf8',
                  cursor: currentUserRole === 'Field Operator' ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  opacity: currentUserRole === 'Field Operator' ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {currentUserRole === 'Field Operator' ? <Lock size={16} color="#ef4444" /> : <Download size={16} />}
                <span>Export Audit Log</span>
              </button>

              <button
                onClick={() => setAudioMuted((prev) => !prev)}
                title={audioMuted ? 'Unmute Critical Alarms' : 'Mute Critical Alarms'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: audioMuted ? '#1e293b' : 'rgba(14, 165, 233, 0.1)',
                  border: audioMuted ? '1px solid #334155' : '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  color: audioMuted ? '#94a3b8' : '#38bdf8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{audioMuted ? 'Alarms Muted' : 'Audio Armed'}</span>
              </button>

              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease'
                }}
                aria-label="Open Operations Notification Hub"
              >
                <Bell size={18} style={{ color: '#38bdf8' }} />
                <span>Operations Hub</span>
                {unacknowledgedCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}>
                    {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
                  </span>
                )}
              </button>
            </div>
          </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '20px', flexShrink: 0 }}>
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
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Crane Throughput</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>31.2 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>moves/hr</span></div>
                  <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>+4.1%</span>
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

              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', marginBottom: '20px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingLeft: '4px', paddingRight: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#38bdf8' }}>Terminal Spatial Overlay (JNPT Sector)</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Coordinates: 18.9500° N, 72.9500° E</span>
                </div>
                <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b', minHeight: '380px' }}>
                  <CommandMap />
                </div>
              </div>

              <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                <NetworkDiagnostics isDisruptionActive={isDisruptionActive} />
              </div>

              <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                <PortConfigPanel 
                  currentTeuCount={28450} 
                  userRole={currentUserRole}
                  onSecurityRestriction={handleSecurityRestriction}
                />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <ContainerInventoryGrid />
            </div>
          )}

          {activeTab === 'yardMatrix' && (
            <YardMatrix />
          )}

          {activeTab === 'simulationLab' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <SimulationLab 
                userRole={currentUserRole}
                onSecurityRestriction={handleSecurityRestriction}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <AnalyticsInsights />
            </div>
          )}
        </div>
          
        {/* Operations Notification Hub Sidebar */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(6, 9, 19, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
        )}

        <aside style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: '400px',
          maxWidth: '100%',
          backgroundColor: '#090d16',
          borderLeft: '1px solid #1e293b',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} style={{ color: '#38bdf8' }} />
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Operations Notification Hub
              </h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{
            padding: '12px 20px',
            backgroundColor: '#060913',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            <span>Active Session Logs ({notificationsHistory.length})</span>
            {notificationsHistory.length > 0 && (
              <button
                onClick={clearAllNotifications}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textDecoration: 'underline'
                }}
              >
                Clear Log
              </button>
            )}
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {notificationsHistory.length === 0 ? (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                gap: '10px',
                textAlign: 'center',
                padding: '40px'
              }}>
                <CheckCircle2 size={40} style={{ strokeWidth: 1.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  No alerts recorded in active session
                </p>
              </div>
            ) : (
              notificationsHistory.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isResolved = alert.acknowledged;

                return (
                  <div
                    key={alert.id}
                    style={{
                      backgroundColor: isResolved ? 'rgba(15, 23, 42, 0.4)' : isCritical ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      border: isResolved ? '1px solid #1e293b' : isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '14px',
                      opacity: isResolved ? 0.45 : 1,
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isCritical ? '#f87171' : '#fbbf24',
                        border: isCritical ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        {isCritical ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
                        {alert.severity}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                          {alert.containerId}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {alert.temp} <span style={{ color: '#64748b' }}>(Target: {alert.targetTemp})</span>
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        {alert.message}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                      <button
                        onClick={() => toggleAcknowledgeAlert(alert.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: isResolved ? '#1e293b' : '#131c31',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: isResolved ? '#94a3b8' : '#f8fafc',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <CheckCircle2 size={14} style={{ color: isResolved ? '#22c55e' : '#94a3b8' }} />
                        <span>{isResolved ? 'Resolved' : 'Acknowledge Alert'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </PortConfigProvider>
  );
}