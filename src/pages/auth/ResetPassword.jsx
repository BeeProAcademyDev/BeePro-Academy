import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getLandingAuthUrl } from "../../lib/authRoutes";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/ui/Button";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
} from "react-icons/fi";

const getPasswordRequirements = (password, t) => [
  { test: password.length >= 8, label: t("resetPassword.atLeast8Characters") },
  {
    test: /[A-Z]/.test(password),
    label: t("resetPassword.atLeastOneUppercaseLetter"),
  },
  {
    test: /[a-z]/.test(password),
    label: t("resetPassword.atLeastOneLowercaseLetter"),
  },
  { test: /[0-9]/.test(password), label: t("resetPassword.atLeastOneNumber") },
];

const ResetPassword = () => {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(true);
  const [checking, setChecking] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = getPasswordRequirements(formData.password, t);
  const isPasswordValid = passwordRequirements.every((req) => req.test);

  useEffect(() => {
    setReady(true);
    setChecking(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError(t("resetPassword.passwordDoesNotMeetRequirement"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("resetPassword.passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePassword(formData.password);
      if (result.success) {
        setSuccess(true);
        window.setTimeout(
          () => navigate(getLandingAuthUrl("login"), { replace: true }),
          2500,
        );
      } else {
        setError(result.error || t("resetPassword.couldNotUpdatePassword"));
      }
    } catch {
      setError(t("authExtra.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ready && !success) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center">
        <div className="container-custom">
          <div className="max-w-md mx-auto card card-body text-center">
            <FiAlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">
              {t("auth.reset.invalidTitle")}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              {t("auth.reset.invalidMessage")}
            </p>
            <Link to="/forgot-password" className="btn btn-primary w-full">
              {t("auth.forgot.submit")}
            </Link>
            <Link
              to={getLandingAuthUrl("login")}
              className="block mt-3 text-sm text-primary-500 hover:text-primary-600"
            >
              {t("auth.forgot.back")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center px-4">
      <div className="container-custom w-full">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {t("auth.reset.title")}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              {t("auth.reset.description")}
            </p>
          </div>

          <div className="card card-body">
            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                <FiAlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center py-4">
                <FiCheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <p className="font-medium mb-2">
                  {t("auth.reset.successTitle")}
                </p>
                <p className="text-sm text-secondary-500">
                  {t("auth.reset.successMessage")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="label">
                    {t("auth.reset.password")}
                  </label>
                  <div className="relative">
                    <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input ps-12 pe-12"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                    >
                      {showPassword ? (
                        <FiEyeOff className="w-5 h-5" />
                      ) : (
                        <FiEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {passwordRequirements.map((req) => (
                      <li
                        key={req.label}
                        className={`flex items-center gap-2 text-xs ${req.test ? "text-green-600" : "text-secondary-500"}`}
                      >
                        <FiCheck
                          className={`w-3 h-3 ${req.test ? "opacity-100" : "opacity-30"}`}
                        />
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    {t("auth.reset.confirmPassword")}
                  </label>
                  <div className="relative">
                    <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input ps-12 pe-12"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff className="w-5 h-5" />
                      ) : (
                        <FiEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  disabled={!isPasswordValid}
                >
                  {t("auth.reset.submit")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
