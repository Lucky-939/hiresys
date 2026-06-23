"use client";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`input-wrapper ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: "6px",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-field ${error ? "input-error" : ""}`}
          {...props}
        />
        {error && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--error-text)",
              marginTop: "4px",
            }}
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              marginTop: "4px",
            }}
          >
            {hint}
          </p>
        )}

        <style>{`
          .input-field {
            width: 100%;
            padding: 10px 14px;
            font-size: 14px;
            line-height: 1.5;
            color: var(--text-primary);
            background: #FFFFFF;
            border: 1px solid var(--border-default);
            border-radius: 8px; /* Premium SaaS radius */
            outline: none;
            transition: all 0.2s ease-in-out;
            font-family: inherit;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .input-field::placeholder {
            color: var(--text-disabled);
          }
          .input-field:hover:not(:focus):not(:disabled) {
            border-color: var(--border-strong);
          }
          .input-field:focus {
            border-color: #000000;
            box-shadow: 0 0 0 1px #000000;
          }
          .input-field:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--bg-elevated);
          }
          .input-field.input-error {
            border-color: var(--error);
          }
          .input-field.input-error:focus {
            box-shadow: 0 0 0 1px var(--error);
          }
        `}</style>
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
