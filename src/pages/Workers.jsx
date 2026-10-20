import { useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, Field, PageTitle } from "../components/Common.jsx";

export default function Workers() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const passwordBytes = new TextEncoder().encode(form.password).length;
    if (passwordBytes < 8 || passwordBytes > 72) {
      setError("Password must be 8–72 UTF-8 bytes.");
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("/users/workers", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setSuccess(`Worker account created for ${response.data.data.email}.`);
      setForm({ name: "", email: "", password: "" });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="Worker accounts" subtitle="Create WORKER accounts for your team" />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      <section className="panel narrow-panel">
        <div className="section-heading"><h2>Create worker</h2></div>
        <form className="form-stack" onSubmit={submit}>
          <Field label="Full name" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Email" required><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
          <Field label="Temporary password (8–72 UTF-8 bytes)" required><input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></Field>
          <button className="button button-primary" disabled={saving}>{saving ? "Creating..." : "Create worker account"}</button>
        </form>
      </section>
    </>
  );
}
