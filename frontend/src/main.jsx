import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AmbientBackground from './components/layout/AmbientBackground'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AmbientBackground />
    <App />
  </React.StrictMode>
)

