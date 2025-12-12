import React, { useState, useEffect } from 'react';
import { Zap, Loader, RotateCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAIInsights, generateRelationshipInsights } from '../services/aiInsights';
import EmptyState from '../components/EmptyState';

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
    <div className="min-h-screen" style={{background: 'linear-gradient(180deg, #f7f8f9 0%, var(--bg) 100%)'}}>
      <div className="max-w-3xl mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Zap size={32} className="text-slate-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          </div>
          <button
            onClick={generateNew}
            disabled={loading}
            className="flex items-center gap-2 btn"
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
          <div className="rounded-lg p-4 mb-6" style={{backgroundColor: '#fff6f6', border: '1px solid rgba(239,68,68,0.12)', color: '#b91c1c'}}>
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader size={48} className="text-slate-600 animate-spin" />
            <p className="text-sm" style={{color: 'var(--muted)'}}>Analyzing your relationship...</p>
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
                <div className="p-4" style={{background: 'linear-gradient(90deg, #334155 0%, #64748b 100%)', color: 'white'}}>
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
                    <div className="rounded-lg p-6 border" style={{borderColor: 'var(--border)', backgroundColor: 'var(--card)'}}>
                      <div className="whitespace-pre-wrap leading-relaxed" style={{color: 'var(--text)'}}>
                        {insight.insights}
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  {(insight.check_in_count || insight.notes_count) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm text-gray-600">
                      {insight.check_in_count && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            {insight.check_in_count}
                          </span>{' '}
                          check-ins analyzed
                        </div>
                      )}
                      {insight.notes_count && (
                        <div>
                          <span className="font-semibold text-slate-700">{insight.notes_count}</span>{' '}
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
          <EmptyState
            icon={<Zap size={28} />}
            title="No insights yet"
            description="Generate your first AI insight to get started!"
            action={<button onClick={generateNew} className="btn">Generate First Insight</button>}
          />
        )}
      </div>
    </div>
  );
}
