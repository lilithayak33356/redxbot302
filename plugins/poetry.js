// plugins/poetry.js
module.exports = {
  command: 'poetry',
  aliases: ['poem', 'shayari'],
  category: 'fun',
  description: 'Get a random poetry line in your chosen language',
  usage: '.poetry [language] (reply to a message for context)',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const language = args[0]?.toLowerCase() || 'english';

    // Poetry database by language
    const poetryDB = {
      english: [
        "The woods are lovely, dark and deep, But I have promises to keep.",
        "Two roads diverged in a wood, and I— I took the one less traveled by.",
        "Hope is the thing with feathers that perches in the soul.",
        "I wandered lonely as a cloud that floats on high o'er vales and hills.",
        "Shall I compare thee to a summer's day? Thou art more lovely and more temperate.",
        "Because I could not stop for Death – He kindly stopped for me.",
        "Do not go gentle into that good night, Old age should burn and rave at close of day.",
        "The best laid schemes o' mice an' men gang aft agley.",
        "How do I love thee? Let me count the ways.",
        "To be, or not to be, that is the question."
      ],
      urdu: [
        "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے",
        "دل ہی تو ہے نہ سنگ و خشت، درد سے بھر نہ آئے کیوں",
        "محبت میں نہیں ہے فرق جینے اور مرنے کا",
        "تمہارے نام سے پہلے مرا لکھا تھا جو کبھی",
        "اب کے ہم بچھڑے تو شاید کبھی خوابوں میں ملیں",
        "وہ جس نے دل کو ہنسنا سکھایا، اسے کیا ہوا؟",
        "یہ دنیا اگر مل بھی جائے تو کیا ہے",
        "دل سے جو بات نکلتی ہے، اثر رکھتی ہے",
        "کچھ اس ادا سے گزرے وہ کہ گزرے دنوں کی طرح",
        "اب اس کے بعد تو آنے لگے ہیں منظر سب"
      ],
      hindi: [
        "कभी कभी यूं भी हमने दिल को बहलाया है",
        "चाँद तारे तोड़ लाऊँ, आसमां से तुम पे लुटाऊँ",
        "तेरे बिना भी क्या होता, ये तो बताओ",
        "दिल की बातों को हम क्या समझाएं",
        "राहों में खड़े हैं तेरे हम, कब तलक यूं ही रहेंगे",
        "ये दिल तुझ पे आया है, तू माने या न माने",
        "मैं तेरा दीवाना हूँ, तू मेरी दीवानी है",
        "चाँद सितारों का महल बनाएँ, तुमको दिल में बसाएँ",
        "बहुत खूबसूरत हो तुम, ये बात तो सच है",
        "दिल से दिल मिले तो ये, मौसम भी हंस दे"
      ],
      punjabi: [
        "ਸੱਜਣਾ ਵੇ ਸੱਜਣਾ, ਦਿਲ ਵਿੱਚ ਰੱਖਾਂ ਤੈਨੂੰ",
        "ਚੰਨ ਵਾਂਗੂੰ ਚਮਕਦਾ, ਤੂੰ ਮੇਰਾ ਹੀ ਰਹਿੰਦਾ",
        "ਬੋਲੀਆਂ ਪਾ ਦੇ, ਗਿੱਧਾ ਪਾ ਦੇ",
        "ਦਿਲ ਤੋਂ ਨਿਕਲੀ ਹਰ ਗੱਲ, ਦਿਲ ਨੂੰ ਛੂਹ ਜਾਂਦੀ",
        "ਮਿੱਤਰਾਂ ਦਾ ਰੰਗ, ਨਿਹੁੰ ਦਾ ਰੰਗ ਨਿਰਾਲਾ",
        "ਜਿੰਦ ਮੇਰੀ ਨੂੰ ਤੂੰ ਹੀ ਪਤਾ, ਕਿਵੇਂ ਜਿਊਂਦੀ ਹਾਂ",
        "ਠੰਡੀ ਠੰਡੀ ਛਾਂ, ਤੇਰੇ ਨਾਲ ਬਹਿ ਕੇ",
        "ਨਜ਼ਰਾਂ ਨਾਲ ਨਜ਼ਰਾਂ ਮਿਲਾ, ਦਿਲ ਦਾ ਹਾਲ ਸੁਣਾ",
        "ਵੇ ਤੈਨੂੰ ਚੰਨ ਆਖਾਂ, ਜਾਂ ਚੰਨ ਨੂੰ ਤੈਂ ਆਖਾਂ",
        "ਰੂਪ ਤੇਰਾ ਐਸਾ, ਜਿਵੇਂ ਬਹਾਰਾਂ ਦਾ ਮੌਸਮ"
      ]
    };

    // Fallback if language not found
    if (!poetryDB[language]) {
      return await sock.sendMessage(chatId, {
        text: `❌ Language not supported. Choose from: ${Object.keys(poetryDB).join(', ')}`,
        ...channelInfo
      }, { quoted: message });
    }

    // Get random poetry line
    const lines = poetryDB[language];
    const randomLine = lines[Math.floor(Math.random() * lines.length)];

    // Determine quoted message (if replying)
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ? message
      : null;

    // Send the poetry
    await sock.sendMessage(chatId, {
      text: `📜 *Poetry (${language})*\n\n${randomLine}`,
      ...channelInfo
    }, { quoted: quotedMsg || message });
  }
};
