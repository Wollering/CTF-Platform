import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserSubmissions, updateUserProfile } from '../services/api';

const ProfilePage = () => {
  const { user, updateUserData } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  useEffect(() => {
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const profileData = await getUserProfile();
      const submissionsData = await getUserSubmissions();
      
      setProfile(profileData);
      setSubmissions(submissionsData);
      
      setFormData({
        username: profileData.username || '',
        email: profileData.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load profile data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError(null);
    setSuccessMessage('');
    
    // Validate passwords if the user is trying to change the password
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      
      if (!formData.currentPassword) {
        setError('Current password is required to set a new password');
        return;
      }
    }
    
    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };
      
      // Only include password fields if the user is trying to change password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      const updatedProfile = await updateUserProfile(updateData);
      
      // Update the profile state and auth context
      setProfile(updatedProfile);
      updateUserData(updatedProfile);
      
      // Reset password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error || 'Profile not found'}</span>
          <button
            onClick={fetchUserData}
            className="mt-2 bg-red-700 hover:bg-red-800 text-white py-1 px-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Group submissions by challenge category
  const submissionsByCategory = submissions.reduce((acc, submission) => {
    const category = submission.challenge.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(submission);
    return acc;
  }, {});
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{profile.username}</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                      {error}
                    </div>
                  )}
                  
                  {successMessage && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                      {successMessage}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                      Username
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                      Email
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 mt-6">Change Password</h3>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                      Current Password
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="currentPassword"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                      New Password
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      type="submit"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Team</p>
                    <p className="font-medium">{profile.team?.name || 'No Team'}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Total Points</p>
                    <p className="font-medium">{profile.points || 0} points</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Challenges Solved</p>
                    <p className="font-medium">{profile.solvedChallenges || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* User Activity */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Your Activity</h2>
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Solved Challenges</h3>
              
              {submissions.length === 0 ? (
                <p className="text-gray-600">You haven't solved any challenges yet.</p>
              ) : (
                <div>
                  {Object.entries(submissionsByCategory).map(([category, categorySubmissions]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-md font-semibold mb-2">{category} ({categorySubmissions.length})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {categorySubmissions.map((submission) => (
                          <div 
                            key={submission._id} 
                            className="p-3 bg-gray-100 rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium">{submission.challenge.title}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(submission.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="font-semibold text-blue-600">
                              +{submission.challenge.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
