import { fetchWithAuth } from './api';

// In-memory cache for product data
let productsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for products (shorter than org data)

// Category products cache
let categoryProductsCache = {};
let categoryLastFetchTimes = {};

/**
 * Fetches all products with caching
 */
export const getProductsData = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if available and not expired
  if (!forceRefresh && productsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return productsCache;
  }
  
  try {
    console.log('Fetching products from database...');
    const data = await fetchWithAuth('/products');
    productsCache = data || [];
    lastFetchTime = now;
    
    // Log for debugging
    console.log(`Fetched ${productsCache.length} products from database`);
    return productsCache;
  } catch (error) {
    console.error('Error fetching products data:', error);
    throw error;
  }
};

/**
 * Fetch products by category ID directly from the backend API
 * This is more efficient than filtering all products on the client side
 */
export const fetchProductsByCategory = async (categoryId, requireStock = true) => {
  if (!categoryId) return [];
  
  const now = Date.now();
  const cacheKey = `${categoryId}-${requireStock}`;
  
  // Return cached data if available and not expired
  if (categoryProductsCache[cacheKey] && 
      (now - (categoryLastFetchTimes[cacheKey] || 0)) < CACHE_DURATION) {
    console.log(`Using cached products for category ${categoryId}`);
    return categoryProductsCache[cacheKey];
  }
  
  try {
    console.log(`Directly fetching products for category ID ${categoryId} from API...`);
    
    // Call the dedicated API endpoint for products by category
    const products = await fetchWithAuth(`/products/by-category/${categoryId}`);
    
    // Filter by stock if required
    const filteredProducts = requireStock 
      ? products.filter(p => p.stock > 0)
      : products;
    
    console.log(`Found ${filteredProducts.length} products in category ${categoryId}${requireStock ? ' with stock > 0' : ''}`);
    
    // Cache the results
    categoryProductsCache[cacheKey] = filteredProducts;
    categoryLastFetchTimes[cacheKey] = now;
    
    return filteredProducts;
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return [];
  }
};

/**
 * Filters products by category ID
 * (fallback client-side filtering if direct API call fails)
 */
export const getProductsByCategory = async (categoryId, requireStock = true) => {
  if (!categoryId) return [];
  
  try {
    // First try to use the direct API endpoint
    try {
      return await fetchProductsByCategory(categoryId, requireStock);
    } catch (apiError) {
      console.warn('Direct category API failed, falling back to client filtering', apiError);
      
      // Fallback to client-side filtering
      const products = await getProductsData();
      
      // Filter products by category and optionally by stock
      return products.filter(product => {
        const matchesCategory = product.category?.id === parseInt(categoryId);
        const hasStock = !requireStock || product.stock > 0;
        return matchesCategory && hasStock;
      });
    }
  } catch (error) {
    console.error('Error filtering products by category:', error);
    return [];
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (productId) => {
  if (!productId) return null;
  
  try {
    const products = await getProductsData();
    return products.find(p => p.id === parseInt(productId)) || null;
  } catch (error) {
    console.error(`Error getting product with ID ${productId}:`, error);
    return null;
  }
};

/**
 * Invalidate the product cache to force a refresh next time
 */
export const invalidateProductsCache = () => {
  productsCache = null;
  lastFetchTime = 0;
  categoryProductsCache = {};
  categoryLastFetchTimes = {};
};