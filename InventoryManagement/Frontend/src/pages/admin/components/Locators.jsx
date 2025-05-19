import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const Locators = () => {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [expandedSubInventories, setExpandedSubInventories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  // Add state to track expanded locators and their categories
  const [expandedLocators, setExpandedLocators] = useState({});
  const [locatorCategories, setLocatorCategories] = useState({});
  const [loadingCategories, setLoadingCategories] = useState({});

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/organization');
      setOrganization(data && data.length > 0 ? data[0] : null);
      
      // Initialize expanded state for each sub-inventory
      if (data && data.length > 0 && data[0].sub_inventories) {
        const initialExpandedState = {};
        data[0].sub_inventories.forEach(subInv => {
          initialExpandedState[subInv.id] = false;
        });
        setExpandedSubInventories(initialExpandedState);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubInventory = (id) => {
    setExpandedSubInventories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add function to toggle locator expansion and fetch categories if needed
  const toggleLocator = async (locatorId) => {
    setExpandedLocators(prev => {
      const newState = {
        ...prev,
        [locatorId]: !prev[locatorId]
      };
      
      // If expanding and we don't have categories yet, fetch them
      if (newState[locatorId] && !locatorCategories[locatorId]) {
        fetchLocatorCategories(locatorId);
      }
      
      return newState;
    });
  };

  // Function to fetch categories for a specific locator
  const fetchLocatorCategories = async (locatorId) => {
    try {
      setLoadingCategories(prev => ({ ...prev, [locatorId]: true }));
      
      // Fetch categories that belong to this locator
      const data = await fetchWithAuth('/categories');
      const filteredCategories = data.filter(category => 
        category.locator_id === locatorId
      );
      
      setLocatorCategories(prev => ({ 
        ...prev, 
        [locatorId]: filteredCategories 
      }));
    } catch (error) {
      console.error(`Error fetching categories for locator ${locatorId}:`, error);
    } finally {
      setLoadingCategories(prev => ({ ...prev, [locatorId]: false }));
    }
  };

  // Updated function to filter only sub-inventories based on search term
  const filteredSubInventories = () => {
    if (!organization?.sub_inventories || !searchTerm.trim()) {
      return organization?.sub_inventories || [];
    }

    return organization.sub_inventories.filter(subInv => 
      subInv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subInv.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Function to filter locators within a sub-inventory (unchanged)
  const filteredLocators = (locators) => {
    return locators || [];
  };

  // Get type badge color
  const getTypeBadgeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'raw': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'finished': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'wip': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">Storage Sub Inventories</h2>
        </div>

        {/* Improved Search bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base transition-all duration-200 shadow-sm"
              placeholder="Search sub-inventories by name or type..."
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search sub-inventories"
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredSubInventories().length} sub-{filteredSubInventories().length === 1 ? 'inventory' : 'inventories'} matching "{searchTerm}"
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : !organization ? (
          <div className="text-center p-8">
            <i className="fas fa-exclamation-circle text-5xl text-gray-400 mb-4"></i>
            <p className="text-lg text-gray-500 dark:text-gray-400">Organization not set up.</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Please set up your organization in Organization Management.</p>
          </div>
        ) : filteredSubInventories().length === 0 ? (
          <div className="text-center p-8">
            <i className="fas fa-box-open text-5xl text-gray-400 mb-4"></i>
            <p className="text-lg text-gray-500 dark:text-gray-400">No matching sub-inventories found.</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try a different search term or' : 'Start by'} creating sub-inventories in Organization Management.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubInventories().map(subInventory => (
              <div key={subInventory.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Sub-inventory header */}
                <div 
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-650"
                  onClick={() => toggleSubInventory(subInventory.id)}
                >
                  <div className="flex items-center">
                    <i className={`mr-2 fas ${expandedSubInventories[subInventory.id] ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-500 dark:text-gray-400 w-4 transition-transform duration-200`}></i>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{subInventory.name}</h3>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getTypeBadgeColor(subInventory.type)}`}>
                      {subInventory.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {subInventory.locators?.length || 0} locator{subInventory.locators?.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Locators list */}
                {expandedSubInventories[subInventory.id] && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {filteredLocators(subInventory.locators)?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredLocators(subInventory.locators).map(locator => (
                          <div 
                            key={locator.id} 
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex justify-between flex-col h-full">
                              <div>
                                {/* Add click handler to toggle locator expansion */}
                                <div 
                                  onClick={() => toggleLocator(locator.id)} 
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <h4 className="font-medium text-gray-800 dark:text-white flex items-center">
                                    {locator.code}
                                    <i className={`ml-2 fas ${expandedLocators[locator.id] ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-500 dark:text-gray-400 text-xs`}></i>
                                  </h4>
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full">
                                    {locatorCategories[locator.id]?.length || 0} categories
                                  </span>
                                </div>
                                {locator.description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{locator.description}</p>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-2 justify-end">
                                {locator.length && locator.width && locator.height ? (
                                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-xs">
                                    {locator.length}×{locator.width}×{locator.height}
                                  </span>
                                ) : (
                                  <span className="text-xs italic">No dimensions</span>
                                )}
                              </div>
                              
                              {/* Categories list for this locator */}
                              {expandedLocators[locator.id] && (
                                <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                  <h5 className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Categories in this locator
                                  </h5>
                                  
                                  {loadingCategories[locator.id] ? (
                                    <div className="flex justify-center py-2">
                                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                    </div>
                                  ) : locatorCategories[locator.id]?.length > 0 ? (
                                    <ul className="space-y-1">
                                      {locatorCategories[locator.id].map(category => (
                                        <li 
                                          key={category.id}
                                          className="text-sm py-1 px-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 flex justify-between items-center"
                                        >
                                          <span className="font-medium text-gray-700 dark:text-gray-300">
                                            {category.name}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {category.products?.length || 0} products
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic py-1">
                                      No categories assigned to this locator
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-gray-500 dark:text-gray-400 italic">
                        No locators in this sub-inventory
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Locators;
