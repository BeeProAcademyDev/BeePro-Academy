import axios from "axios";
import { formatErrorMessage } from "../lib/supabaseErrors";

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "https://bee-pro-academy.vercel.app/api/v1";
const AUTH_STORAGE_KEY = "beepro_academy_auth_session";
const AUTH_SESSION_EVENT = "beepro:auth-session-changed";
const API_LOADING_EVENT = "beepro:api-loading-changed";
const REQUEST_TIMEOUT = 20_000;

let activeRequests = 0;
let refreshPromise = null;

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").replace(/\/+$/, "");
  if (!trimmed) return "https://bee-pro-academy.vercel.app/api/v1";
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function emitLoading() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(API_LOADING_EVENT, {
      detail: { isLoading: activeRequests > 0, activeRequests },
    }),
  );
}

function beginRequest(config) {
  if (config?.skipGlobalLoading) return;
  activeRequests += 1;
  emitLoading();
}

function endRequest(config) {
  if (config?.skipGlobalLoading) return;
  activeRequests = Math.max(0, activeRequests - 1);
  emitLoading();
}

export function subscribeApiLoading(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = (event) => handler(event.detail);
  window.addEventListener(API_LOADING_EVENT, listener);
  handler({ isLoading: activeRequests > 0, activeRequests });
  return () => window.removeEventListener(API_LOADING_EVENT, listener);
}

function storedSession() {
  const value = storage()?.getItem(AUTH_STORAGE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    storage()?.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistSession(session) {
  if (!session?.access_token) storage()?.removeItem(AUTH_STORAGE_KEY);
  else storage()?.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function notifyAuth(event, session = null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_EVENT, { detail: { event, session } }),
  );
}

export function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export function toList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.courses)) return value.courses;
  if (Array.isArray(value?.sections)) return value.sections;
  if (Array.isArray(value?.lessons)) return value.lessons;
  if (Array.isArray(value?.posts)) return value.posts;
  if (Array.isArray(value?.reviews)) return value.reviews;
  if (Array.isArray(value?.enrollments)) return value.enrollments;
  if (Array.isArray(value?.notifications)) return value.notifications;
  return [];
}

export function listResponse(response) {
  const value = unwrapResponse(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.courses)) return value.courses;
  if (Array.isArray(value?.sections)) return value.sections;
  if (Array.isArray(value?.lessons)) return value.lessons;
  if (Array.isArray(value?.posts)) return value.posts;
  if (Array.isArray(value?.reviews)) return value.reviews;
  if (Array.isArray(value?.enrollments)) return value.enrollments;
  if (Array.isArray(value?.notifications)) return value.notifications;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function omitEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(
      ([, item]) => item !== undefined && item !== "",
    ),
  );
}

function optionalUrl(value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  if (!trimmed) return undefined;
  return trimmed;
}

