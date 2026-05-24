import React, { useState, useEffect } from 'react';
import Table from './components/Table';
import Scoreboard from './components/Scoreboard';
import { initializeGame } from './GameEngine';

function App() {
  const [gameState, setGameState] = useState(initializeGame());

  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_BACKEND_URL);

    ws.onopen = () => console.log("Connected to backend");
    ws.onmessage = (event) => {
      const updatedState = JSON.parse(event.data);
      setGameState(updatedState);
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>29 Card Game</h1>
      <Scoreboard scores={gameState.scores} />
      <Table players={gameState.players} currentTrick={gameState.currentTrick} />
    </div>
  );
}

export default App;
