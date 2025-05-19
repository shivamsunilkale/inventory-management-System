import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../utils/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await fetchWithAuth('/users');
      console.log('Fetched users data:', data); // Debug log
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (privileges) => {
    // Convert privileges to number to ensure proper comparison
    const privNumber = Number(privileges);
    console.log('Getting role for privileges:', privNumber, typeof privNumber);
    
    switch (privNumber) {
      case 1: return { text: 'Inventory Manager', color: 'text-gray-600', badge: 'bg-gray-100' };
      case 2: return { text: 'Stock Keeper', color: 'text-blue-600', badge: 'bg-blue-100' };
      case 3: return { text: 'Admin', color: 'text-purple-600', badge: 'bg-purple-100' };
      default: return { text: 'Unknown', color: 'text-gray-400', badge: 'bg-gray-100' };
    }
  };

  const getRolePrivilege = (role) => {
    switch (role) {
      case 'worker': return 1;
      case 'stockkeeper': return 2;
      case 'admin': return 3;
      default: return null;
    }
  };

  const filteredUsers = users.filter(user => {
    if (activeTab === 'all') return true;
    // Convert both to numbers for proper comparison
    return Number(user.privileges) === getRolePrivilege(activeTab);
  });

  const tabs = [
    { id: 'all', label: 'All Users' },
    { id: 'admin', label: 'Admins' },
    { id: 'stockkeeper', label: 'Stock Keepers' },
    { id: 'worker', label: 'Inventory Manager' }
  ];

  return (
    <div className="min-h-screen w-full p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">Users Management</h2>
        </div>

        <div className="flex space-x-4 mb-6  dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="ml-2 text-sm text-gray-400">
                ({tab.id === 'all' 
                  ? users.length 
                  : users.filter(user => Number(user.privileges) === getRolePrivilege(tab.id)).length})
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found in this category
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = getRoleText(user.privileges);
                  console.log(`User ${user.username} has role:`, role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full ${role.badge} flex items-center justify-center ${role.color} font-semibold`}>
                            {user.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username || 'Unknown User'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-sm rounded-full ${role.badge} ${role.color}`}>
                          {role.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
