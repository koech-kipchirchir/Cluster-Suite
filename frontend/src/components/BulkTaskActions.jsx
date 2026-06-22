import React, { useState } from "react";
import { taskApi } from "../api";
import { formatErrorMessage } from "../utils/uiHelpers";

export const BulkTaskActions = ({ selectedTaskIds, onActionComplete, darkMode }) => {
  const [actionType, setActionType] = useState(null);
  const [newValue, setNewValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  const handleBulkAction = async () => {
    if (!actionType || selectedTaskIds.length === 0) return;

    setIsLoading(true);
    try {
      const updates = {};

      if (actionType === "status") {
        updates.completed = newValue === "complete";
      } else if (actionType === "priority") {
        updates.priority = newValue;
      } else if (actionType === "category") {
        updates.category = newValue;
      } else if (actionType === "board") {
        updates.board = newValue;
      }

      const response = await taskApi.bulkUpdate(selectedTaskIds, updates);
      
      // Success notification
      window.showSuccess?.(`✅ Updated ${selectedTaskIds.length} tasks`);
      onActionComplete();
      
      // Reset form
      setActionType(null);
      setNewValue("");
    } catch (error) {
      const { fullMessage } = formatErrorMessage(error);
      window.showError?.(fullMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedTaskIds.length} tasks? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await taskApi.bulkDelete(selectedTaskIds);
      window.showSuccess?.(`✅ Deleted ${selectedTaskIds.length} tasks`);
      onActionComplete();
    } catch (error) {
      const { fullMessage } = formatErrorMessage(error);
      window.showError?.(fullMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
      className="border rounded-lg p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span style={{ color: theme.text }} className="font-semibold">
          {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={() => {
            setActionType(null);
            setNewValue("");
          }}
          style={{ color: theme.muted }}
          className="hover:text-red-500 transition"
        >
          ✕ Clear
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => { setActionType("status"); setNewValue("complete"); }}
          className={`p-2 rounded-lg font-semibold transition text-sm ${
            actionType === "status" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300"
          }`}
          disabled={isLoading}
        >
          ✓ Mark Complete
        </button>

        <button
          onClick={() => { setActionType("status"); setNewValue("pending"); }}
          className={`p-2 rounded-lg font-semibold transition text-sm ${
            actionType === "status" && newValue === "pending" ? "bg-yellow-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300"
          }`}
          disabled={isLoading}
        >
          ⊙ Mark Pending
        </button>

        <button
          onClick={() => setActionType("priority")}
          className={`p-2 rounded-lg font-semibold transition text-sm ${
            actionType === "priority" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300"
          }`}
          disabled={isLoading}
        >
          ⬆ Set Priority
        </button>

        <button
          onClick={handleBulkDelete}
          className="p-2 rounded-lg font-semibold transition text-sm bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-800"
          disabled={isLoading}
        >
          🗑 Delete All
        </button>
      </div>

      {(actionType === "priority") && (
        <div className="flex gap-2">
          {["High", "Medium", "Low"].map(priority => (
            <button
              key={priority}
              onClick={() => { setNewValue(priority); }}
              className={`px-3 py-2 rounded-lg transition ${
                newValue === priority
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300"
              }`}
              disabled={isLoading}
            >
              {priority}
            </button>
          ))}
        </div>
      )}

      {(actionType === "category" || actionType === "board") && (
        <select
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }}
          className="border rounded-lg p-2 w-full"
          disabled={isLoading}
        >
          <option value="">Select {actionType}...</option>
          {actionType === "category" && ["Work", "Personal", "Health", "Finance"].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          {actionType === "board" && ["To Do", "In Progress", "Done"].map(board => (
            <option key={board} value={board}>{board}</option>
          ))}
        </select>
      )}

      {actionType && (
        <div className="flex gap-3">
          <button
            onClick={handleBulkAction}
            disabled={isLoading || !newValue}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-semibold transition"
          >
            {isLoading ? "Updating..." : "Apply"}
          </button>
          <button
            onClick={() => { setActionType(null); setNewValue(""); }}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
