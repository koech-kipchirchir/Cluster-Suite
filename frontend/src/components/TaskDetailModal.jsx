import React, { useState } from "react";
import AIAssistant from "./AIAssistant";
import SubtasksPanel from "./SubtasksPanel";
import TagsPanel from "./TagsPanel";
import TimeTracker from "./TimeTracker";

export default function TaskDetailModal({ task, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("details"); // details, subtasks, tags, ai, time

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            📋 Details
          </button>
          <button
            className={`tab-btn ${activeTab === "subtasks" ? "active" : ""}`}
            onClick={() => setActiveTab("subtasks")}
          >
            ✓ Subtasks
          </button>
          <button
            className={`tab-btn ${activeTab === "tags" ? "active" : ""}`}
            onClick={() => setActiveTab("tags")}
          >
            🏷️ Tags
          </button>
          <button
            className={`tab-btn ${activeTab === "time" ? "active" : ""}`}
            onClick={() => setActiveTab("time")}
          >
            ⏱️ Time
          </button>
          <button
            className={`tab-btn ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            🤖 AI
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "details" && (
            <div className="task-details">
              <div className="detail-row">
                <span className="label">📁 Category:</span>
                <span className="value">{task.category}</span>
              </div>
              <div className="detail-row">
                <span className="label">🗂️ Board:</span>
                <span className="value">{task.board}</span>
              </div>
              <div className="detail-row">
                <span className="label">⚡ Priority:</span>
                <span className="value">{task.priority}</span>
              </div>
              <div className="detail-row">
                <span className="label">📅 Due Date:</span>
                <span className="value">{task.due_date || "No deadline"}</span>
              </div>
              <div className="detail-row">
                <span className="label">🔁 Recurrence:</span>
                <span className="value">{task.recurrence || "None"}</span>
              </div>
              <div className="detail-row">
                <span className="label">⏰ Reminder:</span>
                <span className="value">
                  {task.reminder_date ? `${task.reminder_date} ${task.reminder_time || ""}` : "Not set"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">📬 Channel:</span>
                <span className="value">{task.reminder_channel}</span>
              </div>
              {task.notes && (
                <div className="detail-row">
                  <span className="label">📝 Notes:</span>
                  <span className="value">{task.notes}</span>
                </div>
              )}
              {task.ai_insights && (
                <div className="detail-row">
                  <span className="label">💡 AI Insights:</span>
                  <span className="value">{task.ai_insights}</span>
                </div>
              )}
              {task.estimated_minutes && (
                <div className="detail-row">
                  <span className="label">⏱️ Estimated Time:</span>
                  <span className="value">{task.estimated_minutes} minutes</span>
                </div>
              )}
              {task.time_spent_minutes > 0 && (
                <div className="detail-row">
                  <span className="label">✓ Time Spent:</span>
                  <span className="value">{Math.floor(task.time_spent_minutes / 60)}h {task.time_spent_minutes % 60}m</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "subtasks" && <SubtasksPanel taskId={task.id} />}

          {activeTab === "tags" && <TagsPanel taskId={task.id} />}

          {activeTab === "time" && (
            <TimeTracker
              taskId={task.id}
              initialTimeSpent={task.time_spent_minutes || 0}
              isTracking={task.is_tracking}
            />
          )}

          {activeTab === "ai" && <AIAssistant taskId={task.id} task={task} />}
        </div>
      </div>
    </div>
  );
}
