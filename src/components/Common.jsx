import { useTheme } from "../theme/ThemeContext.jsx";

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-title-actions">{children}</div>}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="button button-quiet theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export function Loading({ label = "Loading..." }) {
  return <div className="loading" role="status">{label}</div>;
}

export function Alert({ message, kind = "error", onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{message}</span>
      {onClose && <button className="alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}

export function DataTable({ columns, rows, emptyMessage = "No records found.", rowKey = "id" }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowKey] || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : (row[column.key] ?? "—")}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="empty-cell" colSpan={columns.length}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, children, required = false, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}{required && <span className="required"> *</span>}</span>
      {children}
    </label>
  );
}

export function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
    : "—";
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
