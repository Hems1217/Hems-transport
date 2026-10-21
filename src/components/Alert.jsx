import React from "react";

export default function Alert({ message, type = "danger", onClose }) {
  if (!message) return null;

  const iconMap = {
    danger: "bi-exclamation-octagon-fill",
    warning: "bi-exclamation-triangle-fill",
    success: "bi-check-circle-fill",
    info: "bi-info-circle-fill",
    primary: "bi-shield-check"
  };

  const icon = iconMap[type] || "bi-info-circle-fill";

  return (
    <div
      className={`alert alert-${type} d-flex align-items-center gap-2 border shadow-sm py-2 px-3 mb-3 rounded-3`}
      role="alert"
      style={{
        backdropFilter: "blur(8px)",
        fontSize: "0.92rem",
        animation: "fadeIn 0.25s ease"
      }}
    >
      <i className={`bi ${icon} flex-shrink-0 fs-5`} />
      <div className="flex-grow-1">{message}</div>
      {onClose && (
        <button
          type="button"
          className="btn-close ms-auto"
          onClick={onClose}
          aria-label="Close"
        />
      )}
    </div>
  );
}
