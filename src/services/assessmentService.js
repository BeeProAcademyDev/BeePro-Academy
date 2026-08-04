import { apiClient, safeRequest, safeList } from "./api";

const sanitizeAssessment = (data = {}) => {
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
          return {
            type,
            text: String(question.text || question.title || "").trim(),
            grade: Number(question.grade) || 1,
            order: Number(question.order ?? index),
            ...(options ? { options } : {}),
          };
        })
        .filter(
          (question) =>
            question.text.length >= 3 &&
            (question.type !== "mcq" ||
              (question.options.length >= 2 &&
                question.options.some((option) => option.isCorrect))),
        )
    : [];

  return {
    ...(data.lessonId || data.lesson_id
      ? { lessonId: data.lessonId || data.lesson_id }
      : {}),
    title: data.title?.trim(),
    description: data.description || undefined,
    type: data.type === "assignment" ? "assignment" : "quiz",
    status: data.status || "draft",
    durationMinutes: Number(data.durationMinutes ?? data.duration_minutes) || 0,
    ...(data.dueDate || data.due_date
      ? { dueDate: new Date(data.dueDate || data.due_date).toISOString() }
      : {}),
    allowLateSubmissions: Boolean(
      data.allowLateSubmissions ?? data.allow_late_submissions ?? false,
    ),
    showGrades: Boolean(data.showGrades ?? data.show_grades ?? false),
    showAnswers: Boolean(data.showAnswers ?? data.show_answers ?? false),
    questions,
  };
};

export const assessmentService = {
  async getCourseAssessments(courseId) {
    return [];
  },

  async createAssessment(courseId, data) {
    if (!courseId) return null;
    const payload = sanitizeAssessment(data);
    if (payload.questions.length === 0) return null;
    return safeRequest(
      apiClient.post(`/courses/${courseId}/assessments`, payload),
      null,
      "Failed to create assessment",
    );
  },

  async updateAssessment(courseId, assessmentId, data) {
    if (!courseId || !assessmentId) return null;
    const payload = sanitizeAssessment(data);
    if (payload.questions.length === 0) return null;
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
    if (!courseId || !assessmentId) return null;
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
    if (!submissionId) return null;
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
      apiClient.get(`/courses/${courseId}/assessments/${assessmentId}/submissions`),
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
