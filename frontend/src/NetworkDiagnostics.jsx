import React, { useState, useEffect } from 'react';

const INITIAL_NODES = [
  {
    id: 'ldb-nldsl',
    name: 'National Logistics Data Bank (LDB / NLDSL) API Node',
    protocol: 'REST / HTTPS',
    baseLatency: 18,
  },
  {
    id: 'morth-vahan',
    name: 'MoRTH VAHAN Commercial Vehicle Registry Engine',
    protocol: 'gRPC / HTTP2',
    baseLatency: 24,
  },
  {
    id: 'cris-fois',
    name: 'CRIS FOIS Freight Operations Tracking Pipeline',
    protocol: 'WebSocket / WSS',
    baseLatency: 15,
  },
];

export default function NetworkDiagnostics({ isDisruptionActive = false, forcedStatusOverride = null }) {
  const [nodes, setNodes] = useState(
    INITIAL_NODES.map((node) => ({
      ...node,
      ping: node.baseLatency,
      status: 'OPERATIONAL',
      history: [node.baseLatency, node.baseLatency, node.baseLatency, node.baseLatency, node.baseLatency],
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          let nextPing;
          let nextStatus = 'OPERATIONAL';

          if (isDisruptionActive) {
            const isTimeout = Math.random() < 0.4;
            if (isTimeout) {
              nextPing = Math.floor(Math.random() * 300) + 450;
              nextStatus = 'TIMEOUT REJECTED';
            } else {
              nextPing = Math.floor(Math.random() * 120) + 85;
              nextStatus = 'LATENCY DEGRADATION';
            }
          } else {
            const jitter = Math.floor(Math.random() * 34) + 12;
            const spikeChance = Math.random();

            if (spikeChance > 0.88) {
              nextPing = Math.floor(Math.random() * 90) + 75;
              nextStatus = 'LATENCY DEGRADATION';
            } else if (spikeChance > 0.97) {
              nextPing = Math.floor(Math.random() * 250) + 350;
              nextStatus = 'TIMEOUT REJECTED';
            } else {
              nextPing = jitter;
              nextStatus = 'OPERATIONAL';
            }
          }

          if (forcedStatusOverride && forcedStatusOverride[node.id]) {
            nextStatus = forcedStatusOverride[node.id].status || nextStatus;
            nextPing = forcedStatusOverride[node.id].ping || nextPing;
          }

          const updatedHistory = [...node.history.slice(1), nextPing];

          return {
            ...node,
            ping: nextPing,
            status: nextStatus,
            history: updatedHistory,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isDisruptionActive, forcedStatusOverride]);

  const styles = {
    container: {
      backgroundColor: '#0a0d14',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      padding: '20px',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #1e293b',
      paddingBottom: '14px',
      marginBottom: '20px',
    },
    titleGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    titleIcon: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: isDisruptionActive ? '#ef4444' : '#10b981',
      boxShadow: isDisruptionActive ? '0 0 10px #ef4444' : '0 0 10px #10b981',
    },
    titleText: {
      fontSize: '15px',
      fontWeight: '700',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: '#f8fafc',
    },
    subtitle: {
      fontSize: '12px',
      color: '#64748b',
      marginTop: '2px',
    },
    crisiBadge: {
      fontSize: '11px',
      fontWeight: '700',
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: isDisruptionActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      color: isDisruptionActive ? '#f87171' : '#34d399',
      border: `1px solid ${isDisruptionActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
      letterSpacing: '0.04em',
    },
    nodeList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
    nodeCard: {
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '6px',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
      alignItems: 'center',
      gap: '16px',
      transition: 'border-color 0.2s ease',
    },
    nodeInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    nodeName: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#f1f5f9',
    },
    nodeProtocol: {
      fontSize: '11px',
      color: '#475569',
      fontFamily: 'monospace',
    },
    metricsGroup: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '2px',
    },
    metricLabel: {
      fontSize: '10px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    metricValue: {
      fontSize: '18px',
      fontWeight: '700',
      fontFamily: 'monospace',
    },
    statusContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    historySparkline: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '3px',
      height: '24px',
    },
    footer: {
      marginTop: '18px',
      paddingTop: '12px',
      borderTop: '1px solid #1e293b',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '11px',
      color: '#475569',
    },
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'TIMEOUT REJECTED':
        return {
          color: '#ef4444',
          borderColor: 'rgba(239, 68, 68, 0.5)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          animation: 'pulse 1s infinite',
        };
      case 'LATENCY DEGRADATION':
        return {
          color: '#f59e0b',
          borderColor: 'rgba(245, 158, 11, 0.5)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          animation: 'blink 1.5s infinite',
        };
      case 'OPERATIONAL':
      default:
        return {
          color: '#10b981',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
        };
    }
  };

  const getPingColor = (ping, status) => {
    if (status === 'TIMEOUT REJECTED') return '#ef4444';
    if (status === 'LATENCY DEGRADATION' || ping > 70) return '#f59e0b';
    return '#38bdf8';
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.75; transform: scale(0.98); }
          }
        `}
      </style>

      <div style={styles.header}>
        <div>
          <div style={styles.titleGroup}>
            <div style={styles.titleIcon} />
            <span style={styles.titleText}>Infrastructure Data Transit Console</span>
          </div>
          <div style={styles.subtitle}>Telemetry Stream Monitoring — Telemetry Bus Active</div>
        </div>
        <div style={styles.crisiBadge}>
          {isDisruptionActive ? 'CRISIS SIMULATION ACTIVE' : 'NOMINAL PIPELINE'}
        </div>
      </div>

      <div style={styles.nodeList}>
        {nodes.map((node) => {
          const statusStyle = getStatusStyle(node.status);
          const pingColor = getPingColor(node.ping, node.status);

          return (
            <div key={node.id} style={styles.nodeCard}>
              <div style={styles.nodeInfo}>
                <span style={styles.nodeName}>{node.name}</span>
                <span style={styles.nodeProtocol}>NODE_ID: {node.id} | {node.protocol}</span>
              </div>

              <div style={styles.metricsGroup}>
                <span style={styles.metricLabel}>LATENCY PING</span>
                <span style={{ ...styles.metricValue, color: pingColor }}>
                  {node.ping} <span style={{ fontSize: '11px', color: '#64748b' }}>ms</span>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={styles.metricLabel}>HISTORICAL SPARK</span>
                <div style={styles.historySparkline}>
                  {node.history.map((val, idx) => {
                    const barHeight = Math.min(Math.max((val / 150) * 24, 4), 24);
                    const isHigh = val > 70;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '8px',
                          height: `${barHeight}px`,
                          backgroundColor: isHigh ? (val > 200 ? '#ef4444' : '#f59e0b') : '#0284c7',
                          borderRadius: '1px',
                          transition: 'height 0.3s ease',
                        }}
                        title={`${val}ms`}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={styles.statusContainer}>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    ...statusStyle,
                  }}
                >
                  {node.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <span>REFRESH RATE: 3000ms</span>
        <span>PORTSYNC TELEMETRY ENGINE v2.4</span>
      </div>
    </div>
  );
}