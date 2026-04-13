"use client";
import { useState, useEffect } from "react";
import { X, Users, AtSign, Check, AlignLeft, Globe, ShieldCheck } from "lucide-react";
import { userService, groupService } from "@/services/index";
import Avatar from "@/components/ui/Avatar";

// modalType: "group" | "official" | "community"
export default function CreateGroupModal({ isOpen, onClose, onSuccess, currentUser, modalType = "group" }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isCommunity = modalType === "community";
  const isOfficial  = modalType === "official";   // ← NEW

  useEffect(() => {
    const uid = currentUser?.id || currentUser?._id;
    if (isOpen && uid) {
      userService.getFollowing(uid).then(({ data }) => {
        setFriends(data.users || []);
      });
    }
  }, [isOpen, currentUser]);

  const toggleFriend = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    // Fix: is_official should only be true for "official" type, not for "community"
    const isOfficialGroup = modalType === "official";
    const isCommunityGroup = modalType === "community";
    
    console.log("Creating group with modalType:", modalType);
    console.log("is_official:", isOfficialGroup, "is_community:", isCommunityGroup);
    
    try {
      await groupService.createGroup({ 
        name, 
        slug, 
        description, 
        initial_members: selectedIds,
        is_community: isCommunityGroup,  // true only for "community"
        is_official:  isOfficialGroup,   // true only for "official"
      } as any);
      
      onSuccess(); 
      onClose();   
      setName(""); setSlug(""); setDescription(""); setSelectedIds([]);
    } catch (err) {
      alert(`Error creating ${isCommunityGroup ? 'community' : isOfficialGroup ? 'official hub' : 'group'}. Make sure the handle is unique!`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Header color/icon based on type
  const headerIcon = isCommunity 
    ? <Globe className="text-purple-600 h-5 w-5" /> 
    : isOfficial 
      ? <ShieldCheck className="text-blue-600 h-5 w-5" />
      : <Users className="text-civic-600 h-5 w-5" />;

  const headerTitle = isCommunity 
    ? "Create New Community" 
    : isOfficial 
      ? "Create Official Hub" 
      : "Create New Group";

  const submitBtnClass = isCommunity 
    ? "bg-purple-600 hover:bg-purple-700" 
    : isOfficial 
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-civic-600 hover:bg-civic-700 shadow-green";

  const submitLabel = isCommunity ? "Launch Community" : isOfficial ? "Launch Official Hub" : "Launch Group";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {headerIcon}
            {headerTitle}
          </h2>
          <button onClick={onClose} type="button" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-bold text-slate-700">
                {isCommunity ? "Community Name" : isOfficial ? "Official Hub Name" : "Group Name"}
              </label>
              <input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full mt-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-civic-500 outline-none" 
                placeholder={
                  isCommunity ? "e.g. Lucknow City Network" 
                  : isOfficial ? "e.g. Lucknow Municipal Corp"
                  : "e.g. Lucknow Green Warriors"
                } 
              />
            </div>

            {/* Slug */}
            <div>
              <label className="text-sm font-bold text-slate-700">Unique Handle (Slug)</label>
              <div className="relative mt-1">
                <AtSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input 
                  required 
                  value={slug} 
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s/g, '_'))} 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-civic-500 outline-none" 
                  placeholder={
                    isCommunity ? "lucknow_network" 
                    : isOfficial ? "lucknow_mmc"
                    : "nature_cleanup_lko"
                  } 
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-bold text-slate-700">Description</label>
              <div className="relative mt-1">
                <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={2}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-civic-500 outline-none resize-none" 
                  placeholder={`What is this ${isCommunity ? 'community' : isOfficial ? 'official hub' : 'group'} about?`} 
                />
              </div>
            </div>
          </div>

          {/* Invite Connections */}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">
              Invite Connections ({selectedIds.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-2xl p-2 space-y-1 scrollbar-thin bg-slate-50/50">
              {friends.filter(f => f.id !== (currentUser?.id || currentUser?._id)).length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No connections found to invite.</p>
              ) : (
                friends
                  .filter(f => f.id !== (currentUser?.id || currentUser?._id))
                  .map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => toggleFriend(f.id)} 
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        selectedIds.includes(f.id) ? 'bg-white border border-civic-200 shadow-sm' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={f.avatar?.url} name={f.name} size="sm" />
                        <span className="text-sm font-medium text-slate-700">{f.name}</span>
                      </div>
                      {selectedIds.includes(f.id) && <Check className="h-4 w-4 text-civic-600" />}
                    </div>
                  ))
              )}
            </div>
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className={`w-full py-3 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 ${submitBtnClass}`}
          >
            {loading 
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 
              : submitLabel
            }
          </button>
        </form>
      </div>
    </div>
  );
}