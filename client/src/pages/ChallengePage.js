import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChallenge } from '../services/api';
import FlagSubmissionForm from '../components/FlagSubmissionForm';
import ReactMarkdown from 'react-markdown';

const ChallengePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const data = await getChallenge(id);
      setChallenge(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching challenge:', err);
      setError('Failed to load challenge. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolve = (solved) => {
    if (solved) {
      // Update the current challenge object
      setChallenge({
        ...challenge,
        solved: true
      });
    }
  };

  const handleBack = () => {
    navigate('/challenges');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error || 'Challenge not found'}</span>
          <button
            onClick={handleBack}
            className="mt-2 bg-red-700 hover:bg-red-800 text-white py-1 px-2 rounded text-sm"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  // Determine badge color based on difficulty
  const getDifficultyColor = () => {
    switch (challenge.difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-red-500';
      case 'expert':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={handleBack}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Challenges
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">{challenge.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-800">
                  {challenge.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getDifficultyColor()}`}>
                  {challenge.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                  {challenge.points} points
                </span>
                {challenge.solved && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Solved
                  </span>
                )}
              </div>
            </div>
            <div className="text-gray-600">
              <p>Created by: {challenge.author}</p>
              <p>Solves: {challenge.solvedCount}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Description</h2>
          <div className="prose max-w-none">
            <ReactMarkdown>{challenge.description}</ReactMarkdown>
          </div>

          {challenge.hint && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Hint</h2>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ReactMarkdown>{challenge.hint}</ReactMarkdown>
              </div>
            </div>
          )}

          {challenge.files && challenge.files.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Files</h2>
              <ul className="space-y-2">
                {challenge.files.map((file, index) => (
                  <li key={index}>
                    <a
                      href={file.url}
                      download={file.name}
                      className="flex items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {file.name} ({file.size})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FlagSubmissionForm challengeId={id} onSubmit={handleSolve} />
        </div>
      </div>
    </div>
  );
};

export default ChallengePage;
