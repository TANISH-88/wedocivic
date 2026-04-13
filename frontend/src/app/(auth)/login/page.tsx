"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// ADDED 'Shield' icon for the Authority button
import { Eye, EyeOff, Loader2, ArrowRight, Shield } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { authService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ 
    resolver: zodResolver(loginSchema) 
  });

  const onSubmit = async (v: LoginInput) => {
    setLoading(true);
    try {
      const { data } = await authService.login(v as { email: string; password: string });
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name?.split(" ")[0]}! 👋`);
      router.push("/leaderboard");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail[0].msg
        : (typeof detail === "string" ? detail : "Login failed");

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-civic-700 to-emerald-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%,white 2px,transparent 2px)", backgroundSize: "48px 48px" }} />
        <div className="relative text-white max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
            <span className="font-display font-bold text-2xl">CI</span>
          </div>
          <h2 className="font-display text-4xl font-bold mb-4 leading-tight">Making impact<br />together.</h2>
          <p className="text-white/80 text-lg leading-relaxed">Join thousands of citizens, NGOs, and volunteers collaborating for a better society.</p>
        </div>
      </div>
      
      {/* Added 'relative' to this container so the absolute buttons position correctly inside it */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white relative">
        
        {/* --- NEW AUTHORITY BUTTONS START --- */}
        <div className="absolute top-6 right-6 flex flex-col items-end z-10">
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-white rounded-full text-slate-700 text-sm font-bold border border-slate-200 shadow-sm">
            <Shield className="w-4 h-4 text-emerald-500" />
            Authority Access
          </div>
          <div className="flex gap-2">
            {/* Update the hrefs below to point to your actual Authority routes */}
            <Link href="/authority/register" className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
              Sign up
            </Link>
            <Link href="/authority/login" className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-all shadow-sm">
              Log in
            </Link>
          </div>
        </div>
        {/* --- NEW AUTHORITY BUTTONS END --- */}

        <div className="w-full max-w-sm mt-12 sm:mt-0">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-civic-500 to-civic-700 flex items-center justify-center mx-auto mb-4 shadow-green">
              <span className="text-white font-bold text-lg">CI</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-800">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Log in to CivicImpact</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email</label>
              <input {...register("email")} type="email" placeholder="you@example.com" className={iCls(!!errors.email)} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <Link href="/forgot-password" className="text-xs text-civic-600 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input {...register("password")} type={show ? "text" : "password"} placeholder="Your password" className={cn(iCls(!!errors.password), "pr-10")} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-civic-600 to-civic-500 text-white font-bold rounded-xl hover:from-civic-700 hover:to-civic-600 disabled:opacity-60 transition-all shadow-green flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" />Log in</>}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">No account? <Link href="/register" className="text-civic-600 font-bold hover:underline">Sign up free</Link></p>
        </div>
      </div>
    </div>
  );
}

function iCls(e: boolean) {
  return cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all",
    e ? "border-red-300 bg-red-50" : "border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100");
}