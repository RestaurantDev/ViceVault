"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          padding: "20px",
          background: "#EDEDED"
        }}>
          <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#133250" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={reset}
            style={{
              background: "#80B5D7",
              color: "#133250",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}


