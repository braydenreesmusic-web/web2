import React, { useState, useEffect } from 'react';
import { Zap, Loader, RotateCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAIInsights, generateRelationshipInsights } from '../services/aiInsights';

export default function AIInsightsPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInsights();
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAIInsights(user.id, 10);
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateNew = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const newInsight = await generateRelationshipInsights(user.id);
      setInsights([{ insights: newInsight, generated_at: new Date().toISOString() }, ...insights]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Zap size={32} className="text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          </div>
          <button
            onClick={generateNew}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition font-semibold"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RotateCw size={18} />
                Generate New
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader size={48} className="text-purple-500 animate-spin" />
            <p className="text-gray-600 text-lg">Analyzing your relationship...</p>
          </div>
        )}

        {/* Insights List */}
        {insights.length > 0 && (
          <div className="space-y-6">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                  <p className="text-sm opacity-90">Generated</p>
                  <p className="font-semibold">
                    {new Date(insight.generated_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {insight.insights}
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  {(insight.check_in_count || insight.notes_count) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm text-gray-600">
                      {insight.check_in_count && (
                        <div>
                          <span className="font-semibold text-purple-600">
                            {insight.check_in_count}
                          </span>{' '}
                          check-ins analyzed
                        </div>
                      )}
                      {insight.notes_count && (
                        <div>
                          <span className="font-semibold text-pink-600">{insight.notes_count}</span>{' '}
                          notes reviewed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && insights.length === 0 && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Zap size={48} className="mx-auto text-purple-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No insights yet</h3>
            <p className="text-gray-600 mb-6">Generate your first AI insight to get started!</p>
            <button
              onClick={generateNew}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg transition font-semibold"
            >
              Generate First Insight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
