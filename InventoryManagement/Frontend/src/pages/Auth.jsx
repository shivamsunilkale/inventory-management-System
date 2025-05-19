import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logAuthAttempt, inspectLocalStorage } from '../utils/debugAuth';

const Auth = () => {
  // 'stockkeeper', 'admin', or 'inventorymanager' - mapped to your existing rolePanel
  const [rolePanel, setRolePanel] = useState('stockkeeper');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelpText, setShowHelpText] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // Added remember me option
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    logAuthAttempt('login-start', { email, rolePanel });
    
    try {
      // Check server status first
      try {
        const serverCheck = await fetch('http://localhost:8000/');
        console.log('Server status check:', serverCheck.status, serverCheck.ok);
      } catch (e) {
        console.error('Server may be down or unreachable:', e);
      }
      
      // Prepare login data - keeping your existing logic
      const loginData = {
        email: email.trim(),
        password: password,
        isAdmin: rolePanel === 'admin'
      };
      
      console.log('Request payload:', JSON.stringify(loginData));
      
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });

      logAuthAttempt('response-received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      // Handle errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        let errorDetail = 'Login failed';
        try {
          const errorData = JSON.parse(errorText);
          errorDetail = errorData.detail || `Login failed with status ${response.status}`;
        } catch (e) {
          errorDetail = `Server error (${response.status}): ${errorText || response.statusText}`;
          console.error('Error parsing error response as JSON:', e);
        }
        throw new Error(errorDetail);
      }

      // Parse response data - keeping your existing approach
      let data;
      try {
        data = await response.json();
        console.log('Login successful, parsed data:', data);
      } catch (e) {
        console.error('JSON parse error, trying text fallback:', e);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!responseText.trim()) {
          throw new Error('Empty response from server');
        }
        
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Failed to parse response as JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }
      }

      // Validate data
      if (!data) {
        throw new Error('Empty response data');
      }
      
      // Get user data and tokens
      const userData = data.user || {};
      const tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token
      };
      
      // Get privileges and verify user role
      const privileges = Number(userData.privileges || 0);
      
      // Validate user is using the correct login panel
      const isCorrectPanel = (
        (rolePanel === 'admin' && privileges === 3) ||
        (rolePanel === 'stockkeeper' && privileges === 2) || 
        (rolePanel === 'inventorymanager' && privileges === 1)
      );
      
      if (!isCorrectPanel) {
        // Role and panel mismatch
        if (privileges === 3) {
          throw new Error('Admin users must log in through the Admin panel');
        } else if (privileges === 2) {
          throw new Error('Stock keepers must log in through the Stock Keeper panel');
        } else if (privileges === 1) {
          throw new Error('Inventory managers must log in through the Inventory Manager panel');
        } else {
          throw new Error('Invalid role. Please contact system administrator.');
        }
      }
      
      // Store authentication data
      if (tokens.access_token) {
        localStorage.setItem('tokens', JSON.stringify(tokens));
        
        if (Object.keys(userData).length > 0) {
          localStorage.setItem('user', JSON.stringify(userData));
          logAuthAttempt('auth-successful', { privileges });
          inspectLocalStorage();
          
          // Redirect based on role
          setTimeout(() => {
            if (privileges === 3) {
              navigate('/admin/dashboard');
            } else if (privileges === 2) {
              navigate('/stockkeeper/dashboard');
            } else {
              navigate('/inventorymanager/dashboard');
            }
          }, 100);
        } else {
          throw new Error('User data missing in response');
        }
      } else {
        throw new Error('Authentication tokens missing in response');
      }

    } catch (error) {
      console.error('Login process failed:', error);
      setError(error.message || 'Failed to login. Please try again.');
      logAuthAttempt('auth-failed', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get the title based on user type
  const getPanelTitle = () => {
    switch (rolePanel) {
      case 'admin': return 'Admin Login';
      case 'stockkeeper': return 'Stock Keeper Login';
      case 'inventorymanager': return 'Inventory Manager Login';
      default: return 'User Login';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 py-10 px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {getPanelTitle()}
        </h2>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 border rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
              >
                {passwordVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                    <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            {/* <div className="text-sm">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </div> */}
          </div>

          <button
            type="submit" 
            disabled={isLoading || !email || !password}
            className={`w-full py-2.5 rounded-lg transition-colors font-semibold text-black
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* User Type Selection */}
        <div className="mt-8 border-t pt-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">Log in as:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => setRolePanel('stockkeeper')} 
              className={`px-4 py-2 rounded-lg transition-all ${
                rolePanel === 'stockkeeper' 
                  ? 'bg-blue-600 text-black font-medium shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stock Keeper
            </button>
            <button 
              onClick={() => setRolePanel('inventorymanager')} 
              className={`px-4 py-2 rounded-lg transition-all ${
                rolePanel === 'inventorymanager' 
                  ? 'bg-blue-600 text-black font-medium shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inventory Manager
            </button>
            <button 
              onClick={() => setRolePanel('admin')} 
              className={`px-4 py-2 rounded-lg transition-all ${
                rolePanel === 'admin' 
                  ? 'bg-blue-600 text-black font-medium shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Help text explaining user types */}
        <div className="mt-4 text-center">
          <button 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setShowHelpText(!showHelpText)}
          >
            {showHelpText ? 'Hide help' : 'Which login should I use?'}
          </button>
          
          {showHelpText && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm text-left">
              <p className="font-medium mb-1">Please log in with the correct user type:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><span className="font-medium">Stock Keeper:</span> For warehouse staff managing physical inventory</li>
                <li><span className="font-medium">Inventory Manager:</span> For managers overseeing inventory operations</li>
                <li><span className="font-medium">Admin:</span> For system administrators with full access</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between mt-8 text-sm">
          <div>
            <span className="text-gray-600">New here? </span>
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
            >
              Create an Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
