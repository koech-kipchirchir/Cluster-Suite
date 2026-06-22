import React, { useState } from "react";
import { aiApi } from "../api";

export default function AIAssistant({ taskId, task }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleGetSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.getSuggestions(taskId);
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setError("Failed to get suggestions: " + err.message);
    }
    setLoading(false);
  };

  const handleAnalyzeTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.analyzeTask(taskId);
      setAnalysis(response.data.analysis);
    } catch (err) {
      setError("Failed to analyze task: " + err.message);
    }
    setLoading(false);
  };

  const handleCategorize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.categorize(taskId);
      setError(null);
      setSuggestions(`Task categorized as: ${response.data.category}`);
    } catch (err) {
      setError("Failed to categorize: " + err.message);
    }
    setLoading(false);
  };

  const handleGenerateSubtasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.generateSubtasks(taskId);
      setSuggestions(
        `Generated ${response.data.subtasks.length} subtasks: \n${response.data.subtasks
          .map((s) => `• ${s.title}`)
          .join("\n")}`
      );
    } catch (err) {
      setError("Failed to generate subtasks: " + err.message);
    }
    setLoading(false);
  };

  const handleEstimateTime = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.estimateTime(taskId);
      setSuggestions(
        `Estimated time: ${response.data.estimatedMinutes} minutes`
      );
    } catch (err) {
      setError("Failed to estimate time: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="ai-assistant">
      <h3>🤖 AI Assistant</h3>

      <div className="ai-buttons">
        <button
          onClick={handleGetSuggestions}
          disabled={loading}
          className="ai-button"
        >
          💡 Suggestions
        </button>
        <button
          onClick={handleAnalyzeTask}
          disabled={loading}
          className="ai-button"
        >
          🔍 Analyze
        </button>
        <button
          onClick={handleCategorize}
          disabled={loading}
          className="ai-button"
        >
          📂 Auto-Categorize
        </button>
        <button
          onClick={handleGenerateSubtasks}
          disabled={loading}
          className="ai-button"
        >
          ✓ Generate Subtasks
        </button>
        <button
          onClick={handleEstimateTime}
          disabled={loading}
          className="ai-button"
        >
          ⏱️ Estimate Time
        </button>
      </div>

      {loading && <p className="loading">🔄 Processing...</p>}

      {error && <p className="error">❌ {error}</p>}

      {suggestions && (
        <div className="ai-result">
          <h4>Suggestions</h4>
          <p>{suggestions}</p>
        </div>
      )}

      {analysis && (
        <div className="ai-result">
          <h4>Analysis</h4>
          <p>{analysis}</p>
        </div>
      )}
    </div>
  );
}
