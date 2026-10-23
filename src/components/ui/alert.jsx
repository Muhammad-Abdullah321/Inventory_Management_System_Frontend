import { cn } from "@/lib/utils";

const alertVariants = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)] [&_svg]:text-[var(--error-text)]",
  success: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)] [&_svg]:text-[var(--success-text)]",
  warning: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] [&_svg]:text-[var(--warning-text)]",
  info: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)] [&_svg]:text-[var(--info-text)]",
};

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm leading-5 shadow-sm",
        alertVariants[variant] || alertVariants.default,
        className,
      )}
      {...props}
    />
  );
}
