import React, { useState } from 'react';
import { submitFlag } from '../services/api';

const FlagSubmissionForm = ({ challengeId, onSubmit }) => {
  const [flag, setFlag] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!flag.trim()) {
      setError('Please enter a flag');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setSubmissionResult(null);
    
    try {
      const result = await submitFlag(challengeId, flag);
      
      if (result.success) {
        setSubmissionResult({
          status: 'success',
          message: 'Correct flag! You\'ve solved this challenge.'
        });
        setFlag('');
        // Call the parent component's callback to update UI
        if (onSubmit) onSubmit(true);
      } else {
        setSubmissionResult({
          status: 'error',
          message: 'Incorrect flag. Try again!'
        });
      }
    } catch (err) {
      console.error('Error submitting flag:', err);
      setSubmissionResult({
        status: 'error',
        message: err.message || 'An error occurred while submitting your flag'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Submit Flag</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            placeholder="Enter flag (e.g., CTF{...})"
            className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Flag'}
          </button>
        </div>
        
        {error && (
          <p className="mt-2 text-red-600">{error}</p>
        )}
      </form>
      
      {submissionResult && (
        <div 
          className={`mt-3 p-3 rounded ${
            submissionResult.status === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {submissionResult.message}
        </div>
      )}
      
      <div className="mt-3 text-sm text-gray-600">
        <p>Tips:</p>
        <ul className="list-disc pl-5">
          <li>Flags are case-sensitive</li>
          <li>The flag format is typically CTF{flag_text_here}</li>
          <li>Don't include extra spaces or quotes</li>
        </ul>
      </div>
    </div>
  );
};

export default FlagSubmissionForm;
