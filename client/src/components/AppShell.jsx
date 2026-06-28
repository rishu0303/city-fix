import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, FilePlus2, LayoutDashboard, LogOut, ShieldCheck, Sprout } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/file', label: 'File Complaint', icon: FilePlus2, roles: ['Citizen'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin', label: 'Admin Queue', icon: ShieldCheck, roles: ['DepartmentAdmin', 'SuperAdmin'] }
];

export const AppShell = () => {
  const { user, logout } = useAuth();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="brand-icon"><Sprout size={22} /></span>
          CityFix
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink className="nav-link" to={item.to} key={item.to}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{user?.name}</strong>
            <span>{user?.role === 'DepartmentAdmin' ? 'Department Admin' : user?.role}</span>
          </div>
          <button className="ghost-button" type="button" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <Sprout size={20} />
            Civic operations workspace
          </div>
          <span className="status-pill">Eco mode active</span>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
