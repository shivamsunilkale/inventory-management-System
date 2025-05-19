import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const StockAllocation = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [confirmAction, setConfirmAction] = useState({ show: false, action: null, orderId: null, message: '' });

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh orders every 30 seconds
    const intervalId = setInterval(() => {
      fetchOrders(false); // Pass false to not show loading indicator for auto-refresh
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [activeTab]);

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const data = await fetchWithAuth('/orders/');
      
      // Filter orders based on active tab
      const filteredOrders = data.filter(order => {
        if (activeTab === 'pending') {
          return order.status === 'pending' || order.status === 'processing';
        } else if (activeTab === 'approved') {
          return order.status === 'completed';
        } else if (activeTab === 'rejected') {
          return order.status === 'cancelled';
        }
        return true; // 'all' tab
      });
      
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('Failed to load orders. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  const handleApproveOrder = (orderId) => {
    setConfirmAction({
      show: true,
      action: 'approve',
      orderId,
      message: 'Are you sure you want to approve this order? This will update the inventory stock accordingly.'
    });
  };

  const handleRejectOrder = (orderId) => {
    setConfirmAction({
      show: true,
      action: 'reject',
      orderId,
      message: 'Are you sure you want to reject this order? This will cancel the order and no stock changes will occur.'
    });
  };

  const handleConfirmAction = async () => {
    const { action, orderId } = confirmAction;
    setConfirmAction({ show: false, action: null, orderId: null, message: '' });
    
    try {
      if (action === 'approve') {
        await fetchWithAuth(`/orders/${orderId}/approve`, {
          method: 'PUT'
        });
        showNotification('Order approved successfully. Inventory has been updated.', 'success');
      } else if (action === 'reject') {
        await fetchWithAuth(`/orders/${orderId}/reject`, {
          method: 'PUT'
        });
        showNotification('Order rejected successfully.', 'success');
      }
      fetchOrders();
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      showNotification(`Failed to ${action} order. Please try again later.`, 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <i className="fas fa-check-circle mr-1 text-green-600 dark:text-green-400"></i>;
      case 'processing':
        return <i className="fas fa-cog mr-1 text-blue-600 dark:text-blue-400"></i>;
      case 'pending':
        return <i className="fas fa-clock mr-1 text-yellow-600 dark:text-yellow-400"></i>;
      case 'cancelled':
        return <i className="fas fa-times-circle mr-1 text-red-600 dark:text-red-400"></i>;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': 
        return 'Awaiting approval';
      case 'processing': 
        return 'Processing';
      case 'completed': 
        return 'Approved';
      case 'cancelled': 
        return 'Rejected';
      default: 
        return status;
    }
  };

  const calculateTotalImpact = (order) => {
    if (!order.items || order.items.length === 0) {
      return 0;
    }

    const total = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return order.order_type === 'purchase' ? `+${total}` : `-${total}`;
  };

  const tabs = [
    { id: 'pending', label: 'Pending Approval' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All Orders' }
  ];

  // Count pending orders that need approval
  const pendingOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'processing'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold dark:text-white">Stock Allocation</h2>
          {pendingOrders.length > 0 && (
            <div className="ml-3 bg-red-500 text-white px-2 py-1 rounded-full text-sm flex items-center animate-pulse">
              <i className="fas fa-exclamation-circle mr-1"></i>
              {pendingOrders.length} Pending
            </div>
          )}
        </div>
        <button
          onClick={() => fetchOrders()}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
        >
          <i className="fas fa-sync-alt mr-1"></i> Refresh
        </button>
      </div>

      {/* Notification Banner */}
      {notification.show && (
        <div className={`p-4 rounded-lg ${
          notification.type === 'error' 
            ? 'bg-red-50 text-red-800 border-l-4 border-red-500 dark:bg-red-900/20 dark:text-red-300 dark:border-red-600' 
            : notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border-l-4 border-green-500 dark:bg-green-900/20 dark:text-green-300 dark:border-green-600' 
              : 'bg-blue-50 text-blue-800 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600'
        }`}>
          <div className="flex items-center">
            <i className={`fas fa-${
              notification.type === 'error' 
                ? 'exclamation-circle' 
                : notification.type === 'success' 
                  ? 'check-circle' 
                  : 'info-circle'
            } mr-2`}></i>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Order Type Tabs */}
      <div>
        <nav className="flex space-x-4  border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.id === 'pending' && pendingOrders.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer/Supplier</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock Impact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center py-4">
                      <i className="fas fa-clipboard-list text-2xl text-gray-400 mb-2"></i>
                      <p>No orders found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      (order.status === 'pending' || order.status === 'processing') ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.order_type === 'purchase' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {order.order_type === 'purchase' ? 'Purchase' : 'Sell'}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.customer?.name || 'N/A'}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between mb-1">
                          <span>{item.product ? item.product.name : 'Unknown Product'}</span>
                          <span className="text-gray-500 dark:text-gray-400">×{item.quantity}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className={`font-medium ${order.order_type === 'purchase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {calculateTotalImpact(order)} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-y-2">
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <>
                          <button
                            onClick={() => handleApproveOrder(order.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center mr-3"
                            title="Approve order and update inventory"
                          >
                            <i className="fas fa-check-circle mr-1"></i>Approve
                          </button>
                          <button
                            onClick={() => handleRejectOrder(order.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                            title="Reject order"
                          >
                            <i className="fas fa-times-circle mr-1"></i>Reject
                          </button>
                        </>
                      )}
                      {order.status === 'completed' && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Approved on {new Date(order.updated_at).toLocaleString()}
                        </span>
                      )}
                      {order.status === 'cancelled' && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Rejected on {new Date(order.updated_at).toLocaleString()}
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

      {/* Confirmation Dialog */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium dark:text-white mb-3">Confirm Action</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{confirmAction.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction({ show: false, action: null, orderId: null, message: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-black ${
                  confirmAction.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAllocation;