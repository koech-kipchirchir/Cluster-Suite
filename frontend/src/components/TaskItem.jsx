import React from "react";
import { CATEGORIES, BOARDS, PRIORITIES, RECURRENCE_OPTIONS, REMINDER_CHANNELS } from "../constants/taskConstants";

export default function TaskItem({
  task,
  editingTask,
  setEditingTask,
  saveEditTask,
  cancelEdit,
  toggleTask,
  deleteTask,
  isTaskOverdue,
  handleStartTracking,
  handleStopTracking,
  activeTimerId,
  formatTime,
  timerSeconds,
  handleRecommendDeadline,
  aiProcessing,
  toggleSubtaskExpansion,
  expandedSubtasks,
  handleGenerateSubtasksAI,
  handleSmartCategorize, // This is not used in the current diff, but was in the original Dashboard.jsx
  handleEstimateTime,
  handleAnalyzeTask,
  subtaskInputs,
  setSubtaskInputs,
  handleAddSubtask,
  handleToggleSubtask,
  handleDeleteSubtask,
  theme,
  darkMode,
}) {
  return (
    <div
      key={task.id}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "10px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: darkMode ? "0 4px 6px -1px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
        backgroundColor: task.completed === 1 ? (darkMode ? "#111827" : "#f1f5f9") : theme.card,
        opacity: task.completed === 1 ? 0.8 : 1,
        ...(isTaskOverdue(task) ? { borderLeft: "6px solid #f43f5e", backgroundColor: darkMode ? "#2d1616" : "#fff1f2" } : {}),
        ...(task.priority === "High" && task.completed !== 1 && !isTaskOverdue(task) ? { borderLeft: "6px solid #f43f5e" } : {}),
        ...(task.priority === "Medium" && task.completed !== 1 && !isTaskOverdue(task) ? { borderLeft: "6px solid #f59e0b" } : {}),
      }}
    >
      {editingTask?.id === task.id ? (
        <div>
          <input
            value={editingTask.title}
            onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`, background: theme.input, color: theme.text
            }}
          />

          <textarea
            rows="3"
            value={editingTask.notes}
            onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`, background: theme.input, color: theme.text
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <select
              value={editingTask.category}
              onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <select
              value={editingTask.board}
              onChange={(e) => setEditingTask({ ...editingTask, board: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {BOARDS.map(b => <option key={b}>{b}</option>)}
            </select>

            <select
              value={editingTask.priority}
              onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>

            <input
              type="date"
              value={editingTask.due_date}
              onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <select
              value={editingTask.recurrence}
              onChange={(e) => setEditingTask({ ...editingTask, recurrence: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {RECURRENCE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>

            <input
              type="date"
              value={editingTask.reminder_date}
              onChange={(e) => setEditingTask({ ...editingTask, reminder_date: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />

            <input
              type="time"
              value={editingTask.reminder_time}
              onChange={(e) => setEditingTask({ ...editingTask, reminder_time: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            />

            <select
              value={editingTask.reminder_channel}
              onChange={(e) => setEditingTask({ ...editingTask, reminder_channel: e.target.value })}
              style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
            >
              {REMINDER_CHANNELS.map(rc => <option key={rc} value={rc}>{rc.toUpperCase()}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: "16px" }}>
            <button
              onClick={saveEditTask}
              style={{ background: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", padding: "8px 16px" }}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              style={{ background: theme.bg, border: `1px solid ${theme.border}`, padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: theme.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="checkbox"
              checked={task.completed === 1}
              onChange={() => toggleTask(task)}
            />

            <strong style={{ flex: 1, textDecoration: task.completed === 1 ? "line-through" : "none", color: task.completed === 1 ? theme.muted : "inherit" }}>{task.title}</strong>

            {task.priority === "High" && task.completed !== 1 ? (
              <span style={{
                background: "#f43f5e",
                color: "white",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                marginRight: 8,
              }}>High</span>
            ) : null}

            <button
              onClick={() => activeTimerId === task.id ? handleStopTracking(task.id) : handleStartTracking(task.id)}
              style={{
                background: activeTimerId === task.id ? "#f43f5e" : "#10b981",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {activeTimerId === task.id ? `Stop (${formatTime(timerSeconds)})` : "Start Focus"}
            </button>

            <button
              onClick={() => handleRecommendDeadline(task.id)}
              disabled={aiProcessing[task.id] === 'recommending_deadline'}
              style={{
                background: "#fdf2f8",
                color: "#db2777",
                border: "1px solid #fbcfe8",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600"
              }}
            >
              {aiProcessing[task.id] === 'recommending_deadline' ? 'Suggesting...' : '✨ Suggest Date'}
            </button>

            <button
              onClick={() => toggleSubtaskExpansion(task.id)}
              style={{ background: darkMode ? "#334155" : "#f1f5f9", border: `1px solid ${theme.border}`, padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: theme.text }}
            >
              {expandedSubtasks[task.id] ? "Hide Subtasks" : `Subtasks (${task.subtask_count || 0})`}
            </button>

            <div style={{ display: "flex", gap: "4px", background: darkMode ? "#1e293b" : "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
              <button title="AI Analyze" onClick={() => handleAnalyzeTask(task.id)} disabled={aiProcessing[task.id]} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: "14px", opacity: aiProcessing[task.id] ? 0.5 : 1 }}>🔍</button>
              <button title="AI Subtasks" onClick={() => handleGenerateSubtasksAI(task.id)} disabled={aiProcessing[task.id]} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: "14px" }}>🪄</button>
              <button title="AI Estimate" onClick={() => handleEstimateTime(task.id)} disabled={aiProcessing[task.id]} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: "14px" }}>⏱️</button>
              <button title="AI Categorize" onClick={() => handleSmartCategorize(task.id)} disabled={aiProcessing[task.id]} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: "14px" }}>🗂️</button>
            </div>

            <button onClick={() => setEditingTask({ ...task, recurrence: task.recurrence || "None" })} style={{ background: "none", color: "#6366f1", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              Edit
            </button>

            <button onClick={() => deleteTask(task.id)} style={{ background: "none", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "13px" }}>
              Delete
            </button>
          </div>

          {task.subtask_count > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.muted, marginBottom: "4px" }}>
                <span>Subtask Progress</span>
                <span>{task.completed_subtask_count} / {task.subtask_count}</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: theme.border, borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  width: `${(task.completed_subtask_count / task.subtask_count) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #6366f1, #a855f7)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {task.time_spent_minutes > 0 && (
              <span style={{ fontSize: "12px", padding: "2px 8px", background: darkMode ? "#0c4a6e" : "#e0f2fe", borderRadius: "12px", color: darkMode ? "#7dd3fc" : "#0369a1", fontWeight: "600" }}>
                ⏱️ {task.time_spent_minutes}m spent
              </span>
            )}
            <span style={{ fontSize: "12px", padding: "2px 8px", background: darkMode ? "#334155" : "#f1f5f9", borderRadius: "12px", color: theme.text }}>📁 {task.category}</span>
            <span style={{ fontSize: "12px", padding: "2px 8px", background: darkMode ? "#334155" : "#f1f5f9", borderRadius: "12px", color: theme.text }}>🗂️ {task.board || "General"}</span>
            <span style={{
              fontSize: "12px",
              padding: "2px 8px",
              background: task.priority === "High" ? "#fee2e2" : task.priority === "Medium" ? "#fef3c7" : "#f1f5f9",
              borderRadius: "12px",
              color: task.priority === "High" ? "#991b1b" : task.priority === "Medium" ? "#92400e" : "#475569"
            }}>⚡ {task.priority}</span>
            <span style={{ fontSize: "12px", padding: "2px 8px", background: darkMode ? "#334155" : "#f1f5f9", borderRadius: "12px", color: theme.text }}>📅 {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Due Date"}</span>
          </div>

          {task.notes && (
            <div style={{
              marginTop: "12px",
              fontSize: "14px",
              color: theme.muted,
              background: darkMode ? "#0f172a" : "#f8fafc",
              padding: "8px 12px",
              borderRadius: "6px",
              borderLeft: `3px solid ${theme.border}`
            }}>
              {task.notes}
            </div>
          )}

          {task.ai_insights && (
            <div style={{ marginTop: "12px", fontSize: "13px", color: darkMode ? "#e0e7ff" : "#1e1b4b", background: darkMode ? "#312e81" : "#e0e7ff", padding: "10px", borderRadius: "8px", border: `1px solid ${darkMode ? "#4338ca" : "#c7d2fe"}` }}>
              <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", color: darkMode ? "#818cf8" : "#4338ca" }}>✨ AI Insights</div>
              {task.ai_insights}
            </div>
          )}

          {expandedSubtasks[task.id] && (
            <div style={{ marginTop: "16px", padding: "12px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
              <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "10px", color: theme.muted }}>Subtasks</div>
              {expandedSubtasks[task.id].map(st => (
                <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <input type="checkbox" checked={st.completed === 1} onChange={() => handleToggleSubtask(task.id, st)} />
                  <span style={{ fontSize: "13px", textDecoration: st.completed === 1 ? "line-through" : "none", color: st.completed === 1 ? "#94a3b8" : theme.text }}>{st.title}</span>
                  <button onClick={() => handleDeleteSubtask(task.id, st.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "10px", padding: "2px 4px" }}>
                    ✕
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <input
                  placeholder="New subtask..."
                  value={subtaskInputs[task.id] || ""}
                  onChange={(e) => setSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                  style={{ flex: 1, padding: "6px", borderRadius: "4px", border: `1px solid ${theme.border}`, background: darkMode ? "#1e293b" : "#f8fafc", color: theme.text, fontSize: "12px" }}
                />
                <button onClick={() => handleAddSubtask(task.id)} style={{ padding: "4px 10px", borderRadius: "4px", border: "none", background: "#6366f1", color: "white", fontSize: "12px", cursor: "pointer" }}>Add</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "10px", fontSize: "11px", color: theme.muted, display: "flex", gap: "12px" }}>
            {task.recurrence && <span>🔁 {task.recurrence}</span>}
            {task.reminder_date && <span>⏰ {task.reminder_date} {task.reminder_time} ({task.reminder_channel})</span>}
          </div>
        </>
      )}
    </div>
  );
}