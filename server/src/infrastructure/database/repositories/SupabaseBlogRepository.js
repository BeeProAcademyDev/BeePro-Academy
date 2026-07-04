class SupabaseBlogRepository {
  constructor({ supabase }) {
    this.supabase = supabase;
  }

  async listPublished() {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from("blog_posts")
      .select(
        `*, author:users!author_id(id, full_name, avatar_url), course:courses(id, title, thumbnail_url)`,
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async listAll() {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from("blog_posts")
      .select(
        `*, author:users!author_id(id, full_name, avatar_url), course:courses(id, title, thumbnail_url)`,
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async create(payload) {
    if (!this.supabase) return { id: `mock-${Date.now()}`, ...payload };
    const { data, error } = await this.supabase
      .from("blog_posts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, payload) {
    if (!this.supabase) return { id, ...payload };
    const { data, error } = await this.supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id) {
    if (!this.supabase) return { success: true };
    const { error } = await this.supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  }
}

module.exports = SupabaseBlogRepository;
