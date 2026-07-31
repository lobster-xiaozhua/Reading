import { useState, useCallback } from "react";
import "../styles/_import-dropzone.css";

export default function ImportDropZone({ onFiles, busy }) {
  const [dragOver, setDragOver] = useState(false);

  const extractFiles = useCallback(async (items) => {
    const hasZip = items.some((item) => item.name.endsWith(".zip"));
    if (hasZip) {
      const JSZip = (await import("jszip")).default;
      const result = [];
      for (const item of items) {
        if (item.name.endsWith(".zip")) {
          const zip = await JSZip.loadAsync(item);
          zip.forEach((path, file) => {
            if (!file.dir && path.endsWith(".txt")) {
              result.push({ name: path, file: file.async("blob").then((b) => new File([b], path)) });
            }
          });
        } else if (item.name.endsWith(".txt")) {
          result.push(item);
        }
      }
      const resolved = await Promise.all(result.map(async (r) => ({ name: r.name, file: await r.file })));
      onFiles(resolved);
      return;
    }
    onFiles(items.filter((item) => item.name.endsWith(".txt")));
  }, [onFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) extractFiles(files);
  }, [extractFiles]);

  const handleChange = useCallback((e) => {
    const files = [...e.target.files];
    if (files.length) extractFiles(files);
    e.target.value = "";
  }, [extractFiles]);

  return (
    <div
      className={`import-dropzone ${dragOver ? "drag-over" : ""} ${busy ? "disabled" : ""}`}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={() => setDragOver(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById("import-file-input")?.click()}
    >
      <input
        id="import-file-input"
        type="file"
        accept=".txt,.zip"
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <div className="import-dropzone-icon">📂</div>
      <p className="import-dropzone-text">
        {dragOver ? "松开以上传" : "拖拽 .txt 或 .zip 文件到此处，或点击选择"}
      </p>
      <p className="import-dropzone-hint">支持批量导入，zip 内自动解压 .txt 文件</p>
    </div>
  );
}