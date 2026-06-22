import React, { useState, useEffect } from "react";
import { tagsApi } from "../api";

export default function TagsPanel({ taskId }) {
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchTaskTags();
  }, [taskId]);

  const fetchTags = async () => {
    try {
      const response = await tagsApi.getUserTags();
      setAllTags(response.data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchTaskTags = async () => {
    try {
      const response = await tagsApi.getTaskTags(taskId);
      setTaskTags(response.data);
    } catch (error) {
      console.error("Error fetching task tags:", error);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    setLoading(true);
    try {
      await tagsApi.create(newTag, newTagColor);
      setNewTag("");
      setNewTagColor("#3b82f6");
      fetchTags();
    } catch (error) {
      console.error("Error creating tag:", error);
    }
    setLoading(false);
  };

  const handleAddTagToTask = async (tagId) => {
    try {
      await tagsApi.addToTask(taskId, tagId);
      fetchTaskTags();
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const handleRemoveTagFromTask = async (tagId) => {
    try {
      await tagsApi.removeFromTask(taskId, tagId);
      fetchTaskTags();
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  const isTagAdded = (tagId) =>
    taskTags.some((tag) => tag.id === tagId);

  return (
    <div className="tags-panel">
      <h4>🏷️ Tags</h4>

      <div className="task-tags">
        {taskTags.length === 0 ? (
          <p className="empty-state">No tags yet</p>
        ) : (
          taskTags.map((tag) => (
            <div
              key={tag.id}
              className="tag-badge"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTagFromTask(tag.id)}
                className="tag-remove"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleCreateTag} className="create-tag-form">
        <input
          type="text"
          placeholder="New tag name..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          disabled={loading}
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          Create
        </button>
      </form>

      <div className="available-tags">
        <h5>Available Tags</h5>
        <div className="tags-list">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleAddTagToTask(tag.id)}
              disabled={isTagAdded(tag.id)}
              className={`tag-button ${isTagAdded(tag.id) ? "added" : ""}`}
              style={{ backgroundColor: tag.color }}
            >
              {tag.name} {isTagAdded(tag.id) ? "✓" : "+"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
