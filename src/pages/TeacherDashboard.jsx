import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiEdit,
  FiFileText,
  FiLayers,
  FiLoader,
  FiPlus,
  FiStar,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import DashboardCard from "../components/dashboard/DashboardCard";
import {
  blogService,
  courseService,
  enrollmentService,
  reviewService,
  sectionService,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const getCourseApprovalStatus = (course = {}) =>
  String(
    course.admin_approval_status ??
      course.status ??
      course.approval_status ??
      course.moderation_status ??
      course.state ??
      (course.review_status || ""),
  )
    .trim()
    .toLowerCase();

const isTeacherCourseDraft = (course = {}) =>
  getCourseApprovalStatus(course) === "draft";

const isTeacherCoursePublished = (course = {}) =>
  ["published", "approved", "active"].includes(
    getCourseApprovalStatus(course),
  ) && course.admin_approval_status === "approved";

const isTeacherCoursePendingApproval = (course = {}) => {
  const status = getCourseApprovalStatus(course);
  return (
    ["pending", "pending_approval", "in_review", "review"].includes(status) ||
    course.admin_approval_status === "pending" ||
    (!status && course.is_published === false) ||
    status === "pending"
  );
};

const isPublishedPost = (post = {}) =>
  post.isPublished || post.is_published || post.status === "published";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [courseRows, enrollmentRows, reviewRows, blogRows] =
        await Promise.all([
          courseService.getInstructorCourses(user?.id),
          enrollmentService.getEnrollments(),
          reviewService.getReviewsByCourse(),
          blogService.getMyPosts({ limit: 100 }),
        ]);

      const sectionGroups = await Promise.all(
        (courseRows || [])
          .slice(0, 8)
          .map((course) => sectionService.getSectionsByCourse(course.id)),
      );

      setCourses(courseRows || []);
      setBlogPosts(blogRows || []);
      setEnrollments(enrollmentRows || []);
      setReviews(Array.isArray(reviewRows) ? reviewRows : []);
      setSections(sectionGroups.flat());
    } catch (err) {
      setError(err?.message || "Failed to load instructor dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const model = useMemo(() => {
    const published = courses.filter((course) =>
      isTeacherCoursePublished(course),
    );
    const draft = courses.filter((course) => isTeacherCourseDraft(course));
    const pending = courses.filter(
      (course) =>
        !isTeacherCoursePublished(course) &&
        !isTeacherCourseDraft(course) &&
        isTeacherCoursePendingApproval(course),
    );
    const courseIds = new Set(courses.map((course) => course.id));
    const courseEnrollments = enrollments.filter((row) =>
      courseIds.has(row.course_id || row.courseId || row.course?.id),
    );
    const lessons = sections.flatMap(
      (section) => section.lessons || section.Lessons || [],
    );
    const publishedPosts = blogPosts.filter(isPublishedPost);
    const pendingPosts = blogPosts.filter((post) => !isPublishedPost(post));
    const averageRating =
      reviews.length > 0
        ? (
            reviews.reduce(
              (sum, review) => sum + Number(review.rating || 0),
              0,
            ) / reviews.length
          ).toFixed(1)
        : "0.0";

    return {
      published,
      draft,
      pending,
      courseEnrollments,
      lessons,
      publishedPosts,
      pendingPosts,
      averageRating,
    };
  }, [blogPosts, courses, enrollments, reviews, sections]);

  const stats = [
    ["My Courses", courses.length, FiBookOpen],
    ["Published Courses", model.published.length, FiBookOpen],
    ["Draft Courses", model.draft.length, FiEdit],
    ["Pending Approval", model.pending.length, FiFileText],
    ["Total Students", model.courseEnrollments.length, FiUsers],
    ["Lessons", model.lessons.length, FiLayers],
    ["Sections", sections.length, FiLayers],
    ["My Posts", blogPosts.length, FiFileText],
    ["Published Posts", model.publishedPosts.length, FiBookOpen],
    ["Pending Posts", model.pendingPosts.length, FiEdit],
    ["Average Rating", model.averageRating, FiStar],
  ];

  return (
    <div className="min-h-screen bg-secondary-50 px-4 py-6 dark:bg-dark-bg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#164e63] to-[#1f2937] p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">
                <FiVideo className="mr-2" /> Instructor dashboard
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Teaching workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                Courses, sections, lessons, reviews, students, and content
                management.
              </p>
            </div>
            <Link
              to="/teacher/create-course"
              className="btn w-full bg-white/20 text-white hover:bg-white/30 sm:w-auto"
            >
              Create course
              <FiPlus className="ml-2" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-secondary-500">
            <FiLoader className="mr-2 h-6 w-6 animate-spin" /> Loading
            instructor dashboard
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

            <div className="grid gap-6 xl:grid-cols-3">
              <DashboardCard
                title="Blog"
                subtitle="Manage your posts and publication status"
                action={
                  <Link to="/teacher/blog" className="btn btn-primary text-sm">
                    <FiFileText className="mr-2" /> Open Blog
                  </Link>
                }
              >
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <MiniStat label="My Posts" value={blogPosts.length} />
                  <MiniStat
                    label="Published"
                    value={model.publishedPosts.length}
                  />
                  <MiniStat label="Pending" value={model.pendingPosts.length} />
                </div>
              </DashboardCard>
              <ListCard
                title="My Courses"
                rows={courses}
                empty="No courses yet."
              />
              <ListCard
                title="Sections"
                rows={sections}
                empty="No sections yet."
              />
              <ListCard
                title="Recent Reviews"
                rows={reviews.slice(0, 5)}
                empty="No reviews yet."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <ListCard
                title="My Blog Posts"
                rows={blogPosts.slice(0, 5)}
                empty="No blog posts yet."
              />
              <ListCard
                title="Students"
                rows={model.courseEnrollments.slice(0, 5)}
                empty="No enrollments yet."
              />
              <ListCard
                title="Lessons"
                rows={model.lessons.slice(0, 5)}
                empty="No lessons yet."
              />
              <DashboardCard
                title="Assessments"
                subtitle="Assessment list endpoint missing"
              >
                <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
                  Coming Soon
                </div>
              </DashboardCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ListCard = ({ title, rows, empty }) => (
  <DashboardCard title={title} subtitle="Backend records">
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-secondary-500">
          {empty}
        </div>
      ) : (
        rows.map((row) => (
          <div
            key={row.id || row.title || row.name || row.email}
            className="rounded-xl border border-secondary-100 p-4 dark:border-dark-border"
          >
            <div className="font-semibold text-secondary-900 dark:text-white">
              {row.title || row.name || row.full_name || row.email || "Record"}
            </div>
            <div className="mt-1 text-sm text-secondary-500">
              {row.status ||
                row.description ||
                row.course_title ||
                row.created_at ||
                ""}
            </div>
          </div>
        ))
      )}
    </div>
  </DashboardCard>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl border border-secondary-100 p-4 dark:border-dark-border">
    <div className="text-xl font-semibold text-secondary-900 dark:text-white">
      {value}
    </div>
    <div className="mt-1 text-sm text-secondary-500">{label}</div>
  </div>
);

export default TeacherDashboard;
