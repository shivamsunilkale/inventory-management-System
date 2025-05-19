import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchWithAuth } from '../../../utils/api';
import { getOrganizationData, getCategoriesData, getLocatorPath } from '../../../utils/organizationService';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStock: 0,
    recentMovements: [],
    inventoryDistribution: [],
    categoryDistribution: []
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchOrganizationData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrganizationData = async () => {
    try {
      const data = await getOrganizationData();
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      // Fetch products data
      const productsData = await fetchWithAuth('/products');
      
      // Process products for stats
      const totalProducts = productsData?.length || 0;
      const lowStockItems = productsData?.filter(p => p.stock > 0 && p.stock < 20)?.length || 0;
      const outOfStock = productsData?.filter(p => p.stock === 0)?.length || 0;
      
      // Process category distribution
      const categoryData = {};
      productsData.forEach(product => {
        const categoryName = product.category?.name || 'Uncategorized';
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = 0;
        }
        categoryData[categoryName] += 1;
      });
      
      const categoryDistribution = Object.entries(categoryData).map(([name, value]) => ({
        name,
        value
      }));
      
      // Fetch recent stock movements - also try admin endpoint for more movement data
      let stockMovementsData = [];
      try {
        stockMovementsData = await fetchWithAuth('/stock-transfers');
      } catch (error) {
        console.log('Trying admin endpoint for stock movements');
        try {
          // Try admin endpoint as fallback to get more data
          stockMovementsData = await fetchWithAuth('/admin/stock-movements');
        } catch (innerError) {
          console.log('Could not fetch additional stock movement data');
        }
      }
      
      const recentMovements = stockMovementsData?.slice(0, 5) || [];
      
      // Process inventory value distribution (by category)
      const inventoryValueByCategory = {};
      productsData.forEach(product => {
        const categoryName = product.category?.name || 'Uncategorized';
        if (!inventoryValueByCategory[categoryName]) {
          inventoryValueByCategory[categoryName] = 0;
        }
        inventoryValueByCategory[categoryName] += product.price * product.stock;
      });
      
      const inventoryDistribution = Object.entries(inventoryValueByCategory)
        .map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100 // Round to 2 decimal places
        }))
        .sort((a, b) => b.value - a.value);
      
      // Update stats
      setStats({
        totalProducts,
        lowStockItems,
        outOfStock,
        recentMovements,
        inventoryDistribution,
        categoryDistribution
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#F56954', '#3CB371'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Organization Header */}
      {organization && (
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-xl shadow-lg p-6 text-white mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">{organization.name}</h1>
              <p className="text-purple-100">{organization.legal_address || 'No address provided'}</p>
            </div>

            <div className="mt-4 md:mt-0 flex flex-wrap gap-4">
              {organization.gst_number && (
                <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <span className="block font-semibold text-xs text-black">GST Number</span>
                  <span className=" text-black">{organization.gst_number}</span>
                </div>
              )}
              {organization.pan_number && (
                <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <span className="block font-semibold text-xs text-black">PAN Number</span>
                  <span className="text-black">{organization.pan_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dashboard Header with Refresh button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">
          Inventory Dashboard
        </h2>
        <button 
          onClick={fetchDashboardData} 
          className="flex items-center px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors"
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt mr-2"></i> Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Total Products</h3>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
            </div>
            <div>
              <i className="fas fa-boxes text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Inventory items</p>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Low Stock Items</h3>
              <p className="text-3xl font-bold mt-2">{stats.lowStockItems}</p>
            </div>
            <div>
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Need attention</p>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Out of Stock</h3>
              <p className="text-3xl font-bold mt-2">{stats.outOfStock}</p>
            </div>
            <div>
              <i className="fas fa-ban text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Critical items</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Distribution Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-chart-pie mr-2 text-purple-500"></i>
            Category Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => ` ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.categoryDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {stats.categoryDistribution.map((item, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="truncate" title={item.name}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Value Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-money-bill-wave mr-2 text-green-500"></i>
            Inventory Value Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.inventoryDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {stats.inventoryDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), 'Value']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {stats.inventoryDistribution.map((item, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}></div>
                <span className="truncate" title={`${item.name}: ${formatCurrency(item.value)}`}>
                  {item.name}: {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Stock Movements */}
      <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
        <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-exchange-alt mr-2 text-blue-500"></i>
          Recent Stock Movements
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {stats.recentMovements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No recent stock movements found
                  </td>
                </tr>
              ) : (
                stats.recentMovements.map((movement, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {movement.product?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {movement.source_location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {movement.destination_location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
