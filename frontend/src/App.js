import React, { useState, useEffect } from "react";
import Table from "./components/Table";
import Scoreboard from "./components/Scoreboard";

function App() {
  const [state, setState] = useState(null);
  const ws = new WebSocket("wss://two9-card-game.onrender.com");

  useEffect(() => {
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      setState(data.state);
    };
  }, []);

  return (
    <div className="bg-green-700 h-screen flex flex-col">
      <Scoreboard scores={state?.scores} />
      <Table players={state?.players} tricks={state?.tricks} />
    </div>
  );
}

export default App;
