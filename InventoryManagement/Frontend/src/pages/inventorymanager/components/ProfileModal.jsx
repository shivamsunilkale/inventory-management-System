import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const ProfileModal = ({ onClose }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetchWithAuth('/users/me');
      if (response) {
        console.log("Fetched inventory manager user data:", response);
        setUserData(response);
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(response));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to stored user data if fetch fails
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        setUserData(storedUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Form validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetchWithAuth('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });
      
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!userData) return null;
  
  const getRoleName = (privileges) => {
    switch (Number(privileges)) { // Ensure privileges is treated as a number
      case 1: return 'Inventory Manager';
      case 2: return 'Stock Keeper';
      case 3: return 'Administrator';
      default: return 'Unknown';
    }
  };

  const roleColor = () => {
    switch (Number(userData?.privileges)) {
      case 1: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; // Inventory Manager
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'; // Stock Keeper
      case 3: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'; // Admin
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-0 w-[90%] max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
        
        {/* Header with avatar and name */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 p-8 flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-green-700 text-4xl font-bold shadow-lg ring-4 ring-white">
            {userData?.username?.[0]?.toUpperCase()}
          </div>
          <div className="text-white">
            <h3 className="text-2xl font-bold">{userData?.username}</h3>
            <span className={`px-3 py-1 mt-2 inline-block rounded-full text-sm ${roleColor()}`}>
              {getRoleName(userData?.privileges)}
            </span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'profile'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'password'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Change Password
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Username</h4>
                    <p className="text-lg font-medium dark:text-white">{userData?.username}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</h4>
                    <p className="text-lg font-medium dark:text-white overflow-hidden text-ellipsis">{userData?.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Role</h4>
                    <p className="text-lg font-medium dark:text-white">
                      <span className={`px-2 py-1 rounded-full text-sm ${roleColor()}`}>
                        {getRoleName(userData?.privileges)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Responsibilities</h4>
                    <p className="text-lg font-medium dark:text-white">
                      Inventory Management and Stock Control
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Account Activity</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium dark:text-white">Last Login</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                    </div>
                    <i className="fas fa-sign-in-alt text-green-500"></i>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium dark:text-white">Recent Activity</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Stock monitoring
                      </p>
                    </div>
                    <i className="fas fa-chart-line text-green-500"></i>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Change Your Password</h4>
              
              {passwordError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border-l-4 border-red-600 rounded">
                  <p className="flex items-center">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {passwordError}
                  </p>
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 border-l-4 border-green-600 rounded">
                  <p className="flex items-center">
                    <i className="fas fa-check-circle mr-2"></i>
                    {passwordSuccess}
                  </p>
                </div>
              )}
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700 text-black py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-200 border-t-transparent mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p className="flex items-center">
                  <i className="fas fa-lock mr-2"></i>
                  Password must be at least 6 characters long
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
