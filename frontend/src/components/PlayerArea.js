import React from 'react';
import Card from './Card';

function PlayerArea({ player }) {
  return (
    <div style={{ margin: "20px" }}>
      <h3>{player.name}</h3>
      <div style={{ display: "flex" }}>
        {player.hand.map((card, i) => (
          <Card key={i} suit={card.suit} rank={card.rank} />
        ))}
      </div>
    </div>
  );
}

export default PlayerArea;
