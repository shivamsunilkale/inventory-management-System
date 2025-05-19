import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const OrderForm = ({ onClose, onOrderComplete }) => {
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    Promise.all([
      fetchProducts(),
      fetchCategories()
    ]);
  }, []);

  // Predefined products if API fails
  const defaultProducts = [
    { id: 1, name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299.99, stock: 50 },
    { id: 2, name: 'iPhone 13 Pro', category: 'Electronics', price: 999.99, stock: 30 },
    { id: 3, name: 'Office Desk Chair', category: 'Furniture', price: 199.99, stock: 25 },
    { id: 4, name: 'Wireless Mouse', category: 'Electronics', price: 29.99, stock: 100 },
    { id: 5, name: 'Monitor 27"', category: 'Electronics', price: 299.99, stock: 40 },
    { id: 6, name: 'Standing Desk', category: 'Furniture', price: 499.99, stock: 15 },
    { id: 7, name: 'Mechanical Keyboard', category: 'Electronics', price: 129.99, stock: 60 },
    { id: 8, name: 'Filing Cabinet', category: 'Furniture', price: 149.99, stock: 20 },
    { id: 9, name: 'Wireless Headphones', category: 'Electronics', price: 199.99, stock: 45 },
    { id: 10, name: 'Office Chair Mat', category: 'Furniture', price: 39.99, stock: 70 },
    { id: 11, name: 'Webcam HD', category: 'Electronics', price: 79.99, stock: 55 },
    { id: 12, name: 'Desk Lamp LED', category: 'Electronics', price: 49.99, stock: 80 }
  ];

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(Array.isArray(data) && data.length > 0 ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
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

  // Update the filtering logic
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(product => {
        return product.category && product.category.name === selectedCategory;
      });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const orderData = {
        items: selectedItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      await fetchWithAuth('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      
      alert('Order created successfully!');
      onOrderComplete();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-[90vw] h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold dark:text-white">Create New Order</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
          {/* Product Categories */}
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

          {/* Product Grid */}
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
                  Stock: {product.stock}
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

          {/* Submit Button */}
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
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;
