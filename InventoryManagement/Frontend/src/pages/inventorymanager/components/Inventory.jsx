import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [categories, setCategories] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchInventoryData();
    fetchCategories();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const fetchProductHistory = async (productId) => {
    setLoadingHistory(true);
    try {
      // This endpoint is hypothetical and would need to be implemented in the backend
      const data = await fetchWithAuth(`/products/${productId}/history`);
      setStockHistory(data || []);
    } catch (error) {
      console.error('Error fetching product history:', error);
      setStockHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleProductDetails = (product) => {
    setShowDetails(product);
    fetchProductHistory(product.id);
  };

  const closeDetails = () => {
    setShowDetails(null);
    setStockHistory([]);
  };

  const filteredAndSortedInventory = inventory
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || (item.category?.id === parseInt(filterCategory));
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'price' || sortBy === 'stock') {
        return a[sortBy] > b[sortBy] ? order : -order;
      }
      return a[sortBy]?.toString().localeCompare(b[sortBy]?.toString()) * order;
    });

  const getStockStatus = (stock) => {
    if (stock === 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Out of Stock</span>;
    } else if (stock < 20) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Low Stock</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search inventory..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                >
                  Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th 
                  onClick={() => handleSort('stock')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                >
                  Stock {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('price')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                >
                  Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedInventory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : (
                filteredAndSortedInventory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStockStatus(item.stock)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => handleProductDetails(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        <i className="fas fa-eye mr-1"></i> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold dark:text-white">{showDetails.name}</h3>
              <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-medium mb-3 dark:text-white">Product Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID:</span>
                    <span className="font-medium dark:text-white">#{showDetails.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium dark:text-white">{showDetails.category?.name || 'Uncategorized'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-medium dark:text-white">₹{showDetails.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                    <span className="font-medium dark:text-white">{showDetails.stock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span>{getStockStatus(showDetails.stock)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-medium mb-3 dark:text-white">Description</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {showDetails.description || 'No description available for this product.'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-medium mb-3 dark:text-white">Stock Movement History</h4>
              {loadingHistory ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : stockHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {stockHistory.map((entry, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm dark:text-white">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm dark:text-white">
                            {entry.type}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm dark:text-white">
                            {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm dark:text-white">
                            {entry.notes || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 py-2">No stock movement history available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
