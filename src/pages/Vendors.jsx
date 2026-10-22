import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, DataTable, Field, Loading, PageTitle } from "../components/Common.jsx";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function Vendors() {
  const { isOwner } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/vendors");
      setVendors(response.data.data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  async function viewVendor(vendor) {
    setError("");
    try {
      const response = await api.get(`/vendors/${vendor.id}`);
      setSelected(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  function editVendor(vendor) {
    setEditingId(vendor.id);
    setForm({ name: vendor.name || "", phone: vendor.phone || "", email: vendor.email || "", address: vendor.address || "" });
    setSuccess("");
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      if (editingId) await api.put(`/vendors/${editingId}`, payload);
      else await api.post("/vendors", payload);
      setSuccess(editingId ? "Vendor updated." : "Vendor added.");
      resetForm();
      await loadVendors();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteVendor(vendor) {
    if (!window.confirm(`Delete vendor ${vendor.name}? Vendors with purchase history may not be deletable.`)) return;
    setError("");
    try {
      const response = await api.delete(`/vendors/${vendor.id}`);
      setSuccess(response.data.message || "Vendor deleted.");
      await loadVendors();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  const columns = [
    { key: "name", label: "Vendor" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="table-actions">
        <button className="button button-small" onClick={() => viewVendor(row)}>Details</button>
        {isOwner && <>
          <button className="button button-small" onClick={() => editVendor(row)}>Edit</button>
          <button className="button button-small button-danger" onClick={() => deleteVendor(row)}>Delete</button>
        </>}
      </div>
    ) },
  ];

  return (
    <div className="vendor-page">
      <PageTitle title="Vendors" subtitle="Manage supplier contact details used in purchase records." />
      <Alert message={error} />
      <Alert kind="success" message={success} />
      {isOwner && <section className="panel vendor-form-panel">
        <div className="section-heading"><div><h2>{editingId ? "Edit vendor" : "Add vendor"}</h2><p className="vendor-section-copy">Keep supplier contact information up to date.</p></div></div>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Vendor name" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Phone"><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Address"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
          <div className="form-actions">
            <button className="button button-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add vendor"}</button>
            {editingId && <button type="button" className="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>}
      {selected && <section className="panel detail-panel vendor-detail-panel">
        <div className="section-heading"><div><h2>Vendor details</h2><p className="vendor-section-copy">Contact information on file for this supplier.</p></div><button className="button button-small" onClick={() => setSelected(null)}>Close</button></div>
        <dl className="detail-grid">
          <div><dt>Name</dt><dd>{selected.name}</dd></div><div><dt>Phone</dt><dd>{selected.phone || "—"}</dd></div>
          <div><dt>Email</dt><dd>{selected.email || "—"}</dd></div><div><dt>Address</dt><dd>{selected.address || "—"}</dd></div>
        </dl>
      </section>}
      <section className="panel vendor-list-panel">
        <div className="section-heading"><div><h2>Vendor directory</h2><p className="vendor-section-copy">Supplier contact information returned by EMS.</p></div><button className="button button-small" onClick={loadVendors}>Refresh</button></div>
        {loading ? <Loading label="Loading vendors..." /> : <DataTable columns={columns} rows={vendors} emptyMessage="No vendors yet. Add a vendor above." />}
      </section>
    </div>
  );
}
