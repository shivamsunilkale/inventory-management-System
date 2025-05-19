/**
 * Logs authentication attempts for debugging
 */
export const logAuthAttempt = (stage, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[Auth ${timestamp}] ${stage}:`, data);
};

/**
 * Inspects localStorage for debugging
 */
export const inspectLocalStorage = () => {
  try {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('[LocalStorage Inspection]');
    console.log('- User:', user);
    console.log('- Access token present:', !!tokens.access_token);
    console.log('- Refresh token present:', !!tokens.refresh_token);
  } catch (error) {
    console.error('Error inspecting localStorage:', error);
  }
};
