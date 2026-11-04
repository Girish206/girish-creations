import { useLayoutEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { messageFor } from "../api/mutationErrors";
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
type LoginField = "identifier" | "password";

// Which input a failed sign-in is about (the server's error codes).
const FIELD_FOR_CODE: Record<string, LoginField> = {
  INVALID_IDENTIFIER: "identifier",
  UNKNOWN_ACCOUNT: "identifier",
  ACCOUNT_INACTIVE: "identifier",
  NO_LOGIN: "identifier",
  NO_PASSWORD: "identifier",
  WRONG_PASSWORD: "password",
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
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const problems = {
      identifier: identifierProblem(email),
      password: password ? "" : "Enter your password",
    };
    setFieldErrors(problems);
    if (problems.identifier || problems.password) return;

    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err instanceof NoAdminModuleError) {
        setError(err.message);
      } else {
        const code = isAxiosError(err) ? err.response?.data?.error?.code : undefined;
        const field = FIELD_FOR_CODE[code];
        if (field) setFieldErrors({ [field]: messageFor(err) });
        else setError(messageFor(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-ash admin-login-ash-1" aria-hidden="true" />
      <div className="admin-login-ash admin-login-ash-2" aria-hidden="true" />

      <div className="admin-login-card animated fadeInUp">
        <div className="admin-login-logo-ring">
          <img src="/logo/logo.png" alt="Girish Creations" className="admin-login-logo" />
        </div>

        <span className="admin-login-badge">Girish Creations</span>
        <h1 className="admin-login-heading">Welcome Back</h1>
        <p className="admin-login-subtitle">Sign in with your email or mobile number</p>

        <form onSubmit={handleSubmit} noValidate className="admin-login-form">
          {error && <div className="alert alert-danger py-2 text-center">{error}</div>}

          <InputComp
            type="text"
            name="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((current) => ({ ...current, identifier: "" }));
            }}
            error={fieldErrors.identifier}
            floating={true}
            required
            icon="fa-solid fa-circle-user"
            iconPosition="right"
            label="Email or mobile number"
          />

          <InputComp
            type={showPassword ? "text" : "password"}
            name="password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((current) => ({ ...current, password: "" }));
            }}
            error={fieldErrors.password}
            floating={true}
            required
            icon={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
            iconPosition="right"
            iconOnClick={() => setShowPassword((prev) => !prev)}
          />

          <CustomButton
            type="submit"
            rounded={true}
            className="w-100 mt-3"
            disabled={loading}
            loading={loading}
            loadingLabel="Signing in..."
          >
            Sign In <i className="fa-solid fa-arrow-right ms-2"></i>
          </CustomButton>
        </form>

        <p className="admin-login-footnote">
          <i className="fa-solid fa-shield-halved"></i> Secure admin access only
        </p>
      </div>
    </div>
  );
}
