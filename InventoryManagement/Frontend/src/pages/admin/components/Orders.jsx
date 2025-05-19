import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PurchaseOrderForm from './PurchaseOrderForm';
import SellOrderForm from './SellOrderForm';
import { fetchWithAuth, getAuthHeaders } from '../../../utils/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeTab, setActiveTab] = useState('sell'); // Change default tab to 'sell'
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth('/orders/');
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      
      // Log the orders data to debug
      console.log('Fetched orders:', data);
      setOrders(data);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/orders/${orderId}/report`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderId}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetchWithAuth(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      await fetchOrders();
      setShowStatusModal(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const viewReport = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:8000/orders/${orderId}/report`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to get report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setSelectedReport(url);
      setShowPreview(true);
    } catch (error) {
      console.error('Error viewing report:', error);
      alert('Failed to view report');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await fetchWithAuth(`/orders/${orderId}`, {
        method: 'DELETE'
      });
      await fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const tabs = [
    { id: 'purchase', label: 'Purchase Orders' },
    { id: 'sell', label: 'Sell Orders' } 
  ];

  const purchaseOrders = orders.filter(order => order.order_type === 'purchase');
  const sellOrders = orders.filter(order => order.order_type === 'sell');

  const handleOrderComplete = async () => {
    await fetchOrders();
    // Switch to sell orders tab when sell order is created
    setActiveTab('sell');
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">Orders</h2>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowPurchaseForm(true)}
              className="bg-blue-600 text-black px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <i className="fas fa-cart-plus mr-2"></i>
              New Purchase Order
            </button>
            <button 
              onClick={() => setShowSellForm(true)}
              className="bg-green-600 text-black px-6 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <i className="fas fa-shopping-cart mr-2"></i>
              New Sell Order
            </button>
          </div>
        </div>

        {/* Order Type Tabs */}
        <div className="mb-6">
          <div >
            <nav className="flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.id === 'purchase' ? purchaseOrders.length : sellOrders.length})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                (activeTab === 'purchase' ? purchaseOrders : sellOrders).map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.order_type === 'purchase' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.order_type === 'purchase' ? 'Purchase' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.customer_name || order.customer?.name || 'N/A'}  {/* Display customer name from order record */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between mb-1">
                          <span>{item.product ? item.product.name : 'Unknown Product'}</span>
                          <span className="text-gray-500">×{item.quantity}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <button 
                        onClick={() => viewReport(order.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        <i className="fas fa-eye mr-1"></i>View
                      </button>
                      <button 
                        onClick={() => downloadReport(order.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400"
                      >
                        <i className="fas fa-download mr-1"></i>Download
                      </button>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <i className="fas fa-trash mr-1"></i>Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Forms */}
      {showPurchaseForm && (
        <PurchaseOrderForm 
          onClose={() => setShowPurchaseForm(false)} 
          onOrderComplete={fetchOrders}
        />
      )}

      {showSellForm && (
        <SellOrderForm 
          onClose={() => setShowSellForm(false)} 
          onOrderComplete={handleOrderComplete}
        />
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Update Order Status</h3>
            <div className="space-y-3">
              {['pending', 'processing', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(selectedOrder.id, status)}
                  className={`w-full py-2 px-4 rounded-lg capitalize
                    ${status === 'completed' ? 'bg-green-100 ' + getStatusColor('completed') :
                      status === 'processing' ? 'bg-blue-100 ' + getStatusColor('processing') :
                      'bg-yellow-100 ' + getStatusColor('pending')} 
                    hover:opacity-90`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className="w-full mt-4 py-2 px-4 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showPreview && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[90vw] h-[90vh] max-w-5xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold dark:text-white">Order Report</h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedReport(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <object
              data={selectedReport}
              type="application/pdf"
              className="w-full h-[calc(90vh-6rem)]"
            >
              <p>Unable to display PDF file. <a href={selectedReport} download>Download</a> instead.</p>
            </object>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
