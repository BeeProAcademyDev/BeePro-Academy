import { createContext, useContext, useState, useEffect, useMemo } from "react";
import i18n from "../i18n/i18n";
import { authService, userService } from "../services/api";
import { resolveUserRole, isPendingInstructor } from "../lib/roles";
import { formatErrorMessage } from "../lib/supabaseErrors";
import { notifyError } from "../lib/uiNotify";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: async () => ({ success: false, error: "Auth not ready" }),
      register: async () => ({ success: false, error: "Auth not ready" }),
      logout: async () => ({ success: false, error: "Auth not ready" }),
      resetPassword: async () => ({ success: false, error: "Auth not ready" }),
      updatePassword: async () => ({ success: false, error: "Auth not ready" }),
      updateProfile: async () => ({ success: false, error: "Auth not ready" }),
      uploadAvatar: async () => ({ success: false, error: "Auth not ready" }),
      checkUser: async () => null,
    };
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const applyRoleFallback = (userData) => {
    if (!userData) return userData;

    return {
      ...userData,
      role: resolveUserRole(userData),
    };
  };

  const assertProfileIsActive = async (profile) => {
    if (!profile?.is_suspended) return;

    try {
      await authService.logout();
    } catch (signOutError) {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV) console.warn("Error signing out suspended user:", signOutError);
    }

    setUser(null);
    setSession(null);
    const msg = i18n.t("authExtra.accountBlocked");
    notifyError(msg);
    throw new Error(msg);
  };

  const isBlockedAccountError = (err) =>
    (err?.message || "")
      .toString()
      .toLowerCase()
      .includes("blocked from this platform");

  const buildSessionUser = (authUser) => {
    if (!authUser?.id) return null;
    return applyRoleFallback({
      id: authUser.id,
      email: authUser.email,
      full_name:
        authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
      avatar_url: authUser.user_metadata?.avatar_url || null,
      role: "student",
    });
  };

  const effectiveUser = useMemo(() => {
    if (user?.id) return user;
    if (session?.user?.id) return buildSessionUser(session.user);
    return null;
  }, [user, session]);

  const syncAuthState = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setIsLoading(true);

      const authState = authService.getAuthState();
      const activeSession = authState?.session || null;

      if (!activeSession?.access_token) {
        setUser(null);
        setSession(null);
        setHydrated(true);
        return;
      }

      if (authService.isSessionExpired?.(activeSession)) {
        await authService.logout();
        setUser(null);
        setSession(null);
        return;
      }

      const profile = await authService.getCurrentUser();
      if (!profile) {
        setUser(null);
        setSession(null);
        setHydrated(true);
        return;
      }

      await assertProfileIsActive(profile);
      setUser(applyRoleFallback(profile));
      setSession(activeSession);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error checking user:", err);
      if (isBlockedAccountError(err)) {
        setUser(null);
        setSession(null);
        setError(formatErrorMessage(err));
        return;
      }
      try {
        const lower = formatErrorMessage(err).toLowerCase();
        if (
          lower.includes("jwt expired") ||
          lower.includes("token expired") ||
          lower.includes("session expired")
        ) {
          try {
            await authService.logout();
          } catch (sErr) {
            if (import.meta.env.DEV)
              if (import.meta.env.DEV) console.warn("Error signing out after expired JWT:", sErr);
          }
          // Clear local state and prompt user to re-authenticate
          setUser(null);
          setSession(null);
          try {
            notifyError(i18n.t("authExtra.sessionExpired"));
          } catch {} // graceful in non-browser env
          return;
        }

        const nextSession = authService.getAuthState()?.session || null;
        setSession(nextSession);
        if (nextSession?.user) {
          setUser(buildSessionUser(nextSession.user));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    } finally {
      if (showLoading) setIsLoading(false);
      setHydrated(true);
    }
  };

  // Check for existing session on mount and react to auth changes from the shared REST auth service.
  useEffect(() => {
    let cancelled = false;

    const handleAuthSessionChange = () => {
      if (cancelled) return;
      syncAuthState({ showLoading: false });
    };

    syncAuthState({ showLoading: true });

    if (typeof window !== "undefined") {
      window.addEventListener(
        "beepro:auth-session-changed",
        handleAuthSessionChange,
      );
    }

    const expiryCheckId =
      typeof window !== "undefined"
        ? window.setInterval(() => {
            if (cancelled) return;
            const sessionSnapshot = authService.getAuthState()?.session || null;
            if (
              sessionSnapshot &&
              authService.isSessionExpired?.(sessionSnapshot)
            ) {
              authService.logout().catch((logoutError) => {
                if (import.meta.env.DEV) console.warn("Error clearing expired session:", logoutError);
              });
            }
          }, 60_000)
        : null;

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "beepro:auth-session-changed",
          handleAuthSessionChange,
        );
        if (expiryCheckId) window.clearInterval(expiryCheckId);
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const { user: authUser, session } = await authService.login({
        email,
        password,
      });

      if (session) {
        setSession(session);
      }

      if (authUser) {
        await assertProfileIsActive(authUser);
        setUser(applyRoleFallback(authUser));
      }

      return { success: true, user: authUser };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({
    email,
    password,
    fullName,
    phone = "",
    role = "student",
  }) => {
    try {
      setError(null);
      setIsLoading(true);
      const signupResult = await authService.register({
        email,
        password,
        fullName,
        phone,
        role,
      });
      const authUser = signupResult?.user;
      const session = signupResult?.session || null;
      const resolvedRole = signupResult?.resolvedRole || role;

      if (session) {
        setSession(session);
      }

      if (authUser) {
        await assertProfileIsActive(authUser);
        setUser(applyRoleFallback(authUser));
      }

      return {
        success: true,
        user: authUser,
        pendingApproval: isPendingInstructor(resolvedRole),
        emailDeliveryFailed: Boolean(signupResult?.emailDeliveryFailed),
      };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authService.logout();
      setUser(null);
      setSession(null);
      return { success: true };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await authService.resetPassword(email);
      return { success: true };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const updatePassword = async (payload) => {
    try {
      setError(null);
      let result = null;
      if (typeof payload === "string") {
        result = await authService.updatePassword({ newPassword: payload });
      } else if (payload?.email && payload?.otp && payload?.newPassword) {
        result = await authService.confirmResetPassword({
          email: payload.email,
          otp: payload.otp,
          newPassword: payload.newPassword,
        });
      } else if (payload?.currentPassword && payload?.newPassword) {
        result = await authService.updatePassword(payload);
      } else {
        throw new Error(
          "Password update requires current password or reset credentials.",
        );
      }

      if (result?.disabled) {
        const reason = result.reason || i18n.t("authExtra.updateDisabled");
        notifyError(reason);
        return { success: false, error: reason };
      }
      return { success: true };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      if (!user?.id) throw new Error("No user logged in");

      const updatedProfile = await userService.updateProfile(
        user.id,
        profileData,
      );
      if (updatedProfile?.disabled) {
        const reason =
          updatedProfile.reason || i18n.t("authExtra.updateDisabled");
        notifyError(reason);
        return { success: false, error: reason };
      }
      setUser((prev) => ({ ...prev, ...updatedProfile }));
      return { success: true, profile: updatedProfile };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const uploadAvatar = async (file) => {
    try {
      setError(null);
      if (!user?.id) throw new Error("No user logged in");

      const { url } = await userService.uploadAvatar(user.id, file);
      if (!url) {
        return {
          success: false,
          error:
            "Profile editing is temporarily disabled until backend support is finalized.",
        };
      }
      setUser((prev) => ({ ...prev, avatar_url: url }));
      return { success: true, url };
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user: effectiveUser,
    session,
    isAuthenticated: !!effectiveUser?.id,
    isLoading: isLoading || !hydrated,
    error,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    uploadAvatar,
    checkUser: syncAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
