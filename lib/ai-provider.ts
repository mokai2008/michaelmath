import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Clean API key string from hidden unicode characters
function sanitizeKey(key?: string): string {
  return (key || '').replace(/[\u2028\u2029\r\n\s]/g, '').trim();
}

const openaiApiKey = sanitizeKey(process.env.OPENAI_API_KEY);
const anthropicApiKey = sanitizeKey(process.env.ANTHROPIC_API_KEY);

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

export type AIProvider = 'auto' | 'claude' | 'gpt';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: string | null;
}

export interface AIResponse {
  reply: string;
  provider: 'claude' | 'gpt' | 'mock';
  model: string;
}

// Global toggle memory for round-robin balancing
let autoToggleCounter = 0;

/**
 * Generate AI Response using OpenAI GPT or Anthropic Claude with balancing & fallback
 */
export async function generateAIResponse({
  messages,
  systemPrompt,
  preferredProvider = 'auto',
}: {
  messages: ChatMessage[];
  systemPrompt: string;
  preferredProvider?: AIProvider;
}): Promise<AIResponse> {
  // Determine primary provider to attempt
  let targetProvider: 'claude' | 'gpt' = 'claude';

  if (preferredProvider === 'claude') {
    targetProvider = 'claude';
  } else if (preferredProvider === 'gpt') {
    targetProvider = 'gpt';
  } else {
    // 'auto' mode: load balance between available providers
    if (openai && anthropic) {
      autoToggleCounter++;
      targetProvider = autoToggleCounter % 2 === 0 ? 'claude' : 'gpt';
    } else if (anthropic) {
      targetProvider = 'claude';
    } else if (openai) {
      targetProvider = 'gpt';
    }
  }

  // Attempt primary provider, fallback to secondary if failure occurs
  if (targetProvider === 'claude') {
    if (anthropic) {
      try {
        return await callClaude(messages, systemPrompt);
      } catch (err) {
        console.warn('Claude API failed, trying OpenAI fallback:', err);
        if (openai) {
          return await callOpenAI(messages, systemPrompt);
        }
      }
    } else if (openai) {
      return await callOpenAI(messages, systemPrompt);
    }
  } else {
    if (openai) {
      try {
        return await callOpenAI(messages, systemPrompt);
      } catch (err) {
        console.warn('OpenAI API failed, trying Claude fallback:', err);
        if (anthropic) {
          return await callClaude(messages, systemPrompt);
        }
      }
    } else if (anthropic) {
      return await callClaude(messages, systemPrompt);
    }
  }

  // If no working API keys or all failed, return helpful mock response
  return {
    reply: "API Key Notice: Please configure `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in your `.env.local` file to enable live AI responses from Claude or ChatGPT.",
    provider: 'mock',
    model: 'Demo Mode'
  };
}

/**
 * Call Anthropic Claude API (claude-3-7-sonnet-20250219)
 */
async function callClaude(messages: ChatMessage[], systemPrompt: string): Promise<AIResponse> {
  if (!anthropic) throw new Error('Anthropic client uninitialized');

  const modelName = 'claude-3-7-sonnet-20250219';

  // Anthropic messages format
  const formattedMessages: Anthropic.MessageParam[] = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      if (m.image) {
        // Parse base64 image data url: "data:image/jpeg;base64,..."
        const match = m.image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (match) {
          const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
          const base64Data = match[2];
          return {
            role: m.role === 'user' ? 'user' : 'assistant',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: m.content || 'Please inspect this attached image.',
              },
            ],
          };
        }
      }

      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      };
    });

  const response = await anthropic.messages.create({
    model: modelName,
    system: systemPrompt,
    messages: formattedMessages,
    max_tokens: 1500,
    temperature: 0.7,
  });

  const textBlocks = response.content.filter(block => block.type === 'text');
  const replyText = textBlocks.map(b => (b as any).text).join('\n') || 'No response text received from Claude.';

  return {
    reply: replyText,
    provider: 'claude',
    model: 'Claude 3.7 Sonnet',
  };
}

/**
 * Call OpenAI API (gpt-4o)
 */
async function callOpenAI(messages: ChatMessage[], systemPrompt: string): Promise<AIResponse> {
  if (!openai) throw new Error('OpenAI client uninitialized');

  const modelName = 'gpt-4o';

  const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.role !== 'system')
      .map((m): OpenAI.ChatCompletionMessageParam => {
        if (m.role === 'user' && m.image) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content || 'Please inspect this image.' },
              { type: 'image_url', image_url: { url: m.image } },
            ],
          };
        }
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        };
      }),
  ];

  const response = await openai.chat.completions.create({
    model: modelName,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 1500,
  });

  const replyText = response.choices[0]?.message?.content || 'No response text received from OpenAI.';

  return {
    reply: replyText,
    provider: 'gpt',
    model: 'GPT-4o',
  };
}
