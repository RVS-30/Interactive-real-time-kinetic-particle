import { GoogleGenAI, Type } from "@google/genai";
import { ParticleConfig } from '../store';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateParticleConfig = async (prompt: string): Promise<Partial<ParticleConfig>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a particle system configuration based on this description: "${prompt}". 
                 Think about colors, speed, and chaos (noise).
                 If the user mentions fire, use reds/oranges and high speed.
                 If water, blues and smooth motion.
                 If space, purples/blacks and slow motion.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            color1: { type: Type.STRING, description: "Primary hex color" },
            color2: { type: Type.STRING, description: "Secondary hex color" },
            particleSize: { type: Type.NUMBER, description: "Size of particles (0.05 to 0.5)" },
            speed: { type: Type.NUMBER, description: "Animation speed (0.1 to 5.0)" },
            noiseScale: { type: Type.NUMBER, description: "Chaos factor (0.1 to 3.0)" },
            interactionRadius: { type: Type.NUMBER, description: "How far the hand affects particles (1.0 to 5.0)" },
            particleCount: { type: Type.NUMBER, description: "Number of particles (1000 to 15000)" }
          },
          required: ["color1", "color2", "particleSize", "speed", "noiseScale"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Partial<ParticleConfig>;
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};