import React, { useState, useEffect } from 'react';
import { fetchWithAuth, fetchOrganizationEndpoint } from '../../../utils/api';

const Organization = () => {
  // Existing state variables
  const [organization, setOrganization] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSubInventoryForm, setShowSubInventoryForm] = useState(false);
  const [showLocatorForm, setShowLocatorForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSubInv, setSelectedSubInv] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    legal_address: '',
    gst_number: '',
    vat_number: '',
    cin: '',
    pan_number: '',
    start_date: '',
    attachment: null
  });

  const [subInventoryData, setSubInventoryData] = useState({
    name: '',
    type: 'raw' // default type
  });

  const [locatorData, setLocatorData] = useState({
    code: '',
    description: '',
    length: '',
    width: '',
    height: ''
  });

  // New state variables for editing
  const [editingSubInv, setEditingSubInv] = useState(null);
  const [editingLocator, setEditingLocator] = useState(null);
  const [editSubInvData, setEditSubInvData] = useState({ name: '', type: 'raw' });
  const [editLocatorData, setEditLocatorData] = useState({
    code: '',
    description: '',
    length: '',
    width: '',
    height: ''
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/organization');
      console.log('Fetched organization data:', data);
      
      // Only take the first organization or set to null if none exists
      setOrganization(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error fetching organization:', error);
      alert('Failed to fetch organization data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      setFormData({
        ...formData,
        attachment: file
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      
      // Required field validation
      if (!formData.name?.trim()) {
        throw new Error('Organization name is required');
      }
      
      // Append form fields to FormData
      Object.keys(formData).forEach(field => {
        const value = formData[field];
        if (field === 'name' || value) {
          if (field === 'attachment' && value instanceof File) {
            formDataToSend.append(field, value);
          } else if (typeof value === 'string') {
            formDataToSend.append(field, value.trim());
          } else if (value) {
            formDataToSend.append(field, value);
          }
        }
      });

      const response = await fetchWithAuth('/organization/', {
        method: 'POST',
        body: formDataToSend
      });

      if (!response) {
        throw new Error('Failed to create organization');
      }

      // Show success message to user
      alert('Organization updated successfully!');
      
      // First close the form
      setShowForm(false);
      
      // Then implement a small delay before fetching to ensure backend has processed the update
      setTimeout(() => {
        fetchOrganization();
      }, 500);
      
      // Clear form data
      setFormData({
        name: '',
        legal_address: '',
        gst_number: '',
        vat_number: '',
        cin: '',
        pan_number: '',
        start_date: '',
        attachment: null
      });
      setUploadedFileName('');
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSubInventorySubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`/organization/${organization.id}/sub-inventory`, {
        method: 'POST',
        body: JSON.stringify(subInventoryData)
      });
      setShowSubInventoryForm(false);
      fetchOrganization();
      setSubInventoryData({ name: '', type: 'raw' });
    } catch (error) {
      console.error('Error creating sub-inventory:', error);
      alert('Failed to create sub-inventory');
    }
  };

  const handleLocatorSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`/organization/${organization.id}/sub-inventory/${selectedSubInv.id}/locator`, {
        method: 'POST',
        body: JSON.stringify(locatorData)
      });
      setShowLocatorForm(false);
      fetchOrganization();
      setLocatorData({ code: '', description: '', length: '', width: '', height: '' });
    } catch (error) {
      console.error('Error creating locator:', error);
      alert('Failed to create locator');
    }
  };

  const viewAttachment = async () => {
    if (organization?.attachment_path) {
      try {
        // Use direct fetch with auth header for binary data
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        
        // Create URL with organization ID
        const url = `http://localhost:8000/organization/${organization.id}/attachment`;
        console.log("Fetching attachment from:", url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`Failed to fetch document: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error("Empty document received from server");
        }
        
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Open in new tab
        const newTab = window.open();
        if (newTab) {
          newTab.location.href = blobUrl;
          // Clean up the URL after the new tab has loaded it
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } else {
          // If popup blocked, provide direct link
          alert('Popup blocked. Please enable popups or use the link manually.');
          URL.revokeObjectURL(blobUrl);
        }
      } catch (error) {
        console.error('Error viewing attachment:', error);
        
        // More descriptive error message for the user
        if (error.message.includes('404')) {
          alert('Document not found. The file may have been moved or deleted. Please try re-uploading the document.');
        } else {
          alert('Failed to view document: ' + error.message);
        }
      }
    } else {
      alert('No attachment available for this organization. Please upload a document first.');
    }
  };

  // Use state for document preview
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState(false);
  const [documentType, setDocumentType] = useState(null);

  // Fetch document for preview when organization changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchDocumentForPreview = async () => {
      if (!organization?.id || !organization?.attachment_path) {
        if (documentPreviewUrl) {
          URL.revokeObjectURL(documentPreviewUrl);
          setDocumentPreviewUrl(null);
        }
        return;
      }
      
      // Clear previous blob URL to prevent memory leaks
      if (documentPreviewUrl) {
        URL.revokeObjectURL(documentPreviewUrl);
        setDocumentPreviewUrl(null);
      }
      
      try {
        setDocumentLoading(true);
        setDocumentError(false);
        
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        
        // Create URL with organization ID
        const url = `http://localhost:8000/organization/${organization.id}/attachment`;
        console.log("Fetching document preview from:", url);
        
        // Add a cache-busting parameter to prevent browser caching
        const cacheBuster = `?t=${new Date().getTime()}`;
        const finalUrl = url + cacheBuster;
        
        const response = await fetch(finalUrl, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch document: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch document: ${response.status}`);
        }
        
        // Get content type to determine how to handle the document
        const contentType = response.headers.get('content-type');
        console.log("Document content type:", contentType);
        
        const blob = await response.blob();
        console.log("Blob size:", blob.size, "bytes");
        
        if (blob.size === 0) {
          throw new Error("Empty document received from server");
        }
        
        if (isMounted) {
          setDocumentType(contentType);
          const blobUrl = URL.createObjectURL(blob);
          console.log("Created blob URL:", blobUrl);
          setDocumentPreviewUrl(blobUrl);
        }
      } catch (error) {
        console.error('Error fetching document preview:', error);
        if (isMounted) {
          setDocumentError(true);
        }
      } finally {
        if (isMounted) {
          setDocumentLoading(false);
        }
      }
    };
    
    fetchDocumentForPreview();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (documentPreviewUrl) {
        URL.revokeObjectURL(documentPreviewUrl);
      }
    };
  }, [organization?.id, organization?.attachment_path]); // Removed documentPreviewUrl from dependencies

  // Add this effect to populate form when editing
  useEffect(() => {
    if (organization && showForm) {
      setFormData({
        name: organization.name || '',
        legal_address: organization.legal_address || '',
        gst_number: organization.gst_number || '',
        vat_number: organization.vat_number || '',
        cin: organization.cin || '',
        pan_number: organization.pan_number || '',
        start_date: organization.start_date ? new Date(organization.start_date).toISOString().split('T')[0] : '',
        attachment: null
      });
    }
  }, [organization, showForm]);

  // New function to handle editing a sub-inventory
  const handleEditSubInventory = (subInv) => {
    setEditingSubInv(subInv);
    setEditSubInvData({
      name: subInv.name,
      type: subInv.type
    });
  };

  // New function to save sub-inventory changes
  const saveSubInventoryChanges = async () => {
    try {
      if (!editingSubInv) return;
      
      await fetchOrganizationEndpoint(`/organization/${organization.id}/sub-inventory/${editingSubInv.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editSubInvData)
      });

      setEditingSubInv(null);
      fetchOrganization();
    } catch (error) {
      console.error('Error updating sub-inventory:', error);
      alert('Failed to update sub-inventory');
    }
  };

  // New function to delete a sub-inventory
  const deleteSubInventory = async (subInvId) => {
    if (!window.confirm('Are you sure you want to delete this sub-inventory? This will also delete all locators inside it and cancel any pending stock transfers.')) {
      return;
    }

    try {
      setLoading(true); // Show loading indicator
      
      console.log(`Deleting sub-inventory ${subInvId}...`);
      const response = await fetchOrganizationEndpoint(`/organization/${organization.id}/sub-inventory/${subInvId}`, {
        method: 'DELETE'
      });

      console.log('Delete response:', response);
      alert('Sub-inventory deleted successfully.');
      
      // If successful, refresh the organization data
      fetchOrganization();
    } catch (error) {
      console.error('Error deleting sub-inventory:', error);
      
      // Show more specific error messages based on the error type
      if (typeof error.message === 'string') {
        if (error.message.toLowerCase().includes('foreign key constraint') || 
            error.message.toLowerCase().includes('referenced')) {
          alert('Cannot delete this sub-inventory because it is being referenced by stock transfers or products. Please make sure no active stock transfers are using locators in this sub-inventory.');
        } else if (error.message.toLowerCase().includes('category')) {
          alert('This sub-inventory has categories associated with it. They have been automatically updated.');
          // Try again - the backend should have fixed the category associations
          try {
            await fetchOrganizationEndpoint(`/organization/${organization.id}/sub-inventory/${subInvId}`, {
              method: 'DELETE'
            });
            alert('Sub-inventory deleted successfully after updating categories.');
            fetchOrganization();
            return;
          } catch (retryError) {
            console.error('Error on retry:', retryError);
          }
        } else {
          alert(`Failed to delete sub-inventory: ${error.message}`);
        }
      } else {
        alert('Failed to delete sub-inventory. Check the console for more details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // New function to handle editing a locator
  const handleEditLocator = (locator) => {
    setEditingLocator(locator);
    setEditLocatorData({
      code: locator.code,
      description: locator.description || '',
      length: locator.length || '',
      width: locator.width || '',
      height: locator.height || ''
    });
  };

  // New function to save locator changes
  const saveLocatorChanges = async () => {
    try {
      if (!editingLocator) return;
      
      await fetchOrganizationEndpoint(`/organization/${organization.id}/sub-inventory/${editingLocator.sub_inventory_id}/locator/${editingLocator.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editLocatorData)
      });

      setEditingLocator(null);
      fetchOrganization();
    } catch (error) {
      console.error('Error updating locator:', error);
      alert('Failed to update locator');
    }
  };

  // New function to delete a locator
  const deleteLocator = async (locator) => {
    if (!window.confirm('Are you sure you want to delete this locator?')) {
      return;
    }

    try {
      await fetchOrganizationEndpoint(`/organization/${organization.id}/sub-inventory/${locator.sub_inventory_id}/locator/${locator.id}`, {
        method: 'DELETE'
      });

      fetchOrganization();
    } catch (error) {
      console.error('Error deleting locator:', error);
      alert('Failed to delete locator');
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">
            Organization Management
          </h2>
          {!organization && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-black px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Set Up Organization
            </button>
          )}
        </div>

        {/* Organization Display */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : organization ? (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{organization.name}</h2>
                <p className="text-gray-600 dark:text-gray-300">{organization.legal_address}</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  // Pre-populate form with current organization data
                  if (organization) {
                    setFormData({
                      name: organization.name || '',
                      legal_address: organization.legal_address || '',
                      gst_number: organization.gst_number || '',
                      vat_number: organization.vat_number || '',
                      cin: organization.cin || '',
                      pan_number: organization.pan_number || '',
                      start_date: organization.start_date ? new Date(organization.start_date).toISOString().split('T')[0] : '',
                      attachment: null
                    });
                  }
                }}
                className="bg-blue-600 text-black px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
              >
                <i className="fas fa-edit mr-1"></i>Edit
              </button>
            </div>

            {/* Organization Details in Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300">GST Number</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{organization.gst_number || 'N/A'}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300">PAN Number</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{organization.pan_number || 'N/A'}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300">CIN</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{organization.cin || 'N/A'}</p>
              </div>
            </div>

            {/* File attachment section */}
            {organization.attachment_path && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded">
                      <i className="fas fa-file-alt text-blue-600 dark:text-blue-300 text-xl"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Organization Document</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {organization.attachment_path.split('/').pop().split('\\').pop()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={viewAttachment}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline text-sm flex items-center"
                  >
                    <i className="fas fa-eye mr-1"></i>View
                  </button>
                </div>
                
                {/* Document preview */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden h-64 mt-2">
                  {documentLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Loading document preview...</p>
                      </div>
                    </div>
                  ) : documentError ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <div className="text-center">
                        <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-2"></i>
                        <p className="text-gray-500 dark:text-gray-400">Unable to preview document</p>
                        <button 
                          onClick={viewAttachment}
                          className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Open in new tab
                        </button>
                      </div>
                    </div>
                  ) : documentPreviewUrl ? (
                    documentType && documentType.includes('image/') ? (
                      <img 
                        src={documentPreviewUrl} 
                        className="w-full h-full object-contain"
                        alt="Document Preview" 
                      />
                    ) : (
                      <object
                        data={documentPreviewUrl}
                        type={documentType || 'application/pdf'}
                        className="w-full h-full"
                        title="Document Preview"
                      >
                        <iframe
                          src={documentPreviewUrl}
                          className="w-full h-full"
                          title="Document Preview"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </object>
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <div className="text-center">
                        <i className="fas fa-file text-3xl text-gray-400 mb-2"></i>
                        <p className="text-gray-500 dark:text-gray-400">No document preview available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-inventories Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Sub-inventories</h3>
                <button
                  onClick={() => setShowSubInventoryForm(true)}
                  className="bg-green-600 text-black px-3 py-1 rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <i className="fas fa-plus mr-1"></i>Add Sub-inventory
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organization.sub_inventories?.length > 0 ? (
                  organization.sub_inventories.map(subInv => (
                    <div key={subInv.id} className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                      {editingSubInv?.id === subInv.id ? (
                        /* Edit Sub-inventory Form */
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editSubInvData.name}
                              onChange={(e) => setEditSubInvData({...editSubInvData, name: e.target.value})}
                              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Type
                            </label>
                            <select
                              value={editSubInvData.type}
                              onChange={(e) => setEditSubInvData({...editSubInvData, type: e.target.value})}
                              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                            >
                              <option value="raw">Raw</option>
                              <option value="finished">Finished</option>
                              <option value="wip">Work in Progress</option>
                            </select>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingSubInv(null)}
                              className="px-3 py-1 border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveSubInventoryChanges}
                              className="px-3 py-1 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Sub-inventory Display */
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {subInv.name}
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-800 dark:text-blue-300">
                                {subInv.type}
                              </span>
                            </h4>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditSubInventory(subInv)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                title="Edit Sub-inventory"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSubInv(subInv);
                                  setShowLocatorForm(true);
                                }}
                                className="text-green-600 hover:text-green-800 dark:text-green-400"
                                title="Add Locator"
                              >
                                <i className="fas fa-plus-circle"></i>
                              </button>
                              <button
                                onClick={() => deleteSubInventory(subInv.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400"
                                title="Delete Sub-inventory"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>

                          {/* Locators */}
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Locators:</h5>
                            {subInv.locators?.length > 0 ? (
                              <div className="space-y-2">
                                {subInv.locators.map(locator => (
                                  <div key={locator.id}>
                                    {editingLocator?.id === locator.id ? (
                                      /* Edit Locator Form */
                                      <div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 space-y-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Code
                                          </label>
                                          <input
                                            type="text"
                                            value={editLocatorData.code}
                                            onChange={(e) => setEditLocatorData({...editLocatorData, code: e.target.value})}
                                            className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description
                                          </label>
                                          <input
                                            type="text"
                                            value={editLocatorData.description}
                                            onChange={(e) => setEditLocatorData({...editLocatorData, description: e.target.value})}
                                            className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                          />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                              Length
                                            </label>
                                            <input
                                              type="number"
                                              value={editLocatorData.length}
                                              onChange={(e) => setEditLocatorData({...editLocatorData, length: e.target.value})}
                                              className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                              Width
                                            </label>
                                            <input
                                              type="number"
                                              value={editLocatorData.width}
                                              onChange={(e) => setEditLocatorData({...editLocatorData, width: e.target.value})}
                                              className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                              Height
                                            </label>
                                            <input
                                              type="number"
                                              value={editLocatorData.height}
                                              onChange={(e) => setEditLocatorData({...editLocatorData, height: e.target.value})}
                                              className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end space-x-2 mt-2">
                                          <button
                                            onClick={() => setEditingLocator(null)}
                                            className="px-2 py-1 border border-gray-300 text-sm rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={saveLocatorChanges}
                                            className="px-2 py-1 bg-blue-600 text-black text-sm rounded hover:bg-blue-700"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Locator Display */
                                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-600 rounded">
                                        <div>
                                          <span className="font-medium text-gray-800 dark:text-gray-200">{locator.code}</span>
                                          {locator.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{locator.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {locator.length && locator.width && locator.height
                                              ? `${locator.length}×${locator.width}×${locator.height}`
                                              : 'No dimensions'}
                                          </div>
                                          <button
                                            onClick={() => handleEditLocator(locator)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 ml-2"
                                            title="Edit Locator"
                                          >
                                            <i className="fas fa-edit"></i>
                                          </button>
                                          <button
                                            onClick={() => deleteLocator(locator)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                                            title="Delete Locator"
                                          >
                                            <i className="fas fa-trash"></i>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No locators defined</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-gray-400">No sub-inventories created yet.</p>
                    <button
                      onClick={() => setShowSubInventoryForm(true)}
                      className="mt-2 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Add your first sub-inventory
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 p-10 rounded-lg text-center">
            <i className="fas fa-building text-5xl text-gray-300 dark:text-gray-500 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Organization Set Up</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You need to set up your organization details to start using the inventory management system.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              <i className="fas fa-plus-circle mr-2"></i>
              Set Up Your Organization
            </button>
          </div>
        )}

        {/* Organization Form Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-4">
                <h3 className="text-xl font-semibold dark:text-white">
                  {organization ? 'Edit Organization' : 'New Organization'} 
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Organization name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  {/* PAN Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({...formData, pan_number: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  {/* VAT Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  {/* CIN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CIN
                    </label>
                    <input
                      type="text"
                      value={formData.cin}
                      onChange={(e) => setFormData({...formData, cin: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      min="1900-01-01" 
                      max="2099-12-31"
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* Legal Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Legal Address
                  </label>
                  <textarea
                    value={formData.legal_address}
                    onChange={(e) => setFormData({...formData, legal_address: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    rows="2"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Upload Documents
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      {!uploadedFileName ? (
                        <>
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <i className="fas fa-file-upload text-3xl"></i>
                          </div>
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 focus-within:outline-none">
                              <span>Upload a file</span>
                              <input 
                                id="file-upload" 
                                name="file-upload" 
                                type="file" 
                                className="sr-only"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PDF, DOC, DOCX, PNG, JPG up to 10MB
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                          <div className="flex items-center">
                            <i className="fas fa-file-alt text-blue-500 dark:text-blue-400 mr-3"></i>
                            <span className="text-sm font-medium">{uploadedFileName}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData({...formData, attachment: null});
                              setUploadedFileName('');
                            }}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {organization ? 'Update' : 'Create'} Organization
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sub-inventory Form Modal */}
        {showSubInventoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">New Sub-inventory</h3>
              <form onSubmit={handleSubInventorySubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Sub-inventory Name"
                  value={subInventoryData.name}
                  onChange={(e) => setSubInventoryData({...subInventoryData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <select
                  value={subInventoryData.type}
                  onChange={(e) => setSubInventoryData({...subInventoryData, type: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="raw">Raw</option>
                  <option value="finished">Finished</option>
                  <option value="wip">Work in Progress</option>
                </select>
                <div className="flex justify-end space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowSubInventoryForm(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Locator Form Modal */}
        {showLocatorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                New Locator for {selectedSubInv?.name}
              </h3>
              <form onSubmit={handleLocatorSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Locator Code"
                  value={locatorData.code}
                  onChange={(e) => setLocatorData({...locatorData, code: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={locatorData.description}
                  onChange={(e) => setLocatorData({...locatorData, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  rows="2"
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Length"
                    value={locatorData.length}
                    onChange={(e) => setLocatorData({...locatorData, length: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="number"
                    placeholder="Width"
                    value={locatorData.width}
                    onChange={(e) => setLocatorData({...locatorData, width: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="number"
                    placeholder="Height"
                    value={locatorData.height}
                    onChange={(e) => setLocatorData({...locatorData, height: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowLocatorForm(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Organization;
