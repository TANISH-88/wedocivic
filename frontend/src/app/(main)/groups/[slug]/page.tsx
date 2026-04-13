"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation"; 
import { groupService, userService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { Send, Users as UsersIcon, ChevronLeft, Hash, UserPlus, UserMinus, LogOut, X, Mail, Loader2, ShieldCheck, Lock, Bell, Check, Trophy, Globe, AtSign, ArrowRight, Trash2, Upload, RotateCcw } from "lucide-react"; 
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import InviteHubModal from "@/components/groups/InviteHubModal";

export default function GroupPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showHubInviteModal, setShowHubInviteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showCommunityInvitesModal, setShowCommunityInvitesModal] = useState(false);
  const [communityInvites, setCommunityInvites] = useState<any[]>([]);
  const [communityInvitesLoading, setCommunityInvitesLoading] = useState(false);
  const [showPointsDropdown, setShowPointsDropdown] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = group?.creator_id === String(user?.id || user?._id);

  const fetchGroupData = useCallback(async () => {
    if (!slug) return;
    try {
      const { data } = await groupService.getGroupBySlug(slug as string);
      if (data.success) {
        setGroup(data.group);
        const groupId = data.group.id || data.group._id;
        
        try {
          const [mRes, msgRes] = await Promise.all([
            groupService.getMembers(groupId),
            groupService.getMessages(groupId)
          ]);
          setMembers(mRes.data.members || []);
          setMessages(msgRes.data.messages || []);
        } catch (error) {
          console.warn("User might not have access yet.");
        }
      }
    } catch (err) { console.error("Error loading hub:", err); }
  }, [slug]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const groupId = group?.id || group?._id;
    if (!groupId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const wsProtocol = apiUrl.startsWith("https") ? "wss://" : "ws://";
    const wsHost = apiUrl.replace("https://", "").replace("http://", "");
    const wsUrl = `${wsProtocol}${wsHost}/groups/${groupId}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "system") {
        if (data.action === "kick") {
          const myId = String(user?.id || user?._id);
          if (data.user_id === myId) {
            alert("You have been removed from this hub by the admin.");
            router.push("/");
          } else { fetchGroupData(); }
        }
        return;
      }
      setMessages((prevMessages) => {
        if (prevMessages.some(m => m._id === data._id || m.id === data._id)) return prevMessages;
        return [...prevMessages, data];
      });
    };
    return () => { ws.close(); };
  }, [group, user, router, fetchGroupData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !group) return;
    const tempText = inputText;
    setInputText("");
    try {
      await groupService.sendMessage(group.id || group._id, tempText);
    } catch (err) { console.error("Failed to send message:", err); }
  };

  const handleOpenInviteClick = async () => {
    if (group.is_community) {
      setShowHubInviteModal(true);
    } else {
      setInviteLoading(true);
      try {
        const myId = String(user?.id || user?._id);
        const [followingRes, followersRes] = await Promise.all([
          userService.getFollowing(myId),
          userService.getFollowers(myId)
        ]);
        const combined = [...(followingRes.data?.following || []), ...(followersRes.data?.followers || [])];
        const memberIds = members.map(m => String(m.id || m._id));
        const uniqueMap = new Map();
        combined.forEach(u => {
          const userId = String(u.id || u._id);
          if (userId !== myId && !memberIds.includes(userId)) {
            uniqueMap.set(userId, { ...u, id: userId, name: u.name || u.username || "Anonymous", followsMe: (followersRes.data?.followers || []).some((f:any) => String(f.id || f._id) === userId) });
          }
        });
        setFriends(Array.from(uniqueMap.values()));
        setShowInviteModal(true);
      } catch (err) { console.error(err); } finally { setInviteLoading(false); }
    }
  };

  const handleAddMember = async (friendId: string) => {
    try {
      const { data } = await groupService.addMember(group.id || group._id, friendId);
      alert(data.action === "added" ? "Member added directly!" : "Invitation request sent!");
      if(data.action === "added") fetchGroupData();
      setShowInviteModal(false);
    } catch (err) { alert("Failed to add member."); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm("Remove this member?")) {
      try { await groupService.removeMember(group.id || group._id, memberId); fetchGroupData(); }
      catch (err) { console.error(err); }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Leave group?")) {
      try { await groupService.leaveGroup(group.id || group._id); router.push("/"); }
      catch (err) { console.error(err); }
    }
  };

  const handleDeleteGroup = async () => {
    const groupType = group.is_community ? "Community" : group.is_official ? "Official Hub" : "Citizen Hub";
    if (window.confirm(`Are you sure you want to delete this ${groupType}? This will permanently remove all members, messages, and data. This action cannot be undone.`)) {
      try {
        const { data } = await groupService.deleteGroup(group.id || group._id);
        if (data.success) {
          alert(`${groupType} deleted successfully.`);
          router.push("/");
        }
      } catch (err: any) {
        alert(err.response?.data?.detail || "Failed to delete group");
        console.error(err);
      }
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
      return;
    }
    
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const { data } = await groupService.updateGroupLogo(group.id || group._id, formData);
      if (data.success) {
        // Update local state
        setGroup({ ...group, avatar_url: data.avatar_url });
        alert('Group logo updated successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload logo');
      console.error(err);
    } finally {
      setLogoUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetPoints = async () => {
    const groupType = group.is_community ? "Community" : "Official Hub";
    const confirmMessage = group.is_community 
      ? "Are you sure you want to reset this Community's tracking? This will NOT affect the affiliated official hubs or their points."
      : "Are you sure you want to reset all member contributions in this Official Hub? This will reset their group-specific points to 0 but won't affect their total points.";
    
    if (window.confirm(confirmMessage)) {
      try {
        const { data } = await groupService.resetGroupPoints(group.id || group._id);
        if (data.success) {
          alert(data.message);
          // Refresh the page data
          fetchGroupData();
        }
      } catch (err: any) {
        alert(err.response?.data?.detail || "Failed to reset points");
        console.error(err);
      }
    }
  };

  const fetchPending = async (groupId: string) => {
    setRequestsLoading(true);
    try {
      const { data } = await groupService.getPendingRequests(groupId);
      if (data.success) setPendingRequests(data.requests || []);
    } catch (err) { console.error(err); } finally { setRequestsLoading(false); }
  };

  const handleApprove = async (userId: string) => {
    try {
      await groupService.approveRequest(group.id || group._id, userId);
      setPendingRequests(prev => prev.filter(u => u.id !== userId));
      fetchGroupData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to approve"); }
  };

  const handleReject = async (userId: string) => {
    try {
      await groupService.rejectRequest(group.id || group._id, userId);
      setPendingRequests(prev => prev.filter(u => u.id !== userId));
    } catch (err) { console.error(err); }
  };

  const fetchCommunityInvites = async (hubId: string) => {
    setCommunityInvitesLoading(true);
    try {
      const { data } = await groupService.getCommunityInvites(hubId);
      if (data.success) setCommunityInvites(data.invites || []);
    } catch (err) { console.error(err); } finally { setCommunityInvitesLoading(false); }
  };

  const handleCommunityInviteResponse = async (communityId: string, accept: boolean) => {
    try {
      const { data } = await groupService.respondToCommunityInvite(group.id || group._id, communityId, accept);
      alert(data.message);
      setCommunityInvites(prev => prev.filter(c => c.id !== communityId));
      if (accept) fetchGroupData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to respond"); }
  };

  if (!group) return <div className="flex h-screen items-center justify-center animate-pulse text-slate-400">Loading Hub...</div>;

  const isMember = members.some(m => String(m.id || m._id) === String(user?.id || user?._id));

  // Block access to official hubs (non-community) if not a member
  if (group.is_official && !group.is_community && !isMember) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center flex-col gap-5 bg-slate-50 rounded-3xl mt-4 border border-slate-200 shadow-inner">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center"><Lock className="w-10 h-10 text-slate-500" /></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">Private Official Hub <ShieldCheck className="w-6 h-6 text-blue-500" /></h2>
          <p className="text-slate-500 mt-2 max-w-sm">This chat is restricted. You must be added directly by the Authority Admin.</p>
        </div>
        <Link href="/" className="mt-2 px-6 py-2.5 bg-civic-600 text-white font-bold rounded-xl shadow-sm">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex gap-4 p-4 mt-2 relative">
      
      {/* Sidebar: Dynamic Member List / Hub List */}
      <div className="hidden lg:flex w-72 flex-col bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {group.is_community ? (
              <><Globe className="h-4 w-4 text-purple-500" /> Hubs ({group.affiliated_hubs?.length || 0})</>
            ) : (
              <><UsersIcon className="h-4 w-4 text-civic-500" /> Members ({members.length})</>
            )}
          </h3>
          <div className="flex gap-2">
            {isMember && isAdmin && (
              <>
                {group.is_official && (
                  <button onClick={() => { fetchCommunityInvites(group.id || group._id); setShowCommunityInvitesModal(true); }} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg active:scale-95 transition-all"><Globe className="h-4 w-4" /></button>
                )}
                {/* Bell icon for Official Groups and Citizen Hubs only (not Community) */}
                {!group.is_community && (
                  <button onClick={() => { fetchPending(group.id || group._id); setShowRequestsModal(true); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg active:scale-95 transition-all relative">
                    <Bell className="h-4 w-4" />
                    {pendingRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
            {isMember && (
              <button onClick={handleOpenInviteClick} className="p-1.5 bg-civic-50 text-civic-600 rounded-lg active:scale-95 transition-all">
                {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto scrollbar-thin">
          {group.is_community ? (
            /* 🚀 RENDER POPULATED AFFILIATED HUBS */
            group.affiliated_hubs_data?.length > 0 ? (
              group.affiliated_hubs_data.map((hub: any) => (
                <Link href={`/groups/${hub.slug}`} key={hub.id}>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100 transition-all mb-2 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar src={hub.avatar_url} name={hub.name} size="sm" className="h-8 w-8" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{hub.name}</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-0.5"><ShieldCheck className="w-2 h-2" /> Hub</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                  </div>
                </Link>
              ))
            ) : <p className="text-[10px] text-slate-400 text-center py-10">No hubs affiliated yet.</p>
          ) : (
            /* RENDER NORMAL MEMBERS */
            members.map(m => {
              const memberIdStr = String(m.id || m._id);
              return (
                <div key={memberIdStr} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatar?.url} name={m.name} size="sm" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">{m.name}</span>
                        {(group.is_official || group.is_community || (!group.is_official && !group.is_community)) && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {Math.max(0, m.points_since_joining || 0)} pts
                          </span>
                        )}
                      </div>
                      {memberIdStr === group.creator_id && <span className="text-[9px] font-bold text-civic-600 uppercase tracking-tighter">Founder</span>}
                    </div>
                  </div>
                  {isAdmin && memberIdStr !== String(user?.id || user?._id) && <button onClick={() => handleRemoveMember(memberIdStr)} className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 transition-all"><UserMinus className="h-4 w-4" /></button>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="lg:hidden p-2"><ChevronLeft /></Link>
            <Avatar src={group.avatar_url} name={group.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800">{group.name}</h2>
                {group.is_official && <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md flex items-center gap-1 uppercase tracking-wider"><ShieldCheck className="w-3 h-3" /> Official Hub</span>}
                {group.is_community && <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-md flex items-center gap-1 uppercase tracking-wider"><Globe className="w-3 h-3" /> Community Network</span>}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Hash className="h-3 w-3" />{group.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isMember && group.is_community && (
              <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-purple-200">
                <Globe className="w-3.5 h-3.5" /> View Only
              </span>
            )}
            {/* Only show points for Official Groups and Communities, NOT regular citizen hubs */}
            {(group.is_official || group.is_community) && (
              <div className="relative">
                <button onClick={() => setShowPointsDropdown(!showPointsDropdown)} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full font-bold text-sm border border-amber-200 active:scale-95 transition-all">
                  <Trophy className="w-4 h-4" /> 
                  {Math.max(0, group.is_community 
                    ? (group.total_points || 0)
                    : members.reduce((sum, m) => sum + Math.max(0, m.points_since_joining || 0), 0)
                  )} pts
                </button>
                {showPointsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPointsDropdown(false)} />
                    <div className="absolute top-full mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden right-0 animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {group.is_community ? "Hub Contributions" : "Member Contributions"}
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {group.is_community ? (
                        /* Show affiliated hubs with their total_points */
                        group.affiliated_hubs_data?.length > 0 ? (
                          group.affiliated_hubs_data.map((hub: any) => (
                            <Link href={`/groups/${hub.slug}`} key={hub.id}>
                              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-blue-50 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Avatar src={hub.avatar_url} name={hub.name} size="sm" className="h-6 w-6" />
                                  <span className="text-sm font-semibold text-slate-700">{hub.name}</span>
                                </div>
                                <span className="text-sm font-bold text-amber-600">{hub.total_points || 0}</span>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-4">No affiliated hubs yet</p>
                        )
                      ) : (
                        /* Show individual members with their points since joining */
                        members.map(m => (
                          <div key={m.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50">
                            <span className="text-sm font-semibold text-slate-700">{m.name}</span>
                            <span className="text-sm font-bold text-amber-600">
                              {Math.max(0, m.points_since_joining || 0)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
                >
                  {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
                  {logoUploading ? 'Uploading...' : 'Logo'}
                </button>
                {(group.is_official || group.is_community) && (
                  <button 
                    onClick={handleResetPoints}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                    title="Reset Points"
                  >
                    <RotateCcw className="h-4 w-4" /> 
                    Reset Points
                  </button>
                )}
                <button onClick={handleDeleteGroup} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
            {!isAdmin && <button onClick={handleLeaveGroup} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut className="h-4 w-4" /> Leave</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-sm"><UsersIcon className="h-12 w-12 mb-2" /><p>No messages yet.</p></div>
          ) : (
            messages.map((m, i) => {
              const isMe = String(m.sender_id) === String(user?.id || user?._id);
              return (
                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] font-bold text-slate-400 ml-2 mb-1">{m.sender_name}</span>}
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-[15px] shadow-sm ${isMe ? 'bg-civic-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'}`}>{m.text}</div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Chat input - only show for members */}
        {isMember ? (
          <form onSubmit={handleSend} className="p-4 border-t bg-slate-50/50 flex gap-3">
            <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder={`Message #${group.slug}...`} className="flex-1 bg-white border rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-civic-500 outline-none transition-all" />
            <button type="submit" className={`p-4 text-white rounded-2xl transition-all ${group.is_official ? 'bg-blue-600' : group.is_community ? 'bg-purple-600' : 'bg-civic-600'}`}><Send className="h-5 w-5" /></button>
          </form>
        ) : group.is_community ? (
          <div className="p-4 border-t bg-purple-50/50 text-center">
            <p className="text-sm text-purple-700 font-semibold flex items-center justify-center gap-2">
              <Globe className="h-4 w-4" />
              View Only - Communities are for Authorities only
            </p>
          </div>
        ) : null}
      </div>

      {/* MODALS */}
      {showCommunityInvitesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b flex justify-between items-center bg-purple-50">
              <h3 className="font-black text-purple-800 flex items-center gap-2"><Globe className="h-5 w-5 text-purple-600" /> Community Affiliations</h3>
              <button onClick={() => setShowCommunityInvitesModal(false)} className="p-2 hover:bg-purple-200 rounded-full transition-all"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {communityInvitesLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div> : communityInvites.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">No communities have invited your hub yet.</p> : communityInvites.map(comm => (
                <div key={comm.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar src={comm.avatar_url} name={comm.name} size="sm" />
                    <div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{comm.name}</span><span className="text-[10px] text-slate-400 flex items-center gap-1"><AtSign className="h-3 w-3" /> {comm.slug}</span></div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => handleCommunityInviteResponse(comm.id, false)} className="flex-1 sm:flex-none p-2 text-xs font-bold bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">Decline</button>
                    <button onClick={() => handleCommunityInviteResponse(comm.id, true)} className="flex-1 sm:flex-none p-2 text-xs font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all">Accept Link</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRequestsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Pending Requests</h3>
              <button onClick={() => setShowRequestsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {requestsLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div> : pendingRequests.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">No pending requests.</p> : pendingRequests.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar?.url || u.avatar} name={u.name} size="sm" />
                    <div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{u.name}</span><span className="text-[10px] text-slate-400">@{u.username}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(u.id)} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl active:scale-95 transition-all"><Check className="h-4 w-4" /></button>
                    <button onClick={() => handleReject(u.id)} className="p-2 bg-red-100 text-red-600 rounded-xl active:scale-95 transition-all"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Invite connections</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {friends.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">No connections found.</p> : friends.map(f => (
                <div key={String(f.id || f._id)} onClick={() => handleAddMember(String(f.id || f._id))} className="flex items-center justify-between p-3 rounded-2xl hover:bg-civic-50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar src={f.avatar?.url} name={f.name} size="sm" />
                    <div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{f.name}</span><span className="text-[10px] text-slate-400">{f.followsMe ? "Follower" : "Following"}</span></div>
                  </div>
                  {f.followsMe ? <UserPlus className="h-4 w-4 text-civic-600" /> : <Mail className="h-4 w-4 text-amber-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <InviteHubModal isOpen={showHubInviteModal} onClose={() => setShowHubInviteModal(false)} communityId={group?.id || group?._id} />
    </div>
  );
}