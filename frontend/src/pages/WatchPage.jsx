import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch, streamUrl } from "../api";
import { useToast } from "../hooks/useToast";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function WatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/api/admin/media/${id}`)
      .then(data => { setItem(data); setDesc(data.description || ""); })
      .catch(err => { toast(err.message, "error"); navigate("/admin"); })
      .finally(() => setLoading(false));
  }, [id]);

  const saveDesc = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: desc }),
      });
      setItem(i => ({ ...i, description: desc }));
      setEditing(false);
      toast("Description saved!");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!confirm("Delete this file permanently?")) return;
    try {
      await apiFetch(`/api/admin/media/${id}`, { method: "DELETE" });
      toast("Deleted");
      navigate("/admin");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "6rem" }}>
      <span className="spinner" />
    </div>
  );

  if (!item) return null;

  const src = streamUrl(item.filename);
  const isVideo = item.type === "video";

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Back */}
      <Link to="/admin" style={{ color: "var(--text2)", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem", textDecoration: "none" }}>
        ← Back to Dashboard
      </Link>

      {/* Player / image */}
      <div style={{
        width: "100%",
        background: "#000",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        marginBottom: "1.5rem",
        border: "1px solid var(--border)",
      }}>
        {isVideo ? (
          <video
            src={src}
            controls
            style={{ width: "100%", display: "block", maxHeight: 520 }}
          />
        ) : (
          <img
            src={src}
            alt={item.original_name}
            style={{ width: "100%", display: "block", maxHeight: 600, objectFit: "contain" }}
          />
        )}
      </div>

      {/* Info */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span className={`tag tag-${item.type}`}>{item.type}</span>
              <span style={{ color: "var(--text2)", fontSize: "0.78rem" }}>{formatSize(item.size)}</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.3rem", wordBreak: "break-all" }}>
              {item.original_name}
            </h2>
            <div style={{ color: "var(--text2)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
              Uploaded {new Date(item.upload_date).toLocaleString()}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-danger btn-sm" onClick={deleteItem}>Delete</button>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: "1.2rem", borderTop: "1px solid var(--border)", paddingTop: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text2)" }}>Description</div>
            {!editing && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>

          {editing ? (
            <div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ marginBottom: "0.7rem" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-primary btn-sm" onClick={saveDesc} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "Save"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setDesc(item.description || ""); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: item.description ? "var(--text)" : "var(--text2)", fontSize: "0.9rem", fontStyle: item.description ? "normal" : "italic" }}>
              {item.description || "No description added."}
            </p>
          )}
        </div>
      </div>

      {/* Download link */}
      <div style={{ textAlign: "right" }}>
        <a href={src} download={item.original_name}>
          <button className="btn btn-ghost btn-sm">⬇ Download Original</button>
        </a>
      </div>
    </div>
  );
}
