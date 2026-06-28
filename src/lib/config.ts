// Configuration for Suno API
export const SUNO_CONFIG = {
  // Set to false to use real Suno API, true to use mock API
  USE_MOCK_API: false,

  // Real API configuration
  API_TOKEN: process.env.SUNO_API_TOKEN,
  BASE_URL: 'https://api.sunoapi.org/api/v1',

  // Mock API configuration
  MOCK_DELAYS: {
    TEXT_SUCCESS: 5,    // 5 seconds
    FIRST_SUCCESS: 15,  // 15 seconds
    SUCCESS: 25,        // 25 seconds
  }
};

// Helper function to check if we should use mock API
export function shouldUseMockAPI(): boolean {
  return SUNO_CONFIG.USE_MOCK_API;
}

// Helper function to get API token
export function getAPIToken(): string {
  if (!SUNO_CONFIG.API_TOKEN) {
    throw new Error('SUNO_API_TOKEN environment variable is required');
  }
  return SUNO_CONFIG.API_TOKEN;
}