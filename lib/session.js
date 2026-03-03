const path = require('path');
const fs = require('fs');
const { File, Storage } = require('megajs');

/**
 * Download session credentials from Mega
 * Supports:
 *   - Public Mega links (SESSION_ID = full URL or file ID)
 *   - Private file via login (using MEGA_EMAIL, MEGA_PASSWORD, MEGA_FILE_PATH env vars)
 * @param {string} sessionInput - Mega link or file ID (for public method)
 */
async function SaveCreds(sessionInput) {
    const __dirname = path.dirname(__filename);
    const sessionDir = path.join(__dirname, '..', 'session');
    const credsPath = path.join(sessionDir, 'creds.json');

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log('⬇️ Downloading session from Mega...');

    let data = null;

    // If Mega credentials are provided, use login method
    if (process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD) {
        console.log('🔐 Using Mega account login...');
        try {
            const storage = await new Storage({
                email: process.env.MEGA_EMAIL,
                password: process.env.MEGA_PASSWORD,
            }).ready;

            // Specify the file path in your Mega account
            const filePath = process.env.MEGA_FILE_PATH || '/session/creds.json';
            const file = storage.root.children.find(c => 
                c.name === path.basename(filePath) && !c.directory
            );

            if (!file) {
                throw new Error(`File not found at path: ${filePath}`);
            }

            data = await new Promise((resolve, reject) => {
                file.download((err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                });
            });

            console.log('✅ Session downloaded using login.');
        } catch (err) {
            console.error('❌ Mega login download failed:', err.message);
            // Fallback to public link if login fails?
            // We'll just rethrow; user can fix credentials.
            throw err;
        }
    } else {
        // Public link method (original)
        let megaUrl;
        if (sessionInput.startsWith('http')) {
            megaUrl = sessionInput;
        } else {
            const fileId = sessionInput.replace('IK~', '');
            megaUrl = `https://mega.nz/file/${fileId}`;
        }

        try {
            const file = File.fromURL(megaUrl);
            data = await new Promise((resolve, reject) => {
                file.download((err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            console.log('✅ Session downloaded via public link.');
        } catch (err) {
            console.error('❌ Public Mega download failed:', err.message);
            throw err;
        }
    }

    // Validate downloaded data
    try {
        JSON.parse(data.toString());
    } catch (e) {
        throw new Error('Downloaded file is not valid JSON');
    }

    // Write to file
    fs.writeFileSync(credsPath, data);
    console.log('✅ Session saved to disk.');
    return JSON.parse(data.toString());
}

module.exports = SaveCreds;
