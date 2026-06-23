import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { AuthProvider } from './contexts/AuthContext'
import AnalyticsProvider from './components/analytics/AnalyticsProvider'
import './index.css'
import './styles/theme.css'
import './i18n/i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalyticsProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <ThemeProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ThemeProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </AnalyticsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)