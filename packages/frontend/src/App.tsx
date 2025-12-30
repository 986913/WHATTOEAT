import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/v1/user')
      .then((response) => response.json())
      .then((data) => setUsers(data))
      .catch((error) => console.error('Error fetching message:', error));
  }, []);

  return (
    <div className='App'>
      <div>
        <h1>今天吃什么？</h1>
        <p>后端消息: {JSON.stringify(users)}</p>
      </div>
    </div>
  );
}

export default App;
