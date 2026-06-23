import React, { useState, useEffect } from "react";

const PAYMENT_METHODS = [
  {
    id: "mpesa", label: "M-Pesa", region: "Kenya",
    icon: "📱", color: "#00b300", bg: "#e6ffe6",
    dark_bg: "#052e05", description: "Lipa na M-Pesa STK Push",
    fields: [{ key: "phone", label: "M-Pesa Phone Number", placeholder: "e.g. 0712345678", type: "text" }],
  },
  {
    id: "airtel", label: "Airtel Money", region: "Kenya / Africa",
    icon: "🟠", color: "#e8001a", bg: "#fff0f0",
    dark_bg: "#3b0008", description: "Airtel Mobile Money transfer",
    fields: [{ key: "phone", label: "Airtel Phone Number", placeholder: "e.g. 0733123456", type: "text" }],
  },
  {
    id: "tkash", label: "T-Kash", region: "Kenya",
    icon: "🔵", color: "#0056a6", bg: "#e6f0ff",
    dark_bg: "#001a3d", description: "Telkom Kenya T-Kash",
    fields: [{ key: "phone", label: "T-Kash Phone Number", placeholder: "e.g. 0770123456", type: "text" }],
  },
  {
    id: "mtn", label: "MTN Mobile Money", region: "Uganda / Ghana / Rwanda",
    icon: "🟡", color: "#ffcb00", bg: "#fffde6",
    dark_bg: "#2e2800", description: "MTN MoMo transfer",
    fields: [{ key: "phone", label: "MTN MoMo Phone", placeholder: "e.g. +256712345678", type: "text" }],
  },
  {
    id: "paypal", label: "PayPal", region: "Global",
    icon: "🅿️", color: "#003087", bg: "#e8eeff",
    dark_bg: "#00112e", description: "PayPal transfer — enter reference",
    fields: [{ key: "reference", label: "PayPal Transaction ID / Email", placeholder: "e.g. 5AB12345CD678901E", type: "text" }],
  },
  {
    id: "stripe", label: "Card (Stripe)", region: "Global",
    icon: "💳", color: "#635bff", bg: "#f0eeff",
    dark_bg: "#0d0b2e", description: "Credit / Debit card — enter reference",
    fields: [{ key: "reference", label: "Card / Stripe Reference", placeholder: "e.g. ch_3NfKLo2eZvKYlo2C...", type: "text" }],
  },
  {
    id: "bank", label: "Bank Transfer", region: "Global",
    icon: "🏦", color: "#1e40af", bg: "#eff6ff",
    dark_bg: "#051233", description: "Wire / EFT bank transfer",
    fields: [
      { key: "reference", label: "Bank Reference / UTR", placeholder: "e.g. FT2306123456", type: "text" },
      { key: "extra", label: "Bank Name (optional)", placeholder: "e.g. KCB, Equity, Barclays", type: "text" },
    ],
  },
  {
    id: "cash", label: "Cash / Manual", region: "Any",
    icon: "💵", color: "#059669", bg: "#ecfdf5",
    dark_bg: "#022c22", description: "Physical cash or manual entry",
    fields: [{ key: "reference", label: "Notes / Reference (optional)", placeholder: "e.g. Received from John", type: "text" }],
  },
];

