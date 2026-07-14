// This file is deprecated. The frontend now uses only the REST API.
// All database calls must go through src/services/api.js instead.

// Stub Supabase object for backward compatibility
// This prevents import errors but does not actually work.
// All actual database operations should use the REST API.

export const supabase = {
  from: (table) => ({
    select: () => ({ eq: () => ({}) }),
    insert: () => ({}),
    update: () => ({}),
    delete: () => ({}),
  }),
  rpc: () => ({}),
  auth: {
    getSession: () => Promise.resolve({}),
    signUp: () => Promise.resolve({}),
    signIn: () => Promise.resolve({}),
    signOut: () => Promise.resolve({}),
  },
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      upload: () => Promise.resolve({}),
      remove: () => Promise.resolve({}),
    }),
  },
};

// These are no longer used - use the REST API instead
export const getPublicUrl = (bucket, path) => "";

export const uploadFile = async (bucket, path, file, options = {}) => {
  throw new Error("uploadFile is deprecated. Use the REST API instead.");
};

export const deleteFile = async (bucket, path) => {
  throw new Error("deleteFile is deprecated. Use the REST API instead.");
};