function toIsoDateTime(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeMeeting(raw = {}) {
  const scheduledAt = raw.scheduledAt || raw.scheduled_at;
  const durationMinutes = raw.durationMinutes ?? raw.duration_minutes;
  const roomId = raw.jitsi_room_id || raw.jitsi_room_name || raw.roomName;
  const meetLink = raw.meet_link || raw.meetLink || raw.joinUrl || raw.join_url;
  return {
    ...raw,
    scheduledAt,
    scheduled_at: scheduledAt,
    durationMinutes,
    duration_minutes: durationMinutes,
    jitsi_room_id: roomId,
    jitsi_room_name: roomId,
    meet_link: meetLink,
    joinUrl: meetLink || (roomId ? `https://meet.jit.si/${roomId}` : null),
  };
}

function lessonPayload(data = {}) {
  return omitEmpty({
    title: data.title?.trim(),
    contentType: data.contentType || data.content_type || "video",
    contentUrl: optionalUrl(data.contentUrl || data.content_url),
    textContent: data.textContent || data.text_content || data.description,
    duration: Number(data.duration) || 0,
    isFree: Boolean(data.isFree ?? data.is_free),
    requiresPassingQuiz: Boolean(
      data.requiresPassingQuiz ?? data.requires_passing_quiz ?? false,
    ),
    requiresPassingAssignment: Boolean(
      data.requiresPassingAssignment ??
      data.requires_passing_assignment ??
      false,
    ),
    order:
      data.order === undefined || data.order === null
        ? undefined
        : Number(data.order),
  });
}

function meetingPayload(data = {}) {
  return omitEmpty({
    title: data.title?.trim(),
    scheduledAt: toIsoDateTime(data.scheduledAt || data.scheduled_at),
    durationMinutes:
      Number(data.durationMinutes ?? data.duration_minutes) || 60,
    status: data.status,
  });
}

function blogPayload(data = {}) {
  const content =
    data.content?.trim() ||
    data.content_en?.trim() ||
    data.excerpt?.trim() ||
    data.excerpt_en?.trim();
  return omitEmpty({
    title: (data.title || data.title_en || "").trim(),
    content,
    category: (data.category || "General").trim(),
    level: data.level || null,
    imageUrl: optionalUrl(
      data.imageUrl || data.image_url || data.cover_image_url,
    ),
  });
}

function normalizeBlogPost(post = {}) {
  return {
    ...post,
    imageUrl: post.imageUrl || post.image_url || post.cover_image_url || null,
    image_url: post.image_url || post.imageUrl || post.cover_image_url || null,
    cover_image_url:
      post.cover_image_url || post.image_url || post.imageUrl || null,
    status:
      post.status ||
      (post.is_published || post.isPublished ? "published" : "draft"),
  };
}

function assessmentPayload(data = {}) {
  const questions = Array.isArray(data.questions)
    ? data.questions
        .map((question, index) => {
          const type = question.type === "text" ? "text" : "mcq";
          const options =
            type === "mcq"
              ? (question.options || [])
                  .map((option) => ({
                    text: String(option.text || "").trim(),
                    isCorrect: Boolean(option.isCorrect ?? option.is_correct),
                  }))
                  .filter((option) => option.text)
              : undefined;
          return omitEmpty({
            type,
            text: String(question.text || question.title || "").trim(),
            grade: Number(question.grade) || 1,
            order: Number(question.order ?? index),
            options,
          });
        })
        .filter(
          (question) =>
            question.text.length >= 3 &&
            (question.type !== "mcq" ||
              ((question.options || []).length >= 2 &&
                question.options.some((option) => option.isCorrect))),
        )
    : [];

  return omitEmpty({
    lessonId: data.lessonId || data.lesson_id || undefined,
    title: data.title?.trim(),
    description: data.description || undefined,
    type: data.type === "assignment" ? "assignment" : "quiz",
    status: data.status || "draft",
    durationMinutes: Number(data.durationMinutes ?? data.duration_minutes) || 0,
    dueDate: toIsoDateTime(data.dueDate || data.due_date),
    allowLateSubmissions: Boolean(
      data.allowLateSubmissions ?? data.allow_late_submissions ?? false,
    ),
    showGrades: Boolean(data.showGrades ?? data.show_grades ?? false),
    showAnswers: Boolean(data.showAnswers ?? data.show_answers ?? false),
    questions,
  });
}

export function buildApiError(error, fallback = "Request failed") {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error
      : new Error(formatErrorMessage(error) || fallback);
  }

  const responseData = error.response?.data || {};
  const apiError = responseData.error || responseData;
  const details = Array.isArray(apiError.details)
    ? apiError.details.map((item) => item.message || item).join(", ")
    : "";
  const status = error.response?.status;
  const friendlyFallback =
    status === 404
      ? "The requested resource could not be found."
      : status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : status >= 500
            ? "The server is currently unavailable. Please try again shortly."
            : fallback;
  const result = new Error(
    details
      ? `${apiError.message || friendlyFallback}: ${details}`
      : apiError.message || friendlyFallback,
  );
  result.status = status;
  result.code = apiError.code || error.code;
  result.isTimeout = error.code === "ECONNABORTED";
  return result;
}

export async function safeRequest(
  request,
  fallback = null,
  label = "Request failed",
) {
  try {
    return unwrapResponse(await request);
  } catch (error) {
    console.warn(label, buildApiError(error, label).message);
    return fallback;
  }
}

export async function safeList(request, label = "Failed to load list") {
  try {
    return listResponse(await request);
  } catch (error) {
    console.warn(label, buildApiError(error, label).message);
    return [];
  }
}

function comingSoon(label) {
  return { disabled: true, comingSoon: true, message: label || "Coming Soon" };
}

function findToken(data, key) {
  return (
    data?.[key] ||
    data?.data?.[key] ||
    data?.tokens?.[key] ||
    data?.data?.tokens?.[key] ||
    null
  );
}

function normalizeUser(user = {}) {
  return {
    ...user,
    id: user.id || user.sub,
    full_name:
      user.full_name || user.fullName || user.name || user.email?.split("@")[0],
    fullName: user.fullName || user.full_name || user.name,
    avatar_url: user.avatar_url || user.avatarUrl || null,
    role: user.role || "student",
  };
}

