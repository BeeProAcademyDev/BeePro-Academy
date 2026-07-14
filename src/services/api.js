import axios from "axios";
import { generateArticleDraft } from "../lib/articleAiGenerator";
import {
  getMeetingJoinTarget,
  isExternalGoogleMeet,
  getJitsiExternalUrl,
  normalizeMeetingRecord,
  resolveJitsiRoomName,
} from "../lib/jitsi";

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function mergeMeetingRows(primary = [], secondary = []) {
  const byId = new Map();

  [...primary, ...secondary].forEach((row) => {
    if (!row) return;
    const key = row.id || `${row.title}-${row.scheduled_at}`;
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, row);
      return;
    }

    byId.set(key, {
      ...existing,
      ...row,
      jitsi_room_name: hasText(row.jitsi_room_name)
        ? row.jitsi_room_name
        : existing.jitsi_room_name,
      platform: row.platform || existing.platform,
      meet_link: row.meet_link ?? existing.meet_link,
    });
  });

  return Array.from(byId.values());
}
import { formatErrorMessage } from "../lib/supabaseErrors";
import { resolveSignupRole } from "../lib/roles";
import { categories as mockCategories } from "../data/courses";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  console.error(
    "[api] VITE_API_BASE_URL is not set. All API requests will fail. " +
      "Add VITE_API_BASE_URL=https://bee-pro-academy.vercel.app/api/v1 to your .env.local file.",
  );
}
const AUTH_STORAGE_KEY = "beepro_academy_auth_session";
const AUTH_SESSION_EVENT = "beepro:auth-session-changed";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage || null;
}

function decodeJwtPayload(jwt) {
  try {
    const body = jwt.split(".")[1];
    if (!body) return null;
    const b64 = body.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = typeof atob === "function" ? atob(padded) : "";
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function dispatchAuthSessionChange(event, session = null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_EVENT, {
      detail: { event, session },
    }),
  );
}

