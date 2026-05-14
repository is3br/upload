import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFetch, streamUrl } from "../api";
import { useToast } from "../hooks/useToast";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function MediaCard({ item, onDelete, onEdit }) {
  const isVideo = item.type === "video";
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    if (isVideo) return;
    setThumb(streamUrl(item.filename));
  }, [item.filename, isVideo]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Thumbnail / preview area */}
      <div style={{
        width: "100%", height: 160,
        background: "var(--bg3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        borderBottom: "1px solid var(--border)",
      }}>
        {isVideo ? (
          <div style={{ textAlign: "center", color: "var(--text2)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.3rem" }}>▶</div>
            <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Video</div>
          </div>
        ) : thumb ? (
          <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>🖼️</div>
        )}
        <span className={`tag tag-${item.type}`} style={{ position: "absolute", top: 8, right: 8 }}>
          {item.type}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, wordBreak: "break-all", color: "var(--text)" }}>
          {item.original_name}
        </div>
        {item.description && (
          <div style={{ fontSize: "0.78rem", color: "var(--text2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.description}
          </div>
        )}
        <div style={{ fontSize: "0.72rem", color: "var(--text2)", marginTop: "auto", paddingTop: "0.5rem" }}>
          {formatSize(item.size)} · {formatDate(item.upload_date)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem" }}>
        <Link to={`/admin/watch/${item.id}`} style={{ flex: 1 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}>View</button>
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>✕</button>
      </div>
    </div>
  );
}

function EditModal({ item, onClose, onSaved }) {
  const [desc, setDesc] = useState(item.description || "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: desc }),
      });
      toast("Description updated!");
      onSaved(item.id, desc);
      onClose();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Description</div>
        <div style={{ fontSize: "0.82rem", color: "var(--text2)", marginBottom: "1rem", wordBreak: "break-all" }}>
          {item.original_name}
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ marginBottom: "1rem" }} />
        <div style={{ display: "flex", gap: "0.7rem", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const searchRef = useRef();
  const debounceRef = useRef();

  const load = useCallback(async (q, p) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/media?q=${encodeURIComponent(q)}&page=${p}&limit=18`);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(query, page);
  }, [page]);

  const onSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); load(q, 1); }, 350);
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this file permanently?")) return;
    try {
      await apiFetch(`/api/admin/media/${id}`, { method: "DELETE" });
      toast("Deleted");
      setItems(prev => prev.filter(i => i.id !== id));
      setTotal(t => t - 1);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const onSaved = (id, desc) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, description: desc } : i));
  };

  return (
    <div className="page">
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} onSaved={onSaved} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.2rem" }}>
            Vault <span style={{ color: "var(--accent)" }}>Dashboard</span>
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.85rem" }}>{total} file{total !== 1 ? "s" : ""} stored</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.8rem", position: "relative" }}>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by filename or description…"
          value={query}
          onChange={onSearch}
          style={{ paddingLeft: "2.6rem" }}
        />
        <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text2)", fontSize: "1rem" }}>⌕</span>
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text2)" }}>
          <span className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text2)" }}>
          {query ? "No results found." : "No media uploaded yet."}
        </div>
      ) : (
        <>
          <div className="media-grid">
            {items.map(item => (
              <MediaCard key={item.id} item={item} onDelete={deleteItem} onEdit={setEditItem} />
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "2rem", alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ color: "var(--text2)", fontSize: "0.85rem", padding: "0 0.5rem" }}>
                {page} / {pages}
              </span>
              <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
