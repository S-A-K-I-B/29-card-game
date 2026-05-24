import React from 'react';
import Card, { CardBack } from './Card';
import { validCardIndices } from '../GameEngine';

/**
 * PlayerArea — renders one player's name tag, hand, and played card slot.
 *
 * Props:
 *   position       'bottom' | 'top' | 'left' | 'right'
 *   playerName     string
 *   hand           array of {rank, suit}   (own cards, face-up if isMe)
 *   playedCard     {rank, suit} | null      card played this trick
 *   isMe           bool   — this is the local player
 *   isActive       bool   — it's this player's turn
 *   phase          string — game phase
 *   trickSuit      string | null
 *   trump          string | null
 *   trumpRevealed  bool
 *   selectedCard   number | null   — index of selected card (for isMe)
 *   trickWins      number
 *   onCardClick    fn(index)
 */
function PlayerArea({
  position,
  playerName,
  hand = [],
  playedCard,
  isMe,
  isActive,
  phase,
  trickSuit,
  trump,
  trumpRevealed,
  selectedCard,
  trickWins,
  onCardClick,
}) {
  const isMyTurn = isMe && phase === 'playing' && isActive;
  const validIdxs = isMyTurn
    ? validCardIndices(hand, trickSuit, trump, trumpRevealed)
    : [];

  const tagClass = ['player-area__tag', isActive ? 'player-area__tag--active' : ''].join(' ');

  /* ── Name tag ─────────────────────────────── */
  const nameTag = (
    <div className={tagClass}>
      {isActive && <span className="turn-dot" />}
      <span>{playerName || '...'}</span>
      <span className="tricks-badge">{trickWins || 0}</span>
    </div>
  );

  /* ── Played card slot ─────────────────────── */
  const playedSlot = (
    <div className="played-area">
      {playedCard && (
        <Card rank={playedCard.rank} suit={playedCard.suit} showPts={false} />
      )}
    </div>
  );

  /* ── Hand rendering ───────────────────────── */
  let handEl = null;

  if (isMe) {
    // Face-up, clickable
    handEl = (
      <div className="hand">
        {hand.map((card, i) => (
          <Card
            key={i}
            rank={card.rank}
            suit={card.suit}
            selected={selectedCard === i}
            disabled={isMyTurn && !validIdxs.includes(i)}
            showPts
            onClick={() => onCardClick(i)}
          />
        ))}
      </div>
    );
  } else if (position === 'top') {
    handEl = (
      <div className="hand hand--top">
        {hand.map((_, i) => <CardBack key={i} />)}
      </div>
    );
  } else {
    // left / right — vertical stack
    handEl = (
      <div className="hand hand--side">
        {hand.map((_, i) => (
          <CardBack key={i} style={{ width: 38, height: 54 }} />
        ))}
      </div>
    );
  }

  /* ── Layout per position ──────────────────── */
  return (
    <div className={`player-area player-area--${position}`}>
      {/* top: tag → hand → played */}
      {position === 'top' && (
        <>
          {nameTag}
          {handEl}
          {playedSlot}
        </>
      )}

      {/* bottom: played → hand → tag */}
      {position === 'bottom' && (
        <>
          {playedSlot}
          {handEl}
          {nameTag}
        </>
      )}

      {/* left / right: tag → hand → played */}
      {(position === 'left' || position === 'right') && (
        <>
          {nameTag}
          {handEl}
          {playedSlot}
        </>
      )}
    </div>
  );
}

export default PlayerArea;