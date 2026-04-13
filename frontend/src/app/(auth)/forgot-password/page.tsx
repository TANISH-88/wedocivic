"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      toast.success("Check your email for the reset link!");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Something went wrong");
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
          <h2 className="font-display text-4xl font-bold mb-4 leading-tight">Forgot your<br />password?</h2>
          <p className="text-white/80 text-lg leading-relaxed">No worries — we&apos;ll send you a reset link to get back into your account.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-civic-500 to-civic-700 flex items-center justify-center mx-auto mb-4 shadow-green">
              <Mail className="text-white h-5 w-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-800">Reset Password</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your email and we&apos;ll send a reset link</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Check your inbox!</h3>
              <p className="text-sm text-slate-500">
                If <span className="font-semibold text-slate-700">{email}</span> is registered, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-xs text-slate-400">The link will expire in 1 hour.</p>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-civic-600 font-semibold hover:underline mt-4">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all",
                    "border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100")}
                />
              </div>
              <button type="submit" disabled={loading || !email.trim()}
                className="w-full py-3 bg-gradient-to-r from-civic-600 to-civic-500 text-white font-bold rounded-xl hover:from-civic-700 hover:to-civic-600 disabled:opacity-60 transition-all shadow-green flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link</>}
              </button>
              <p className="text-center text-sm text-slate-500 mt-4">
                Remember your password?{" "}
                <Link href="/login" className="text-civic-600 font-bold hover:underline">Log in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
