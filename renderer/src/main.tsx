import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import CaptureScreen from './components/CaptureScreen'

const rootElement = document.getElementById('root')
if (rootElement) createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/capture" element={<CaptureScreen />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
