import React, { useState, useEffect } from 'react';
import { 
  getAllChallenges, 
  getAllUsers, 
  createChallenge, 
  updateChallenge, 
  deleteChallenge 
} from '../services/api';

const AdminPage = () => {
  // Data states
  const [challenges, setChallenges] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    totalChallenges: 0,
    totalSolves: 0
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('challenges');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    category: 'web',
    difficulty: 'medium',
    description: '',
    flag: '',
    points: 100,
    hint: '',
    author: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch challenges and users in parallel
      const [challengesData, usersData] = await Promise.all([
        getAllChallenges(),
        getAllUsers()
      ]);
      
      setChallenges(challengesData);
      setUsers(usersData);
      
      // Calculate stats
      const teams = new Set(usersData.map(user => user.team?._id).filter(Boolean));
      
      setStats({
        totalUsers: usersData.length,
        totalTeams: teams.size,
        totalChallenges: challengesData.length,
        totalSolves: challengesData.reduce((acc, challenge) => acc + (challenge.solvedCount || 0), 0)
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'web',
      difficulty: 'medium',
      description: '',
      flag: '',
      points: 100,
      hint: '',
      author: ''
    });
    setIsCreating(false);
    setEditingChallenge(null);
  };

  const handleAddChallenge = () => {
    setIsCreating(true);
    setEditingChallenge(null);
    // Focus on the title input after a short delay
    setTimeout(() => {
      document.getElementById('title')?.focus();
    }, 100);
  };

  const handleEditChallenge = (challenge) => {
    setEditingChallenge(challenge);
    setIsCreating(false);
    setFormData({
      title: challenge.title || '',
      category: challenge.category || 'web',
      difficulty: challenge.difficulty || 'medium',
      description: challenge.description || '',
      flag: challenge.flag || '',
      points: challenge.points || 100,
      hint: challenge.hint || '',
      author: challenge.author || ''
    });
    // Focus on the title input after a short delay
    setTimeout(() => {
      document.getElementById('title')?.focus();
    }, 100);
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteChallenge(id);
      setChallenges(challenges.filter(challenge => challenge._id !== id));
      setStats({
        ...stats,
        totalChallenges: stats.totalChallenges - 1
      });
    } catch (err) {
      console.error('Error deleting challenge:', err);
      alert('Failed to delete challenge. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingChallenge) {
        // Update existing challenge
        const updatedChallenge = await updateChallenge(editingChallenge._id, formData);
        setChallenges(challenges.map(c => 
          c._id === editingChallenge._id ? updatedChallenge : c
        ));
      } else {
        // Create new challenge
        const newChallenge = await createChallenge(formData);
        setChallenges([...challenges, newChallenge]);
        setStats({
          ...stats,
          totalChallenges: stats.totalChallenges + 1
        });
      }
      
      resetForm();
    } catch (err) {
      console.error('Error saving challenge:', err);
      alert('Failed to save challenge. Please try again.');
    }
  };

  // Rendering loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // Rendering error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={fetchData}
            className="mt-2 bg-red-700 hover:bg-red-800 text-white py-1 px-2 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold">Total Users</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold">Total Teams</h3>
          <p className="text-3xl font-bold">{stats.totalTeams}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold">Total Challenges</h3>
          <p className="text-3xl font-bold">{stats.totalChallenges}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold">Total Solves</h3>
          <p className="text-3xl font-bold">{stats.totalSolves}</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="flex border-b">
          <button
            className={`py-4 px-6 font-medium ${activeTab === 'challenges' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('challenges')}
          >
            Challenges
          </button>
          <button
            className={`py-4 px-6 font-medium ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
        
        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Challenges</h2>
              {!isCreating && !editingChallenge && (
                <button
                  onClick={handleAddChallenge}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add New Challenge
                </button>
              )}
            </div>
            
            {(isCreating || editingChallenge) && (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  {isCreating ? 'Create New Challenge' : 'Edit Challenge'}
                </h3>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                        Title
                      </label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
                        Author
                      </label>
                      <input
                        id="author"
                        name="author"
                        type="text"
                        value={formData.author}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      >
                        <option value="web">Web</option>
                        <option value="crypto">Crypto</option>
                        <option value="forensics">Forensics</option>
                        <option value="pwn">Pwn</option>
                        <option value="reverse">Reverse</option>
                        <option value="misc">Misc</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="difficulty">
                        Difficulty
                      </label>
                      <select
                        id="difficulty"
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="points">
                        Points
                      </label>
                      <input
                        id="points"
                        name="points"
                        type="number"
                        min="10"
                        step="10"
                        value={formData.points}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="flag">
                        Flag
                      </label>
                      <input
                        id="flag"
                        name="flag"
                        type="text"
                        value={formData.flag}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Use the format CTF{'{your_flag_here}'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="6"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    ></textarea>
                    <p className="text-xs text-gray-600 mt-1">
                      Markdown is supported
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hint">
                      Hint (Optional)
                    </label>
                    <textarea
                      id="hint"
                      name="hint"
                      value={formData.hint}
                      onChange={handleInputChange}
                      rows="3"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    ></textarea>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {isCreating ? 'Create Challenge' : 'Update Challenge'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Challenge List */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Title</th>
                    <th className="py-2 px-4 border-b text-left">Category</th>
                    <th className="py-2 px-4 border-b text-left">Difficulty</th>
                    <th className="py-2 px-4 border-b text-left">Points</th>
                    <th className="py-2 px-4 border-b text-left">Solves</th>
                    <th className="py-2 px-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4 px-4 text-center text-gray-500">
                        No challenges found. Create one to get started!
                      </td>
                    </tr>
                  ) : (
                    challenges.map(challenge => (
                      <tr key={challenge._id} className="hover:bg-gray-100">
                        <td className="py-3 px-4 border-b">{challenge.title}</td>
                        <td className="py-3 px-4 border-b">{challenge.category}</td>
                        <td className="py-3 px-4 border-b">{challenge.difficulty}</td>
                        <td className="py-3 px-4 border-b">{challenge.points}</td>
                        <td className="py-3 px-4 border-b">{challenge.solvedCount || 0}</td>
                        <td className="py-3 px-4 border-b text-right">
                          <button
                            onClick={() => handleEditChallenge(challenge)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteChallenge(challenge._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Users</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Username</th>
                    <th className="py-2 px-4 border-b text-left">Email</th>
                    <th className="py-2 px-4 border-b text-left">Team</th>
                    <th className="py-2 px-4 border-b text-left">Points</th>
                    <th className="py-2 px-4 border-b text-left">Solves</th>
                    <th className="py-2 px-4 border-b text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4 px-4 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user._id} className="hover:bg-gray-100">
                        <td className="py-3 px-4 border-b">{user.username}</td>
                        <td className="py-3 px-4 border-b">{user.email}</td>
                        <td className="py-3 px-4 border-b">{user.team?.name || 'No Team'}</td>
                        <td className="py-3 px-4 border-b">{user.points || 0}</td>
                        <td className="py-3 px-4 border-b">{user.solvedChallenges || 0}</td>
                        <td className="py-3 px-4 border-b">
                          {user.isAdmin ? (
                            <span className="bg-purple-100 text-purple-800 py-1 px-2 rounded text-xs font-semibold">
                              Admin
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded text-xs font-semibold">
                              User
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
