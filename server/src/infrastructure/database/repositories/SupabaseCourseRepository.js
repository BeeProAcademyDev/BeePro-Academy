class SupabaseCourseRepository {
  constructor({ supabase }) {
    this.supabase = supabase;
  }

  async list({ category, level, search, limit = 20, offset = 0 } = {}) {
    if (!this.supabase) return { data: [], count: 0 };

    let q = this.supabase.from("courses").select("*", { count: "exact" });
    if (category) q = q.eq("category", category);
    if (level) q = q.eq("level", level);
    if (search)
      q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error, count } = await q
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  async getById(id) {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(payload) {
    if (!this.supabase) return { id: `mock-${Date.now()}`, ...payload };
    const { data, error } = await this.supabase
      .from("courses")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, payload) {
    if (!this.supabase) return { id, ...payload };
    const { data, error } = await this.supabase
      .from("courses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id) {
    if (!this.supabase) return { success: true };
    const { error } = await this.supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  }
}

module.exports = SupabaseCourseRepository;
