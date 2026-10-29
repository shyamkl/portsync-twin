import React, { useState } from 'react';
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
            <Radio size={14} color="#10b981" />
            <span style={styles.statusTitle}>TELEMETRY LIVE</span>
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
            <button style={styles.refreshButton}>
              <RefreshCw size={14} color="#e2e8f0" />
              <span>Sync Twin</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div style={styles.tabContainer}>
          {activeTab === 'map' && <CommandMapView />}
          {activeTab === 'yard' && <YardDensityView />}
          {activeTab === 'sim' && <SimulationLabView />}
          {activeTab === 'analytics' && <AnalyticsView />}
        </div>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 1: COMMAND MAP VIEW
// -----------------------------------------------------------------------------
function CommandMapView() {
  return (
    <div style={styles.viewLayout}>
      <div style={styles.statsGrid}>
        <StatCard title="Active Vessels" value="14" unit="at berth" icon={Anchor} trend="+2 today" color="#00f2fe" />
        <StatCard title="AGVs Operational" value="88%" unit="42/48 active" icon={Truck} trend="Optimal" color="#10b981" />
        <StatCard title="Crane Throughput" value="31.2" unit="moves/hr" icon={Zap} trend="+4.1%" color="#f59e0b" />
        <StatCard title="Alert Escalations" value="03" unit="pending action" icon={AlertTriangle} trend="-1 critical" color="#ef4444" />
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
          <div style={styles.vesselBox}>
            <Anchor size={24} color="#00f2fe" />
            <span>CONTAINER VESSEL MSC EDITH</span>
          </div>
          
          <div style={styles.agvLaneGrid}>
            <div style={styles.agvNode}>AGV-01 [ACTIVE]</div>
            <div style={styles.agvNode}>AGV-04 [CHARGING]</div>
            <div style={styles.agvNode}>AGV-12 [TRANSIT]</div>
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
function AnalyticsView() {
  return (
    <div style={styles.viewLayout}>
      <div style={styles.statsGrid}>
        <StatCard title="Turnaround Time" value="1.8 hrs" unit="avg per truck" icon={Clock} trend="-12 mins" color="#10b981" />
        <StatCard title="TEU Throughput" value="14,290" unit="24h volume" icon={ArrowUpRight} trend="+8.4%" color="#00f2fe" />
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
      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px' }}>
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
    color: '#10b981',
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
  vesselBox: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    padding: '12px 16px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    width: 'fit-content',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  agvLaneGrid: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  agvNode: {
    backgroundColor: '#020617',
    border: '1px solid #334155',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    color: '#10b981',
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