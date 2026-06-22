import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { setAuthToken } from "../api";

import AnalyticsTab from "../components/AnalyticsTab";
import KanbanTab from "../components/KanbanTab";
import TaskItem from "../components/TaskItem";
import PlannerTab from "../components/PlannerTab";
import WalletTab from "../components/WalletTab";
import { CATEGORIES, BOARDS, PRIORITIES, RECURRENCE_OPTIONS, REMINDER_CHANNELS, INITIAL_TASK_STATE } from "../constants/taskConstants";

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [addTaskForm, setAddTaskForm] = useState(INITIAL_TASK_STATE);
  const [editingTask, setEditingTask] = useState(null); // For tasks

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterBoard, setFilterBoard] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("dueDate");
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [aiProcessing, setAiProcessing] = useState({}); // To show loading state for AI buttons
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [activeDashboardTab, setActiveDashboardTab] = useState("tasks"); // 'tasks' or 'analytics'
  const [filterTag, setFilterTag] = useState("All");
  const [allTags, setAllTags] = useState([]);
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [groupBy, setGroupBy] = useState("None");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null);
  const [bulkActionValue, setBulkActionValue] = useState("");
  const [performingBulkAction, setPerformingBulkAction] = useState(false);

  // Persist theme choice
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.body.style.backgroundColor = darkMode ? "#0f172a" : "#f8fafc";
  }, [darkMode]);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
    input: darkMode ? "#0b0f1a" : "#f8fafc"
  };

  // Timer Effect: Handles the ticking logic for Focus Mode
  useEffect(() => {
    let interval = null;
    if (activeTimerId) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimerId]);

  const handleStartTracking = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/time/start`);
      setActiveTimerId(taskId);
      setTimerSeconds(0);
      loadTasks();
    } catch (err) {
      console.error("Failed to start timer:", err);
    }
  };

  const handleStopTracking = async (taskId) => {
    try {
      // Convert elapsed seconds to minutes (minimum 1 minute if started)
      const minutes = Math.max(1, Math.round(timerSeconds / 60));
      await api.post(`/tasks/${taskId}/time/stop`, { minutes });
      setActiveTimerId(null);
      setTimerSeconds(0);
      loadTasks();
    } catch (err) {
      console.error("Failed to stop timer:", err);
    }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks", {
        params: {
          search: debouncedSearch,
          category: filterCategory,
          board: filterBoard,
          priority: filterPriority,
          tag: filterTag,
          status,
          sort,
        },
      });

      setTasks(res.data);
      
      // Sync local timer state with backend tracking status
      const trackingTask = res.data.find(t => t.is_tracking === 1);
      if (trackingTask && !activeTimerId) setActiveTimerId(trackingTask.id);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fix 401: Re-apply token if it exists in storage but not in api instance
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchTags = async () => {
      try {
        const res = await api.get("/tasks/user/tags");
        setAllTags(res.data);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
        if (err.response?.status === 401) window.location.href = "/login";
      }
    };

    fetchTags();
    loadTasks(); // Load tasks whenever filters or search change

  }, [debouncedSearch, filterCategory, filterBoard, filterPriority, filterTag, status, sort, activeDashboardTab]);

  const fetchSubtasks = async (taskId) => {
    try {
      const res = await api.get(`/tasks/${taskId}/subtasks`);
      setExpandedSubtasks((prev) => ({ ...prev, [taskId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubtaskExpansion = (taskId) => {
    if (expandedSubtasks[taskId]) {
      const next = { ...expandedSubtasks };
      delete next[taskId];
      setExpandedSubtasks(next);
    } else {
      fetchSubtasks(taskId);
    }
  };

  const handleAddSubtask = async (taskId) => {
    const title = subtaskInputs[taskId];
    if (!title?.trim()) return;
    try {
      await api.post(`/tasks/${taskId}/subtasks`, { title: title.trim() });
      setSubtaskInputs(prev => ({ ...prev, [taskId]: "" }));
      fetchSubtasks(taskId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (taskId, subtask) => {
    try {
      await api.put(`/tasks/subtasks/${subtask.id}`, { completed: !subtask.completed });
      fetchSubtasks(taskId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      fetchSubtasks(taskId); // Refresh subtasks for the specific task
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateSubtasksAI = async (taskId) => {
    setAiProcessing(prev => ({ ...prev, [taskId]: 'generating_subtasks' }));
    try {
      await api.post(`/tasks/${taskId}/ai/generate-subtasks`);
      fetchSubtasks(taskId); // Refresh subtasks
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate subtasks");
    } finally {
      setAiProcessing(prev => ({ ...prev, [taskId]: null }));
    }
  };

  const handleSmartCategorize = async (taskId) => {
    setAiProcessing(prev => ({ ...prev, [taskId]: 'categorizing' }));
    try {
      await api.post(`/tasks/${taskId}/ai/categorize`);
      loadTasks(); // Refresh all tasks to show updated category
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to categorize task");
    } finally {
      setAiProcessing(prev => ({ ...prev, [taskId]: null }));
    }
  };

  const handleEstimateTime = async (taskId) => {
    setAiProcessing(prev => ({ ...prev, [taskId]: 'estimating' }));
    try {
      await api.post(`/tasks/${taskId}/ai/estimate`);
      loadTasks(); // Refresh all tasks to show updated estimated time
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to estimate time");
    } finally {
      setAiProcessing(prev => ({ ...prev, [taskId]: null }));
    }
  };

  const handleAnalyzeTask = async (taskId) => {
    setAiProcessing(prev => ({ ...prev, [taskId]: 'analyzing' }));
    try {
      await api.get(`/tasks/${taskId}/ai/analyze`);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to analyze task");
    } finally {
      setAiProcessing(prev => ({ ...prev, [taskId]: null }));
    }
  };

  const handleRecommendDeadline = async (taskId) => {
    setAiProcessing(prev => ({ ...prev, [taskId]: 'recommending_deadline' }));
    try {
      await api.post(`/tasks/${taskId}/ai/recommend-deadline`);
      loadTasks(); // Refresh all tasks to show updated due date if applied
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to recommend deadline");
    } finally {
      setAiProcessing(prev => ({ ...prev, [taskId]: null }));
    }
  };

  const onMoveTask = async (task, newBoard) => {
    try {
      await api.put(`/tasks/edit/${task.id}`, { ...task, board: newBoard });
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const addTask = async () => {
    if (!addTaskForm.title.trim()) return;

    try {
      await api.post("/tasks", {
        ...addTaskForm,
        title: addTaskForm.title.trim(),
        recurrence: addTaskForm.recurrence !== "None" ? addTaskForm.recurrence : null,
      });
      
      setAddTaskForm(INITIAL_TASK_STATE);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const performBulkAction = async () => {
    if (selectedTaskIds.length === 0) return;
    setPerformingBulkAction(true);
    try {
      const updates = {};
      if (bulkActionType === "priority") updates.priority = bulkActionValue;
      if (bulkActionType === "category") updates.category = bulkActionValue;
      if (bulkActionType === "board") updates.board = bulkActionValue;
      if (bulkActionType === "status") updates.completed = bulkActionValue === "completed" ? 1 : 0;
      
      await api.taskApi.bulkUpdate(selectedTaskIds, updates);
      setSelectedTaskIds([]);
      setShowBulkActions(false);
      setBulkActionType(null);
      setBulkActionValue("");
      loadTasks();
    } catch (err) {
      console.error("Bulk action failed:", err);
      alert(err.response?.data?.error || "Bulk action failed");
    } finally {
      setPerformingBulkAction(false);
    }
  };

  const deleteBulkTasks = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedTaskIds.length} tasks?`)) return;
    setPerformingBulkAction(true);
    try {
      await api.taskApi.deleteMany(selectedTaskIds);
      setSelectedTaskIds([]);
      setShowBulkActions(false);
      loadTasks();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(err.response?.data?.error || "Bulk delete failed");
    } finally {
      setPerformingBulkAction(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, {
        completed: !task.completed,
      });
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditTask = (task) => {
    setEditingTask({ ...task, recurrence: task.recurrence || "None" });
  };

  const cancelEdit = () => {
    setEditingTask(null);
  };

  const saveEditTask = async () => {
    if (!editingTask.title.trim()) return;

    try {
      await api.put(`/tasks/edit/${editingTask.id}`, {
        ...editingTask,
        title: editingTask.title.trim(),
        recurrence: editingTask.recurrence !== "None" ? editingTask.recurrence : null
      });
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const isTaskOverdue = (task) => {
    if (!task.due_date || task.completed === 1) return false;
    return new Date(task.due_date) < new Date();
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed === 1).length;
  const pendingTasks = tasks.filter((task) => task.completed === 0).length;
  const overdueTasks = tasks.filter(isTaskOverdue).length;
  const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Note: Most filtering (Category, Board, Priority, Status) is handled by the backend.
  // We keep the title search filter here to provide immediate UI feedback while the API debounces.
  const filteredTasks = tasks
    .filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sort === "dueDate") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return (new Date(a.due_date) - new Date(b.due_date)) * direction;
      }
      if (sort === "priority") {
        const rank = (p) => (p === "High" ? 1 : p === "Medium" ? 2 : 3);
        return (rank(a.priority) - rank(b.priority)) * direction;
      }
      if (sort === "newest") return (a.id - b.id) * direction;
      return 0;
    });

  const groupedTasks = useMemo(() => {
    if (groupBy === "None") return { "": filteredTasks };
    return filteredTasks.reduce((acc, task) => {
      const key = task[groupBy] || "Uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [filteredTasks, groupBy]);

  const dueSoonTasks = tasks.filter((task) => {
    if (!task.due_date || task.completed === 1) return false;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  const exportCSV = () => {
    const rows = [
      ["id", "title", "notes", "category", "board", "priority", "due_date", "recurrence", "reminder_date", "reminder_time", "reminder_channel", "completed"],
      ...filteredTasks.map((t) => [
        t.id,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.notes || "").replace(/"/g, '""')}"`,
        t.category || "",
        t.board || "",
        t.priority || "",
        t.due_date || "",
        t.recurrence || "",
        t.reminder_date || "",
        t.reminder_time || "",
        t.reminder_channel || "",
        t.completed === 1 ? "1" : "0",
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTasks = () => {
    window.print();
  };

  return (
    <div className="app-shell" style={{ background: theme.bg, color: theme.text, minHeight: "100vh", transition: "all 0.3s ease" }}>
      {/* ZEN FOCUS OVERLAY */}
      {activeTimerId && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(15, 23, 42, 0.98)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          backdropFilter: "blur(10px)",
          animation: "fadeIn 0.5s ease"
        }}>
          <div style={{ textAlign: "center", maxWidth: "600px", width: "90%" }}>
            <div style={{ color: "#6366f1", fontWeight: "800", letterSpacing: "2px", marginBottom: "20px", textTransform: "uppercase" }}>
              Focusing On
            </div>
            <h2 style={{ fontSize: "42px", margin: "0 0 40px 0", fontWeight: "800" }}>
              {tasks.find(t => t.id === activeTimerId)?.title}
            </h2>
            
            <div style={{ fontSize: "120px", fontWeight: "900", fontFamily: "monospace", margin: "40px 0", color: "#f8fafc" }}>
              {formatTime(timerSeconds)}
            </div>

            <button
              onClick={() => handleStopTracking(activeTimerId)}
              style={{
                background: "#f43f5e",
                color: "white",
                border: "none",
                padding: "16px 48px",
                borderRadius: "50px",
                fontSize: "20px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(244, 63, 94, 0.4)"
              }}
            >
              Finish Session
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 style={{ color: theme.text, fontSize: "28px", fontWeight: "800" }}>
          <span style={{ marginRight: "10px" }}>🚀</span>Cluster Suite
        </h1>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ padding: "8px 12px", borderRadius: 8, background: theme.card, border: `1px solid ${theme.border}`, cursor: "pointer", fontSize: "18px" }}
            title="Toggle Dark Mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
            style={{ padding: "8px 16px", borderRadius: 8, background: darkMode ? "#334155" : "#f1f5f9", border: `1px solid ${theme.border}`, cursor: "pointer", fontWeight: "600", color: theme.text }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="stats-panel">
        <div className="stats-card" style={{ borderTop: "4px solid #6366f1", background: theme.card, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", color: theme.text }}>
          <div style={{ fontSize: 12, color: theme.muted, fontWeight: "600", textTransform: "uppercase" }}>Total</div>
          <div style={{ fontWeight: 800, fontSize: 24 }}>{totalTasks}</div>
        </div>

        <div style={{ padding: 16, border: `1px solid ${theme.border}`, borderRadius: 12, borderTop: "4px solid #10b981", background: theme.card, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 12, color: theme.muted, fontWeight: "600", textTransform: "uppercase" }}>Completed</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#059669" }}>{completedTasks}</div>
        </div>

        <div style={{ padding: 16, border: `1px solid ${theme.border}`, borderRadius: 12, borderTop: "4px solid #f59e0b", background: theme.card, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 12, color: theme.muted, fontWeight: "600", textTransform: "uppercase" }}>Pending</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#d97706" }}>{pendingTasks}</div>
        </div>

        <div style={{ padding: 16, border: `1px solid ${theme.border}`, borderRadius: 12, borderTop: "4px solid #f43f5e", background: darkMode ? "#2d1616" : "#fff1f2", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 12, color: "#f43f5e", fontWeight: "600", textTransform: "uppercase" }}>Overdue</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#e11d48" }}>{overdueTasks}</div>
        </div>

        <div className="stats-card" style={{ borderTop: "4px solid #8b5cf6", background: theme.card, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", color: theme.text }}>
          <div style={{ fontSize: 12, color: "#8b5cf6", fontWeight: "600", textTransform: "uppercase" }}>Efficiency</div>
          <div style={{ fontWeight: 800, fontSize: 24 }}>{productivityScore}%</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: theme.card, padding: "6px", borderRadius: "14px", border: `1px solid ${theme.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          {[
            { id: "tasks", label: "My Tasks", icon: "📝" },
            { id: "kanban", label: "Board View", icon: "📊" },
            { id: "planner", label: "Planner", icon: "📅" },
            { id: "wallet", label: "Wallet", icon: "👛" },
            { id: "analytics", label: "Analytics", icon: "📈" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDashboardTab(tab.id)}
              style={{ 
                padding: "10px 20px", 
                borderRadius: "10px", 
                border: "none", 
                background: activeDashboardTab === tab.id ? "#6366f1" : "transparent", 
                color: activeDashboardTab === tab.id ? "white" : theme.muted, 
                cursor: "pointer", 
                fontWeight: "700", 
                fontSize: "14px",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/dashboard/calendar" style={{ textDecoration: "none" }}>
            <button style={{ padding: "10px 18px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontWeight: "600", cursor: "pointer" }}>📅 Calendar</button>
          </Link>
          <button onClick={exportCSV} style={{ padding: "10px 18px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontWeight: "600", cursor: "pointer" }}>📤 Export</button>
        </div>
      </div>
      
      {activeDashboardTab === "tasks" && (
        <>
          <div className="summary-row" style={{ marginBottom: "24px" }}>
            <div className="stats-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, background: theme.card }}>
              <div style={{ fontSize: 12, color: theme.muted, fontWeight: "600" }}>TODAY</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: theme.text }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div style={{ marginTop: 8, color: theme.muted, fontSize: 14 }}>
                {tasks.filter((task) => task.due_date === new Date().toISOString().slice(0, 10)).length} tasks due today
              </div>
            </div>
            <div style={{ padding: 16, border: `1px solid ${theme.border}`, borderRadius: 12, flex: 1, background: theme.card }}>
              <div style={{ fontSize: 12, color: theme.muted, fontWeight: "600" }}>REMINDERS</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: theme.text }}>{dueSoonTasks.length} Upcoming</div>
              <div style={{ marginTop: 8, color: theme.muted, fontSize: 14 }}>Upcoming due dates in 3 days</div>
              <div style={{ marginTop: 12 }}>
                {dueSoonTasks.slice(0, 3).map((task) => (
                  <div key={task.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{task.title}</span>
                    <span style={{ color: task.priority === "High" ? "#ef4444" : theme.muted, fontSize: 12, fontWeight: 600 }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {dueSoonTasks.length === 0 ? (
                  <div style={{ color: theme.muted, fontSize: 14 }}>No upcoming reminders.</div>
                ) : dueSoonTasks.length > 3 ? (
                  <div style={{ color: theme.muted, fontSize: 12 }}>+{dueSoonTasks.length - 3} more</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <input placeholder="Search Tasks..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "10px", background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px" }} />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterBoard} onChange={(e) => setFilterBoard(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option>All</option>
              {BOARDS.map(b => <option key={b}>{b}</option>)}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option>All</option>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="newest">Newest First</option>
            </select>
            <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px" }}>
              <option value="None">No Grouping</option>
              <option value="category">Group by Category</option>
              <option value="board">Group by Board</option>
              <option value="priority">Group by Priority</option>
            </select>
          </div>

          <div className="dashboard-grid" style={{ marginTop: "10px" }}>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px", gridColumn: "span 2" }}>
              <option value="All">All Tags</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
          <div style={{ background: theme.card, borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "24px", overflow: "hidden" }}>
            <button 
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              style={{ 
                width: "100%", 
                padding: "15px 20px", 
                background: "none", 
                border: "none", 
                color: theme.text, 
                textAlign: "left", 
                cursor: "pointer", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center" 
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px" }}>{isQuickAddOpen ? "Collapse Form" : "＋ Quick Add Task"}</h3>
              <span style={{ fontSize: "12px", color: theme.muted }}>{isQuickAddOpen ? "▲" : "▼"}</span>
            </button>
            
            {isQuickAddOpen && (
              <div style={{ padding: "0 20px 20px 20px" }}>
          <div
            style={{
              display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginBottom: "12px",
            }}
          >
            <input
              placeholder="Task Title"
              value={addTaskForm.title}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                style={{ gridColumn: "span 2", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />

            <select
              value={addTaskForm.category}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, category: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <select
              value={addTaskForm.board}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, board: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {BOARDS.map(b => <option key={b}>{b}</option>)}
            </select>

            <select
              value={addTaskForm.priority}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, priority: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>

            <input
              type="date"
              value={addTaskForm.due_date}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, due_date: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />
          </div>

            <textarea
              rows="2"
              placeholder="Add notes or context for this task"
              value={addTaskForm.notes}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, notes: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                background: theme.input,
                color: theme.text,
                marginBottom: "12px",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "20px", alignItems: "end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.muted, fontSize: "13px" }}>
                <span>Recurrence:</span>
            <select
              value={addTaskForm.recurrence}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, recurrence: e.target.value })}
                  style={{ padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {RECURRENCE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.muted, fontSize: "13px" }}>
                <span>Reminder:</span>
            <input
              type="date"
              value={addTaskForm.reminder_date}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, reminder_date: e.target.value })}
                  style={{ padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />

            <input
              type="time"
              value={addTaskForm.reminder_time}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, reminder_time: e.target.value })}
                  style={{ padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />

            <select 
              value={addTaskForm.reminder_channel} 
              onChange={(e) => setAddTaskForm({ ...addTaskForm, reminder_channel: e.target.value })}
                  style={{ padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {REMINDER_CHANNELS.map(rc => <option key={rc} value={rc}>{rc.toUpperCase()}</option>)}
            </select>
              </div>

            <button
              onClick={addTask}
              style={{
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "10px",
              }}
            >
              Add Task
            </button>
          </div>
          </div>
            )}
          </div>

          {loading && <div style={{ textAlign: "center", padding: "20px", color: "#6366f1", fontWeight: "600" }}>Loading tasks...</div>}

          {!loading && filteredTasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", background: theme.card, borderRadius: "12px", border: `2px dashed ${theme.border}`, color: theme.muted }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>📝</div>
              <h3 style={{ margin: "0 0 8px 0" }}>No tasks found</h3>
              <p style={{ margin: 0 }}>Try adjusting your filters or add a new task above.</p>
            </div>
          )}

          {!loading && Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} style={{ marginBottom: groupBy !== "None" ? "30px" : "0" }}>
              {groupBy !== "None" && groupTasks.length > 0 && (
                <h3 style={{ fontSize: "14px", color: theme.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "15px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "5px" }}>
                  {groupName} <span style={{ fontSize: "12px", fontWeight: "normal", marginLeft: "10px" }}>({groupTasks.length})</span>
                </h3>
              )}
              {groupTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                  saveEditTask={saveEditTask}
                  cancelEdit={cancelEdit}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                  isTaskOverdue={isTaskOverdue}
                  handleStartTracking={handleStartTracking}
                  handleStopTracking={handleStopTracking}
                  activeTimerId={activeTimerId}
                  formatTime={formatTime}
                  timerSeconds={timerSeconds}
                  handleRecommendDeadline={handleRecommendDeadline}
                  aiProcessing={aiProcessing}
                  toggleSubtaskExpansion={toggleSubtaskExpansion}
                  expandedSubtasks={expandedSubtasks}
                  handleGenerateSubtasksAI={handleGenerateSubtasksAI}
                  handleSmartCategorize={handleSmartCategorize}
                  handleEstimateTime={handleEstimateTime}
                  handleAnalyzeTask={handleAnalyzeTask}
                  subtaskInputs={subtaskInputs}
                  setSubtaskInputs={setSubtaskInputs}
                  handleAddSubtask={handleAddSubtask}
                  handleToggleSubtask={handleToggleSubtask}
                  handleDeleteSubtask={handleDeleteSubtask}
                  theme={theme}
                  darkMode={darkMode}
                />
              ))}
            </div>
          ))}
    </>
  )}

  {activeDashboardTab === "planner" && (
    <PlannerTab 
      theme={theme} 
      darkMode={darkMode} 
      aiProcessing={aiProcessing} 
      setAiProcessing={setAiProcessing} 
    />
  )}

  {activeDashboardTab === "wallet" && <WalletTab theme={theme} darkMode={darkMode} />}

  {activeDashboardTab === "analytics" && <AnalyticsTab darkMode={darkMode} />}
  {activeDashboardTab === "kanban" && (
    <KanbanTab 
      tasks={tasks} 
      onToggle={toggleTask} 
      onDelete={deleteTask} 
      onMoveTask={onMoveTask} 
      darkMode={darkMode} 
    />
  )}
</div>
  );
}

export default Dashboard;