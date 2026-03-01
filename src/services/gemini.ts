import { GoogleGenAI, Type, Modality } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { 
    text?: string; 
    inlineData?: { mimeType: string; data: string };
    videoUri?: string;
  }[];
  type?: 'text' | 'image' | 'search' | 'reasoning' | 'video' | 'audio';
  groundingMetadata?: any;
}

export async function generateOmniResponse(
  prompt: string,
  tool: 'chat' | 'image' | 'search' | 'reasoning' | 'video' | 'audio'
) {
  if (!API_KEY) throw new Error("API Key not found");

  const modelName = tool === 'reasoning' ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  if (tool === 'audio') {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Generate a sound or speech for: ${prompt}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return { 
      text: "Audio sequence generated successfully.", 
      audio: audioData,
      type: 'audio' 
    };
  }

  if (tool === 'video') {
    // Note: Video generation requires polling and special handling in the UI
    // This function will just initiate the operation
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
    return { operation, type: 'video' };
  }

  if (tool === 'search') {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are OmniMind. Use search results to provide accurate information. Be friendly, use emojis, and be helpful! ✨",
      }
    });
    return {
      text: response.text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata,
      type: 'search'
    };
  }

  if (tool === 'image') {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return {
        text: "Visual asset rendered.",
        image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
        type: 'image'
      };
    }
    return { text: response.text, type: 'text' };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are OmniMind, a super-intelligent AI with access to multiple tools. Be friendly, use emojis, and be helpful! 🚀✨",
    }
  });

  return {
    text: response.text,
    groundingMetadata: response.candidates?.[0]?.groundingMetadata,
    type: tool
  };
}

export async function pollVideoOperation(operation: any) {
  let currentOp = operation;
  while (!currentOp.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
  }
  return currentOp;
}
