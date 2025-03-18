import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold">CTF Platform</Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/challenges" className="hover:bg-gray-700 px-3 py-2 rounded-md">Challenges</Link>
                  <Link to="/profile" className="hover:bg-gray-700 px-3 py-2 rounded-md">Profile</Link>
                  {user && user.isAdmin && (
                    <Link to="/admin" className="hover:bg-gray-700 px-3 py-2 rounded-md">Admin</Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/" className="hover:bg-gray-700 px-3 py-2 rounded-md">Login</Link>
              )}
            </div>
          </div>
          
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/challenges"
                className="block hover:bg-gray-700 px-3 py-2 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Challenges
              </Link>
              <Link
                to="/profile"
                className="block hover:bg-gray-700 px-3 py-2 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              {user && user.isAdmin && (
                <Link
                  to="/admin"
                  className="block hover:bg-gray-700 px-3 py-2 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/"
              className="block hover:bg-gray-700 px-3 py-2 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
