export function createLessonService({
  apiClient,
  safeRequest,
  safeList,
  comingSoon,
}) {
  const cleanLessonPayload = (data = {}) => {
    const contentUrl = (data.contentUrl || data.content_url || "").trim();
    const payload = {
      title: data.title?.trim(),
      contentType: data.contentType || data.content_type || "video",
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
    };
    if (contentUrl) payload.contentUrl = contentUrl;
    if (data.order !== undefined && data.order !== null) {
      payload.order = Number(data.order);
    }
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
  };

  const service = {
    async getLessonsByCourse(courseId) {
      if (!courseId) return [];
      const sections = await safeList(
        apiClient.get(`/courses/${courseId}/sections`),
        "Failed to fetch course sections",
      );
      const sectionLessons = await Promise.all(
        (sections || []).map((section) => this.getLessonsBySection(section.id)),
      );
      return sectionLessons.flat();
    },

    async getPublishedLessonsByCourse(courseId) {
      return this.getLessonsByCourse(courseId);
    },

    async getLessonById(id) {
      if (!id) return null;
      return null;
    },

    async getLessonsBySection(sectionId) {
      if (!sectionId) return [];
      const lessons = await safeList(
        apiClient.get(`/sections/${sectionId}/lessons`),
        "Failed to fetch section lessons",
      );
      return (lessons || []).map((lesson) => ({
        ...lesson,
        section_id: lesson.section_id || sectionId,
        sectionId: lesson.sectionId || lesson.section_id || sectionId,
      }));
    },

    async createLesson(data) {
      const sectionId = data?.section_id || data?.sectionId;
      if (!sectionId) return comingSoon("Lesson creation requires a section ID");
      return this.createLessonInSection(sectionId, data);
    },

    async createLessonInSection(sectionId, data) {
      if (!sectionId) return comingSoon("Lesson creation requires a section ID");
      const lesson = await safeRequest(
        apiClient.post(`/sections/${sectionId}/lessons`, cleanLessonPayload(data)),
        null,
        "Failed to create lesson in section",
      );
      return lesson ? { ...lesson, section_id: sectionId, sectionId } : null;
    },

    async updateLesson(id, data = {}) {
      const sectionId = data.section_id || data.sectionId;
      if (!id || !sectionId)
        return comingSoon("Lesson update requires lesson and section IDs");
      const lesson = await safeRequest(
        apiClient.patch(
          `/sections/${sectionId}/lessons/${id}`,
          cleanLessonPayload(data),
        ),
        null,
        "Failed to update lesson",
      );
      return lesson ? { ...lesson, section_id: sectionId, sectionId } : null;
    },

    async deleteLesson(id, sectionId) {
      if (!id || !sectionId)
        return comingSoon("Lesson deletion requires lesson and section IDs");
      return safeRequest(
        apiClient.delete(`/sections/${sectionId}/lessons/${id}`),
        { success: true },
        "Failed to delete lesson",
      );
    },
  };

  return service;
}
