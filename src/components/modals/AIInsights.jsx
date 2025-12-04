import React, { useState, useEffect } from 'react';
import { Loader, Zap, Lightbulb, MessageCircle } from 'lucide-react';
import { generateRelationshipInsights, generateMoodBasedRecommendations } from '../../services/aiInsights';

export default function AIInsights({ user, isOpen, onClose }) {
  const [insights, setInsights] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && !insights) {
      loadInsights();
    }
  }, [isOpen]);

  const loadInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateRelationshipInsights(user.id);
      setInsights(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateMoodBasedRecommendations(user.id, 'neutral');
      setRecommendations(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white flex items-center gap-3">
          <Zap size={24} />
          <h2 className="text-2xl font-bold">AI Relationship Insights</h2>
          <button
            onClick={onClose}
            className="ml-auto text-2xl hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => {
              setActiveTab('insights');
              if (!insights) loadInsights();
            }}
            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'insights'
                ? 'border-b-2 border-purple-500 bg-white text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lightbulb size={18} />
            Insights
          </button>
          <button
            onClick={() => {
              setActiveTab('recommendations');
              if (!recommendations) loadRecommendations();
            }}
            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'recommendations'
                ? 'border-b-2 border-pink-500 bg-white text-pink-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageCircle size={18} />
            Recommendations
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              {loading && activeTab === 'insights' ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader size={40} className="text-purple-500 animate-spin" />
                  <p className="text-gray-600">Analyzing your relationship...</p>
                </div>
              ) : insights ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {insights}
                    </div>
                  </div>
                  <button
                    onClick={loadInsights}
                    className="mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition"
                  >
                    Regenerate Insights
                  </button>
                </div>
              ) : (
                <button
                  onClick={loadInsights}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg transition font-semibold"
                >
                  Generate Insights
                </button>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div>
              {loading && activeTab === 'recommendations' ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader size={40} className="text-pink-500 animate-spin" />
                  <p className="text-gray-600">Getting recommendations...</p>
                </div>
              ) : recommendations ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-6 border border-pink-100">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {recommendations}
                    </div>
                  </div>
                  <button
                    onClick={loadRecommendations}
                    className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg transition"
                  >
                    Get New Recommendations
                  </button>
                </div>
              ) : (
                <button
                  onClick={loadRecommendations}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg transition font-semibold"
                >
                  Get Recommendations
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t text-sm text-gray-600">
          <p>
            💡 Powered by OpenAI. These insights are generated based on your check-ins and notes
            to help strengthen your relationship.
          </p>
        </div>
      </div>
    </div>
  );
}
