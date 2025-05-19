import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

// Extracted Form Component for reusability
const CustomerForm = ({ formData, handleInputChange, onSubmit, onCancel, isSubmitting, formTitle, submitButtonText }) => (
  <form onSubmit={onSubmit} className="p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md max-h-[80vh] overflow-y-auto">
    <h3 className="text-xl font-semibold mb-4 md:mb-6 text-gray-800 dark:text-gray-200 border-b pb-3 dark:border-gray-700">
      {formTitle}
    </h3>
    
    <div className="space-y-4 md:space-y-6">
      {/* Customer Details Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Customer Name*
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email*
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
            required
            placeholder="customer@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            GST Number
          </label>
          <input
            type="text"
            name="gst"
            value={formData.gst}
            onChange={handleInputChange}
            className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
            placeholder="e.g. 22AAAAA0000A1Z5"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="pt-2 border-t dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Address Information</h4>
        
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address*
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
              rows="2"
              required
              placeholder="Street address"
            />
          </div>

          {/* City and State in flex layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City*
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State*
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
                required
              />
            </div>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PIN Code*
            </label>
            <input
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition duration-150"
              required
              placeholder="6-digit code"
              pattern="[0-9]{6}"
              title="PIN Code must be a 6-digit number"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Form buttons with enhanced styling */}
    <div className="flex justify-end space-x-3 pt-4 md:pt-6 mt-4 md:mt-6 border-t dark:border-gray-700">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-150 shadow-sm"
      >
        Cancel
      </button>
      <button
        type="submit"
        className={`px-4 py-2 ${
          formTitle.includes("Add") ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
        } text-black rounded-lg transition duration-150 flex items-center shadow-md`}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
            {formTitle.includes("Add") ? "Saving..." : "Updating..."}
          </>
        ) : (
          <>
            <i className={`fas ${formTitle.includes("Add") ? "fa-plus" : "fa-save"} mr-2`}></i>
            {submitButtonText}
          </>
        )}
      </button>
    </div>
  </form>
);

// Main Customer component
const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormState = {
    name: '',
    email: '',
    gst: '',
    address: '',
    city: '',
    state: '',
    pin: '',
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Function to fetch all customers from the database
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle adding a new customer
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    try {
      // Add validation if needed
      if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.state || !formData.pin) {
        throw new Error('Please fill all required fields');
      }

      // Validate email format
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Format data for API submission
      const customerData = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pin: parseInt(formData.pin, 10), // Convert PIN to number
        gst: formData.gst || null // Handle empty GST field
      };
      
      // Ensure PIN is truly a numeric value
      if (isNaN(customerData.pin)) {
        throw new Error('PIN Code must be a valid 6-digit number');
      }
      
      await fetchWithAuth('/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });
      
      // Close form and refresh customer list
      setShowAddModal(false);
      setFormData(initialFormState);
      await fetchCustomers();
      
      // Show success message
      alert('Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      let errorMessage = 'Failed to add customer. Please try again.';
      
      // Extract more specific error message if available
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(errorMessage); // Show error to user
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing an existing customer
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    try {
      // Add validation if needed
      if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.state || !formData.pin) {
        throw new Error('Please fill all required fields');
      }

      // Validate email format
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Format data for API submission
      const customerData = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pin: parseInt(formData.pin, 10), // Convert PIN to number
        gst: formData.gst || null // Handle empty GST field
      };
      
      // Ensure PIN is truly a numeric value
      if (isNaN(customerData.pin)) {
        throw new Error('PIN Code must be a valid 6-digit number');
      }
      
      const response = await fetchWithAuth(`/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });
      
      // Make sure we got a valid response
      if (response) {
        // Close form and refresh customer list
        setShowEditModal(false);
        setSelectedCustomer(null);
        setFormData(initialFormState);
        await fetchCustomers(); // Await to ensure the latest data is fetched
        
        // Optional: Show success message
        alert('Customer updated successfully!');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      let errorMessage = 'Failed to update customer. Please try again.';
      
      // Extract more specific error message if available
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(errorMessage); // Show error to user
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a customer
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    
    try {
      await fetchWithAuth(`/customers/${selectedCustomer.id}`, {
        method: 'DELETE'
      });
      
      // Close modal and refresh customer list
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError('Failed to delete customer. Please try again.');
    }
  };

  // Setup edit mode for a customer
  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pin: customer.pin || '',
      gst: customer.gst || ''
    });
    setShowEditModal(true);
  };

  // Setup delete confirmation for a customer
  const handleDeleteCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  // Render the Add Customer modal with responsive improvements
  const renderAddModal = () => {
    if (!showAddModal) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="w-full max-w-md md:max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all">
          <CustomerForm
            formData={formData}
            handleInputChange={handleInputChange}
            onSubmit={handleAddSubmit}
            onCancel={() => {
              setShowAddModal(false);
              setFormData(initialFormState);
            }}
            isSubmitting={isSubmitting}
            formTitle="Add New Customer"
            submitButtonText="Add Customer"
          />
        </div>
      </div>
    );
  };

  // Render the Edit Customer modal with responsive improvements
  const renderEditModal = () => {
    if (!showEditModal) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="w-full max-w-md md:max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all">
          <CustomerForm
            formData={formData}
            handleInputChange={handleInputChange}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedCustomer(null);
              setFormData(initialFormState);
            }}
            isSubmitting={isSubmitting}
            formTitle="Edit Customer"
            submitButtonText="Update Customer"
          />
        </div>
      </div>
    );
  };

  // Render the Delete Customer confirmation modal
  const renderDeleteModal = () => {
    if (!showDeleteModal || !selectedCustomer) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-800 dark:text-gray-200">{selectedCustomer.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter customers based on search term
  const filteredCustomers = searchTerm.trim() === '' 
    ? customers 
    : customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.gst?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full p-6 transition-all duration-200">
      {/* Header with Add Customer button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-users text-blue-600 mr-2"></i>
            Customers
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your customer database ({filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'})
          </p>
        </div>

        <button 
          onClick={() => {
            setShowAddModal(true);
          }}
          className="bg-green-600 text-black px-6 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-md transform transition hover:scale-105 duration-200"
        >
          <i className="fas fa-plus mr-2"></i>Add Customer
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <div className="relative w-full md:w-1/3">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            placeholder="Search customers by name, GST, address or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200"
          />
        </div>
      </div>

      {/* Customers list */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading customers...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="overflow-hidden bg-white dark:bg-gray-800 shadow-md rounded-lg transition-all duration-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.gst ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {customer.gst}
                          </span>
                        ) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {customer.address ? (
                          <span>
                            {customer.address} 
                            {customer.city && customer.state ? (
                              <span className="block mt-1 text-xs text-gray-400">
                                {customer.city}, {customer.state} {customer.pin}
                              </span>
                            ) : ''}
                          </span>
                        ) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEditClick(customer)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4 hover:underline transition-colors"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:underline transition-colors"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <i className="fas fa-users text-4xl text-gray-400 mb-3"></i>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm.trim() !== '' ? 'No customers match your search.' : 'No customers found. Add your first customer!'}
          </p>
          {searchTerm.trim() !== '' && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-times mr-2"></i>Clear Search
            </button>
          )}
        </div>
      )}

      {/* Modal components with improved responsive styling */}
      {renderAddModal()}
      {renderEditModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default Customer;