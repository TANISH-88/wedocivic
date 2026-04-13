"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Shield, Eye, EyeOff, Loader2, ArrowRight, UserSquare2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Import your actual auth service and store
import { authService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";

// Styling function for inputs
function iCls(e: boolean) {
  return cn("w-full px-4 py-2.5 pl-10 rounded-xl border text-sm outline-none transition-all bg-white",
    e ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100");
}

export default function AuthorityLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore(); // Bring in the Zustand store
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Your backend login expects an "email", so we map the identifier to it
      const payload = {
        email: data.identifier.toLowerCase(),
        password: data.password
      };
      
      // Call the real backend API
      const res = await authService.login(payload);
      
      // Save the Authority user and token to your global state
      setAuth(res.data.user, res.data.token);
      
      toast.success("Official access granted. Welcome back!");
      
      // THE FIX: Redirects to the Main Home/Social Feed (/) instead of /leaderboard
      router.push("/"); 
      
    } catch (error: any) {
      // Show the actual error from the backend if it fails
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Invalid authority credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="bg-slate-900 px-8 py-8 text-center text-white flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Authority Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Secure access for verified officials</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
          
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
            <div className="relative">
              <UserSquare2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                {...register("identifier", { required: "Email is required" })} 
                placeholder="official@gov.in" 
                className={iCls(!!errors.identifier)} 
              />
            </div>
            {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier.message as string}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type={showPassword ? "text" : "password"} 
                {...register("password", { required: "Password is required" })} 
                placeholder="Enter secure password" 
                className={cn(iCls(!!errors.password), "pr-10")} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message as string}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Secure Login</>}
          </button>
        </form>

        <div className="px-8 pb-8 text-center space-y-4">
          <p className="text-sm text-slate-500">
            Need an official account? <Link href="/authority/register" className="text-emerald-600 font-bold hover:underline">Verify here</Link>
          </p>
          
          <div className="w-full h-px bg-slate-100" />
          
          <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors">
            Return to Citizen Portal
          </Link>
        </div>
      </div>
    </div>
  );
}