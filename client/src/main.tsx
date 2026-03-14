import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Web3Provider } from './providers/Web3Provider'
import { router } from './router'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <RouterProvider router={router} />
    </Web3Provider>
  </StrictMode>,
)
