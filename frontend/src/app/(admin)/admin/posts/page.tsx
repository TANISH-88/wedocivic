"use client";
import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { Trash2, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface PostData {
  id: string;
  content: string;
  media: Array<{ url: string; type: string }>;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: { url: string };
  } | null;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPosts();
  }, [page]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getPosts(page, 20);
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post? This action cannot be undone.")) return;

    try {
      await adminService.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete post");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Post Management</h1>
        <p className="text-slate-600 mt-1">Moderate platform content</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No posts found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {post.author && (
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={post.author.avatar.url || "/default-avatar.png"}
                            alt={post.author.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{post.author.name}</p>
                            <p className="text-sm text-slate-500">@{post.author.username}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-slate-700 mb-3">{post.content}</p>
                      {post.media.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                          <ImageIcon className="h-4 w-4" />
                          <span>{post.media.length} media file(s)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{post.likes_count} likes</span>
                        <span>{post.comments_count} comments</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Delete post"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
