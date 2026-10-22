import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, Field, ThemeToggle } from "../components/Common.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { getErrorMessage } from "../api/client.js";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user && localStorage.getItem("ems_token")) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-theme-toggle"><ThemeToggle /></div>
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark" aria-hidden="true">E</span><span className="login-brand-copy">EMS<span>Inventory workspace</span></span></div>
        <h1>Welcome back</h1>
        <p>Sign in with your EMS account.</p>
        <Alert message={error} />
        <form className="form-stack" onSubmit={handleSubmit}>
          <Field label="Email" required>
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Password" required>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
