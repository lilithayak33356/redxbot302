const path = require('path');
const fs = require('fs');
const { Storage } = require('megajs');

/**
 * Download session credentials from Mega using account login.
 * Credentials are hardcoded – replace with env vars for production.
 */
async function SaveCreds() {
    const __dirname = path.dirname(__filename);
    const sessionDir = path.join(__dirname, '..', 'session');
    const credsPath = path.join(sessionDir, 'creds.json');

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log('🔐 Logging into Mega...');

    try {
        // Login using your credentials
        const storage = await new Storage({
            email: 'ranaabdulrehman1986@gmail.com',
            password: 'amin1972',
        }).ready;

        // Find the creds.json file in the root of your Mega
        const file = storage.root.children.find(c => 
            c.name === 'creds.json' && !c.directory
        );

        if (!file) {
            throw new Error('creds.json not found in Mega root');
        }

        console.log('⬇️ Downloading session...');
        const data = await new Promise((resolve, reject) => {
            file.download((err, buffer) => {
                if (err) return reject(err);
                resolve(buffer);
            });
        });

        // Validate JSON
        try {
            JSON.parse(data.toString());
        } catch (e) {
            throw new Error('Downloaded file is not valid JSON');
        }

        fs.writeFileSync(credsPath, data);
        console.log('✅ Session downloaded and saved.');
        return JSON.parse(data.toString());
    } catch (err) {
        console.error('❌ Mega download failed:', err.message);
        throw err;
    }
}

module.exports = SaveCreds;