function getStoredSession() {
  const storage = getBrowserStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;

    const expiresAt = Number(parsed?.expires_at || 0);
    if (expiresAt && expiresAt * 1000 <= Date.now()) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistSession(session) {
  const storage = getBrowserStorage();
  if (!storage) return;

  if (!session?.user && !session?.access_token) {
    storage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  const storage = getBrowserStorage();
  if (storage) storage.removeItem(AUTH_STORAGE_KEY);
}

function isSessionExpired(session) {
  const expiresAt = Number(session?.expires_at || 0);
  return Boolean(expiresAt && expiresAt * 1000 <= Date.now());
}

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  const token =
    session?.access_token || session?.accessToken || session?.token || "";

  if (session && isSessionExpired(session)) {
    clearStoredSession();
    dispatchAuthSessionChange("SIGNED_OUT", null);
    return config;
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // If unauthorized, try to refresh once
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const session = getStoredSession();
      const refreshToken =
        session?.refresh_token || session?.refreshToken || null;

      if (refreshToken) {
        return apiClient
          .post("/auth/refresh-token", { refreshToken })
          .then((res) => {
            const authData = normalizeAuthResponse(res.data);
            persistSession(authData.session);
            dispatchAuthSessionChange("SIGNED_IN", authData.session);
            // Update Authorization header and retry original request
            originalRequest.headers = originalRequest.headers || {};
            if (authData.session?.access_token) {
              originalRequest.headers.Authorization = `Bearer ${authData.session.access_token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((refreshErr) => {
            clearStoredSession();
            dispatchAuthSessionChange("SIGNED_OUT", null);
            return Promise.reject(buildApiError(refreshErr, "Session expired"));
          });
      }
      clearStoredSession();
      dispatchAuthSessionChange("SIGNED_OUT", null);
    }

    if (status === 401) {
      clearStoredSession();
      dispatchAuthSessionChange("SIGNED_OUT", null);
    }

    return Promise.reject(error);
  },
);

function findFirstString(...values) {
  return (
    values.find((value) => typeof value === "string" && value.trim()) || ""
  );
}

function extractAccessToken(payload = {}) {
  return findFirstString(
    payload.accessToken,
    payload.access_token,
    payload.token,
    payload.jwt,
    payload.data?.accessToken,
    payload.data?.access_token,
    payload.data?.token,
    payload.data?.jwt,
    payload.session?.access_token,
    payload.session?.accessToken,
    payload.data?.session?.access_token,
    payload.data?.session?.accessToken,
    payload.tokens?.accessToken,
    payload.tokens?.access_token,
    payload.data?.tokens?.accessToken,
    payload.data?.tokens?.access_token,
  );
}

function extractRefreshToken(payload = {}) {
  return findFirstString(
    payload.refreshToken,
    payload.refresh_token,
    payload.data?.refreshToken,
    payload.data?.refresh_token,
    payload.session?.refresh_token,
    payload.data?.session?.refresh_token,
    payload.tokens?.refreshToken,
    payload.tokens?.refresh_token,
    payload.data?.tokens?.refreshToken,
    payload.data?.tokens?.refresh_token,
  );
}

function getExpiresAt(payload = {}, jwtPayload = null) {
  const expiresAt =
    payload.expires_at ||
    payload.expiresAt ||
    payload.data?.expires_at ||
    payload.data?.expiresAt ||
    jwtPayload?.exp;
  if (expiresAt) return expiresAt;

  const expiresIn = Number(
    payload.expires_in ||
      payload.expiresIn ||
      payload.data?.expires_in ||
      payload.data?.expiresIn,
  );
  return Number.isFinite(expiresIn) && expiresIn > 0
    ? Math.floor(Date.now() / 1000) + expiresIn
    : null;
}

function normalizeAuthUser(rawUser = {}, fallback = {}, jwtPayload = null) {
  const source = rawUser && typeof rawUser === "object" ? rawUser : {};
  const metadata = source.user_metadata || source.metadata || {};
  const email = findFirstString(
    source.email,
    jwtPayload?.email,
    fallback.email,
  );
  const fullName = findFirstString(
    source.full_name,
    source.fullName,
    source.name,
    metadata.full_name,
    metadata.fullName,
    jwtPayload?.full_name,
    jwtPayload?.name,
    fallback.fullName,
    fallback.full_name,
    email ? email.split("@")[0] : "",
  );
  const avatarUrl = findFirstString(
    source.avatar_url,
    source.avatarUrl,
    metadata.avatar_url,
    metadata.avatarUrl,
    jwtPayload?.avatar_url,
  );
  const phone = findFirstString(
    source.phone,
    source.phone_number,
    source.phoneNumber,
    metadata.phone,
    fallback.phone,
  );
  const role = findFirstString(
    source.role,
    source.userRole,
    metadata.role,
    jwtPayload?.role,
    fallback.role,
    "student",
  );

  return {
    ...source,
    id: findFirstString(
      source.id,
      source._id,
      source.userId,
      source.uid,
      source.sub,
      jwtPayload?.sub,
      fallback.id,
    ),
    email,
    full_name: fullName,
    fullName,
    phone,
    avatar_url: avatarUrl || null,
    role,
    user_metadata: {
      ...metadata,
      full_name: fullName,
      phone,
      avatar_url: avatarUrl || null,
      role,
    },
  };
}

function normalizeAuthResponse(payload = {}, fallbackUserData = {}) {
  const root =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const token = extractAccessToken(payload);
  const refreshToken = extractRefreshToken(payload);
  const jwtPayload = token ? decodeJwtPayload(token) : null;
  const rawUser =
    root?.user ||
    root?.profile ||
    root?.account ||
    payload?.user ||
    payload?.profile ||
    jwtPayload ||
    root;
  const user = normalizeAuthUser(rawUser, fallbackUserData, jwtPayload);
  const session = {
    access_token: token || null,
    refresh_token: refreshToken || null,
    token_type: token ? "Bearer" : null,
    expires_at: getExpiresAt(payload, jwtPayload),
    user,
  };

  return { user, session, raw: payload };
}

function buildApiError(error, fallbackMessage = "Request failed") {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error
      : new Error(formatErrorMessage(error) || fallbackMessage);
  }

  if (!error.response) {
    return new Error(
      "Network error. Please check your connection and try again.",
    );
  }

  const data = error.response.data || {};
  const apiError =
    data.error && typeof data.error === "object" ? data.error : data;
  const details = Array.isArray(apiError.details)
    ? apiError.details
    : Array.isArray(data.details)
      ? data.details
      : [];
  const validationErrors =
    apiError.errors ||
    data.errors ||
    apiError.validationErrors ||
    data.validationErrors ||
    null;
  const validationText = Array.isArray(validationErrors)
    ? validationErrors
        .map((item) => item?.message || item)
        .filter(Boolean)
        .join(", ")
    : validationErrors && typeof validationErrors === "object"
      ? Object.entries(validationErrors)
          .map(
            ([field, value]) =>
              `${field}: ${Array.isArray(value) ? value.join(", ") : value}`,
          )
          .join(", ")
      : "";
  const detailText = details
    .map((item) => item?.message || item)
    .filter(Boolean)
    .join(", ");
  const message = findFirstString(
    apiError.message,
    data.message,
    data.error,
    error.message,
    fallbackMessage,
  );
  const combinedDetails = [detailText, validationText]
    .filter(Boolean)
    .join(", ");
  const normalized = new Error(
    combinedDetails ? `${message}: ${combinedDetails}` : message,
  );
  normalized.status = error.response.status;
  normalized.code = apiError.code || data.code;
  normalized.details = details;
  return normalized;
}

function unsupportedFeature(featureName) {
  throw new Error(
    `${featureName} is not supported by the current backend REST API.`,
  );
}

const mockArticleSchedules = [];
const mockReviews = [];

// ============ AUTH SERVICES ============
export const authService = {
  async register({ email, password, fullName, phone = "", role = "student" }) {
    console.log("[authService.register] Called with:", {
      email,
      fullName,
      phone,
      role,
    });
    let resolvedRole;
    try {
      resolvedRole = resolveSignupRole(role);
    } catch (roleError) {
      throw roleError;
    }

    try {
      console.log(
        '[authService.register] Calling apiClient.post("/auth/register")',
      );
      const response = await apiClient.post("/auth/register", {
        fullName,
        email: (email || "").toString().trim().toLowerCase(),
        phone,
        password,
      });
      const authData = normalizeAuthResponse(response.data, {
        email,
        fullName,
        phone,
        role: resolvedRole,
      });
      persistSession(authData.session);
      dispatchAuthSessionChange("SIGNED_IN", authData.session);
      return {
        ...authData.raw,
        user: authData.user,
        session: authData.session,
        resolvedRole,
        emailDeliveryFailed: false,
      };
    } catch (e) {
      throw buildApiError(e, "Registration failed");
    }
  },

  async login({ email, password }) {
    try {
      const normalizedEmail = (email || "").toString().trim().toLowerCase();
      const response = await apiClient.post("/auth/login", {
        email: normalizedEmail,
        password,
      });
      const authData = normalizeAuthResponse(response.data, {
        email: normalizedEmail,
      });
      persistSession(authData.session);
      dispatchAuthSessionChange("SIGNED_IN", authData.session);
      return {
        ...authData.raw,
        user: authData.user,
        session: authData.session,
      };
    } catch (e) {
      throw buildApiError(e, "Login failed");
    }
  },

  async logout() {
    const session = getStoredSession();
    const refreshToken =
      session?.refresh_token || session?.refreshToken || null;
    try {
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch (e) {
      // ignore server logout errors but continue to clear client session
    }

    clearStoredSession();
    dispatchAuthSessionChange("SIGNED_OUT", null);
    return { success: true };
  },

  async getCurrentUser() {
    const session = getStoredSession();
    if (!session?.access_token) return null;

    try {
      const res = await apiClient.get("/auth/me");
      const payload = res.data || {};
      return payload.data || payload || null;
    } catch (error) {
      return null;
    }
  },

  getAuthState() {
    const session = getStoredSession();
    return {
      session,
      user: session?.user || null,
    };
  },

  isSessionExpired,

  async resetPassword() {
    throw new Error(
      "Password reset is not available through the current authentication API. Please contact support.",
    );
  },

  async updatePassword() {
    throw new Error(
      "Password updates are not available through the current authentication API. Please contact support.",
    );
  },

  isConfigured() {
    return Boolean(API_BASE_URL);
  },
};

// ============ COURSES SERVICES ============
export const courseService = {
  // Get all courses with optional filters
  async getCourses({ category, level, search, limit = 20, offset = 0 } = {}) {
    try {
      const res = await apiClient.get("/courses", {
        params: { category, level, search, limit, offset },
      });
      const payload = res.data || {};
      const data = payload.data?.data || payload.data || [];
      const count =
        payload.data?.count ??
        payload.count ??
        (Array.isArray(data) ? data.length : 0);
      return { data, count };
    } catch (err) {
      throw buildApiError(err, "Failed to fetch courses");
    }
  },

  // Get single course by ID
  async getCourseById(id) {
    try {
      const res = await apiClient.get(`/courses/${id}`);
      const payload = res.data || {};
      return payload.data || payload;
    } catch (err) {
      throw buildApiError(err, "Failed to fetch course");
    }
  },

  async getPublishedCourseDetails(id) {
    try {
      const res = await apiClient.get(`/courses/${id}`);
      return res.data?.data || res.data || null;
    } catch (err) {
      throw buildApiError(err, "Failed to fetch published course details");
    }
  },

  async getCourseCheckoutSummary(id) {
    try {
      const course = await this.getCourseById(id);
      return course;
    } catch (err) {
      throw buildApiError(err, "Failed to fetch course checkout summary");
    }
  },

  // Create a new course (instructor/admin only)
  async createCourse(courseData) {
    try {
      const res = await apiClient.post("/courses", courseData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to create course");
    }
  },

  // Update a course
  async updateCourse(id, courseData) {
    try {
      const res = await apiClient.patch(`/courses/${id}`, courseData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to update course");
    }
  },

  // Delete a course
  async deleteCourse(id) {
    try {
      const res = await apiClient.delete(`/courses/${id}`);
      return res.data || { success: true };
    } catch (err) {
      throw buildApiError(err, "Failed to delete course");
    }
  },

  // Get featured/popular courses
  async getFeaturedCourses(limit = 6) {
    try {
      const res = await apiClient.get("/courses", { params: { limit } });
      const data = res.data?.data?.data || res.data?.data || res.data || [];
      return data.slice(0, limit);
    } catch (err) {
      throw buildApiError(err, "Failed to fetch featured courses");
    }
  },

  // Get courses by category
  async getCoursesByCategory(category) {
    return this.getCourses({ category });
  },

  // Get courses by instructor (for teacher dashboard)
  async getInstructorCourses(instructorId) {
    if (!instructorId) return [];

    try {
      const { data } = await this.getCourses({ limit: 1000 });
      return (data || [])
        .filter((course) => `${course.instructor_id}` === `${instructorId}`)
        .map((course) => ({
          ...course,
          lessonsCount: Array.isArray(course.lessons)
            ? course.lessons.length
            : course.lessons?.[0]?.count || 0,
        }));
    } catch (err) {
      throw buildApiError(err, "Failed to fetch instructor courses");
    }
  },
};

// ============ BLOG SERVICES ============
const mockBlogPosts = [];

export const blogService = {
  async getPublishedPosts() {
    try {
      const res = await apiClient.get("/blog/published");
      return res.data?.data || res.data || [];
    } catch (err) {
      throw buildApiError(err, "Failed to fetch published posts");
    }
  },

  async getAdminPosts() {
    try {
      const res = await apiClient.get("/blog/admin");
      return res.data?.data || res.data || [];
    } catch (err) {
      throw buildApiError(err, "Failed to fetch admin posts");
    }
  },

  async createPost(postData) {
    try {
      const res = await apiClient.post("/blog", postData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to create post");
    }
  },

  async updatePost(id, postData) {
    try {
      const res = await apiClient.patch(`/blog/${id}`, postData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to update post");
    }
  },

  async deletePost(id) {
    try {
      const res = await apiClient.delete(`/blog/${id}`);
      return res.data || { success: true };
    } catch (err) {
      throw buildApiError(err, "Failed to delete post");
    }
  },
};

export const articleScheduleService = {
  async getSchedules() {
    return mockArticleSchedules;
  },

  async createSchedule(payload) {
    const row = {
      ...payload,
      id: `mock-schedule-${Date.now()}`,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockArticleSchedules.unshift(row);
    return row;
  },

  async updateSchedule(id, payload) {
    const index = mockArticleSchedules.findIndex((row) => row.id === id);
    if (index === -1) throw new Error("Schedule not found");
    mockArticleSchedules[index] = {
      ...mockArticleSchedules[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    return mockArticleSchedules[index];
  },

  async deleteSchedule(id) {
    const index = mockArticleSchedules.findIndex((row) => row.id === id);
    if (index >= 0) mockArticleSchedules.splice(index, 1);
    return { success: true };
  },

  async processSchedule(schedule, { courses = [], authorId } = {}) {
    const course =
      schedule.course ||
      courses.find((item) => `${item.id}` === `${schedule.course_id}`) ||
      null;

    await this.updateSchedule(schedule.id, {
      status: "generating",
      error_message: null,
    });

    try {
      const draft = generateArticleDraft({
        course,
        courses,
        titleHint: schedule.title_hint,
        promptNotes: schedule.prompt_notes,
        category: course?.category,
      });

      const postPayload = {
        ...draft,
        author_id: authorId || schedule.created_by || null,
        status: schedule.auto_publish ? "published" : "draft",
        published_at: schedule.auto_publish ? new Date().toISOString() : null,
      };

      const savedPost = await blogService.createPost(postPayload);
      const finalStatus = schedule.auto_publish ? "published" : "ready";

      return await this.updateSchedule(schedule.id, {
        status: finalStatus,
        blog_post_id: savedPost.id,
        processed_at: new Date().toISOString(),
        error_message: null,
      });
    } catch (err) {
      await this.updateSchedule(schedule.id, {
        status: "failed",
        error_message: err?.message || "Article generation failed",
        processed_at: new Date().toISOString(),
      });
      throw err;
    }
  },

  async processDueSchedules({ courses = [], authorId } = {}) {
    const schedules = await this.getSchedules();
    const now = Date.now();
    const due = schedules.filter(
      (row) =>
        row.status === "pending" && new Date(row.scheduled_at).getTime() <= now,
    );

    const results = [];
    for (const schedule of due) {
      try {
        const updated = await this.processSchedule(schedule, {
          courses,
          authorId,
        });
        results.push({ schedule: updated, success: true });
      } catch (err) {
        results.push({ schedule, success: false, error: err?.message });
      }
    }

    return results;
  },
};

// ============ LESSON SERVICES ============
export const lessonService = {
  // Get lessons for a course
  async getLessonsByCourse(courseId) {
    try {
      const res = await apiClient.get(`/lessons/course/${courseId}`);
      return res.data?.data || res.data || [];
    } catch (err) {
      throw buildApiError(err, "Failed to fetch lessons");
    }
  },

  async getPublishedLessonsByCourse(courseId) {
    try {
      // server endpoint returns published lessons when available
      const res = await apiClient.get(`/lessons/course/${courseId}`, {
        params: { published: true },
      });
      return res.data?.data || res.data || [];
    } catch (err) {
      throw buildApiError(err, "Failed to fetch published lessons");
    }
  },

  // Get single lesson
  async getLessonById(id) {
    try {
      const res = await apiClient.get(`/lessons/${id}`);
      return res.data?.data || res.data || null;
    } catch (err) {
      throw buildApiError(err, "Failed to fetch lesson");
    }
  },

  // Create a lesson
  async createLesson(lessonData) {
    try {
      const { files, ...dbLessonData } = lessonData;
      const res = await apiClient.post("/lessons", dbLessonData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to create lesson");
    }
  },

  // Update a lesson
  async updateLesson(id, lessonData) {
    try {
      const res = await apiClient.patch(`/lessons/${id}`, lessonData);
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to update lesson");
    }
  },

  // Delete a lesson
  async deleteLesson(id) {
    try {
      const res = await apiClient.delete(`/lessons/${id}`);
      return res.data || { success: true };
    } catch (err) {
      throw buildApiError(err, "Failed to delete lesson");
    }
  },
};

// ============ ENROLLMENT SERVICES ============
export const enrollmentService = {
  // Enroll in a course (free courses or after payment approval - enforced server-side)
  async enrollInCourse(courseId) {
    try {
      const res = await apiClient.post("/enrollments/enroll", { courseId });
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Enrollment failed");
    }
  },

  // Get user enrollments
  async getUserEnrollments() {
    try {
      const res = await apiClient.get("/enrollments/my-enrollments");
      return res.data?.data || res.data || [];
    } catch (err) {
      throw buildApiError(err, "Failed to fetch enrollments");
    }
  },

  // Check if user is enrolled in a course
  async isEnrolled(courseId) {
    try {
      const res = await apiClient.get("/enrollments/is-enrolled", {
        params: { courseId },
      });
      return Boolean(res.data?.data ?? res.data);
    } catch (err) {
      throw buildApiError(err, "Failed to check enrollment");
    }
  },

  // Update progress
  async updateProgress(enrollmentId, progress) {
    try {
      const res = await apiClient.post("/enrollments/update-progress", {
        enrollmentId,
        progress,
      });
      return res.data?.data || res.data;
    } catch (err) {
      throw buildApiError(err, "Failed to update progress");
    }
  },
};

// ============ REVIEW SERVICES ============
export const reviewService = {
  async getReviewsByCourse(courseId) {
    return [];
  },

  async createReview({ courseId, rating, comment }) {
    return {
      id: `mock-review-${Date.now()}`,
      course_id: courseId,
      rating,
      comment,
    };
  },

  async updateReview(id, { rating, comment }) {
    return { id, rating, comment };
  },

  async deleteReview(id) {
    return { success: true };
  },
};

// ============ USER SERVICES ============
export const userService = {
  // Get user profile
  async getProfile(userId) {
    try {
      const res = await apiClient.get("/auth/me");
      const profile = res.data?.data || res.data || null;
      if (!userId || `${profile?.id}` === `${userId}`) {
        return profile;
      }
      throw new Error(
        "Fetching arbitrary user profiles is not supported by the current backend API.",
      );
    } catch (err) {
      throw buildApiError(err, "Failed to fetch profile");
    }
  },

  // Get or create user profile
  async getOrCreateProfile(userId, userData = {}) {
    if (!userId) {
      throw new Error(
        "getOrCreateProfile requires a userId, and this backend API does not support arbitrary user profile creation.",
      );
    }

    const session = getStoredSession();
    const currentUserId = session?.user?.id || null;
    if (`${currentUserId}` !== `${userId}`) {
      throw new Error(
        "Creating or fetching arbitrary user profiles is not supported by the current backend REST API.",
      );
    }

    return this.getProfile(userId);
  },

  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      const res = await apiClient.patch("/auth/me", profileData);
      const profile = res.data?.data || res.data;
      if (!userId || `${profile?.id}` === `${userId}`) {
        return profile;
      }
      throw new Error(
        "Updating another user's profile is not supported by the current backend API.",
      );
    } catch (err) {
      throw buildApiError(err, "Failed to update profile");
    }
  },

  // Return the database profile only. Role changes are never synchronized from
  // client input; admins must be assigned by database-authorized RPCs.
  async ensureUserRole(userId, email, role) {
    if (!userId) {
      throw new Error("Missing required user role synchronization data");
    }

    const session = getStoredSession();
    if (`${session?.user?.id}` !== `${userId}`) {
      throw new Error(
        "Ensuring another user's role is not supported by the current backend REST API.",
      );
    }

    return this.getProfile(userId);
  },

  // Upload avatar
  async uploadAvatar(userId, file) {
    throw new Error(
      "Avatar uploads are not supported by the current backend REST API. Use a direct profile URL or update the backend to support file uploads.",
    );
  },
};

// ============ CATEGORY SERVICES ============
export const categoryService = {
  // Get all categories
  async getCategories() {
    // Categories are static based on the schema
    return mockCategories;
  },
};

// ============ ADMIN SERVICES ============
export const adminService = {
  // Get dashboard stats
  async getDashboardStats() {
    if (!isSupabaseAvailable()) {
      return {
        totalUsers: 150,
        totalCourses: 70,
        totalEnrollments: 450,
        totalRevenue: 12500,
      };
    }

    const [
      { count: usersCount },
      { count: coursesCount },
      { count: enrollmentsCount },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("enrollments").select("*", { count: "exact", head: true }),
    ]);

    return {
      totalUsers: usersCount || 0,
      totalCourses: coursesCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalRevenue: 0, // Would need payments table
    };
  },

  // Get all users (admin only)
  async getAllUsers() {
    throw new Error(
      "Direct admin user listing is disabled. Use admin_get_all_users RPC.",
    );
  },

  async getAllUsersAdmin() {
    assertSupabaseAvailable();

    try {
      const { data, error } = await supabase.rpc("admin_get_all_users");
      if (error) throw error;
      return data || [];
    } catch (e) {
      // Map common JWT/session expiry errors to a friendlier message so
      // the UI can suggest re-authentication instead of showing raw RPC errors.
      const msg = (e?.message || "").toString().toLowerCase();
      if (
        (msg.includes("jwt") && msg.includes("exp")) ||
        msg.includes("expired")
      ) {
        throw new Error("Session expired. Please sign out and sign in again.");
      }
      throw e;
    }
  },

  // Update user role (admin only - direct table update fallback)
  async updateUserRole(userId, role) {
    return this.updateUserRoleAdmin(userId, role);
  },

  async updateUserRoleAdmin(targetUserId, newRole) {
    assertSupabaseAvailable();

    const normalizedRole = normalizeDbRole(newRole);
    const { data, error } = await supabase.rpc("admin_update_user_role", {
      target_user_id: targetUserId,
      new_role: normalizedRole,
    });

    if (error) throw error;

    const result = parseRpcJsonResult(data);
    if (result?.success === false) {
      throw new Error(result.error || "Role update failed");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, email, full_name")
      .eq("id", targetUserId)
      .single();

    if (profileError) throw profileError;
    assertRoleUpdateResult(profile, normalizedRole);

    return result;
  },

  async getUserDetailsAdmin(targetUserId) {
    assertSupabaseAvailable();

    const { data, error } = await supabase.rpc("admin_get_user_details", {
      target_user_id: targetUserId,
    });

    if (error) throw error;
    return data;
  },

  async getUserDetailsFallback() {
    throw new Error(
      "Direct admin user detail fallback is disabled. Use admin_get_user_details RPC.",
    );
  },

  async approveInstructor(targetUserId) {
    assertSupabaseAvailable();

    const { data, error } = await supabase.rpc("admin_approve_instructor", {
      target_user_id: targetUserId,
    });

    if (error) throw error;

    const result = parseRpcJsonResult(data);
    if (result?.success === false) {
      throw new Error(result.error || "Failed to approve instructor");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", targetUserId)
      .single();

    if (profileError) throw profileError;
    assertRoleUpdateResult(profile, "instructor");

    return result;
  },

  async rejectInstructor(targetUserId) {
    assertSupabaseAvailable();

    const { data, error } = await supabase.rpc("admin_reject_instructor", {
      target_user_id: targetUserId,
    });

    if (error) throw error;

    const result = parseRpcJsonResult(data);
    if (result?.success === false) {
      throw new Error(result.error || "Failed to reject instructor");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", targetUserId)
      .single();

    if (profileError) throw profileError;
    assertRoleUpdateResult(profile, "student");

    return result;
  },

  async setUserSuspended(targetUserId, isSuspended) {
    assertSupabaseAvailable();

    const { data, error } = await supabase.rpc("admin_set_user_suspended", {
      target_user_id: targetUserId,
      suspend_user: Boolean(isSuspended),
    });

    if (error) throw error;

    const result = parseRpcJsonResult(data);
    if (result?.success === false) {
      throw new Error(result.error || "Failed to update user status");
    }

    return result;
  },

  async deletePlatformUser(targetUserId) {
    assertSupabaseAvailable();

    const { data, error } = await supabase.rpc("admin_delete_platform_user", {
      target_user_id: targetUserId,
    });

    if (error) throw error;

    const result = parseRpcJsonResult(data);
    if (result?.success === false) {
      throw new Error(result.error || "Failed to delete user");
    }

    return result;
  },

  async getCrmContacts() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const [
      { data: users, error: usersError },
      { data: payments, error: paymentsError },
      { data: enrollments, error: enrollmentsError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, phone, role, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_submissions")
        .select(
          `
          id,
          student_id,
          course_id,
          amount,
          currency,
          status,
          submitted_at,
          created_at,
          additional_notes,
          transaction_reference,
          course:courses(id, title)
        `,
        )
        .order("submitted_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select(
          "id, user_id, course_id, enrolled_at, course:courses(id, title)",
        )
        .order("enrolled_at", { ascending: false }),
    ]);

    if (usersError) throw usersError;
    if (paymentsError) throw paymentsError;
    if (enrollmentsError) throw enrollmentsError;

    const paymentsByUser = new Map();
    (payments || []).forEach((payment) => {
      const rows = paymentsByUser.get(payment.student_id) || [];
      rows.push(payment);
      paymentsByUser.set(payment.student_id, rows);
    });

    const enrollmentsByUser = new Map();
    (enrollments || []).forEach((enrollment) => {
      const rows = enrollmentsByUser.get(enrollment.user_id) || [];
      rows.push(enrollment);
      enrollmentsByUser.set(enrollment.user_id, rows);
    });

    return (users || []).map((profile) => {
      const userPayments = paymentsByUser.get(profile.id) || [];
      const approvedPayments = userPayments.filter(
        (payment) =>
          (payment.status || "").toString().trim().toLowerCase() === "approved",
      );
      const userEnrollments = enrollmentsByUser.get(profile.id) || [];
      const courseTitles = [
        ...new Set(
          approvedPayments
            .map((payment) => payment.course?.title)
            .filter(Boolean),
        ),
      ];

      return {
        ...profile,
        payment_status:
          approvedPayments.length > 0 ? "have payment" : "without payment",
        approved_payments_count: approvedPayments.length,
        total_payments_count: userPayments.length,
        total_paid_amount: approvedPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        ),
        latest_payment_at:
          approvedPayments[0]?.submitted_at ||
          approvedPayments[0]?.created_at ||
          null,
        latest_payment_notes: userPayments[0]?.additional_notes || "",
        latest_transaction_reference:
          userPayments[0]?.transaction_reference || "",
        paid_course_titles: courseTitles,
        enrollment_count: userEnrollments.length,
      };
    });
  },
};

// ============ CHAT SERVICES ============
const getCourseChatChannelName = (courseId) => `course-chat-ws-${courseId}`;

/** PostgREST may return composite RPC rows as an object or a one-element array */
const normalizeRpcRow = (data) => {
  if (Array.isArray(data)) return data[0] || null;
  if (data && typeof data === "object") return data;
  return null;
};

export const chatService = {
  getCourseChatChannelName,

  subscribeToCourseChat(courseId, handlers = {}) {
    // Realtime subscription is disabled on the frontend. Use polling instead.
    handlers.onStatus?.("SUBSCRIBED");
    return null;
  },

  removeChannel(channel) {
    // No realtime channel to remove when using polling.
    return;
  },

  subscribeToConversationMessages(conversationId, onInsert) {
    // Realtime subscription is disabled on the frontend. Use polling instead.
    return null;
  },

  async broadcastChatMessage(courseId, message) {
    // Realtime broadcast is disabled on the frontend.
    return;
  },

  async getOrCreateConversation({ courseId, studentId, instructorId }) {
    if (!isSupabaseAvailable()) {
      return {
        id: "mock-conversation-id",
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId,
      };
    }

    const authUser = await authService.getCurrentUser();
    const authUserId = authUser?.id;
    const isSelfStudent = authUserId && studentId === authUserId;

    if (isSelfStudent) {
      const { data: myConvRaw, error: myConvError } = await supabase.rpc(
        "get_my_course_conversation",
        {
          p_course_id: courseId,
        },
      );
      const myConv = normalizeRpcRow(myConvRaw);

      if (!myConvError && myConv?.id) {
        try {
          const hydrated = await this._hydrateConversation(myConv.id);
          return hydrated;
        } catch {
          return myConv;
        }
      }

      const myConvMissing =
        myConvError?.code === "PGRST202" ||
        `${myConvError?.message || ""}`
          .toLowerCase()
          .includes("could not find the function");

      if (!myConvMissing && myConvError) {
        console.warn("get_my_course_conversation failed:", myConvError.message);
      }
    }

    const { data: rpcRaw, error: rpcError } = await supabase.rpc(
      "get_or_create_course_conversation",
      {
        p_course_id: courseId,
        p_student_id: studentId,
      },
    );
    const rpcData = normalizeRpcRow(rpcRaw);

    if (!rpcError && rpcData?.id) {
      try {
        const hydrated = await this._hydrateConversation(rpcData.id);
        return hydrated;
      } catch {
        return rpcData;
      }
    }

    const rpcMissing =
      rpcError?.code === "PGRST202" ||
      `${rpcError?.message || ""}`
        .toLowerCase()
        .includes("could not find the function");

    if (!rpcMissing && rpcError) {
      throw rpcError;
    }

    const { data: existing, error: fetchError } = await supabase
      .from("course_conversations")
      .select(
        `
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `,
      )
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from("course_conversations")
      .insert({
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId,
      })
      .select(
        `
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },

  async _hydrateConversation(conversationId) {
    const { data, error } = await supabase
      .from("course_conversations")
      .select(
        `
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `,
      )
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    return data;
  },

  async getInstructorChatRoster(courseId) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data, error } = await supabase.rpc(
      "get_instructor_course_chat_roster",
      {
        p_course_id: courseId,
      },
    );

    if (!error && data?.success !== false) {
      return data?.students || [];
    }

    const rpcMissing =
      error?.code === "PGRST202" ||
      `${error?.message || ""}`
        .toLowerCase()
        .includes("could not find the function");

    if (!rpcMissing && data?.success === false) {
      throw new Error(data.error || "Failed to load chat roster");
    }

    if (!rpcMissing && error) {
      throw error;
    }

    const { data: registeredStudents, error: studentsError } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, role")
      .order("full_name", { ascending: true })
      .limit(500);

    if (studentsError) throw studentsError;

    const studentRows = (registeredStudents || []).filter((row) => {
      const role = (row.role || "student").toString().trim().toLowerCase();
      return !["teacher", "instructor", "admin", "pending_instructor"].includes(
        role,
      );
    });

    const conversations = await this.getInstructorConversations(courseId);
    const conversationByStudent = new Map(
      (conversations || []).map((conv) => [conv.student_id, conv]),
    );

    return studentRows.map((row) => {
      const conv = conversationByStudent.get(row.id);
      return {
        user_id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
        conversation_id: conv?.id || null,
        last_message_at: conv?.last_message_at || null,
        unread_count: 0,
      };
    });
  },

  async getStudentChatInbox() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_student_chat_inbox",
    );

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData;
    }

    const rpcMissing =
      rpcError?.code === "PGRST202" ||
      `${rpcError?.message || ""}`
        .toLowerCase()
        .includes("could not find the function");

    if (!rpcMissing && rpcError) {
      console.warn("get_student_chat_inbox RPC failed:", rpcError.message);
    }

    const authUser = await authService.getCurrentUser();
    const userId = authUser?.id;
    if (!userId) return [];

    const { data: conversations, error } = await supabase
      .from("course_conversations")
      .select(
        `
        id,
        course_id,
        last_message_at,
        course:courses(id, title, thumbnail_url)
      `,
      )
      .eq("student_id", userId)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    const enriched = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await supabase
          .from("course_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id);

        return {
          conversation_id: conv.id,
          course_id: conv.course_id,
          title: conv.course?.title || conv.course_id,
          thumbnail_url: conv.course?.thumbnail_url || null,
          last_message_at: conv.last_message_at,
          message_count: count || 0,
          unread_count: 0,
        };
      }),
    );

    return enriched.sort((a, b) => {
      if ((b.message_count || 0) !== (a.message_count || 0)) {
        return (b.message_count || 0) - (a.message_count || 0);
      }
      return (
        new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
      );
    });
  },

  async getInstructorConversations(courseId) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data, error } = await supabase
      .from("course_conversations")
      .select(
        `
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `,
      )
      .eq("course_id", courseId)
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getMessages(conversationId, { limit = 100 } = {}) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_course_chat_messages",
      {
        p_conversation_id: conversationId,
        p_limit: limit,
      },
    );

    let rpcCount = 0;
    if (!rpcError && rpcData != null) {
      const rows = Array.isArray(rpcData) ? rpcData : [rpcData].filter(Boolean);
      rpcCount = rows.length;
      if (rows.length > 0) {
        const hydrated = await this._hydrateMessages(rows);
        return hydrated;
      }
    }

    const rpcMissing =
      rpcError?.code === "PGRST202" ||
      `${rpcError?.message || ""}`
        .toLowerCase()
        .includes("could not find the function");

    if (!rpcMissing && rpcError) {
      console.warn("get_course_chat_messages RPC failed:", rpcError.message);
    }

    const { data, error } = await supabase
      .from("course_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    const hydrated = await this._hydrateMessages(data || []);
    return hydrated;
  },

  async _hydrateMessages(messages) {
    if (!messages?.length) return [];

    const senderIds = [
      ...new Set(messages.map((row) => row.sender_id).filter(Boolean)),
    ];
    if (senderIds.length === 0) return messages;

    const { data: senders, error: sendersError } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", senderIds);

    if (sendersError) {
      return messages;
    }

    const senderMap = new Map(
      (senders || []).map((sender) => [sender.id, sender]),
    );

    return messages.map((message) => ({
      ...message,
      sender: senderMap.get(message.sender_id) || null,
    }));
  },

  async sendMessage({ conversationId, senderId, content, courseId = null }) {
    if (!isSupabaseAvailable()) {
      return {
        id: `mock-msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
      };
    }

    const trimmed = content.trim();
    const { data: rpcRaw, error: rpcError } = await supabase.rpc(
      "send_course_chat_message",
      {
        p_conversation_id: conversationId,
        p_content: trimmed,
      },
    );
    const rpcData = normalizeRpcRow(rpcRaw);

    let message = null;

    if (!rpcError && rpcData?.id) {
      const hydrated = await this._hydrateMessages([rpcData]);
      message = hydrated[0];
    } else {
      const { data, error } = await supabase
        .from("course_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmed,
        })
        .select(
          `
          *,
          sender:users!sender_id(id, full_name, avatar_url)
        `,
        )
        .single();

      if (error) throw error;
      message = data;
    }

    if (courseId && message) {
      await this.broadcastChatMessage(courseId, message);
    }

    return message;
  },

  async markMessagesAsRead(conversationId, userId) {
    if (!isSupabaseAvailable()) {
      return { success: true };
    }

    const { error } = await supabase
      .from("course_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true };
  },
};

// ============ MEETING SERVICES ============
async function ensureMeetingJoinFields(meeting, preferredRoomName = null) {
  const normalized = normalizeMeetingRecord(meeting);
  if (!normalized?.id || isExternalGoogleMeet(normalized)) {
    return normalized;
  }

  const roomName = hasText(preferredRoomName)
    ? preferredRoomName.trim()
    : resolveJitsiRoomName(normalized);
  if (!roomName) return normalized;

  if (
    normalized.platform === "jitsi" &&
    hasText(normalized.jitsi_room_name) &&
    (!preferredRoomName ||
      normalized.jitsi_room_name.trim() === preferredRoomName.trim())
  ) {
    return normalized;
  }

  if (!isSupabaseAvailable()) {
    return { ...normalized, platform: "jitsi", jitsi_room_name: roomName };
  }

  const { data, error } = await supabase
    .from("meetings")
    .update({
      platform: "jitsi",
      jitsi_room_name: roomName,
    })
    .eq("id", normalized.id)
    .select()
    .single();

  if (error || !data) {
    return { ...normalized, platform: "jitsi", jitsi_room_name: roomName };
  }

  return normalizeMeetingRecord(data);
}

export const meetingService = {
  ensureMeetingJoinFields,

  async createMeeting(meetingData) {
    throw new Error(
      "Backend REST API does not support meeting creation at this time.",
    );
  },

  async getMeetingsByCourse(courseId, { instructorView = false } = {}) {
    return [];
  },

  async getUpcomingMeetings(userId) {
    return [];
  },

  async updateMeeting(id, meetingData) {
    throw new Error(
      "Backend REST API does not support meeting updates at this time.",
    );
  },

  async deleteMeeting(id) {
    throw new Error(
      "Backend REST API does not support meeting deletion at this time.",
    );
  },
};

export const notificationService = {
  async getSessionInvites(userId, { limit = 15 } = {}) {
    return [];
  },

  async getUnreadCount(userId) {
    return 0;
  },

  subscribeToUserNotifications(userId, onNotification) {
    return null;
  },

  removeChannel(channel) {
    return;
  },

  async markAsRead(notificationId) {
    return { success: true };
  },

  async markAllAsRead(userId) {
    return { success: true };
  },

  async deleteNotification(notificationId, userId) {
    return { success: true };
  },

  async notifyStudents(notificationData) {
    throw new Error(
      "Backend REST API does not support notifications at this time.",
    );
  },

  async notifyEligibleStudents(notificationData) {
    throw new Error(
      "Backend REST API does not support notifications at this time.",
    );
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
