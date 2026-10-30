import React, { useState } from 'react';

export default function SimulationLab() {
  const [disruptions, setDisruptions] = useState({
    customs: false,
    rail: false,
    gate: false,
  });

  const [loadFactor, setLoadFactor] = useState(70);

  const toggleDisruption = (key) => {
    setDisruptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(disruptions).filter(Boolean).length;

  // Calculate dynamic risk score based on load factor and active bottleneck counts
  const rawRiskScore = (loadFactor / 10) + activeCount * 2.5;
  let riskLevel = 'Low';
  let riskColor = '#10b981'; // Green

  if (rawRiskScore > 16) {
    riskLevel = 'Critical';
    riskColor = '#ef4444'; // Red
  } else if (rawRiskScore > 11) {
    riskLevel = 'High';
    riskColor = '#f97316'; // Orange
  } else if (rawRiskScore > 7) {
    riskLevel = 'Moderate';
    riskColor = '#eab308'; // Yellow
  }

  return (
    <div style={styles.container}>
      {/* Inject keyframes for the flashing alert badge */}
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
        `}
      </style>

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Simulation Lab — What-If Disruption Testing</h2>
          <p style={styles.subtitle}>Configure structural port bottlenecks and evaluate real-time terminal resilience telemetry.</p>
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          LIVE SIMULATION ENGINE ACTIVE
        </div>
      </div>

      <div style={styles.grid}>
        {/* Disruption Control Grid */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Structural Disruption Triggers</h3>
          <p style={styles.cardDesc}>Select primary pipeline failures to simulate systemic impact on cargo throughput.</p>

          <div style={styles.toggleList}>
            {/* Toggle 1 */}
            <div style={{ ...styles.toggleItem, borderColor: disruptions.customs ? '#ef4444' : '#334155' }}>
              <div style={styles.toggleInfo}>
                <span style={styles.toggleLabel}>Customs Server Clearance Latency</span>
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
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.customs ? '#ef4444' : '#334155',
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
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.rail ? '#ef4444' : '#334155',
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
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: disruptions.gate ? '#ef4444' : '#334155',
                  }}
                >
                  {disruptions.gate ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Evacuation Load Factor & Risk Analysis Panel */}
        <div style={styles.card}>
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
              onChange={(e) => setLoadFactor(Number(e.target.value))}
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
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
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    letterSpacing: '0.05em',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#06b6d4',
    borderRadius: '50%',
    boxShadow: '0 0 8px #06b6d4',
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
};