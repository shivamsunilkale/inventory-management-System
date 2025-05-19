import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        privileges: 1,
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('http://localhost:8000/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    privileges: parseInt(formData.privileges)
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            setSuccess(true);
            navigate('/');
            
        } catch (error) {
            console.error('Registration error:', error);
            if (error.name === 'AbortError') {
                setError('Connection timed out. Please try again.');
            } else {
                setError(error.message || 'Registration failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}
            <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
                required
            />
            <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
                required
            />
            <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
                required
            />
            <select
                name="privileges"
                value={formData.privileges}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
                required
            >
                <option value="1">Worker</option>
                <option value="2">Stock Keeper</option>
                <option value="3">Admin</option>
            </select>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-black py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
                {isLoading ? 'Registering...' : 'Register'}
            </button>
            <div className="text-center mt-4">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-blue-600 hover:underline text-sm"
                >
                    Back to Login
                </button>
            </div>
        </form>
    );
};

export default Register;