import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map, 
  LayoutGrid, 
  FlaskConical, 
  BarChart3, 
  Truck, 
  Anchor, 
  Cpu, 
  Radio, 
  Activity, 
  Zap, 
  Layers,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowUpRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [assets, setAssets] = useState([]);
  const [isLive, setIsLive] = useState(true);

  // Poll live telemetry endpoints or fall back to simulated stream for testing
  useEffect(() => {
    let intervalId;

    const fetchLiveAssets = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/live-assets');
        if (response.ok) {
          const data = await response.json();
          setAssets(data);
          return;
        }
      } catch (err) {
        // Fallback live telemetry simulation matching incoming WebSocket/FastAPI schema
        setAssets([
          { id: 'TRK-901', category: 'N3 Vahan', speed: 28.4, status: 'OPERATIONAL' },
          { id: 'TRK-904', category: 'N2 Vahan', speed: 12.1, status: 'CONGESTED_GRIDLOCK' },
          { id: 'TRK-882', category: 'N3 Vahan', speed: 0.0, status: 'HELD' },
          { id: 'AGV-01', category: 'AGV', speed: 18.5, status: 'OPERATIONAL' },
          { id: 'AGV-04', category: 'AGV', speed: 14.2, status: 'OPERATIONAL' },
          { id: 'TRK-109', category: 'N3 Vahan', speed: 34.0, status: 'OPERATIONAL' },
          { id: 'TRK-302', category: 'N2 Vahan', speed: 5.2, status: 'CONGESTED_GRIDLOCK' },
          { id: 'CRN-02', category: 'STS Crane', speed: 0.0, status: 'OPERATIONAL' },
        ]);
      }
    };

    fetchLiveAssets();
    if (isLive) {
      intervalId = setInterval(fetchLiveAssets, 2000);
    }

    return () => clearInterval(intervalId);
  }, [isLive]);

  // ---------------------------------------------------------------------------
  // REAL-TIME COMPUTATION LAYER (Dynamic Metrics Calculation)
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // REAL-TIME COMPUTATION LAYER (Fail-safe Data Bindings)
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    if (!Array.isArray(assets)) {
      return { activeAssetsCount: 0, avgTransitSpeed: '0.0', congestionAlertCount: 0, vahanCount: 0 };
    }

    // 1. Active Assets On-Screen
    const activeAssetsCount = assets.length;

    // 2. Average Transit Speed for N3 / N2 Vahan trucks
    const vahanTrucks = assets.filter(
      (asset) =>
        asset?.category === 'N3 Vahan' ||
        asset?.category === 'N2 Vahan' ||
        (typeof asset?.id === 'string' && asset.id.startsWith('TRK-'))
    );

    const totalSpeed = vahanTrucks.reduce((acc, curr) => acc + (Number(curr?.speed) || 0), 0);
    const avgTransitSpeed = vahanTrucks.length > 0 ? (totalSpeed / vahanTrucks.length).toFixed(1) : '0.0';

    // 3. Active Congestion Alert Index
    const congestionAlertCount = assets.reduce((count, asset) => {
      if (asset?.status === 'CONGESTED_GRIDLOCK' || asset?.status === 'HELD') {
        return count + 1;
      }
      return count;
    }, 0);

    return {
      activeAssetsCount,
      avgTransitSpeed,
      congestionAlertCount,
      vahanCount: vahanTrucks.length
    };
  }, [assets]);

  const navItems = [
    { id: 'map', label: 'Command Map', icon: Map },
    { id: 'yard', label: 'Yard Density Matrix', icon: LayoutGrid },
    { id: 'sim', label: 'Simulation Lab', icon: FlaskConical },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>
            <Anchor size={20} color="#00f2fe" />
          </div>
          <div>
            <div style={styles.brandTitle}>PORTSYNC TWIN</div>
            <div style={styles.brandSub}>Enterprise Console v2.4</div>
          </div>
        </div>

        <nav style={styles.navMenu}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  ...styles.navButton,
                  ...(isActive ? styles.navButtonActive : {}),
                }}
              >
                <Icon size={18} color={isActive ? '#00f2fe' : '#94a3b8'} />
                <span style={{ color: isActive ? '#f8fafc' : '#94a3b8', fontWeight: isActive ? '600' : '400' }}>
                  {item.label}
                </span>
                {isActive && <div style={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>

        <div style={styles.systemStatusBox}>
          <div style={styles.statusHeader}>
            <Radio size={14} color={isLive ? '#10b981' : '#f59e0b'} />
            <span style={{ ...styles.statusTitle, color: isLive ? '#10b981' : '#f59e0b' }}>
              {isLive ? 'TELEMETRY LIVE' : 'STREAM PAUSED'}
            </span>
          </div>
          <div style={styles.statusMeta}>Latency: 12ms | Async Loop Active</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Top Header Bar */}
        <header style={styles.topHeader}>
          <div>
            <h1 style={styles.pageTitle}>
              {navItems.find((item) => item.id === activeTab)?.label}
            </h1>
            <p style={styles.pageSubtitle}>Real-time telemetry and spatial digital twin engine</p>
          </div>
          <div style={styles.headerControls}>
            <div style={styles.pillBadge}>
              <Cpu size={14} color="#38bdf8" />
              <span>FastAPI Gateway: Online</span>
            </div>
            <button 
              style={styles.refreshButton}
              onClick={() => setIsLive(!isLive)}
            >
              <RefreshCw size={14} color="#00f2fe" />
              <span>{isLive ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div style={styles.tabContainer}>
          {activeTab === 'map' && <CommandMapView metrics={metrics} assets={assets} />}
          {activeTab === 'yard' && <YardDensityView />}
          {activeTab === 'sim' && <SimulationLabView />}
          {activeTab === 'analytics' && <AnalyticsView metrics={metrics} />}
        </div>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 1: COMMAND MAP VIEW (DYNAMIC DATA BINDINGS)
// -----------------------------------------------------------------------------
function CommandMapView({ metrics, assets }) {
  return (
    <div style={styles.viewLayout}>
      {/* Dynamic Header Stat Cards Grid */}
      <div style={styles.statsGrid}>
        <StatCard 
          title="Active Assets On-Screen" 
          value={metrics.activeAssetsCount} 
          unit="telemetry nodes" 
          icon={Anchor} 
          trend="Live polling" 
          color="#00f2fe" 
        />
        <StatCard 
          title="Average Transit Speed" 
          value={`${metrics.avgTransitSpeed} km/h`} 
          unit={`across ${metrics.vahanCount} Vahan trucks`} 
          icon={Truck} 
          trend="Moving Avg" 
          color="#10b981" 
        />
        <StatCard 
          title="Active Congestion Index" 
          value={metrics.congestionAlertCount} 
          unit="gridlock / held alerts" 
          icon={AlertTriangle} 
          trend={metrics.congestionAlertCount > 0 ? "Action Required" : "Nominal"} 
          color={metrics.congestionAlertCount > 0 ? "#ef4444" : "#10b981"} 
        />
        <StatCard 
          title="System Throughput" 
          value="31.2" 
          unit="moves/hr" 
          icon={Zap} 
          trend="+4.1%" 
          color="#f59e0b" 
        />
      </div>

      <div style={styles.mapCanvasWrapper}>
        <div style={styles.mapOverlayHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#00f2fe" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Terminal Spatial Overlay</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Coordinates: 25.0343° N, 121.5645° E</div>
        </div>

        <div style={styles.simulatedMapGraphic}>
          <div style={styles.berthLine}>
            <span style={styles.berthLabel}>BERTH 01 - OCEANUS PRIME (DISCHARGING)</span>
          </div>
          
          <div style={styles.agvLaneGrid}>
            {assets.slice(0, 4).map((asset) => (
              <div key={asset.id} style={{
                ...styles.agvNode,
                borderColor: asset.status === 'CONGESTED_GRIDLOCK' ? '#ef4444' : asset.status === 'HELD' ? '#f59e0b' : '#334155',
                color: asset.status === 'CONGESTED_GRIDLOCK' ? '#ef4444' : asset.status === 'HELD' ? '#f59e0b' : '#10b981'
              }}>
                {asset.id} [{asset.status}] - {asset.speed} km/h
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 2: YARD DENSITY MATRIX VIEW
// -----------------------------------------------------------------------------
function YardDensityView() {
  const blocks = [
    { name: 'Block A1', density: 92, type: 'Reefer Containers', alert: true },
    { name: 'Block A2', density: 64, type: 'Standard Dry 40ft', alert: false },
    { name: 'Block B1', density: 78, type: 'Hazardous Materials', alert: false },
    { name: 'Block B2', density: 41, type: 'Empty Storage', alert: false },
    { name: 'Block C1', density: 88, type: 'High Cube 40ft', alert: false },
    { name: 'Block C2', density: 95, type: 'Inbound Transshipment', alert: true },
  ];

  return (
    <div style={styles.viewLayout}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Yard Slot Capacity Distribution</h3>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Real-time spatial telemetry across yard sectors</span>
      </div>

      <div style={styles.yardGrid}>
        {blocks.map((block, idx) => (
          <div key={idx} style={styles.yardCard}>
            <div style={styles.yardCardTop}>
              <span style={{ fontWeight: '600', color: '#f8fafc' }}>{block.name}</span>
              {block.alert && (
                <span style={styles.criticalTag}>HIGH DENSITY</span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '8px 0 16px 0' }}>
              {block.type}
            </div>
            
            <div style={styles.progressTrack}>
              <div 
                style={{ 
                  ...styles.progressBar, 
                  width: `${block.density}%`,
                  backgroundColor: block.density > 90 ? '#ef4444' : block.density > 75 ? '#f59e0b' : '#10b981'
                }} 
              />
            </div>
            
            <div style={styles.yardCardMeta}>
              <span>Occupancy</span>
              <span style={{ fontWeight: '600', color: '#f8fafc' }}>{block.density}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 3: SIMULATION LAB VIEW
// -----------------------------------------------------------------------------
function SimulationLabView() {
  return (
    <div style={styles.viewLayout}>
      <div style={styles.simPanel}>
        <h3 style={styles.sectionTitle}>Digital Twin Stress-Test Scenario</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
          Simulate severe weather disruption, peak traffic inflows, or crane failure scenarios.
        </p>

        <div style={styles.simControlsGrid}>
          <div style={styles.simControlGroup}>
            <label style={styles.simLabel}>Inbound Vessel Surge (+%)</label>
            <input type="range" min="0" max="100" defaultValue="35" style={styles.slider} />
          </div>

          <div style={styles.simControlGroup}>
            <label style={styles.simLabel}>Yard Crane Allocation</label>
            <input type="range" min="1" max="16" defaultValue="12" style={styles.slider} />
          </div>
        </div>

        <button style={styles.actionButton}>
          <FlaskConical size={16} />
          <span>Execute Predictive Run</span>
        </button>
      </div>

      <div style={styles.simResultsBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Activity size={18} color="#00f2fe" />
          <span style={{ fontWeight: '600', color: '#f8fafc' }}>Simulated Output Forecast</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Predicted Bottleneck: Yard Block C2 expected to breach capacity in 3.2 hours if vessel discharge velocity remains constant.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 4: ANALYTICS & INSIGHTS VIEW
// -----------------------------------------------------------------------------
function AnalyticsView({ metrics }) {
  return (
    <div style={styles.viewLayout}>
      <div style={styles.statsGrid}>
        <StatCard title="Turnaround Time" value="1.8 hrs" unit="avg per truck" icon={Clock} trend="-12 mins" color="#10b981" />
        <StatCard title="TEU Throughput" value="14,290" unit="24h volume" icon={ArrowUpRight} trend="+8.4%" color="#00f2fe" />
        <StatCard title="Active Congestion Index" value={metrics ? metrics.congestionAlertCount : 0} unit="active alerts" icon={AlertTriangle} trend="Live" color="#ef4444" />
      </div>

      <div style={styles.analyticsTableWrapper}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '16px' }}>Terminal Performance Metrics</h3>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>SECTOR</th>
              <th style={styles.th}>EQUIPMENT</th>
              <th style={styles.th}>EFFICIENCY</th>
              <th style={styles.th}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr style={styles.tr}>
              <td style={styles.td}>Quay Crane 01</td>
              <td style={styles.td}>STS Electric</td>
              <td style={styles.td}>94.2%</td>
              <td style={styles.td}><span style={styles.statusBadgeGreen}>OPTIMAL</span></td>
            </tr>
            <tr style={styles.tr}>
              <td style={styles.td}>Quay Crane 04</td>
              <td style={styles.td}>STS Electric</td>
              <td style={styles.td}>78.1%</td>
              <td style={styles.td}><span style={styles.statusBadgeYellow}>DEGRADED</span></td>
            </tr>
            <tr style={styles.tr}>
              <td style={styles.td}>Fleet Cluster B</td>
              <td style={styles.td}>AGV Autonomous</td>
              <td style={styles.td}>99.0%</td>
              <td style={styles.td}><span style={styles.statusBadgeGreen}>OPTIMAL</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper Card Component
function StatCard({ title, value, unit, icon: Icon, trend, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={styles.statTitle}>{title}</span>
        <div style={{ ...styles.iconBadge, backgroundColor: `${color}15` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={styles.statValueGroup}>
        <span style={styles.statValue}>{value}</span>
        <span style={styles.statUnit}>{unit}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: color, marginTop: '8px' }}>
        {trend}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EMBEDDED INLINE STYLES (DARK DIGITAL TWIN CONSOLE THEME)
// -----------------------------------------------------------------------------
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#090d16',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#0f172a',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    boxSizing: 'border-box',
    justifyContent: 'space-between',
  },
  brandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '24px',
    borderBottom: '1px solid #1e293b',
  },
  logoBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0, 242, 254, 0.2)',
  },
  brandTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#f8fafc',
  },
  brandSub: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '24px',
    flexGrow: 1,
  },
  navButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    fontSize: '0.875rem',
  },
  navButtonActive: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid #334155',
  },
  activeIndicator: {
    position: 'absolute',
    right: '0',
    top: '20%',
    height: '60%',
    width: '3px',
    backgroundColor: '#00f2fe',
    borderRadius: '2px',
  },
  systemStatusBox: {
    backgroundColor: '#020617',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #1e293b',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusTitle: {
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  statusMeta: {
    fontSize: '0.7rem',
    color: '#64748b',
    marginTop: '4px',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    backgroundColor: '#090d16',
  },
  topHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  pageTitle: {
    fontSize: '1.35rem',
    fontWeight: '700',
    margin: 0,
    color: '#f8fafc',
  },
  pageSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pillBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: '#1e293b',
    fontSize: '0.75rem',
    color: '#94a3b8',
    border: '1px solid #334155',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '6px',
    backgroundColor: '#00f2fe15',
    color: '#00f2fe',
    border: '1px solid #00f2fe40',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  tabContainer: {
    padding: '32px',
    flexGrow: 1,
  },
  viewLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    padding: '16px',
    borderRadius: '10px',
  },
  statTitle: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  statValueGroup: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  statUnit: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  iconBadge: {
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvasWrapper: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    height: '380px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  mapOverlayHeader: {
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simulatedMapGraphic: {
    flexGrow: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    justifyContent: 'center',
    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  },
  berthLine: {
    borderBottom: '2px dashed #00f2fe',
    paddingBottom: '8px',
  },
  berthLabel: {
    fontSize: '0.75rem',
    color: '#00f2fe',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  agvLaneGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '12px',
  },
  agvNode: {
    backgroundColor: '#020617',
    border: '1px solid #334155',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  sectionHeader: {
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: 0,
  },
  yardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  yardCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    padding: '16px',
    borderRadius: '8px',
  },
  yardCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criticalTag: {
    backgroundColor: '#ef444420',
    color: '#ef4444',
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #ef444440',
  },
  progressTrack: {
    height: '6px',
    backgroundColor: '#1e293b',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  yardCardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '12px',
  },
  simPanel: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    padding: '24px',
    borderRadius: '10px',
  },
  simControlsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  simControlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  simLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  slider: {
    accentColor: '#00f2fe',
    cursor: 'pointer',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#00f2fe',
    color: '#020617',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  simResultsBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    padding: '20px',
    borderRadius: '10px',
  },
  analyticsTableWrapper: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    padding: '20px',
    borderRadius: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid #1e293b',
  },
  th: {
    padding: '12px',
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '12px',
    fontSize: '0.85rem',
    color: '#e2e8f0',
  },
  statusBadgeGreen: {
    color: '#10b981',
    backgroundColor: '#10b98115',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
  statusBadgeYellow: {
    color: '#f59e0b',
    backgroundColor: '#f59e0b15',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
};