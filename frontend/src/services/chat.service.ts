import api from "@/lib/api";

export const chatService = {
  sendMessage: (content: string, name?: string, points?: number) => {
    // We are manually forcing the keys to match your Python ChatRequest
    const payload = { 
      message: content, 
      user_name: name || "Citizen", 
      user_points:  Math.floor(Number(points)) || 0
    };
    
    console.log("🚀 Payload being sent to FastAPI:", payload);
    
    return api.post("/chat/query", payload);
  }
};