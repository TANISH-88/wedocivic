import { create } from "zustand";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export type ChatState = {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (msg: string, name: string, points: number) => Promise<void>;
  addWelcomeMessage: (name: string, points: number) => void;
  clearChat: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  
  clearChat: () => set({ messages: [], isTyping: false }),

  sendMessage: async (msg, name, points) => {
    // 1. Set loading state and add user message + placeholder
    set((state) => ({
      isTyping: true,
      messages: [
        ...state.messages,
        { role: "user", content: msg },
        { role: "assistant", content: "Thinking..." },
      ],
    }));

    try {
      // 2. Fix: Ensure /api prefix is included for Render
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      
      const res = await fetch(`${apiUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: msg,
          user_name: name,
          user_points: points,
          // 3. Fix: slice history BEFORE adding the new "Thinking..." message
          history: get().messages
            .filter(m => m.content !== "Thinking...") // Remove placeholders
            .slice(-6) // Send last 3 pairs
            .map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              content: m.content
            }))
        }),
      });

      const data = await res.json();

      set((state) => {
        const updated = [...state.messages];
        updated[updated.length - 1] = {
          role: "assistant",
          content: data.reply || "The assistant is processing your request...",
        };
        return { messages: updated, isTyping: false };
      });
    } catch {
      set((state) => {
        const updated = [...state.messages];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "The Civic Assistant is currently offline. Please try again later.",
        };
        return { messages: updated, isTyping: false };
      });
    }
  },

  addWelcomeMessage: (name, points) =>
    set((state) => {
      const alreadyAdded = state.messages.some(
        (m) => m.role === "assistant"
      );
      if (alreadyAdded) return state;

      return {
        messages: [
          ...state.messages,
          {
            role: "assistant",
            content: `Hey ${name}! You currently have ${points.toFixed(2)} Aura Points. Let's start earning!`,
          },
        ],
      };
    }),
}));
