/**
 * Utility for sharing statistics between different user roles
 */

/**
 * Get admin dashboard stats if available and recent
 * @returns {Object|null} Admin stats or null if unavailable 
 */
export const getAdminStats = () => {
  try {
    const adminStatsString = sessionStorage.getItem('adminDashboardStats');
    if (!adminStatsString) {
      console.log('No admin stats found in session storage');
      return null;
    }
    
    const stats = JSON.parse(adminStatsString);
    if (!stats || !stats.timestamp) {
      console.log('Invalid admin stats format (missing timestamp)');
      return null;
    }
    
    const timestamp = new Date(stats.timestamp);
    const now = new Date();
    const minutesOld = (now - timestamp) / (1000 * 60);
    
    // Only use stats if they are less than 30 minutes old
    if (minutesOld < 30) {
      console.log(`Using admin stats from ${minutesOld.toFixed(1)} minutes ago`);
      return stats;
    }
    console.log(`Admin stats too old (${minutesOld.toFixed(1)} minutes), not using`);
    return null;
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return null;
  }
};

/**
 * Store dashboard stats for sharing with other roles
 * @param {string} role - User role (admin, stockkeeper, inventorymanager)
 * @param {Object} stats - Statistics to store
 * @returns {boolean} Success status
 */
export const shareStats = (role, stats) => {
  try {
    if (!role || !stats || typeof stats !== 'object') {
      console.error('Invalid arguments to shareStats');
      return false;
    }
    
    // Add timestamp
    const statsToStore = {
      ...stats,
      timestamp: new Date().toISOString()
    };
    
    // Store in session storage
    sessionStorage.setItem(`${role}DashboardStats`, JSON.stringify(statsToStore));
    console.log(`Stats shared for role: ${role}`);
    return true;
  } catch (error) {
    console.error(`Error sharing ${role} stats:`, error);
    return false;
  }
};

/**
 * Get stats from any role
 * @param {string} role - User role to get stats for
 * @returns {Object|null} Stats or null if unavailable
 */
export const getStats = (role) => {
  try {
    if (!role) {
      console.error('No role specified for getStats');
      return null;
    }
    
    const statsString = sessionStorage.getItem(`${role}DashboardStats`);
    if (!statsString) {
      console.log(`No ${role} stats found in session storage`);
      return null;
    }
    
    const stats = JSON.parse(statsString);
    if (!stats || !stats.timestamp) {
      console.log(`Invalid ${role} stats format (missing timestamp)`);
      return null;
    }
    
    const timestamp = new Date(stats.timestamp);
    const now = new Date();
    const minutesOld = (now - timestamp) / (1000 * 60);
    
    // Only use stats if they are less than 30 minutes old
    if (minutesOld < 30) {
      console.log(`Using ${role} stats from ${minutesOld.toFixed(1)} minutes ago`);
      return stats;
    }
    console.log(`${role} stats too old (${minutesOld.toFixed(1)} minutes), not using`);
    return null;
  } catch (error) {
    console.error(`Error getting ${role} stats:`, error);
    return null;
  }
};
