"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { authService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState:{errors} } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (v: RegisterInput) => {
    setLoading(true);
    try {
      // ✅ FIX: Send the required city and state fields to the backend!
      const payload = {
        name: v.name!,
        username: v.username!,
        email: v.email!,
        password: v.password!,
        city: v.city!,     // Added
        state: v.state!,   // Added
      };

      const { data } = await authService.register(payload);
      
      setAuth(data.user, data.token);
      toast.success("Welcome to CivicImpact! 🌱 Start posting to earn impact points!");
      router.push("/");
    } catch (e: any) { 
      const detail = e?.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : (typeof detail === "string" ? detail : "Registration failed");
      toast.error(errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-civic-700 to-emerald-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 75% 75%,white 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="relative text-white max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
            <span className="font-display font-bold text-2xl">CI</span>
          </div>
          <h2 className="font-display text-4xl font-bold mb-4">Start your impact journey.</h2>
          <p className="text-white/80 text-lg mb-6">Create your profile, share your work, earn impact points.</p>
          <div className="space-y-2.5">
            {["✅ Free public impact profile","⚡ Earn points for contributions","📅 Join volunteer events","🏆 Climb the leaderboard"].map(t=>(
              <p key={t} className="text-sm text-white/90">{t}</p>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-civic-500 to-civic-700 flex items-center justify-center mx-auto mb-4 shadow-green">
              <span className="text-white font-bold text-lg">CI</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-800">Join CivicImpact</h1>
            <p className="text-slate-500 text-sm mt-1">Create your free account</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {([["name","Full name","Your name"],["username","Username","yourhandle"],["email","Email","you@example.com"]] as const).map(([key,label,ph]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">{label}</label>
                <input {...register(key as any)} placeholder={ph} className={iCls(!!(errors as any)[key])} />
                {(errors as any)[key] && <p className="text-xs text-red-500 mt-1">{(errors as any)[key].message}</p>}
              </div>
            ))}
            
            {/* ✅ NEW: City and State Fields */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">City</label>
                <input 
                  {...register("city" as any)} 
                  placeholder="e.g. Lucknow" 
                  className={iCls(!!(errors as any).city)} 
                />
                {(errors as any).city && <p className="text-xs text-red-500 mt-1">{(errors as any).city.message}</p>}
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">State</label>
                <input 
                  {...register("state" as any)} 
                  placeholder="e.g. Uttar Pradesh" 
                  className={iCls(!!(errors as any).state)} 
                />
                {(errors as any).state && <p className="text-xs text-red-500 mt-1">{(errors as any).state.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
              <div className="relative">
                <input {...register("password")} type={show?"text":"password"} placeholder="Min. 8 characters" className={cn(iCls(!!errors.password),"pr-10")} />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show?<EyeOff className="h-4 w-4" />:<Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-civic-600 to-civic-500 text-white font-bold rounded-xl hover:from-civic-700 hover:to-civic-600 disabled:opacity-60 transition-all shadow-green flex items-center justify-center gap-2 mt-2">
              {loading?<Loader2 className="h-4 w-4 animate-spin" />:<><Sparkles className="h-4 w-4" />Create Account</>}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">Have an account? <Link href="/login" className="text-civic-600 font-bold hover:underline">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
function iCls(e:boolean) {
  return cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all",
    e?"border-red-300 bg-red-50":"border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100");
}