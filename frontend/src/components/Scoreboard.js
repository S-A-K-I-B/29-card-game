import React from 'react';

/**
 * Scoreboard — shows NS and EW round scores.
 * Props:
 *   scores  { NS: number, EW: number }
 */
function Scoreboard({ scores = { NS: 0, EW: 0 } }) {
  return (
    <div className="scoreboard">
      <div className="score-pill">
        <span className="score-pill__team">NS</span>
        <span className="score-pill__val">{scores.NS}</span>
      </div>
      <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>rounds</span>
      <div className="score-pill">
        <span className="score-pill__team">EW</span>
        <span className="score-pill__val">{scores.EW}</span>
      </div>
    </div>
  );
}

export default Scoreboard;