function normalizeAuthResponse(data = {}) {
  const root = data.data || data;
  const accessToken =
    findToken(data, "access_token") ||
    findToken(data, "accessToken") ||
    findToken(data, "token");
  const refreshToken =
    findToken(data, "refresh_token") || findToken(data, "refreshToken");
  const expiresIn = Number(root.expiresIn || root.expires_in || 3600);
  const user = normalizeUser(root.user || root.profile || root);

  return {
    user,
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_at:
        root.expires_at ||
        root.expiresAt ||
        Math.floor(Date.now() / 1000) + expiresIn,
      user,
    },
  };
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = storedSession()?.refresh_token;
  if (!refreshToken) return null;

  refreshPromise = apiClient
    .post(
      "/auth/refresh-token",
      { refreshToken },
      { skipAuthRefresh: true, skipGlobalLoading: true },
    )
    .then((response) => {
      const session = normalizeAuthResponse(response.data).session;
      persistSession(session);
      notifyAuth("SIGNED_IN", session);
      return session;
    })
    .catch((error) => {
      persistSession(null);
      notifyAuth("SIGNED_OUT");
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function shouldRetry(error) {
  const config = error.config || {};
  const method = (config.method || "get").toLowerCase();
  const status = error.response?.status;
  return (
    !config._retryNetwork &&
    ["get", "head", "options"].includes(method) &&
    (!error.response || [408, 429, 502, 503, 504].includes(status))
  );
}

apiClient.interceptors.request.use((config) => {
  beginRequest(config);
  const token = storedSession()?.access_token;
  if (token && !config.skipAuth) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    endRequest(response.config);
    return response;
  },
  async (error) => {
    endRequest(error.config);
    const request = error.config;

    if (request && shouldRetry(error)) {
      request._retryNetwork = true;
      return apiClient(request);
    }

    if (
      request &&
      error.response?.status === 401 &&
      !request._retryAuth &&
      !request.skipAuthRefresh
    ) {
      request._retryAuth = true;
      try {
        const session = await refreshSession();
        if (session?.access_token) {
          request.headers = request.headers || {};
          request.headers.Authorization = `Bearer ${session.access_token}`;
          return apiClient(request);
        }
      } catch {
        persistSession(null);
        notifyAuth("SIGNED_OUT");
      }
    }

    return Promise.reject(error);
  },
);

export const authService = {
  async register(data) {
    const response = await apiClient.post(
      "/auth/register",
      {
        fullName: data.fullName,
        email: data.email?.trim().toLowerCase(),
        phone: data.phone || "",
        password: data.password,
        role: data.role || "student",
      },
      { skipAuth: true },
    );
    const auth = normalizeAuthResponse(response.data);
    persistSession(auth.session);
    notifyAuth("SIGNED_IN", auth.session);
    return {
      ...unwrapResponse(response),
      ...auth,
      resolvedRole: data.role || "student",
    };
  },

  async login({ email, password }) {
    const response = await apiClient.post(
      "/auth/login",
      { email: email?.trim().toLowerCase(), password },
      { skipAuth: true },
    );
    const auth = normalizeAuthResponse(response.data);
    persistSession(auth.session);
    notifyAuth("SIGNED_IN", auth.session);
    return { ...unwrapResponse(response), ...auth };
  },

  async logout() {
    const refreshToken = storedSession()?.refresh_token;
    try {
      await safeRequest(
        apiClient.post("/auth/logout", { refreshToken }, { skipAuth: false }),
        null,
        "Failed to sign out",
      );
    } catch (err) {
      console.warn("Logout request failed:", err);
    }
    persistSession(null);
    notifyAuth("SIGNED_OUT");
    return { success: true };
  },

  async getCurrentUser() {
    const result = await safeRequest(
      apiClient.get("/auth/me"),
      null,
      "Failed to fetch current user",
    );
    return result || storedSession()?.user || null;
  },

  async resetPassword(email) {
    return safeRequest(
      apiClient.post("/auth/forgot-password", { email }, { skipAuth: true }),
      null,
      "Password reset request failed",
    );
  },

  async confirmResetPassword(data) {
    return safeRequest(
      apiClient.post("/auth/reset-password", data, { skipAuth: true }),
      null,
      "Password reset failed",
    );
  },

  async updatePassword(data) {
    return comingSoon("Password changes are not supported by the backend API.");
  },

  getAuthState() {
    const session = storedSession();
    return { session, user: session?.user || null };
  },

  isSessionExpired(session) {
    return Boolean(
      session?.expires_at && session.expires_at * 1000 <= Date.now(),
    );
  },

  isConfigured() {
    return Boolean(API_BASE_URL);
  },
};

export const courseService = {
  async getCourses(params = {}) {
    const result = await safeRequest(
      apiClient.get("/courses", { params }),
      null,
      "Failed to fetch courses",
    );

    const courses = Array.isArray(result?.courses)
      ? result.courses
      : toList(result);
    const total = Number(
      result?.pagination?.total ?? result?.pagination?.count ?? courses.length,
    );

    return {
      data: courses,
      count: Number.isFinite(total) ? total : courses.length,
    };
  },
  async getCourseById(id) {
    if (!id) return null;
    return safeRequest(
      apiClient.get(`/courses/${id}`),
      null,
      "Failed to fetch course",
    );
  },
  async getPublishedCourseDetails(id) {
    const course = await this.getCourseById(id);
    const isVisible =
      course?.status === "published" &&
      course?.admin_approval_status === "approved";
    return isVisible ? course : null;
  },
  async getCourseCheckoutSummary(id) {
    return this.getCourseById(id);
  },
  async createCourse(data) {
    return safeRequest(
      apiClient.post("/courses", data),
      null,
      "Failed to create course",
    );
  },
  async updateCourse(id, data) {
    return safeRequest(
      apiClient.patch(`/courses/${id}`, data),
      null,
      "Failed to update course",
    );
  },
  async deleteCourse(id) {
    return safeRequest(
      apiClient.delete(`/courses/${id}`),
      null,
      "Failed to delete course",
    );
  },
  async getFeaturedCourses(limit = 6) {
    const result = await this.getCourses({ limit });
    return result.data || [];
  },
  async getCoursesByCategory(category) {
    const result = await this.getCourses({ category });
    return result.data || [];
  },
  async getInstructorCourses(instructorId) {
    const result = await safeRequest(
      apiClient.get("/courses/instructor/my"),
      null,
      "Failed to fetch instructor courses",
    );
    const data = Array.isArray(result?.courses)
      ? result.courses
      : toList(result);
    if (!instructorId) return data;
    return data.filter((course) =>
      [
        course.instructor_id,
        course.instructorId,
        course.created_by,
        course.user_id,
      ].includes(instructorId),
    );
  },
};

export const categoryService = {
  async getCategories(params = {}) {
    return safeList(
      apiClient.get("/categories", { params }),
      "Failed to fetch categories",
    );
  },
  async createCategory(data) {
    return safeRequest(
      apiClient.post("/categories", data),
      null,
      "Failed to create category",
    );
  },
  async updateCategory(id, data) {
    return safeRequest(
      apiClient.patch(`/categories/${id}`, data),
      null,
      "Failed to update category",
    );
  },
  async deleteCategory(id) {
    return safeRequest(
      apiClient.delete(`/categories/${id}`),
      null,
      "Failed to delete category",
    );
  },
};

export const sectionService = {
  async getSectionsByCourse(courseId) {
    if (!courseId) return [];
    return safeList(
      apiClient.get(`/courses/${courseId}/sections`),
      "Failed to fetch course sections",
    );
  },
  async createSection(courseId, data) {
    return safeRequest(
      apiClient.post(`/courses/${courseId}/sections`, data),
      null,
      "Failed to create section",
    );
  },
  async updateSection(courseId, sectionId, data) {
    return safeRequest(
      apiClient.patch(`/courses/${courseId}/sections/${sectionId}`, data),
      null,
      "Failed to update section",
    );
  },
  async deleteSection(courseId, sectionId) {
    return safeRequest(
      apiClient.delete(`/courses/${courseId}/sections/${sectionId}`),
      null,
      "Failed to delete section",
    );
  },
};

import { createLessonService } from "./lessonService";

export const lessonService = createLessonService({
  apiClient,
  safeRequest,
  safeList,
  comingSoon,
});

export const enrollmentService = {
  async enrollInCourse(courseId) {
    return safeRequest(
      apiClient.post(`/progress/enroll/${courseId}`),
      null,
      "Enrollment failed",
    );
  },
  async getEnrollments() {
    return safeList(
      apiClient.get("/progress/enrollments"),
      "Failed to fetch enrollments",
    );
  },
  async getUserEnrollments() {
    return this.getEnrollments();
  },
  async isEnrolled(courseId) {
    const rows = await this.getEnrollments();
    return rows.some((row) =>
      [row.course_id, row.courseId, row.course?.id, row.Course?.id].includes(
        courseId,
      ),
    );
  },
  async updateProgress(lessonId, data = {}) {
    if (!lessonId) return comingSoon("Coming Soon");
    return safeRequest(
      apiClient.put(`/progress/lesson/${lessonId}`, data),
      null,
      "Failed to update lesson progress",
    );
  },
  async getCourseProgress(courseId) {
    if (!courseId) return null;
    return safeRequest(
      apiClient.get(`/progress/course/${courseId}`),
      null,
      "Failed to fetch course progress",
    );
  },
  async deleteEnrollment() {
    return comingSoon("Coming Soon");
  },
};

export const progressService = {
  updateLessonProgress: enrollmentService.updateProgress,
  getCourseProgress: enrollmentService.getCourseProgress,
};

export const adminService = {
  async getAllUsers(params = {}) {
    return safeList(
      apiClient.get("/admin/users", { params }),
      "Failed to fetch users",
    );
  },
  async getAllUsersAdmin(params) {
    return this.getAllUsers(params);
  },
  async getPendingInstructors() {
    return safeList(
      apiClient.get("/admin/users/pending"),
      "Failed to fetch pending instructors",
    );
  },
  async approveInstructor(userId) {
    return safeRequest(
      apiClient.patch(`/admin/users/${userId}/approve`),
      null,
      "Failed to approve instructor",
    );
  },
  async rejectInstructor(userId) {
    if (!userId) return comingSoon("Coming Soon");
    return safeRequest(
      apiClient.patch(`/admin/users/${userId}/reject`),
      null,
      "Failed to reject instructor",
    );
  },
  async setUserSuspended(userId, isSuspended) {
    return safeRequest(
      apiClient.patch(
        `/admin/users/${userId}/${isSuspended ? "suspend" : "activate"}`,
      ),
      null,
      "Failed to update user status",
    );
  },
  async updateUserRole() {
    return comingSoon("Coming Soon");
  },
  async updateUserRoleAdmin(userId, role) {
    return comingSoon("Role updates are not supported by the backend API.");
  },
  async updateCourseStatus(courseId, status) {
    return safeRequest(
      apiClient.patch(`/admin/courses/${courseId}/update-status`, { status }),
      null,
      "Failed to update course status",
    );
  },
  async getUserDetailsAdmin(userId) {
    return null;
  },
  async getUserDetailsFallback() {
    return null;
  },
  async deletePlatformUser() {
    return comingSoon("Coming Soon");
  },
  async getCrmContacts() {
    return [];
  },
  async getDashboardStats() {
    const [users, pendingInstructors, coursesResult, categories] =
      await Promise.all([
        this.getAllUsers(),
        this.getPendingInstructors(),
        courseService.getCourses(),
        categoryService.getCategories(),
      ]);
    const courses = coursesResult.data || [];
    return { users, pendingInstructors, courses, categories };
  },
};

export const reviewService = {
  async getReviewsByCourse(courseId) {
    if (!courseId) return [];
    return safeList(
      apiClient.get(`/courses/${courseId}/reviews`),
      "Failed to fetch reviews",
    );
  },
  async createReview(courseId, data = {}) {
    if (!courseId) return null;
    return safeRequest(
      apiClient.post(`/courses/${courseId}/reviews`, {
        rating: Number(data.rating),
        comment: data.comment?.trim() || null,
      }),
      null,
      "Failed to create review",
    );
  },
  async updateReview(reviewId, data = {}) {
    if (!reviewId) return null;
    return safeRequest(
      apiClient.patch(
        `/reviews/${reviewId}`,
        omitEmpty({
          rating:
            data.rating === undefined || data.rating === null
              ? undefined
              : Number(data.rating),
          comment:
            data.comment === undefined
              ? undefined
              : data.comment?.trim() || null,
        }),
      ),
      null,
      "Failed to update review",
    );
  },
  async deleteReview(reviewId) {
    if (!reviewId) return null;
    return safeRequest(
      apiClient.delete(`/reviews/${reviewId}`),
      { success: true },
      "Failed to delete review",
    );
  },
};

export const assessmentService = {
  async getCourseAssessments(courseId) {
    return [];
  },
  async createAssessment(courseId, data) {
    const payload = assessmentPayload(data);
    if (!courseId || payload.questions.length === 0) return null;
    return safeRequest(
      apiClient.post(`/courses/${courseId}/assessments`, payload),
      null,
      "Failed to create assessment",
    );
  },
  async updateAssessment(courseId, assessmentId, data) {
    const payload = assessmentPayload(data);
    if (!courseId || !assessmentId || payload.questions.length === 0)
      return null;
    return safeRequest(
      apiClient.patch(
        `/courses/${courseId}/assessments/${assessmentId}`,
        payload,
      ),
      null,
      "Failed to update assessment",
    );
  },
  async deleteAssessment(courseId, assessmentId) {
    return safeRequest(
      apiClient.delete(`/courses/${courseId}/assessments/${assessmentId}`),
      null,
      "Failed to delete assessment",
    );
  },
  async getAssessment(courseId, assessmentId) {
    if (!courseId || !assessmentId) return null;
    return safeRequest(
      apiClient.get(`/courses/${courseId}/assessments/${assessmentId}`),
      null,
      "Failed to fetch assessment",
    );
  },
  async startAssessment(courseId, assessmentId, data = {}) {
    if (!courseId || !assessmentId) return null;
    return safeRequest(
      apiClient.post(`/courses/${courseId}/assessments/${assessmentId}/start`),
      null,
      "Failed to start assessment",
    );
  },
  async submitAssessment(courseId, assessmentId, data) {
    if (!courseId || !assessmentId) return null;
    const answers = Array.isArray(data?.answers) ? data.answers : [];
    return safeRequest(
      apiClient.post(
        `/courses/${courseId}/assessments/${assessmentId}/submit`,
        { answers },
      ),
      null,
      "Failed to submit assessment",
    );
  },
  async getSubmission(submissionId) {
    return safeRequest(
      apiClient.get(`/submissions/${submissionId}`),
      null,
      "Failed to fetch submission",
    );
  },
  async getAssessmentSubmission(courseId, assessmentId, submissionId) {
    if (!courseId || !assessmentId || !submissionId) return null;
    return safeRequest(
      apiClient.get(
        `/courses/${courseId}/assessments/${assessmentId}/submissions/${submissionId}`,
      ),
      null,
      "Failed to fetch assessment submission",
    );
  },
  async getAssessmentSubmissions(courseId, assessmentId) {
    if (!courseId || !assessmentId) return [];
    return safeList(
      apiClient.get(
        `/courses/${courseId}/assessments/${assessmentId}/submissions`,
      ),
      "Failed to fetch assessment submissions",
    );
  },
  async reviewSubmission(courseId, assessmentId, submissionId, data = {}) {
    if (!courseId || !assessmentId || !submissionId) return null;
    const answers = Array.isArray(data.answers) ? data.answers : [];
    return safeRequest(
      apiClient.patch(
        `/courses/${courseId}/assessments/${assessmentId}/submissions/${submissionId}/review`,
        { answers },
      ),
      null,
      "Failed to review assessment submission",
    );
  },
};

export const uploadService = {
  async getSignature(params = {}) {
    return safeRequest(
      apiClient.post("/upload/signature", params),
      null,
      "Failed to get upload signature",
    );
  },
  async upload(data) {
    const headers =
      data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
    return safeRequest(
      apiClient.post("/upload", data, { headers }),
      null,
      "Failed to upload file",
    );
  },
};

export const userService = {
  async getProfile() {
    return safeRequest(
      apiClient.get("/auth/me"),
      null,
      "Failed to fetch profile",
    );
  },
  async getOrCreateProfile() {
    return this.getProfile();
  },
  async updateProfile(data) {
    const payload = omitEmpty({
      full_name: data.full_name || data.fullName,
      phone: data.phone,
      avatar_url: optionalUrl(data.avatar_url || data.avatarUrl),
    });
    if (Object.keys(payload).length === 0) return null;
    return safeRequest(
      apiClient.patch("/auth/me", payload),
      null,
      "Failed to update profile",
    );
  },
  async ensureUserRole() {
    return this.getProfile();
  },
  async uploadAvatar(fileOrUrl) {
    if (typeof fileOrUrl === "string") {
      return safeRequest(
        apiClient.patch("/auth/me", { avatar_url: fileOrUrl }),
        null,
        "Failed to update avatar",
      );
    }
    return comingSoon("Avatar upload requires a supported upload flow.");
  },
};

export const profileService = userService;

export const dashboardService = {
  async getAdminDashboard() {
    return safeRequest(
      apiClient.get("/dashboard/admin"),
      null,
      "Failed to fetch admin dashboard",
    );
  },
  async getTeacherDashboard() {
    return safeRequest(
      apiClient.get("/dashboard/instructor"),
      null,
      "Failed to fetch teacher dashboard",
    );
  },
  async getStudentDashboard() {
    return safeRequest(
      apiClient.get("/dashboard/student"),
      null,
      "Failed to fetch student dashboard",
    );
  },
};

export const analyticsService = {
  async getAdminAnalytics() {
    const { users, pendingInstructors, courses, categories } =
      await adminService.getDashboardStats();
    return {
      total_users: users.length,
      pending_instructors: pendingInstructors.length,
      total_courses: courses.length,
      total_categories: categories.length,
    };
  },
  async getTeacherAnalytics(userId) {
    const courses = await courseService.getInstructorCourses(userId);
    const enrollments = await enrollmentService.getEnrollments();
    return {
      total_courses: courses.length,
      total_enrollments: enrollments.length,
    };
  },
  async getCourseAnalytics(courseId) {
    const [progress, reviews] = await Promise.all([
      enrollmentService.getCourseProgress(courseId),
      reviewService.getReviewsByCourse(courseId),
    ]);
    return { progress, reviews };
  },
};

export const meetingService = {
  async getMeetings(params = {}) {
    return this.getUpcomingMeetings(params);
  },
  async getMeeting(id) {
    return null;
  },
  async getLessonMeeting(lessonId) {
    if (!lessonId) return null;
    const meeting = await safeRequest(
      apiClient.get(`/lessons/${lessonId}/meetings`),
      null,
      "Failed to fetch lesson meeting",
    );
    return meeting ? normalizeMeeting(meeting) : null;
  },
  async createMeeting(data) {
    const lessonId = data.lessonId || data.lesson_id;
    if (!lessonId) {
      return comingSoon("Meeting creation requires a lesson ID.");
    }

    const meeting = await safeRequest(
      apiClient.post(`/lessons/${lessonId}/meetings`, meetingPayload(data)),
      null,
      "Failed to create meeting",
    );
    return meeting ? normalizeMeeting(meeting) : null;
  },
  async getMeetingsByCourse(courseId, options = {}) {
    if (!courseId) return [];
    const sections = await sectionService.getSectionsByCourse(courseId);
    const lessons = (sections || []).flatMap((section) =>
      (section.lessons || []).map((lesson) => ({
        ...lesson,
        section_id: section.id,
        course_id: courseId,
      })),
    );
    const meetings = await Promise.all(
      lessons.map((lesson) => this.getLessonMeeting(lesson.id)),
    );
    return meetings
      .filter(Boolean)
      .map((meeting) => normalizeMeeting({ ...meeting, course_id: courseId }));
  },
  async getUpcomingMeetings(options = {}) {
    const meetings = await safeList(
      apiClient.get("/meetings/upcoming", { params: options }),
      "Failed to fetch upcoming meetings",
    );
    return meetings.map(normalizeMeeting);
  },
  async updateMeeting(id, data) {
    if (!id) return comingSoon("Coming Soon");
    const meeting = await safeRequest(
      apiClient.put(`/meetings/${id}`, meetingPayload(data)),
      null,
      "Failed to update meeting",
    );
    return meeting ? normalizeMeeting(meeting) : null;
  },
  async deleteMeeting(id) {
    if (!id) return comingSoon("Coming Soon");
    return safeRequest(
      apiClient.delete(`/meetings/${id}`),
      null,
      "Failed to delete meeting",
    );
  },
  async ensureMeetingJoinFields(meeting) {
    return meeting;
  },
};

export const notificationService = {
  async getUserNotifications(params = {}) {
    return safeList(
      apiClient.get("/notifications", { params }),
      "Failed to fetch notifications",
    );
  },
  async getSessionInvites(_, options = {}) {
    const items = await this.getUserNotifications(options);
    return (items || []).filter((notification) => {
      const text =
        `${notification?.title || ""} ${notification?.message || ""}`.toLowerCase();
      return (
        notification?.type === "meeting" ||
        notification?.type === "live_meeting" ||
        /meeting|session|live/i.test(text)
      );
    });
  },
  async getUnreadCount() {
    const result = await safeRequest(
      apiClient.get("/notifications/unread-count"),
      { unreadCount: 0 },
      "Failed to fetch unread notifications count",
    );
    return Number(result?.unreadCount ?? result?.count ?? result ?? 0);
  },
  subscribeToUserNotifications() {
    return null;
  },
  removeChannel() {},
  async markAsRead(notificationId) {
    if (!notificationId) return null;
    return safeRequest(
      apiClient.patch(`/notifications/${notificationId}/read`),
      null,
      "Failed to mark notification as read",
    );
  },
  async markAllAsRead() {
    return safeRequest(
      apiClient.patch("/notifications/read-all"),
      null,
      "Failed to mark all notifications as read",
    );
  },
  async deleteNotification(notificationId) {
    return comingSoon("Notification deletion is not supported by the backend.");
  },
  async notifyStudents() {
    return comingSoon("Coming Soon");
  },
  async notifyEligibleStudents() {
    return comingSoon("Coming Soon");
  },
};

export const chatService = {
  getCourseChatChannelName: (courseId) => `course-chat-${courseId}`,
  subscribeToCourseChat(_courseId, handlers = {}) {
    handlers.onStatus?.("DISABLED");
    return null;
  },
  subscribeToConversationMessages() {
    return null;
  },
  removeChannel() {},
  async broadcastChatMessage() {},
  async getOrCreateConversation() {
    return null;
  },
  async _hydrateConversation() {
    return null;
  },
  async getInstructorChatRoster() {
    return [];
  },
  async getStudentChatInbox() {
    return [];
  },
  async getInstructorConversations() {
    return [];
  },
  async getMessages() {
    return [];
  },
  async _hydrateMessages(messages) {
    return messages || [];
  },
  async sendMessage() {
    return comingSoon("Coming Soon");
  },
  async markMessagesAsRead() {
    return comingSoon("Coming Soon");
  },
};

export const paymentService = {
  async hasApprovedPaymentForCourse() {
    return false;
  },
};

export const blogService = {
  async getPublishedPosts(params = {}) {
    const posts = await safeList(
      apiClient.get("/blog", { params }),
      "Failed to fetch blog posts",
    );
    return posts.map(normalizeBlogPost);
  },
  async getMyPosts(params = {}) {
    const posts = await safeList(
      apiClient.get("/blog/author/my-posts", { params }),
      "Failed to fetch my blog posts",
    );
    return posts.map(normalizeBlogPost);
  },
  async getAdminPosts(params = {}) {
    return this.getMyPosts(params);
  },
  async getPendingPosts(params = {}) {
    const posts = await safeList(
      apiClient.get("/blog/admin/pending", { params }),
      "Failed to fetch pending blog posts",
    );
    return posts.map(normalizeBlogPost);
  },
  async getPostById(id) {
    if (!id) return null;
    const post = await safeRequest(
      apiClient.get(`/blog/${id}`),
      null,
      "Failed to fetch blog post",
    );
    return post ? normalizeBlogPost(post) : null;
  },
  async createPost(data) {
    const post = await safeRequest(
      apiClient.post("/blog", blogPayload(data)),
      null,
      "Failed to create blog post",
    );
    return post ? normalizeBlogPost(post) : null;
  },
  async updatePost(id, data) {
    if (!id) return comingSoon("Coming Soon");
    const post = await safeRequest(
      apiClient.patch(`/blog/${id}`, blogPayload(data)),
      null,
      "Failed to update blog post",
    );
    return post ? normalizeBlogPost(post) : null;
  },
  async deletePost(id) {
    if (!id) return comingSoon("Coming Soon");
    return safeRequest(
      apiClient.delete(`/blog/${id}`),
      null,
      "Failed to delete blog post",
    );
  },
};

export const articleScheduleService = {
  async getSchedules() {
    return [];
  },
  async createSchedule() {
    return comingSoon("Coming Soon");
  },
  async updateSchedule() {
    return comingSoon("Coming Soon");
  },
  async deleteSchedule() {
    return comingSoon("Coming Soon");
  },
  async processSchedule() {
    return comingSoon("Coming Soon");
  },
  async processDueSchedules() {
    return comingSoon("Coming Soon");
  },
};

export const reportService = {
  async getReports() {
    return [];
  },
  async getReport() {
    return null;
  },
  async exportReport() {
    return comingSoon("Coming Soon");
  },
};

export const certificateService = {
  async getCertificates() {
    return [];
  },
  async getCertificate() {
    return null;
  },
  async generateCertificate() {
    return comingSoon("Coming Soon");
  },
};

export const settingsService = {
  async getSettings() {
    return {};
  },
  async updateSettings() {
    return comingSoon("Coming Soon");
  },
};

export const services = {
  categories: categoryService,
  blogs: blogService,
  articleSchedules: articleScheduleService,
  admin: adminService,
  meetings: meetingService,
  notifications: notificationService,
  chat: chatService,
};

export const apiInternals = {
  AUTH_STORAGE_KEY,
  AUTH_SESSION_EVENT,
  API_BASE_URL,
};
