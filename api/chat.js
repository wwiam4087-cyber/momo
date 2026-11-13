export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.api_key ? process.env.api_key.trim() : null;

  if (!apiKey) {
    return res.status(500).json({ error: 'لم يتم العثور على المتغير api_key في إعدادات السيرفر.' });
  }

  const { message, history } = req.body;

  const systemInstruction = `
    أنت "مومو" (Momo)، كائن افتراضي لطيف جداً، مرح، ومشجع، مهمتك تعليم اللغة الصينية للمتحدثين بالعربية من خلال المحادثة والتواصل اليومي.
    قواعدك في الرد:
    1. تحدث بلهجة ودودة ولطيفة واستخدم الرموز التعبيرية المناسبة (مثل 🐼، ✨، 🌸، 🎉).
    2. عند تعليم أي كلمة أو جملة صينية، اكتبها دائماً بثلاثة أشكال:
       - الرموز الصينية (Hanzi)
       - النطق بالحروف اللاتينية مع التشكيل الصوتي (Pinyin)
       - المعنى بالعربية.
    3. شجع المستخدم دائماً، وصحح أخطاءه بلطف شديد.
    4. اجعل ردودك قصيرة وتفاعلية، واختم ردك دائماً بسؤال بسيط أو تحدٍ صغير بالصينية لتحفيز المستخدم على الرد.
  `;

  try {
    // تجهيز الرسائل بالشكل المتوافق مع OpenAI / OpenRouter
    const messages = [
      { role: 'system', content: systemInstruction },
      { role: 'assistant', content: 'أهلاً بك! أنا مومو 🐼✨ مستعد لتعليمك اللغة الصينية بكل مرح! لنبدأ!' },
      ...(history || []).map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com', // مطلوب من OpenRouter
        'X-Title': 'Momo Chinese Tutor'       // اسم التطبيق اختياري
      },
      body: JSON.stringify({
        // نستخدم نموذجاً ذكياً وسريعاً ومتوفراً غالباً بشكل مجاني أو رخيص على OpenRouter
        model: 'openai/gpt-4o-mini', 
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `خطأ من OpenRouter (${response.status}): ${data.error?.message || JSON.stringify(data)}` 
      });
    }

    const replyText = data.choices?.[0]?.message?.content;
    if (!replyText) {
      return res.status(500).json({ error: 'لم يرسل النموذج أي رد نصي.' });
    }

    res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `خطأ تقني في السيرفر: ${error.message}` });
  }
}
