import React, { useState, useRef } from "react";
import { FaRegCopy, FaCheck, FaDownload, FaRegEye } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PDFPreview({ fileUrl, fileName, content }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const tableRef = useRef(null);

  const copyContent = async () => {
    try {
      if (tableRef.current) {
        const html = tableRef.current.innerHTML;
        const text = tableRef.current.innerText;

        if (navigator.clipboard && window.ClipboardItem) {
          const blobHtml = new Blob([html], {
            type: "text/html",
          });

          const blobText = new Blob([text], {
            type: "text/plain",
          });

          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": blobHtml,
              "text/plain": blobText,
            }),
          ]);
        } else {
          const selection = window.getSelection();
          selection.removeAllRanges();

          const range = document.createRange();
          range.selectNode(tableRef.current);

          selection.addRange(range);
          document.execCommand("copy");
          selection.removeAllRanges();
        }

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          width: "100%",
        }}
      >
        {/* Header */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
            borderBottom: "1px solid #eee",
            background: "#fafafa",
          }}
        >
          <strong>📄 {fileName}</strong>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={() => setShowPreview(true)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                background: "#fff",
                marginRight: "8px",
              }}
            >
              <FaRegEye />
            </button>

            <button
              onClick={copyContent}
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                background: copied ? "transparent" : "#fff",
                marginRight: "8px",
              }}
            >
              {copied ? <FaCheck /> : <FaRegCopy />}
            </button>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                color: "#2563eb",
                textDecoration: "none",
              }}
            >
              <FaDownload />
            </a>
          </div>
        </div>

        {/* Markdown Preview */}

        <div
          ref={tableRef}
          style={{
            padding: 20,
            overflowX: "auto",
            maxHeight: 550,
            overflowY: "auto",
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1
                  style={{
                    fontSize: 28,
                    marginBottom: 20,
                  }}
                >
                  {children}
                </h1>
              ),

              h2: ({ children }) => (
                <h2
                  style={{
                    fontSize: 22,
                    marginBottom: 16,
                  }}
                >
                  {children}
                </h2>
              ),

              p: ({ children }) => (
                <p
                  style={{
                    marginBottom: 12,
                    lineHeight: 1.7,
                  }}
                >
                  {children}
                </p>
              ),

              table: ({ children }) => (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 20,
                  }}
                >
                  {children}
                </table>
              ),

              thead: ({ children }) => (
                <thead
                  style={{
                    background: "#f5f5f5",
                  }}
                >
                  {children}
                </thead>
              ),

              tr: ({ children }) => <tr>{children}</tr>,

              th: ({ children }) => (
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                  }}
                >
                  {children}
                </th>
              ),

              td: ({ children }) => (
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: 10,
                    verticalAlign: "top",
                  }}
                >
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* PDF Modal */}

      {/* Preview Modal */}

      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.65)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "92%",
              height: "90%",
              background: "#fff",
              borderRadius: 12,
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
                fontSize: 18,
              }}
            >
              📄 {fileName}
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 24,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 25,
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                      }}
                    >
                      {children}
                    </table>
                  ),

                  thead: ({ children }) => (
                    <thead
                      style={{
                        background: "#f3f4f6",
                      }}
                    >
                      {children}
                    </thead>
                  ),

                  tr: ({ children }) => <tr>{children}</tr>,

                  th: ({ children }) => (
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: 12,
                        textAlign: "left",
                        fontWeight: 700,
                      }}
                    >
                      {children}
                    </th>
                  ),

                  td: ({ children }) => (
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: 12,
                        verticalAlign: "top",
                      }}
                    >
                      {children}
                    </td>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
