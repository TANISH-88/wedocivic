import api from "@/lib/api";

export const authService = {
  register: (d: { name:string; username:string; email:string; password:string; city:string; state:string }) => 
    api.post("/auth/register", d),

  // NEW: Authority Registration Service
  registerAuthority: (d: { 
    name: string; 
    username: string; 
    email: string; 
    password: string; 
    designation: string; 
    organization: string ;
    city: string;   // <-- ADD THIS
    state: string;  // <-- ADD THIS
  }) => api.post("/auth/register/authority", d),

  login: (d: { email:string; password:string }) => 
    api.post("/auth/login", d),

  googleAuth: (id_token: string) => 
    api.post("/auth/google", { id_token }),

  forgotPassword: (email: string) => 
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, new_password: string) => 
    api.post("/auth/reset-password", { token, new_password }),
};