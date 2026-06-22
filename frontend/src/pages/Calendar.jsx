import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingTasks, setLoadingTasks] = useState(false);

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("default", {
    month: "short",
    day: "numeric",
  });

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const date = task.due_date || "No Date";
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const selectedTasks = tasksByDate[selectedDate] || [];
  const noDateTasks = tasks.filter((task) => !task.due_date && task.completed !== 1);
  const dueSoon = tasks.filter((task) => {
    if (!task.due_date || task.completed === 1) return false;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });
  const totalTasks = tasks.length;

  const monthDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDow = start.getDay();

    const days = [];
    for (let i = 0; i < startDow; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= end.getDate(); day += 1) {
      const fullDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        .toISOString()
        .slice(0, 10);
      days.push(fullDate);
    }
    return days;
  }, [currentMonth]);

  const currentMonthLabel = `${currentMonth.toLocaleString("default", { month: "long" })} ${currentMonth.getFullYear()}`;

  const changeMonth = (offset) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  };

  return (
    <div className="calendar-shell">
      <div className="calendar-header">
        <div>
          <h1 style={{ color: "#1e293b", fontWeight: "800" }}>Calendar & Reminders</h1>
          <p style={{ margin: 0, color: "#64748b" }}>
            Review tasks by due date and see reminders for upcoming work.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "14px", color: "#475569", fontWeight: 600 }}>
            <span>{totalTasks} tasks total</span>
            <span>{dueSoon.length} upcoming</span>
            <span>{noDateTasks.length} undated</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(todayDate);
            }}
          >
            Today · {todayLabel}
          </button>
          <Link to="/dashboard" className="calendar-back-link">
            <button type="button" className="secondary-button">Back to Dashboard</button>
          </Link>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-card">
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#1e293b" }}>Upcoming Reminders</h2>
          {dueSoon.length ? (
            dueSoon.map((task) => (
              <div key={task.id} style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <strong style={{ color: "#334155" }}>{task.title}</strong>
                  <span style={{ color: task.priority === "High" ? "#f43f5e" : "#64748b", fontWeight: "600" }}>
                    {task.due_date}
                  </span>
                </div>
                <div style={{ color: "#666", marginTop: 6 }}>{task.notes || "No notes provided."}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 12, color: "#555" }}>
                  <span>Board: {task.board || "General"}</span>
                  <span>Recurrence: {task.recurrence || "None"}</span>
                  <span>Channel: {task.reminder_channel || "email"}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "#64748b" }}>No reminders in the next 3 days.</div>
          )}
        </div>

        <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ marginTop: 0, fontSize: 18, color: "#1e293b" }}>Calendar</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => changeMonth(-1)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
              >
                Prev
              </button>
              <button
                onClick={() => changeMonth(1)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
              >
                Next
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 12, fontWeight: 800, color: "#4f46e5", fontSize: "1.2rem" }}>{currentMonthLabel}</div>
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {monthDays.map((day, index) => {
              const cellTasks = day ? tasksByDate[day] || [] : [];
              return (
                <button
                  key={day || `empty-${index}`}
                  onClick={() => day && setSelectedDate(day)}
                  disabled={!day}
                  className={`calendar-day-button ${!day ? 'disabled' : ''} ${day === selectedDate ? 'active' : ''} ${day === todayDate ? 'today' : ''}`}
                  type="button"
                >
                  {day ? (
                    <>
                      <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 700 }}>{day.split('-')[2]}</div>
                      {cellTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          style={{
                            background: task.priority === 'High' ? '#fee2e2' : '#e0e7ff',
                            color: task.priority === 'High' ? '#991b1b' : '#3730a3',
                            borderRadius: 4,
                            padding: '2px 4px',
                            fontSize: 10,
                            marginBottom: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {cellTasks.length > 2 ? (
                        <div style={{ fontSize: 10, color: '#777' }}>
                          +{cellTasks.length - 2} more
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fafafa" }}>
            <h3 style={{ marginTop: 0, fontSize: 18 }}>Tasks for {selectedDate}</h3>
            <div style={{ marginBottom: 12, color: "#475569", fontSize: 13 }}>
              {selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"} scheduled
            </div>
            {selectedTasks.length ? (
              selectedTasks.map((task) => (
                <div key={task.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <strong>{task.title}</strong>
                    <span style={{ color: task.priority === "High" ? "#c0392b" : "#444" }}>
                      {task.category} • {task.board || "General"}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: "#555" }}>{task.notes || "No notes"}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: "#555" }}>
                    <span>Priority: {task.priority}</span>
                    <span>Recurrence: {task.recurrence || "None"}</span>
                    <span>Reminder: {task.reminder_date ? `${task.reminder_date} ${task.reminder_time || ""}` : "None"}</span>
                    <span>Channel: {task.reminder_channel || "email"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#64748b" }}>No tasks scheduled for this date.</div>
            )}
            {noDateTasks.length > 0 && (
              <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: 0, fontSize: 16, color: "#334155" }}>Undated Tasks</h4>
                <div style={{ marginTop: 10, color: "#475569", fontSize: 13 }}>
                  {noDateTasks.length} open task{noDateTasks.length === 1 ? "" : "s"} without a due date.
                </div>
                {noDateTasks.slice(0, 3).map((task) => (
                  <div key={task.id} style={{ marginTop: 12, padding: 10, border: "1px solid #f3f4f6", borderRadius: 10, background: "#fafafa" }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>{task.title}</strong>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{task.notes || "No notes available."}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
