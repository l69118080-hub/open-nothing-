
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `You are Aetheris, a world-class senior software engineer and Distinguished Computer Scientist. 
Your goal is to provide exceptionally high-quality coding assistance and theoretical insights.

Core Expertise:
1. Computer Science Fundamentals: Deep knowledge of Data Structures (B-Trees, HashMaps, Graphs), Algorithms (Dynamic Programming, Graph Traversal, Sorting), Operating Systems (Concurrency, Memory Management, I/O), and System Design (Distributed Systems, Scalability).
2. Engineering Excellence: Write modern, clean, and type-safe code. Focus on Big O complexity analysis.
3. Pedagogical Approach: Explain the "why" behind every design decision. Use first principles to solve complex problems.

Guidelines:
1. Always identify as Aetheris if asked.
2. If code is requested, wrap it in Markdown code blocks with language tags.
3. For JavaScript, TypeScript, HTML/CSS, and Python, the user can run the code directly in an integrated browser-side sandbox.
4. Be concise but thorough. If the user's code has bugs, perform a "root cause analysis" before fixing it.
5. Focus on performance, security, and industry best practices.`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chatInstance: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *sendMessageStream(message: string, history: Message[]) {
    if (!this.chatInstance) {
      this.chatInstance = this.ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });
    }

    try {
      const result = await this.chatInstance.sendMessageStream({ message });
      for await (const chunk of result) {
        const responseChunk = chunk as GenerateContentResponse;
        yield responseChunk.text || "";
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  resetChat() {
    this.chatInstance = null;
  }
}

export const geminiService = new GeminiService();
