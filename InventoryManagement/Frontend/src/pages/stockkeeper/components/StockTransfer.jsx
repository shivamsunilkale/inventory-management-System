import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';
import { getOrganizationData, getCategoriesData, getLocatorPath, getLocatorCategories } from '../../../utils/organizationService';
import { fetchProductsByCategory, getProductById, invalidateProductsCache, getProductsData } from '../../../utils/productService';

const StockTransfer = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Organization data to get sub-inventories and locators
  const [organization, setOrganization] = useState(null);
  
  // Form data with sub-inventory fields
  const [formData, setFormData] = useState({
    product_id: '',
    source_sub_inventory_id: '',
    source_locator_id: '',
    source_category_id: '',  // Added source category
    destination_sub_inventory_id: '',
    destination_locator_id: '',
    destination_category_id: '', // Added destination category
    quantity: '',
    notes: ''
  });

  // State for tracking available options at each selection step
  const [sourceLocators, setSourceLocators] = useState([]);
  const [destinationLocators, setDestinationLocators] = useState([]);
  const [sourceCategories, setSourceCategories] = useState([]);  // Added for source categories
  const [destinationCategories, setDestinationCategories] = useState([]);  // Added for destination categories
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // State for all categories
  const [categories, setCategories] = useState([]);
  
  // Add state for form validation error
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  // Add state for popup notification
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [transferId, setTransferId] = useState(null);
  
  // Add state for locator paths
  const [locatorPaths, setLocatorPaths] = useState({});
  // Add loading state for paths
  const [loadingPaths, setLoadingPaths] = useState(false);

  useEffect(() => {
    fetchTransfers();
    fetchProducts();
    fetchOrganizationData();
    fetchCategories(); 
  }, []);

  // Set up auto-refresh for transfers (every 30 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!showForm) { // Don't refresh while user is creating a new transfer
        fetchTransfers();
      }
    }, 30000);

    return () => clearInterval(intervalId); // Clean up on component unmount
  }, [showForm]);

  // Add function to fetch categories using the service
  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const data = await getCategoriesData();
      console.log('Categories fetched:', data?.length || 0);
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Update the useEffect to directly fetch products from the API by category ID
  useEffect(() => {
    const loadProductsByCategory = async () => {
      if (!formData.source_category_id) {
        setFilteredProducts([]);
        return;
      }

      const categoryId = parseInt(formData.source_category_id);
      console.log(`Loading products for category ID: ${categoryId}`);
      
      setLoadingProducts(true);
      try {
        // Use the direct API fetch function to get products by category ID
        const productsWithStock = await fetchProductsByCategory(categoryId, true);
        
        console.log(`Found ${productsWithStock.length} products with stock > 0 in category ${categoryId}`);
        setFilteredProducts(productsWithStock);
        
        // Show a useful debug message if no products were found
        if (productsWithStock.length === 0) {
          console.log("No products were found in this category with available stock.");
        }
      } catch (error) {
        console.error("Error loading products by category:", error);
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

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (submissionSuccess) {
      const timer = setTimeout(() => {
        setSubmissionSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submissionSuccess]);

  // Modify effect to load locator paths when transfers change
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

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      console.log('Fetching stock transfers...');
      const response = await fetchWithAuth('/stock-transfers');
      console.log('Stock transfers fetched successfully:', response);
      setTransfers(response || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      // Show error message to the user
      setFormError('Failed to load transfers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Update to use the organization service
  const fetchOrganizationData = async () => {
    try {
      const data = await getOrganizationData();
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const data = await getProductsData(true); // Force refresh to ensure latest data
      console.log(`Products fetched: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        // Log some product info for debugging
        console.log('Sample products:', 
          data.slice(0, 3).map(p => ({ 
            id: p.id, 
            name: p.name, 
            stock: p.stock, 
            categoryId: p.category?.id || 'none'
          }))
        );
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  // Handle source locator selection - updated to fetch categories for the locator
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

  // New handler for destination locator selection
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

  // New handler for destination category selection
  const handleDestinationCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    
    setFormData({
      ...formData,
      destination_category_id: categoryId
    });
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

      // Prepare the data for API call - ensure proper numeric types
      const transferData = {
        product_id: parseInt(formData.product_id),
        source_location: parseInt(formData.source_locator_id),
        destination_location: parseInt(formData.destination_locator_id),
        quantity: parseInt(formData.quantity),
        notes: formData.notes || undefined // Only include if not empty
      };
      
      // Add optional category fields only if they exist
      if (formData.source_category_id) {
        transferData.source_category = parseInt(formData.source_category_id);
      }
      
      if (formData.destination_category_id) {
        transferData.destination_category = parseInt(formData.destination_category_id);
      }
      
      console.log('Submitting transfer data:', transferData);
      
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';  // pending
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <i className="fas fa-clock mr-1 text-yellow-600"></i>;
      case 'processing':
        return <i className="fas fa-sync-alt mr-1 text-blue-600"></i>;
      case 'completed':
        return <i className="fas fa-check-circle mr-1 text-green-600"></i>;
      case 'cancelled':
        return <i className="fas fa-times-circle mr-1 text-red-600"></i>;
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

  // Modified function to safely get locator path display value - now returns from state
  const getLocatorPathDisplay = (locatorId, isSource = true) => {
    if (!locatorId) return 'Unknown';
    const key = isSource ? `source_${locatorId}` : `dest_${locatorId}`;
    return locatorPaths[key] || (loadingPaths ? 'Loading...' : 'Unknown');
  };

  // Render product selection based on selected category
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
                Your stock transfer has been created and is awaiting approval from the inventory manager.
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
        <h2 className="text-2xl font-semibold dark:text-white">Stock Transfers</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
        >
          New Transfer
        </button>
      </div>

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
                  <span>Transfer created successfully! Awaiting admin approval.</span>
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
                      max={products.find(p => p.id.toString() === formData.product_id)?.stock || 9999}
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {products.find(p => p.id.toString() === formData.product_id)?.stock || 0} units
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

      {/* Information about approval process */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
        <h3 className="font-medium text-blue-800 flex items-center">
          <i className="fas fa-info-circle mr-2"></i> Transfer Approval Process
        </h3>
        <p className="text-sm text-blue-600 mt-1">
          Newly created transfers will appear with a "Pending" status and must be approved by an administrator before processing.
          Once approved, the status will change to "In process". After completion, inventory will be updated automatically.
        </p>
      </div>

      {/* Show a button to refresh transfers */}
      <div className="mb-4">
        <button
          onClick={fetchTransfers}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          <i className="fas fa-sync-alt mr-1"></i> Refresh Transfers
        </button>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="ml-2">Loading transfers...</span>
                    </div>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center py-2">
                      <i className="fas fa-exchange-alt text-2xl text-gray-400 mb-2"></i>
                      <p>No transfers found</p>
                      <p className="text-sm mt-1">Create a new transfer to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map(transfer => (
                  <tr key={transfer.id} className={transfer.status === 'pending' ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      #{transfer.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transfer.product?.name || transfer.source_product_name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {transfer.source_locator_name || getLocatorPathDisplay(transfer.source_location, true)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {transfer.destination_locator_name || getLocatorPathDisplay(transfer.destination_location, false)}
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
                        <p className="text-xs text-gray-500 mt-1">
                          <i className="fas fa-paper-plane mr-1"></i>
                          Sent to inventory manager for approval
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(transfer.created_at).toLocaleString()}
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

export default StockTransfer;
