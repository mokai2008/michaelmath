"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle2, Sparkles, Bot } from "lucide-react";
import { saveApiKeys } from "./actions";

export default function AdminSettingsPage() {
  const [stripeKey, setStripeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage("");
    const result = await saveApiKeys(stripeKey, openaiKey, anthropicKey);
    setIsSaving(false);
    if (result.success) {
      setSuccessMessage("Settings saved successfully to .env.local!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      alert("Failed to save settings.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Platform Settings</h1>
          <p className="text-text/60 text-sm">Configure your LMS preferences and integrations.</p>
        </div>
        <div className="flex items-center gap-4">
          {successMessage && (
            <span className="text-green-600 text-sm font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </span>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-4">Payment Integrations</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Stripe Secret Key</label>
              <input 
                type="password" 
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                placeholder="sk_test_..." 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI Assistant & Co-Pilot Integrations
            </h3>
            <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Dual-Model Balancing Active
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Anthropic (Claude) API Key 
                <span className="text-xs text-purple-600 font-semibold ml-2">(Powers Claude 3.7 Sonnet & Vision)</span>
              </label>
              <input 
                type="password" 
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..." 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                OpenAI (ChatGPT) API Key 
                <span className="text-xs text-emerald-600 font-semibold ml-2">(Powers GPT-4o & Vision)</span>
              </label>
              <input 
                type="password" 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..." 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
