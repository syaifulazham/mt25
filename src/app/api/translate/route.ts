import { NextRequest, NextResponse } from "next/server";

// Add OpenAI API integration
export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json();
    
    // Validate the input
    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Text and target language are required" },
        { status: 400 }
      );
    }
    
    // Get the OpenAI API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key is missing");
      return NextResponse.json(
        { error: "Translation service configuration error" },
        { status: 500 }
      );
    }
    
    // Prepare the language name for better prompting
    let languageName;
    switch (targetLang) {
      case 'my':
        languageName = 'Malay';
        break;
      case 'zh':
        languageName = 'Chinese';
        break;
      case 'ta':
        languageName = 'Tamil';
        break;
      case 'en':
        languageName = 'English';
        break;
      default:
        languageName = targetLang;
    }
    
    // Build the OpenAI API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the provided text to ${languageName} accurately and naturally. Return ONLY the translated text without any explanations or additional context.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Translation service error' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    const translatedText = data.choices[0].message.content.trim();
    
    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'An error occurred during translation' },
      { status: 500 }
    );
  }
}
