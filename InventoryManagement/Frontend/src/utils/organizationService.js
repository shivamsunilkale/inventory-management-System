import { fetchWithAuth } from './api';

// In-memory cache for organization data
let organizationCache = null;
let categoriesCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches organization data with caching
 */
export const getOrganizationData = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if available and not expired
  if (!forceRefresh && organizationCache && (now - lastFetchTime) < CACHE_DURATION) {
    return organizationCache;
  }
  
  try {
    const data = await fetchWithAuth('/organization');
    if (data && data.length > 0) {
      organizationCache = data[0];
      lastFetchTime = now;
      return organizationCache;
    }
    return null;
  } catch (error) {
    console.error('Error fetching organization data:', error);
    throw error;
  }
};

/**
 * Fetches categories data with caching
 */
export const getCategoriesData = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if available and not expired
  if (!forceRefresh && categoriesCache && (now - lastFetchTime) < CACHE_DURATION) {
    return categoriesCache;
  }
  
  try {
    const data = await fetchWithAuth('/categories');
    categoriesCache = data || [];
    lastFetchTime = now;
    return categoriesCache;
  } catch (error) {
    console.error('Error fetching categories data:', error);
    throw error;
  }
};

/**
 * Gets a readable location name from a locator ID
 */
export const getLocatorPath = async (locatorId) => {
  if (!locatorId) return "Unknown";
  
  try {
    const organization = await getOrganizationData();
    
    if (!organization) return "Unknown Location";
    
    for (const subInv of organization.sub_inventories || []) {
      const locator = subInv.locators?.find(l => l.id === parseInt(locatorId));
      if (locator) {
        return `${subInv.name} > ${locator.code}`;
      }
    }
    return "Unknown Location";
  } catch (error) {
    console.error('Error resolving locator path:', error);
    return "Error resolving location";
  }
};

/**
 * Gets categories assigned to a specific locator
 */
export const getLocatorCategories = async (locatorId) => {
  if (!locatorId) return [];
  
  try {
    const categories = await getCategoriesData();
    return categories.filter(category => parseInt(category.locator_id) === parseInt(locatorId));
  } catch (error) {
    console.error('Error getting locator categories:', error);
    return [];
  }
};
