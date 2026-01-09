/* ==========================================
   LETRA EXPLOSIVA - Supabase Integration
   Global Leaderboard System
   ========================================== */

const SUPABASE_URL = 'https://qqvazaigmkjuwtqhdlkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdmF6YWlnbWtqdXd0cWhkbGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjYwODksImV4cCI6MjA4MzUwMjA4OX0.EU_AeZdB4MaPD7sUcoqgYUTTNbEh1GaT2v6mbve-M8o';

class Leaderboard {
    constructor() {
        this.baseUrl = `${SUPABASE_URL}/rest/v1`;
        this.headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
    }

    /**
     * Get top 10 scores
     * @returns {Promise<Array>} Array of top scores
     */
    async getTopScores() {
        try {
            const response = await fetch(
                `${this.baseUrl}/scores?select=player_name,score,level,max_combo,created_at&order=score.desc&limit=10`,
                {
                    method: 'GET',
                    headers: this.headers
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch scores');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    }

    /**
     * Submit a new score
     * @param {string} playerName - Player's name
     * @param {number} score - Final score
     * @param {number} level - Level reached
     * @param {number} maxCombo - Maximum combo achieved
     * @returns {Promise<boolean>} Success status
     */
    async submitScore(playerName, score, level, maxCombo) {
        try {
            const response = await fetch(
                `${this.baseUrl}/scores`,
                {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({
                        player_name: playerName.trim().substring(0, 50),
                        score: score,
                        level: level,
                        max_combo: maxCombo
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to submit score');
            }

            return true;
        } catch (error) {
            console.error('Error submitting score:', error);
            return false;
        }
    }

    /**
     * Check if score qualifies for top 10
     * @param {number} score - Score to check
     * @returns {Promise<boolean>} Whether score qualifies
     */
    async isTopScore(score) {
        try {
            const topScores = await this.getTopScores();
            if (topScores.length < 10) return true;
            const lowestTopScore = topScores[topScores.length - 1].score;
            return score > lowestTopScore;
        } catch (error) {
            return false;
        }
    }
}

// Global leaderboard instance
const leaderboard = new Leaderboard();
