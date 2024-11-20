import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './Home.css';
import { API_URL } from '../constants';

function Home() {
    const [data, setData] = useState(null);
  
    useEffect(() => {
      fetch(API_URL+'datasets/')
        .then(response => response.json())
        .then(json => setData(json['result']))
        .catch(error => console.error(error));
    }, []);
  
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <div>
            {data ? JSON.stringify(data, null, 2) : 'Loading...'}
          </div>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
  
  export default Home;