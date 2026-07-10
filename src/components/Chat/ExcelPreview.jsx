import React, { useState, useRef } from "react";
import { FaCheck, FaRegCopy, FaRegEye } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ExcelPreview({ preview, fileUrl, fileName }) {
  const isTable = Array.isArray(preview);
  const tableRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const copyToExcel = async () => {
    try {
      if (!tableRef.current) return;

      const selection = window.getSelection();
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNode(tableRef.current);

      selection.addRange(range);

      document.execCommand("copy");

      selection.removeAllRanges();

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };
  console.log("Preview:", preview);
  console.log("First Row:", preview[0]);
  console.log("First Row Length:", preview[0]?.length);

  return (
    <>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#fff",
          width: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            fontWeight: 600,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderBottom: "1px solid #eee",
            background: "#fafafa",
          }}
        >
          📊 {fileName}
          <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
            <button
              onClick={() => setShowPreview(true)}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                cursor: "pointer",
                fontWeight: 600,
                borderRadius: "300px",
                marginRight: "8px",
              }}
            >
              <FaRegEye size={16} />
            </button>

            <button
              onClick={copyToExcel}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                cursor: "pointer",
                fontWeight: 600,
                borderRadius: "300px",
              }}
            >
              {copied ? <FaCheck /> : <FaRegCopy />}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            maxHeight: "420px",
            overflow: "auto",
            padding: "18px",
          }}
        >
          {isTable ? (
            <table
              ref={tableRef}
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{
                          border: "1px solid #ddd",
                          padding: "10px",
                          verticalAlign: "top",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                lineHeight: 1.8,
                fontSize: "15px",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1
                      style={{
                        fontSize: "28px",
                        marginBottom: "18px",
                        fontWeight: 700,
                      }}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2
                      style={{
                        fontSize: "22px",
                        marginTop: "20px",
                        marginBottom: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3
                      style={{
                        fontSize: "18px",
                        marginTop: "18px",
                        marginBottom: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p style={{ marginBottom: "12px" }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: "24px" }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: "24px" }}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: "6px" }}>{children}</li>
                  ),
                  table: ({ children }) => (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: "15px",
                      }}
                    >
                      {children}
                    </table>
                  ),
                  th: ({ children }) => (
                    <th
                      style={{
                        border: "1px solid #ddd",
                        background: "#f5f5f5",
                        padding: "10px",
                      }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {children}
                    </td>
                  ),
                }}
              >
                {preview || "No preview available."}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #eee",
            padding: "14px 18px",
            background: "#fafafa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            📥 Download Excel
          </a>
        </div>
      </div>

      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              height: "85vh",
              background: "#fff",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #ddd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 600,
                fontSize: "18px",
              }}
            >
              📊 {fileName}
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "20px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                            background: i === 0 ? "#f8fafc" : "#fff",
                            fontWeight: i === 0 ? 600 : 400,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
