import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { logout } from '../../../utils/auth';
import { useTheme } from '../../../context/ThemeContext';
import { fetchWithAuth } from '../../../utils/api';

const Sidebar = ({ isOpen, onProfileClick }) => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetchWithAuth('/users/me');
        setUserData(response);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const menuItems = [
    { title: 'Dashboard', path: '/stockkeeper/dashboard', icon: 'chart-pie' },
    { title: 'Inventory', path: '/stockkeeper/inventory', icon: 'box' },
    { title: 'Categories', path: '/stockkeeper/categories', icon: 'tags' },
    { title: 'Orders', path: '/stockkeeper/orders', icon: 'shopping-cart' },
    { title: 'Customers', path: '/stockkeeper/customers', icon: 'users' },
    { title: 'Stock Transfer', path: '/stockkeeper/stock-transfer', icon: 'exchange-alt' },
  ];

  return (
    <aside 
      className={`${isOpen ? 'w-64' : 'w-20'} 
        transition-all duration-300 
        ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'} 
        border-r border-gray-200 dark:border-gray-700 
        shadow-lg`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center justify-center h-20 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <span className={`${!isOpen && 'hidden'} text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Stock Management
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => (
              <li key={item.path}>
                <a
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`flex items-center space-x-2 p-2 rounded-lg
                    ${location.pathname === item.path 
                      ? (darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600') 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <i className={`fas fa-${item.icon} ${location.pathname === item.path ? 'text-blue-500' : ''}`}></i>
                  <span className={`${!isOpen && 'hidden'}`}>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profile & Logout */}
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
          <div 
            onClick={onProfileClick}
            className={`flex items-center space-x-3 ${!isOpen && 'justify-center'} 
              cursor-pointer p-2 rounded-lg 
              hover:bg-gray-100 dark:hover:bg-gray-800`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <span className="text-xl">{userData?.username?.[0]?.toUpperCase()}</span>
            </div>
            {isOpen && userData && (
              <div className="flex-1">
                <h3 className="text-sm font-semibold dark:text-white">{userData.username}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stock Keeper</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`mt-4 w-full flex items-center justify-center space-x-2 p-2 rounded-lg
              text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-800`}
          >
            <i className="fas fa-sign-out-alt"></i>
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
