import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import InputComp from "./dms/components/InputComp";
import CustomButton from "./dms/components/CustomButton";
import { useAdminBodyClass } from "./useAdminBodyClass";
import { useAdminTheme } from "./useAdminTheme";
import "./dms/global.css";
import "./dms/css/Login.css";

// A bold, single-focus centered login screen: a soft pastel logo-color
// gradient backdrop with the same ambient "ash" shapes the public site
// floats in its own page corners, and one card. Still built entirely from
// the ported DMS components (InputComp/CustomButton); only the layout and
// ./dms/css/Login.css's styling are new.
export function AdminLoginPage() {
  useAdminBodyClass();
  useAdminTheme();
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch {
      setError("Invalid email or password.");
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
        <p className="admin-login-subtitle">Sign in to manage your portfolio</p>

        <form onSubmit={handleSubmit} noValidate className="admin-login-form">
          {error && <div className="alert alert-danger py-2 text-center">{error}</div>}

          <InputComp
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            floating={true}
            required
            icon="fa-solid fa-circle-user"
            iconPosition="right"
            label="Email"
          />

          <InputComp
            type={showPassword ? "text" : "password"}
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
