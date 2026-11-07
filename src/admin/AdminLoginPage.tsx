import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { messageFor } from "../api/mutationErrors";
import type { ApiEnvelope } from "../api/types";
import { normalizeMobile } from "../utils/mobile";
import { NoAdminModuleError, useAdminAuth } from "../context/AdminAuthContext";
import InputComp from "./dms/components/InputComp";
import CustomButton from "./dms/components/CustomButton";
import { useAdminBodyClass } from "./useAdminBodyClass";
import "./dms/global.css";
import "./dms/css/Login.css";

// A bold, single-focus centered login screen: a white card on the brand
// gradient, whichever theme is saved, so the login always pins Bootstrap's
// light palette instead of using useAdminTheme. Still built entirely from
// the ported DMS components (InputComp/CustomButton); only the layout and
// ./dms/css/Login.css's styling are new.
type LoginField = "identifier" | "password" | "code" | "newPassword" | "confirm";

// Sign in with a password, sign in with an emailed code, or set a new password
// with an emailed code. The two code modes first ask where to send it.
type Mode = "password" | "code" | "reset";

// Which input a failed request is about (the server's error codes).
const FIELD_FOR_CODE: Record<string, LoginField> = {
  INVALID_IDENTIFIER: "identifier",
  UNKNOWN_ACCOUNT: "identifier",
  ACCOUNT_INACTIVE: "identifier",
  NO_LOGIN: "identifier",
  NO_PASSWORD: "identifier",
  NO_EMAIL: "identifier",
  WRONG_PASSWORD: "password",
  WRONG_CODE: "code",
  CODE_EXPIRED: "code",
};

const COPY: Record<Mode, { heading: string; subtitle: string; submit: string; loading: string }> = {
  password: {
    heading: "Welcome Back",
    subtitle: "Sign in with your email or mobile number",
    submit: "Sign In",
    loading: "Signing in...",
  },
  code: {
    heading: "Sign In With a Code",
    subtitle: "We'll email a one-time code to your account",
    submit: "Verify and Sign In",
    loading: "Verifying...",
  },
  reset: {
    heading: "Forgot Password",
    subtitle: "We'll email a code so you can set a new password",
    submit: "Set Password and Sign In",
    loading: "Saving...",
  },
};

