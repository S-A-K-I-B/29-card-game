import React, { useState, useEffect, useRef, useCallback } from 'react';
import PlayerArea from './components/PlayerArea';
import Table from './components/Table';
import {
  initializeGame,
  startNewRound,
  applyBid,
  applyTrump,
  applyPlay,
  resolveTrick,
  endRound,
  aiChooseBid,
  aiChooseTrump,
  aiChooseCard,
  SUITS,
  isRedSuit,
} from './GameEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Multiplayer: localStorage + polling (works across tabs on same browser).
// The "host" (creator) owns state and processes all actions.
// Other players post actions and poll for state updates.
// ─────────────────────────────────────────────────────────────────────────────

function genCode() { return String(Math.floor(1000 + Math.random() * 9000)); }
function roomKey(code) { return '29cg_' + code; }
function loadRoom(code) {
  const d = localStorage.getItem(roomKey(code));
  return d ? JSON.parse(d) : null;
}
function saveRoom(code, data) {
  localStorage.setItem(roomKey(code), JSON.stringify(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast hook
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const toast = useCallback((text) => {
    setMsg(text);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2400);
  }, []);
  return { msg, show, toast };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [G, setG] = useState(initializeGame);
  const { msg: toastMsg, show: toastShow, toast } = useToast();
  const syncRef = useRef(null);
  const pollRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushState = useCallback((state) => {
    if (!state.isHost) return;
    const room = loadRoom(state.roomCode) || {};
    Object.assign(room, stateToRoom(state));
    saveRoom(state.roomCode, room);
  }, []);

  const pushAction = useCallback((code, action) => {
    const room = loadRoom(code) || {};
    room.pendingAction = action;
    saveRoom(code, room);
  }, []);

  // Serialise only what non-host clients need
  function stateToRoom(s) {
    return {
      players: s.players,
      phase: s.phase,
      hands: s.hands,
      firstHands: s.firstHands,
      secondBatch: s.secondBatch,
      highestBid: s.highestBid,
      bids: s.bids,
      consecutivePasses: s.consecutivePasses,
      bidder: s.bidder,
      trump: s.trump,
      trumpName: s.trumpName,
      trumpRevealed: s.trumpRevealed,
      currentPlayer: s.currentPlayer,
      trickLeader: s.trickLeader,
      trickSuit: s.trickSuit,
      played: s.played,
      trickWins: s.trickWins,
      trickPts: s.trickPts,
      lastTrickWinner: s.lastTrickWinner,
      scores: s.scores,
      dealer: s.dealer,
      roundResult: s.roundResult,
    };
  }

  // ── Action dispatcher (runs only on host) ─────────────────────────────────

  const dispatchAction = useCallback((action, currentState) => {
    setG(prev => {
      const s = currentState || prev;
      return processAction(action, s);
    });
  }, []); // eslint-disable-line

  function processAction(action, state) {
    if (action.type === 'bid') return handleBidAction(state, action.player, action.value);
    if (action.type === 'trump') return handleTrumpAction(state, action.suit);
    if (action.type === 'play') return handlePlayAction(state, action.player, action.cardIdx);
    return state;
  }

  // ── Bid logic ──────────────────────────────────────────────────────────────

  function handleBidAction(state, player, value) {
    let s = applyBid(state, player, value);

    if (value === 0) toast(state.players[player] + ' passed');
    else toast(state.players[player] + ' bids ' + value);

    if (s.phase === 'trump') {
      // Let AI choose trump if bidder is not human
      if (s.bidder !== s.myIndex) {
        setTimeout(() => {
          setG(prev => {
            const suit = aiChooseTrump(prev, prev.bidder);
            return handleTrumpAction(prev, suit);
          });
        }, 1400);
      }
      return s;
    }

    // Next turn
    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          const v = aiChooseBid(prev, prev.currentPlayer);
          return handleBidAction(prev, prev.currentPlayer, v);
        }
        return prev;
      });
    }, 900);

    return s;
  }

  function handleTrumpAction(state, suit) {
    let s = applyTrump(state, suit);
    toast(state.players[state.bidder] + ' chose trump (secret)');

    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          return handlePlayAction(prev, prev.currentPlayer, aiChooseCard(prev, prev.currentPlayer));
        }
        return prev;
      });
    }, 700);

    return s;
  }

  // ── Play logic ─────────────────────────────────────────────────────────────

  function handlePlayAction(state, player, cardIdx) {
    let s = applyPlay(state, player, cardIdx);

    if (s.trumpRevealed && !state.trumpRevealed) {
      toast('Trump revealed: ' + s.trumpName + ' ' + s.trump + '!');
    }

    const allPlayed = s.played.every(c => c !== null);

    if (allPlayed) {
      setTimeout(() => {
        setG(prev => {
          const after = resolveTrick(prev);
          toast(prev.players[after.trickJustResolved] + ' wins! (+' + after.trickJustPts + ' pts)');
          if (after.roundComplete) {
            const final = endRound(after);
            return final;
          }
          // Next player
          setTimeout(() => {
            setG(p2 => {
              if (p2.currentPlayer !== p2.myIndex && p2.isHost) {
                return handlePlayAction(p2, p2.currentPlayer, aiChooseCard(p2, p2.currentPlayer));
              }
              return p2;
            });
          }, 600);
          return after;
        });
      }, 1300);
      return s;
    }

    // Advance to next player
    s = { ...s, currentPlayer: (player + 1) % 4 };

    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          return handlePlayAction(prev, prev.currentPlayer, aiChooseCard(prev, prev.currentPlayer));
        }
        return prev;
      });
    }, 500);

    return s;
  }

  // ── Sync (push state after every change if host) ──────────────────────────

  useEffect(() => {
    if (G.isHost && G.roomCode && G.phase !== 'lobby') {
      pushState(G);
    }
  }, [G, pushState]);

  // ── Host: poll for non-host actions ───────────────────────────────────────

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!G.isHost || !G.roomCode) return;
    pollRef.current = setInterval(() => {
      const room = loadRoom(G.roomCode);
      if (!room || !room.pendingAction) return;
      const action = room.pendingAction;
      delete room.pendingAction;
      saveRoom(G.roomCode, room);
      setG(prev => processAction(action, prev));
    }, 400);
    return () => clearInterval(pollRef.current);
  }, [G.isHost, G.roomCode]); // eslint-disable-line

  // ── Non-host: poll for state updates ──────────────────────────────────────

  useEffect(() => {
    clearInterval(syncRef.current);
    if (G.isHost || !G.roomCode) return;
    syncRef.current = setInterval(() => {
      const room = loadRoom(G.roomCode);
      if (!room || room.phase === 'lobby') return;
      setG(prev => ({
        ...prev,
        ...room,
        myIndex: prev.myIndex,
        isHost: false,
        roomCode: prev.roomCode,
        selectedCard: null,
      }));
    }, 600);
    return () => clearInterval(syncRef.current);
  }, [G.isHost, G.roomCode]);

  // ── UI Actions ─────────────────────────────────────────────────────────────

  function submitBid(value) {
    if (G.isHost) {
      setG(prev => handleBidAction(prev, prev.myIndex, value));
    } else {
      pushAction(G.roomCode, { type: 'bid', player: G.myIndex, value });
    }
  }

  function submitTrump(suit) {
    if (G.isHost) {
      setG(prev => handleTrumpAction(prev, suit));
    } else {
      pushAction(G.roomCode, { type: 'trump', suit });
    }
  }

  function selectCard(idx) {
    if (G.phase !== 'playing' || G.currentPlayer !== G.myIndex) return;
    setG(prev => ({
      ...prev,
      selectedCard: prev.selectedCard === idx ? null : idx,
    }));
  }

  function playSelected() {
    if (G.selectedCard === null) return;
    const idx = G.selectedCard;
    setG(prev => ({ ...prev, selectedCard: null }));
    if (G.isHost) {
      setG(prev => handlePlayAction(prev, prev.myIndex, idx));
    } else {
      pushAction(G.roomCode, { type: 'play', player: G.myIndex, cardIdx: idx });
    }
  }

  function newRound() {
    if (!G.isHost) return;
    setG(prev => startNewRound(prev));
    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          const v = aiChooseBid(prev, prev.currentPlayer);
          return handleBidAction(prev, prev.currentPlayer, v);
        }
        return prev;
      });
    }, 700);
  }

  function quitGame() {
    clearInterval(syncRef.current);
    clearInterval(pollRef.current);
    if (G.roomCode) localStorage.removeItem(roomKey(G.roomCode));
    setG(initializeGame());
  }

  function copyCode() {
    navigator.clipboard.writeText(G.roomCode).catch(() => {});
    toast('Room code copied!');
  }

  // ── Lobby handlers ─────────────────────────────────────────────────────────
  const [lobbyView, setLobbyView] = useState('home'); // home | create | join
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [waitPlayers, setWaitPlayers] = useState(['', '', '', '']);
  const [createdCode, setCreatedCode] = useState('');
  const lobbyPollRef = useRef(null);

  function createRoom() {
    const name = createName.trim() || 'Player 1';
    const code = genCode();
    setCreatedCode(code);
    setG(prev => ({ ...prev, roomCode: code, isHost: true, myIndex: 0, players: [name, '', '', ''] }));
    saveRoom(code, { players: [name, '', '', ''], phase: 'lobby' });
    setWaitPlayers([name, '', '', '']);
    setLobbyView('waiting');

    clearInterval(lobbyPollRef.current);
    lobbyPollRef.current = setInterval(() => {
      const room = loadRoom(code);
      if (!room) return;
      setWaitPlayers([...room.players]);
      setG(prev => ({ ...prev, players: room.players }));
    }, 700);
  }

  function joinRoom() {
    const name = joinName.trim() || 'Player';
    const code = joinCode.trim();
    if (!code) { setJoinError('Enter a room code'); return; }
    const room = loadRoom(code);
    if (!room) { setJoinError('❌ Room not found'); return; }
    if (room.phase !== 'lobby') { setJoinError('❌ Game already started'); return; }
    const slot = room.players.findIndex((p, i) => i > 0 && !p);
    if (slot === -1) { setJoinError('❌ Room is full'); return; }

    room.players[slot] = name;
    saveRoom(code, room);
    setG(prev => ({ ...prev, roomCode: code, isHost: false, myIndex: slot, players: room.players }));
    setJoinError('✅ Joined! Waiting for game to start…');

    clearInterval(lobbyPollRef.current);
    lobbyPollRef.current = setInterval(() => {
      const r = loadRoom(code);
      if (!r) return;
      if (r.phase === 'bidding' || r.phase === 'playing') {
        clearInterval(lobbyPollRef.current);
        setG(prev => ({ ...prev, ...r, myIndex: slot, isHost: false, roomCode: code }));
      }
    }, 700);
  }

  function startGame() {
    clearInterval(lobbyPollRef.current);
    const next = startNewRound({ ...G, scores: { NS: 0, EW: 0 }, dealer: 0 });
    setG(next);
    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          const v = aiChooseBid(prev, prev.currentPlayer);
          return handleBidAction(prev, prev.currentPlayer, v);
        }
        return prev;
      });
    }, 700);
  }

  function soloPlay() {
    const code = genCode();
    const names = ['You', 'Bot East', 'Bot North', 'Bot West'];
    const base = { ...initializeGame(), roomCode: code, isHost: true, myIndex: 0, players: names, scores: { NS: 0, EW: 0 }, dealer: 0 };
    saveRoom(code, { players: names, phase: 'lobby' });
    const next = startNewRound(base);
    setG(next);
    setTimeout(() => {
      setG(prev => {
        if (prev.currentPlayer !== prev.myIndex && prev.isHost) {
          const v = aiChooseBid(prev, prev.currentPlayer);
          return handleBidAction(prev, prev.currentPlayer, v);
        }
        return prev;
      });
    }, 700);
  }

  // ── Seat mapping ───────────────────────────────────────────────────────────
  // bottom=myIndex, right=(myIndex+1)%4, top=(myIndex+2)%4, left=(myIndex+3)%4
  const positions = ['bottom', 'right', 'top', 'left'];
  const idxAtPos = {};
  for (let i = 0; i < 4; i++) idxAtPos[positions[i]] = (G.myIndex + i) % 4;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  /* ── Lobby ──────────────────────────────────────────────────────────────── */
  if (G.phase === 'lobby') {
    return (
      <div className="lobby">
        <div className="lobby__brand">
          29
          <span>CARD GAME</span>
        </div>

        {lobbyView === 'home' && (
          <div className="lobby__cards">
            <div className="lobby__option" onClick={() => setLobbyView('create')}>
              <h2>🃏 Create Room</h2>
              <p>Start a new game and invite 3 friends with a room code</p>
            </div>
            <div className="lobby__option" onClick={() => setLobbyView('join')}>
              <h2>🔗 Join Room</h2>
              <p>Enter a room code to join your friends' game</p>
            </div>
          </div>
        )}

        {lobbyView === 'create' && (
          <div className="lobby__panel">
            <h2>Create a Room</h2>
            <div className="lobby__field">
              <label>Your name</label>
              <input className="lobby__input" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Enter your name" maxLength={16} />
            </div>
            <button className="btn" onClick={createRoom}>Generate Room Code</button>
            <button className="btn btn--secondary btn--sm" onClick={() => setLobbyView('home')}>← Back</button>
          </div>
        )}

        {lobbyView === 'waiting' && (
          <div className="lobby__panel">
            <h2>Share this code</h2>
            <div className="lobby__code">{createdCode}</div>
            <ul className="lobby__player-list">
              {['South (You)', 'East', 'North', 'West'].map((label, i) => (
                <li key={i}>
                  <div className={`dot ${waitPlayers[i] ? '' : 'dot--empty'}`} />
                  {label}: {waitPlayers[i] || 'Waiting…'}
                </li>
              ))}
            </ul>
            <button
              className="btn"
              disabled={waitPlayers.filter(Boolean).length < 4}
              onClick={startGame}
            >
              {waitPlayers.filter(Boolean).length < 4
                ? `Start Game (${waitPlayers.filter(Boolean).length}/4)`
                : '🎮 Start Game!'}
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => { clearInterval(lobbyPollRef.current); localStorage.removeItem(roomKey(createdCode)); setLobbyView('home'); }}>
              Cancel
            </button>
          </div>
        )}

        {lobbyView === 'join' && (
          <div className="lobby__panel">
            <h2>Join a Room</h2>
            <div className="lobby__field">
              <label>Your name</label>
              <input className="lobby__input" value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Enter your name" maxLength={16} />
            </div>
            <div className="lobby__field">
              <label>Room code</label>
              <div className="lobby__input-row">
                <input className="lobby__input" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. 4829" maxLength={4} />
                <button className="btn" onClick={joinRoom}>Join</button>
              </div>
            </div>
            {joinError && <div className="lobby__status">{joinError}</div>}
            <button className="btn btn--secondary btn--sm" onClick={() => { setLobbyView('home'); setJoinError(''); }}>← Back</button>
          </div>
        )}

        {/* Dev shortcut */}
        <div className="dev-bar">
          <strong>Quick test:</strong>{' '}
          <button onClick={soloPlay} style={{ background: 'transparent', border: '1px solid #335', color: '#99b', borderRadius: 4, padding: '0.18rem 0.55rem', cursor: 'pointer', fontSize: '0.72rem' }}>
            ▶ Play vs Bots
          </button>
          {' '}· J=3★ 9=2★ A=1★ 10=1★
        </div>
      </div>
    );
  }

  /* ── Game ───────────────────────────────────────────────────────────────── */
  return (
    <div className="game">

      {/* Toast */}
      <div className={`toast ${toastShow ? 'toast--show' : ''}`}>{toastMsg}</div>

      {/* Bid overlay */}
      {G.phase === 'bidding' && G.currentPlayer === G.myIndex && (
        <div className="overlay">
          <div className="panel">
            <h2>Place Your Bid</h2>
            <div className="panel__sub">
              Current highest: <strong style={{ color: 'var(--accent)' }}>{G.highestBid}</strong>
              &nbsp;|&nbsp; Consecutive passes: {G.consecutivePasses}/3
            </div>
            <div className="bid-grid">
              {[16,17,18,19,20,21,22,23,24,25,26,27,28].map(v => (
                <button key={v} className="bid-btn" disabled={v <= G.highestBid} onClick={() => submitBid(v)}>
                  {v}
                </button>
              ))}
              <button className="bid-btn bid-btn--29" disabled={G.highestBid >= 29} onClick={() => submitBid(29)}>
                29
              </button>
              <button
                className="bid-btn bid-btn--pass"
                disabled={G.consecutivePasses >= 2 && G.bidder === -1}
                onClick={() => submitBid(0)}
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trump overlay */}
      {G.phase === 'trump' && G.bidder === G.myIndex && (
        <div className="overlay">
          <div className="panel">
            <h2>Choose Trump Suit</h2>
            <div className="panel__sub">
              You won with a bid of <strong style={{ color: 'var(--accent)' }}>{G.highestBid}</strong>
              <br />Keep it secret — only revealed when played
            </div>
            <div className="suit-grid">
              {SUITS.map(suit => (
                <button key={suit} className={`suit-btn ${isRedSuit(suit) ? 'suit-btn--red' : ''}`} onClick={() => submitTrump(suit)}>
                  {suit}
                  <span>{{ '♥': 'Hearts', '♠': 'Spades', '♦': 'Diamonds', '♣': 'Clubs' }[suit]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {G.phase === 'result' && G.roundResult && (
        <div className="overlay">
          <div className="panel">
            <h2 style={{ color: (G.scores.NS >= 6 || G.scores.EW >= 6) ? 'var(--green)' : 'var(--accent)' }}>
              {(G.scores.NS >= 6 || G.scores.EW >= 6)
                ? `🏆 ${G.scores.NS >= 6 ? 'NS' : 'EW'} Win the Game!`
                : 'Round Over'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                ['Bid', `${G.highestBid} by ${G.players[G.bidder] || '?'} (${G.roundResult.bidTeam})`],
                ['Trump', `${G.trumpName || '?'} ${G.trump || ''}`],
                ['NS card pts', `${G.roundResult.teamPts.NS} / 29`],
                ['EW card pts', `${G.roundResult.teamPts.EW} / 29`],
              ].map(([label, val]) => (
                <div className="result-row" key={label}>
                  <span>{label}</span><span>{val}</span>
                </div>
              ))}
              <div className="result-row">
                <span>{G.roundResult.bidTeam} bid result</span>
                <span className={G.roundResult.bidderMet ? 'result-row--win' : 'result-row--lose'}>
                  {G.roundResult.bidderMet ? '✓ Made it!' : '✗ Failed'}
                </span>
              </div>
              <div className="result-row">
                <span style={{ color: 'var(--accent)' }}>Score</span>
                <span>NS {G.scores.NS} — EW {G.scores.EW}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn" onClick={newRound} disabled={!G.isHost}>
                {G.isHost ? 'New Round' : 'Waiting for host…'}
              </button>
              <button className="btn btn--secondary" onClick={quitGame}>Quit</button>
            </div>
          </div>
        </div>
      )}

      {/* Game table */}
      <div className="game__table">
        {positions.map(pos => {
          const idx = idxAtPos[pos];
          return (
            <PlayerArea
              key={pos}
              position={pos}
              playerName={G.players[idx]}
              hand={G.hands[idx] || []}
              playedCard={G.played[idx]}
              isMe={idx === G.myIndex}
              isActive={G.currentPlayer === idx}
              phase={G.phase}
              trickSuit={G.trickSuit}
              trump={G.trump}
              trumpRevealed={G.trumpRevealed}
              selectedCard={idx === G.myIndex ? G.selectedCard : null}
              trickWins={G.trickWins[idx]}
              onCardClick={selectCard}
            />
          );
        })}

        <Table
          scores={G.scores}
          phase={G.phase}
          highestBid={G.highestBid}
          consecutivePasses={G.consecutivePasses}
          bidder={G.bidder}
          players={G.players}
          trump={G.trump}
          trumpName={G.trumpName}
          trumpRevealed={G.trumpRevealed}
          played={G.played}
          myIndex={G.myIndex}
          handsLeft={(G.hands[G.myIndex] || []).length}
        />
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Room: <strong>{G.roomCode}</strong>
          <button className="btn btn--secondary btn--sm" onClick={copyCode}>Copy</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Trump:{' '}
          <span className={`trump-badge ${G.trumpRevealed && isRedSuit(G.trump) ? 'trump-badge--red' : ''}`}>
            {G.trumpRevealed && G.trump ? `${G.trump} ${G.trumpName}` : '?'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {G.phase === 'playing' && G.currentPlayer === G.myIndex && G.selectedCard !== null && (
            <button className="btn btn--sm" onClick={playSelected}>Play Card</button>
          )}
          <button className="btn btn--secondary btn--sm" onClick={quitGame}>Quit</button>
        </div>
      </div>
    </div>
  );
}