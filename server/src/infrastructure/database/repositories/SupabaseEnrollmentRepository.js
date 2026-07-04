class SupabaseEnrollmentRepository {
  constructor({ supabase }) {
    this.supabase = supabase;
  }

  async enrollStudentIfEligible(courseId, userId) {
    if (!this.supabase)
      return { success: true, enrollment_id: `mock-${Date.now()}` };
    const { data, error } = await this.supabase.rpc(
      "enroll_student_if_eligible",
      { p_course_id: courseId },
    );
    if (error) throw error;
    return data;
  }

  async getUserEnrollments(userId) {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from("enrollments")
      .select(
        `*, course:courses(id, title, thumbnail_url, category, instructor:users!instructor_id(full_name), lessons(count))`,
      )
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async isEnrolled(userId, courseId) {
    if (!this.supabase) return false;
    const { data, error } = await this.supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  }

  async updateProgress(enrollmentId, progress) {
    if (!this.supabase) return { id: enrollmentId, progress };
    const { data, error } = await this.supabase
      .from("enrollments")
      .update({ progress })
      .eq("id", enrollmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = SupabaseEnrollmentRepository;
