import React, { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./pdf-worker" // Initialize PDF worker
import "./index.css"
import App from "./App.tsx"
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </StrictMode>
)