export default function PaymentModal({ open, walletName, currency = "KES", initialAmount = "", onClose, onSubmit }) {
  const [step, setStep] = useState(1); // 1=choose, 2=details, 3=confirm
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [fieldValues, setFieldValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelected(null);
      setAmount(initialAmount ? String(initialAmount) : "");
      setFieldValues({});
      setError("");
      setLoading(false);
    }
  }, [open, initialAmount]);

  if (!open) return null;

  const method = PAYMENT_METHODS.find(m => m.id === selected);

  const handleSelectMethod = (id) => {
    setSelected(id);
    setFieldValues({});
    setError("");
    setStep(2);
  };

  const handleDetails = () => {
    if (!amount || parseFloat(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (method?.fields) {
      const firstRequired = method.fields[0];
      if (!fieldValues[firstRequired.key]?.trim() && firstRequired.key !== "reference") {
        setError(`Please enter ${firstRequired.label}.`);
        return;
      }
    }
    setError("");
    setStep(3);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        method: selected,
        amount: parseFloat(amount),
        phone: fieldValues.phone || "",
        reference: fieldValues.reference || fieldValues.extra || "",
        extra: fieldValues.extra || "",
      });
    } catch (err) {
      setError(err?.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const overlay = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 3000, padding: 16,
  };
  const card = {
    width: "100%", maxWidth: step === 1 ? 680 : 460,
    background: "#ffffff", borderRadius: 20,
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
    overflow: "hidden",
    animation: "fadeIn 0.2s ease",
  };
  const header = {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              {step === 1 ? "Choose Payment Method" : step === 2 ? "Enter Details" : "Confirm Payment"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#111827", marginTop: 2 }}>
              {walletName}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Step pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  width: 28, height: 6, borderRadius: 99,
                  background: s <= step ? "#6366f1" : "#e5e7eb",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* ───── STEP 1: Choose method ───── */}
          {step === 1 && (
            <>
              <p style={{ margin: "0 0 18px", color: "#6b7280", fontSize: 14 }}>
                Select how you want to deposit funds into <strong>{walletName}</strong>.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 12 }}>
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMethod(m.id)}
                    style={{
                      padding: "16px 12px", borderRadius: 14, border: "1.5px solid #e5e7eb",
                      background: "#fafafa", cursor: "pointer", textAlign: "center",
                      transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = `1.5px solid ${m.color}`;
                      e.currentTarget.style.background = m.bg;
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = `0 6px 20px ${m.color}33`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = "1.5px solid #e5e7eb";
                      e.currentTarget.style.background = "#fafafa";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{m.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{m.label}</span>
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{m.region}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ───── STEP 2: Enter details ───── */}
          {step === 2 && method && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: method.bg, borderRadius: 12, marginBottom: 20,
                border: `1px solid ${method.color}44`,
              }}>
                <span style={{ fontSize: 28 }}>{method.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#111827", fontSize: 15 }}>{method.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{method.description}</div>
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Amount ({currency}) *
                </label>
                <input
                  type="number" min="1" step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d1d5db", fontSize: 16, fontWeight: 700, boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Dynamic fields */}
              {method.fields.map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {f.label} {f.key !== "extra" && f.key !== "reference" ? "*" : ""}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={fieldValues[f.key] || ""}
                    onChange={e => setFieldValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d1d5db", fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              ))}

              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => { setStep(1); setError(""); }} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f3f4f6", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
                <button onClick={handleDetails} style={{ flex: 2, padding: "12px", borderRadius: 12, background: `linear-gradient(135deg, ${method.color}, ${method.color}bb)`, color: "white", border: "none", fontWeight: 800, cursor: "pointer", fontSize: 14, boxShadow: `0 4px 12px ${method.color}44` }}>
                  Review →
                </button>
              </div>
            </>
          )}

          {/* ───── STEP 3: Confirm ───── */}
          {step === 3 && method && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{method.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>{currency} {parseFloat(amount).toLocaleString()}</div>
                <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>via <strong>{method.label}</strong></div>
              </div>

              <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #e5e7eb" }}>
                {[
                  ["Wallet", walletName],
                  ["Method", method.label],
                  ["Amount", `${currency} ${parseFloat(amount).toLocaleString("en", { minimumFractionDigits: 2 })}`],
                  fieldValues.phone && ["Phone", fieldValues.phone],
                  fieldValues.reference && ["Reference", fieldValues.reference],
                  fieldValues.extra && ["Bank", fieldValues.extra],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>{label}</span>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{val}</span>
                  </div>
                ))}
              </div>

              {method.id === "mpesa" && (
                <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16, fontWeight: 600 }}>
                  📲 You will receive an M-Pesa STK push. Please enter your PIN on your phone to complete.
                </div>
              )}
              {method.id !== "mpesa" && (
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1e40af", marginBottom: 16, fontWeight: 600 }}>
                  ℹ️ This will be recorded as a manual deposit. Ensure funds have been transferred before confirming.
                </div>
              )}

              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setStep(2); setError(""); }} disabled={loading} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f3f4f6", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{ flex: 2, padding: "12px", borderRadius: 12, background: loading ? "#9ca3af" : `linear-gradient(135deg, ${method.color}, ${method.color}bb)`, color: "white", border: "none", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, boxShadow: loading ? "none" : `0 4px 12px ${method.color}44` }}
                >
                  {loading ? "Processing…" : `Confirm ${method.label} Deposit`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
