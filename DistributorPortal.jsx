import { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = "http://localhost:5000/api";

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────
const api = {
  getToken: () => localStorage.getItem("dp_token"),

  headers: (isForm = false) => {
    const h = { Authorization: `Bearer ${api.getToken()}` };
    if (!isForm) h["Content-Type"] = "application/json";
    return h;
  },

  get: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: api.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  },

  post: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: api.headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  },

  put: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: api.headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  },

  del: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: api.headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  },

  upload: async (path, formData) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${api.getToken()}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  },

  downloadExport: async (path, filename) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: api.headers() });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
const ToastContext = createContext(null);
const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: t.type === "error" ? "#c0392b" : t.type === "warn" ? "#d68910" : "#1a6b3c",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            animation: "slideIn 0.3s ease",
            maxWidth: 360,
          }}>
            {t.type === "error" ? "✗ " : t.type === "warn" ? "⚠ " : "✓ "}{t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const G = {
  // Colors
  bg: "#0d0d1a",
  bgCard: "#13132b",
  bgHover: "#1c1c38",
  border: "#2a2a50",
  accent: "#e8c547",
  accentDim: "rgba(232,197,71,0.12)",
  text: "#eef0f8",
  textMuted: "#7b7ea8",
  textSub: "#a0a3c4",
  success: "#3bc47a",
  danger: "#e05555",
  info: "#4a9eff",
  // Common styles
  card: { background: "#13132b", border: "1px solid #2a2a50", borderRadius: 14, padding: 24 },
  input: {
    background: "#0d0d1a",
    border: "1px solid #2a2a50",
    borderRadius: 8,
    color: "#eef0f8",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  },
  btn: {
    background: "#e8c547",
    color: "#0d0d1a",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.3,
    transition: "opacity 0.2s",
  },
  btnGhost: {
    background: "transparent",
    color: "#e8c547",
    border: "1px solid rgba(232,197,71,0.4)",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  btnDanger: {
    background: "transparent",
    color: "#e05555",
    border: "1px solid rgba(224,85,85,0.4)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      localStorage.setItem("dp_token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: G.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Background pattern */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "radial-gradient(circle at 25px 25px, #e8c547 1px, transparent 0)",
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #e8c547 0%, #b8962a 100%)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 16, boxShadow: "0 8px 32px rgba(232,197,71,0.3)",
          }}>📊</div>
          <h1 style={{ color: G.text, margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            Distributor Portal
          </h1>
          <p style={{ color: G.textMuted, margin: 0, fontSize: 14 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...G.card, padding: 32 }}>
          {error && (
            <div style={{
              background: "rgba(224,85,85,0.12)", border: "1px solid rgba(224,85,85,0.3)",
              borderRadius: 8, padding: "12px 16px", marginBottom: 20,
              color: "#e05555", fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={G.input}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={G.input}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...G.btn, width: "100%", padding: "13px", fontSize: 15, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: G.textMuted, fontSize: 12, marginTop: 20 }}>
          No self-registration. Contact your admin to get access.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ user, currentPage, onNavigate, onLogout }) {
  const isAdmin = user.role === "admin";
  const adminLinks = [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "distributors", icon: "👥", label: "Distributors" },
    { key: "reports", icon: "📋", label: "All Reports" },
  ];
  const distLinks = [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "myreports", icon: "📋", label: "My Reports" },
    { key: "upload", icon: "⬆️", label: "Upload Report" },
  ];
  const links = isAdmin ? adminLinks : distLinks;

  return (
    <div style={{
      width: 240, minHeight: "100vh",
      background: G.bgCard,
      borderRight: `1px solid ${G.border}`,
      display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "24px 20px", borderBottom: `1px solid ${G.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #e8c547 0%, #b8962a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>📊</div>
          <div>
            <div style={{ color: G.text, fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>Distributor</div>
            <div style={{ color: G.accent, fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Portal</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}` }}>
        <div style={{
          background: G.accentDim, borderRadius: 10, padding: "12px 14px",
          border: `1px solid rgba(232,197,71,0.15)`,
        }}>
          <div style={{ color: G.text, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{user.name}</div>
          <div style={{
            display: "inline-block",
            background: isAdmin ? "rgba(74,158,255,0.15)" : "rgba(59,196,122,0.15)",
            color: isAdmin ? G.info : G.success,
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            {isAdmin ? "Admin" : "Distributor"}
          </div>
          {user.company && <div style={{ color: G.textMuted, fontSize: 12, marginTop: 4 }}>{user.company}</div>}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {links.map((l) => (
          <button
            key={l.key}
            onClick={() => onNavigate(l.key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", borderRadius: 9,
              border: "none", cursor: "pointer", textAlign: "left",
              fontSize: 14, fontWeight: currentPage === l.key ? 700 : 500,
              fontFamily: "'DM Sans', sans-serif",
              background: currentPage === l.key ? G.accentDim : "transparent",
              color: currentPage === l.key ? G.accent : G.textSub,
              transition: "all 0.15s",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 16 }}>{l.icon}</span>
            {l.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 12px", borderTop: `1px solid ${G.border}` }}>
        <button onClick={onNavigate.bind(null, "settings")} style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px", borderRadius: 9,
          border: "none", cursor: "pointer", textAlign: "left",
          fontSize: 14, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          background: currentPage === "settings" ? G.accentDim : "transparent",
          color: currentPage === "settings" ? G.accent : G.textSub,
          marginBottom: 4,
        }}>
          ⚙️ Settings
        </button>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px", borderRadius: 9,
          border: "none", cursor: "pointer", textAlign: "left",
          fontSize: 14, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          background: "transparent",
          color: G.textMuted,
          transition: "all 0.15s",
        }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ icon, label, value, color = G.accent, sub }) {
  return (
    <div style={{ ...G.card, display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: `rgba(${color === G.accent ? "232,197,71" : color === G.success ? "59,196,122" : color === G.info ? "74,158,255" : "224,85,85"},0.12)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
        <div style={{ color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ color: G.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ distributors: 0, reports: 0, pending: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/distributors"), api.get("/reports")])
      .then(([dRes, rRes]) => {
        const reports = rRes.reports || [];
        setStats({
          distributors: (dRes.distributors || []).length,
          reports: reports.length,
          pending: reports.filter((r) => r.status === "pending").length,
          recent: reports.slice(0, 5),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your distributor network" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard icon="👥" label="Distributors" value={stats.distributors} />
        <StatCard icon="📋" label="Total Reports" value={stats.reports} color={G.info} />
        <StatCard icon="⏳" label="Pending Review" value={stats.pending} color={G.danger} />
        <StatCard icon="✅" label="Reviewed" value={stats.reports - stats.pending} color={G.success} />
      </div>

      <div style={G.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: G.text, margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Reports</h3>
          <button onClick={() => onNavigate("reports")} style={{ ...G.btnGhost, padding: "6px 14px", fontSize: 13 }}>View All</button>
        </div>
        {stats.recent.length === 0 ? (
          <EmptyState message="No reports uploaded yet" />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Distributor","Report","Period","Rows","Status","Date"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${G.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((r) => (
                <tr key={r._id} style={{ borderBottom: `1px solid ${G.border}` }}>
                  <td style={{ padding: "12px", color: G.text, fontSize: 14 }}>{r.distributor?.name}</td>
                  <td style={{ padding: "12px", color: G.text, fontSize: 14, fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{MONTH_NAMES[r.month - 1]} {r.year}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{r.rowCount}</td>
                  <td style={{ padding: "12px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "12px", color: G.textMuted, fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISTRIBUTOR DASHBOARD
// ─────────────────────────────────────────────
function DistributorDashboard({ user, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports").then((d) => setReports(d.reports || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Manage and upload your monthly reports" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard icon="📋" label="Total Reports" value={reports.length} />
        <StatCard icon="⏳" label="Pending Review" value={reports.filter((r) => r.status === "pending").length} color={G.danger} />
        <StatCard icon="✅" label="Approved" value={reports.filter((r) => r.status === "approved").length} color={G.success} />
      </div>

      <div style={G.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: G.text, margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Uploads</h3>
          <button onClick={() => onNavigate("upload")} style={{ ...G.btn, padding: "8px 18px", fontSize: 13 }}>+ Upload Report</button>
        </div>
        {reports.length === 0 ? (
          <EmptyState message="No reports uploaded yet" action={{ label: "Upload First Report", onClick: () => onNavigate("upload") }} />
        ) : (
          <ReportListTable reports={reports.slice(0, 5)} onView={(id) => onNavigate("viewreport", id)} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISTRIBUTORS PAGE (Admin)
// ─────────────────────────────────────────────
function DistributorsPage() {
  const toast = useToast();
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", company: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const load = () => {
    api.get("/distributors")
      .then((d) => setDistributors(d.distributors || []))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/distributors", formData);
      toast(`Distributor ${res.distributor.name} created!`);
      if (!res.emailSent && res.tempPassword) {
        setCreatedCreds({ email: res.distributor.email, password: res.tempPassword });
      }
      setFormData({ name: "", email: "", company: "", phone: "" });
      setShowForm(false);
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (d) => {
    try {
      await api.put(`/distributors/${d._id}`, { ...d, isActive: !d.isActive });
      toast(`Account ${!d.isActive ? "activated" : "deactivated"}`);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete distributor "${name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/distributors/${id}`);
      toast("Distributor deleted");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const res = await api.post(`/distributors/${id}/reset-password`, {});
      if (!res.emailSent && res.tempPassword) {
        setCreatedCreds({ email: "", password: res.tempPassword, note: "Password reset" });
      } else {
        toast("Password reset and sent via email");
      }
    } catch (err) {
      toast(err.message, "error");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Distributors" subtitle={`${distributors.length} distributor accounts`}>
        <button onClick={() => setShowForm(true)} style={G.btn}>+ New Distributor</button>
      </PageHeader>

      {/* Credential display modal */}
      {createdCreds && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ ...G.card, maxWidth: 440, width: "90%", padding: 32 }}>
            <h3 style={{ color: G.text, margin: "0 0 8px" }}>⚠️ Email Not Sent</h3>
            <p style={{ color: G.textSub, fontSize: 14, margin: "0 0 20px" }}>
              {createdCreds.note || "Account created but email delivery failed. Share these credentials manually:"}
            </p>
            {createdCreds.email && <div style={{ color: G.textSub, marginBottom: 8 }}>Email: <strong style={{ color: G.text }}>{createdCreds.email}</strong></div>}
            <div style={{ color: G.textSub, marginBottom: 20 }}>Password: <span style={{ fontFamily: "monospace", background: G.bg, padding: "4px 10px", borderRadius: 6, color: G.accent, fontSize: 15 }}>{createdCreds.password}</span></div>
            <button onClick={() => setCreatedCreds(null)} style={G.btn}>Done</button>
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ ...G.card, maxWidth: 480, width: "90%", padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ color: G.text, margin: 0 }}>Create Distributor</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: G.textMuted, cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <FormField label="Full Name *" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="John Doe" required />
              <FormField label="Email Address *" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="john@company.com" required />
              <FormField label="Company" value={formData.company} onChange={(v) => setFormData({ ...formData, company: v })} placeholder="Company name" />
              <FormField label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="+1 234 567 8900" />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                <button type="button" onClick={() => setShowForm(false)} style={G.btnGhost}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...G.btn, opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? "Creating…" : "Create & Send Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {distributors.length === 0 ? (
        <EmptyState message="No distributors yet" action={{ label: "Create First Distributor", onClick: () => setShowForm(true) }} />
      ) : (
        <div style={G.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name","Email","Company","Phone","Status","Joined","Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${G.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d._id} style={{ borderBottom: `1px solid ${G.border}` }}>
                  <td style={{ padding: "12px", color: G.text, fontWeight: 600, fontSize: 14 }}>{d.name}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{d.email}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{d.company || "—"}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{d.phone || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: d.isActive ? "rgba(59,196,122,0.12)" : "rgba(224,85,85,0.12)",
                      color: d.isActive ? G.success : G.danger,
                    }}>{d.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={{ padding: "12px", color: G.textMuted, fontSize: 13 }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleToggleActive(d)} style={{ ...G.btnGhost, padding: "5px 12px", fontSize: 12 }}>
                        {d.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleResetPassword(d._id)} style={{ background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.3)", color: G.info, borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        Reset PW
                      </button>
                      <button onClick={() => handleDelete(d._id, d.name)} style={{ ...G.btnDanger, padding: "5px 10px", fontSize: 12 }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS PAGE
// ─────────────────────────────────────────────
function ReportsPage({ currentUser, onViewReport }) {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: "", status: "", distributor: "" });

  const load = () => {
    api.get("/reports")
      .then((d) => setReports(d.reports || []))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = reports.filter((r) => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.distributor?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.del(`/reports/${id}`);
      toast("Report deleted");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleExport = async (r) => {
    try {
      await api.downloadExport(`/reports/${r._id}/export`, `${r.title}_${MONTH_NAMES[r.month-1]}_${r.year}.xlsx`);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={currentUser.role === "admin" ? "All Reports" : "My Reports"} subtitle={`${reports.length} total reports`} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Search by title or distributor..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{ ...G.input, maxWidth: 320 }}
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          style={{ ...G.input, maxWidth: 160 }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No reports found" />
      ) : (
        <div style={G.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  currentUser.role === "admin" && "Distributor",
                  "Title","Period","Rows","Status","Uploaded","Actions"
                ].filter(Boolean).map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${G.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} style={{ borderBottom: `1px solid ${G.border}` }}>
                  {currentUser.role === "admin" && <td style={{ padding: "12px", color: G.text, fontSize: 14, fontWeight: 600 }}>{r.distributor?.name}</td>}
                  <td style={{ padding: "12px", color: G.text, fontSize: 14, fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{MONTH_NAMES[r.month-1]} {r.year}</td>
                  <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{r.rowCount}</td>
                  <td style={{ padding: "12px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "12px", color: G.textMuted, fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => onViewReport(r._id)} style={{ ...G.btn, padding: "5px 12px", fontSize: 12 }}>View</button>
                      <button onClick={() => handleExport(r)} style={{ ...G.btnGhost, padding: "5px 12px", fontSize: 12 }}>Export</button>
                      <button onClick={() => handleDelete(r._id)} style={{ ...G.btnDanger, padding: "5px 10px", fontSize: 12 }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// UPLOAD PAGE
// ─────────────────────────────────────────────
function UploadPage({ onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast("Please select an Excel file", "error");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title);
      fd.append("month", form.month);
      fd.append("year", form.year);
      const res = await api.upload("/reports/upload", fd);
      toast("Report uploaded successfully!");
      onSuccess(res.report._id);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Upload Report" subtitle="Upload your monthly Excel report" />
      <div style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit} style={G.card}>
          <FormField
            label="Report Title *"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="e.g. Sales Report Q1"
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Month *</label>
              <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} style={G.input} required>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Year *</label>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} style={G.input} required>
                {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Drop zone */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Excel File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? G.accent : G.border}`,
                borderRadius: 10, padding: "32px 20px", textAlign: "center",
                cursor: "pointer", transition: "all 0.2s",
                background: file ? G.accentDim : "transparent",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? "📄" : "📂"}</div>
              <div style={{ color: file ? G.accent : G.textMuted, fontSize: 14, fontWeight: 600 }}>
                {file ? file.name : "Click to select or drag & drop"}
              </div>
              {!file && <div style={{ color: G.textMuted, fontSize: 12, marginTop: 4 }}>Supports .xlsx, .xls, .csv — max 10MB</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file && (
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setFile(null)} style={{ ...G.btnDanger, padding: "4px 10px", fontSize: 12 }}>Remove</button>
              </div>
            )}
          </div>

          <button type="submit" disabled={uploading} style={{ ...G.btn, width: "100%", padding: "13px", fontSize: 15, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "Upload Report"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORT VIEWER (editable table)
// ─────────────────────────────────────────────
function ReportViewer({ reportId, currentUser, onBack }) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [editedData, setEditedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    api.get(`/reports/${reportId}`)
      .then((d) => {
        setReport(d.report);
        setEditedData(JSON.parse(JSON.stringify(d.report.data || [])));
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleCellEdit = (rowIdx, header, value) => {
    const updated = editedData.map((row, i) =>
      i === rowIdx ? { ...row, [header]: value } : row
    );
    setEditedData(updated);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/reports/${reportId}`, { data: editedData });
      setReport(res.report);
      setDirty(false);
      toast("Changes saved!");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = () => {
    const newRow = { _rowId: editedData.length };
    report.headers.forEach((h) => (newRow[h] = ""));
    setEditedData([...editedData, newRow]);
    setDirty(true);
  };

  const handleDeleteRow = (idx) => {
    setEditedData(editedData.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleExport = async () => {
    try {
      await api.downloadExport(`/reports/${reportId}/export`, `${report.title}_${MONTH_NAMES[report.month-1]}_${report.year}.xlsx`);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleStatusChange = async (status) => {
    setStatusUpdating(true);
    try {
      const res = await api.put(`/reports/${reportId}`, { status });
      setReport(res.report);
      toast(`Status set to ${status}`);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!report) return <EmptyState message="Report not found" />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
        <button onClick={onBack} style={{ ...G.btnGhost, padding: "6px 14px", fontSize: 13 }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: G.text, margin: 0, fontSize: 22, fontWeight: 800 }}>{report.title}</h2>
          <div style={{ color: G.textMuted, fontSize: 14, marginTop: 2 }}>
            {report.distributor?.name} · {MONTH_NAMES[report.month - 1]} {report.year} · {editedData.length} rows
          </div>
        </div>
        <StatusBadge status={report.status} />
        {currentUser.role === "admin" && (
          <select
            value={report.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusUpdating}
            style={{ ...G.input, maxWidth: 140, padding: "7px 12px" }}
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
        )}
        <button onClick={handleExport} style={{ ...G.btnGhost, padding: "8px 16px", fontSize: 13 }}>⬇ Export</button>
        {dirty && (
          <button onClick={handleSave} disabled={saving} style={{ ...G.btn, padding: "8px 18px", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      {dirty && (
        <div style={{ background: "rgba(232,197,71,0.08)", border: `1px solid rgba(232,197,71,0.2)`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: G.accent, fontSize: 13 }}>
          You have unsaved changes. Click "Save Changes" to persist them.
        </div>
      )}

      {/* Editable Table */}
      <div style={{ ...G.card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr style={{ background: G.bg }}>
                <th style={{ padding: "10px 8px", color: G.textMuted, fontSize: 11, fontWeight: 600, textAlign: "center", borderBottom: `1px solid ${G.border}`, width: 40 }}>#</th>
                {report.headers.map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${G.border}`, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
                <th style={{ padding: "10px 8px", width: 40, borderBottom: `1px solid ${G.border}` }} />
              </tr>
            </thead>
            <tbody>
              {editedData.map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: `1px solid ${G.border}` }}>
                  <td style={{ padding: "6px 8px", color: G.textMuted, fontSize: 12, textAlign: "center" }}>{rowIdx + 1}</td>
                  {report.headers.map((h) => (
                    <td key={h} style={{ padding: "4px 6px" }}>
                      <input
                        value={row[h] !== undefined ? String(row[h]) : ""}
                        onChange={(e) => handleCellEdit(rowIdx, h, e.target.value)}
                        style={{
                          background: "transparent", border: "1px solid transparent",
                          borderRadius: 5, color: G.text, padding: "5px 8px",
                          fontSize: 13, width: "100%", minWidth: 80,
                          fontFamily: "'DM Sans', sans-serif",
                          outline: "none", transition: "border 0.15s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = G.border}
                        onBlur={(e) => e.target.style.borderColor = "transparent"}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "4px 6px", textAlign: "center" }}>
                    <button onClick={() => handleDeleteRow(rowIdx)} style={{ background: "none", border: "none", color: G.textMuted, cursor: "pointer", fontSize: 14, padding: "4px 6px" }} title="Delete row">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${G.border}` }}>
          <button onClick={handleAddRow} style={{ ...G.btnGhost, padding: "7px 16px", fontSize: 13 }}>+ Add Row</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
function SettingsPage({ user }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast("Passwords don't match", "error");
    if (form.newPassword.length < 6) return toast("Password must be at least 6 characters", "error");
    setLoading(true);
    try {
      await api.put("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast("Password changed successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account settings" />
      <div style={{ maxWidth: 480 }}>
        <div style={{ ...G.card, marginBottom: 20 }}>
          <h3 style={{ color: G.text, margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Account Info</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {[["Name", user.name], ["Email", user.email], ["Role", user.role], user.company && ["Company", user.company]].filter(Boolean).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: G.textMuted, fontSize: 14, width: 100 }}>{k}</span>
                <span style={{ color: G.text, fontSize: 14, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={G.card}>
          <h3 style={{ color: G.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Change Password</h3>
          <FormField label="Current Password" type="password" value={form.currentPassword} onChange={(v) => setForm({ ...form, currentPassword: v })} placeholder="••••••••" required />
          <FormField label="New Password" type="password" value={form.newPassword} onChange={(v) => setForm({ ...form, newPassword: v })} placeholder="Min. 6 characters" required />
          <FormField label="Confirm New Password" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} placeholder="Repeat new password" required />
          <button type="submit" disabled={loading} style={{ ...G.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────
function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h2 style={{ color: G.text, margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{title}</h2>
        {subtitle && <p style={{ color: G.textMuted, margin: 0, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 10 }}>{children}</div>}
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", color: G.textSub, fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={G.input}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: "rgba(224,85,85,0.12)", color: "#e05555", label: "Pending" },
    reviewed: { bg: "rgba(74,158,255,0.12)", color: "#4a9eff", label: "Reviewed" },
    approved: { bg: "rgba(59,196,122,0.12)", color: "#3bc47a", label: "Approved" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function ReportListTable({ reports, onView }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Title","Period","Rows","Status","Date"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: G.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${G.border}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {reports.map((r) => (
          <tr key={r._id} onClick={() => onView(r._id)} style={{ borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}>
            <td style={{ padding: "12px", color: G.text, fontWeight: 600, fontSize: 14 }}>{r.title}</td>
            <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{MONTH_NAMES[r.month-1]} {r.year}</td>
            <td style={{ padding: "12px", color: G.textSub, fontSize: 14 }}>{r.rowCount}</td>
            <td style={{ padding: "12px" }}><StatusBadge status={r.status} /></td>
            <td style={{ padding: "12px", color: G.textMuted, fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `3px solid ${G.border}`,
        borderTopColor: G.accent,
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

function EmptyState({ message, action }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📭</div>
      <div style={{ color: G.textMuted, fontSize: 15, marginBottom: action ? 20 : 0 }}>{message}</div>
      {action && <button onClick={action.onClick} style={G.btn}>{action.label}</button>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [viewingReport, setViewingReport] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("dp_token");
    if (token) {
      api.get("/auth/me")
        .then((d) => setUser(d.user))
        .catch(() => localStorage.removeItem("dp_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("dp_token");
    setUser(null);
  };

  const handleNavigate = (p, id = null) => {
    setPage(p);
    if (id) setViewingReport(id);
  };

  const handleViewReport = (id) => {
    setViewingReport(id);
    setPage("viewreport");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const isAdmin = user.role === "admin";

  const renderPage = () => {
    if (page === "viewreport" && viewingReport) {
      return (
        <ReportViewer
          reportId={viewingReport}
          currentUser={user}
          onBack={() => setPage(isAdmin ? "reports" : "myreports")}
        />
      );
    }
    switch (page) {
      case "dashboard":
        return isAdmin
          ? <AdminDashboard onNavigate={handleNavigate} />
          : <DistributorDashboard user={user} onNavigate={handleNavigate} />;
      case "distributors":
        return isAdmin ? <DistributorsPage /> : null;
      case "reports":
      case "myreports":
        return <ReportsPage currentUser={user} onViewReport={handleViewReport} />;
      case "upload":
        return !isAdmin ? <UploadPage onSuccess={(id) => handleViewReport(id)} /> : null;
      case "settings":
        return <SettingsPage user={user} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: G.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar user={user} currentPage={page} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main style={{ flex: 1, padding: "32px", overflowY: "auto", maxWidth: "100%" }}>
        {renderPage()}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function Root() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d0d1a; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a50; border-radius: 3px; }
        input, select, textarea { box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: rgba(232,197,71,0.5) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      <ToastProvider>
        <App />
      </ToastProvider>
    </>
  );
}
