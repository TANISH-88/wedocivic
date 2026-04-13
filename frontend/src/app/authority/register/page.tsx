"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ShieldCheck, Upload, ArrowRight, User, Mail, Lock, Eye, EyeOff, Building, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Imports for auth logic
import { authService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";

function iCls(e: boolean) {
  return cn("w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white",
    e ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100");
}

export default function AuthorityRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm();
  
  const selectedPost = watch("post");

  const onVerifyClick = async () => {
    // ✅ Make sure city and state are validated before moving to step 2
    const isStep1Valid = await trigger(["name", "post", "organization", "city", "state"]);
    if (selectedPost === "Other") {
        const isOtherValid = await trigger("otherPost");
        if (!isOtherValid) return;
    }

    if (isStep1Valid) {
      setStep(2);
    } else {
      toast.error("Please fill in all required official details.");
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const designation = data.post === "Other" ? data.otherPost : data.post;

      // ✅ Added city and state to the payload sent to the backend
      const payload = {
        name: data.name,
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        password: data.password,
        designation: designation,
        organization: data.organization,
        city: data.city,
        state: data.state,
        proof_url: "" 
      };

      const res = await authService.registerAuthority(payload);
      
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome, ${designation} ${data.name.split(" ")[0]}! 🎖️`);
      router.push("/leaderboard");
      
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0].msg : (detail || "Registration failed");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 text-white flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl">Authority Registration</h1>
            <p className="text-slate-400 text-xs">
              {step === 1 ? "Step 1: Official Verification" : "Step 2: Account Credentials"}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-in-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
          
          {/* STEP 1 */}
          <div className={cn("space-y-5 transition-all duration-300", step === 1 ? "block" : "hidden")}>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Full Name</label>
              <input {...register("name", { required: "Name is required" })} placeholder="Official Name" className={iCls(!!errors.name)} />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Designated Post</label>
              <select {...register("post", { required: "Please select a post" })} className={iCls(!!errors.post)}>
                <option value="">Select your role...</option>
                <option value="District Magistrate">District Magistrate</option>
                <option value="MLA">MLA</option>
                <option value="Other">Other (Specify manually)</option>
              </select>
            </div>

            {selectedPost === "Other" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Specify Post</label>
                <input {...register("otherPost", { required: "Please specify your post" })} placeholder="e.g. Chief Medical Officer" className={iCls(!!errors.otherPost)} />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Name of Organization</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input {...register("organization", { required: "Organization is required" })} placeholder="e.g. Ministry of Health" className={cn(iCls(!!errors.organization), "pl-10")} />
              </div>
            </div>

            {/* ✅ NEW: City and State Fields for Authority */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">City</label>
                <input 
                  {...register("city", { required: "City is required" })} 
                  placeholder="e.g. Lucknow" 
                  className={iCls(!!errors.city)} 
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">State</label>
                <input 
                  {...register("state", { required: "State is required" })} 
                  placeholder="e.g. Uttar Pradesh" 
                  className={iCls(!!errors.state)} 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Upload Proof (ID/Letter)</label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-medium">
                  {fileName ? fileName : "Click to upload document"}
                </span>
              </div>
            </div>

            <button type="button" onClick={onVerifyClick} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4">
              Verify Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* STEP 2 */}
          <div className={cn("space-y-5 transition-all duration-300", step === 2 ? "block animate-in fade-in slide-in-from-right-4" : "hidden")}>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input {...register("username", { required: "Username is required" })} placeholder="Choose a username" className={cn(iCls(!!errors.username), "pl-10")} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="email" {...register("email", { required: "Email is required" })} placeholder="official@gov.in" className={cn(iCls(!!errors.email), "pl-10")} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showPassword ? "text" : "password"} {...register("password", { required: "Password is required" })} placeholder="Create a secure password" className={cn(iCls(!!errors.password), "pl-10 pr-10")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" disabled={loading} onClick={() => setStep(1)} className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50">
                Back
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-70">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
              </button>
            </div>
          </div>

        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-sm text-slate-500">Already verified? <Link href="/authority/login" className="text-emerald-600 font-bold hover:underline">Log in here</Link></p>
        </div>
      </div>
    </div>
  );
}