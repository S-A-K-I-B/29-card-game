import React from 'react';

function Scoreboard({ scores }) {
  return (
    <div style={{ margin: "20px", fontSize: "20px" }}>
      <p>Team A: {scores.teamA}</p>
      <p>Team B: {scores.teamB}</p>
    </div>
  );
}

export default Scoreboard;
