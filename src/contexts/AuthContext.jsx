import { createContext, useContext, useState, useEffect, useMemo } from "react";
import i18n from "../i18n/i18n";
import { authService, userService } from "../services/api";
import {
  resolveUserRole,
  isPendingInstructor,
  resolveAppRole,
} from "../lib/roles";
import { formatErrorMessage } from "../lib/supabaseErrors";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyRoleFallback = (userData) => {
    if (!userData) return userData;

    return {
      ...userData,
      role: resolveUserRole(userData),
    };
  };

  const mergeAuthProfile = (authUser, profile) => {
    const authEmail = (authUser?.email || "").toString().trim();
    return {
      ...authUser,
      ...profile,
      email: authEmail || profile?.email || "",
      full_name:
        profile?.full_name ||
        authUser?.full_name ||
        authUser?.user_metadata?.full_name,
      avatar_url:
        profile?.avatar_url ||
        authUser?.avatar_url ||
        authUser?.user_metadata?.avatar_url,
      role: resolveAppRole(profile),
    };
  };

  const assertProfileIsActive = async (profile) => {
    if (!profile?.is_suspended) return;

    try {
      await authService.logout();
    } catch (signOutError) {
      console.warn("Error signing out suspended user:", signOutError);
    }

    setUser(null);
    setSession(null);
    throw new Error(i18n.t("authExtra.accountBlocked"));
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
      const currentUser = authState?.user || null;
      const activeSession = authState?.session || null;

      if (!currentUser?.id || !activeSession) {
        setUser(null);
        setSession(null);
        return;
      }

      if (authService.isSessionExpired?.(activeSession)) {
        await authService.logout();
        setUser(null);
        setSession(null);
        return;
      }

      const profile = await userService.getOrCreateProfile(currentUser.id, {
        email: currentUser.email,
        full_name:
          currentUser.full_name || currentUser.user_metadata?.full_name,
        avatar_url:
          currentUser.avatar_url || currentUser.user_metadata?.avatar_url,
      });
      await assertProfileIsActive(profile);

      const mergedUser = mergeAuthProfile(currentUser, profile);
      setUser(applyRoleFallback(mergedUser));
    } catch (err) {
      console.error("Error checking user:", err);
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
            console.warn("Error signing out after expired JWT:", sErr);
          }
          // Clear local state and prompt user to re-authenticate
          setUser(null);
          setSession(null);
          try {
            alert(i18n.t("authExtra.sessionExpired"));
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
                console.warn("Error clearing expired session:", logoutError);
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
        // Use getOrCreateProfile to handle users without a profile
        const profile = await userService.getOrCreateProfile(authUser.id, {
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url,
        });
        await assertProfileIsActive(profile);
        const mergedUser = mergeAuthProfile(authUser, profile);
        setUser(applyRoleFallback(mergedUser));
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
      const resolvedRole = signupResult?.resolvedRole || role;

      if (authUser) {
        const withRoleFallback = applyRoleFallback({
          ...authUser,
          full_name: fullName,
          phone,
          role: resolvedRole,
        });
        setUser(withRoleFallback);
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

  const updatePassword = async (newPassword) => {
    try {
      setError(null);
      await authService.updatePassword(newPassword);
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
    isLoading,
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
