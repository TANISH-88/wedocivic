import api from "@/lib/api";

export const userService = {
  getLeaderboard:  (params?: { search?: string; state?: string; city?: string; groupType?: string; limit?: number; skip?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.state) queryParams.append("state", params.state);
    if (params?.city) queryParams.append("city", params.city);
    if (params?.groupType) queryParams.append("groupType", params.groupType);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.skip) queryParams.append("skip", params.skip.toString());
    const query = queryParams.toString();
    return api.get(`/users/leaderboard${query ? `?${query}` : ""}`);
  },
  getProfile:      (username: string)  => api.get(`/users/${username}`),
  updateProfile:   (fd: FormData)      => api.put("/users/update-profile", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  changePassword:  (currentPassword: string, newPassword: string) => 
    api.post("/users/change-password", { current_password: currentPassword, new_password: newPassword }),
  searchUsers:     (q: string)         => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getFollowers:    (userId: string)    => api.get(`/users/${userId}/followers`),
  getFollowing:    (userId: string)    => api.get(`/users/${userId}/following`),
  getConnections:  ()                  => api.get("/users/me/connections"),
  claimPoints:     (data: { amount: number }) => api.post('/users/claim-points', data),
  
  // --- NEW: Connection Management ---
  unfollowUser: (userId: string) => api.delete(`/users/${userId}/unfollow`),
  removeFollower: (userId: string) => api.delete(`/users/${userId}/remove_follower`),
};
