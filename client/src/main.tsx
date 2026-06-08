import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'
import { wireSync } from './store/sync'

// Start the shared-board sync (hydrate + poll, push admin edits).
wireSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
