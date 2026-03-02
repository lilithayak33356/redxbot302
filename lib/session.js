    const megaFileId = sessionId.startsWith('IK~') ? sessionId.slice(3) : sessionId;
    const file = File.fromURL(`https://mega.nz/file/${megaFileId}`);

    try {
        const data = await new Promise((resolve, reject) => {
            file.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        fs.writeFileSync(credsPath, data);
        console.log('[✅] Session downloaded successfully!');
        return JSON.parse(data.toString());
    } catch (err) {
        console.error('❌ Error downloading or saving credentials:', err.message);
        throw err;
    }
}

module.exports = SaveCreds;
