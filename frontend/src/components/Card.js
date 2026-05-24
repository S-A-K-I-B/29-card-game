import React from 'react';
import { isRedSuit, RANK_POINTS } from '../GameEngine';

/**
 * Card — face-up playing card.
 * Props:
 *   rank       string  e.g. "J", "9", "A", "10"
 *   suit       string  e.g. "♥", "♠"
 *   selected   bool    lifted + gold border
 *   disabled   bool    dimmed, not clickable
 *   showPts    bool    show point badge (★)
 *   onClick    fn
 */
function Card({ rank, suit, selected = false, disabled = false, showPts = true, onClick }) {
  const red = isRedSuit(suit);
  const pts = RANK_POINTS[rank];

  const wrapClass = [
    'card-wrap',
    selected  ? 'card-wrap--selected'  : '',
    disabled  ? 'card-wrap--disabled'  : '',
  ].filter(Boolean).join(' ');

  const cardClass = ['card', red ? 'card--red' : 'card--black'].join(' ');

  return (
    <div className={wrapClass} onClick={!disabled ? onClick : undefined}>
      <div className={cardClass}>
        {showPts && pts > 0 && <span className="card__pts">{pts}★</span>}
        <div className="card__rank">
          {rank}
          <br />
          <span style={{ fontSize: '0.75rem' }}>{suit}</span>
        </div>
        <div className="card__suit-center">{suit}</div>
        <div className="card__rank-bot">{rank}</div>
      </div>
    </div>
  );
}

/**
 * CardBack — face-down card.
 * Props: style (optional extra style)
 */
export function CardBack({ style }) {
  return <div className="card-back" style={style} />;
}

export default Card;