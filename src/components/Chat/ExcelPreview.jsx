import React, { useState, useEffect, useRef } from "react";
import { FaCheck, FaRegCopy, FaRegEye } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Spreadsheet from "react-spreadsheet";
import * as XLSX from "xlsx";

export default function ExcelPreview({ preview, fileUrl, fileName }) {
  const isTable = Array.isArray(preview);
  const tableRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sheetData, setSheetData] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const headings = [];
  const tableRows = [];

  if (Array.isArray(preview)) {
    preview.forEach((row) => {
      if (!Array.isArray(row)) return;

      if (row.length === 1 && row[0].startsWith("#")) {
        headings.push(row[0]);
      } else if (row.length > 1) {
        tableRows.push(row);
      }
    });
  }

  const copyToExcel = async () => {
    if (!Array.isArray(preview)) return;

    // Skip heading rows if they only contain one cell
    const rows = preview.filter((row) => row.length > 1);

    const html = `
    <table border="1">
      ${rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${String(cell)}</td>`)
              .join("")}</tr>`,
        )
        .join("")}
    </table>
  `;

    const text = rows.map((row) => row.join("\t")).join("\n");

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!fileUrl) return;

    const loadExcel = async () => {
      try {
        setLoadingSheet(true);

        const response = await fetch(fileUrl);

        const buffer = await response.arrayBuffer();

        const workbook = XLSX.read(buffer, {
          type: "array",
        });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: true,
        });

        const data = rows.map((row) =>
          row.map((cell) => ({
            value: cell ?? "",
          })),
        );

        setSheetData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSheet(false);
      }
    };

    loadExcel();
  }, [fileUrl]);

  return (
    <>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#fff",
          width: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #eee",
            background: "#fafafa",
          }}
        >
          <strong>📊 {fileName}</strong>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={() => setShowPreview(true)}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: 999,
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <FaRegEye />
            </button>

            <button
              onClick={copyToExcel}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: 999,
                cursor: "pointer",
                background: "#fff",
                marginLeft: "8px",
              }}
            >
              {copied ? <FaCheck /> : <FaRegCopy />}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          ref={tableRef}
          style={{
            maxHeight: "100%",
            overflow: "auto",
            background: "#fff",
          }}
        >
          {Array.isArray(preview) ? (
            (() => {
              const maxCols = Math.max(
                ...preview.map((r) => (Array.isArray(r) ? r.length : 0)),
                8,
              );

              const letters = Array.from({ length: maxCols }, (_, i) =>
                String.fromCharCode(65 + i),
              );

              return (
                <table
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "Calibri, Arial",
                    fontSize: 15,
                    minWidth: "100%",
                  }}
                >
                  {/* Excel Column Header */}
                  <thead>
                    <tr>
                      <th
                        style={{
                          minWidth: 40,
                          background: "#f3f3f3",
                          border: "1px solid #d9d9d9",
                        }}
                      />
                      {letters.map((letter) => (
                        <th
                          key={letter}
                          style={{
                            background: "#f3f3f3",
                            border: "1px solid #d9d9d9",
                            minWidth: 120,
                            height: 32,
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          {letter}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {/* Row Number */}
                        <td
                          style={{
                            background: "#f3f3f3",
                            border: "1px solid #d9d9d9",
                            textAlign: "center",
                            width: 45,
                            fontWeight: 600,
                          }}
                        >
                          {rowIndex + 1}
                        </td>

                        {Array.from({ length: maxCols }).map((_, colIndex) => {
                          const value =
                            row && row[colIndex] !== undefined
                              ? row[colIndex]
                              : "";

                          const isHeading =
                            colIndex === 0 &&
                            typeof value === "string" &&
                            value.startsWith("#");

                          return (
                            <td
                              key={colIndex}
                              style={{
                                border: "1px solid #d9d9d9",
                                minWidth: 120,
                                height: 34,
                                padding: "6px 8px",
                                whiteSpace: "pre-wrap",
                                verticalAlign: "top",
                                fontWeight: isHeading ? 700 : 400,
                                fontSize: isHeading ? 18 : 15,
                                background: "#fff",
                              }}
                            >
                              {String(value)
                                .replace(/^#\s*/, "")
                                .replace(/^##\s*/, "")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {preview || "No preview available."}
            </ReactMarkdown>
          )}
        </div>
        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #eee",
            padding: "14px 18px",
            background: "#fafafa",
          }}
        >
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            📥 Download Excel
          </a>
        </div>
      </div>

      {/* Modal */}
      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              height: "90%",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
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
              📊 {fileName}
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
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
                padding: 35,
              }}
            >
              {(() => {
                const sections = [];
                let current = {
                  title: null,
                  subtitle: null,
                  rows: [],
                };

                preview.forEach((row) => {
                  if (!Array.isArray(row)) return;

                  // Main Heading
                  if (row.length === 1 && String(row[0]).startsWith("# ")) {
                    if (current.rows.length) {
                      sections.push(current);
                    }

                    current = {
                      title: String(row[0]).replace(/^#\s*/, ""),
                      subtitle: null,
                      rows: [],
                    };
                  }

                  // Sub Heading
                  else if (
                    row.length === 1 &&
                    String(row[0]).startsWith("## ")
                  ) {
                    current.subtitle = String(row[0]).replace(/^##\s*/, "");
                  }

                  // Empty row -> create space between tables
                  else if (
                    row.length === 0 ||
                    row.every((c) => String(c).trim() === "")
                  ) {
                    if (current.rows.length) {
                      sections.push(current);
                      current = {
                        title: current.title,
                        subtitle: null,
                        rows: [],
                      };
                    }
                  }

                  // Table rows
                  else if (row.length > 1) {
                    current.rows.push(row);
                  }
                });

                if (current.rows.length) {
                  sections.push(current);
                }

                return sections.map((section, index) => {
                  const headers = section.rows[0] || [];
                  const body = section.rows.slice(1);

                  return (
                    <div
                      key={index}
                      style={{
                        marginBottom: 80,
                      }}
                    >
                      {section.title && (
                        <h1
                          style={{
                            fontSize: 44,
                            fontWeight: 700,
                            marginBottom: 18,
                          }}
                        >
                          {section.title}
                        </h1>
                      )}

                      {section.subtitle && (
                        <h2
                          style={{
                            fontSize: 30,
                            fontWeight: 600,
                            marginBottom: 30,
                          }}
                        >
                          {section.subtitle}
                        </h2>
                      )}

                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          marginTop: 15,
                        }}
                      >
                        <thead>
                          <tr>
                            {headers.map((cell, i) => (
                              <th
                                key={i}
                                style={{
                                  border: "1px solid #d1d5db",
                                  background: "#f8fafc",
                                  padding: 14,
                                  textAlign: "left",
                                  fontWeight: 700,
                                  fontSize: 17,
                                }}
                              >
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {body.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td
                                  key={j}
                                  style={{
                                    border: "1px solid #d1d5db",
                                    padding: 14,
                                    fontSize: 16,
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
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
