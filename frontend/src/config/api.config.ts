/**
 * Global API & Backend Endpoint Configuration
 * -------------------------------------------------------------
 * Switch between Localhost and Production in this single file!
 *
 * Modes available:
 *   - "production": https://coaching-webapp-j8pi.onrender.com
 *   - "local":      http://localhost:8000
 */

export const BACKEND_ENVIRONMENTS = {
  local: "http://localhost:8000",
  production: "https://coaching-webapp-j8pi.onrender.com",
} as const;

// 🔁 CHANGE THIS SINGLE VALUE TO SWITCH: "production" | "local"
export const ACTIVE_ENV: keyof typeof BACKEND_ENVIRONMENTS = "production";

// Central API Base URL used across the entire frontend application
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || BACKEND_ENVIRONMENTS[ACTIVE_ENV];

