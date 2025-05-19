import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const AuthForm = ({ isAdmin = false, onSubmit, loading = false, error = null }) => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password, isAdmin });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 w-full max-w-md">
      <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">
        {isAdmin ? 'Admin Login' : 'User Login'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div className="relative">
          <input
            type={passwordVisible ? 'text' : 'password'}
            placeholder="Password"
            className="w-full px-4 py-2 border rounded-md pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
          >
            {passwordVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
              </svg>
            )}
          </div>
        </div>
        
        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-md transition-colors
            ${loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-black'}`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="flex justify-between mt-6 text-sm">
        <button onClick={() => navigate(isAdmin ? '/' : '/admin')} className="text-blue-500 hover:underline dark:text-blue-400">
          Switch to {isAdmin ? 'User' : 'Admin'} Login
        </button>
        <button onClick={() => navigate('/forgot-password')} className="text-gray-500 hover:underline dark:text-gray-400">
          Forgot Password?
        </button>
      </div>

      <div className="text-center mt-6 text-sm">
        <span className="dark:text-gray-300">New here? </span>
        <button
          onClick={() => navigate('/register')}
          className="text-green-600 hover:underline font-medium dark:text-green-500"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
