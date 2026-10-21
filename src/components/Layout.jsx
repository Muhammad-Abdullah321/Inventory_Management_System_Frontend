import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Layout() {
  const { user, isOwner, logout } = useAuth();
  const groups = [
    { label: null, links: [["Dashboard", "/"]] },
    {
      label: "Buying",
      links: [
        ["Buying products", "/buying-products"],
        ["Purchases & history", "/purchases"],
        ["Billing records", "/billing"],
        ["Vendors", "/vendors"],
        ["Buying inventory", "/raw-inventory"],
      ],
    },
    {
      label: "Selling",
      links: [
        ["Selling products", "/selling-products"],
        ["Selling inventory", "/inventory"],
      ],
    },
    ...(isOwner
      ? [{
          label: "Manufacturing",
          links: [
            ["Production", "/manufacturing"],
            ["Run history", "/manufacturing/history"],
          ],
        }]
      : []),
    ...(isOwner ? [{ label: "Administration", links: [["Workers", "/workers"]] }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">EMS<span>Inventory</span></NavLink>
        <nav aria-label="Main navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.label || "home"}>
              {group.label && <span className="nav-group-label">{group.label}</span>}
              {group.links.map(([label, path]) => (
                <NavLink end={path === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to={path} key={path}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-note">Inventory and purchasing workspace</div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>{user?.name || "Team member"}</strong>
            <span className="role-badge">{user?.role || "USER"}</span>
          </div>
          <button className="button button-quiet" onClick={logout}>Log out</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
