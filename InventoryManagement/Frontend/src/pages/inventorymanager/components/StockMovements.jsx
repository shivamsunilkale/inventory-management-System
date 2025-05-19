import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';
import { getOrganizationData, getCategoriesData, getLocatorPath, getLocatorCategories } from '../../../utils/organizationService';
import { fetchProductsByCategory, invalidateProductsCache } from '../../../utils/productService';

const StockMovements = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Organization structure data
  const [organization, setOrganization] = useState(null);
  const [locations, setLocations] = useState([]);
  
  // Product data
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Categories data
  const [categories, setCategories] = useState([]);
  
  // Source location selection states
  const [sourceLocators, setSourceLocators] = useState([]);
  const [sourceCategories, setSourceCategories] = useState([]);
  
  // Destination location selection states
  const [destinationLocators, setDestinationLocators] = useState([]);
  const [destinationCategories, setDestinationCategories] = useState([]);
  
  // Form data with hierarchical structure
  const [formData, setFormData] = useState({
    product_id: '',
    source_sub_inventory_id: '',
    source_locator_id: '',
    source_category_id: '',
    destination_sub_inventory_id: '',
    destination_locator_id: '',
    destination_category_id: '',
    quantity: '',
    notes: ''
  });
  
  // Form validation state
  const [formError, setFormError] = useState('');
  // Add form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  // Add transfer ID and success popup states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [transferId, setTransferId] = useState(null);
  
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  // Add state for notification messages
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  // Add state for confirmation dialogs with more detailed information
  const [confirmAction, setConfirmAction] = useState({ 
    show: false, 
    action: null, 
    transferId: null, 
    message: '',
    details: '',
    transferData: null
  });
  // Add a counter for pending transfers to show in badge
  const [pendingCount, setPendingCount] = useState(0);
  
  // Add state for locator paths
  const [locatorPaths, setLocatorPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState(false);

  // Automatically set filter to pending transfers if there are any pending
  useEffect(() => {
    if (pendingCount > 0 && filterStatus === 'all') {
      setFilterStatus('pending');
    }
  }, [pendingCount]);

  useEffect(() => {
    fetchTransfers();
    fetchOrganizationData();
    fetchProducts();
    fetchCategories();
    
    // Auto-refresh transfers every 30 seconds
    const intervalId = setInterval(() => {
      fetchTransfers(false); // Pass false to not show loading indicator for auto-refresh
    }, 30000);
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [dateRange, filterStatus]);

  // Set up effect for filtering products based on selected category
  useEffect(() => {
    const loadProductsByCategory = async () => {
      if (!formData.source_category_id) {
        setFilteredProducts([]);
        return;
      }
      
      try {
        setLoadingProducts(true);
        const categoryProducts = await fetchProductsByCategory(formData.source_category_id);
        
        // Filter for products that have stock available
        const availableProducts = categoryProducts.filter(p => p.stock > 0);
        setFilteredProducts(availableProducts);
      } catch (error) {
        console.error('Error fetching products for category:', error);
        showNotification('Failed to load products for the selected category', 'error');
        setFilteredProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    loadProductsByCategory();
  }, [formData.source_category_id]);

  // Clear form error when source or destination changes
  useEffect(() => {
    if (formError) {
      setFormError('');
    }
  }, [formData.source_locator_id, formData.destination_locator_id]);

  // Add effect to load locator paths when transfers change
  useEffect(() => {
    const loadLocatorPaths = async () => {
      if (!transfers.length) return;
      
      setLoadingPaths(true);
      const paths = {...locatorPaths};
      let pathsChanged = false;
      
      for (const transfer of transfers) {
        if (!paths[`source_${transfer.source_location}`] && transfer.source_location) {
          try {
            paths[`source_${transfer.source_location}`] = await getLocatorPath(transfer.source_location);
            pathsChanged = true;
          } catch (error) {
            console.error(`Error loading path for source locator ${transfer.source_location}:`, error);
            paths[`source_${transfer.source_location}`] = transfer.source_locator_name || 'Unknown';
          }
        }
        
        if (!paths[`dest_${transfer.destination_location}`] && transfer.destination_location) {
          try {
            paths[`dest_${transfer.destination_location}`] = await getLocatorPath(transfer.destination_location);
            pathsChanged = true;
          } catch (error) {
            console.error(`Error loading path for destination locator ${transfer.destination_location}:`, error);
            paths[`dest_${transfer.destination_location}`] = transfer.destination_locator_name || 'Unknown';
          }
        }
      }
      
      if (pathsChanged) {
        setLocatorPaths(paths);
      }
      setLoadingPaths(false);
    };
    
    loadLocatorPaths();
  }, [transfers]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (submissionSuccess) {
      const timer = setTimeout(() => {
        setSubmissionSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submissionSuccess]);

  const fetchTransfers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (dateRange.startDate) queryParams.append('start_date', dateRange.startDate);
      if (dateRange.endDate) queryParams.append('end_date', dateRange.endDate);
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/stock-transfers?${queryString}` : '/stock-transfers';
      
      const data = await fetchWithAuth(endpoint);
      setTransfers(data || []);
      
      // Count pending transfers regardless of current filter
      const pendingTransfers = data?.filter(t => t.status === 'pending') || [];
      setPendingCount(pendingTransfers.length);
      
      // If there are pending transfers and we're not already showing them, suggest switching
      if (pendingTransfers.length > 0 && filterStatus !== 'pending' && filterStatus !== 'all') {
        showNotification(`There are ${pendingTransfers.length} pending transfers that need your approval.`, 'info');
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      showNotification('Failed to load transfers. Please try again.', 'error');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await fetchWithAuth('/locations');
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const data = await getOrganizationData();
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
      showNotification('Failed to load organization structure', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const data = await getCategoriesData();
      console.log(`Categories fetched: ${data?.length || 0}`);
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    
    try {
      // Validate that source and destination are different
      if (formData.source_locator_id === formData.destination_locator_id) {
        setFormError('Source and destination locations cannot be the same');
        setIsSubmitting(false);
        return;
      }

      // Validate the form
      if (!formData.product_id || !formData.source_locator_id || 
          !formData.destination_locator_id || !formData.quantity ||
          !formData.source_category_id || !formData.destination_category_id) {
        setFormError('Please fill all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Parse quantity to ensure it's a number
      const quantity = parseInt(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setFormError('Quantity must be a positive number');
        setIsSubmitting(false);
        return;
      }
      
      // Get the selected product to check stock
      const selectedProduct = filteredProducts.find(p => p.id === parseInt(formData.product_id));
      if (selectedProduct && selectedProduct.stock < quantity) {
        setFormError(`Insufficient stock. Available: ${selectedProduct.stock}, Requested: ${quantity}`);
        setIsSubmitting(false);
        return;
      }
      
      // Prepare the data for API call - ensure proper numeric types
      const transferData = {
        product_id: parseInt(formData.product_id),
        source_location: parseInt(formData.source_locator_id),
        destination_location: parseInt(formData.destination_locator_id),
        quantity: parseInt(formData.quantity),
        notes: formData.notes || undefined,
        source_category: parseInt(formData.source_category_id),
        destination_category: parseInt(formData.destination_category_id)
      };
      
      console.log('Submitting transfer data:', transferData);
      
      // Submit the form data
      const response = await fetchWithAuth('/stock-transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(transferData)
      });
      
      console.log('Transfer creation successful:', response);
      
      // Show success message inside form
      setSubmissionSuccess(true);
      
      // Set transfer ID and show popup notification
      if (response && response.id) {
        setTransferId(response.id);
        setShowSuccessPopup(true);
      }
      
      // Reset form
      setFormData({
        product_id: '',
        source_sub_inventory_id: '',
        source_locator_id: '',
        source_category_id: '',
        destination_sub_inventory_id: '',
        destination_locator_id: '',
        destination_category_id: '',
        quantity: '',
        notes: ''
      });
      
      // Invalidate product cache to ensure fresh data on next fetch
      invalidateProductsCache();
      
      // Refresh transfers list to include newly created transfer
      fetchTransfers();
      
      // Close form after small delay to show success message
      setTimeout(() => setShowForm(false), 1500);
    } catch (error) {
      console.error('Error creating transfer:', error);
      
      // Try to extract detailed error message from the response
      let errorMessage = 'Successfully created transfer.';
      
      if (error.response) {
        try {
          const responseText = await error.response.text();
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error('Backend error details:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorMessage = `Server error: ${error.status || '500'}`;
        }
      }
      
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
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
  
  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Awaiting approval';
      case 'processing': return 'In process';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  const approveTransfer = async (transferId) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return;

    setConfirmAction({
      show: true,
      action: 'approve',
      transferId,
      transferData: transfer,
      message: 'Approve Stock Transfer',
      details: `Are you sure you want to approve this transfer of ${transfer.quantity} units of "${transfer.product?.name || 'Unknown Product'}"? 

This will change its status to "processing" and allow the physical movement of stock to begin. 
No inventory changes will occur until the transfer is completed.`
    });
  };
  
  const completeTransfer = async (transferId) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return;

    setConfirmAction({
      show: true,
      action: 'complete',
      transferId,
      transferData: transfer,
      message: 'Complete Stock Transfer',
      details: `Are you sure you want to complete this transfer of ${transfer.quantity} units of "${transfer.product?.name || 'Unknown Product'}"?

This will:
1. Deduct ${transfer.quantity} units from the source location
2. Add ${transfer.quantity} units to the destination location
3. Update the inventory records to reflect this movement
4. Mark the transfer as completed`
    });
  };

  const cancelTransfer = async (transferId) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return;

    setConfirmAction({
      show: true,
      action: 'cancel',
      transferId,
      transferData: transfer,
      message: 'Cancel Stock Transfer',
      details: `Are you sure you want to cancel this transfer of ${transfer.quantity} units of "${transfer.product?.name || 'Unknown Product'}"? 

This action cannot be undone, but it will NOT affect inventory levels as the stock movement hasn't occurred yet.`
    });
  };

  const handleConfirmAction = async () => {
    const { action, transferId } = confirmAction;
    setConfirmAction({ show: false, action: null, transferId: null, message: '', details: '', transferData: null });
    
    try {
      if (action === 'approve') {
        await fetchWithAuth(`/stock-transfers/${transferId}/approve`, {
          method: 'PUT'
        });
        showNotification('Transfer approved successfully. The transfer is now in process.', 'success');
      } else if (action === 'complete') {
        await fetchWithAuth(`/stock-transfers/${transferId}/complete`, {
          method: 'PUT'
        });
        showNotification('Transfer completed successfully. Inventory has been updated to reflect the stock movement.', 'success');
      } else if (action === 'cancel') {
        await fetchWithAuth(`/stock-transfers/${transferId}/cancel`, {
          method: 'PUT'
        });
        showNotification('Transfer cancelled successfully. No inventory changes were made.', 'success');
      }
      fetchTransfers();
    } catch (error) {
      console.error(`Error ${action}ing transfer:`, error);
      showNotification(`Failed to ${action} transfer: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  // Handle source sub-inventory selection
  const handleSourceSubInventoryChange = (e) => {
    const subInvId = parseInt(e.target.value);
    console.log(`Selected source sub-inventory: ${subInvId}`);
    
    // Reset source locator and subsequent fields when sub-inventory changes
    setFormData({
      ...formData, 
      source_sub_inventory_id: subInvId,
      source_locator_id: '',
      source_category_id: '',  // Reset category
      product_id: '' // Reset product
    });
    
    // Find selected sub-inventory and get its locators
    const subInv = organization?.sub_inventories?.find(s => s.id === subInvId);
    const locators = subInv?.locators || [];
    console.log(`Found ${locators.length} locators for this sub-inventory`);
    setSourceLocators(locators);
    setSourceCategories([]); // Reset categories when sub-inventory changes
  };

  // Handle source locator selection - fetch categories for the locator
  const handleSourceLocatorChange = async (e) => {
    const locatorId = parseInt(e.target.value);
    
    // Reset category and product when locator changes
    setFormData({
      ...formData,
      source_locator_id: locatorId,
      source_category_id: '',
      product_id: ''
    });
    
    // If valid locator selected, fetch categories for this locator
    if (locatorId) {
      try {
        const locatorCategories = await getLocatorCategories(locatorId);
        console.log(`Found ${locatorCategories.length} categories for this locator`);
        setSourceCategories(locatorCategories);
      } catch (error) {
        console.error('Error fetching categories for locator:', error);
        setSourceCategories([]);
      }
    } else {
      setSourceCategories([]);
    }
  };

  // New handler for source category selection
  const handleSourceCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    
    // Reset product when category changes
    setFormData({
      ...formData,
      source_category_id: categoryId,
      product_id: ''
    });
  };

  // Handle destination sub-inventory selection
  const handleDestinationSubInventoryChange = (e) => {
    const subInvId = parseInt(e.target.value);
    
    // Reset destination locator and category when sub-inventory changes
    setFormData({
      ...formData, 
      destination_sub_inventory_id: subInvId,
      destination_locator_id: '',
      destination_category_id: ''
    });
    
    // Find selected sub-inventory and get its locators
    const subInv = organization?.sub_inventories?.find(s => s.id === subInvId);
    setDestinationLocators(subInv?.locators || []);
    setDestinationCategories([]);
  };

  // Handler for destination locator selection
  const handleDestinationLocatorChange = async (e) => {
    const locatorId = parseInt(e.target.value);
    
    // Reset category when locator changes
    setFormData({
      ...formData,
      destination_locator_id: locatorId,
      destination_category_id: ''
    });
    
    // If valid locator selected, fetch categories for this locator
    if (locatorId) {
      try {
        const locatorCategories = await getLocatorCategories(locatorId);
        console.log(`Found ${locatorCategories.length} categories for this destination locator`);
        setDestinationCategories(locatorCategories);
      } catch (error) {
        console.error('Error fetching categories for destination locator:', error);
        setDestinationCategories([]);
      }
    } else {
      setDestinationCategories([]);
    }
  };

  // Handler for destination category selection
  const handleDestinationCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    
    setFormData({
      ...formData,
      destination_category_id: categoryId
    });
  };
  
  // Function to render the product selection based on selected category
  const renderProductSelect = () => {
    if (!formData.source_category_id) {
      return null;
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product<span className="text-red-500">*</span>
        </label>
        {loadingProducts ? (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2 text-sm text-gray-500">Loading products...</span>
          </div>
        ) : (
          <>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({...formData, product_id: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select Product</option>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Stock: {product.stock})
                  </option>
                ))
              ) : (
                <option disabled value="">No products available in this category</option>
              )}
            </select>
            {filteredProducts.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-orange-600 text-sm">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  No products with available stock in this category.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Please select a different category or ensure products are properly assigned to this category.
                </p>
              </div>
            )}
            {filteredProducts.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                Found {filteredProducts.length} products with available stock in this category.
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Add a synchronous helper function to get locator path display
  const getLocatorPathDisplay = (locatorId, isSource = true) => {
    if (!locatorId) return 'Unknown';
    const key = isSource ? `source_${locatorId}` : `dest_${locatorId}`;
    return locatorPaths[key] || (loadingPaths ? 'Loading...' : 'Unknown');
  };

  return (
    <div className="space-y-6">
      {/* Success Popup Notification */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-down">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-check-circle text-3xl text-green-600 dark:text-green-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Transfer Created Successfully!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your stock transfer has been created and is now pending approval.
                {transferId && <span> Transfer ID: #{transferId}</span>}
              </p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold dark:text-white">Stock Movements</h2>
          {pendingCount > 0 && (
            <div className="ml-3 bg-red-500 text-black px-2 py-1 rounded-full text-sm flex items-center animate-pulse">
              <i className="fas fa-exclamation-circle mr-1"></i>
              {pendingCount} Pending
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
        >
          <i className="fas fa-plus mr-2"></i>New Stock Transfer
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
            <i className={`mr-2 ${
              notification.type === 'error' 
                ? 'fas fa-exclamation-circle' 
                : notification.type === 'success' 
                  ? 'fas fa-check-circle' 
                  : 'fas fa-info-circle'
            }`}></i>
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification({ show: false, message: '', type: '' })}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Stock Transfer Process Guidance */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center">
          <i className="fas fa-info-circle mr-2"></i>
          Stock Transfer Workflow
        </h3>
        <div className="mt-2">
          <ol className="list-decimal pl-5 text-blue-700 dark:text-blue-300 space-y-1">
            <li><span className="font-medium">Pending</span> - Stock keepers create transfer requests that need your approval</li>
            <li><span className="font-medium">Processing</span> - After approval, the physical movement of stock can begin</li>
            <li><span className="font-medium">Complete</span> - Once complete, the inventory is automatically updated</li>
          </ol>
          <p className="mt-2 text-blue-600 dark:text-blue-400 text-sm">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            Important: No stock changes occur until you mark a transfer as "Complete"
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="processing">In Process</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button 
            onClick={() => fetchTransfers()}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
          >
            <i className="fas fa-sync-alt mr-1"></i> Refresh Transfers
          </button>
        </div>
      </div>

      {/* Updated Stock Transfer Form with Modal Structure */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold dark:text-white">Create Stock Transfer</h3>
              <button 
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {submissionSuccess && (
              <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
                <div className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i>
                  <span>Transfer created successfully! Awaiting approval.</span>
                </div>
              </div>
            )}
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span>{formError}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source Location Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Location<span className="text-red-500">*</span>
                </label>
                
                {/* Source Sub-inventory */}
                <div className="mb-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Sub-inventory
                  </label>
                  <select
                    value={formData.source_sub_inventory_id}
                    onChange={handleSourceSubInventoryChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select Sub-inventory</option>
                    {organization?.sub_inventories?.map(subInv => (
                      <option key={subInv.id} value={subInv.id}>
                        {subInv.name} ({subInv.type})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Source Locator - only show if a sub-inventory is selected */}
                {formData.source_sub_inventory_id && (
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Locator
                    </label>
                    <select
                      value={formData.source_locator_id}
                      onChange={handleSourceLocatorChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select Locator</option>
                      {sourceLocators.map(locator => (
                        <option key={locator.id} value={locator.id}>
                          {locator.name || locator.code} {locator.description ? `- ${locator.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Source Category - only show if a locator is selected */}
                {formData.source_locator_id && (
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.source_category_id}
                      onChange={handleSourceCategoryChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select Category</option>
                      {sourceCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {sourceCategories.length === 0 && (
                      <p className="text-yellow-500 text-xs mt-1">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        No categories found for this locator
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Product Selection - Only show after selecting source category */}
              {formData.source_category_id && renderProductSelect()}

              {/* Destination Location Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Location<span className="text-red-500">*</span>
                </label>
                
                {/* Destination Sub-inventory */}
                <div className="mb-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Sub-inventory
                  </label>
                  <select
                    value={formData.destination_sub_inventory_id}
                    onChange={handleDestinationSubInventoryChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select Sub-inventory</option>
                    {organization?.sub_inventories?.map(subInv => (
                      <option key={subInv.id} value={subInv.id}>
                        {subInv.name} ({subInv.type})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Destination Locator - only show if a sub-inventory is selected */}
                {formData.destination_sub_inventory_id && (
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Locator
                    </label>
                    <select
                      value={formData.destination_locator_id}
                      onChange={handleDestinationLocatorChange}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formData.source_locator_id === formData.destination_locator_id && formData.destination_locator_id ? 
                        'border-red-500' : ''
                      }`}
                      required
                    >
                      <option value="">Select Locator</option>
                      {destinationLocators.map(locator => (
                        <option 
                          key={locator.id} 
                          value={locator.id}
                          disabled={locator.id === parseInt(formData.source_locator_id)}
                        >
                          {locator.name || locator.code} {locator.description ? `- ${locator.description}` : ''}
                          {locator.id === parseInt(formData.source_locator_id) ? ' (Same as source)' : ''}
                        </option>
                      ))}
                    </select>
                    {formData.source_locator_id === formData.destination_locator_id && formData.destination_locator_id && (
                      <p className="text-red-500 text-xs mt-1">
                        Source and destination cannot be the same location
                      </p>
                    )}
                  </div>
                )}
                
                {/* Destination Category - only show if a locator is selected */}
                {formData.destination_locator_id && (
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.destination_category_id}
                      onChange={handleDestinationCategoryChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select Category</option>
                      {destinationCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {destinationCategories.length === 0 && (
                      <p className="text-yellow-500 text-xs mt-1">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        No categories found for this locator
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Transfer Details Section - Only show if product is selected */}
              {formData.product_id && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={filteredProducts.find(p => p.id === parseInt(formData.product_id))?.stock || 9999}
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {filteredProducts.find(p => p.id === parseInt(formData.product_id))?.stock || 0} units
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                      rows="2"
                      placeholder="Optional transfer notes"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  disabled={
                    !formData.product_id || 
                    !formData.source_locator_id ||
                    !formData.source_category_id || 
                    !formData.destination_locator_id ||
                    !formData.destination_category_id || 
                    !formData.quantity || 
                    isSubmitting || 
                    formData.source_locator_id === formData.destination_locator_id
                  }
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-black border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-exchange-alt mr-2"></i>
                      Create Transfer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Confirmation Dialog */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium dark:text-white flex items-center mb-3">
              {confirmAction.action === 'approve' && <i className="fas fa-check-circle text-green-600 dark:text-green-400 mr-2"></i>}
              {confirmAction.action === 'complete' && <i className="fas fa-exchange-alt text-blue-600 dark:text-blue-400 mr-2"></i>}
              {confirmAction.action === 'cancel' && <i className="fas fa-times-circle text-red-600 dark:text-red-400 mr-2"></i>}
              {confirmAction.message}
            </h3>
            
            {/* Transfer details summary */}
            {confirmAction.transferData && (
              <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium text-gray-600 dark:text-gray-300">Product:</div>
                  <div className="text-gray-800 dark:text-white">{confirmAction.transferData.product?.name || 'Unknown Product'}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-300">Quantity:</div>
                  <div className="text-gray-800 dark:text-white">{confirmAction.transferData.quantity} units</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-300">From:</div>
                  <div className="text-gray-800 dark:text-white">{confirmAction.transferData.source_locator_name || 'Unknown'}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-300">To:</div>
                  <div className="text-gray-800 dark:text-white">{confirmAction.transferData.destination_locator_name || 'Unknown'}</div>
                </div>
              </div>
            )}
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line">{confirmAction.details}</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction({ 
                  show: false, action: null, transferId: null, message: '', details: '', transferData: null
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-black flex items-center ${
                  confirmAction.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 
                  confirmAction.action === 'complete' ? 'bg-blue-600 hover:bg-blue-700' : 
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.action === 'approve' && <i className="fas fa-check mr-1"></i>}
                {confirmAction.action === 'complete' && <i className="fas fa-check-double mr-1"></i>}
                {confirmAction.action === 'cancel' && <i className="fas fa-times mr-1"></i>}
                
                {confirmAction.action === 'approve' ? 'Approve Transfer' : 
                 confirmAction.action === 'complete' ? 'Complete Transfer' : 'Cancel Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
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
                    <div className="flex flex-col items-center py-4">
                      <i className="fas fa-exchange-alt text-2xl text-gray-400 mb-2"></i>
                      <p>No transfers found</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                      >
                        Create a new transfer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map(transfer => (
                  <tr 
                    key={transfer.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      transfer.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      #{transfer.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transfer.product?.name || transfer.source_product_name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {transfer.source_subinventory_name ? 
                        `${transfer.source_subinventory_name} > ${transfer.source_locator_name || ''}` : 
                        getLocatorPathDisplay(transfer.source_location, true)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {transfer.destination_subinventory_name ? 
                        `${transfer.destination_subinventory_name} > ${transfer.destination_locator_name || ''}` : 
                        getLocatorPathDisplay(transfer.destination_location, false)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transfer.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${getStatusColor(transfer.status)}`}>
                        {getStatusIcon(transfer.status)}
                        {getStatusText(transfer.status)}
                      </span>
                      {transfer.status === 'pending' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center">
                          <i className="fas fa-bell mr-1"></i>
                          Requires your approval
                        </p>
                      )}
                      {transfer.status === 'processing' && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                          <i className="fas fa-dolly mr-1"></i>
                          Physical transfer in progress
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(transfer.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-y-2">
                      {transfer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveTransfer(transfer.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center"
                            title="Approve transfer"
                          >
                            <i className="fas fa-check mr-1"></i>Approve
                          </button>
                          <button
                            onClick={() => cancelTransfer(transfer.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                            title="Cancel transfer"
                          >
                            <i className="fas fa-times mr-1"></i>Cancel
                          </button>
                        </>
                      )}
                      {transfer.status === 'processing' && (
                        <button
                          onClick={() => completeTransfer(transfer.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          title="Complete transfer and update inventory"
                        >
                          <i className="fas fa-check-double mr-1"></i>Complete
                        </button>
                      )}
                      {transfer.status === 'completed' && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center">
                          <i className="fas fa-check-circle mr-1 text-green-500"></i>
                          Completed on {new Date(transfer.updated_at).toLocaleString()}
                        </span>
                      )}
                      {transfer.status === 'cancelled' && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center">
                          <i className="fas fa-ban mr-1 text-red-500"></i>
                          Cancelled on {new Date(transfer.updated_at).toLocaleString()}
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
    </div>
  );
};

export default StockMovements;
