"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  const { messages, sendMessage, addWelcomeMessage } = useChatStore();
  const { user } = useAuthStore(); 

  // ✅ ONLY FIX
  const isTyping = false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      addWelcomeMessage(user.username || "Citizen", user.impact_score || 0);
    }
  }, [isOpen, user, addWelcomeMessage]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    
    await sendMessage(text, user?.username || "Citizen", user?.impact_score || 0);
  };

  if (!isMounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-emerald-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold">Civic Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-emerald-50"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                   <div className="text-xs text-emerald-500 animate-pulse bg-zinc-800/50 px-3 py-1 rounded-full">
                     Assistant is thinking...
                   </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about traffic or points..."
                className="flex-1 bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button onClick={handleSend} className="p-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 transition-colors">
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X size={28} className="text-white" /> : <MessageCircle size={28} className="text-white" />}
      </button>
    </div>
  );
}