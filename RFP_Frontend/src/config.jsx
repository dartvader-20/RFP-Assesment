// src/config.jsx

const PROD_API_URL = "https://your-deployed-backend-url.com"; 

// Auto-switch based on environment
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? PROD_API_URL
    : "http://localhost:4000";

export { API_BASE_URL };
