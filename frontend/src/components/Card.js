import React from 'react';

function Card({ suit, rank }) {
  return (
    <div style={{
      border: "1px solid white",
      borderRadius: "5px",
      width: "50px",
      height: "70px",
      backgroundColor: "white",
      color: "black",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      margin: "5px"
    }}>
      {rank} {suit}
    </div>
  );
}

export default Card;
