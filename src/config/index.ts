// Development API URL - update this for your dev environment
const DEV_API_URL = 'http://localhost:3000';

// Production API URL - update this for your production environment
const PROD_API_URL = 'https://your-production-api.com';

// Determine if we're in development or production
const isDevelopment = __DEV__;

// Export the appropriate API URL based on environment
export const API_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

// Export other config values as needed
export const config = {
  apiUrl: API_URL,
  // Add other config values here
}; 