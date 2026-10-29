import React, { useState } from 'react';
import YardMatrix from './YardMatrix';
import CommandMap from './CommandMap';

export default function App() {
  const [activeTab, setActiveTab] = useState('commandMap');

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
      padding: 0
    }}>
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

        {/* Bottom Sidebar Status Box */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span> TELEMETRY LIVE
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
            Latency: 12ms | Async Loop Active
          </span>
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
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Crane Throughput</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>31.2 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>moves/hr</span></div>
                <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>+4.1%</span>
              </div>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Alert Escalations</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px 0' }}>03 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>pending action</span></div>
                <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>-1 critical</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', textAlign: 'center' }}>
            <h2>Simulation Lab</h2>
            <p>Predictive port congestion simulation models are loading...</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', textAlign: 'center' }}>
            <h2>Analytics &amp; Insights</h2>
            <p>Terminal efficiency metrics and throughput analytics pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}