import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchWithAuth } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import { getOrganizationData } from '../../../utils/organizationService';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    recentActivities: [],
    inventoryData: [],
    categoryDistribution: [
      { name: 'Electronics', value: 0 },
      { name: 'Furniture', value: 0 },
      { name: 'Office Supplies', value: 0 }
    ]
  });
  
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate(); // Initialize the navigate function

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
    fetchOrganizationData();

    // Update data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [ordersData, productsData, stockHistoryData] = await Promise.all([
        fetchWithAuth('/orders'),
        fetchWithAuth('/products'),
        fetchWithAuth('/stock-history')
      ]);

      // Process products by category
      const categoryData = productsData.reduce((acc, product) => {
        const categoryName = product.category?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {});

      const categoryDistribution = Object.entries(categoryData).map(([name, value]) => ({
        name,
        value
      }));

      // Process recent orders
      const recentActivities = (ordersData || []).slice(0, 5).map(order => ({
        type: 'Order',
        item: `Order #${order.id}`,
        quantity: order.items?.length || 0,
        date: order.created_at,
        status: order.status || 'pending',
        total: order.total || 0
      }));

      // Calculate other statistics
      const totalProducts = productsData?.length || 0;
      const lowStock = productsData?.filter(p => p?.stock < 20 && p?.stock > 0)?.length || 0;
      const outOfStock = productsData?.filter(p => p?.stock === 0)?.length || 0;
      const totalValue = productsData?.reduce((sum, p) => sum + ((p?.price || 0) * (p?.stock || 0)), 0) || 0;

      // Process real inventory data from stock history
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const last6Months = monthNames.slice(currentMonth - 5 < 0 ? 0 : currentMonth - 5, currentMonth + 1);
      
      // Group stock history by month and type
      const monthlyData = {};
      last6Months.forEach(month => {
        monthlyData[month] = { inventory: 0, sales: 0, restock: 0 };
      });
      
      if (stockHistoryData && stockHistoryData.length > 0) {
        // Process actual stock history data
        stockHistoryData.forEach(item => {
          const date = new Date(item.date);
          const month = monthNames[date.getMonth()];
          
          // Only include data from the last 6 months
          if (last6Months.includes(month)) {
            if (item.type === 'out') {
              monthlyData[month].sales += item.quantity;
            } else if (item.type === 'in') {
              monthlyData[month].restock += item.quantity;
            }
          }
        });
      }
      
      // Calculate current inventory for each month
      // Using total stock as a baseline for current inventory
      const totalStockCount = productsData.reduce((sum, p) => sum + (p?.stock || 0), 0);
      
      // Create inventory data for chart
      const inventoryData = last6Months.map(month => ({
        name: month,
        inventory: totalStockCount,
        sales: monthlyData[month].sales,
        restock: monthlyData[month].restock
      }));

      // Update state with processed data
      setStats(prev => ({
        ...prev,
        totalProducts,
        lowStock,
        outOfStock,
        totalValue,
        recentActivities,
        inventoryData,
        categoryDistribution: categoryDistribution.length > 0 ? categoryDistribution : prev.categoryDistribution
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const data = await getOrganizationData(true); // Force refresh the shared cache
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  // Share dashboard stats with other roles if needed
  const shareDashboardStats = async () => {
    try {
      // Store the processed stats in sessionStorage for potential use by other roles
      sessionStorage.setItem('adminDashboardStats', JSON.stringify({
        totalProducts: stats.totalProducts,
        lowStock: stats.lowStock,
        outOfStock: stats.outOfStock,
        totalValue: stats.totalValue,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error sharing dashboard stats:', error);
    }
  };

  // Add this to the useEffect dependencies
  useEffect(() => {
    if (stats.totalProducts > 0) {
      shareDashboardStats();
    }
  }, [stats.totalProducts]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#F56954', '#3CB371'];
  const statusColors = {
    completed: 'bg-green-500',
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500' ,
    cancelled: 'bg-red-500'
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboardData();
    fetchOrganizationData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-full mx-auto px-4 py-8">
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
          Admin Dashboard Overview
        </h2>
        <button 
          onClick={handleRefresh} 
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Total Products</h3>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts.toLocaleString()}</p>
            </div>
            <div >
              <i className="fas fa-boxes text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Low Stock Items</h3>
              <p className="text-3xl font-bold mt-2">{stats.lowStock}</p>
            </div>
            <div >
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Needs attention</p>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Out of Stock</h3>
              <p className="text-3xl font-bold mt-2">{stats.outOfStock}</p>
            </div>
            <div >
              <i className="fas fa-ban text-2xl"></i>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Critical items</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Total Value</h3>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div >
              
            </div>
          </div>
          <p className="text-sm mt-2 opacity-75">Inventory worth</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-chart-line mr-2 text-blue-500"></i>
            Inventory Overview 
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.inventoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value.toLocaleString(), '']} />
                <Legend />
                <Line type="monotone" dataKey="inventory" stroke="#0088FE" name="Current Stock" strokeWidth={2} />
                <Line type="monotone" dataKey="sales" stroke="#00C49F" name="Units Sold" strokeWidth={2} />
                <Line type="monotone" dataKey="restock" stroke="#FFBB28" name="Units Restocked" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {stats.inventoryData.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <i className="fas fa-info-circle mr-1"></i> 
              No inventory history data available. Stock movements will appear here as they occur.
            </div>
          )}
        </div>

        {/* Category Distribution */}
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
        <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-history mr-2 text-green-500"></i>
          Recent Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {stats.recentActivities.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No recent activities found
                  </td>
                </tr>
              ) : (
                stats.recentActivities.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.item}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[activity.status]} text-white`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.date).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Info Section */}
      {organization && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-building mr-2 text-indigo-500"></i>
              Organization Information
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Legal Address</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {organization.legal_address || 'Not provided'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {organization.start_date 
                      ? new Date(organization.start_date).toLocaleDateString() 
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Tax Information</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">GST</p>
                    <p className="font-medium text-gray-900 dark:text-white">{organization.gst_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">VAT</p>
                    <p className="font-medium text-gray-900 dark:text-white">{organization.vat_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CIN</p>
                    <p className="font-medium text-gray-900 dark:text-white">{organization.cin || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PAN</p>
                    <p className="font-medium text-gray-900 dark:text-white">{organization.pan_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('/admin/organization')} 
                  className="px-4 py-2 bg-indigo-600 text-black rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
                >
                  <i className="fas fa-edit mr-2"></i> Manage Organization
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg dark:bg-gray-800">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-warehouse mr-2 text-orange-500"></i>
              Inventory Locations
            </h3>
            {organization.sub_inventories && organization.sub_inventories.length > 0 ? (
              <div className="space-y-6">
                {organization.sub_inventories.map((subInv) => (
                  <div key={subInv.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900 dark:text-white">{subInv.name}</h4>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-300">
                        {subInv.type}
                      </span>
                    </div>
                    {subInv.locators && subInv.locators.length > 0 ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subInv.locators.map((locator) => (
                          <div key={locator.id} className="bg-gray-50 p-2 rounded text-sm dark:bg-gray-700 flex justify-between">
                            <span className="font-medium">{locator.code}</span>
                            {locator.length && locator.width && locator.height ? (
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {locator.length}×{locator.width}×{locator.height}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No locators defined</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <i className="fas fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                <p className="text-gray-500 dark:text-gray-400">No sub-inventories defined yet</p>
                <button 
                  onClick={() => navigate('/admin/organization')} 
                  className="mt-4 px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <i className="fas fa-plus mr-2"></i> Add Sub-inventory
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
