import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiImage,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { blogService, uploadService } from "../../services/api";
import { isAdmin } from "../../lib/roles";
import { notifyError, notifySuccess } from "../../lib/uiNotify";
import { getFriendlyErrorMessage } from "../../lib/friendlyErrors";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const emptyForm = {
  id: null,
  title: "",
  content: "",
  category: "",
  level: "",
  imageUrl: "",
};

const levelOptions = [
  { value: "", label: "No level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const asDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const getAuthorName = (post = {}) =>
  post.author?.full_name ||
  post.author?.fullName ||
  post.author_name ||
  post.created_by_name ||
  "Author";

const getStatusLabel = (post = {}) =>
  post.isPublished || post.is_published || post.status === "published"
    ? "Published"
    : "Pending";

const isPublished = (post = {}) =>
  post.isPublished || post.is_published || post.status === "published";

const visibleError = (error, fallback) =>
  getFriendlyErrorMessage(error, fallback);

const BlogAdmin = ({ scope = "admin" }) => {
  const { user } = useAuth();
  const canModerate = scope === "admin" || isAdmin(user?.role);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const isEditing = Boolean(form.id);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = { limit: 100 };
      const rows = canModerate
        ? await blogService.getAdminPosts(params)
        : await blogService.getMyPosts(params);
      setPosts(rows || []);
    } catch (err) {
      const message = visibleError(
        err,
        "Unable to load blog posts. Please try again.",
      );
      setError(message);
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  }, [canModerate]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const stats = useMemo(() => {
    const published = posts.filter(isPublished).length;
    const pending = posts.length - published;
    return { total: posts.length, published, pending };
  }, [posts]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setError("");
  };

  const editPost = (post) => {
    setForm({
      id: post.id,
      title: post.title || "",
      content: post.content || "",
      category: post.category || "",
      level: post.level || "",
      imageUrl: post.imageUrl || post.image_url || "",
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadImage = async () => {
    if (!imageFile) return form.imageUrl;
    const payload = new FormData();
    payload.append("file", imageFile);
    payload.append("folder", form.id ? `blog/${form.id}/images` : "blog/images");
    const uploaded = await uploadService.upload(payload);
    return uploaded?.url || uploaded?.secure_url || form.imageUrl;
  };

  const savePost = async (event) => {
    event.preventDefault();

    if (form.title.trim().length < 3) {
      notifyError("Title must be at least 3 characters.");
      return;
    }

    if (form.content.trim().length < 10) {
      notifyError("Content must be at least 10 characters.");
      return;
    }

    if (!form.category.trim()) {
      notifyError("Category is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const imageUrl = await uploadImage();
      const payload = {
        title: form.title,
        content: form.content,
        category: form.category,
        level: form.level || null,
        imageUrl,
      };

      const saved = isEditing
        ? await blogService.updatePost(form.id, payload)
        : await blogService.createPost(payload);

      if (!saved?.id) {
        throw new Error("Unable to save the blog post. Please try again.");
      }

      await loadPosts();
      setForm({
        id: saved.id,
        title: saved.title || "",
        content: saved.content || "",
        category: saved.category || "",
        level: saved.level || "",
        imageUrl: saved.imageUrl || saved.image_url || "",
      });
      setImageFile(null);
      notifySuccess("Blog post saved successfully.");
    } catch (err) {
      const message = visibleError(
        err,
        "Unable to save the blog post. Please try again.",
      );
      setError(message);
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const runPostAction = async (key, action, successMessage, failureMessage) => {
    setActionLoading(key);
    setError("");
    try {
      const result = await action();
      if (result === null) throw new Error(failureMessage);
      await loadPosts();
      notifySuccess(successMessage);
    } catch (err) {
      const message = visibleError(err, failureMessage);
      setError(message);
      notifyError(message);
    } finally {
      setActionLoading("");
    }
  };

  const deletePost = (post) => {
    setConfirmDialog({
      title: "Delete blog post",
      message: `Delete "${post.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        await runPostAction(
          `delete:${post.id}`,
          () => blogService.deletePost(post.id),
          "Blog post deleted.",
          "Unable to delete the blog post. Please try again.",
        );
        if (form.id === post.id) resetForm();
      },
    });
  };

  const approvePost = (post) =>
    runPostAction(
      `approve:${post.id}`,
      () => blogService.approvePost(post.id),
      "Blog post published.",
      "Unable to publish the blog post. Please try again.",
    );

  const rejectPost = (post) =>
    runPostAction(
      `reject:${post.id}`,
      () => blogService.rejectPost(post.id),
      "Blog post unpublished.",
      "Unable to unpublish the blog post. Please try again.",
    );

  return (
    <div className="min-h-screen bg-secondary-50 px-4 py-6 dark:bg-dark-bg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#111827] to-[#075985] p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">
                <FiEdit3 className="mr-2" />
                {canModerate ? "Admin Blog Management" : "My Blog"}
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Blog Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                Create posts, manage drafts, and review publication status from
                the existing Blog API.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/blogs"
                className="btn w-full bg-white/20 text-white hover:bg-white/30 sm:w-auto"
              >
                <FiEye className="mr-2" />
                Public Blog
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="btn w-full bg-white/20 text-white hover:bg-white/30 sm:w-auto"
              >
                <FiPlus className="mr-2" />
                Create Blog Post
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label={canModerate ? "Visible Posts" : "My Posts"} value={stats.total} />
          <StatCard label="Published" value={stats.published} />
          <StatCard label="Pending" value={stats.pending} />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form
            onSubmit={savePost}
            className="card card-body space-y-5"
            aria-label="Create or edit blog post"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                  {isEditing ? "Edit Blog Post" : "Create Blog Post"}
                </h2>
                <p className="mt-1 text-sm text-secondary-500">
                  New posts are submitted as pending until an admin publishes
                  them.
                </p>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  <FiPlus className="mr-2" />
                  New
                </button>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                Title
              </span>
              <input
                required
                minLength={3}
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="form-input"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                  Category
                </span>
                <input
                  required
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  className="form-input"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                  Level
                </span>
                <select
                  value={form.level}
                  onChange={(event) => updateField("level", event.target.value)}
                  className="form-select"
                >
                  {levelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                Featured image URL
              </span>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                className="form-input"
                placeholder="https://..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                Upload featured image
              </span>
              <span className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-secondary-200 bg-white px-4 py-3 text-sm text-secondary-600 dark:border-dark-border dark:bg-dark-card dark:text-secondary-300">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <FiImage className="h-5 w-5 shrink-0" />
                  <span className="truncate">
                    {imageFile?.name || "Choose an image"}
                  </span>
                </span>
                <span className="font-semibold text-primary-600">Browse</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] || null)
                  }
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                Content
              </span>
              <textarea
                required
                minLength={10}
                rows={12}
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
                className="form-textarea leading-7"
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary min-h-[48px] w-full justify-center"
            >
              {isSaving ? (
                <FiLoader className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FiSend className="mr-2 h-5 w-5" />
              )}
              {isEditing ? "Save Changes" : "Create Blog Post"}
            </button>
          </form>

          <aside className="card card-body">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                  {canModerate ? "Blog Posts" : "My Posts"}
                </h2>
                <p className="mt-1 text-sm text-secondary-500">
                  Status, author, and created date
                </p>
              </div>
              <button
                type="button"
                onClick={loadPosts}
                className="btn btn-secondary"
                disabled={isLoading}
                title="Refresh posts"
              >
                <FiRefreshCw className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-secondary-500">
                <FiLoader className="mr-2 h-6 w-6 animate-spin" />
                Loading posts
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                No blog posts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    canModerate={canModerate}
                    actionLoading={actionLoading}
                    onEdit={() => editPost(post)}
                    onDelete={() => deletePost(post)}
                    onApprove={() => approvePost(post)}
                    onReject={() => rejectPost(post)}
                  />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="card card-body flex items-center gap-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
      <FiEdit3 className="h-5 w-5" />
    </div>
    <div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-sm text-secondary-500">{label}</div>
    </div>
  </div>
);

const PostRow = ({
  post,
  canModerate,
  actionLoading,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) => {
  const published = isPublished(post);
  return (
    <div className="rounded-xl border border-secondary-100 p-4 dark:border-dark-border">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-secondary-900 dark:text-white">
              {post.title || "Untitled post"}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                published
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {getStatusLabel(post)}
            </span>
          </div>
          <div className="mt-1 text-sm text-secondary-500">
            Author: {getAuthorName(post)} | Created:{" "}
            {asDate(post.created_at || post.createdAt)}
          </div>
          <div className="mt-1 text-sm text-secondary-500">
            {post.category || "Uncategorized"}
            {post.level ? ` | ${post.level}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="btn text-sm">
            <FiEdit3 className="mr-2" />
            Edit
          </button>
          {canModerate && !published && (
            <button
              type="button"
              onClick={onApprove}
              disabled={actionLoading === `approve:${post.id}`}
              className="btn btn-primary text-sm"
            >
              {actionLoading === `approve:${post.id}` ? (
                <FiLoader className="mr-2 animate-spin" />
              ) : (
                <FiCheckCircle className="mr-2" />
              )}
              Publish
            </button>
          )}
          {canModerate && published && (
            <button
              type="button"
              onClick={onReject}
              disabled={actionLoading === `reject:${post.id}`}
              className="btn btn-secondary text-sm"
            >
              {actionLoading === `reject:${post.id}` ? (
                <FiLoader className="mr-2 animate-spin" />
              ) : (
                <FiX className="mr-2" />
              )}
              Unpublish
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={actionLoading === `delete:${post.id}`}
            className="btn btn-secondary text-sm"
          >
            {actionLoading === `delete:${post.id}` ? (
              <FiLoader className="mr-2 animate-spin" />
            ) : (
              <FiTrash2 className="mr-2" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogAdmin;
