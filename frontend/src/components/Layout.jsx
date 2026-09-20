import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isApprover = ['Reporting Manager', 'Head of Department', 'Head of Division', 'MD'].includes(user.role);
  const isFinance = user.role === 'Finance';
  const isAdmin = user.role === 'Admin';
  const isEmployee = user.role === 'Employee';

  return (
    <>
      <nav className="nav">
        <strong>Nortex</strong>
        <NavLink to="/" end>Dashboard</NavLink>

        {isEmployee && (
          <NavLink to="/travel-requests/new">New Travel Request</NavLink>
        )}

        {isApprover && <NavLink to="/approvals">Approvals</NavLink>}
        {isFinance && <NavLink to="/finance">Finance</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}

        <span className="spacer" />
        <span className="muted" style={{ color: '#9ca3af' }}>
          {user.name} · {user.role}
        </span>
        <button className="secondary" onClick={handleLogout}>Logout</button>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </>
  );
}