import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  withCredentials: true // Important for handling cookies/sessions
});

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Authentication errors
    if (error.response && error.response.status === 401) {
      // Redirect to login page or handle auth errors
      window.location.href = '/';
    }
    
    // Get error message from server or use default
    const errorMessage = 
      (error.response && error.response.data && error.response.data.message) || 
      error.message || 
      'Something went wrong';
    
    return Promise.reject(new Error(errorMessage));
  }
);

// Challenges API
export const getChallenges = async () => {
  const response = await api.get('/challenges');
  return response.data;
};

export const getChallenge = async (id) => {
  const response = await api.get(`/challenges/${id}`);
  return response.data;
};

export const createChallenge = async (challengeData) => {
  const response = await api.post('/challenges', challengeData);
  return response.data;
};

export const updateChallenge = async (id, challengeData) => {
  const response = await api.put(`/challenges/${id}`, challengeData);
  return response.data;
};

export const deleteChallenge = async (id) => {
  const response = await api.delete(`/challenges/${id}`);
  return response.data;
};

// Submissions API
export const submitFlag = async (challengeId, flag) => {
  const response = await api.post('/submissions', { challengeId, flag });
  return response.data;
};

export const getUserSubmissions = async () => {
  const response = await api.get('/submissions/user');
  return response.data;
};

// User API
export const getUserProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

export const updateUserProfile = async (userData) => {
  const response = await api.put('/users/profile', userData);
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

// Teams & Leaderboard API
export const getLeaderboard = async () => {
  const response = await api.get('/teams/leaderboard');
  return response.data;
};

export const getAllChallenges = async () => {
  const response = await api.get('/challenges/all');
  return response.data;
};

// File Upload API for challenges
export const uploadFile = async (file, challengeId) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/challenges/${challengeId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

export default api;
