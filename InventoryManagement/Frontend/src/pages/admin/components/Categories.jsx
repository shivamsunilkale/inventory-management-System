import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '0',  // Change to string
    stock: '0',  // Change to string
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    description: '',
    sub_inventory_id: '',
    locator_id: ''
  });
  const [editCategory, setEditCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Add organization state to store sub-inventories and locators
  const [organization, setOrganization] = useState(null);
  const [selectedSubInventory, setSelectedSubInventory] = useState(null);
  const [availableLocators, setAvailableLocators] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const data = await fetchWithAuth('/organization');
      if (data && data.length > 0) {
        setOrganization(data[0]);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sub-inventory selection and update available locators
  const handleSubInventoryChange = (e) => {
    const subInvId = parseInt(e.target.value);
    setNewCategory({...newCategory, sub_inventory_id: subInvId, locator_id: ''});
    
    if (!subInvId) {
      setSelectedSubInventory(null);
      setAvailableLocators([]);
      return;
    }
    
    const subInv = organization.sub_inventories.find(s => s.id === subInvId);
    setSelectedSubInventory(subInv);
    setAvailableLocators(subInv?.locators || []);
  };

  // New handler for sub-inventory selection in edit mode
  const handleEditSubInventoryChange = (e) => {
    const subInvId = parseInt(e.target.value);
    setEditCategory({...editCategory, sub_inventory_id: subInvId, locator_id: ''});
    
    if (!subInvId) {
      setSelectedSubInventory(null);
      setAvailableLocators([]);
      return;
    }
    
    const subInv = organization.sub_inventories.find(s => s.id === subInvId);
    setSelectedSubInventory(subInv);
    setAvailableLocators(subInv?.locators || []);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const productData = {
            ...newItem,
            price: parseFloat(newItem.price) || 0,
            stock: parseInt(newItem.stock) || 0,
            category_id: selectedCategory.id
        };
        
        if (isNaN(productData.price) || isNaN(productData.stock)) {
            throw new Error('Invalid price or stock value');
        }

        const response = await fetchWithAuth(`/categories/${selectedCategory.id}/products`, {
            method: 'POST',
            body: JSON.stringify(productData)
        });

        if (response) {
            setShowAddForm(false);
            setNewItem({ name: '', price: '0', stock: '0', description: '' });
            await fetchCategories();
        }
        
    } catch (error) {
        console.error('Error adding item:', error);
        if (error.message.includes('Unauthorized')) {
            // Handle unauthorized access - redirect to login
            window.location.href = '/';
        } else {
            alert(error.message || 'Failed to add item');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Check if locator_id is provided
      if (!newCategory.locator_id && !newCategory.sub_inventory_id) {
        console.log('Creating category without location association');
      } else if (!newCategory.locator_id) {
        throw new Error('Please select a locator for this category');
      }

      await fetchWithAuth('/categories/', {
        method: 'POST',
        body: JSON.stringify(newCategory)
      });
      
      setShowCategoryForm(false);
      setNewCategory({ 
        name: '', 
        description: '',
        sub_inventory_id: '',
        locator_id: ''
      });
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    try {
      // Validate sub-inventory and locator if provided
      if (editCategory.sub_inventory_id && !editCategory.locator_id) {
        alert('Please select a locator or remove the sub-inventory selection');
        return;
      }
      
      await fetchWithAuth(`/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(editCategory)
      });
      setEditCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await fetchWithAuth(`/categories/${categoryId}`, {
        method: 'DELETE'
      });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleEditProduct = async (product, categoryId) => {
    try {
        if (!categoryId) {
            throw new Error('Category ID is missing');
        }

        const formData = {
            name: editingProduct.name,
            price: parseFloat(editingProduct.price),
            stock: parseInt(editingProduct.stock),
            description: editingProduct.description || '',
            category_id: categoryId  // Make sure this is included
        };

        const response = await fetchWithAuth(`/categories/${categoryId}/products/${product.id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        if (!response) {
            throw new Error('Failed to update product');
        }

        setEditingProduct(null);
        await fetchCategories();
    } catch (error) {
        console.error('Error updating product:', error);
        alert(`Failed to update product: ${error.message}`);
    }
};

const handleDeleteProduct = async (product, categoryId) => {
  if (!window.confirm('Are you sure you want to delete this product?')) return;
  
  try {
    if (!categoryId) {
      throw new Error('Category ID is missing');
    }

    const response = await fetchWithAuth(`/categories/${categoryId}/products/${product.id}`, {
      method: 'DELETE'
    });

    if (!response) {
      throw new Error('Failed to delete product');
    }

    await fetchCategories();
    
  } catch (error) {
    console.error('Error deleting product:', error);
    alert(`Failed to delete product: ${error.message}`);
  }
};

  // Function to get a locator's full path (subinventory name + locator code)
  const getLocatorPath = (locatorId) => {
    if (!organization || !locatorId) return "Not assigned";
    
    for (const subInv of organization.sub_inventories || []) {
      const locator = subInv.locators?.find(l => l.id === parseInt(locatorId));
      if (locator) {
        return `${subInv.name} > ${locator.code}`;
      }
    }
    return "Unknown location";
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">Categories</h2>
        <div className="space-x-4">
          <button 
            onClick={() => setShowCategoryForm(true)}
            className="bg-green-600 text-black px-6 py-3 rounded-lg hover:bg-green-700"
          >
            <i className="fas fa-plus mr-2"></i>Add Category
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-black px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>Add Product
          </button>
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold dark:text-white">New Category</h3>
              <button
                onClick={() => setShowCategoryForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <textarea
                placeholder="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
              />
              
              {/* Sub-inventory selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Storage Location (Optional)
                </label>
                <select
                  value={newCategory.sub_inventory_id}
                  onChange={handleSubInventoryChange}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Sub-inventory</option>
                  {organization?.sub_inventories?.map(subInv => (
                    <option key={subInv.id} value={subInv.id}>
                      {subInv.name} ({subInv.type})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Locator selection - show only if a sub-inventory is selected */}
              {selectedSubInventory && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Locator
                  </label>
                  <select
                    value={newCategory.locator_id}
                    onChange={(e) => setNewCategory({...newCategory, locator_id: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required={!!newCategory.sub_inventory_id}
                  >
                    <option value="">Select Locator</option>
                    {availableLocators.map(locator => (
                      <option key={locator.id} value={locator.id}>
                        {locator.code} {locator.description ? `- ${locator.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="px-4 py-2 border rounded-lg dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-black rounded-lg hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <div 
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-[1.02] duration-300"
            >
              {/* Category Header */}
              <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 relative">
                {editCategory?.id === category.id ? (
                  <div className="flex-1 space-y-3 w-full pr-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-white">Category Name</label>
                      <input
                        type="text"
                        value={editCategory.name}
                        onChange={(e) => setEditCategory({...editCategory, name: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-300 text-gray-800"
                        placeholder="Category name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-white">Description</label>
                      <textarea
                        value={editCategory.description}
                        onChange={(e) => setEditCategory({...editCategory, description: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-300 text-gray-800 resize-none"
                        rows="2"
                        placeholder="Category description"
                      />
                    </div>
                    
                    {/* Add Sub-inventory Selection to Edit Form */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-white">Storage Location (Optional)</label>
                      <select
                        value={editCategory.sub_inventory_id || ''}
                        onChange={handleEditSubInventoryChange}
                        className="w-full px-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-300 text-gray-800"
                      >
                        <option value="">Select Sub-inventory</option>
                        {organization?.sub_inventories?.map(subInv => (
                          <option key={subInv.id} value={subInv.id}>
                            {subInv.name} ({subInv.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Add Locator Selection to Edit Form - Only show if sub-inventory is selected */}
                    {editCategory.sub_inventory_id && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-white">Locator</label>
                        <select
                          value={editCategory.locator_id || ''}
                          onChange={(e) => setEditCategory({...editCategory, locator_id: e.target.value})}
                          className="w-full px-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-300 text-gray-800"
                          required={!!editCategory.sub_inventory_id}
                        >
                          <option value="">Select Locator</option>
                          {availableLocators.map(locator => (
                            <option key={locator.id} value={locator.id}>
                              {locator.code} {locator.description ? `- ${locator.description}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-3 justify-end">
                      <button
                        onClick={() => handleUpdateCategory(category.id)}
                        className="px-4 py-1.5 bg-green-500 text-black rounded-lg hover:bg-green-600 transition-colors flex items-center"
                      >
                        <i className="fas fa-save mr-1.5"></i> Save
                      </button>
                      <button
                        onClick={() => setEditCategory(null)}
                        className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
                      >
                        <i className="fas fa-times mr-1.5"></i> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 pr-16">
                      <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-blue-100 text-sm line-clamp-2">{category.description}</p>
                      )}
                      
                      {/* Display category location with improved styling */}
                      {category.locator_id && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-md bg-blue-800 bg-opacity-80 text-blue-50 text-xs shadow-sm border border-blue-700">
                            <span className="flex items-center mr-1.5">
                              <i className="fas fa-warehouse text-blue-300 mr-1"></i>
                              <span className="font-medium">
                                {organization?.sub_inventories?.find(s => s.id === category.sub_inventory_id)?.name || 'Sub-inv'}
                              </span>
                            </span>
                            <i className="fas fa-angle-right text-blue-300 mx-1.5"></i>
                            <span className="flex items-center">
                              <i className="fas fa-map-marker-alt text-blue-300 mr-1"></i>
                              <span>
                                {organization?.sub_inventories
                                  ?.find(s => s.id === category.sub_inventory_id)
                                  ?.locators?.find(l => l.id === parseInt(category.locator_id))
                                  ?.code || 'Locator'}
                              </span>
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button
                        onClick={() => setEditCategory(category)}
                        className="p-2 bg-white bg-opacity-20 text-black rounded-full hover:bg-opacity-30 transition-colors"
                        title="Edit Category"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-white bg-opacity-20 text-black rounded-full hover:bg-opacity-30 transition-colors"
                        title="Delete Category"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Products Section */}
              <div className="p-4 flex-1 overflow-hidden flex flex-col">
                <h4 className="text-sm uppercase font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                  <i className="fas fa-box mr-2"></i> Products
                </h4>
                
                <div className="space-y-3 overflow-y-auto flex-1" style={{maxHeight: '240px'}}>
                  {category.products?.length > 0 ? (
                    category.products.map(product => (
                      <div 
                        key={product.id}
                        className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        {editingProduct?.id === product.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                              <input
                                type="text"
                                value={editingProduct.name}
                                onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                placeholder="Product name"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (₹)</label>
                                <input
                                  type="number"
                                  value={editingProduct.price}
                                  onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                  placeholder="Enter price"
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock</label>
                                <input
                                  type="number"
                                  value={editingProduct.stock}
                                  onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                  placeholder="Enter stock"
                                  min="0"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={() => handleEditProduct(product, category.id)}
                                className="px-3 py-1 bg-blue-600 text-black rounded hover:bg-blue-700 text-sm flex items-center"
                              >
                                <i className="fas fa-save mr-1"></i> Save
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm flex items-center"
                              >
                                <i className="fas fa-times mr-1"></i> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-800 dark:text-white">{product.name}</h4>
                              <div className="flex items-center space-x-1 ml-2">
                                <button
                                  onClick={() => setEditingProduct({
                                    ...product,
                                    category_id: category.id
                                  })}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full dark:hover:bg-gray-700"
                                >
                                  <i className="fas fa-pen text-xs"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product, category.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-full dark:hover:bg-gray-700"
                                >
                                  <i className="fas fa-trash text-xs"></i>
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300">
                                <i className="fas fa-cubes mr-1"></i> Stock: {product.stock}
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                                <i className="fas fa-rupee-sign mr-1 text-xs"></i>{product.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <i className="fas fa-box-open text-2xl mb-2"></i>
                      <p>No products in this category</p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowAddForm(true);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <i className="fas fa-plus-circle mr-2"></i>Add Product
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md m-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold dark:text-white">New Item</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === parseInt(e.target.value));
                    setSelectedCategory(cat);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                    placeholder="Enter price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                    placeholder="Enter stock quantity"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCategory}
                  className="px-6 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center disabled:bg-gray-400"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    'Add Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
