import React, { useEffect, useState } from "react";
import { taskAnalyticsApi, plannerAnalyticsApi, userApi } from "../api";
import { formatCurrency } from "../utils/uiHelpers";

// Savings Velocity Chart
export const SavingsVelocityChart = ({ darkMode }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('KES');

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // load user currency preference
    (async () => {
      try {
        const profileRes = await userApi.getProfile();
        setCurrency(profileRes.data?.currency || 'KES');
      } catch (err) {
        // ignore, default to KES
      }
    })();
  }, []);

  const loadData = async () => {
    try {
      const response = await plannerAnalyticsApi.getSavingsVelocity();
      setData(response.data || []);
    } catch (error) {
      console.error("Failed to load savings velocity:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: theme.muted }}>Loading...</div>;

  const maxSavings = Math.max(...data.map(d => d.total_savings || 0), 1);

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-4">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">📈 Savings Velocity</h3>
      
      {data.length === 0 ? (
        <p style={{ color: theme.muted }}>No savings data yet</p>
      ) : (
        <div className="space-y-3">
          {data.slice(-8).map((point, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span style={{ color: theme.muted }} className="text-sm">{point.week}</span>
                <span style={{ color: theme.text }} className="font-semibold">{formatCurrency(point.total_savings, currency)}</span>
              </div>
              <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded h-2 overflow-hidden">
                <div
                  style={{
                    width: `${(point.total_savings / maxSavings) * 100}%`,
                    backgroundColor: "#10b981"
                  }}
                  className="h-full transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Task Completion Trends
export const CompletionTrendsChart = ({ darkMode }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await taskAnalyticsApi.getCompletionTrends();
      setData(response.data || []);
    } catch (error) {
      console.error("Failed to load completion trends:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: theme.muted }}>Loading...</div>;

  const maxTasks = Math.max(...data.map(d => d.completed_tasks_count || 0), 1);

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-4">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">✓ Task Completion Trends</h3>
      
      {data.length === 0 ? (
        <p style={{ color: theme.muted }}>No completion data yet</p>
      ) : (
        <div className="space-y-3">
          {data.slice(-7).map((point, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span style={{ color: theme.muted }} className="text-sm">{point.completion_date}</span>
                <span style={{ color: theme.text }} className="font-semibold">{point.completed_tasks_count} tasks</span>
              </div>
              <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded h-2 overflow-hidden">
                <div
                  style={{
                    width: `${(point.completed_tasks_count / maxTasks) * 100}%`,
                    backgroundColor: "#3b82f6"
                  }}
                  className="h-full transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Event Forecast
export const EventForecastCard = ({ darkMode }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('KES');

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadData();
    (async () => {
      try {
        const profileRes = await userApi.getProfile();
        setCurrency(profileRes.data?.currency || 'KES');
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  const loadData = async () => {
    try {
      const response = await plannerAnalyticsApi.getEventForecast();
      setEvents(response.data || []);
    } catch (error) {
      console.error("Failed to load event forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: theme.muted }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-4">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">🎯 Event Forecast</h3>
      
      {events.length === 0 ? (
        <p style={{ color: theme.muted }}>No events with target dates</p>
      ) : (
        <div className="space-y-4">
          {events.slice(0, 5).map((event) => (
            <div key={event.event_id} style={{ backgroundColor: theme.bg }} className="p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span style={{ color: theme.text }} className="font-semibold text-sm">{event.event_name}</span>
                <span className={`text-xs px-2 py-1 rounded ${event.on_track ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                  {event.on_track ? "✓ On Track" : "⚠ Behind"}
                </span>
              </div>
              
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: theme.muted }}>Saved: {formatCurrency(event.current_savings, currency)} / {formatCurrency(event.budget_goal, currency)}</span>
                <span style={{ color: theme.muted }}>Projected: {event.projected_completion || "N/A"}</span>
              </div>
              
              <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded h-2 overflow-hidden">
                <div
                  style={{
                    width: `${event.progress_percent}%`,
                    backgroundColor: event.on_track ? "#10b981" : "#f59e0b"
                  }}
                  className="h-full transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Busiest Times/Days
export const BusiestTimesCard = ({ darkMode }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await taskAnalyticsApi.getBustiestTimes();
      setData(response.data || []);
    } catch (error) {
      console.error("Failed to load busiest times:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: theme.muted }}>Loading...</div>;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxCompletions = Math.max(...data.map(d => d.completion_count || 0), 1);

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-4">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">🔥 Busiest Days</h3>
      
      {data.length === 0 ? (
        <p style={{ color: theme.muted }}>No completion patterns detected</p>
      ) : (
        <div className="flex gap-2 justify-between">
          {dayNames.map((day, idx) => {
            const dayData = data.find(d => parseInt(d.day_of_week) === idx);
            const count = dayData?.completion_count || 0;
            const percent = count > 0 ? (count / maxCompletions) * 100 : 0;
            
            return (
              <div key={day} className="flex-1 flex flex-col items-center">
                <div
                  style={{ height: `${Math.max(20, percent)}px`, backgroundColor: count > 0 ? "#3b82f6" : theme.border }}
                  className="w-full rounded-t transition-all"
                />
                <span style={{ color: theme.muted }} className="text-xs mt-2">{day}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Time Estimate vs Actual
export const TimeAnalysisCard = ({ darkMode }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const theme = {
    bg: darkMode ? "#0b0f1a" : "#f1f5f9",
    card: darkMode ? "#161e2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await taskAnalyticsApi.getTimeAnalysis();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load time analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: theme.muted }}>Loading...</div>;

  if (!stats || stats.total_tasks === 0) {
    return <div style={{ color: theme.muted }}>Not enough data</div>;
  }

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-lg p-4">
      <h3 style={{ color: theme.text }} className="font-bold mb-4">⏱ Time Estimates vs Actual</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div style={{ backgroundColor: theme.bg }} className="p-3 rounded-lg text-center">
          <span style={{ color: theme.muted }} className="text-sm">Avg Estimated</span>
          <p style={{ color: theme.text }} className="text-xl font-bold mt-1">
            {Math.round(stats.avg_estimated || 0)} min
          </p>
        </div>
        
        <div style={{ backgroundColor: theme.bg }} className="p-3 rounded-lg text-center">
          <span style={{ color: theme.muted }} className="text-sm">Avg Actual</span>
          <p style={{ color: theme.text }} className="text-xl font-bold mt-1">
            {Math.round(stats.avg_actual || 0)} min
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: theme.bg }} className="p-3 rounded-lg text-center mt-3">
        <span style={{ color: theme.muted }} className="text-sm">Avg Difference</span>
        <p style={{ color: theme.text }} className="text-lg font-bold mt-1">
          ±{Math.round(stats.avg_difference || 0)} min
        </p>
      </div>
    </div>
  );
};
