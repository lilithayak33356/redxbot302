const axios = require('axios');
const https = require('https');

// List of user agents to rotate
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

// Optional: proxy list (if you have access to proxies)
const PROXIES = []; // leave empty if no proxies

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

        // Try multiple APIs in case one is blocked
        const apis = [
            { url: `https://fam-official.serv00.net/api/database.php?number=${number}`, name: 'Primary' },
            { url: `https://api.pakdata.com/v1/sim?number=${number}`, name: 'Secondary' }, // placeholder
            { url: `https://cnic.simowner.pk/api?number=${number}`, name: 'Tertiary' } // placeholder
        ];

        for (const api of apis) {
            try {
                const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
                const axiosConfig = {
                    timeout: 15000,
                    headers: {
                        'User-Agent': randomUserAgent,
                        'Accept': 'application/json, text/html, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.google.com/',
                        'Origin': 'https://www.google.com',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // ignore SSL errors if any
                };

                // If proxies are available, pick one randomly
                if (PROXIES.length > 0) {
                    const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
                    axiosConfig.proxy = proxy;
                }

                const response = await axios.get(api.url, axiosConfig);
                
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const data = response.data;
                    if (data && (data.status === 'success' || data.number || data.cnic)) {
                        let reply = `📱 *SIM Database Result (${api.name})*\n\n`;
                        reply += `📞 *Number:* ${data.number || number}\n`;
                        reply += `🆔 *CNIC:* ${data.cnic || data.cnic_no || data.id || 'N/A'}\n`;
                        reply += `👤 *Name:* ${data.name || data.owner || 'N/A'}\n`;
                        reply += `📍 *Address:* ${data.address || data.addr || 'N/A'}\n`;
                        reply += `📡 *Network:* ${data.network || data.operator || 'N/A'}`;
                        return await sock.sendMessage(chatId, { text: reply }, { quoted: message });
                    }
                } else {
                    // If HTML, check if it's a captcha page
                    const html = response.data;
                    if (html.includes('captcha') || html.includes('bot')) {
                        console.log(`API ${api.name} returned bot page, trying next...`);
                        continue; // try next API
                    }
                }
            } catch (err) {
                console.log(`API ${api.name} failed:`, err.message);
                // continue to next API
            }
        }

        // If all APIs failed
        await sock.sendMessage(chatId, { 
            text: '❌ All SIM database services are currently unavailable or protected.\nPlease try again later or use a different service.'
        }, { quoted: message });
    }
};
