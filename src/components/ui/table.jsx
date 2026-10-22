import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <table
      className={cn("w-full border-collapse text-left", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead
      className={cn(
        "[&_tr]:border-b [&_tr]:border-border [&_th]:bg-muted/70 [&_th]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0 [&_tr:last-child_td]:border-b-0", className)} {...props} />
  );
}

export function TableFooter({ className, ...props }) {
  return (
    <tfoot
      className={cn("border-t border-border bg-muted/50 font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-accent/50",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "h-11 whitespace-nowrap border-b border-border px-3 py-3 text-left text-[11px] font-semibold tracking-[.045em] text-secondary-foreground uppercase align-middle",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-3 text-[13px] text-foreground align-middle",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }) {
  return (
    <caption
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
