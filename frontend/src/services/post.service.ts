import api from "@/lib/api";
export const postService = {
  createPost:  (fd: FormData)           => api.post("/posts/create", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  getFeed:     (page = 1)              => api.get(`/posts/feed?page=${page}&limit=12`),
  explorePosts:(tag = "", page = 1)    => api.get(`/posts/explore?tag=${tag}&page=${page}&limit=12`),
  getUserPosts:(userId: string, p = 1) => api.get(`/posts/user/${userId}?page=${p}&limit=12`),
  getPost:     (id: string)            => api.get(`/posts/${id}`),
  deletePost:  (id: string)            => api.delete(`/posts/${id}`),
};
