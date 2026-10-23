import { useTheme } from "../theme/ThemeContext.jsx";
import { CircleAlert, CircleCheck, Info, Moon, Sun, TriangleAlert, X } from "lucide-react";
import { Alert as AlertPrimitive } from "./ui/alert.jsx";
import { Button } from "./ui/button.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table.jsx";

const alertIcons = {
  error: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
  info: Info,
};

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
    <Button
      type="button"
      variant="outline"
      className="theme-toggle text-secondary-foreground hover:text-foreground"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === "dark"
        ? <Sun className="theme-toggle-icon size-4" aria-hidden="true" />
        : <Moon className="theme-toggle-icon size-4" aria-hidden="true" />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </Button>
  );
}

export function Loading({ label = "Loading..." }) {
  return <div className="loading" role="status">{label}</div>;
}

export function Alert({ message, kind = "error", onClose }) {
  if (!message) return null;
  const Icon = alertIcons[kind] || Info;
  return (
    <AlertPrimitive
      variant={kind === "error" ? "destructive" : kind}
      className="mb-3 items-start"
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </span>
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 size-7 shrink-0 text-current hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onClose}
          aria-label="Dismiss"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </AlertPrimitive>
  );
}

export function DataTable({ columns, rows, emptyMessage = "No records found.", rowKey = "id" }) {
  return (
    <div className="table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.align === "right" ? "text-right tabular-nums whitespace-nowrap" : undefined}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row[rowKey] || index}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.align === "right" ? "text-right tabular-nums whitespace-nowrap" : undefined}
                >
                  {column.render ? column.render(row) : (row[column.key] ?? "—")}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell className="empty-cell py-10 text-center text-muted-foreground" colSpan={columns.length}>{emptyMessage}</TableCell></TableRow>}
        </TableBody>
      </Table>
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
