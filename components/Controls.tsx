import React, { useState } from 'react';
import { useStore } from '../store';
import { generateParticleConfig } from '../services/gemini';
import { Sparkles, Loader2, AlertCircle, Settings2, X } from 'lucide-react';

const Controls: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  const setConfig = useStore(state => state.setConfig);
  const error = useStore(state => state.error);
  const setError = useStore(state => state.setError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const newConfig = await generateParticleConfig(prompt);
      setConfig(newConfig);
      setPrompt('');
    } catch (err) {
      setError("Failed to generate config. Check API Key or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-4 z-50 p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Settings2 size={24} />
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-50 w-80 max-w-[90vw]">
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl text-white">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-cyan-400" size={20} />
            <h1 className="font-semibold text-lg tracking-tight">Kinetic AI</h1>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-white/60 mb-4 leading-relaxed">
          Wave your hand to interact. Describe a mood or theme below to reshape the universe with Gemini.
        </p>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 'Cyberpunk Rain' or 'Mars Dust'"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-white/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 top-2 p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          </button>
        </form>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-200">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Controls;