import React, { useState, useEffect } from 'react';
import { Loader, Zap, Lightbulb, MessageCircle } from 'lucide-react';
import Dialog from '../ui/dialog'
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
    <Dialog open={isOpen} onClose={onClose} title="AI Relationship Insights">
      {/* Tabs */}
      <div className="flex border-b" style={{backgroundColor: 'var(--accent-50)'}}>
        <button
          onClick={() => {
            setActiveTab('insights');
            if (!insights) loadInsights();
          }}
          className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition ${
            activeTab === 'insights'
              ? 'border-b-2' : ''
          }`}
          style={{borderColor: activeTab === 'insights' ? 'var(--accent-700)' : 'transparent', color: 'var(--text)'}}
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
              ? 'border-b-2' : ''
          }`}
          style={{borderColor: activeTab === 'recommendations' ? 'var(--accent-700)' : 'transparent', color: 'var(--text)'}}
        >
          <MessageCircle size={18} />
          Recommendations
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
          {error && (
            <div className="rounded-lg p-4 mb-4" style={{backgroundColor: '#fff6f6', border: '1px solid rgba(239,68,68,0.12)', color: '#b91c1c'}}>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              {loading && activeTab === 'insights' ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader size={40} className="text-[--accent-600] animate-spin" />
                  <p className="text-sm" style={{color: 'var(--muted)'}}>Analyzing your relationship...</p>
                </div>
              ) : insights ? (
                <div className="prose prose-sm max-w-none">
                  <div className="rounded-lg p-6 border" style={{borderColor: 'var(--border)', backgroundColor: 'var(--card)'}}>
                    <div className="whitespace-pre-wrap leading-relaxed" style={{color: 'var(--text)'}}>
                      {insights}
                    </div>
                  </div>
                  <button onClick={loadInsights} className="mt-4 w-full btn">Regenerate Insights</button>
                </div>
              ) : (
                <button
                  onClick={loadInsights}
                  className="w-full btn"
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
                  <Loader size={40} className="text-[--accent-600] animate-spin" />
                  <p className="text-sm" style={{color: 'var(--muted)'}}>Getting recommendations...</p>
                </div>
              ) : recommendations ? (
                <div className="prose prose-sm max-w-none">
                  <div className="rounded-lg p-6 border" style={{borderColor: 'var(--border)', backgroundColor: 'var(--card)'}}>
                    <div className="whitespace-pre-wrap leading-relaxed" style={{color: 'var(--text)'}}>
                      {recommendations}
                    </div>
                  </div>
                  <button onClick={loadRecommendations} className="mt-4 w-full btn">Get New Recommendations</button>
                </div>
              ) : (
                <button
                  onClick={loadRecommendations}
                  className="w-full btn"
                >
                  Get Recommendations
                </button>
              )}
            </div>
          )}
        </div>
      {/* Footer */}
      <div className="px-6 py-4 border-t text-sm" style={{borderColor: 'var(--border)', color: 'var(--muted)'}}>
        <p>
          💡 Powered by Gemini AI. These insights are generated based on your check-ins and notes
          to help strengthen your relationship.
        </p>
      </div>
    </Dialog>
  )
}
