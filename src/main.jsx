import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/grandstander'
import '@fontsource-variable/nunito'
import '@fontsource/patrick-hand'
import './styles/base.css'
import './styles/shell.css'
import './styles/box.css'
import './styles/pages.css'
import App from './App'
import { StoreProvider } from './store/StoreProvider'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
