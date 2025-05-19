import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const PurchaseOrderForm = ({ onClose, onOrderComplete }) => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchCustomers()
    ]);
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchWithAuth('/customers');
      if (!Array.isArray(data)) {
        console.warn('Invalid customers response format');
        setCustomers([]);
        return;
      }
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const addItem = (product) => {
    setSelectedItems([
      ...selectedItems,
      { ...product, quantity: 1 }
    ]);
  };

  const updateQuantity = (productId, quantity) => {
    setSelectedItems(selectedItems.map(item => 
      item.id === productId ? { ...item, quantity: parseInt(quantity) } : item
    ));
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
  };

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(product => {
        return product.category && product.category.name === selectedCategory;
      });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItems.length === 0) {
        throw new Error('Please add at least one product');
      }

      const orderData = {
        type: 'purchase',
        customer_id: selectedCustomer,
        items: selectedItems.map(item => ({
          product_id: item.id,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        }))
      };

      const response = await fetchWithAuth('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      // Extract order ID from response
      let orderId = null;
      if (response && response.id) {
        orderId = response.id;
      }

      alert('Purchase order created successfully! Waiting for inventory manager approval.');
      
      // Pass the order ID back to parent component
      if (typeof onOrderComplete === 'function') {
        onOrderComplete(orderId);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert(error.message || 'Failed to create purchase order');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-[90vw] h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold dark:text-white">Create Purchase Order</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="">Choose a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categories Section */}
          <div className="mb-4">
            <h4 className="text-lg font-medium dark:text-white mb-2">Categories</h4>
            <div className="flex space-x-2 flex-wrap gap-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === 'All'
                    ? 'bg-blue-600 text-black'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => handleCategoryFilter('All')}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === category.name
                      ? 'bg-blue-600 text-black'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700'
                  }`}
                  onClick={() => handleCategoryFilter(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} 
                className="border dark:border-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-white">{product.name}</h5>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ₹{product.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Current Stock: {product.stock}
                </p>
                <button
                  type="button"
                  onClick={() => addItem(product)}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700
                    disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={selectedItems.some(item => item.id === product.id)}
                >
                  Add to Order
                </button>
              </div>
            ))}
          </div>

          {/* Selected Items */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium dark:text-white">Order Items</h4>
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between border-b pb-2">
                <span>{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">₹{item.price.toFixed(2)}</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium dark:text-white">Total:</span>
              <span className="text-xl font-bold dark:text-white">
                ₹{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Approval Notice */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600">
              <i className="fas fa-info-circle mr-1"></i>
              Purchase orders require approval from an inventory manager before they affect inventory levels.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedItems.length === 0}
              className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700
                disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;