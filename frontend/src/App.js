import React from 'react';
import Table from './components/Table';

function App() {
  // Connect to backend using environment variable
  const ws = new WebSocket(process.env.REACT_APP_BACKEND_URL);

  ws.onopen = () => {
    console.log("Connected to backend");
  };

  ws.onmessage = (event) => {
    console.log("Message from server:", event.data);
  };

  return (
    <div>
      <h1>29 Card Game</h1>
      <Table />
    </div>
  );
}

export default App;
