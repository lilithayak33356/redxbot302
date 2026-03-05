const axios = require('axios');

module.exports = {
    command: 'simdatabase',
    aliases: ['simdb', 'cnicinfo'],
    category: 'tools',
    description: 'Get SIM owner info (Pakistan) – provide phone number',
    usage: '.simdatabase 3009842133',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const number = args[0];
        if (!number || number.length < 10) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Please provide a valid phone number.\nExample: .simdatabase 3009842133' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: '⏳ Fetching SIM database info...' }, { quoted: message });

        try {
            const api = `https://fam-official.serv00.net/api/database.php?number=${number}`;
            const response = await axios.get(api, { 
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0' } // sometimes helps avoid blocks
            });
            
            // Log the full response for debugging (remove in production)
            console.log('SIM API response:', JSON.stringify(response.data, null, 2));

            const data = response.data;

            // Check if data is a string (maybe HTML error page)
            if (typeof data === 'string') {
                if (data.includes('404') || data.includes('Not Found')) {
                    throw new Error('API endpoint not found (404)');
                }
                // Try to see if it's JSON inside a string
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && (parsed.status === 'success' || parsed.number)) {
                        // Use parsed data
                        return sendResult(sock, chatId, parsed, message);
                    }
                } catch (e) {
                    // Not JSON, just show the string as error
                    throw new Error(`API returned non-JSON: ${data.substring(0, 200)}`);
                }
            }

            // If data is an object, try to extract info
            if (data && typeof data === 'object') {
                // Try common field names
                const result = {
                    number: data.number || data.phone || data.mobile || number,
                    cnic: data.cnic || data.cnic_no || data.cnicNumber || data.id || 'N/A',
                    name: data.name || data.owner || data.full_name || data.person || 'N/A',
                    address: data.address || data.addr || data.location || 'N/A',
                    network: data.network || data.operator || data.carrier || data.provider || 'N/A'
                };

                // If at least one field has data, show it
                if (result.name !== 'N/A' || result.cnic !== 'N/A') {
                    let reply = `📱 *SIM Database Result*\n\n`;
                    reply += `📞 *Number:* ${result.number}\n`;
                    reply += `🆔 *CNIC:* ${result.cnic}\n`;
                    reply += `👤 *Name:* ${result.name}\n`;
                    reply += `📍 *Address:* ${result.address}\n`;
                    reply += `📡 *Network:* ${result.network}`;
                    return await sock.sendMessage(chatId, { text: reply }, { quoted: message });
                }
            }

            // If we reach here, no useful data found
            throw new Error('No SIM data found for this number');

        } catch (error) {
            console.error('SIM database error:', error.message);
            let errorMsg = '❌ SIM database lookup failed.\n';
            if (error.response) {
                errorMsg += `API returned ${error.response.status}`;
                if (error.response.status === 403) {
                    errorMsg += ' – access forbidden. The service may be down or blocked.';
                } else if (error.response.status === 404) {
                    errorMsg += ' – endpoint not found.';
                }
            } else if (error.request) {
                errorMsg += 'No response from server. The service might be offline.';
            } else {
                errorMsg += error.message;
            }
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }
    }
};
