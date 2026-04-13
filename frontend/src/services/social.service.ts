import api from "@/lib/api";
export const socialService = {
  toggleLike:  (target_id: string, target_type: "Post"|"Comment") => api.post("/social/like",    { target_id, target_type }),
  addComment:  (postId: string, text: string)                     => api.post("/social/comment", { postId, text }),
  getComments: (postId: string)                                    => api.get(`/social/comments/${postId}`),
  toggleFollow:(user_id: string)                                   => api.post("/social/follow",  { user_id }),
};
