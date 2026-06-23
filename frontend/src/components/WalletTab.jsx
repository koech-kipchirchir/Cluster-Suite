import React, { useEffect, useState } from "react";
import api, { setAuthToken, userApi, plannerApi } from "../api";
import { formatCurrency } from "../utils/uiHelpers";
import AccountManager from "./AccountManager";
import PaymentModal from "./PaymentModal";
import WithdrawalModal from "./WithdrawalModal";
import OtpModal from "./OtpModal";

const parseFloatSafe = (value) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function WalletTab({ theme, darkMode }) {
  const [wallets, setWallets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [eventError, setEventError] = useState("");
  const [updatingWalletId, setUpdatingWalletId] = useState(null);
  const [topUpAmounts, setTopUpAmounts] = useState({});
  const [walletSearch, setWalletSearch] = useState("");
  const [walletTypeFilter, setWalletTypeFilter] = useState("All");
  const [walletSort, setWalletSort] = useState("progress");
  const [newWalletForm, setNewWalletForm] = useState({
    name: "",
    balance: "",
    target_amount: "",
    notes: "",
    type: "Savings",
    event_id: "",
  });
  const [currency, setCurrency] = useState('KES');
  const [accounts, setAccounts] = useState([]);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositContext, setDepositContext] = useState(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawContext, setWithdrawContext] = useState(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpContext, setOtpContext] = useState(null);

  const WALLET_TYPES = ["Savings", "Emergency", "Travel", "Investment", "General"];

  const setTokenIfPresent = () => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
  };

  const loadWallets = async () => {
    setTokenIfPresent();
    setLoadingWallets(true);
    setWalletError("");

    try {
      const res = await api.get("/planner/wallets");
      setWallets(res.data || []);
    } catch (err) {
      console.error("Failed to load wallets:", err);
      setWalletError("Unable to load wallet data. Refresh to try again.");
    } finally {
      setLoadingWallets(false);
    }
  };

  const loadEvents = async () => {
    setTokenIfPresent();
    setLoadingEvents(true);
    setEventError("");

    try {
      const res = await api.get("/planner");
      setEvents(res.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
      setEventError("Unable to load event data. Refresh to try again.");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadWallets();
    loadEvents();
    (async () => {
      try {
        const res = await userApi.getProfile();
        setCurrency(res.data?.currency || 'KES');
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('receive_accounts') || '[]');
      if (!stored || stored.length === 0) {
        localStorage.setItem('receive_accounts', JSON.stringify([]));
        setAccounts([]);
      } else {
        setAccounts(stored);
      }
    } catch (e) {
      localStorage.setItem('receive_accounts', JSON.stringify([]));
      setAccounts([]);
    }
  }, []);

  const addWallet = async () => {
    if (!newWalletForm.name.trim()) {
      setWalletError("Wallet name is required.");
      return;
    }

    setWalletError("");

    try {
      const payload = {
        name: newWalletForm.name.trim(),
        balance: parseFloatSafe(newWalletForm.balance),
        target_amount: parseFloatSafe(newWalletForm.target_amount),
        notes: newWalletForm.notes.trim() || null,
        type: newWalletForm.type,
        event_id: newWalletForm.event_id ? Number(newWalletForm.event_id) : null,
      };

      await api.post("/planner/wallets", payload);
      setNewWalletForm({ name: "", balance: "", target_amount: "", notes: "", type: "Savings", event_id: "" });
      await loadWallets();
      await loadEvents();
    } catch (err) {
      console.error("Failed to add wallet:", err);
      setWalletError(err.response?.data?.message || "Failed to add wallet.");
    }
  };

  const deleteWallet = async (id) => {
    try {
      await api.delete(`/planner/wallets/${id}`);
      await loadWallets();
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete wallet:", err);
      setWalletError("Failed to remove wallet. Try again.");
    }
  };

  const updateWalletBalance = async (wallet, amountToAdd, accountName) => {
    const amount = parseFloatSafe(amountToAdd);
    if (!amount) return;

    const newBalance = parseFloatSafe(wallet.balance) + amount;
    setUpdatingWalletId(wallet.id);
    setWallets((prev) => prev.map((w) => (w.id === wallet.id ? { ...w, balance: newBalance } : w)));

    try {
      const updatedWallet = { ...wallet, balance: newBalance };
      if (accountName) {
        const depositNote = `Deposit from ${accountName}: ${amount}`;
        updatedWallet.notes = (wallet.notes ? wallet.notes + "\n" : "") + depositNote;
      }
      await api.put(`/planner/wallets/${wallet.id}`, updatedWallet);
      await loadWallets();
      await loadEvents();
    } catch (err) {
      console.error("Failed to update wallet balance:", err);
      setWalletError("Unable to update wallet balance.");
      await loadWallets();
    } finally {
      setUpdatingWalletId(null);
    }
  };

  const handleTopUpChange = (walletId, value) => {
    setTopUpAmounts((prev) => ({ ...prev, [walletId]: value }));
  };

  const saveAccountsToStorage = (list) => {
    localStorage.setItem('receive_accounts', JSON.stringify(list || []));
    setAccounts(list || []);
  };

  const addReceiveAccount = (name) => {
    if (!name || !name.trim()) return;
    const list = [...accounts, { id: Date.now(), name: name.trim() }];
    saveAccountsToStorage(list);
  };

  const handleDeposit = async (wallet, suggestedAmount) => {
    setDepositContext({ wallet, amount: suggestedAmount || '' });
    setDepositModalOpen(true);
  };

  // Route payment to correct backend depending on method
  const handlePaymentSubmit = async ({ method, amount, phone, reference }) => {
    const walletId = depositContext.wallet.id;
    try {
      if (method === 'mpesa') {
        await api.post(`/planner/wallets/${walletId}/stk-push`, { amount, phone });
        setDepositModalOpen(false);
        alert('M-Pesa STK push initiated. Please approve the transaction on your phone.');
      } else {
        await plannerApi.depositManual(walletId, { amount, method, reference });
        setDepositModalOpen(false);
        await loadWallets();
        await loadEvents();
        alert(`Deposit via ${method} recorded successfully!`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Deposit failed.';
      throw new Error(msg);
    }
  };

  // Withdrawal handlers
  const isEventDue = (wallet) => {
    if (!wallet.event_id) return true; // No linked event — always allow
    const walletWithEvent = wallet;
    // We need event date — wallets don't carry it, use events state
    const evt = events.find(e => e.id === wallet.event_id);
    if (!evt || !evt.date) return true;
    const eventDate = new Date(evt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate <= today;
  };

  const handleWithdraw = (wallet) => {
    const evt = wallet.event_id ? events.find(e => e.id === wallet.event_id) : null;
    setWithdrawContext({ ...wallet, event_name: evt?.name || null });
    setWithdrawModalOpen(true);
  };

  const handleWithdrawSubmit = async ({ amount, method, reference, notes }) => {
    try {
      await plannerApi.withdraw(withdrawContext.id, { amount, method, reference: reference || notes });
      setWithdrawModalOpen(false);
      setWithdrawContext(null);
      await loadWallets();
      await loadEvents();
      alert(`Withdrawal of ${currency} ${amount.toLocaleString()} successful!`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Withdrawal failed.';
      throw new Error(msg);
    }
  };

  const handleCustomTopUp = (wallet) => {
    const amount = parseFloatSafe(topUpAmounts[wallet.id]);
    if (!amount) return;
    setTopUpAmounts((prev) => ({ ...prev, [wallet.id]: "" }));
    handleDeposit(wallet, amount);
  };

  const handleOpenAccounts = () => setShowAccountManager(true);
  const handleSaveAccounts = (list) => saveAccountsToStorage(list);

  const totalBalance = wallets.reduce((sum, wallet) => sum + parseFloatSafe(wallet.balance), 0);
  const totalTarget = wallets.reduce((sum, wallet) => sum + parseFloatSafe(wallet.target_amount), 0);
  const averageProgress = wallets.length
    ? wallets.reduce((acc, wallet) => acc + (parseFloatSafe(wallet.target_amount) > 0 ? Math.min(100, (parseFloatSafe(wallet.balance) / parseFloatSafe(wallet.target_amount)) * 100) : 0), 0) / wallets.length
    : 0;

  const linkedEventCount = wallets.filter((wallet) => wallet.event_name).length;
  const walletCount = wallets.length;
  const visibleWallets = wallets
    .filter((wallet) => {
      const matchesSearch = walletSearch.trim().length === 0 || wallet.name.toLowerCase().includes(walletSearch.trim().toLowerCase()) || wallet.type.toLowerCase().includes(walletSearch.trim().toLowerCase()) || (wallet.event_name || "").toLowerCase().includes(walletSearch.trim().toLowerCase());
      const matchesType = walletTypeFilter === "All" || wallet.type === walletTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (walletSort === "progress") {
        const progressA = parseFloatSafe(a.target_amount) > 0 ? Math.min(100, (parseFloatSafe(a.balance) / parseFloatSafe(a.target_amount)) * 100) : 0;
        const progressB = parseFloatSafe(b.target_amount) > 0 ? Math.min(100, (parseFloatSafe(b.balance) / parseFloatSafe(b.target_amount)) * 100) : 0;
        return progressB - progressA;
      }
      if (walletSort === "balance") {
        return parseFloatSafe(b.balance) - parseFloatSafe(a.balance);
      }
      if (walletSort === "target") {
        return parseFloatSafe(b.target_amount) - parseFloatSafe(a.target_amount);
      }
      return 0;
    });
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
              <div style={{ marginTop: 8 }}>
                <button onClick={handleOpenAccounts} style={{ padding: '8px 12px', borderRadius: 8, background: '#e5e7eb', border: 'none', cursor: 'pointer' }}>Manage Accounts</button>
              </div>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Total Balance</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{formatCurrency(totalBalance, currency)}</div>
        </div>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Total Goal</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{formatCurrency(totalTarget, currency)}</div>
        </div>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Average Progress</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{averageProgress.toFixed(1)}%</div>
        </div>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Linked Events</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{linkedEventCount}</div>
        </div>
      </div>

      {(walletError || eventError) && (
        <div style={{ marginBottom: "20px", background: "#fef3c7", color: "#92400e", borderRadius: "16px", padding: "16px", border: "1px solid #fde68a" }}>
          {walletError || eventError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Wallets</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{walletCount}</div>
          <div style={{ color: theme.muted, marginTop: "10px", fontSize: "13px" }}>{visibleWallets.length} visible</div>
        </div>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Event-linked</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{linkedEventCount}</div>
          <div style={{ color: theme.muted, marginTop: "10px", fontSize: "13px" }}>{events.length} events loaded</div>
        </div>
        <div style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Target Goal</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{formatCurrency(totalTarget, currency)}</div>
          <div style={{ color: theme.muted, marginTop: "10px", fontSize: "13px" }}>Avg progress: {averageProgress.toFixed(1)}%</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <input
          placeholder="Search wallets..."
          value={walletSearch}
          onChange={(e) => setWalletSearch(e.target.value)}
          style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
        />
        <select
          value={walletTypeFilter}
          onChange={(e) => setWalletTypeFilter(e.target.value)}
          style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
        >
          <option value="All">All Types</option>
          {WALLET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select
          value={walletSort}
          onChange={(e) => setWalletSort(e.target.value)}
          style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
        >
          <option value="progress">Sort by Progress</option>
          <option value="balance">Sort by Balance</option>
          <option value="target">Sort by Target</option>
        </select>
      </div>

      {loadingWallets && (
        <div style={{ padding: "40px", textAlign: "center", color: theme.muted, background: theme.card, borderRadius: "20px", border: `1px solid ${theme.border}` }}>Loading wallets...</div>
      )}

      {!loadingWallets && walletCount === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: theme.muted, background: theme.card, borderRadius: "20px", border: `2px dashed ${theme.border}`, marginBottom: "24px" }}>
          <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>No wallets yet</div>
          <div style={{ maxWidth: "540px", margin: "0 auto" }}>Create a wallet to start tracking goals, link it to an event, and keep your savings momentum visible.</div>
        </div>
      )}
      {!loadingWallets && walletCount > 0 && visibleWallets.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: theme.muted, background: theme.card, borderRadius: "20px", border: `2px dashed ${theme.border}`, marginBottom: "24px" }}>
          <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>No matching wallets</div>
          <div style={{ maxWidth: "540px", margin: "0 auto" }}>Try clearing your search or type filter to see more wallets.</div>
        </div>
      )}

      {!loadingWallets && visibleWallets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          {visibleWallets.map((wallet) => {
            const progress = parseFloatSafe(wallet.target_amount) > 0 ? Math.min(100, (parseFloatSafe(wallet.balance) / parseFloatSafe(wallet.target_amount)) * 100) : 0;
            return (
              <div key={wallet.id} style={{ background: theme.card, padding: "24px", borderRadius: "24px", border: `1px solid ${theme.border}`, boxShadow: darkMode ? "0 20px 25px -5px rgba(0,0,0,0.4)" : "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", textTransform: "uppercase" }}>{wallet.type}</span>
                      {wallet.event_name && (
                        <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: "800", background: darkMode ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff", padding: "2px 8px", borderRadius: "20px" }}>
                          🎯 {wallet.event_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: theme.text, marginTop: "6px" }}>{wallet.name}</div>
                  </div>
                  <button onClick={() => deleteWallet(wallet.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "18px" }}>✕</button>
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: theme.muted }}>
                    <span>Balance</span>
                    <span>{formatCurrency(parseFloatSafe(wallet.balance), currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: theme.muted }}>
                    <span>Target</span>
                    <span>{formatCurrency(parseFloatSafe(wallet.target_amount), currency)}</span>
                  </div>
                  <div style={{ height: "10px", background: theme.border, borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "#10b981", transition: "width 0.4s ease" }} />
                  </div>
                </div>

                {/* Event-due withdrawal banner */}
                {isEventDue(wallet) && wallet.event_id && parseFloatSafe(wallet.balance) > 0 && (
                  <div style={{ marginBottom: "14px", background: darkMode ? "#1a0a0a" : "#fff1f2", border: "1.5px solid #ef4444", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#ef4444", fontSize: 13 }}>🎉 Event is due!</div>
                      <div style={{ fontSize: 12, color: darkMode ? "#fca5a5" : "#b91c1c", marginTop: 2 }}>You can now withdraw your saved funds.</div>
                    </div>
                    <button onClick={() => handleWithdraw(wallet)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: 13, whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(239,68,68,0.4)" }}>
                      🔓 Withdraw
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
                  {["10", "50", "100"].map((amt) => (
                    <button key={amt} onClick={() => handleDeposit(wallet, amt)} disabled={updatingWalletId === wallet.id} style={{ flex: 1, minWidth: 70, padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontWeight: "700", opacity: updatingWalletId === wallet.id ? 0.7 : 1 }}>
                      {`+${formatCurrency(Number(amt), currency)}`}
                    </button>
                  ))}
                  <button onClick={() => handleDeposit(wallet, '')} disabled={updatingWalletId === wallet.id} style={{ flex: 1, minWidth: 70, padding: "10px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: 13, opacity: updatingWalletId === wallet.id ? 0.7 : 1 }}>
                    💳 Pay
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder="Custom top-up"
                    value={topUpAmounts[wallet.id] || ""}
                    onChange={(e) => handleTopUpChange(wallet.id, e.target.value)}
                    style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
                  />
                  <button onClick={() => handleCustomTopUp(wallet)} disabled={updatingWalletId === wallet.id} style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: "700", opacity: updatingWalletId === wallet.id ? 0.8 : 1 }}>
                    Add
                  </button>
                </div>

                <div style={{ fontSize: "13px", color: theme.muted, lineHeight: "1.6" }}>{wallet.notes || "Keep track of your saving goal and progress here."}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: theme.card, padding: "24px", borderRadius: "16px", border: `1px solid ${theme.border}` }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "800", color: theme.text }}>Add New Wallet</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <input placeholder="Wallet Name" value={newWalletForm.name} onChange={e => setNewWalletForm({ ...newWalletForm, name: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <select value={newWalletForm.type} onChange={e => setNewWalletForm({ ...newWalletForm, type: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
            {WALLET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input type="number" placeholder={`Current Balance (${currency})`} value={newWalletForm.balance} onChange={e => setNewWalletForm({ ...newWalletForm, balance: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <input type="number" placeholder={`Target Amount (${currency})`} value={newWalletForm.target_amount} onChange={e => setNewWalletForm({ ...newWalletForm, target_amount: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <select value={newWalletForm.event_id} onChange={e => setNewWalletForm({ ...newWalletForm, event_id: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
            <option value="">Link to Event (Optional)</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          <textarea placeholder="Notes" value={newWalletForm.notes} onChange={e => setNewWalletForm({ ...newWalletForm, notes: e.target.value })} style={{ gridColumn: "span 2", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text, fontFamily: "inherit" }} />
        </div>
        <button onClick={addWallet} style={{ marginTop: "18px", background: "#10b981", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>Add Wallet</button>
      </div>
      {showAccountManager && (
        <AccountManager accounts={accounts} onSave={handleSaveAccounts} onClose={() => setShowAccountManager(false)} />
      )}
      {depositModalOpen && depositContext && (
        <PaymentModal
          open={depositModalOpen}
          walletName={depositContext.wallet.name}
          currency={currency}
          initialAmount={depositContext.amount}
          onClose={() => setDepositModalOpen(false)}
          onSubmit={handlePaymentSubmit}
        />
      )}
      {withdrawModalOpen && withdrawContext && (
        <WithdrawalModal
          open={withdrawModalOpen}
          wallet={withdrawContext}
          currency={currency}
          onClose={() => { setWithdrawModalOpen(false); setWithdrawContext(null); }}
          onSubmit={handleWithdrawSubmit}
        />
      )}
      {otpModalOpen && otpContext && (
        <OtpModal
          open={otpModalOpen}
          onClose={() => setOtpModalOpen(false)}
          otpId={otpContext.otpId}
          walletId={otpContext.walletId}
          to={otpContext.to}
          amount={otpContext.amount}
          onConfirmed={async () => {
            await loadWallets();
            await loadEvents();
            alert('Deposit completed');
            setOtpModalOpen(false);
            setOtpContext(null);
          }}
        />
      )}
    </div>
  );
}
