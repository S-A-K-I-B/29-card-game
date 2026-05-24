import React from 'react';
import PlayerArea from './PlayerArea';

function Table({ players, currentTrick }) {
  return (
    <div>
      <h2>Current Trick</h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {currentTrick.map((card, i) => (
          <div key={i} style={{ margin: "10px" }}>
            {card.rank} {card.suit}
          </div>
        ))}
      </div>
      <h2>Players</h2>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        {players.map((p) => (
          <PlayerArea key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

export default Table;
