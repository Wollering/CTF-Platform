import React from 'react';
import { Link } from 'react-router-dom';

const ChallengeCard = ({ challenge }) => {
  const {
    _id,
    title,
    category,
    difficulty,
    points,
    solved,
    solvedCount
  } = challenge;

  // Determine card border color based on difficulty
  const getBorderColor = () => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'border-green-500';
      case 'medium':
        return 'border-yellow-500';
      case 'hard':
        return 'border-red-500';
      case 'expert':
        return 'border-purple-500';
      default:
        return 'border-blue-500';
    }
  };

  return (
    <Link to={`/challenges/${_id}`}>
      <div className={`bg-white shadow-md rounded-lg p-4 border-l-4 ${getBorderColor()} transition-transform hover:scale-105 hover:shadow-lg`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <div className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-semibold">
            {points} pts
          </div>
        </div>
        
        <div className="mb-4">
          <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
            {category}
          </span>
          <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
            {difficulty}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <span>{solvedCount} solves</span>
          </div>
          {solved && (
            <div className="text-green-600 font-semibold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Solved
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ChallengeCard;
