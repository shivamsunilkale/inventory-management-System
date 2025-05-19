import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (tokens.access_token && user && user.username) {
      setIsAuthenticated(true);
      setUserData(user);
    }
  }, []);

  const loginUser = (user, tokens, rememberMe) => {
    // Store authentication data
    localStorage.setItem('tokens', JSON.stringify(tokens));
    localStorage.setItem('user', JSON.stringify(user));
    
    // Update state
    setIsAuthenticated(true);
    setUserData(user);
    
    // Handle redirection based on user privilege
    const privileges = Number(user.privileges || 0);
    
    setTimeout(() => {
      if (privileges === 3) {
        navigate('/admin/dashboard');
      } else if (privileges === 2) {
        navigate('/stockkeeper/dashboard');
      } else {
        navigate('/inventorymanager/dashboard');
      }
    }, 100);
  };

  const logoutUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    setIsAuthenticated(false);
    setUserData(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userData,
      loginUser,
      logoutUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
