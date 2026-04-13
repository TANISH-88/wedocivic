import api from "@/lib/api";

export const groupService = {
  createGroup: (data: { 
    name: string; 
    slug: string; 
    description: string; 
    initial_members: string[];
    is_official?: boolean;
    is_community?: boolean;
  }) => api.post("/groups/create", data),

  getUserGroups: () => api.get("/groups/me"),

  getGroupBySlug: (slug: string) => 
    api.get(`/groups/slug/${slug}`),

  getMembers: (groupId: string) => 
    api.get(`/groups/${groupId}/members`),

  addMember: (groupId: string, userId: string) => 
    api.post(`/groups/${groupId}/members/add`, { user_id: userId }),

  getMyInvitations: () => api.get("/groups/invitations/me"),

  respondToInvitation: (inviteId: string, accept: boolean) => 
    api.post(`/groups/invitations/${inviteId}/respond`, { accept }),

  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),

  leaveGroup: (groupId: string) =>
    api.delete(`/groups/${groupId}/leave`),

  getMessages: (groupId: string) => 
    api.get(`/groups/${groupId}/messages`),

  sendMessage: (groupId: string, text: string) => 
    api.post(`/groups/${groupId}/messages`, { text }),

  searchGroups: (q: string) => 
    api.get(`/groups/search?q=${encodeURIComponent(q)}`),

  // ✅ The CORRECT separated route for discovery
  getDiscoverGroups: (q?: string, type: string = "normal") => 
      api.get(`/groups/discover/${type}`, { params: { q } }),

  joinGroup: (groupId: string) => 
    api.post(`/groups/${groupId}/join`),

  deleteGroup: (groupId: string) =>
    api.delete(`/groups/${groupId}`),

  getPendingRequests: (groupId: string) => 
    api.get(`/groups/${groupId}/pending`),

  approveRequest: (groupId: string, userId: string) => 
    api.post(`/groups/${groupId}/approve/${userId}`),

  rejectRequest: (groupId: string, userId: string) => 
    api.post(`/groups/${groupId}/reject/${userId}`),
  // ... existing code ...
  

  // 🚀 NEW: FEDERATED NETWORK ROUTES
  inviteHubToCommunity: (communityId: string, hubId: string) =>
    api.post(`/groups/${communityId}/invite-hub/${hubId}`),

  getCommunityInvites: (hubId: string) =>
    api.get(`/groups/${hubId}/community-invites`),

  respondToCommunityInvite: (hubId: string, communityId: string, accept: boolean) =>
    api.post(`/groups/${hubId}/community-invites/${communityId}/respond`, { accept }),

  // 🎨 GROUP LOGO MANAGEMENT
  updateGroupLogo: (groupId: string, formData: FormData) => 
    api.put(`/groups/${groupId}/update-logo`, formData, { 
      headers: { "Content-Type": "multipart/form-data" } 
    }),

  // 🔄 GROUP POINTS RESET
  resetGroupPoints: (groupId: string) => 
    api.post(`/groups/${groupId}/reset-points`),

  // 🏆 GROUP LEADERBOARD
  getGroupLeaderboard: (params: { groupType?: string; search?: string; state?: string; city?: string; limit?: number; skip?: number }) =>
    api.get("/groups/leaderboard/list", { params }),

};