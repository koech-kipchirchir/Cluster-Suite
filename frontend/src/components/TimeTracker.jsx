import React, { useState, useEffect } from "react";
import { timeTrackingApi } from "../api";

export default function TimeTracker({ taskId, initialTimeSpent = 0, isTracking = false }) {
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setSessionMinutes((prev) => prev + 1);
      }, 60000); // Update every minute
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartTracking = async () => {
    setLoading(true);
    try {
      await timeTrackingApi.start(taskId);
      setIsRunning(true);
      setSessionMinutes(0);
    } catch (error) {
      console.error("Error starting time tracking:", error);
    }
    setLoading(false);
  };

  const handleStopTracking = async () => {
    setLoading(true);
    try {
      await timeTrackingApi.stop(taskId, sessionMinutes || 1);
      setIsRunning(false);
      setTimeSpent(timeSpent + sessionMinutes);
      setSessionMinutes(0);
    } catch (error) {
      console.error("Error stopping time tracking:", error);
    }
    setLoading(false);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="time-tracker">
      <h4>⏱️ Time Tracking</h4>

      <div className="time-display">
        <div className="total-time">
          <span className="label">Total Time:</span>
          <span className="value">{formatTime(timeSpent)}</span>
        </div>

        {isRunning && (
          <div className="session-time">
            <span className="label">Session:</span>
            <span className="value pulse">{formatTime(sessionMinutes)}</span>
          </div>
        )}
      </div>

      <div className="time-buttons">
        {!isRunning ? (
          <button
            onClick={handleStartTracking}
            disabled={loading}
            className="start-btn"
          >
            ▶️ Start
          </button>
        ) : (
          <button
            onClick={handleStopTracking}
            disabled={loading}
            className="stop-btn"
          >
            ⏹️ Stop & Save
          </button>
        )}
      </div>

      <div className="time-input">
        <label>Quick Add (minutes):</label>
        <input
          type="number"
          min="0"
          max="1440"
          placeholder="Add minutes manually"
          onBlur={(e) => {
            const mins = parseInt(e.target.value) || 0;
            if (mins > 0) {
              timeTrackingApi
                .stop(taskId, mins)
                .then(() => {
                  setTimeSpent(timeSpent + mins);
                  e.target.value = "";
                })
                .catch(console.error);
            }
          }}
        />
      </div>
    </div>
  );
}
