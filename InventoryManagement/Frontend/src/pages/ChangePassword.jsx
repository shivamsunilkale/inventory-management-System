import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
  const [newPass, setNewPass] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // API call to change password
    navigate('/home');
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 m-0 p-0">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg p-6 rounded-xl w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold mb-4 text-center">Set New Password</h2>
        <input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
        <button className="w-full bg-green-600 text-black py-2 rounded-md hover:bg-green-700">
          Save Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
