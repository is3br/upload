import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (isAdmin) { navigate("/admin", { replace: true }); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.token);
      toast("Welcome back!");
      navigate("/admin");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.8rem", marginBottom: "0.4rem" }}>
          Admin <span style={{ color: "var(--accent)" }}>Access</span>
        </h2>
        <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: "1.8rem" }}>
          Enter your password to access the vault dashboard.
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Enter Vault"}
          </button>
        </form>
      </div>
    </div>
  );
}
