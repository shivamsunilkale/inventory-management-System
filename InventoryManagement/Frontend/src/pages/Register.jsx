import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: 'text-gray-400'
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [role, setRole] = useState('inventorymanager'); // Default role
  const navigate = useNavigate();

  const handlePasswordToggle = () => setPasswordVisible(!passwordVisible);
  const handleConfirmPasswordToggle = () => setConfirmPasswordVisible(!confirmPasswordVisible);

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength({
        score: 0,
        message: '',
        color: 'text-gray-400'
      });
      return;
    }

    let score = 0;
    let message = '';
    let color = '';

    // Length check
    if (password.length >= 8) score += 1;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score += 1;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score += 1;
    
    // Contains number
    if (/[0-9]/.test(password)) score += 1;
    
    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Set message and color based on score
    if (score <= 2) {
      message = 'Weak password';
      color = 'text-red-500';
    } else if (score <= 4) {
      message = 'Medium strength password';
      color = 'text-yellow-500';
    } else {
      message = 'Strong password';
      color = 'text-green-500';
    }

    setPasswordStrength({ score, message, color });
  }, [password]);

  const isPasswordStrong = passwordStrength.score >= 4;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Check password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (!isPasswordStrong) {
      setError('Please create a stronger password');
      return;
    }

    try {
      const privileges = role === 'admin' ? 3 : role === 'stockkeeper' ? 2 : 1;
      
      const response = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username: userName,
          password,
          privileges // Add privileges based on role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Show success message
      setSuccessMessage('Registration successful! Redirecting to login page...');
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify({
        email,
        username: userName,
        privileges
      }));

      // Navigate to home page after a brief delay
      setTimeout(() => navigate('/'), 1500);
      
    } catch (error) {
      setError(error.message || 'Registration failed. Please try again.');
    }
  };

  // Function to render password strength bar
  const renderPasswordStrengthBar = () => {
    const bars = [1, 2, 3, 4, 5];
    
    return (
      <div className="mt-2">
        <div className="flex space-x-1 mb-1">
          {bars.map(bar => (
            <div 
              key={bar} 
              className={`h-1.5 flex-1 rounded-sm transition-colors ${
                bar <= passwordStrength.score 
                  ? (passwordStrength.score <= 2 ? 'bg-red-500' 
                    : passwordStrength.score <= 4 ? 'bg-yellow-500' 
                    : 'bg-green-500') 
                  : 'bg-gray-200'
              }`}
            ></div>
          ))}
        </div>
        {password && (
          <p className={`text-xs ${passwordStrength.color}`}>
            {passwordStrength.message}
            {!isPasswordStrong && password && (
              <span className="block mt-0.5 text-xs text-gray-600">
                Password must include: 8+ chars, uppercase, lowercase, number and special character
              </span>
            )}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 py-4 px-4">
      <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">New Registration</h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2 mb-4 rounded text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-2 mb-4 rounded text-sm">
            {successMessage}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleRegister}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Username"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="inventorymanager">Inventory Manager</option>
              <option value="stockkeeper">Stock Keeper</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Password"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 ${
                  password ? (isPasswordStrong ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-red-500 focus:border-red-500') : 'focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div
                onClick={handlePasswordToggle}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
              >
                {passwordVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zM10 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    <path d="M10 8a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5c-4.8 0-8.8 3.1-10 7.5 1.2 4.4 5.2 7.5 10 7.5s8.8-3.1 10-7.5c-1.2-4.4-5.2-7.5-10-7.5zm0 13c-3 0-5.5-2.5-5.5-5.5S9 6.5 12 6.5s5.5 2.5 5.5 5.5-2.5 5.5-5.5 5.5zM12 9a3 3 0 100 6 3 3 0 000-6z" />
                  </svg>
                )}
              </div>
            </div>
            {renderPasswordStrengthBar()}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={confirmPasswordVisible ? 'text' : 'password'}
                placeholder="Confirm Password"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  confirmPassword && password !== confirmPassword ? 'border-red-500' : ''
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div
                onClick={handleConfirmPasswordToggle}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
              >
                {confirmPasswordVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zM10 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    <path d="M10 8a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5c-4.8 0-8.8 3.1-10 7.5 1.2 4.4 5.2 7.5 10 7.5s8.8-3.1 10-7.5c-1.2-4.4-5.2-7.5-10-7.5zm0 13c-3 0-5.5-2.5-5.5-5.5S9 6.5 12 6.5s5.5 2.5 5.5 5.5-2.5 5.5-5.5 5.5zM12 9a3 3 0 100 6 3 3 0 000-6z" />
                  </svg>
                )}
              </div>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-green-600 text-black py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-2"
            disabled={!isPasswordStrong || !password || !confirmPassword || password !== confirmPassword}
          >
            Register
          </button>
        </form>

        <div className="text-center mt-4 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline font-medium"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;