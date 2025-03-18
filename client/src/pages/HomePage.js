import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Leaderboard from '../components/Leaderboard';

const HomePage = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    teamName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/challenges');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(formData.username, formData.password);
      } else {
        if (!formData.email || !formData.username || !formData.password || !formData.teamName) {
          throw new Error('All fields are required');
        }
        await register(formData.username, formData.email, formData.password, formData.teamName);
      }
      // Redirection is handled by the useEffect
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side - CTF information */}
          <div className="md:w-1/2">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-blue-800 mb-4">Welcome to CTF Platform</h1>
              <p className="text-lg text-gray-700 mb-6">
                Test your cybersecurity skills with our range of challenges across multiple categories:
                Web, Cryptography, Reverse Engineering, Forensics, and more!
              </p>

              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-semibold mb-4">How to Play</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Create an account or join with your team</li>
                  <li>Browse available challenges by category</li>
                  <li>Solve challenges to find flags</li>
                  <li>Submit flags to earn points</li>
                  <li>Climb the leaderboard and compete with other teams</li>
                </ol>
              </div>

              <Leaderboard />
            </div>
          </div>

          {/* Right side - Authentication form */}
          <div className="md:w-1/2">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                {isLoginMode ? 'Login to Your Account' : 'Create New Account'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label 
                    htmlFor="username" 
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {!isLoginMode && (
                  <div className="mb-4">
                    <label 
                      htmlFor="email" 
                      className="block text-gray-700 text-sm font-bold mb-2"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label 
                    htmlFor="password" 
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {!isLoginMode && (
                  <div className="mb-4">
                    <label 
                      htmlFor="teamName" 
                      className="block text-gray-700 text-sm font-bold mb-2"
                    >
                      Team Name
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      name="teamName"
                      value={formData.teamName}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : isLoginMode ? 'Login' : 'Register'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={toggleMode}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isLoginMode ? 'Need an account? Register' : 'Already have an account? Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
