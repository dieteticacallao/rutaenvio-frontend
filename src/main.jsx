import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster position="top-right" toastOptions={{
      style: { background: '#1a2342', color: '#e2e8f0', border: '1px solid #2a3654' },
      success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
      error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
    }} />
  </BrowserRouter>
)
