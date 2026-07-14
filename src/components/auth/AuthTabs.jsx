import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUser,
} from "react-icons/fi";
import Button from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { normalizeSignupAccountType } from "../../lib/roles";
import { formatErrorMessage } from "../../lib/supabaseErrors";
import CountryPhoneInput from "./CountryPhoneInput";

const passwordRules = (password, t) => [
  { test: password.length >= 8, label: t("register.atLeast8Characters") },
  {
    test: /[A-Z]/.test(password),
    label: t("register.atLeastOneUppercaseLetter"),
  },
  {
    test: /[a-z]/.test(password),
    label: t("register.atLeastOneLowercaseLetter"),
  },
  { test: /[0-9]/.test(password), label: t("register.atLeastOneNumber") },
];

const AuthTabs = ({
  initialTab = "login",
  redirectTo = "/dashboard",
  compact = false,
  onAuthenticated,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const registerFormRef = useRef(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    console.log('[AuthTabs] Component mounted');
    console.log('[AuthTabs] Register form ref on mount:', registerFormRef.current);
  }, []);

  useEffect(() => {
    if (activeTab === 'register') {
      console.log('[AuthTabs] Switched to register tab');
      setTimeout(() => {
        console.log('[AuthTabs] Register form ref after tab switch:', registerFormRef.current);
        if (registerFormRef.current) {
          console.log('[AuthTabs] Form element:', registerFormRef.current);
          console.log('[AuthTabs] Form action:', registerFormRef.current.action);
          console.log('[AuthTabs] Form method:', registerFormRef.current.method);
        }
      }, 100);
    }
  }, [activeTab]);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phoneCountry: "EG",
    phoneDialCode: "+20",
    phoneNumber: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [accountType, setAccountType] = useState(() =>
    normalizeSignupAccountType(searchParams.get("role")),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const rules = useMemo(
    () => passwordRules(registerData.password, t),
    [registerData.password, t],
  );
  const isPasswordValid = rules.every((rule) => rule.test);

  const finishAuth = () => {
    onAuthenticated?.();
    navigate(redirectTo || "/dashboard", { replace: true });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (!result.success) {
        setError(
          formatErrorMessage(result.error) || t("authExtra.loginFailed"),
        );
        return;
      }
      finishAuth();
    } catch (err) {
      setError(formatErrorMessage(err) || t("authExtra.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event) => {
    console.log('[handleRegister] ENTRY - Event:', event);
    console.log('[handleRegister] Form ref:', registerFormRef.current);
    console.log('[handleRegister] Event target:', event.target);
    console.log('[handleRegister] Current target:', event.currentTarget);
    console.log('[handleRegister] About to call preventDefault');
    event.preventDefault();
    console.log('[handleRegister] After preventDefault - default prevented:', event.defaultPrevented);
    console.log('[handleRegister] Setting error and loading state');
    setError("");
    setIsLoading(true);

    if (!registerData.name.trim()) {
      setError(t("register.pleaseEnterYourName"));
      setIsLoading(false);
      return;
    }
    if (!registerData.phoneNumber.trim()) {
      setError(t("register.pleaseEnterYourPhoneNumber"));
      setIsLoading(false);
      return;
    }
    if (!isPasswordValid) {
      setError(t("register.passwordDoesNotMeetRequirement"));
      setIsLoading(false);
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      setIsLoading(false);
      return;
    }
    if (!registerData.terms) {
      setError(t("register.pleaseAgreeToTheTermsAndCondit"));
      setIsLoading(false);
      return;
    }

    try {
      console.log('[handleRegister] About to call authService.register with:', {
        email: registerData.email,
        fullName: registerData.name,
        phone: registerData.phone,
        role: accountType,
      });
      const result = await register({
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.name,
        phone: registerData.phone,
        role: accountType,
      });
      console.log('[handleRegister] authService.register result:', result);
      if (!result.success) {
        setError(
          formatErrorMessage(result.error) || t("register.registrationFailed"),
        );
        return;
      }
      finishAuth();
    } catch (err) {
      setError(formatErrorMessage(err) || t("authExtra.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={compact ? "w-full" : "card card-body"}>
      <div
        className="grid grid-cols-2 gap-2 p-1 mb-6 rounded-xl bg-secondary-100 dark:bg-dark-bg"
        role="tablist"
        aria-label={t("authUnified.tabsLabel")}
      >
        {["login", "register"].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => {
              setActiveTab(tab);
              setError("");
            }}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white text-primary-700 shadow-sm dark:bg-dark-card dark:text-primary-300"
                : "text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white"
            }`}
          >
            {tab === "login" ? t("auth.login.title") : t("auth.register.title")}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-5 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === "login" ? (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="auth-login-email" className="label">
              {t("auth.login.email")}
            </label>
            <div className="relative">
              <FiMail className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-login-email"
                type="email"
                value={loginData.email}
                onChange={(event) =>
                  setLoginData((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="input ps-12"
                placeholder={t("login.exampleemailcom")}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-login-password" className="label">
              {t("auth.login.password")}
            </label>
            <div className="relative">
              <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-login-password"
                type={showPassword ? "text" : "password"}
                value={loginData.password}
                onChange={(event) =>
                  setLoginData((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="input ps-12 pe-12"
                placeholder={t("authUnified.passwordPlaceholder")}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                aria-label={
                  showPassword
                    ? t("authUnified.hidePassword")
                    : t("authUnified.showPassword")
                }
              >
                {showPassword ? (
                  <FiEyeOff className="w-5 h-5" />
                ) : (
                  <FiEye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={loginData.remember}
                onChange={(event) =>
                  setLoginData((prev) => ({
                    ...prev,
                    remember: event.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
              />
              {t("auth.login.remember")}
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {t("auth.login.forgot")}
            </Link>
          </div>

          <Button type="submit" fullWidth loading={isLoading}>
            {t("auth.login.submit")}
          </Button>
        </form>
      ) : (
        <form ref={registerFormRef} onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="auth-register-name" className="label">
              {t("auth.register.name")}
            </label>
            <div className="relative">
              <FiUser className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-register-name"
                type="text"
                value={registerData.name}
                onChange={(event) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="input ps-12"
                placeholder={t("register.johnDoe")}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <CountryPhoneInput
            country={registerData.phoneCountry}
            number={registerData.phoneNumber}
            required
            onChange={({ country, dialCode, number, value }) =>
              setRegisterData((prev) => ({
                ...prev,
                phoneCountry: country,
                phoneDialCode: dialCode,
                phoneNumber: number,
                phone: value,
              }))
            }
          />

          <div>
            <label className="label">{t("register.accountType")}</label>
            <div className="grid grid-cols-2 gap-3">
              {["student", "teacher"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setAccountType(role)}
                  className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold transition-colors ${
                    accountType === role
                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200"
                      : "border-secondary-200 text-secondary-700 hover:border-primary-300 dark:border-dark-border dark:text-secondary-300"
                  }`}
                >
                  {role === "student" ? t("roles.student") : t("roles.teacher")}
                </button>
              ))}
            </div>
            {accountType === "teacher" && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                {t("register.yourApplicationWillBeReviewedB")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="auth-register-email" className="label">
              {t("auth.register.email")}
            </label>
            <div className="relative">
              <FiMail className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-register-email"
                type="email"
                value={registerData.email}
                onChange={(event) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="input ps-12"
                placeholder={t("register.exampleemailcom")}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-register-password" className="label">
              {t("auth.register.password")}
            </label>
            <div className="relative">
              <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-register-password"
                type={showPassword ? "text" : "password"}
                value={registerData.password}
                onChange={(event) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="input ps-12 pe-12"
                placeholder={t("authUnified.passwordPlaceholder")}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                aria-label={
                  showPassword
                    ? t("authUnified.hidePassword")
                    : t("authUnified.showPassword")
                }
              >
                {showPassword ? (
                  <FiEyeOff className="w-5 h-5" />
                ) : (
                  <FiEye className="w-5 h-5" />
                )}
              </button>
            </div>
            {registerData.password && (
              <div className="mt-3 grid gap-2">
                {rules.map((rule) => (
                  <div
                    key={rule.label}
                    className={`flex items-center gap-2 text-sm ${rule.test ? "text-green-600" : "text-secondary-400"}`}
                  >
                    <FiCheck
                      className={`w-4 h-4 ${rule.test ? "opacity-100" : "opacity-35"}`}
                    />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="auth-register-confirm-password" className="label">
              {t("auth.register.confirmPassword")}
            </label>
            <div className="relative">
              <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
              <input
                id="auth-register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={registerData.confirmPassword}
                onChange={(event) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                className={`input ps-12 pe-12 ${registerData.confirmPassword && registerData.password !== registerData.confirmPassword ? "input-error" : ""}`}
                placeholder={t("authUnified.passwordPlaceholder")}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                aria-label={
                  showConfirmPassword
                    ? t("authUnified.hidePassword")
                    : t("authUnified.showPassword")
                }
              >
                {showConfirmPassword ? (
                  <FiEyeOff className="w-5 h-5" />
                ) : (
                  <FiEye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-secondary-600 dark:text-secondary-400 cursor-pointer">
            <input
              type="checkbox"
              checked={registerData.terms}
              onChange={(event) =>
                setRegisterData((prev) => ({
                  ...prev,
                  terms: event.target.checked,
                }))
              }
              className="w-4 h-4 mt-0.5 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
            />
            <span>
              {t("register.iAgreeToThe")}{" "}
              <Link
                to="/terms"
                className="font-medium text-primary-600 hover:underline"
              >
                {t("footer.terms")}
              </Link>{" "}
              {t("register.and")}{" "}
              <Link
                to="/privacy"
                className="font-medium text-primary-600 hover:underline"
              >
                {t("footer.privacy")}
              </Link>
            </span>
          </label>

          <Button type="submit" fullWidth loading={isLoading}>
            {t("auth.register.submit")}
          </Button>
        </form>
      )}
    </div>
  );
};

export default AuthTabs;
