import React, { useState, useEffect } from 'react';
import { fetchWithAuth, getAuthHeaders } from '../../../utils/api';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportType, setReportType] = useState('all'); // 'all', 'order', 'inventory', 'movement', 'transfer'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'transfers'

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchReports();
    } else if (activeTab === 'transfers') {
      fetchStockTransfers();
    }
  }, [dateRange, reportType, activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (dateRange.startDate) queryParams.append('start_date', dateRange.startDate);
      if (dateRange.endDate) queryParams.append('end_date', dateRange.endDate);
      if (reportType !== 'all') queryParams.append('type', reportType);
      
      const queryString = queryParams.toString();
      const endpoint = `/orders?${queryString}`;

      const data = await fetchWithAuth(endpoint);
      
      // Enhance reports with complete customer information
      if (Array.isArray(data) && data.length > 0) {
        const enhancedReports = await Promise.all(data.map(async (report) => {
          // If report already has full customer data, use it
          if (report.customer && report.customer.name && report.customer.email) {
            return report;
          }
          
          // If report only has customer_id but not full customer data, fetch it
          if (report.customer_id && (!report.customer || !report.customer.name)) {
            try {
              const customerData = await fetchWithAuth(`/customers/${report.customer_id}`);
              return {
                ...report,
                customer: customerData || report.customer || { name: report.customer_name || 'N/A' }
              };
            } catch (err) {
              console.error(`Error fetching customer ${report.customer_id}:`, err);
              // Use any existing customer data or fallback to customer name
              return {
                ...report,
                customer: report.customer || { 
                  name: report.customer_name || 'N/A',
                  email: 'Not available',
                  address: 'Not available'
                }
              };
            }
          }
          
          // If report has customer_name but no customer object
          if (report.customer_name && !report.customer) {
            return {
              ...report,
              customer: { 
                name: report.customer_name,
                email: 'Not available',
                address: 'Not available'
              }
            };
          }
          
          return report;
        }));
        
        setReports(enhancedReports);
      } else {
        setReports(data || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const queryParams = new URLSearchParams();
      
      if (dateRange.startDate) queryParams.append('start_date', dateRange.startDate);
      if (dateRange.endDate) queryParams.append('end_date', dateRange.endDate);
      if (reportType !== 'all' && reportType === 'completed') {
        queryParams.append('status', 'completed');
      }
      
      const queryString = queryParams.toString();
      const endpoint = `/stock-transfers?${queryString}`;

      const data = await fetchWithAuth(endpoint);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching stock transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const downloadReport = async (reportId) => {
    try {
      // Check if the report exists before attempting to download
      const checkReport = reports.find(r => r.id === reportId);
      if (!checkReport) {
        alert('Report not found. Please refresh the list and try again.');
        return;
      }
      
      // Use fetchWithAuth instead of direct fetch for consistency and proper auth handling
      const response = await fetchWithAuth(`/orders/${reportId}/report`, {
        responseType: 'blob'
      });
      
      // Create a download link for the blob
      const url = window.URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report: ' + (error.message || 'Unknown error'));
    }
  };

  const generateStockTransferReport = async (transferId, shouldDownload = false) => {
    try {
      const checkTransfer = transfers.find(t => t.id === transferId);
      if (!checkTransfer) {
        alert('Transfer not found. Please refresh the list and try again.');
        return;
      }
      
      if (shouldDownload) {
        // Use the new backend endpoint to download a PDF report
        try {
          const response = await fetchWithAuth(`/stock-transfers/${transferId}/report`, {
            responseType: 'blob'
          });
          
          // Create a blob from the response
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stock_transfer_${transferId}_report.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading PDF report:', error);
          alert('Failed to download PDF report: ' + (error.message || 'Unknown error'));
        }
        return;
      }

      // For preview, continue using the existing HTML preview method
      const transfer = checkTransfer;
      
      // Generate HTML content for the preview
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stock Transfer Report - #${transfer.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .transfer-details { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .status { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 14px; }
            .status.completed { background-color: #d4edda; color: #155724; }
            .status.processing { background-color: #cce5ff; color: #004085; }
            .status.pending { background-color: #fff3cd; color: #856404; }
            .status.cancelled { background-color: #f8d7da; color: #721c24; }
            .notes { background-color: #f8f9fa; padding: 10px; border-left: 4px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Stock Transfer Report</h1>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="transfer-details">
            <div class="section">
              <p><span class="label">Transfer ID:</span> #${transfer.id}</p>
              <p><span class="label">Product:</span> ${transfer.product?.name || transfer.source_product_name || "Unknown Product"}</p>
              <p><span class="label">Quantity:</span> ${transfer.quantity}</p>
              <p><span class="label">Status:</span> <span class="status ${transfer.status}">${transfer.status}</span></p>
            </div>
            
            <div class="section">
              <h3>Transfer Information</h3>
              <p><span class="label">From:</span> ${transfer.source_subinventory_name || ""} > ${transfer.source_locator_name || "Unknown"}</p>
              <p><span class="label">To:</span> ${transfer.destination_subinventory_name || ""} > ${transfer.destination_locator_name || "Unknown"}</p>
              <p><span class="label">Created on:</span> ${new Date(transfer.created_at).toLocaleString()}</p>
              ${transfer.updated_at ? `<p><span class="label">Last updated:</span> ${new Date(transfer.updated_at).toLocaleString()}</p>` : ""}
            </div>
            
            ${transfer.notes ? `
            <div class="section">
              <h3>Notes</h3>
              <div class="notes">${transfer.notes}</div>
            </div>
            ` : ""}
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #777; font-size: 12px;">
            <p>This report was generated by the Inventory Management System.</p>
          </div>
        </body>
        </html>
      `;

      // Create a blob with HTML content and proper content type
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Show preview
      setSelectedTransfer(transfer);
      setSelectedReport(url);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating stock transfer report:', error);
      alert('Failed to generate transfer report: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await fetchWithAuth(`/orders/${reportId}`, {
        method: 'DELETE'
      });
      // Refresh reports list after deletion
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const handleDeleteTransfer = async (transferId) => {
    if (!window.confirm('Are you sure you want to delete this transfer record?')) return;
    
    try {
      await fetchWithAuth(`/stock-transfers/${transferId}/cancel`, {
        method: 'PUT'
      });
      // Refresh transfers list after deletion
      fetchStockTransfers();
      alert('Transfer has been cancelled successfully.');
    } catch (error) {
      console.error('Error deleting transfer:', error);
      alert('Failed to cancel transfer record: ' + (error.message || 'Unknown error'));
    }
  };

  const viewReport = async (reportId) => {
    try {
      // First check if the report exists to avoid "Order not found" error
      const checkReport = reports.find(r => r.id === reportId);
      if (!checkReport) {
        alert('Report not found. Please refresh the list and try again.');
        return;
      }
      
      // Enhanced logging for debugging purposes
      console.log(`Attempting to fetch report for ID: ${reportId}`);
      console.log(`Report details:`, checkReport);
      
      // Use fetchWithAuth instead of direct fetch for consistent auth handling
      const response = await fetchWithAuth(`/orders/${reportId}/report`, {
        responseType: 'blob'
      });
      
      // Create a blob URL from the response
      const url = window.URL.createObjectURL(response);
      
      // Set customer details for display in preview
      if (checkReport.customer) {
        setSelectedCustomer(checkReport.customer);
      }
      
      setSelectedReport(url);
      setShowPreview(true);
    } catch (error) {
      console.error('Error viewing report:', error);
      console.error(`Failed to fetch report with ID: ${reportId}`);
      console.error(`API endpoint used: /orders/${reportId}/report`);
      alert('Failed to view report: ' + (error.message || 'Unknown error'));
    }
  };
  
  const generateInventoryReport = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/reports/inventory', {
        method: 'POST',
        body: JSON.stringify({ date: new Date().toISOString() })
      });
      
      if (response?.id) {
        alert('Inventory report generated successfully');
        fetchReports();
      }
    } catch (error) {
      console.error('Error generating inventory report:', error);
      alert('Failed to generate inventory report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <i className="fas fa-clock mr-1 text-yellow-600 dark:text-yellow-400"></i>;
      case 'processing':
        return <i className="fas fa-sync-alt mr-1 text-blue-600 dark:text-blue-400"></i>;
      case 'completed':
        return <i className="fas fa-check-circle mr-1 text-green-600 dark:text-green-400"></i>;
      case 'cancelled':
        return <i className="fas fa-times-circle mr-1 text-red-600 dark:text-red-400"></i>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">Report Management</h2>
          <div className="space-x-3">
            <button
              onClick={generateInventoryReport}
              className="bg-green-600 text-black px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <i className="fas fa-file-alt mr-2"></i>Generate Inventory Report
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="mb-6  border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'orders'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              Order Reports
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`py-4 px-1 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'transfers'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              Stock Transfer Reports
            </button>
          </nav>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {activeTab === 'orders' && (
            <div className="md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Reports</option>
                <option value="order">Order Reports</option>
                <option value="inventory">Inventory Reports</option>
                <option value="movement">Stock Movements</option>
              </select>
            </div>
          )}
          
          {activeTab === 'transfers' && (
            <div className="md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Filter
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Transfers</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
          )}
          
          <div className="md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div className="md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div className="md:w-1/4 flex items-end">
            <button
              onClick={activeTab === 'orders' ? fetchReports : fetchStockTransfers}
              className="w-full px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
            >
              <i className="fas fa-search mr-2"></i>Filter Reports
            </button>
          </div>
        </div>

        {/* Order Reports Table */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Report ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contact Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">GST</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No reports found for the selected criteria
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        #{report.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {report.customer?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {report.customer?.email ? (
                          <div>
                            <a href={`mailto:${report.customer.email}`} className="text-blue-600 hover:underline dark:text-blue-400">
                              {report.customer.email}
                            </a>
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {report.customer ? (
                          <div>
                            <div className="text-xs">{report.customer.address}</div>
                            {report.customer.city && report.customer.state && (
                              <div className="text-xs mt-1">{report.customer.city}, {report.customer.state} {report.customer.pin}</div>
                            )}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.customer?.gst ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                              GST: {report.customer.gst}
                            </span>
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          report.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          report.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => viewReport(report.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                        >
                          <i className="fas fa-eye mr-1"></i>View
                        </button>
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400"
                        >
                          <i className="fas fa-download mr-1"></i>Download
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
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
        )}

        {/* Stock Transfer Reports Table */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transfer ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loadingTransfers ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No stock transfers found for the selected criteria
                    </td>
                  </tr>
                ) : (
                  transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        #{transfer.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transfer.product?.name || transfer.source_product_name || 'Unknown Product'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {transfer.source_subinventory_name ? 
                          `${transfer.source_subinventory_name} > ${transfer.source_locator_name || ''}` : 
                          transfer.source_locator_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {transfer.destination_subinventory_name ? 
                          `${transfer.destination_subinventory_name} > ${transfer.destination_locator_name || ''}` : 
                          transfer.destination_locator_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transfer.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${getStatusColor(transfer.status)}`}>
                          {getStatusIcon(transfer.status)}
                          {transfer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(transfer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => generateStockTransferReport(transfer.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                        >
                          <i className="fas fa-eye mr-1"></i>View
                        </button>
                        <button
                          onClick={() => generateStockTransferReport(transfer.id, true)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400"
                        >
                          <i className="fas fa-download mr-1"></i>Download
                        </button>
                        <button
                          onClick={() => handleDeleteTransfer(transfer.id)}
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
        )}
      </div>

      {/* Report Preview Modal */}
      {showPreview && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-[90vw] h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {activeTab === 'orders' ? 'Order Report Preview' : 'Stock Transfer Report Preview'}
                </h3>
                {activeTab === 'orders' && selectedCustomer && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <p><strong>Customer:</strong> {selectedCustomer.name}</p>
                    <p><strong>Email:</strong> {selectedCustomer.email}</p>
                    <p><strong>Address:</strong> {selectedCustomer.address}</p>
                    {selectedCustomer.city && selectedCustomer.state && (
                      <p>{selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.pin}</p>
                    )}
                    {selectedCustomer.gst && (
                      <p><strong>GST:</strong> {selectedCustomer.gst}</p>
                    )}
                  </div>
                )}
                {activeTab === 'transfers' && selectedTransfer && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <p><strong>Transfer ID:</strong> #{selectedTransfer.id}</p>
                    <p><strong>Product:</strong> {selectedTransfer.product?.name || selectedTransfer.source_product_name || 'Unknown'}</p>
                    <p><strong>Status:</strong> {selectedTransfer.status}</p>
                    <p><strong>Date:</strong> {new Date(selectedTransfer.created_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedReport(null);
                  setSelectedCustomer(null);
                  setSelectedTransfer(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <object
              data={selectedReport}
              type={activeTab === 'transfers' ? 'text/html' : 'application/pdf'}
              className="w-full h-[calc(90vh-140px)]"
            >
              <p>Unable to display file. <a href={selectedReport} download>Download</a> instead.</p>
            </object>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
