import React, { useState, useEffect } from 'react';

// Pre-populated initial dataset for the 6x6 PortSync Yard Matrix (Blocks A1 to F6)
const INITIAL_YARD_BLOCKS = Array.from({ length: 36 }, (_, index) => {
  const rowLetter = String.fromCharCode(65 + Math.floor(index / 6)); // A through F
  const colNumber = (index % 6) + 1;                                // 1 through 6
  const blockId = `Block ${rowLetter}${colNumber}`;

  const occupancy = Math.floor((((index * 19) + 17) % 84) + 14);
  const reeferCount = Math.floor((occupancy * 0.95) + (index % 5));
  const standardDryCount = Math.floor(occupancy * 2.8);
  const avgDwellHours = Number(((occupancy * 1.4) + (index % 4) * 3 + 12.5).toFixed(1));

  return {
    id: blockId,
    row: rowLetter,
    col: colNumber,
    occupancy,
    reeferCount,
    standardDryCount,
    totalUnits: reeferCount + standardDryCount,
    avgDwellHours,
    lastTelemetrySync: `2026-10-29 20:${(index * 13) % 60 < 10 ? '0' : ''}${(index * 13) % 60}`
  };
});

const getDensityTierConfig = (occupancy) => {
  if (occupancy > 80) {
    return {
      bg: 'rgba(127, 29, 29, 0.6)',
      border: '#ef4444',
      badgeBg: '#7f1d1d',
      badgeText: '#fca5a5',
      statusLabel: 'CRITICAL CONGESTION RISK',
      isHighRisk: true
    };
  }
  if (occupancy >= 50) {
    return {
      bg: 'rgba(120, 53, 15, 0.4)',
      border: '#d97706',
      badgeBg: '#78350f',
      badgeText: '#fde68a',
      statusLabel: 'MODERATE CAPACITY TIER',
      isHighRisk: false
    };
  }
  return {
    bg: 'rgba(20, 83, 45, 0.4)',
    border: '#22c55e',
    badgeBg: '#14532d',
    badgeText: '#bbf7d0',
    statusLabel: 'OPTIMAL DENSITY LEVEL',
    isHighRisk: false
  };
};

export default function YardMatrix() {
  const [yardData] = useState(INITIAL_YARD_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState(INITIAL_YARD_BLOCKS[0]);
  const [pulseAnim, setPulseAnim] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseAnim((prev) => !prev);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: '20px',
      backgroundColor: '#090d16',
      color: '#f1f5f9',
      padding: '20px',
      borderRadius: '12px',
      fontFamily: 'Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
      border: '1px solid #1e293b',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Left Column: 6x6 Interactive Grid Canvas Matrix */}
      <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* Header and Telemetry Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '10px',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.025em' }}>
              Yard Density Matrix [Blocks A1 - F6]
            </h2>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              PortSync Twin Live Terminal Storage Tracker
            </span>
          </div>

          {/* Density Tier Indicator Legends */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#14532d', border: '1px solid #22c55e' }}></span> &lt;50% Safe
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#78350f', border: '1px solid #d97706' }}></span> 50-80% Mod
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#7f1d1d', border: '1px solid #ef4444' }}></span> &gt;80% High Risk
            </span>
          </div>
        </div>

        {/* 6x6 Grid Layout Canvas with minmax for perfect vertical fit */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
          gap: '8px',
          flex: 1,
          minHeight: 0
        }}>
          {yardData.map((block) => {
            const config = getDensityTierConfig(block.occupancy);
            const isSelected = selectedBlock?.id === block.id;

            const activeBorder = isSelected 
              ? '2px solid #38bdf8' 
              : config.isHighRisk && pulseAnim 
                ? '1px solid #f87171' 
                : `1px solid ${config.border}`;

            return (
              <button
                key={block.id}
                onClick={() => setSelectedBlock(block)}
                style={{
                  backgroundColor: config.bg,
                  border: activeBorder,
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  outline: 'none',
                  boxShadow: isSelected 
                    ? '0 0 12px rgba(56, 189, 248, 0.4)' 
                    : config.isHighRisk 
                      ? 'inset 0 0 6px rgba(239, 68, 68, 0.2)' 
                      : 'none',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                  minHeight: 0
                }}
              >
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  color: '#cbd5e1', 
                  letterSpacing: '0.03em',
                  marginBottom: '1px' 
                }}>
                  {block.id.replace('Block ', '')}
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: isSelected ? '#ffffff' : '#f8fafc'
                }}>
                  {block.occupancy}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detailed Side Metrics Panel */}
      <div style={{
        flex: '0 0 300px',
        backgroundColor: '#0f172a',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid #1e293b',
        boxSizing: 'border-box'
      }}>
        {selectedBlock ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div>
              {/* Panel Title & Slot ID Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid #1e293b',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}>
                <div>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Active Slot Telemetry
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
                    {selectedBlock.id}
                  </h3>
                </div>
                <span style={{
                  backgroundColor: getDensityTierConfig(selectedBlock.occupancy).badgeBg,
                  color: getDensityTierConfig(selectedBlock.occupancy).badgeText,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${getDensityTierConfig(selectedBlock.occupancy).border}`
                }}>
                  {selectedBlock.occupancy}% FULL
                </span>
              </div>

              {/* Metrics List Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Congestion Alert Status Box */}
                <div style={{
                  backgroundColor: '#131c31',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #1e293b'
                }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>
                    Density Tier Status
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getDensityTierConfig(selectedBlock.occupancy).border }}>
                    {getDensityTierConfig(selectedBlock.occupancy).statusLabel}
                  </span>
                </div>

                {/* Average Dwell Duration (Hours) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: '#131c31',
                  borderRadius: '6px',
                  border: '1px solid #1e293b'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Avg Dwell Duration</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    {selectedBlock.avgDwellHours} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>Hrs</span>
                  </span>
                </div>

                {/* Active Reefer Counts (Pharma Focus) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: '#131c31',
                  borderRadius: '6px',
                  border: '1px solid #1e293b'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Active Reefer Count</span>
                    <span style={{ fontSize: '0.6rem', color: '#38bdf8' }}>Pharma &amp; Cold-Chain</span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                    {selectedBlock.reeferCount} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>TEU</span>
                  </span>
                </div>

                {/* Pending Standard Dry Containers */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: '#131c31',
                  borderRadius: '6px',
                  border: '1px solid #1e293b'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Standard Dry Units</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    {selectedBlock.standardDryCount} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>TEU</span>
                  </span>
                </div>

                {/* Total Combined Slot Inventory */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: '#131c31',
                  borderRadius: '6px',
                  borderLeft: '3px solid #38bdf8',
                  borderTop: '1px solid #1e293b',
                  borderRight: '1px solid #1e293b',
                  borderBottom: '1px solid #1e293b'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Total Slot Volume</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                    {selectedBlock.totalUnits} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>TEU</span>
                  </span>
                </div>

              </div>
            </div>

            {/* Panel Footer Timestamp */}
            <div style={{
              fontSize: '0.65rem',
              color: '#64748b',
              borderTop: '1px solid #1e293b',
              paddingTop: '10px',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Telemetry Stamp:</span>
              <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{selectedBlock.lastTelemetrySync}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
            Select any yard block node on the matrix canvas to inspect real-time asset inventory metrics.
          </div>
        )}
      </div>
    </div>
  );
}