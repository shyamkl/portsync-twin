import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Activity, AlertTriangle, Truck, Anchor, Train, 
  Thermometer, ShieldCheck, TrendingUp, Clock, Server, Radio
} from 'lucide-react';

// Mock Data for the 3 Port Logistics Dashboards
const gateQueueData = [
  { time: '00:00', latency: 12 },
  { time: '03:00', latency: 8 },
  { time: '06:00', latency: 15 },
  { time: '09:00', latency: 45 },
  { time: '12:00', latency: 38 },
  { time: '15:00', latency: 52 },
  { time: '18:00', latency: 29 },
  { time: '21:00', latency: 18 },
];

const intermodalData = [
  { mode: 'Vessel (Berth 1-4)', processingTime: 42, target: 35 },
  { mode: 'Rail Terminal', processingTime: 28, target: 30 },
  { mode: 'Road Gate (In/Out)', processingTime: 18, target: 15 },
];

const reeferTempData = [
  { hour: '02:00', containerR41: 4.2, containerR42: 3.9, safeLimit: 8.0 },
  { hour: '06:00', containerR41: 4.5, containerR42: 4.1, safeLimit: 8.0 },
  { hour: '10:00', containerR41: 5.1, containerR42: 4.0, safeLimit: 8.0 },
  { hour: '14:00', containerR41: 7.8, containerR42: 4.3, safeLimit: 8.0 }, // Approaching upper threshold
  { hour: '18:00', containerR41: 5.0, containerR42: 4.2, safeLimit: 8.0 },
  { hour: '22:00', containerR41: 4.4, containerR42: 3.8, safeLimit: 8.0 },
];

const initialAlerts = [
  { id: 1, type: 'CRITICAL', message: 'ALERT: Yard Block C4 Approaching 88% Capacity Limit', timestamp: '12 mins ago' },
  { id: 2, type: 'WARNING', message: 'GATE 3: Truck Queue Latency exceeded 45m threshold', timestamp: '25 mins ago' },
  { id: 3, type: 'INFO', message: 'REEFER POD #12: Temperature fluctuation detected on Pharma Line B', timestamp: '41 mins ago' }
];

export default function AnalyticsInsights() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      {/* Top Header & Telemetry Status Bar */}
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.title}>Analytics & Operational Insights</h1>
          <p style={styles.subtitle}>PortSync Digital Twin Telemetry — Real-time Terminal Performance</p>
        </div>
        <div style={styles.statusBadge}>
          <Radio size={16} color="#00F2FE" style={styles.pulseIcon} />
          <span style={styles.statusText}>LIVE SYNC ACTIVE | {liveClock}</span>
        </div>
      </div>

      {/* System Health Status Triage Box */}
      <div style={styles.triageBox}>
        <div style={styles.triageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <h2 style={styles.triageTitle}>System Health Status Triage</h2>
          </div>
          <span style={styles.activeCountBadge}>{alerts.length} Active Incidents</span>
        </div>
        <div style={styles.alertList}>
          {alerts.map((alert) => (
            <div key={alert.id} style={{
              ...styles.alertItem, 
              borderLeft: alert.type === 'CRITICAL' ? '4px solid #EF4444' : '4px solid #F59E0B'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  ...styles.alertTag,
                  backgroundColor: alert.type === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: alert.type === 'CRITICAL' ? '#EF4444' : '#F59E0B'
                }}>
                  {alert.type}
                </span>
                <span style={styles.alertMessage}>{alert.message}</span>
              </div>
              <span style={styles.alertTime}>{alert.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Operational Summary Grid (3 Data Charts) */}
      <div style={styles.gridContainer}>
        
        {/* Chart 1: Hourly Truck Gate Queue Latency */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#00F2FE" />
              <h3 style={styles.cardTitle}>Hourly Truck Gate Queue Latency</h3>
            </div>
            <span style={styles.cardSublabel}>24-Hour Cycle (mins)</span>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gateQueueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip contentStyle={styles.tooltipStyle} />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#00F2FE" 
                  strokeWidth={3} 
                  dot={{ fill: '#00F2FE', r: 4 }} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Intermodal Turnaround Efficiency */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="#10B981" />
              <h3 style={styles.cardTitle}>Intermodal Turnaround Efficiency</h3>
            </div>
            <span style={styles.cardSublabel}>Processing Time (Hours vs Target)</span>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intermodalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                <YAxis dataKey="mode" type="category" stroke="#94A3B8" fontSize={11} width={110} />
                <Tooltip contentStyle={styles.tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
                <Bar dataKey="processingTime" fill="#4FACFE" name="Actual Time" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" fill="#10B981" name="Target SLA" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Reefer Temperature Stability Logs */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} color="#EF4444" />
              <h3 style={styles.cardTitle}>Reefer Temp Stability Logs</h3>
            </div>
            <span style={styles.cardSublabel}>Sensitive Pharma Line (°C)</span>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reeferTempData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 10]} />
                <Tooltip contentStyle={styles.tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
                <Area type="monotone" dataKey="containerR41" stroke="#EF4444" fill="rgba(239, 68, 68, 0.15)" name="Pod R-41" strokeWidth={2} />
                <Area type="monotone" dataKey="containerR42" stroke="#10B981" fill="rgba(16, 185, 129, 0.15)" name="Pod R-42" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Embedded Inline Cyber Logistics Theme Styles
const styles = {
  container: {
    backgroundColor: '#0B132B',
    color: '#E2E8F0',
    padding: '24px',
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    margin: '4px 0 0 0',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    border: '1px solid rgba(0, 242, 254, 0.3)',
    padding: '6px 14px',
    borderRadius: '20px',
  },
  statusText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#00F2FE',
    letterSpacing: '0.5px',
  },
  triageBox: {
    backgroundColor: '#1C2541',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '18px 20px',
    marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  triageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  triageTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F8FAFC',
    margin: 0,
  },
  activeCountBadge: {
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 19, 43, 0.6)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  alertTag: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  alertMessage: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
  alertTime: {
    fontSize: '11px',
    color: '#64748B',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1C2541',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    height: '340px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#F8FAFC',
    margin: 0,
  },
  cardSublabel: {
    fontSize: '11px',
    color: '#94A3B8',
  },
  chartWrapper: {
    flex: 1,
    width: '100%',
    minHeight: '230px',
  },
  tooltipStyle: {
    backgroundColor: '#0B132B',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#F8FAFC',
    fontSize: '12px',
  },
};