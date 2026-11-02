import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { applyInitialTheme } from '@/components/theme-toggle'
import { aplicarMarcaInicial } from '@/context/brand'

applyInitialTheme()
aplicarMarcaInicial()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
