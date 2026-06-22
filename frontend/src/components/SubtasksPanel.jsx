import React, { useState, useEffect } from "react";
import { subtasksApi } from "../api";

export default function SubtasksPanel({ taskId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubtasks();
  }, [taskId]);

  const fetchSubtasks = async () => {
    try {
      const response = await subtasksApi.getAll(taskId);
      setSubtasks(response.data);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    setLoading(true);
    try {
      await subtasksApi.create(taskId, newSubtask);
      setNewSubtask("");
      fetchSubtasks();
    } catch (error) {
      console.error("Error adding subtask:", error);
    }
    setLoading(false);
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      await subtasksApi.toggle(subtaskId, !completed);
      fetchSubtasks();
    } catch (error) {
      console.error("Error toggling subtask:", error);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await subtasksApi.delete(subtaskId);
      fetchSubtasks();
    } catch (error) {
      console.error("Error deleting subtask:", error);
    }
  };

  return (
    <div className="subtasks-panel">
      <h4>✓ Subtasks ({subtasks.length})</h4>

      <form onSubmit={handleAddSubtask} className="subtask-form">
        <input
          type="text"
          placeholder="Add subtask..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          Add
        </button>
      </form>

      <ul className="subtasks-list">
        {subtasks.map((subtask) => (
          <li
            key={subtask.id}
            className={`subtask-item ${subtask.completed ? "completed" : ""}`}
          >
            <input
              type="checkbox"
              checked={subtask.completed}
              onChange={() =>
                handleToggleSubtask(subtask.id, subtask.completed)
              }
            />
            <span>{subtask.title}</span>
            <button
              onClick={() => handleDeleteSubtask(subtask.id)}
              className="delete-btn"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {subtasks.length === 0 && (
        <p className="empty-state">No subtasks yet</p>
      )}
    </div>
  );
}
