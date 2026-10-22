import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { ThemeToggle } from "./Common.jsx";
import { Button } from "./ui/button.jsx";
import { cn } from "../lib/utils.js";

const icons = {
  Dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  "Buying products": <><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
  "Purchases & history": <><path d="M5 3h14v18H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  "Billing records": <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  Vendors: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01" /></>,
  "Buying inventory": <><path d="M3 7 12 3l9 4v13H3z" /><path d="M3 7h18M12 7v13M8 11h.01M16 11h.01" /></>,
  "Selling products": <><path d="M20 13 11 22l-9-9V4h9z" /><circle cx="7" cy="8" r="1" /></>,
  "Selling inventory": <><path d="M3 7 12 3l9 4v13H3z" /><path d="M3 7h18M12 7v13M8 11h.01M16 11h.01" /></>,
  Production: <><path d="M3 21V9l6 4V9l6 4V5l6 4v12z" /><path d="M7 17h2M13 17h2M18 17h1" /></>,
  "Run history": <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  Workers: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1zM16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" /></>,
};

export default function Layout() {
  const { user, isOwner, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = [
    { label: null, links: [["Dashboard", "/", "Dashboard"]] },
    {
      label: "Buying",
      links: [
        ["Buying products", "/buying-products", "Buying products"],
        ["Purchases & history", "/purchases", "Purchases & history"],
        ["Billing records", "/billing", "Billing records"],
        ["Vendors", "/vendors", "Vendors"],
        ["Buying inventory", "/raw-inventory", "Buying inventory"],
      ],
    },
    {
      label: "Selling",
      links: [
        ["Selling products", "/selling-products", "Selling products"],
        ["Selling inventory", "/inventory", "Selling inventory"],
      ],
    },
    ...(isOwner
      ? [{
          label: "Manufacturing",
          links: [
            ["Production", "/manufacturing", "Production"],
            ["Run history", "/manufacturing/history", "Run history"],
          ],
        }]
      : []),
    ...(isOwner ? [{ label: "Administration", links: [["Workers", "/workers", "Workers"]] }] : []),
  ];

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " mobile-nav-open" : ""}`}>
      {mobileOpen && <button type="button" className="nav-backdrop" aria-label="Close navigation menu" onClick={closeMobileNavigation} />}
      <aside className="sidebar" id="main-sidebar">
        <div className="sidebar-brand-row">
          <NavLink className="brand" to="/" onClick={closeMobileNavigation} aria-label="EMS Inventory home">
            <span className="brand-mark" aria-hidden="true">E</span>
            <span className="brand-copy">EMS<span>Inventory workspace</span></span>
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="sidebar-collapse text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground max-[760px]:hidden"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight aria-hidden="true" />
              : <ChevronLeft aria-hidden="true" />}
          </Button>
        </div>
        <nav aria-label={isOwner ? "Owner navigation" : "Worker navigation"}>
          {groups.map((group) => (
            <div className="nav-group" key={group.label || "home"}>
              {group.label && <span className="nav-group-label">{group.label}</span>}
              {group.links.map(([label, path, icon]) => (
                <NavLink
                  end={path === "/"}
                  className={({ isActive }) => cn(
                    "nav-link text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "active bg-sidebar-active text-sidebar-foreground",
                  )}
                  to={path}
                  key={path}
                  onClick={closeMobileNavigation}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{icons[icon]}</svg>
                  <span className="nav-link-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-role">{isOwner ? "Owner workspace" : "Team workspace"}</span>
          <button type="button" className="sidebar-mobile-close" onClick={closeMobileNavigation}>Close menu</button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mobile-menu-button hidden text-secondary-foreground hover:bg-accent hover:text-foreground max-[760px]:inline-flex"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="main-sidebar"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen
              ? <X aria-hidden="true" />
              : <Menu aria-hidden="true" />}
          </Button>
          <div className="topbar-user">
            <strong>{user?.name || "Team member"}</strong>
            <span className="role-badge">{user?.role || "USER"}</span>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="logout-button"
              onClick={logout}
            >
              Log out
            </Button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
