const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Your backend URL for session downloads
const BACKEND_URL = 'https://redxmainpair-production.up.railway.app';

/**
 * Save credentials from backend to session/creds.json
 * @param {string} sessionId - Session ID (from SESSION_ID env)
 */
async function SaveCreds(sessionId) {
    const __dirname = path.dirname(__filename);
    const endpoint = `${BACKEND_URL}/get-session?sessionId=${encodeURIComponent(sessionId)}`;

    try {
        console.log(`⬇️ Downloading session from: ${endpoint}`);
        const response = await axios.get(endpoint, { timeout: 30000 });

        if (!response.data) {
            throw new Error('Empty response from backend');
        }

        // Check if response is HTML (error page)
        if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
            throw new Error('Backend returned HTML instead of session JSON – check your BACKEND_URL or session ID');
        }

        // Ensure data is valid JSON string
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        
        const sessionDir = path.join(__dirname, '..', 'session');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        const credsPath = path.join(sessionDir, 'creds.json');
        fs.writeFileSync(credsPath, data);
        
        console.log('✅ Session credentials downloaded successfully.');

    } catch (error) {
        console.error('❌ Error downloading session:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Response:', error.response.data);
        } else if (error.request) {
            console.error('❌ No response received from backend');
        }
        throw error;
    }
}

module.exports = SaveCreds;
