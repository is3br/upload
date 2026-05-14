import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Nav() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        Media<span>Vault</span>
      </Link>
      <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
        {isAdmin ? (
          <>
            {loc.pathname !== "/admin" && (
              <Link to="/admin">
                <button className="btn btn-ghost btn-sm">Dashboard</button>
              </Link>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          loc.pathname !== "/login" && (
            <Link to="/login">
              <button className="btn btn-ghost btn-sm">Admin</button>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
