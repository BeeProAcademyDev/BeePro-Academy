import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AuthProvider } from "./contexts/AuthContext";
import AnalyticsProvider from "./components/analytics/AnalyticsProvider";
import SEOProvider from "./components/seo/SEOProvider";
import "./index.css";
import "./styles/theme.css";
import "./i18n/i18n";

// Global submit event listener to catch all form submissions
document.addEventListener("submit", (event) => {}, true); // Capture phase to catch before React

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AnalyticsProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <ThemeProvider>
                <AuthProvider>
                  <SEOProvider>
                    <App />
                  </SEOProvider>
                </AuthProvider>
              </ThemeProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AnalyticsProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