function identifierProblem(identifier: string) {
  const value = identifier.trim();
  if (!value) return "Enter your email or mobile number";
  if (value.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Enter a valid email";
  return normalizeMobile(value) ? "" : "Enter a valid 10-digit mobile number";
}

export function AdminLoginPage() {
  useAdminBodyClass();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-bs-theme", "light");
    // Left behind when arriving from a dark page; the next page's useDarkTheme
    // sets it again.
    document.body.classList.remove("dark-theme");
    return () => root.removeAttribute("data-bs-theme");
  }, []);
  const { login, loginWithCode, resetPassword } = useAdminAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // The masked address the code went to; set once one has been sent.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [loading, setLoading] = useState(false);

  const copy = COPY[mode];
  const waitingForCode = mode !== "password" && sentTo === null;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function clearMessages() {
    setError("");
    setNotice("");
    setFieldErrors({});
  }

  // Keeps what they typed as their email or mobile number.
  function switchMode(next: Mode) {
    setMode(next);
    setSentTo(null);
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirm("");
    clearMessages();
  }

  function clearField(field: LoginField) {
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function showFailure(err: unknown) {
    if (err instanceof NoAdminModuleError) {
      setError(err.message);
      return;
    }
    const errorCode = isAxiosError(err) ? err.response?.data?.error?.code : undefined;
    const field = FIELD_FOR_CODE[errorCode];
    if (field) setFieldErrors({ [field]: messageFor(err) });
    else setError(messageFor(err));
  }

  async function sendCode() {
    const { data } = await apiClient.post<ApiEnvelope<{ sentTo: string; resendInSeconds: number }>>(
      "/admin/auth/otp/request",
      { email: email.trim(), purpose: mode === "reset" ? "reset" : "login" },
    );
    setSentTo(data.data.sentTo);
    setResendIn(data.data.resendInSeconds);
  }

  async function handleResend() {
    clearMessages();
    setLoading(true);
    try {
      await sendCode();
      setCode("");
      setNotice("A new code is on its way.");
    } catch (err) {
      showFailure(err);
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    const problems: Partial<Record<LoginField, string>> = {};
    const identifier = identifierProblem(email);
    if (identifier) problems.identifier = identifier;
    if (mode === "password" && !password) problems.password = "Enter your password";
    if (mode !== "password" && sentTo !== null) {
      if (!/^\d{6}$/.test(code)) problems.code = "Enter the 6-digit code";
      if (mode === "reset") {
        if (newPassword.length < 8) problems.newPassword = "Use at least 8 characters";
        if (confirm !== newPassword) problems.confirm = "The passwords don't match";
      }
    }
    setFieldErrors(problems);
    return Object.keys(problems).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (waitingForCode) {
        await sendCode();
      } else {
        if (mode === "password") await login(email, password);
        else if (mode === "code") await loginWithCode(email.trim(), code);
        else await resetPassword(email.trim(), code, newPassword);
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      showFailure(err);
    } finally {
      setLoading(false);
    }
  }

  const passwordIcon = `fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`;

  return (
    <div className="admin-login-shell">
      <div className="admin-login-ash admin-login-ash-1" aria-hidden="true" />
      <div className="admin-login-ash admin-login-ash-2" aria-hidden="true" />

      <div className="admin-login-card animated fadeInUp">
        <div className="admin-login-logo-ring">
          <img src="/logo/logo.png" alt="Girish Creations" className="admin-login-logo" />
        </div>

        <span className="admin-login-badge">Girish Creations</span>
        <h1 className="admin-login-heading">{copy.heading}</h1>
        <p className="admin-login-subtitle">{copy.subtitle}</p>

        <form onSubmit={handleSubmit} noValidate className="admin-login-form">
          {error && <div className="alert alert-danger py-2 text-center">{error}</div>}
          {sentTo && (
            <p className="admin-login-sent" role="status">
              <i className="fa-solid fa-circle-check" aria-hidden="true"></i>{" "}
              {notice || `Code sent to ${sentTo} (valid 10 min)`}
            </p>
          )}

          <InputComp
            type="text"
            name="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            readOnly={sentTo !== null}
            onChange={(e) => {
              setEmail(e.target.value);
              clearField("identifier");
            }}
            error={fieldErrors.identifier}
            floating={true}
            required
            icon="fa-solid fa-circle-user"
            iconPosition="right"
            label="Email or mobile number"
          />

          {mode === "password" && (
            <InputComp
              type={showPassword ? "text" : "password"}
              name="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearField("password");
              }}
              error={fieldErrors.password}
              floating={true}
              required
              icon={passwordIcon}
              iconPosition="right"
              iconOnClick={() => setShowPassword((prev) => !prev)}
            />
          )}

          {sentTo !== null && (
            <InputComp
              type="text"
              name="code"
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                clearField("code");
              }}
              error={fieldErrors.code}
              floating={true}
              required
              icon="fa-solid fa-key"
              iconPosition="right"
            />
          )}

          {mode === "reset" && sentTo !== null && (
            <>
              <InputComp
                type={showPassword ? "text" : "password"}
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearField("newPassword");
                }}
                error={fieldErrors.newPassword}
                floating={true}
                required
                icon={passwordIcon}
                iconPosition="right"
                iconOnClick={() => setShowPassword((prev) => !prev)}
              />
              <InputComp
                type={showPassword ? "text" : "password"}
                name="confirm"
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearField("confirm");
                }}
                error={fieldErrors.confirm}
                floating={true}
                required
                icon="fa-solid fa-lock"
                iconPosition="right"
              />
            </>
          )}

          <CustomButton
            type="submit"
            rounded={true}
            className="w-100 mt-3"
            disabled={loading}
            loading={loading}
            loadingLabel={waitingForCode ? "Sending..." : copy.loading}
          >
            {waitingForCode ? "Send Code" : copy.submit} <i className="fa-solid fa-arrow-right ms-2"></i>
          </CustomButton>

          <div className="admin-login-links">
            {mode === "password" ? (
              <>
                <button type="button" onClick={() => switchMode("reset")}>
                  Forgot password?
                </button>
                <button type="button" onClick={() => switchMode("code")}>
                  Sign in with a code
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => switchMode("password")}>
                  Back to password sign-in
                </button>
                {sentTo !== null && (
                  <button type="button" onClick={handleResend} disabled={loading || resendIn > 0}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                )}
              </>
            )}
          </div>
          {mode === "reset" && sentTo !== null && (
            <p className="admin-login-note">Setting a new password signs you out on your other devices.</p>
          )}
        </form>

        <p className="admin-login-footnote">
          <i className="fa-solid fa-shield-halved"></i> Secure admin access only
        </p>
      </div>
    </div>
  );
}
