import api from "@/lib/api";

export const authService = {
  register: (d: any) => api.post("/auth/register", d),
  login:    (d: any) => api.post("/auth/login", d),
  google:   (id_token: string) => api.post("/auth/google", { id_token }),
  me:       () => api.get("/auth/me"),
};

export const userService = {
  getProfile:    (username: string) => api.get(`/users/${username}`),
  updateProfile: (fd: FormData)     => api.put("/users/update-profile", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  searchUsers:   (q: string)        => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getFollowers:  (id: string)       => api.get(`/users/${id}/followers`),
  getFollowing:  (id: string)       => api.get(`/users/${id}/following`),
  getLeaderboard:()                 => api.get("/users/leaderboard"),
  claimPoints:   ()                 => api.post("/users/claim-points"),
};

export const postService = {
  createPost:   (fd: FormData)              => api.post("/posts/create", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  getFeed:      (page = 1)                  => api.get(`/posts/feed?page=${page}&limit=12`),
  explorePosts: (tag = "", page = 1)        => api.get(`/posts/explore?tag=${tag}&page=${page}`),
  getUserPosts: (userId: string, page = 1)  => api.get(`/posts/user/${userId}?page=${page}`),
  getPost:      (postId: string)            => api.get(`/posts/${postId}`),
  deletePost:   (postId: string)            => api.delete(`/posts/${postId}`),
};

export const socialService = {
  toggleLike:   (target_id: string, target_type: string) => api.post("/social/like", { target_id, target_type }),
  addComment:   (postId: string, text: string)           => api.post("/social/comment", { postId, text }),
  getComments:  (postId: string)                          => api.get(`/social/comments/${postId}`),
  toggleFollow: (user_id: string)                         => api.post("/social/follow", { user_id }),
};

export const eventService = {
  createEvent: (fd: FormData)                             => api.post("/events/create", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  getEvents:   (status = "upcoming", page = 1)            => api.get(`/events?status=${status}&page=${page}`),
  joinEvent:   (eventId: string)                          => api.post(`/events/${eventId}/join`),
};

export const notifService = {
  getAll:      () => api.get("/notifications"),
  markAllRead: () => api.put("/notifications/read-all"),
};
