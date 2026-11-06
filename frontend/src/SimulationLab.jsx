import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

export default function SimulationLab({ userRole = 'Terminal Operations Director', onSecurityRestriction }) {
  const [disruptions, setDisruptions] = useState({
    customs: false,
    rail: false,
    gate: false,
  });

  const [loadFactor, setLoadFactor] = useState(70);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: null });
  
  // New state for audit playback history log
  const [auditHistory, setAuditHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const isReadOnly = userRole === 'Field Operator';

  // Fetch historical audit logs on component mount
  useEffect(() => {
    const fetchAuditHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/alerts/history');
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
        const data = await response.json();
        setAuditHistory(Array.isArray(data) ? data.alerts || data : (data.items || []));
      } catch (err) {
        console.error('Failed to fetch disruption audit history:', err);
        setAuditHistory([
          { id: 1, timestamp: '2026-03-30 14:22:10', asset_id: 'AGV-TRK-402', status: 'UNRESOLVED' },
          { id: 2, timestamp: '2026-03-30 12:05:40', asset_id: 'CRANE-NORTH-04', status: 'ACKNOWLEDGED' },
          { id: 3, timestamp: '2026-03-29 18:45:12', asset_id: 'GATE-ENTRY-02', status: 'ACKNOWLEDGED' },
        ]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchAuditHistory();
  }, []);

  const toggleDisruption = async (key) => {
    if (isReadOnly) {
      if (onSecurityRestriction) onSecurityRestriction();
      return;
    }

    const nextState = !disruptions[key];
    
    let backendKey = key;
    if (key === 'customs') {
      backendKey = 'customs_outage';
    } else if (key === 'gate') {
      backendKey = 'gate_slowdown';
    } else if (key === 'rail') {
      backendKey = 'rail_maintenance';
    }

    setApiStatus({ loading: true, error: null });

    try {
      const response = await fetch('http://localhost:8000/api/v1/simulation/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disruption_key: backendKey,
          state: nextState,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      setDisruptions((prev) => ({ ...prev, [key]: nextState }));
      setApiStatus({ loading: false, error: null });
    } catch (err) {
      console.error('Failed to sync simulation toggle with backend:', err);
      setApiStatus({ loading: false, error: 'Backend sync failed. Local state unchanged.' });
    }
  };

  const handleSliderChange = (e) => {
    if (isReadOnly) {
      if (onSecurityRestriction) onSecurityRestriction();
      return;
    }
    setLoadFactor(Number(e.target.value));
  };

  const activeCount = Object.values(disruptions).filter(Boolean).length;
  const isAnyActive = activeCount > 0;

  const rawRiskScore = (loadFactor / 10) + activeCount * 2.5;
  let riskLevel = 'Low';
  let riskColor = '#10b981';

  if (rawRiskScore > 16) {
    riskLevel = 'Critical';
    riskColor = '#ef4444';
  } else if (rawRiskScore > 11) {
    riskLevel = 'High';
    riskColor = '#f97316';
  } else if (rawRiskScore > 7) {
    riskLevel = 'Moderate';
    riskColor = '#eab308';
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes pulseAlert {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
          }
          .flashing-badge {
            animation: pulseAlert 1.1s infinite ease-in-out;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #0b0f19;
          }
          ::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #334155;
          }
        `}
      </style>

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Simulation Lab — What-If Disruption Testing</h2>
          <p style={styles.subtitle}>Configure structural port bottlenecks and evaluate real-time terminal resilience telemetry.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isReadOnly && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <Lock size={13} /> Read-Only Mode Active
            </span>
          )}
          <div style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            backgroundColor: isAnyActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.1)',
            border: isAnyActive ? '1px solid #ef4444' : '1px solid #475569',
            color: isAnyActive ? '#f87171' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: isAnyActive ? '#ef4444' : '#94a3b8',
              borderRadius: '50%',
              boxShadow: isAnyActive ? '0 0 8px #ef4444' : 'none'
            }}></span>
            {isAnyActive ? 'LIVE SIMULATION ENGINE ACTIVE' : 'SIMULATION ENGINE IDLE'}
          </div>
        </div>
      </div>

      {apiStatus.error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {apiStatus.error}</span>
        </div>
      )}

      <div style={styles.grid}>
        {/* Disruption Control Grid */}
        <div style={{ ...styles.card, opacity: isReadOnly ? 0.85 : 1 }}>
          <h3 style={styles.cardTitle}>Structural Disruption Triggers</h3>
          <p style={styles.cardDesc}>Select primary pipeline failures to simulate systemic impact on cargo throughput.</p>

          <div style={styles.toggleList}>
            {/* Toggle 1 */}
            <div style={{ ...styles.toggleItem, borderColor: disruptions.customs ? '#ef4444' : '#334155' }}>
              <div style={styles.toggleInfo}>
                <span style={styles.toggleLabel}>Customs Server Clearance Outage</span>
                <span style={styles.toggleSub}>Simulated system failure & digital clearance backlog</span>
              </div>
              <div style={styles.toggleActionContainer}>
                {disruptions.customs && (
                  <span className="flashing-badge" style={styles.alertBadge}>
                    SIMULATING ACTIVE BOTTLENECK
                  </span>
                )}
                <button
                  onClick={() => toggleDisruption('customs')}
                  disabled={apiStatus.loading}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.customs ? '#ef4444' : '#334155',
                    opacity: apiStatus.loading ? 0.7 : 1,
                  }}
                >
                  {disruptions.customs ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Toggle 2 */}
            <div style={{ ...styles.toggleItem, borderColor: disruptions.rail ? '#ef4444' : '#334155' }}>
              <div style={styles.toggleInfo}>
                <span style={styles.toggleLabel}>DFC Rail Track Maintenance Operations</span>
                <span style={styles.toggleSub}>Rail pipeline bottleneck & corridor capacity reduction</span>
              </div>
              <div style={styles.toggleActionContainer}>
                {disruptions.rail && (
                  <span className="flashing-badge" style={styles.alertBadge}>
                    SIMULATING ACTIVE BOTTLENECK
                  </span>
                )}
                <button
                  onClick={() => toggleDisruption('rail')}
                  disabled={apiStatus.loading}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.rail ? '#ef4444' : '#334155',
                    opacity: apiStatus.loading ? 0.7 : 1,
                  }}
                >
                  {disruptions.rail ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Toggle 3 */}
            <div style={{ ...styles.toggleItem, borderColor: disruptions.gate ? '#ef4444' : '#334155' }}>
              <div style={styles.toggleInfo}>
                <span style={styles.toggleLabel}>Gate Entry Checkpost Processing Slowdown</span>
                <span style={styles.toggleSub}>Road logistics gridlock & truck turnaround delay</span>
              </div>
              <div style={styles.toggleActionContainer}>
                {disruptions.gate && (
                  <span className="flashing-badge" style={styles.alertBadge}>
                    SIMULATING ACTIVE BOTTLENECK
                  </span>
                )}
                <button
                  onClick={() => toggleDisruption('gate')}
                  disabled={apiStatus.loading}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.gate ? '#ef4444' : '#334155',
                    opacity: apiStatus.loading ? 0.7 : 1,
                  }}
                >
                  {disruptions.gate ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Evacuation Load Factor & Risk Analysis Panel */}
        <div style={{ ...styles.card, opacity: isReadOnly ? 0.85 : 1 }}>
          <h3 style={styles.cardTitle}>Terminal Load & Risk Assessment</h3>
          <p style={styles.cardDesc}>Adjust target container yard occupancy to model stress thresholds.</p>

          <div style={styles.sliderContainer}>
            <div style={styles.sliderHeader}>
              <label htmlFor="loadFactorRange" style={styles.sliderLabel}>Target Container Evacuation Load Factor</label>
              <span style={styles.sliderValue}>{loadFactor}%</span>
            </div>
            <input
              id="loadFactorRange"
              type="range"
              min="10"
              max="100"
              value={loadFactor}
              onChange={handleSliderChange}
              style={styles.rangeInput}
            />
            <div style={styles.rangeMarks}>
              <span>10% (Min)</span>
              <span>50% (Normal)</span>
              <span>100% (Saturation)</span>
            </div>
          </div>

          <div style={{ ...styles.riskBox, borderColor: riskColor }}>
            <div style={styles.riskHeader}>
              <span style={styles.riskTitleText}>Calculated Risk Estimation Score</span>
              <span style={{ ...styles.riskBadge, backgroundColor: riskColor }}>{riskLevel} Risk</span>
            </div>
            <div style={styles.riskMetricsGrid}>
              <div style={styles.riskMetric}>
                <span style={styles.metricLabel}>Active Disruption Vectors</span>
                <span style={styles.metricVal}>{activeCount} / 3</span>
              </div>
              <div style={styles.riskMetric}>
                <span style={styles.metricLabel}>Est. Yard Congestion Index</span>
                <span style={styles.metricVal}>
                  {Math.min(100, Math.round(loadFactor * (1 + activeCount * 0.12)))}%
                </span>
              </div>
              <div style={styles.riskMetric}>
                <span style={styles.metricLabel}>Critical Demurrage Risk</span>
                <span style={{ ...styles.metricVal, color: riskColor }}>{riskLevel.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disruption Audit Playback History Log Panel Widget */}
      <div style={styles.historyCard}>
        <div style={styles.historyHeader}>
          <div>
            <h3 style={styles.cardTitle}>Disruption Audit Playback History Log</h3>
            <p style={styles.cardDesc}>Chronological database record of past logged port crises and incident responses.</p>
          </div>
          <span style={styles.historyRecordBadge}>
            {auditHistory.length} Recorded Events
          </span>
        </div>

        <div style={styles.historyScrollContainer}>
          {historyLoading ? (
            <div style={styles.historyLoadingText}>Synchronizing audit history logs from MySQL schema...</div>
          ) : auditHistory.length === 0 ? (
            <div style={styles.historyLoadingText}>No historical disruption logs found in database.</div>
          ) : (
            <div style={styles.historyTimeline}>
              {auditHistory.map((item, index) => {
                const isUnresolved = (item.status || '').toUpperCase() === 'UNRESOLVED';
                return (
                  <div key={item.id || index} style={styles.historyRow}>
                    <div style={styles.historyTimestampContainer}>
                      <span style={styles.timelineDot}></span>
                      <span style={styles.historyTimestamp}>{item.timestamp || item.created_at || '2026-03-30 00:00:00'}</span>
                    </div>
                    <div style={styles.historyAssetContainer}>
                      <span style={styles.historyAssetLabel}>Asset ID / Container:</span>
                      <span style={styles.historyAssetVal}>{item.container_id || item.asset_id || `ASSET-${index + 100}`}</span>
                    </div>
                    <div>
                      <span style={{
                        ...styles.statusPill,
                        backgroundColor: isUnresolved ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isUnresolved ? '#f87171' : '#34d399',
                        borderColor: isUnresolved ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                      }}>
                        {item.status || 'ACKNOWLEDGED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0b0f19',
    color: '#f8fafc',
    padding: '24px',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    border: '1px solid #1e293b',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.025em',
    color: '#f8fafc',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#94a3b8',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.2s ease',
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  cardDesc: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  toggleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toggleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '14px',
    transition: 'all 0.2s ease',
    flexWrap: 'wrap',
    gap: '12px',
  },
  toggleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: '1',
    minWidth: '200px',
  },
  toggleLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  toggleSub: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  toggleActionContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  toggleBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'background-color 0.2s',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#1f2937',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  sliderValue: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#38bdf8',
  },
  rangeInput: {
    width: '100%',
    accentColor: '#38bdf8',
    cursor: 'pointer',
  },
  rangeMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
  },
  riskBox: {
    backgroundColor: '#1f2937',
    border: '1px solid',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  riskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskTitleText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  riskBadge: {
    color: '#ffffff',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  riskMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '4px',
  },
  riskMetric: {
    backgroundColor: '#111827',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f8fafc',
  },
  historyCard: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid #1f2937',
    paddingBottom: '12px',
  },
  historyRecordBadge: {
    backgroundColor: '#1f2937',
    color: '#38bdf8',
    border: '1px solid #334155',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
  },
  historyScrollContainer: {
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  historyLoadingText: {
    color: '#64748b',
    fontSize: '13px',
    textAlign: 'center',
    padding: '24px 0',
  },
  historyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  historyTimestampContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  timelineDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#38bdf8',
    borderRadius: '50%',
    boxShadow: '0 0 6px #38bdf8',
  },
  historyTimestamp: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#e2e8f0',
    fontWeight: '600',
  },
  historyAssetContainer: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  historyAssetLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  historyAssetVal: {
    fontSize: '12px',
    color: '#f8fafc',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statusPill: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid',
    letterSpacing: '0.05em',
  },
};