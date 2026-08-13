import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiBookOpen,
  FiCheckCircle,
  FiEye,
  FiLoader,
  FiRefreshCw,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiUsers,
  FiX,
} from "react-icons/fi";
import DashboardCard from "../components/dashboard/DashboardCard";
import {
  adminService,
  blogService,
  courseService,
  dashboardService,
} from "../services/api";
import { notifySuccess, notifyError } from "../lib/uiNotify";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getStatus = (row = {}) =>
  normalizeText(
    row.admin_approval_status ??
      row.status ??
      row.approval_status ??
      row.moderation_status ??
      row.state ??
      row.review_status,
  );

const isPendingStatus = (row = {}) => {
  const status = getStatus(row);
  if (
    [
      "pending",
      "pending_approval",
      "in_review",
      "review",
      "draft",
      "queued",
    ].includes(status)
  ) {
    return true;
  }
  if (row.isApproved === false || row.is_approved === false) return true;
  if (row.is_published === false && !status) return true;
  return false;
};

const isApprovedStatus = (row = {}) => {
  const status = getStatus(row);
  if (["approved", "published", "active", "accepted"].includes(status))
    return true;
  if (row.isApproved === true || row.is_approved === true) return true;
  return false;
};

const isRejectedStatus = (row = {}) => {
  const status = getStatus(row);
  return ["rejected", "declined", "blocked", "archived", "disabled"].includes(
    status,
  );
};

const isSuspendedUser = (user = {}) =>
  Boolean(user.is_suspended || user.suspended) ||
  getStatus(user) === "suspended";

const displayName = (row = {}) =>
  row.full_name ||
  row.fullName ||
  row.title ||
  row.name ||
  row.email ||
  "Record";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const getInstructorName = (course = {}) =>
  course.instructor?.full_name ||
  course.instructor_name ||
  course.instructor?.name ||
  course.teacher_name ||
  course.teacher?.full_name ||
  course.created_by_name ||
  course.created_by?.full_name ||
  "Instructor";

const getCategoryName = (course = {}) =>
  course.category?.name ||
  course.category_name ||
  course.categoryName ||
  course.category_id ||
  course.categoryId ||
  "Uncategorized";

const getLevel = (course = {}) => course.level || course.rank || "Not set";

const getPrice = (course = {}) => {
  const price = Number(course.price || 0);
  return Number.isFinite(price) ? `$${price}` : "Not set";
};

const detailsLine = (items) =>
  items
    .filter((item) => item?.value !== undefined && item?.value !== null)
    .map((item) => `${item.label}: ${item.value || "Not set"}`)
    .join(" | ");

const getPostAuthorName = (post = {}) =>
  post.author?.full_name ||
  post.author_name ||
  post.author?.name ||
  post.created_by_name ||
  post.created_by?.full_name ||
  "Author";

