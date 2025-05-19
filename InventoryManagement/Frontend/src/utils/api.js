const BASE_URL = 'http://localhost:8000';

export const getAuthHeaders = () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    return {
        'Content-Type': 'application/json',
        'Authorization': tokens.access_token ? `Bearer ${tokens.access_token}` : '',
        'Accept': 'application/json'
    };
};

export const fetchWithAuth = async (endpoint, options = {}) => {
    try {
        const url = `${BASE_URL}${endpoint}`;
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        
        if (!tokens.access_token) {
            console.warn('No access token found for request to:', url);
        }
        
        // Don't set Content-Type for FormData
        const headers = options.body instanceof FormData 
            ? { 'Authorization': tokens.access_token ? `Bearer ${tokens.access_token}` : '' }
            : {
                'Content-Type': 'application/json',
                'Authorization': tokens.access_token ? `Bearer ${tokens.access_token}` : '',
                'Accept': options.responseType === 'blob' ? '*/*' : 'application/json'
                // Removed explicit Origin header as it's automatically set by the browser
            };

        console.log(`Making ${options.method || 'GET'} request to ${url}`);
        
        // Modified request to ensure CORS works properly
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            },
            mode: 'cors',  // Explicit CORS mode
            credentials: 'include'  // Include cookies
        });

        console.log(`Response from ${url}: status=${response.status}, ok=${response.ok}`);

        // Handle auth errors
        if (response.status === 401) {
            console.error('Authentication error (401) - redirecting to login');
            localStorage.removeItem('tokens');
            localStorage.removeItem('user');
            window.location.href = '/';
            throw new Error('Authentication required');
        }

        // Handle other errors
        if (!response.ok) {
            const responseText = await response.text();
            try {
                // Try to parse as JSON first
                const error = JSON.parse(responseText);
                const errorMsg = error.message || error.detail || error.error || JSON.stringify(error);
                throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
            } catch (e) {
                // If parsing fails or other error
                if (responseText) {
                    throw new Error('Server error: ' + responseText);
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
        }

        // Handle no content responses
        if (response.status === 204) {
            return null;
        }

        // Handle different response types
        if (options.responseType === 'blob') {
            return await response.blob();
        } else if (options.responseType === 'text') {
            return await response.text();
        } else {
            // Default to JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        }
    } catch (error) {
        console.error(`Error in fetchWithAuth for ${endpoint}:`, error);
        
        // Better error handling
        if (error instanceof Error) {
            try {
                // If it's a JSON string in the message, parse it
                if (error.message.startsWith('{') && error.message.endsWith('}')) {
                    const errorObj = JSON.parse(error.message);
                    const errorMsg = errorObj.message || errorObj.detail || errorObj.error || JSON.stringify(errorObj);
                    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
                } else {
                    throw error; // Just rethrow if it's not JSON
                }
            } catch (e) {
                if (e !== error) {
                    throw new Error('An error occurred while processing the request: ' + String(error));
                } else {
                    throw error; // Rethrow the original error
                }
            }
        } else {
            throw new Error(String(error)); // Ensure string conversion for primitives
        }
    }
};

/**
 * Specialized function for organization operations with better CORS handling
 * @param {string} path - Full path including organization ID
 * @param {object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const fetchOrganizationEndpoint = async (path, options = {}) => {
  // For organization endpoints, we'll use a more direct approach
  try {
    console.log(`Making organization request to: ${path}`);
    
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    const url = `${BASE_URL}${path}`;
    
    // Don't set Content-Type for FormData
    const headers = options.body instanceof FormData 
      ? { 'Authorization': tokens?.access_token ? `Bearer ${tokens.access_token}` : '' }
      : {
          'Content-Type': 'application/json',
          'Authorization': tokens?.access_token ? `Bearer ${tokens.access_token}` : '',
          'Accept': 'application/json',
        };
    
    // For DELETE requests, simplify the request to avoid CORS issues
    if (options.method === 'DELETE') {
      console.log('Making DELETE request with simplified CORS handling');
      const fetchOptions = {
        method: 'DELETE',
        headers: {
          'Authorization': tokens?.access_token ? `Bearer ${tokens.access_token}` : '',
        },
        mode: 'cors',
        credentials: 'same-origin' // Changed from 'include' to avoid additional CORS complexity
      };
      
      const response = await fetch(url, fetchOptions);
      if (response.status === 204 || response.ok) {
        return { success: true };
      }
      throw new Error(`Failed to delete: ${response.status}`);
    }
    
    // For non-DELETE operations, proceed with standard approach
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      },
      mode: 'cors',
      credentials: 'same-origin' // More consistent with browser behavior
    });
    
    if (response.status === 204) {
      return { success: true };
    }
    
    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        if (responseText) {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || 
                        (errorData.message ? errorData.message : 
                        JSON.stringify(errorData)) || 
                        errorMessage;
        }
      } catch (e) {
        console.log('Could not parse error response as JSON:', responseText);
        errorMessage = responseText || errorMessage;
      }
      console.error(`Organization API error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    try {
      return await response.json();
    } catch (error) {
      console.warn('Response is not JSON, returning success object');
      return { success: true };
    }
  } catch (error) {
    console.error(`Organization API Error:`, error);
    // Convert error object to string if it's not already
    if (typeof error === 'object') {
      // If it's an Error instance, use its message
      if (error instanceof Error) {
        throw error;
      } else {
        // For other objects, stringify them
        try {
          throw new Error(JSON.stringify(error));
        } catch (e) {
          // In case the object can't be stringified
          throw new Error('An error occurred while processing the organization request');
        }
      }
    }
    throw error;
  }
}
