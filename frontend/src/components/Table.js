import React from 'react';
import Scoreboard from './Scoreboard';
import Card from './Card';

/**
 * Table — the center area: scoreboard, bid banner, trick pile, deal label.
 *
 * Props:
 *   scores         { NS, EW }
 *   phase          string
 *   highestBid     number
 *   consecutivePasses number
 *   bidder         number (-1 if none)
 *   players        string[]
 *   trump          string | null
 *   trumpName      string
 *   trumpRevealed  bool
 *   played         [{rank,suit}|null] × 4
 *   myIndex        number
 *   trickWins      number[]
 *   handsLeft      number  (cards left in local player's hand)
 */
function Table({
  scores,
  phase,
  highestBid,
  consecutivePasses,
  bidder,
  players,
  trump,
  trumpName,
  trumpRevealed,
  played,
  myIndex,
  handsLeft,
}) {
  // Map player index → position label (for slot labels N/E/S/W)
  // Seat positions relative to myIndex:
  // bottom=myIndex, right=(myIndex+1)%4, top=(myIndex+2)%4, left=(myIndex+3)%4
  const positions = ['bottom', 'right', 'top', 'left'];
  const idxAtPos = {};
  for (let i = 0; i < 4; i++) idxAtPos[positions[i]] = (myIndex + i) % 4;

  const posLabels = { bottom: 'S', right: 'E', top: 'N', left: 'W' };
  // Trick pile grid order: top-left=N slot, top-right=E slot, bottom-left=W slot, bottom-right=S slot
  const slotOrder = ['top', 'right', 'left', 'bottom'];

  function bidBanner() {
    if (phase === 'bidding')
      return `Bidding • highest: ${highestBid} • ${consecutivePasses} pass${consecutivePasses !== 1 ? 'es' : ''}`;
    if (phase === 'trump')
      return `${players[bidder] || '?'} is choosing trump…`;
    if (phase === 'playing')
      return `Bid: ${highestBid} by ${players[bidder] || '?'} • Trump: ${trumpRevealed ? `${trump} ${trumpName}` : 'hidden'}`;
    return '';
  }

  return (
    <div className="center-area">
      <Scoreboard scores={scores} />

      {bidBanner() && (
        <div className="bid-banner">{bidBanner()}</div>
      )}

      {/* Trick pile — 2×2 grid */}
      <div className="trick-pile">
        {slotOrder.map(pos => {
          const idx = idxAtPos[pos];
          const card = played[idx];
          return (
            <div className="trick-slot" key={pos}>
              <span className="trick-slot__label">{posLabels[pos]}</span>
              {card && <Card rank={card.rank} suit={card.suit} showPts={false} />}
            </div>
          );
        })}
      </div>

      {phase === 'playing' && (
        <div className="deal-label">Cards in hand: {handsLeft}</div>
      )}
      {phase === 'bidding' && (
        <div className="deal-label">Bidding on first 4 cards</div>
      )}
    </div>
  );
}

export default Table;