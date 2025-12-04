import { supabase } from '../lib/supabase'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Generate AI-powered relationship insights based on check-ins and relationship data
 * @param {string} userId - Current user ID
 * @param {object} relationshipData - Data containing check-ins, notes, mood patterns
 * @returns {Promise<string>} AI-generated insights
 */
export async function generateRelationshipInsights(userId, relationshipData = {}) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env');
    }

    // Fetch recent check-ins if not provided
    const { data: checkIns, error: checkInError } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (checkInError) {
      console.error('Error fetching check-ins:', checkInError);
    }

    // Fetch notes/memories
    const { data: notes, error: notesError } = await supabase
      .from('relationship_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }

    // Prepare context for AI analysis
    const analysisContext = {
      recentCheckIns: checkIns || [],
      recentNotes: notes || [],
      additionalData: relationshipData,
      analysisDate: new Date().toLocaleDateString(),
    };

    // Build prompt for AI
    const systemPrompt = `You are a compassionate relationship coach and AI assistant for couples. 
Your role is to analyze relationship data (check-ins, notes, mood patterns) and provide thoughtful, 
actionable insights that help strengthen the relationship. Be warm, encouraging, and specific. 
Focus on patterns, emotional connection, communication, and ways to deepen intimacy.`;

    const userPrompt = `Please analyze this relationship data and provide 3-4 specific, actionable insights:

Recent Check-ins (last 10):
${
  analysisContext.recentCheckIns.length > 0
    ? analysisContext.recentCheckIns
        .map(
          (ci) =>
            `- [${ci.author_name || 'Partner'}] Mood: ${ci.mood}, Energy: ${ci.energy}, Message: "${ci.message}"`,
        )
        .join('\n')
    : 'No recent check-ins available'
}

Recent Notes/Memories (last 10):
${
  analysisContext.recentNotes.length > 0
    ? analysisContext.recentNotes
        .map((n) => `- "${n.content}" (${n.category || 'general'})`)
        .join('\n')
    : 'No recent notes available'
}

Based on this data, provide insights about:
1. Current emotional connection and mood alignment
2. Communication patterns and opportunity areas
3. Specific, actionable suggestions for deepening your relationship
4. Celebration moments or positive patterns you're noticing

Keep insights personal, warm, and encouraging. Be specific to their situation.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    // Save insights to database for history
    const { error: saveError } = await supabase.from('ai_insights').insert({
      user_id: userId,
      insights: insights,
      generated_at: new Date().toISOString(),
      check_in_count: analysisContext.recentCheckIns.length,
      notes_count: analysisContext.recentNotes.length,
    });

    if (saveError) {
      console.error('Error saving insights:', saveError);
    }

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw error;
  }
}

/**
 * Get cached AI insights for the user
 * @param {string} userId - User ID
 * @param {number} limit - Number of past insights to fetch
 * @returns {Promise<Array>} Array of past insights
 */
export async function getAIInsights(userId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    throw error;
  }
}

/**
 * Generate mood-based relationship recommendations
 * @param {string} userId - User ID
 * @param {string} currentMood - Current mood (e.g., "stressed", "happy", "neutral")
 * @returns {Promise<string>} AI-generated recommendations
 */
export async function generateMoodBasedRecommendations(userId, currentMood) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch user's recent check-ins to understand context
    const { data: recentCheckIns } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const prompt = `Based on someone's current mood of "${currentMood}" and their recent check-ins:
${recentCheckIns?.map((ci) => `- ${ci.message}`).join('\n') || 'No recent check-ins'}

Provide 2-3 brief, specific suggestions for how they and their partner can best support each other right now. 
Keep it concise and actionable.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive relationship coach. Provide brief, practical suggestions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating mood-based recommendations:', error);
    throw error;
  }
}

/**
 * Generate conversation starters based on relationship data
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} Array of conversation starters
 */
export async function generateConversationStarters(userId) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch recent notes to understand relationship interests
    const { data: recentNotes } = await supabase
      .from('relationship_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const interests = recentNotes?.map((n) => n.content).join('\n') || '';

    const prompt = `Based on this relationship's recent memories and interests:
${interests || 'No recent data available'}

Generate 3 thoughtful, specific conversation starters that would deepen intimacy and connection. 
Make them warm, genuine, and based on their actual relationship context.
Return as a numbered list.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a thoughtful relationship coach. Create meaningful conversation starters.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse numbered list into array
    return content
      .split('\n')
      .filter((line) => line.match(/^\d+\./))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());
  } catch (error) {
    console.error('Error generating conversation starters:', error);
    throw error;
  }
}
