"use client";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Plus, X, Save, User } from "lucide-react";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { userService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import { CATEGORIES, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const SKILL_SUGGESTIONS = ["Community Organizing","Fundraising","Public Speaking","Social Media","Event Planning","Legal Aid","Healthcare","Education","Technology","Journalism","Graphic Design","Translation"];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [preview,    setPreview]    = useState(user?.avatar?.url ?? "");
  const [skills,     setSkills]     = useState<string[]>(user?.skills    ?? []);
  const [interests,  setInterests]  = useState<string[]>(user?.interests ?? []);
  const [si, setSi] = useState(""); const [ii, setIi] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { register, handleSubmit, formState:{errors} } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name:user?.name??"", bio:user?.bio??"", location:user?.location??"", website:user?.website??"", category:(user?.category as any)??"Citizen" },
  });

  const addTag = (val:string, list:string[], set:(v:string[])=>void, setI:(v:string)=>void) => {
    const t = val.trim(); if (t && !list.includes(t) && list.length<15) set([...list,t]); setI("");
  };

  const onSubmit = async (v: ProfileInput) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(v).forEach(([k,val]) => { if (val!=null) fd.append(k,String(val)); });
      fd.append("skills",    skills.join(","));
      fd.append("interests", interests.join(","));
      if (avatarFile) fd.append("avatar", avatarFile);
      const { data } = await userService.updateProfile(fd);
      if (data.user) setUser({ ...user!, ...data.user });
      toast.success("Profile updated! ✨");
    } catch (e:any) { toast.error(e?.response?.data?.detail ?? "Update failed"); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setPasswordLoading(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully! 🔒");
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-civic-50 flex items-center justify-center"><User className="h-5 w-5 text-civic-600" /></div>
        <div><h1 className="font-display font-bold text-xl text-slate-800">Edit Profile</h1><p className="text-xs text-slate-400">Update your public profile</p></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar */}
        <div className="card p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">Profile photo</p>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl ring-4 ring-slate-100 overflow-hidden bg-civic-50">
                {(preview||user.avatar?.url)
                  ? <img src={preview||user.avatar?.url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="text-xl font-bold text-civic-600">{user.name?.[0]}</span></div>}
              </div>
              <button type="button" onClick={()=>fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-civic-600 text-white rounded-full flex items-center justify-center shadow-green hover:bg-civic-700 transition-colors">
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e=>{ const f=e.target.files?.[0]; if(f){setAvatarFile(f);setPreview(URL.createObjectURL(f));} }} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">@{user.username}</p>
              <button type="button" onClick={()=>fileRef.current?.click()} className="mt-2 text-xs text-civic-600 font-semibold hover:underline">Change photo</button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700">Basic information</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Full name" error={errors.name?.message}><input {...register("name")} className={iCls(!!errors.name)} /></F>
            <F label="Category"><select {...register("category")} className={iCls(false)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></F>
          </div>
          <F label="Bio" error={errors.bio?.message}><textarea {...register("bio")} rows={3} placeholder="Tell people about your work…" className={cn(iCls(!!errors.bio),"resize-none")} /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Location"><input {...register("location")} placeholder="City, State" className={iCls(false)} /></F>
            <F label="Website" error={errors.website?.message}><input {...register("website")} placeholder="https://yoursite.com" className={iCls(!!errors.website)} /></F>
          </div>
        </div>

        {/* Skills */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-bold text-slate-700">Skills</p>
          {skills.length > 0 && <div className="flex flex-wrap gap-1.5">{skills.map(s=><span key={s} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full"><span>{s}</span><button type="button" onClick={()=>setSkills(skills.filter(x=>x!==s))} className="hover:text-red-500"><X className="h-3 w-3" /></button></span>)}</div>}
          <div className="flex gap-2"><input value={si} onChange={e=>setSi(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag(si,skills,setSkills,setSi);}}} placeholder="Add a skill…" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-civic-400" /><button type="button" onClick={()=>addTag(si,skills,setSkills,setSi)} className="p-2 bg-civic-600 text-white rounded-xl hover:bg-civic-700"><Plus className="h-4 w-4" /></button></div>
          <div className="flex flex-wrap gap-1.5">{SKILL_SUGGESTIONS.filter(s=>!skills.includes(s)).slice(0,6).map(s=><button key={s} type="button" onClick={()=>setSkills([...skills,s])} className="text-[11px] border border-dashed border-slate-200 text-slate-400 hover:border-civic-400 hover:text-civic-600 px-2.5 py-1 rounded-full transition-all">+ {s}</button>)}</div>
        </div>

        {/* Causes */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-bold text-slate-700">Causes & Interests</p>
          {interests.length > 0 && <div className="flex flex-wrap gap-1.5">{interests.map(i=><span key={i} className="flex items-center gap-1 text-xs bg-civic-50 text-civic-700 px-2.5 py-1 rounded-full"><span>#{i}</span><button type="button" onClick={()=>setInterests(interests.filter(x=>x!==i))} className="hover:text-red-500"><X className="h-3 w-3" /></button></span>)}</div>}
          <div className="flex gap-2"><input value={ii} onChange={e=>setIi(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag(ii,interests,setInterests,setIi);}}} placeholder="Add a cause (e.g. education)…" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-civic-400" /><button type="button" onClick={()=>addTag(ii,interests,setInterests,setIi)} className="p-2 bg-civic-600 text-white rounded-xl hover:bg-civic-700"><Plus className="h-4 w-4" /></button></div>
        </div>

        {/* Password Change */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Password & Security</p>
            {!showPasswordChange && (
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="text-xs text-civic-600 font-semibold hover:underline"
              >
                Change Password
              </button>
            )}
          </div>
          
          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
              <F label="Current Password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className={iCls(false)}
                  placeholder="Enter current password"
                />
              </F>
              <F label="New Password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className={iCls(false)}
                  placeholder="At least 8 characters"
                />
              </F>
              <F label="Confirm New Password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={iCls(false)}
                  placeholder="Re-enter new password"
                />
              </F>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2 bg-civic-600 text-white text-sm font-semibold rounded-lg hover:bg-civic-700 disabled:opacity-50 transition-colors"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          
          {!showPasswordChange && (
            <p className="text-xs text-slate-400">
              Last updated: Never • Keep your account secure with a strong password
            </p>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-civic-600 to-civic-500 text-white font-bold rounded-2xl hover:from-civic-700 hover:to-civic-600 disabled:opacity-60 transition-all shadow-green flex items-center justify-center gap-2">
          {loading?<Loader2 className="h-5 w-5 animate-spin" />:<><Save className="h-5 w-5" />Save Changes</>}
        </button>
      </form>
    </div>
  );
}
function F({ label, error, children }: { label:string; error?:string; children:React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>{children}{error&&<p className="text-xs text-red-500 mt-1">{error}</p>}</div>;
}
function iCls(e: boolean) {
  return cn("w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all",
    e?"border-red-300 bg-red-50":"border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100");
}
