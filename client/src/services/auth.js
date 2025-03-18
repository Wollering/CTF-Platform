import api from './api';

// Login user
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data.user;
  } catch (error) {
    throw error;
  }
};

// Register user
export const registerUser = async (username, email, password, teamName) => {
  try {
    const response = await api.post('/auth/register', { 
      username, 
      email, 
      password, 
      teamName 
    });
    return response.data.user;
  } catch (error) {
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
    return true;
  } catch (error) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    // Don't throw here, just return null since this is called on app startup
    return null;
  }
};
