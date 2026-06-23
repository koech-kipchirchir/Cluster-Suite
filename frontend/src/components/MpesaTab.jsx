import React, { useEffect, useState, useCallback } from "react";
import { plannerApi } from "../api";

const STATUS_CONFIG = {
  completed: { label: "Completed", color: "#10b981", bg: "#d1fae5", dark_bg: "#064e3b", icon: "✅" },
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#fef3c7", dark_bg: "#78350f", icon: "⏳" },
  failed:    { label: "Failed",    color: "#ef4444", bg: "#fee2e2", dark_bg: "#7f1d1d", icon: "❌" },
};

function formatCurrency(amount) {
  if (!amount && amount !== 0) return "—";
  return "KES " + Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatPhone(phone) {
  if (!phone) return "—";
  const p = String(phone);
  if (p.startsWith("254") && p.length === 12) {
    return `+${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;
  }
  return phone;
}

function StatusBadge({ status, darkMode }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f3f4f6", dark_bg: "#1f2937", icon: "❓" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 99,
      background: darkMode ? cfg.dark_bg : cfg.bg,
      color: cfg.color, fontWeight: 700, fontSize: 12,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon, color, darkMode, theme }) {
  return (
    <div style={{
      background: theme.card, borderRadius: 16, padding: "20px 24px",
      border: `1px solid ${theme.border}`,
      borderTop: `4px solid ${color}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      flex: 1, minWidth: 140,
      transition: "transform 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: theme.muted }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function MpesaTab({ theme, darkMode }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWallet, setFilterWallet] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await plannerApi.getMpesaRequests();
      setTransactions(res.data || []);
    } catch (err) {
      setError("Failed to load M-Pesa transaction history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived stats
  const totalDeposited = transactions
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const completedCount = transactions.filter(t => t.status === "completed").length;
  const pendingCount   = transactions.filter(t => t.status === "pending").length;
  const failedCount    = transactions.filter(t => t.status === "failed").length;

  // Unique wallets for filter
  const uniqueWallets = [...new Set(transactions.map(t => t.wallet_name).filter(Boolean))];

  // Filtered list
  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (t.phone || "").includes(q) ||
      (t.receipt || "").toLowerCase().includes(q) ||
      (t.wallet_name || "").toLowerCase().includes(q) ||
      (t.merchant_request_id || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchWallet = filterWallet === "All" || t.wallet_name === filterWallet;
    return matchSearch && matchStatus && matchWallet;
  });

  const inputStyle = {
    padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.input, color: theme.text,
    fontSize: 14, outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: theme.text, display: "flex", alignItems: "center", gap: 10 }}>
            📱 M-Pesa Transactions
          </h2>
          <p style={{ margin: "6px 0 0", color: theme.muted, fontSize: 14 }}>
            View all your Lipa na M-Pesa STK push requests and their statuses.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            opacity: loading ? 0.7 : 1, transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "⟳ Loading…" : "↺ Refresh"}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Deposited" value={formatCurrency(totalDeposited)} icon="💰" color="#10b981" darkMode={darkMode} theme={theme} />
        <StatCard label="Completed" value={completedCount} icon="✅" color="#10b981" darkMode={darkMode} theme={theme} />
        <StatCard label="Pending" value={pendingCount} icon="⏳" color="#f59e0b" darkMode={darkMode} theme={theme} />
        <StatCard label="Failed" value={failedCount} icon="❌" color="#ef4444" darkMode={darkMode} theme={theme} />
        <StatCard label="Total Requests" value={transactions.length} icon="📊" color="#6366f1" darkMode={darkMode} theme={theme} />
      </div>

      {/* Filters Row */}
      <div style={{
        background: theme.card, borderRadius: 16, padding: "16px 20px",
        border: `1px solid ${theme.border}`, marginBottom: 20,
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="🔍 Search by phone, receipt, wallet…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, minWidth: 150 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="completed">✅ Completed</option>
          <option value="pending">⏳ Pending</option>
          <option value="failed">❌ Failed</option>
        </select>
        {uniqueWallets.length > 0 && (
          <select
            style={{ ...inputStyle, minWidth: 150 }}
            value={filterWallet}
            onChange={e => setFilterWallet(e.target.value)}
          >
            <option value="All">All Wallets</option>
            {uniqueWallets.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}
        {(search || filterStatus !== "All" || filterWallet !== "All") && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("All"); setFilterWallet("All"); }}
            style={{ ...inputStyle, background: "transparent", cursor: "pointer", color: "#ef4444", fontWeight: 700, border: "1px solid #ef444444" }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: darkMode ? "#7f1d1d" : "#fee2e2", color: "#ef4444",
          padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          border: "1px solid #ef444455", fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 72, borderRadius: 14, background: theme.card,
              border: `1px solid ${theme.border}`,
              animation: "pulse 1.5s ease-in-out infinite",
              opacity: 0.6,
            }} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: theme.card, borderRadius: 20,
          border: `2px dashed ${theme.border}`,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 6 }}>
            {transactions.length === 0 ? "No transactions yet" : "No matching transactions"}
          </div>
          <div style={{ color: theme.muted, maxWidth: 360, margin: "0 auto", fontSize: 14 }}>
            {transactions.length === 0
              ? "Trigger an M-Pesa STK push from the Wallet tab to see your transaction history here."
              : "Try adjusting your search or filters to find what you're looking for."}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 140px 140px 40px",
            padding: "10px 20px",
            fontSize: 11, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: 1, color: theme.muted,
            borderRadius: 10, gap: 12,
          }}>
            <span>Phone</span>
            <span>Wallet</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span></span>
          </div>

          {filtered.map((tx) => {
            const isExpanded = expandedId === tx.id;
            const cfg = STATUS_CONFIG[tx.status] || { color: "#6b7280" };
            return (
              <div
                key={tx.id}
                style={{
                  background: theme.card,
                  borderRadius: 16,
                  border: `1px solid ${isExpanded ? cfg.color + "66" : theme.border}`,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: isExpanded ? `0 4px 20px ${cfg.color}22` : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Main Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 140px 140px 40px",
                    padding: "16px 20px",
                    cursor: "pointer",
                    alignItems: "center",
                    gap: 12,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#1e293b" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{formatPhone(tx.phone)}</div>
                    {tx.receipt && (
                      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginTop: 2 }}>
                        🧾 {tx.receipt}
                      </div>
                    )}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 13, fontWeight: 600 }}>
                    {tx.wallet_name || <span style={{ opacity: 0.4 }}>—</span>}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 13 }}>{formatDate(tx.created_at)}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: tx.status === "completed" ? "#10b981" : theme.text }}>
                    {formatCurrency(tx.amount)}
                  </div>
                  <StatusBadge status={tx.status} darkMode={darkMode} />
                  <div style={{
                    color: theme.muted, fontSize: 18,
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.2s",
                    textAlign: "center",
                  }}>
                    ›
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    padding: "0 20px 20px",
                    borderTop: `1px solid ${theme.border}`,
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
                    paddingTop: 16,
                  }}>
                    {/* Info Block */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: theme.muted, marginBottom: 12 }}>
                        Transaction Details
                      </div>
                      {[
                        ["Merchant Request ID", tx.merchant_request_id || "—"],
                        ["Checkout Request ID", tx.checkout_request_id || "—"],
                        ["Receipt", tx.receipt || "Not yet issued"],
                        ["Phone", formatPhone(tx.phone)],
                        ["Amount", formatCurrency(tx.amount)],
                        ["Wallet", tx.wallet_name || "—"],
                        ["Status", tx.status],
                        ["Created At", formatDate(tx.created_at)],
                        ["Updated At", formatDate(tx.updated_at)],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                          <span style={{ color: theme.muted, minWidth: 180, flexShrink: 0 }}>{label}:</span>
                          <span style={{ fontWeight: 600, color: theme.text, wordBreak: "break-all" }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Daraja Raw Response */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: theme.muted, marginBottom: 12 }}>
                        Raw Daraja Response
                      </div>
                      <pre style={{
                        background: darkMode ? "#0b0f1a" : "#f1f5f9",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10, padding: 14,
                        fontSize: 11, overflowX: "auto",
                        color: theme.text, maxHeight: 200,
                        overflowY: "auto", margin: 0,
                        whiteSpace: "pre-wrap", wordBreak: "break-all",
                      }}>
                        {tx.daraja_response
                          ? (() => { try { return JSON.stringify(JSON.parse(tx.daraja_response), null, 2); } catch { return tx.daraja_response; } })()
                          : "No response data"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div style={{ textAlign: "center", color: theme.muted, fontSize: 13, marginTop: 20 }}>
          Showing {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
