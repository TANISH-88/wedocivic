"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Reset failed — token may be expired");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 py-10">
        <p className="text-4xl">🔗</p>
        <h3 className="font-bold text-lg text-slate-800">Invalid Reset Link</h3>
        <p className="text-sm text-slate-500">This link is missing a token. Please request a new reset link.</p>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 text-sm text-civic-600 font-semibold hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  return success ? (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="font-bold text-lg text-slate-800">Password Reset!</h3>
      <p className="text-sm text-slate-500">Your password has been changed. Redirecting to login…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">New Password</label>
        <div className="relative">
          <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 characters" required minLength={8}
            className={cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all pr-10",
              "border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Re-enter password" required minLength={8}
          className={cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all",
            password && confirm && password !== confirm ? "border-red-300 bg-red-50" : "border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100")} />
        {password && confirm && password !== confirm && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
      </div>
      <button type="submit" disabled={loading || password.length < 8 || password !== confirm}
        className="w-full py-3 bg-gradient-to-r from-civic-600 to-civic-500 text-white font-bold rounded-xl hover:from-civic-700 hover:to-civic-600 disabled:opacity-60 transition-all shadow-green flex items-center justify-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Reset Password</>}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-civic-700 to-emerald-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%,white 2px,transparent 2px)", backgroundSize: "48px 48px" }} />
        <div className="relative text-white max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
            <span className="font-display font-bold text-2xl">CI</span>
          </div>
          <h2 className="font-display text-4xl font-bold mb-4 leading-tight">Set a new<br />password.</h2>
          <p className="text-white/80 text-lg leading-relaxed">Choose a strong password to secure your CivicImpact account.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-civic-500 to-civic-700 flex items-center justify-center mx-auto mb-4 shadow-green">
              <KeyRound className="text-white h-5 w-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-800">New Password</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your new password below</p>
          </div>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-civic-500" /></div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
