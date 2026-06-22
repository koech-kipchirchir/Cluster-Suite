import React from 'react';

export default function KanbanTab({ tasks, onToggle, onDelete, onMoveTask, darkMode }) {
  const boards = ["General", "Planning", "Execution", "Review"];

  const getTasksByBoard = (boardName) => {
    return tasks.filter(task => (task.board || "General") === boardName);
  };

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, boardName) => {
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    const task = tasks.find(t => t.id === taskId);
    if (task) onMoveTask(task, boardName);
  };

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
      gap: "20px", 
      alignItems: "start",
      marginTop: "10px"
    }}>
      {boards.map(board => (
        <div 
          key={board} 
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, board)}
          style={{ 
            background: darkMode ? "#1e293b" : "#f1f5f9", 
            borderRadius: "12px", 
            padding: "16px", 
            minHeight: "500px",
            border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`
          }}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "16px" 
          }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: darkMode ? "#f1f5f9" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {board}
            </h3>
            <span style={{ background: "#cbd5e1", color: "#475569", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" }}>
              {getTasksByBoard(board).length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {getTasksByBoard(board).map(task => (
              <div 
                key={task.id} 
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                style={{ 
                  background: darkMode ? "#0f172a" : "white", 
                  padding: "16px", 
                  borderRadius: "8px", 
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: task.priority === "High" ? "4px solid #f43f5e" : task.priority === "Medium" ? "4px solid #f59e0b" : "4px solid #6366f1",
                  opacity: task.completed === 1 ? 0.7 : 1,
                  cursor: "grab"
                }}
              >
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <input 
                    type="checkbox" 
                    checked={task.completed === 1} 
                    onChange={() => onToggle(task)} 
                  />
                  <strong style={{ 
                    fontSize: "14px", 
                    color: darkMode ? "#f1f5f9" : "#1e293b", 
                    textDecoration: task.completed === 1 ? "line-through" : "none" 
                  }}>
                    {task.title}
                  </strong>
                </div>

                {task.notes && (
                  <p style={{ fontSize: "12px", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                    {task.notes.length > 60 ? task.notes.substring(0, 60) + "..." : task.notes}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <select 
                      value={board} 
                      onChange={(e) => onMoveTask(task, e.target.value)}
                      style={{ 
                        fontSize: "11px", 
                        padding: "2px 4px", 
                        borderRadius: "4px", 
                        border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                        background: darkMode ? "#1e293b" : "#f8fafc",
                        color: darkMode ? "#94a3b8" : "#64748b",
                        cursor: "pointer"
                      }}
                    >
                      {boards.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => onDelete(task.id)}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "#94a3b8", 
                      cursor: "pointer", 
                      fontSize: "12px",
                      padding: "4px"
                    }}
                    onMouseOver={(e) => e.target.style.color = "#ef4444"}
                    onMouseOut={(e) => e.target.style.color = "#94a3b8"}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}