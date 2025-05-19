import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const LowStockAlerts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(20);
  const [adminStats, setAdminStats] = useState(null);

  useEffect(() => {
    // Try to get the latest admin stats if available
    try {
      const adminStatsString = sessionStorage.getItem('adminDashboardStats');
      if (adminStatsString) {
        const stats = JSON.parse(adminStatsString);
        // Check if stats are recent (less than 30 minutes old)
        const timestamp = new Date(stats.timestamp);
        const now = new Date();
        const minutesOld = (now - timestamp) / (1000 * 60);
        
        if (minutesOld < 30) {
          setAdminStats(stats);
          console.log('Using admin dashboard stats:', stats);
        }
      }
    } catch (error) {
      console.error('Error parsing admin stats:', error);
    }
    
    fetchLowStockProducts();
  }, [threshold]);

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/products');
      // Filter products with low stock based on threshold
      const lowStockItems = data.filter(product => product.stock <= threshold);
      setProducts(lowStockItems);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold dark:text-white">Low Stock Alerts</h2>
        <div className="flex space-x-2 items-center">
          <span className="text-sm dark:text-white">Stock threshold:</span>
          <input
            type="number"
            min="1"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
      
      {/* Alert from admin stats if available */}
      {adminStats && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <div className="mr-3 text-blue-500 dark:text-blue-400">
              <i className="fas fa-info-circle text-xl"></i>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300">Admin Dashboard Stats</h4>
              <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">
                Total Products: {adminStats.totalProducts} | Low Stock Items: {adminStats.lowStock} | 
                Out of Stock: {adminStats.outOfStock}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No products below threshold found
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {product.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock === 0 ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Low Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {!loading && products.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="mr-4 text-yellow-500 dark:text-yellow-400">
              <i className="fas fa-exclamation-triangle text-xl"></i>
            </div>
            <div>
              <h4 className="text-md font-medium text-yellow-800 dark:text-yellow-300 mb-1">Action Required</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {products.length} {products.length === 1 ? 'product' : 'products'} with low or out of stock status. Consider restocking these items soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockAlerts;
