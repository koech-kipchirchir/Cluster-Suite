import React, { useState, useEffect } from "react";
import api, { setAuthToken, userApi, taskApi } from "../api";
import { formatCurrency } from "../utils/uiHelpers";
import AccountManager from "./AccountManager";
import DepositModal from "./DepositModal";
import OtpModal from "./OtpModal";

const parseFloatSafe = (value) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function PlannerTab({ theme, darkMode, aiProcessing, setAiProcessing }) {
  const [events, setEvents] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const [updatingWalletId, setUpdatingWalletId] = useState(null);
  const [topUpAmounts, setTopUpAmounts] = useState({});
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    date: "",
    budget_goal: "",
    current_savings: "",
    notes: "",
    type: "General",
    createWallet: false,
  });
  const [newWalletForm, setNewWalletForm] = useState({
    name: "",
    balance: "",
    target_amount: "",
    notes: "",
    type: "Savings",
    event_id: "",
  });
  const [eventSearch, setEventSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("All");
  const [eventSort, setEventSort] = useState("date");
  const [walletSearch, setWalletSearch] = useState("");
  const [walletTypeFilter, setWalletTypeFilter] = useState("All");
  const [walletSort, setWalletSort] = useState("progress");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalContent, setAiModalContent] = useState("");
  const [aiModalEventId, setAiModalEventId] = useState(null);
  const [lastGeneratedPlan, setLastGeneratedPlan] = useState(null);
  const [aiEditableContent, setAiEditableContent] = useState("");
  const [taskChecklistForImport, setTaskChecklistForImport] = useState([]);
  const [showTaskChecklist, setShowTaskChecklist] = useState(false);
  const [lastImportedTaskIds, setLastImportedTaskIds] = useState([]);
  const [aiRating, setAiRating] = useState(0);
  const [aiRatingText, setAiRatingText] = useState("");
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [importingTasks, setImportingTasks] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [currency, setCurrency] = useState("KES");
  const [accounts, setAccounts] = useState([]);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpContext, setOtpContext] = useState(null);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositContext, setDepositContext] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [duplicatingEventId, setDuplicatingEventId] = useState(null);
  const [duplicatingWalletId, setDuplicatingWalletId] = useState(null);

  const EVENT_TYPES = ["General", "Travel", "Birthday", "Wedding", "Project", "Other"];
  const WALLET_TYPES = ["Savings", "Emergency", "Travel", "Investment", "General"];

  const setTokenIfPresent = () => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
  };

  const loadEvents = async () => {
    setTokenIfPresent();
    setLoadingEvents(true);
    setPlannerError("");

    try {
      const res = await api.get("/planner");
      setEvents(res.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
      setPlannerError("Unable to load events. Refresh to try again.");
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadWallets = async () => {
    setTokenIfPresent();
    setLoadingWallets(true);
    setPlannerError("");

    try {
      const res = await api.get("/planner/wallets");
      setWallets(res.data || []);
    } catch (err) {
      console.error("Failed to load wallets:", err);
      setPlannerError("Unable to load wallets. Refresh to try again.");
    } finally {
      setLoadingWallets(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadWallets();
    loadTemplates();
    loadRecommendations();
    const loadProfileCurrency = async () => {
      try {
        setTokenIfPresent();
        const profileRes = await userApi.getProfile();
        setCurrency(profileRes.data?.currency || "KES");
      } catch (err) {
        console.warn("Unable to load profile currency", err);
      }
    };
    loadProfileCurrency();
  }, []);

  const handleOpenAccounts = () => setShowAccountManager(true);
  const handleSaveAccounts = (list) => saveAccountsToStorage(list);

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

  const loadTemplates = async () => {
    try {
      const res = await api.get("/planner/templates");
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const res = await api.post("/planner/recommendations");
      setRecommendations(res.data?.recommendations || []);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    }
  };

  const applyTemplate = (template) => {
    setNewEventForm({
      ...newEventForm,
      name: template.name,
      budget_goal: template.defaultBudget.toString(),
      type: template.type,
    });
    // For now, just fill the event form; wallets would be created separately
  };

  const duplicateEvent = async (eventId) => {
    try {
      setDuplicatingEventId(eventId);
      const res = await api.post(`/planner/${eventId}/duplicate`);
      setPlannerError("");
      alert(`Event duplicated! New event created with ${res.data.wallet_count} wallets.`);
      await loadEvents();
      await loadWallets();
    } catch (err) {
      console.error("Failed to duplicate event:", err);
      setPlannerError(err.response?.data?.message || "Failed to duplicate event.");
    } finally {
      setDuplicatingEventId(null);
    }
  };

  const duplicateWallet = async (walletId) => {
    try {
      setDuplicatingWalletId(walletId);
      await api.post(`/planner/wallets/${walletId}/duplicate`);
      setPlannerError("");
      alert("Wallet duplicated successfully!");
      await loadWallets();
    } catch (err) {
      console.error("Failed to duplicate wallet:", err);
      setPlannerError(err.response?.data?.message || "Failed to duplicate wallet.");
    } finally {
      setDuplicatingWalletId(null);
    }
  };

  const addEvent = async () => {
    if (!newEventForm.name.trim()) {
      setPlannerError("Event name is required.");
      return;
    }

    setPlannerError("");

    try {
      const initialSavings = parseFloatSafe(newEventForm.current_savings);
      const payload = {
        name: newEventForm.name.trim(),
        date: newEventForm.date || null,
        budget_goal: parseFloatSafe(newEventForm.budget_goal),
        current_savings: newEventForm.createWallet ? 0 : initialSavings,
        notes: newEventForm.notes.trim() || null,
        type: newEventForm.type,
      };

      const res = await api.post("/planner", payload);
      const newEventId = res.data.id;

      if (newEventForm.createWallet) {
        await api.post("/planner/wallets", {
          name: `${newEventForm.name} Fund`,
          balance: initialSavings,
          target_amount: parseFloatSafe(newEventForm.budget_goal),
          notes: `Dedicated wallet for saving towards: ${newEventForm.name}`,
          type: "Savings",
          event_id: newEventId,
        });
      }

      setNewEventForm({ name: "", date: "", budget_goal: "", current_savings: "", notes: "", type: "General", createWallet: false });
      await loadEvents();
      await loadWallets();
    } catch (err) {
      console.error(err);
      setPlannerError(err.response?.data?.message || "Unable to create event.");
    }
  };

  const addWallet = async () => {
    if (!newWalletForm.name.trim()) {
      setPlannerError("Wallet name is required.");
      return;
    }
    setPlannerError("");

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
      setPlannerError(err.response?.data?.message || "Unable to add wallet.");
    }
  };

  const deleteWallet = async (id) => {
    try {
      await api.delete(`/planner/wallets/${id}`);
      await loadWallets();
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete wallet:", err);
      setPlannerError("Unable to delete wallet. Try again.");
    }
  };

  const updateWalletBalance = async (wallet, amountToAdd, accountName) => {
    const amount = parseFloatSafe(amountToAdd);
    if (!amount) return;
    const newBalance = parseFloatSafe(wallet.balance) + amount;

    setUpdatingWalletId(wallet.id);
    setWallets(prev => prev.map((w) => w.id === wallet.id ? { ...w, balance: newBalance } : w));

    try {
      const updatedWallet = { ...wallet, balance: newBalance };
      if (accountName) {
        const depositNote = `Deposit from ${accountName}: ${amount}`;
        updatedWallet.notes = (wallet.notes ? wallet.notes + "\n" : "") + depositNote;
      }
      await api.put(`/planner/wallets/${wallet.id}`, updatedWallet);
      await loadEvents();
      await loadWallets();
    } catch (err) {
      console.error("Failed to update wallet balance:", err);
      setPlannerError("Unable to update wallet balance.");
      await loadWallets();
    } finally {
      setUpdatingWalletId(null);
    }
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

  const handleDepositSubmit = async ({ to, amount, saveAccount }) => {
    if (saveAccount && to) {
      const exists = accounts.some((acc) => acc.name === to);
      if (!exists) {
        saveAccountsToStorage([...accounts, { id: Date.now(), name: to.trim() }]);
      }
    }

    try {
      await api.post(`/planner/wallets/${depositContext.wallet.id}/stk-push`, { amount, phone: to });
      setDepositModalOpen(false);
      alert('M-Pesa STK push initiated. Please approve the transaction on your phone.');
    } catch (err) {
      console.error('Deposit failed', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to initiate M-Pesa STK push';
      alert(`Failed to initiate M-Pesa STK push: ${errorMessage}`);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/planner/${id}`);
      await loadEvents();
      await loadWallets(); // Reload wallets since associated wallets event_id is set to null
    } catch (err) {
      console.error(err);
      setPlannerError("Failed to delete event. Try again.");
    }
  };

  const updateSavings = async (event, amountToAdd) => {
    const amount = parseFloatSafe(amountToAdd);
    const linkedWallets = wallets.filter(w => w.event_id === event.id);

    if (linkedWallets.length > 0) {
      // Route savings through the first linked wallet
      const targetWallet = linkedWallets[0];
      const newWalletBalance = parseFloat(targetWallet.balance || 0) + amount;

      // Optimistic Update
      setWallets(prev => prev.map(w => w.id === targetWallet.id ? { ...w, balance: newWalletBalance } : w));
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, current_savings: parseFloat(e.current_savings || 0) + amount } : e));

      try {
        await api.put(`/planner/wallets/${targetWallet.id}`, {
          ...targetWallet,
          balance: newWalletBalance
        });
      } catch (err) {
        console.error("Failed to sync wallet savings:", err);
        loadEvents();
        loadWallets();
      }
    } else {
      // Normal direct event savings update
      const newTotal = parseFloat(event.current_savings || 0) + amount;
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, current_savings: newTotal } : e));

      try {
        await api.put(`/planner/${event.id}`, { ...event, current_savings: newTotal });
      } catch (err) {
        console.error(err);
        loadEvents();
      }
    }
  };

  const prefillWalletForEvent = (event) => {
    setNewWalletForm({
      name: `${event.name} Fund`,
      balance: event.current_savings || "",
      target_amount: event.budget_goal || "",
      notes: `Auto-created for event: ${event.name}`,
      type: "Savings",
      event_id: event.id,
    });
    // Smooth scroll to the Add New Wallet form
    const el = document.getElementById("add-wallet-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleAIAssistEvent = async (eventId) => {
    setAiProcessing(prev => ({ ...prev, [`event_${eventId}`]: 'generating_plan' }));
    try {
      const res = await api.post(`/planner/${eventId}/ai-assist`);
      const planText = res.data?.ai_plan || "";
      setAiModalContent(planText);
      setAiEditableContent(planText);
      setAiModalEventId(eventId);
      setAiModalOpen(true);
      // Refresh events so the saved ai_plan appears in the list
      loadEvents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate AI plan");
    } finally {
      setAiProcessing(prev => ({ ...prev, [`event_${eventId}`]: null }));
    }
  };

  const handleAIGeneratePlan = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingPlan(true);
    try {
      const res = await api.post("/planner/ai-generate-plan", { prompt: aiPrompt.trim() });
      setAiPrompt("");
      // Show generated result details in modal
      setLastGeneratedPlan(res.data || null);
      const msg = (res.data && res.data.message) ? res.data.message : "AI Plan generated successfully!";
      setAiModalContent(msg);
      setAiEditableContent(msg);
      // focus the modal so user can inspect created event/wallet/tasks
      setAiModalOpen(true);
      // Refresh lists
      loadEvents();
      loadWallets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate AI plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch (err) {
      console.error("Copy failed", err);
      alert("Unable to copy to clipboard");
    }
  };

  const saveAiPlanToNotes = async (eventId, content) => {
    try {
      const ev = events.find(e => e.id === eventId);
      if (!ev) return alert("Event not found");
      await api.put(`/planner/${eventId}`, { ...ev, notes: content });
      alert("AI plan saved to event notes");
      loadEvents();
    } catch (err) {
      console.error("Failed to save AI plan to notes", err);
      alert(err.response?.data?.error || "Failed to save AI plan to notes");
    }
  };

  const parseTasksFromText = (text) => {
    if (!text) return [];
    // Split lines and collect likely task lines (bullets, numbered, or long lines)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const candidates = [];
    for (const line of lines) {
      // Remove leading bullets or numbering
      const cleaned = line.replace(/^[-•*\d+\)\.\s]+/, '').trim();
      if (cleaned.length >= 3) candidates.push(cleaned);
    }
    // Fallback: if no lines parsed and text is long, split by sentences
    if (candidates.length === 0 && text.length > 30) {
      return text.split(/[\.\!\?]\s+/).map(s => s.trim()).filter(Boolean).slice(0, 8);
    }
    return candidates.slice(0, 20);
  };

  const importAiTasks = async (eventId) => {
    try {
      const toImport = parseTasksFromText(aiEditableContent || aiModalContent || '');
      if (!toImport.length) return alert('No tasks found in AI content to import.');
      // Open checklist preview instead of immediate import
      setTaskChecklistForImport(toImport.map((title, idx) => ({ id: idx, title, checked: true })));
      setShowTaskChecklist(true);
    } catch (err) {
      console.error('Import failed', err);
      alert(err.response?.data?.error || 'Failed to import tasks');
    }
  };

  const confirmImportTasks = async (eventId) => {
    try {
      setImportingTasks(true);
      const tasksToCreate = taskChecklistForImport
        .filter(t => t.checked)
        .map(t => ({
          title: t.title,
          event_id: eventId,
          priority: "Medium",
          category: "AI Generated",
        }));

      if (!tasksToCreate.length) return alert('No tasks selected for import.');

      const res = await api.post('/tasks/bulk', { tasks: tasksToCreate });
      const createdIds = res.data.tasks.map(t => t.id);
      
      setLastImportedTaskIds(createdIds);
      setShowTaskChecklist(false);
      setAiRating(0);
      setAiRatingText("");
      alert(`Imported ${createdIds.length} tasks to event. You can now undo if needed.`);
      
      // Highlight first created task
      if (createdIds.length > 0) {
        setHighlightedTaskId(createdIds[0]);
        setTimeout(() => setHighlightedTaskId(null), 3000);
      }
      
      loadEvents();
    } catch (err) {
      console.error('Bulk import failed', err);
      alert(err.response?.data?.error || 'Failed to import tasks');
    } finally {
      setImportingTasks(false);
    }
  };

  const undoImportedTasks = async () => {
    if (!lastImportedTaskIds.length) return alert('No tasks to undo.');
    try {
      setImportingTasks(true);
      await taskApi.bulkDelete(lastImportedTaskIds);
      setLastImportedTaskIds([]);
      alert(`Deleted ${lastImportedTaskIds.length} imported tasks.`);
      loadEvents();
    } catch (err) {
      console.error('Undo failed', err);
      alert(err.response?.data?.error || 'Failed to undo import');
    } finally {
      setImportingTasks(false);
    }
  };

  const submitAiFeedback = async (eventId) => {
    try {
      await api.aiApi.feedback(eventId, aiRating, aiRatingText);
      alert('Thank you for your feedback!');
      setAiRating(0);
      setAiRatingText("");
    } catch (err) {
      console.error('Feedback submit failed', err);
    }
  };

  const totalBudget = events.reduce((acc, curr) => acc + (curr.budget_goal || 0), 0);
  const totalSaved = events.reduce((acc, curr) => acc + (curr.current_savings || 0), 0);
  const overallProgress = totalBudget > 0 ? (totalSaved / totalBudget) * 100 : 0;

  const visibleEvents = [...events]
    .filter((event) => {
      const searchTerm = eventSearch.trim().toLowerCase();
      const matchesSearch = !searchTerm || [event.name, event.notes, event.type].some((field) => (field || "").toLowerCase().includes(searchTerm));
      const matchesType = eventTypeFilter === "All" || event.type === eventTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (eventSort === "date") {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      }
      if (eventSort === "progress") {
        const progress = (item) => item.budget_goal > 0 ? (item.current_savings || 0) / item.budget_goal : 0;
        return progress(b) - progress(a);
      }
      if (eventSort === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

  const upcomingEventCount = visibleEvents.filter((event) => {
    if (!event.date) return false;
    const diffDays = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const visibleWallets = wallets
    .filter((wallet) => {
      const q = walletSearch.trim().toLowerCase();
      const matchesSearch = q === "" || wallet.name.toLowerCase().includes(q) || wallet.type.toLowerCase().includes(q) || (wallet.event_name || "").toLowerCase().includes(q);
      const matchesType = walletTypeFilter === "All" || wallet.type === walletTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (walletSort === "progress") {
        const pa = a.target_amount > 0 ? Math.min(100, ((a.balance || 0) / a.target_amount) * 100) : 0;
        const pb = b.target_amount > 0 ? Math.min(100, ((b.balance || 0) / b.target_amount) * 100) : 0;
        return pb - pa;
      }
      if (walletSort === "balance") return (b.balance || 0) - (a.balance || 0);
      if (walletSort === "target") return (b.target_amount || 0) - (a.target_amount || 0);
      return 0;
    });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Financial Overview Summary */}
      {plannerError && (
        <div style={{ marginBottom: "22px", padding: "16px 20px", borderRadius: "16px", background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e" }}>
          {plannerError}
        </div>
      )}
      <div style={{ 
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
        padding: "30px", 
        borderRadius: "24px", 
        marginBottom: "30px", 
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>Total Cluster Savings</div>
            <div style={{ fontSize: "36px", fontWeight: "900" }}>{formatCurrency(totalSaved, currency)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", opacity: 0.8 }}>Overall Progress</div>
            <div style={{ fontSize: "24px", fontWeight: "800" }}>{overallProgress.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ height: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ width: `${overallProgress}%`, height: "100%", background: "#10b981", transition: "width 0.5s ease-out" }} />
        </div>
        <div style={{ marginTop: "15px", fontSize: "14px", opacity: 0.9 }}>
            You still need <strong>{formatCurrency(totalBudget - totalSaved, currency)}</strong> to reach all your goals.
            <button onClick={handleOpenAccounts} style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 8, background: '#e5e7eb', border: 'none', cursor: 'pointer' }}>Manage Accounts</button>
        </div>
      </div>
      {showAccountManager && (
        <AccountManager accounts={accounts} onSave={handleSaveAccounts} onClose={() => setShowAccountManager(false)} />
      )}
      {depositModalOpen && depositContext && (
        <DepositModal
          open={depositModalOpen}
          walletName={depositContext.wallet.name}
          currency={currency}
          accounts={accounts}
          initialAmount={depositContext.amount}
          onClose={() => setDepositModalOpen(false)}
          onSubmit={handleDepositSubmit}
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

      {/* Upcoming events summary */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
        <div style={{ flex: 1, background: theme.card, padding: "16px", borderRadius: "12px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase" }}>Upcoming (7 days)</div>
          <div style={{ fontSize: "20px", fontWeight: "900", marginTop: "8px", color: theme.text }}>{upcomingEventCount}</div>
          <div style={{ marginTop: "10px", color: theme.muted, fontSize: "13px" }}>
            {visibleEvents.filter((ev) => ev.date && (() => { const d = new Date(ev.date); const diff = Math.ceil((d - new Date())/(1000*60*60*24)); return diff >=0 && diff <=7; })()).slice(0,3).map((ev) => (
              <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>{ev.name}</span>
                <span style={{ color: theme.muted }}>{ev.date || "TBD"}</span>
              </div>
            ))}
            {upcomingEventCount === 0 && <div style={{ color: theme.muted }}>No upcoming events</div>}
          </div>
        </div>
        <div style={{ width: "240px", background: theme.card, padding: "16px", borderRadius: "12px", border: `1px solid ${theme.border}`, textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase" }}>Overall Progress</div>
          <div style={{ fontSize: "20px", fontWeight: "900", marginTop: "8px", color: theme.text }}>{overallProgress.toFixed(1)}%</div>
          <div style={{ marginTop: "8px", color: theme.muted, fontSize: "12px" }}>{visibleEvents.length} events</div>
        </div>
      </div>

      {/* AI Event Planner generator prompt card */}
      <div style={{ 
        background: darkMode ? "#1e1b4b" : "#e0e7ff",
        padding: "24px", 
        borderRadius: "20px", 
        marginBottom: "24px", 
        border: `1px solid ${darkMode ? "#312e81" : "#c7d2fe"}`
      }}>
        <h3 style={{ margin: "0 0 8px 0", color: theme.text, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
          ✨ AI Event & Savings Planner
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: theme.muted }}>
          Describe what you want to plan, and the AI will automatically create an Event, link a target-saving Wallet, and prepopulate key tasks with recommended deadlines.
        </p>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input 
            placeholder={`e.g. Plan a 3-day camping trip to Yosemite next month with a budget of ${formatCurrency(200, currency)}`} 
            value={aiPrompt} 
            onChange={e => setAiPrompt(e.target.value)} 
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            disabled={generatingPlan}
          />
          <button 
            onClick={handleAIGeneratePlan} 
            disabled={generatingPlan || !aiPrompt.trim()} 
            style={{ 
              background: generatingPlan ? "#818cf8" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
              color: "white", 
              border: "none", 
              padding: "12px 24px", 
              borderRadius: "10px", 
              fontWeight: "700", 
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(99, 102, 241, 0.15)"
            }}
          >
            {generatingPlan ? "Planning Event..." : "Plan Event"}
          </button>
        </div>
      </div>

      <div style={{ background: theme.card, padding: "24px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: theme.text, fontSize: "16px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
          📋 Event Templates
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366f1"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: `2px solid ${theme.border}`,
                background: theme.input,
                color: theme.text,
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "14px"
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "8px" }}>{template.icon}</div>
              <div>{template.name}</div>
              <div style={{ fontSize: "12px", color: theme.muted, marginTop: "4px" }}>{formatCurrency(template.defaultBudget, currency)}</div>
            </button>
          ))}
        </div>
      </div>

      <div id="create-event-form" style={{ background: theme.card, padding: "24px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 20px 0", color: theme.text, fontSize: "18px", fontWeight: "800" }}>Create New Event</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <input placeholder="Event Name" value={newEventForm.name} onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <input type="date" value={newEventForm.date} onChange={e => setNewEventForm({ ...newEventForm, date: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <select value={newEventForm.type} onChange={e => setNewEventForm({ ...newEventForm, type: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
            {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input type="number" placeholder={`Budget Goal (${currency})`} value={newEventForm.budget_goal} onChange={e => setNewEventForm({ ...newEventForm, budget_goal: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <input type="number" placeholder={`Current Savings (${currency})`} value={newEventForm.current_savings} onChange={e => setNewEventForm({ ...newEventForm, current_savings: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "8px", color: theme.text }}>
            <input type="checkbox" id="createWallet" checked={newEventForm.createWallet} onChange={e => setNewEventForm({ ...newEventForm, createWallet: e.target.checked })} />
            <label htmlFor="createWallet" style={{ fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Create a dedicated savings wallet for this event</label>
          </div>
          <textarea placeholder="Event Notes" value={newEventForm.notes} onChange={e => setNewEventForm({ ...newEventForm, notes: e.target.value })} style={{ gridColumn: "span 2", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text, fontFamily: "inherit" }} />
        </div>
        <button onClick={addEvent} style={{ marginTop: "16px", background: "#6366f1", color: "white", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Add Event</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "22px" }}>
        <input
          placeholder="Search events..."
          value={eventSearch}
          onChange={(e) => setEventSearch(e.target.value)}
          style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
        />
        <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
          <option value="All">All Event Types</option>
          {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={eventSort} onChange={(e) => setEventSort(e.target.value)} style={{ padding: "12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
          <option value="date">Sort by Date</option>
          <option value="progress">Sort by Progress</option>
          <option value="name">Sort by Name</option>
        </select>
        <button
          onClick={() => {
            const el = document.getElementById("create-event-form");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          style={{
            padding: "12px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white",
            border: "none",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          ➕ Add Event
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div style={{ background: theme.card, padding: "20px", borderRadius: "18px", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Wallet Balance</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{formatCurrency(wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0), currency)}</div>
          </div>
          <div style={{ background: theme.card, padding: "20px", borderRadius: "18px", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Target Goal</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{formatCurrency(wallets.reduce((sum, wallet) => sum + (wallet.target_amount || 0), 0), currency)}</div>
          </div>
          <div style={{ background: theme.card, padding: "20px", borderRadius: "18px", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: "12px", color: theme.muted, fontWeight: "700", textTransform: "uppercase", marginBottom: "10px" }}>Goal Progress</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>
              {wallets.length > 0 ? (wallets.reduce((acc, wallet) => acc + (wallet.target_amount > 0 ? Math.min(100, ((wallet.balance || 0) / wallet.target_amount) * 100) : 0), 0) / wallets.length).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "18px" }}>
            <input
              placeholder="Search wallets..."
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />
            <select value={walletTypeFilter} onChange={(e) => setWalletTypeFilter(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
              <option value="All">All Types</option>
              {WALLET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={walletSort} onChange={(e) => setWalletSort(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
              <option value="progress">Sort by Progress</option>
              <option value="balance">Sort by Balance</option>
              <option value="target">Sort by Target</option>
            </select>
          </div>

          {visibleWallets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              {visibleWallets.map(wallet => {
            const progress = wallet.target_amount > 0 ? Math.min(100, ((wallet.balance || 0) / wallet.target_amount) * 100) : 0;
            return (
              <div key={wallet.id} style={{ background: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.border}`, boxShadow: darkMode ? "0 20px 25px -5px rgba(0,0,0,0.4)" : "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
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
                  <button onClick={() => duplicateWallet(wallet.id)} disabled={duplicatingWalletId === wallet.id} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: "18px", marginLeft: "8px", opacity: duplicatingWalletId === wallet.id ? 0.5 : 1 }} title="Duplicate this wallet">📋</button>
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: theme.muted }}>
                    <span>Balance</span>
                    <span>{formatCurrency(wallet.balance || 0, currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: theme.muted }}>
                    <span>Target</span>
                    <span>{formatCurrency(wallet.target_amount || 0, currency)}</span>
                  </div>
                  <div style={{ height: "10px", background: theme.border, borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "#10b981", transition: "width 0.4s ease" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  {["10", "50", "100"].map((amt) => (
                    <button key={amt} onClick={() => handleDeposit(wallet, amt)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontWeight: "700" }}>
                      +{formatCurrency(Number(amt), currency)}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: "13px", color: theme.muted, lineHeight: "1.6" }}>{wallet.notes || "Keep track of your saving goal and progress here."}</div>
              </div>
            );
          })}
        </div>
      )}

      <div id="add-wallet-form" style={{ background: theme.card, padding: "24px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 20px 0", color: theme.text, fontSize: "18px", fontWeight: "800" }}>Add New Wallet</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <input placeholder="Wallet Name" value={newWalletForm.name} onChange={e => setNewWalletForm({ ...newWalletForm, name: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <select value={newWalletForm.type} onChange={e => setNewWalletForm({ ...newWalletForm, type: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
            {WALLET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input type="number" placeholder={`Current Balance (${currency})`} value={newWalletForm.balance} onChange={e => setNewWalletForm({ ...newWalletForm, balance: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <input type="number" placeholder={`Target Amount (${currency})`} value={newWalletForm.target_amount} onChange={e => setNewWalletForm({ ...newWalletForm, target_amount: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} />
          <select value={newWalletForm.event_id} onChange={e => setNewWalletForm({ ...newWalletForm, event_id: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}>
            <option value="">Link to Event (Optional)</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          <textarea placeholder="Notes" value={newWalletForm.notes} onChange={e => setNewWalletForm({ ...newWalletForm, notes: e.target.value })} style={{ gridColumn: "span 2", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text, fontFamily: "inherit" }} />
        </div>
        <button onClick={addWallet} style={{ marginTop: "16px", background: "#10b981", color: "white", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Add Wallet</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
        {loadingEvents ? (
          <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", background: theme.card, borderRadius: "20px", border: `1px solid ${theme.border}` }}>
            Loading events...
          </div>
        ) : visibleEvents.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: theme.muted, background: theme.card, borderRadius: "20px", border: `2px dashed ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <span>No events yet. Start your next adventure!</span>
            <button
              onClick={() => {
                const el = document.getElementById("create-event-form");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                border: "none",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)"
              }}
            >
              ➕ Create Your First Event
            </button>
          </div>
        ) : (
          visibleEvents.map((event) => {
            const progress = event.budget_goal > 0 ? Math.min(100, (event.current_savings / event.budget_goal) * 100) : 0;
            const today = new Date();
            today.setHours(0,0,0,0);
            const eventDate = event.date ? new Date(event.date) : null;
            const remainingAmount = Math.max(0, (event.budget_goal || 0) - (event.current_savings || 0));
            let daysLeft = 0;
            if (eventDate && !isNaN(eventDate.getTime())) {
              const diffTime = eventDate.getTime() - today.getTime();
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            const dailyTarget = (daysLeft > 0 && remainingAmount > 0) ? (remainingAmount / daysLeft).toFixed(2) : 0;
            const linkedWallets = wallets.filter((w) => w.event_id === event.id);

            return (
              <div id={`event-${event.id}`} key={event.id} style={{ background: theme.card, padding: "28px", borderRadius: "24px", border: `1px solid ${theme.border}`, boxShadow: darkMode ? "0 20px 25px -5px rgba(0,0,0,0.4)" : "0 10px 15px -3px rgba(0,0,0,0.05)", position: "relative", transition: "transform 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "15px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em" }}>{event.type}</span>
                    <h4 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "900", letterSpacing: "-0.02em" }}>{event.name}</h4>
                    <span style={{ fontSize: "14px", color: theme.muted, display: "flex", alignItems: "center", gap: "6px" }}>📅 {event.date || "TBD"}</span>
                  </div>
                  <button onClick={() => deleteEvent(event.id)} style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: "18px" }}>✕</button>
                  <button onClick={() => duplicateEvent(event.id)} disabled={duplicatingEventId === event.id} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: "18px", marginLeft: "8px", opacity: duplicatingEventId === event.id ? 0.5 : 1 }} title="Duplicate this event">📋</button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: theme.muted }}>Progress</span>
                    <span style={{ fontWeight: "700" }}>{progress.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: "8px", background: theme.border, borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {linkedWallets.length > 0 && (
                  <div style={{ 
                    background: darkMode ? "rgba(16, 185, 129, 0.05)" : "#f0fdf4", 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `1px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "#bbf7d0"}`,
                    marginBottom: "20px"
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#10b981", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      👛 Savings Wallets
                    </div>
                    {linkedWallets.map((w) => (
                      <div key={w.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: theme.text, marginBottom: "6px" }}>
                        <span style={{ fontWeight: "600" }}>{w.name} <span style={{ fontSize: "11px", color: theme.muted }}>({w.type})</span></span>
                        <span style={{ fontWeight: "700" }}>{formatCurrency(w.balance || 0, currency)} / {formatCurrency(w.target_amount || 0, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {linkedWallets.length === 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => prefillWalletForEvent(event)} style={{ background: "#10b981", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
                      ➕ Create Wallet for Event
                    </button>
                  </div>
                )}

                <div style={{ 
                  background: darkMode ? "rgba(30, 41, 59, 0.5)" : "#f8fafc", 
                  padding: "20px", 
                  borderRadius: "12px", 
                  border: `1px solid ${darkMode ? "rgba(99, 102, 241, 0.2)" : "#ddd6fe"}`,
                  marginBottom: "20px"
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", marginBottom: "12px" }}>👛 Daily Savings Goal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                    <div>
                      <div style={{ fontSize: "28px", fontWeight: "900", color: theme.text }}>{formatCurrency(dailyTarget, currency)}</div>
                      <div style={{ fontSize: "12px", color: theme.muted }}>needed every day</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: theme.text }}>{formatCurrency(remainingAmount, currency)}</div>
                      <div style={{ fontSize: "11px", color: theme.muted }}>left to save</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", color: theme.muted, fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
                    {linkedWallets.length > 0 ? "Deposit into Linked Wallet" : "Quick Save"}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["10", "50", "100"].map((amt) => (
                      <button 
                        key={amt}
                        onClick={() => updateSavings(event, amt)}
                        style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                      >
                        +{formatCurrency(Number(amt), currency)}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleAIAssistEvent(event.id)} disabled={aiProcessing[`event_${event.id}`]} style={{ width: "100%", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", color: "white", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer", marginBottom: "15px", boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)" }}>
                  {aiProcessing[`event_${event.id}`] ? "Consulting Planner..." : "✨ Get AI Planning Assist"}
                </button>

                {event.ai_plan && (
                  <div style={{ padding: "20px", background: darkMode ? "#0f172a" : "#ffffff", borderRadius: "12px", border: `1px solid ${theme.border}`, fontSize: "14px", color: theme.text, whiteSpace: "pre-wrap", lineHeight: "1.6", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontWeight: "900", color: "#6366f1", marginBottom: "12px", borderBottom: `2px solid ${theme.border}`, paddingBottom: "8px" }}>📋 AI PLANNER ADVICE</div>
                    {event.ai_plan}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div style={{ background: theme.card, padding: "24px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: theme.text, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
            💡 Smart Recommendations
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {recommendations.map((rec) => (
              <div key={rec.eventId} style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: darkMode ? "#0f172a" : "#f8fafc" }}>
                <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "8px", color: theme.text }}>{rec.eventName}</div>
                <div style={{ fontSize: "13px", color: theme.muted, lineHeight: "1.6" }}>
                  <div style={{ marginTop: "4px", color: theme.text }}>{rec.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {aiModalOpen && (
        <div onClick={() => setAiModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 95%)", maxHeight: "80vh", overflow: "auto", background: theme.card, color: theme.text, padding: "20px", borderRadius: "12px", border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>AI Planner Result</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => copyToClipboard(aiEditableContent || aiModalContent || JSON.stringify(lastGeneratedPlan, null, 2))} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#6366f1", color: "white", cursor: "pointer" }}>Copy</button>
                <button onClick={() => { setAiModalOpen(false); }} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer" }}>Close</button>
              </div>
            </div>

            <textarea value={aiEditableContent} onChange={(e) => setAiEditableContent(e.target.value)} style={{ width: "100%", minHeight: "180px", whiteSpace: "pre-wrap", lineHeight: 1.5, background: darkMode ? "#0b1220" : "#fafafa", padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, color: theme.text, fontFamily: "inherit" }} />

            {/* If generated plan contains structured data, render summary */}
            {lastGeneratedPlan && (
              <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                {lastGeneratedPlan.event && (
                  <div style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card }}>
                    <div style={{ fontWeight: "800" }}>Created Event</div>
                    <div style={{ fontSize: "14px", marginTop: "6px" }}>{lastGeneratedPlan.event.name} — {lastGeneratedPlan.event.date || 'TBD'}</div>
                    <div style={{ fontSize: "13px", color: theme.muted }}>{formatCurrency(lastGeneratedPlan.event.budget_goal || 0, currency)}</div>
                  </div>
                )}
                {lastGeneratedPlan.wallet && (
                  <div style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card }}>
                    <div style={{ fontWeight: "800" }}>Created Wallet</div>
                    <div style={{ fontSize: "14px", marginTop: "6px" }}>{lastGeneratedPlan.wallet.name} — {formatCurrency(lastGeneratedPlan.wallet.target_amount || 0, currency)}</div>
                  </div>
                )}
                {lastGeneratedPlan.tasks && Array.isArray(lastGeneratedPlan.tasks) && (
                  <div style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card }}>
                    <div style={{ fontWeight: "800", marginBottom: "8px" }}>Created Tasks</div>
                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                      {lastGeneratedPlan.tasks.slice(0, 8).map((t, idx) => <li key={idx} style={{ marginBottom: "6px" }}>{t.title || t}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {aiModalEventId && (
                <>
                  <button onClick={() => saveAiPlanToNotes(aiModalEventId, aiEditableContent)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer" }}>Save to Event Notes</button>
                  <button onClick={() => importAiTasks(aiModalEventId)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "white", cursor: "pointer" }}>Next: Review Tasks</button>
                </>
              )}
              {lastGeneratedPlan?.event?.id && (
                <button onClick={() => {
                  const id = lastGeneratedPlan.event.id;
                  setAiModalOpen(false);
                  setTimeout(() => {
                    const el = document.getElementById(`event-${id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.style.transition = "box-shadow 0.3s ease";
                    }
                  }, 300);
                }} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer" }}>Go to Created Event</button>
              )}
            </div>

            {/* Feedback Rating Section */}
            <div style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: theme.muted, marginBottom: "8px" }}>RATE THIS AI SUGGESTION</div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setAiRating(star)} style={{ fontSize: "20px", background: "none", border: "none", cursor: "pointer", opacity: star <= aiRating ? 1 : 0.3 }}>
                    ⭐
                  </button>
                ))}
              </div>
              <textarea placeholder="Optional feedback..." value={aiRatingText} onChange={(e) => setAiRatingText(e.target.value)} style={{ width: "100%", minHeight: "50px", padding: "8px", borderRadius: "4px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text, fontFamily: "inherit", fontSize: "12px" }} />
              <button onClick={() => submitAiFeedback(aiModalEventId)} style={{ marginTop: "8px", padding: "6px 12px", borderRadius: "4px", border: "none", background: "#6366f1", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Submit Feedback</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Checklist Preview Modal */}
      {showTaskChecklist && (
        <div onClick={() => setShowTaskChecklist(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 95%)", maxHeight: "80vh", overflow: "auto", background: theme.card, color: theme.text, padding: "20px", borderRadius: "12px", border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Review Tasks to Import</h3>
              <button onClick={() => setShowTaskChecklist(false)} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer" }}>Close</button>
            </div>

            <div style={{ fontSize: "12px", color: theme.muted, marginBottom: "12px" }}>
              {taskChecklistForImport.filter(t => t.checked).length} of {taskChecklistForImport.length} tasks selected
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxHeight: "50vh", overflowY: "auto" }}>
              {taskChecklistForImport.map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: darkMode ? "#0b0f1a" : "#fafafa" }}>
                  <input 
                    type="checkbox" 
                    checked={task.checked} 
                    onChange={(e) => setTaskChecklistForImport(taskChecklistForImport.map(t => t.id === task.id ? { ...t, checked: e.target.checked } : t))}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <span style={{ flex: 1, fontSize: "13px" }}>{task.title}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => setTaskChecklistForImport(taskChecklistForImport.map(t => ({ ...t, checked: true })))} 
                style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontSize: "12px" }}
              >
                Select All
              </button>
              <button 
                onClick={() => setTaskChecklistForImport(taskChecklistForImport.map(t => ({ ...t, checked: false })))} 
                style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontSize: "12px" }}
              >
                Deselect All
              </button>
              <button 
                onClick={() => confirmImportTasks(aiModalEventId)} 
                disabled={importingTasks || !taskChecklistForImport.some(t => t.checked)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: importingTasks || !taskChecklistForImport.some(t => t.checked) ? 0.6 : 1 }}
              >
                {importingTasks ? "Importing..." : "Confirm & Import"}
              </button>
              {lastImportedTaskIds.length > 0 && (
                <button 
                  onClick={undoImportedTasks}
                  disabled={importingTasks}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >
                  ↶ Undo Last Import
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Modal component styles are inline to keep this file self-contained.