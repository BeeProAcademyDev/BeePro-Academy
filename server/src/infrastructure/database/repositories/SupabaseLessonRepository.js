class SupabaseLessonRepository {
  constructor({ supabase }) {
    this.supabase = supabase;
  }

  async listByCourse(courseId) {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async getById(id) {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(payload) {
    if (!this.supabase) return { id: `mock-${Date.now()}`, ...payload };
    const { data, error } = await this.supabase
      .from("lessons")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, payload) {
    if (!this.supabase) return { id, ...payload };
    const { data, error } = await this.supabase
      .from("lessons")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id) {
    if (!this.supabase) return { success: true };
    const { error } = await this.supabase.from("lessons").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  }
}

module.exports = SupabaseLessonRepository;
