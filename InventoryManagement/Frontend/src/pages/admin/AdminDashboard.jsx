import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Orders from './components/Orders';
import ProfileModal from './components/ProfileModal';
import Categories from './components/Categories';
import Reports from './components/Reports';
import Organization from './components/Organization';
import Users from './components/Users';
import Locators from './components/Locators'; // Import the new component
import { useTheme } from '../../context/ThemeContext';
import { fetchWithAuth } from '../../utils/api';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Fetch user data for personalized dashboard
    const fetchUserData = async () => {
      try {
        const data = await fetchWithAuth('/users/me');
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <Sidebar isOpen={sidebarOpen} onProfileClick={() => setShowProfile(true)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md z-10`}>
          <div className="h-16 flex items-center justify-between px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-300 dark:hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Welcome message */}
              {userData && (
                <span className="hidden md:block text-sm text-gray-600 dark:text-gray-300">
                  Welcome, <span className="font-semibold">{userData.username}</span>
                </span>
              )}
              
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? (
                  <i className="fas fa-sun text-yellow-400"></i>
                ) : (
                  <i className="fas fa-moon text-gray-700"></i>
                )}
              </button>
              
              {/* Profile button */}
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="View Profile"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  {userData?.username?.[0]?.toUpperCase() || 'A'}
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="reports" element={<Reports />} />
              <Route path="organization" element={<Organization />} />
              <Route path="users" element={<Users />} />
              <Route path="locators" element={<Locators />} /> {/* Add this new route */}
            </Routes>
          </div>
        </main>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default AdminDashboard;