const detailValue = (row = {}) =>
  row.email ||
  row.role ||
  row.description ||
  row.status ||
  row.approval_status ||
  "";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    pendingInstructorAccounts: 0,
    pendingCourses: 0,
    pendingPosts: 0,
    publishedPosts: 0,
    totalPosts: 0,
    totalCourses: 0,
  });
  const [pendingInstructors, setPendingInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [viewer, setViewer] = useState(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsResult, usersRows, pendingRows, pendingCourseRows, postRows] =
        await Promise.all([
          dashboardService.getAdminDashboard(),
          adminService.getAllUsers(),
          adminService.getPendingInstructors(),
          courseService.getAdminModerationCourses({
            status: "pending",
            limit: 100,
          }),
          blogService.getAdminPosts({ limit: 100 }),
        ]);

      const usersList = asArray(usersRows);
      const pendingList = asArray(pendingRows);
      const courseList = asArray(pendingCourseRows);
      const pendingCourseList = courseList.filter(isPendingStatus);
      const postList = asArray(postRows);
      const publishedPostCount = postList.filter(isApprovedStatus).length;
      const pendingPostCount = postList.filter(
        (post) =>
          isPendingStatus(post) ||
          (!isApprovedStatus(post) && !isRejectedStatus(post)),
      ).length;

      setDashboardStats({
        totalUsers: statsResult?.totalUsers ?? usersList.length,
        pendingInstructorAccounts:
          statsResult?.pendingInstructorAccounts ?? pendingList.length,
        pendingCourses: pendingCourseList.length,
        pendingPosts: statsResult?.pendingPosts ?? pendingPostCount,
        publishedPosts: publishedPostCount,
        totalPosts: postList.length,
        totalCourses: statsResult?.totalCourses ?? courseList.length,
      });
      setUsers(usersList);
      setPendingInstructors(
        pendingList.length > 0
          ? pendingList
          : usersList.filter(
              (user) =>
                normalizeText(user.role) === "pending_instructor" ||
                isPendingStatus(user),
            ),
      );
      setCourses(courseList);
      setPosts(postList);
    } catch (err) {
      setError(err?.message || "Failed to load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const moderationModel = useMemo(() => {
    const pendingCourses = courses.filter(isPendingStatus);
    const pendingPosts = posts.filter(
      (post) =>
        isPendingStatus(post) ||
        (!isApprovedStatus(post) && !isRejectedStatus(post)),
    );

    return {
      pendingCourses,
      pendingPosts,
    };
  }, [courses, posts]);

  const stats = [
    ["Total Users", dashboardStats.totalUsers, FiUsers],
    [
      "Pending Instructor Accounts",
      dashboardStats.pendingInstructorAccounts,
      FiShield,
    ],
    ["Pending Courses", dashboardStats.pendingCourses, FiAlertTriangle],
    ["Blog Posts", dashboardStats.totalPosts, FiBookOpen],
    ["Pending Posts", dashboardStats.pendingPosts, FiBookOpen],
    ["Published Posts", dashboardStats.publishedPosts, FiCheckCircle],
    ["Total Courses", dashboardStats.totalCourses, FiBookOpen],
  ];

  const refreshAfterAction = async (loadingKey, callback) => {
    setActionLoading(loadingKey);
    try {
      await callback();
      await loadDashboard();
    } finally {
      setActionLoading(null);
    }
  };

  const openUserProfile = async (userId, fallbackRecord) => {
    const loadingKey = `user:${userId}`;
    setActionLoading(loadingKey);
    try {
      const result = await adminService.getUserDetailsAdmin(userId);
      const payload = result?.data || result || fallbackRecord;
      setViewer({
        type: "user",
        record: payload?.user || payload || fallbackRecord,
      });
    } catch {
      setViewer({ type: "user", record: fallbackRecord });
    } finally {
      setActionLoading(null);
    }
  };

  const approveInstructor = async (userId) => {
    await refreshAfterAction(`instructor-approve:${userId}`, () =>
      adminService.approveInstructor(userId),
    );
    notifySuccess("Instructor approved");
  };

  const rejectInstructor = async (userId) => {
    await refreshAfterAction(`instructor-reject:${userId}`, () =>
      adminService.rejectInstructor(userId),
    );
    notifySuccess("Instructor rejected");
  };

  const toggleUserStatus = async (user) => {
    const shouldSuspend = !isSuspendedUser(user);
    await refreshAfterAction(`user-status:${user.id}`, () =>
      adminService.setUserSuspended(user.id, shouldSuspend),
    );
  };

  const updateCourseStatus = async (courseId, status) => {
    await refreshAfterAction(`course:${courseId}:${status}`, () =>
      adminService.updateCourseStatus(courseId, status),
    );
  };

  const updatePostStatus = async (postId, status) => {
    await refreshAfterAction(`post:${postId}:${status}`, () =>
      status === "published"
        ? blogService.approvePost(postId)
        : blogService.rejectPost(postId),
    );
  };

  return (
    <div className="min-h-screen bg-secondary-50 px-4 py-6 dark:bg-dark-bg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#111827] to-[#075985] p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">
                <FiShield className="mr-2" /> Admin dashboard
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Platform operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                Complete moderation controls for instructor accounts, courses,
                posts, and users.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="btn w-full bg-white/20 text-white hover:bg-white/30 sm:w-auto"
            >
              <FiRefreshCw className="mr-2" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-secondary-500">
            <FiLoader className="mr-2 h-6 w-6 animate-spin" /> Loading admin
            dashboard
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stats.map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="card card-body flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{value}</div>
                    <div className="text-sm text-secondary-500">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <DashboardCard
              title="Blog Management"
              subtitle="Create posts, publish pending posts, and review authors"
              action={
                <Link to="/admin/blog" className="btn btn-primary text-sm">
                  <FiBookOpen className="mr-2" /> Open Blog
                </Link>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Total Posts"
                  value={dashboardStats.totalPosts}
                />
                <MiniStat
                  label="Published"
                  value={dashboardStats.publishedPosts}
                />
                <MiniStat label="Pending" value={dashboardStats.pendingPosts} />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Pending Instructor Accounts"
              subtitle="Approve or reject instructor applications"
            >
              <div className="space-y-3">
                {pendingInstructors.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                    No pending instructors.
                  </div>
                ) : (
                  pendingInstructors.map((pendingUser) => (
                    <ModerationRow
                      key={pendingUser.id}
                      title={displayName(pendingUser)}
                      subtitle={detailsLine([
                        { label: "Email", value: pendingUser.email },
                        { label: "Phone", value: pendingUser.phone },
                        { label: "Role", value: pendingUser.role },
                        { label: "Status", value: pendingUser.status },
                      ])}
                      actions={
                        <>
                          <button
                            type="button"
                            onClick={() => approveInstructor(pendingUser.id)}
                            disabled={
                              actionLoading ===
                              `instructor-approve:${pendingUser.id}`
                            }
                            className="btn btn-primary text-sm"
                          >
                            <FiUserCheck className="mr-2" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectInstructor(pendingUser.id)}
                            disabled={
                              actionLoading ===
                              `instructor-reject:${pendingUser.id}`
                            }
                            className="btn btn-secondary text-sm"
                          >
                            <FiUserX className="mr-2" /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openUserProfile(pendingUser.id, pendingUser)
                            }
                            disabled={
                              actionLoading === `user:${pendingUser.id}`
                            }
                            className="btn text-sm"
                          >
                            <FiEye className="mr-2" /> View Details
                          </button>
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard
              title="Pending Courses"
              subtitle="Moderate new or pending courses"
            >
              <div className="space-y-3">
                {moderationModel.pendingCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                    No pending courses.
                  </div>
                ) : (
                  moderationModel.pendingCourses.map((course) => (
                    <ModerationRow
                      key={course.id}
                      title={displayName(course)}
                      subtitle={`Instructor: ${getInstructorName(course)} • Created: ${formatDate(course.created_at || course.createdAt) || "Unknown"}`}
                      actions={
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateCourseStatus(course.id, "approved")
                            }
                            disabled={
                              actionLoading === `course:${course.id}:approved`
                            }
                            className="btn btn-primary text-sm"
                          >
                            <FiCheckCircle className="mr-2" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCourseStatus(course.id, "rejected")
                            }
                            disabled={
                              actionLoading === `course:${course.id}:rejected`
                            }
                            className="btn btn-secondary text-sm"
                          >
                            <FiX className="mr-2" /> Reject
                          </button>
                          <Link
                            to={
                              course.id ? `/courses/${course.id}` : "/courses"
                            }
                            className="btn text-sm"
                          >
                            <FiEye className="mr-2" /> Preview
                          </Link>
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard
              title="Pending Posts"
              subtitle="Review posts waiting for moderation"
            >
              <div className="space-y-3">
                {moderationModel.pendingPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                    No pending posts.
                  </div>
                ) : (
                  moderationModel.pendingPosts.map((post) => (
                    <ModerationRow
                      key={post.id}
                      title={displayName(post)}
                      subtitle={`Author: ${getPostAuthorName(post)} • Date: ${formatDate(post.created_at || post.published_at) || "Unknown"}`}
                      actions={
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updatePostStatus(post.id, "published")
                            }
                            disabled={
                              actionLoading === `post:${post.id}:published`
                            }
                            className="btn btn-primary text-sm"
                          >
                            <FiCheckCircle className="mr-2" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePostStatus(post.id, "draft")}
                            disabled={actionLoading === `post:${post.id}:draft`}
                            className="btn btn-secondary text-sm"
                          >
                            <FiX className="mr-2" /> Reject
                          </button>
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard
              title="All Users"
              subtitle="Suspend, activate, or view any user profile"
            >
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                    No users found.
                  </div>
                ) : (
                  users.map((user) => {
                    const suspended = isSuspendedUser(user);
                    return (
                      <ModerationRow
                        key={user.id}
                        title={displayName(user)}
                        subtitle={detailValue(user)}
                        actions={
                          <>
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(user)}
                              disabled={
                                actionLoading === `user-status:${user.id}`
                              }
                              className={`btn text-sm ${suspended ? "btn-primary" : "btn-secondary"}`}
                            >
                              {suspended ? (
                                <FiActivity className="mr-2" />
                              ) : (
                                <FiAlertTriangle className="mr-2" />
                              )}
                              {suspended ? "Activate" : "Suspend"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openUserProfile(user.id, user)}
                              disabled={actionLoading === `user:${user.id}`}
                              className="btn text-sm"
                            >
                              <FiEye className="mr-2" /> View Profile
                            </button>
                          </>
                        }
                      />
                    );
                  })
                )}
              </div>
            </DashboardCard>
          </>
        )}
      </div>

      {viewer && (
        <DetailsModal
          onClose={() => setViewer(null)}
          title={viewer.type === "user" ? "User Profile" : "Details"}
        >
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-secondary-950 p-4 text-xs text-white whitespace-pre-wrap">
            {JSON.stringify(viewer.record, null, 2)}
          </pre>
        </DetailsModal>
      )}
    </div>
  );
};

const ModerationRow = ({ title, subtitle, actions }) => (
  <div className="rounded-xl border border-secondary-100 p-4 dark:border-dark-border">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-secondary-900 dark:text-white">
          {title}
        </div>
        <div className="mt-1 text-sm text-secondary-500">{subtitle || ""}</div>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl border border-secondary-100 p-4 dark:border-dark-border">
    <div className="text-xl font-semibold text-secondary-900 dark:text-white">
      {value}
    </div>
    <div className="mt-1 text-sm text-secondary-500">{label}</div>
  </div>
);

const DetailsModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-secondary-900 dark:text-white">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-dark-border"
        >
          <FiX />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default AdminDashboard;
