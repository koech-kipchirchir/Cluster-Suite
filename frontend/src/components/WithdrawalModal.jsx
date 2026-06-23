import React, { useState, useEffect } from "react";

const WITHDRAW_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: "📱", color: "#00b300" },
  { id: "airtel", label: "Airtel Money", icon: "🟠", color: "#e8001a" },
  { id: "tkash", label: "T-Kash", icon: "🔵", color: "#0056a6" },
  { id: "mtn", label: "MTN MoMo", icon: "🟡", color: "#ffcb00" },
  { id: "paypal", label: "PayPal", icon: "🅿️", color: "#003087" },
  { id: "stripe", label: "Card (Stripe)", icon: "💳", color: "#635bff" },
  { id: "bank", label: "Bank Transfer", icon: "🏦", color: "#1e40af" },
  { id: "cash", label: "Cash Withdrawal", icon: "💵", color: "#059669" },
];

export default function WithdrawalModal({ open, wallet, currency = "KES", onClose, onSubmit }) {
  const [amount, setAmount]         = useState("");
  const [method, setMethod]         = useState("mpesa");
  const [reference, setReference]   = useState("");
  const [notes, setNotes]           = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [confirmed, setConfirmed]   = useState(false);

  const balance = parseFloat(wallet?.balance) || 0;
  const eventName = wallet?.event_name || null;

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("mpesa");
      setReference("");
      setNotes("");
      setError("");
      setLoading(false);
      setConfirmed(false);
    }
  }, [open]);

  if (!open || !wallet) return null;

  const numAmt = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (numAmt <= 0) { setError("Please enter a valid amount."); return; }
    if (numAmt > balance) { setError(`Amount exceeds wallet balance of ${currency} ${balance.toLocaleString()}.`); return; }
    setError("");
    if (!confirmed) { setConfirmed(true); return; }
    setLoading(true);
    try {
      await onSubmit({ amount: numAmt, method, reference, notes });
    } catch (err) {
      setError(err?.message || "Withdrawal failed. Please try again.");
      setLoading(false);
      setConfirmed(false);
    }
  };

  const selectedMethod = WITHDRAW_METHODS.find(m => m.id === method);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 3000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
        overflow: "hidden", animation: "fadeIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #ef4444, #b91c1c)",
          padding: "20px 24px", color: "white",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 2 }}>🔓</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Withdraw Funds</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {wallet.name}{eventName ? ` · ${eventName} is due` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Available balance */}
          <div style={{
            background: "#f9fafb", borderRadius: 12, padding: "14px 16px",
            marginBottom: 20, border: "1px solid #e5e7eb",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ color: "#6b7280", fontWeight: 700, fontSize: 13 }}>Available Balance</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#111827" }}>
              {currency} {balance.toLocaleString("en", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Withdrawal Amount ({currency}) *
            </label>
            <input
              type="number" min="1" max={balance} step="1"
              value={amount}
              onChange={e => { setAmount(e.target.value); setConfirmed(false); }}
              placeholder={`Max: ${balance.toLocaleString()}`}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d1d5db", fontSize: 16, fontWeight: 700, boxSizing: "border-box", outline: "none" }}
            />
            {numAmt > 0 && numAmt <= balance && (
              <div style={{ fontSize: 12, color: "#059669", marginTop: 4, fontWeight: 600 }}>
                Remaining after withdrawal: {currency} {(balance - numAmt).toLocaleString("en", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Method selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Withdrawal Method
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {WITHDRAW_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setConfirmed(false); }}
                  style={{
                    padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                    border: method === m.id ? `2px solid ${m.color}` : "1.5px solid #e5e7eb",
                    background: method === m.id ? `${m.color}15` : "#fafafa",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18 }}>{m.icon}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: method === m.id ? m.color : "#6b7280", marginTop: 2, lineHeight: 1.2 }}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference / notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Account / Reference (optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => { setReference(e.target.value); setConfirmed(false); }}
              placeholder="Phone number, account no., or reference…"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d1d5db", fontSize: 14, boxSizing: "border-box", outline: "none" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setConfirmed(false); }}
              placeholder="Reason for withdrawal…"
              rows={2}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d1d5db", fontSize: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", outline: "none" }}
            />
          </div>

          {/* Confirmation notice */}
          {confirmed && !error && (
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#92400e", marginBottom: 14, fontWeight: 600 }}>
              ⚠️ Confirm: Withdraw <strong>{currency} {numAmt.toLocaleString("en", { minimumFractionDigits: 2 })}</strong> via <strong>{selectedMethod?.label}</strong>?
              This action will reduce your wallet balance. Click again to confirm.
            </div>
          )}

          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f3f4f6", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 2, padding: "12px", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#9ca3af" : confirmed ? "linear-gradient(135deg,#b91c1c,#ef4444)" : "linear-gradient(135deg,#ef4444,#f87171)",
                color: "white",
                boxShadow: loading ? "none" : "0 4px 14px rgba(239,68,68,0.45)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Processing…" : confirmed ? "✔ Confirm Withdrawal" : "🔓 Withdraw Funds"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
