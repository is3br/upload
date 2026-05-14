import { useState, useRef, useCallback } from "react";
import { API_BASE } from "../api";
import { useToast } from "../hooks/useToast";

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export default function UploadPage() {
  const toast = useToast();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);

  const pick = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { toast("File too large (max 200 MB)", "error"); return; }
    setFile(f);
    setDone(false);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);

  const submit = () => {
    if (!file) { toast("Please choose a file first", "error"); return; }
    setUploading(true);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    form.append("description", description.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        setDone(true);
        setFile(null);
        setDescription("");
        setProgress(0);
        toast("Uploaded successfully!");
      } else {
        try {
          const d = JSON.parse(xhr.responseText);
          toast(d.error || "Upload failed", "error");
        } catch { toast("Upload failed", "error"); }
      }
    };

    xhr.onerror = () => { setUploading(false); toast("Network error", "error"); };
    xhr.send(form);
  };

  const isVideo = file && file.type.startsWith("video");
  const isImage = file && file.type.startsWith("image");

  return (
    <div className="page-narrow" style={{ paddingTop: "3rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.4rem", marginBottom: "0.4rem" }}>
          Upload <span style={{ color: "var(--accent)" }}>Media</span>
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
          Videos & images up to 200 MB. Add a short description so it's easy to find.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="card"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && fileRef.current.click()}
        style={{
          border: `2px dashed ${drag ? "var(--accent)" : file ? "var(--accent2)" : "var(--border)"}`,
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          padding: "2.5rem 1.5rem",
          transition: "border-color 180ms",
          background: drag ? "#1a1a24" : "var(--bg2)",
          marginBottom: "1.2rem",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: "none" }}
          onChange={(e) => pick(e.target.files[0])}
        />

        {file ? (
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              {isVideo ? "🎬" : isImage ? "🖼️" : "📄"}
            </div>
            <div style={{ fontWeight: 700, marginBottom: "0.2rem", wordBreak: "break-all" }}>
              {file.name}
            </div>
            <div style={{ color: "var(--text2)", fontSize: "0.82rem" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
              {" · "}
              <span className={`tag tag-${isVideo ? "video" : "image"}`}>
                {isVideo ? "VIDEO" : "IMAGE"}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.6rem", opacity: 0.4 }}>⬆</div>
            <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>
              Drop file here or click to browse
            </div>
            <div style={{ color: "var(--text2)", fontSize: "0.82rem" }}>
              Videos & images · Max 200 MB
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text2)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Description / Tags
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description, tags, or notes… (used for search)"
          disabled={uploading}
          style={{ minHeight: "80px" }}
        />
      </div>

      {/* Progress */}
      {uploading && (
        <div style={{ marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text2)", marginBottom: "0.3rem" }}>
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {done && (
        <div style={{ padding: "0.8rem 1rem", background: "#0d2a1a", border: "1px solid var(--success)30", borderRadius: "var(--radius)", color: "var(--success)", fontSize: "0.88rem", marginBottom: "1.2rem", fontWeight: 700 }}>
          ✓ Upload complete! Thank you.
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={uploading || !file}
        style={{ width: "100%" }}
      >
        {uploading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : "Upload File"}
      </button>
    </div>
  );
}
