import { useState, useRef, useEffect, useCallback, CSSProperties } from "react";

interface Props {
  email: string;
  onVerified: (verifiedToken: string) => void;
  onBack?: () => void;
  apiBase?: string;
}

type Status = "idle" | "loading" | "success" | "error";
type ResendStatus = "idle" | "sending" | "sent";

export default function EmailOTPVerification({
  email,
  onVerified,
  onBack,
  apiBase = "https://backendworksafer-production.up.railway.app",
}: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-send OTP on mount
  useEffect(() => {
    sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    setResendStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`${apiBase}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setOtpSent(true);
      setResendStatus("sent");
      setCooldown(60);
      setTimeout(() => setResendStatus("idle"), 3000);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setResendStatus("idle");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send code");
    }
  }, [email, apiBase]);

  const handleResend = async () => {
    if (cooldown > 0 || resendStatus === "sending") return;
    setDigits(["", "", "", "", "", ""]);
    setErrorMsg("");
    setResendStatus("sending");
    try {
      const res = await fetch(`${apiBase}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.waitSeconds) setCooldown(data.waitSeconds);
        throw new Error(data.error || "Failed to resend");
      }
      setResendStatus("sent");
      setCooldown(60);
      setTimeout(() => setResendStatus("idle"), 3000);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setResendStatus("idle");
      setErrorMsg(err instanceof Error ? err.message : "Failed to resend");
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = sanitized;
    setDigits(next);
    setErrorMsg("");

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((char, i) => {
      if (i < 6) next[i] = char;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter all 6 digits");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${apiBase}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setStatus("success");
      setTimeout(() => onVerified(data.verifiedToken), 600);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Verification failed");
      setTimeout(() => setStatus("idle"), 300);
    }
  };

  // Auto-submit when all digits filled
  useEffect(() => {
    if (digits.every((d) => d !== "") && status === "idle" && otpSent) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const isFilled = digits.every((d) => d !== "");
  const maskedEmail = email.replace(
    /(.{2})(.*)(@.*)/,
    (_, a, b, c) => a + "*".repeat(b.length) + c,
  );

  return (
    <div style={styles.wrapper}>
      {/* Icon */}
      <div style={styles.iconWrap}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: "#3b82f6" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <h2 style={styles.title}>Check your email</h2>
      <p style={styles.subtitle}>
        We sent a 6-digit verification code to
        <br />
        <strong style={{ color: "#0f172a" }}>{maskedEmail}</strong>
      </p>

      {/* OTP Inputs */}
      <div style={styles.otpRow} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              ...styles.digitInput,
              borderColor: errorMsg
                ? "#ef4444"
                : status === "success"
                  ? "#22c55e"
                  : d
                    ? "#3b82f6"
                    : "#e2e8f0",
              background:
                status === "success" ? "#f0fdf4" : d ? "#eff6ff" : "#f8fafc",
              color: status === "success" ? "#15803d" : "#0f172a",
              transform: d ? "scale(1.05)" : "scale(1)",
            }}
            disabled={status === "loading" || status === "success"}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={styles.errorBox}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success message */}
      {status === "success" && (
        <div style={styles.successBox}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Email verified! Continuing…</span>
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!isFilled || status === "loading" || status === "success"}
        style={{
          ...styles.verifyBtn,
          opacity:
            !isFilled || status === "loading" || status === "success" ? 0.5 : 1,
          cursor:
            !isFilled || status === "loading" || status === "success"
              ? "not-allowed"
              : "pointer",
        }}
      >
        {status === "loading" ? (
          <span style={styles.spinner} />
        ) : status === "success" ? (
          "✓ Verified"
        ) : (
          "Verify Code"
        )}
      </button>

      {/* Resend */}
      <div style={styles.resendRow}>
        <span style={{ color: "#64748b", fontSize: "14px" }}>
          Didn't receive it?
        </span>
        {cooldown > 0 ? (
          <span style={styles.cooldownText}>Resend in {cooldown}s</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendStatus === "sending"}
            style={styles.resendBtn}
          >
            {resendStatus === "sending"
              ? "Sending…"
              : resendStatus === "sent"
                ? "Sent!"
                : "Resend code"}
          </button>
        )}
      </div>

      {/* Back */}
      {onBack && (
        <button onClick={onBack} style={styles.backBtn}>
          ← Use a different email
        </button>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 24px",
    maxWidth: "420px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  iconWrap: {
    width: "64px",
    height: "64px",
    background: "#eff6ff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    border: "2px solid #bfdbfe",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 32px",
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
    lineHeight: "1.6",
  },
  otpRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  digitInput: {
    width: "48px",
    height: "56px",
    textAlign: "center",
    fontSize: "22px",
    fontWeight: "700",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    outline: "none",
    transition: "all 0.15s ease",
    fontFamily: "'Courier New', monospace",
    cursor: "text",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#dc2626",
    fontSize: "13px",
    marginBottom: "16px",
    width: "100%",
    boxSizing: "border-box",
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#15803d",
    fontSize: "13px",
    marginBottom: "16px",
    width: "100%",
    boxSizing: "border-box",
  },
  verifyBtn: {
    width: "100%",
    padding: "14px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background 0.15s",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  resendRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
    textDecoration: "underline",
    textDecorationColor: "transparent",
    transition: "text-decoration-color 0.15s",
  },
  cooldownText: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "500",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0",
    marginTop: "4px",
  },
};

// Add this to your global CSS (e.g. index.css):
// @keyframes spin { to { transform: rotate(360deg); } }
