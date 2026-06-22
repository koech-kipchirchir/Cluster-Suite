import React, { useState, useEffect } from "react";
import { plannerApi } from "../api";
import { formatErrorMessage } from "../utils/uiHelpers";

export const EventTemplatesPanel = ({ onEventCreated, darkMode }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await plannerApi.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const handleCreateFromTemplate = async (template) => {
    if (!eventName.trim()) {
      window.showError?.("Please enter an event name");
      return;
    }

    setLoading(true);
    try {
      const newEvent = {
        name: eventName,
        budget_goal: template.defaultBudget,
        type: template.type,
      };

      const eventRes = await plannerApi.createEvent(newEvent);
      const eventId = eventRes.data.id;

      // Create suggested wallets
      for (const wallet of template.suggestedWallets) {
        await plannerApi.createWallet({
          ...wallet,
          event_id: eventId,
        });
      }

      window.showSuccess?.(`✅ Event "${eventName}" created from template!`);
      onEventCreated?.();
      setEventName("");
      setSelectedTemplate(null);
    } catch (error) {
      const { fullMessage } = formatErrorMessage(error);
      window.showError?.(fullMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTemplate) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
            className="border rounded-lg p-4 hover:shadow-lg transition text-left"
          >
            <div className="text-3xl mb-2">{template.icon}</div>
            <h3 style={{ color: theme.text }} className="font-bold mb-1">{template.name}</h3>
            <p style={{ color: theme.muted }} className="text-sm">
              Budget: ${template.defaultBudget.toLocaleString()}
            </p>
            <p style={{ color: theme.muted }} className="text-xs mt-2">
              {template.suggestedWallets.length} wallets included
            </p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-6">
      <button
        onClick={() => setSelectedTemplate(null)}
        style={{ color: theme.muted }}
        className="flex items-center gap-1 mb-4 hover:text-blue-600"
      >
        ← Back to templates
      </button>

      <h2 style={{ color: theme.text }} className="text-2xl font-bold mb-4">
        {selectedTemplate.icon} {selectedTemplate.name}
      </h2>

      <input
        type="text"
        placeholder="Enter event name..."
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }}
        className="w-full border rounded-lg p-3 mb-4"
      />

      <div className="mb-6">
        <h3 style={{ color: theme.text }} className="font-semibold mb-3">Suggested Wallets:</h3>
        <div className="space-y-2">
          {selectedTemplate.suggestedWallets.map((wallet, idx) => (
            <div key={idx} style={{ backgroundColor: theme.bg }} className="p-3 rounded-lg flex justify-between">
              <span style={{ color: theme.text }}>{wallet.name}</span>
              <span style={{ color: theme.muted }} className="font-semibold">${wallet.targetAmount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleCreateFromTemplate(selectedTemplate)}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
        >
          {loading ? "Creating..." : "Create Event"}
        </button>
        <button
          onClick={() => setSelectedTemplate(null)}
          className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Gantt Chart Component
export const GanttChartView = ({ events, darkMode }) => {
  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  const today = new Date();
  const getMonthsDiff = (start, end) => {
    return (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30);
  };

  return (
    <div style={{ backgroundColor: theme.card }} className="rounded-lg p-4 overflow-x-auto">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">Event Timeline (Gantt Chart)</h3>
      
      {events.length === 0 ? (
        <p style={{ color: theme.muted }}>No events with dates to display</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const startDate = new Date(event.start_date || event.created_at);
            const endDate = new Date(event.end_date);
            const daysFromToday = (endDate - today) / (1000 * 60 * 60 * 24);
            const progressPercent = Math.min(100, Math.max(0, (event.current_savings / (event.budget_goal || 1)) * 100));

            return (
              <div key={event.id} className="space-y-1">
                <div className="flex justify-between items-start">
                  <span style={{ color: theme.text }} className="font-semibold text-sm">{event.name}</span>
                  <span style={{ color: theme.muted }} className="text-xs">
                    {daysFromToday > 0 ? `${Math.round(daysFromToday)} days left` : "Overdue"}
                  </span>
                </div>
                
                <div style={{ backgroundColor: theme.bg }} className="rounded h-6 overflow-hidden border" style={{ borderColor: theme.border }}>
                  <div
                    style={{ width: `${progressPercent}%`, backgroundColor: progressPercent >= 100 ? "#10b981" : "#3b82f6" }}
                    className="h-full transition-all duration-300 flex items-center justify-end pr-2"
                  >
                    <span style={{ color: progressPercent >= 100 ? "#10b981" : "transparent" }} className="text-xs font-bold">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
