"use server";

import fs from 'fs';
import path from 'path';

export async function saveApiKeys(stripeKey: string, openaiKey: string) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or append Stripe
    if (stripeKey) {
      const cleanStripe = stripeKey.replace(/[\u2028\u2029\r\n\s]/g, '').trim();
      if (envContent.includes('STRIPE_SECRET_KEY=')) {
        envContent = envContent.replace(/STRIPE_SECRET_KEY=.*/g, `STRIPE_SECRET_KEY="${cleanStripe}"`);
      } else {
        envContent += `\nSTRIPE_SECRET_KEY="${cleanStripe}"`;
      }
      process.env.STRIPE_SECRET_KEY = cleanStripe;
    }

    // Update or append OpenAI
    if (openaiKey) {
      const cleanOpenAI = openaiKey.replace(/[\u2028\u2029\r\n\s]/g, '').trim();
      if (envContent.includes('OPENAI_API_KEY=')) {
        envContent = envContent.replace(/OPENAI_API_KEY=.*/g, `OPENAI_API_KEY="${cleanOpenAI}"`);
      } else {
        envContent += `\nOPENAI_API_KEY="${cleanOpenAI}"`;
      }
      process.env.OPENAI_API_KEY = cleanOpenAI;
    }



    fs.writeFileSync(envPath, envContent.trim() + '\n');
    return { success: true };
  } catch (err) {
    console.error("Error saving to .env.local", err);
    return { success: false, error: "Failed to write to .env.local" };
  }
}
