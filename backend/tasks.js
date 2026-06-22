const express = require("express");
const router = express.Router();

// Changed: Import the wrapper object directly
const dbAsync = require("./utils/db-async"); 
const auth = require("./middleware/auth");
const llmService = require("./services/llmService");

// ========================
// TASK CRUD ENDPOINTS
// ========================

// GET ALL TASKS FOR LOGGED-IN USER
router.get("/", auth, async (req, res, next) => {
  const { search, category, board, priority, status, sort, tag } = req.query;
  
  // Changed column mapping: user_id -> userId
  const filters = ["user_id = ?"];
  const params = [req.user.id];

  if (search) {
    filters.push("LOWER(title) LIKE ?");
    params.push(`%${search.toLowerCase()}%`);
  }

  if (category && category !== "All") {
    filters.push("category = ?");
    params.push(category);
  }

  if (board && board !== "All") {
    filters.push("board = ?");
    params.push(board);
  }

  if (priority && priority !== "All") {
    filters.push("priority = ?");
    params.push(priority);
  }

  // Changed column mapping: completed -> status evaluation
  if (status === "Pending") {
    filters.push("completed = 0");
  } else if (status === "Completed") {
    filters.push("completed = 1");
  } else if (status !== "All") {
    // If status is something else, it's likely an invalid filter or a future status not yet implemented
    // For now, we'll ignore it or you might want to throw an error.
  }

  // Main task list query with matching camelCase column targets
  let query = `
    SELECT tasks.*, 
      (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = tasks.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = tasks.id AND completed = 1) as completed_subtask_count,
      (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', t.id, 'name', t.name, 'color', t.color))
       FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = tasks.id) AS tags_json
    FROM tasks 
    WHERE ${filters.join(" AND ")}
  `;

  // Handle tag filtering
  if (tag && tag !== "All") {
    query = `
      SELECT DISTINCT tasks.*, 
        (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = tasks.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = tasks.id AND completed = 1) as completed_subtask_count,
        (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', t.id, 'name', t.name, 'color', t.color))
         FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = tasks.id) AS tags_json
      FROM tasks
      LEFT JOIN task_tags ON tasks.id = task_tags.task_id
      LEFT JOIN tags ON task_tags.tag_id = tags.id
      WHERE ${filters.join(" AND ")} AND tags.name = ?
    `;
    params.push(tag);
  }

  // Changed column mapping: due_date -> dueDate
  let orderBy = "ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC";
  if (sort === "priority") {
    orderBy = "ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END";
  } else if (sort === "newest") {
    orderBy = "ORDER BY id DESC";
  }

  query += ` ${orderBy}`;

  try {
    // Changed: Call via dbAsync.all()
    const rows = await dbAsync.all(query, params);
    res.json(rows);
  } catch (err) {
    next(err); 
  }
});

// ADD TASK
router.post("/", auth, async (req, res, next) => {
  const {
    title,
    notes, // Changed from description to notes
    category,
    board,
    priority,
    completed, // Changed from status to completed
    due_date, // Changed from dueDate to due_date
    recurrence,
    reminder_date,
    reminder_time,
    reminder_channel,
    estimated_minutes,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Task title is required" });
  }
  try {
    // Changed: Matching the exact automated schema definition parameters
    const result = await dbAsync.run(
      `INSERT INTO tasks (title, notes, category, board, priority, completed, due_date, recurrence, reminder_date, reminder_time, reminder_channel, estimated_minutes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        notes || null,
        category || "All",
        board || "All",
        priority || "Medium",
        completed ? 1 : 0, // Map boolean completed to 0 or 1
        due_date || null,
        recurrence || null,
        reminder_date || null,
        reminder_time || null,
        reminder_channel || "email",
        estimated_minutes || null,
        req.user.id,
      ]
    );
    res.json({
      id: result.id, // Changed: result.id from the custom Promise wrapper
      message: "Task Added",
    });
  } catch (err) {
    next(err);
  }
});

// BULK CREATE TASKS
router.post("/bulk", auth, async (req, res, next) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ message: "tasks array is required and must not be empty" });
  }
  try {
    const created = [];
    for (const task of tasks) {
      const result = await dbAsync.run(
        `INSERT INTO tasks (title, notes, category, board, priority, completed, due_date, recurrence, reminder_date, reminder_time, reminder_channel, estimated_minutes, user_id, event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.title?.trim() || "Untitled Task",
          task.notes || null,
          task.category || "All",
          task.board || "All",
          task.priority || "Medium",
          task.completed ? 1 : 0,
          task.due_date || null,
          task.recurrence || null,
          task.reminder_date || null,
          task.reminder_time || null,
          task.reminder_channel || "email",
          task.estimated_minutes || null,
          req.user.id,
          task.event_id || null,
        ]
      );
      created.push({ id: result.id, title: task.title });
    }
    res.json({ message: `${created.length} tasks created`, tasks: created });
  } catch (err) {
    next(err);
  }
});

// BULK UPDATE TASKS (status, priority, etc.)
router.put("/bulk", auth, async (req, res, next) => {
  const { task_ids, updates } = req.body;
  if (!Array.isArray(task_ids) || !task_ids.length || !updates) {
    return res.status(400).json({ message: "task_ids array and updates object required" });
  }
  try {
    const updated = [];
    for (const taskId of task_ids) {
      const setClauses = [];
      const params = [];
      
      if (updates.completed !== undefined) {
        setClauses.push("completed = ?");
        params.push(updates.completed ? 1 : 0);
        if (updates.completed) {
          setClauses.push("completed_at = CURRENT_TIMESTAMP");
        }
      }
      if (updates.priority !== undefined) {
        setClauses.push("priority = ?");
        params.push(updates.priority);
      }
      if (updates.category !== undefined) {
        setClauses.push("category = ?");
        params.push(updates.category);
      }
      if (updates.board !== undefined) {
        setClauses.push("board = ?");
        params.push(updates.board);
      }
      if (updates.notes !== undefined) {
        setClauses.push("notes = ?");
        params.push(updates.notes);
      }
      
      if (setClauses.length === 0) continue;
      
      setClauses.push("updated_at = CURRENT_TIMESTAMP");
      params.push(taskId);
      params.push(req.user.id);
      
      await dbAsync.run(
        `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?`,
        params
      );
      updated.push(taskId);
    }
    res.json({ message: `Updated ${updated.length} tasks`, updated });
  } catch (err) {
    next(err);
  }
});

// AI FEEDBACK RATING
router.post("/ai/feedback", auth, async (req, res, next) => {
  const { event_id, rating, feedback_text } = req.body;
  // rating: 1-5 stars, feedback_text: user comment
  try {
    // Store feedback in a simple format (optional: create a dedicated feedback table)
    const feedbackLog = {
      user_id: req.user.id,
      event_id: event_id || null,
      rating: Math.max(1, Math.min(5, parseInt(rating) || 3)),
      feedback_text: feedback_text || "",
      created_at: new Date().toISOString(),
    };
    // For now, just acknowledge receipt (could store in DB or send to analytics service)
    res.json({ message: "Feedback recorded", feedback: feedbackLog });
  } catch (err) {
    next(err);
  }
});

// TOGGLE COMPLETE / UPDATE STATUS
router.put("/:id", auth, async (req, res, next) => {
  const { completed } = req.body; // Changed from status to completed

  try {
    await dbAsync.run(
      "UPDATE tasks SET completed=?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      // Map boolean completed to 0 or 1, and update completed_at timestamp
      [completed ? 1 : 0, completed ? 1 : 0, req.params.id, req.user.id]
    );
    res.json({ message: "Task Updated" });
  } catch (err) {
    next(err);
  }
});

// EDIT TASK
router.put("/edit/:id", auth, async (req, res, next) => {
  const {
    title, notes, category, board, priority, completed, due_date, recurrence,
    reminder_date, reminder_time, reminder_channel, estimated_minutes,
  } = req.body;

  try {
    // Changed: properties map to automated schema definitions
    await dbAsync.run(
      "UPDATE tasks SET title=?, notes=?, category=?, board=?, priority=?, completed=?, due_date=?, recurrence=?, reminder_date=?, reminder_time=?, reminder_channel=?, estimated_minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [
        title, notes || null, category || "Personal", board || "General", priority || "Medium",
        completed ? 1 : 0, // Map boolean completed to 0 or 1
        due_date || null, recurrence || null, reminder_date || null, reminder_time || null,
        reminder_channel || "email", estimated_minutes || null,
        req.params.id,
        req.user.id,
      ]
    );
    res.json({ message: "Task Edited" });
  } catch (err) {
    next(err);
  }
});

// DELETE TASK
router.delete("/:id", auth, async (req, res, next) => {
  try {
    // Changed: user_id -> userId
    await dbAsync.run(
      "DELETE FROM tasks WHERE id=? AND user_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Task Deleted" });
  } catch (err) {
    next(err);
  }
});

// BULK DELETE TASKS
router.post("/bulk-delete", auth, async (req, res, next) => {
  const { task_ids } = req.body;
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return res.status(400).json({ message: "task_ids array is required and must not be empty" });
  }
  try {
    const placeholders = task_ids.map(() => "?").join(",");
    const params = [...task_ids, req.user.id];
    await dbAsync.run(
      `DELETE FROM tasks WHERE id IN (${placeholders}) AND user_id = ?`,
      params
    );
    res.json({ message: `Deleted ${task_ids.length} tasks`, deleted: task_ids });
  } catch (err) {
    next(err);
  }
});

// ========================
// SUBTASKS ENDPOINTS
// ========================

// GET SUBTASKS FOR A TASK
router.get("/:id/subtasks", auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all("SELECT * FROM subtasks WHERE task_id = ?", [req.params.id]);
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// ADD SUBTASK
router.post("/:id/subtasks", auth, async (req, res, next) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Subtask title is required" });
  }

  try {
    const result = await dbAsync.run("INSERT INTO subtasks (task_id, title) VALUES (?, ?)", [req.params.id, title.trim()]);
    res.json({
      id: result.id,
      message: "Subtask Added",
    });
  } catch (err) {
    next(err);
  }
});

// TOGGLE SUBTASK COMPLETE
router.put("/subtasks/:subtaskId", auth, async (req, res, next) => {
  const { completed } = req.body;

  try {
    await dbAsync.run("UPDATE subtasks SET completed = ? WHERE id = ?", [completed ? 1 : 0, req.params.subtaskId]);
    res.json({ message: "Subtask Updated" });
  } catch (err) {
    next(err);
  }
});

// DELETE SUBTASK
router.delete("/subtasks/:subtaskId", auth, async (req, res, next) => {
  try {
    await dbAsync.run("DELETE FROM subtasks WHERE id = ?", [req.params.subtaskId]);
    res.json({ message: "Subtask Deleted" });
  } catch (err) {
    next(err);
  }
});

// ========================
// TAGS ENDPOINTS
// ========================

// GET ALL TAGS FOR USER
router.get("/user/tags", auth, async (req, res, next) => {
  try {
    // Changed: user_id -> userId
    const rows = await dbAsync.all("SELECT * FROM tags WHERE user_id = ? ORDER BY name", [req.user.id]);
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// CREATE TAG
router.post("/user/tags", auth, async (req, res, next) => {
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Tag name is required" });
  }

  try {
    // Changed: user_id -> userId
    const result = await dbAsync.run("INSERT INTO tags (name, user_id, color) VALUES (?, ?, ?)", [name.trim(), req.user.id, color || "#3b82f6"]);
    res.json({
      id: result.id,
      message: "Tag Created",
    });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ message: "Tag already exists" });
    }
    next(err);
  }
});

// ADD TAG TO TASK
router.post("/:taskId/tags/:tagId", auth, async (req, res, next) => {
  try {
    await dbAsync.run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [req.params.taskId, req.params.tagId]);
    res.json({ message: "Tag Added to Task" });
  } catch (err) {
    next(err);
  }
});

// REMOVE TAG FROM TASK
router.delete("/:taskId/tags/:tagId", auth, async (req, res, next) => {
  try {
    await dbAsync.run("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?", [req.params.taskId, req.params.tagId]);
    res.json({ message: "Tag Removed from Task" });
  } catch (err) {
    next(err);
  }
});

// GET TAGS FOR A TASK
router.get("/:taskId/tags", auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all(
      `SELECT tags.* FROM tags INNER JOIN task_tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = ?`,
      [req.params.taskId]
    );
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// ========================
// AI/LLM & ANALYTICS ENDPOINTS
// ========================

// GET TASK DISTRIBUTION BY CATEGORY
router.get("/analytics/category-distribution", auth, async (req, res, next) => {
  // Changed: user_id -> userId
  const query = `
    SELECT category as name, COUNT(id) as value 
    FROM tasks
    WHERE user_id = ?
    GROUP BY category;
  `;
  try {
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET TASK COMPLETION TRENDS
router.get("/analytics/completion-trends", auth, async (req, res, next) => {
  const query = `
    SELECT DATE(completed_at) as completion_date, COUNT(id) as completed_tasks_count
    FROM tasks
    WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
    GROUP BY DATE(completed_at)
    ORDER BY DATE(completed_at) ASC;
  `;
  try {
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET ANALYTICS OVERVIEW METRICS
router.get("/analytics/overview", auth, async (req, res, next) => {
  const query = `
    SELECT
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN completed = 0 AND due_date IS NOT NULL AND DATE(due_date) < DATE('now') THEN 1 ELSE 0 END) as overdue_count,
      AVG(CASE WHEN time_spent_minutes IS NOT NULL THEN time_spent_minutes END) as avg_time_spent,
      AVG(CASE WHEN estimated_minutes IS NOT NULL AND time_spent_minutes IS NOT NULL THEN ABS(time_spent_minutes - estimated_minutes) END) as avg_estimate_error
    FROM tasks
    WHERE user_id = ?;
  `;
  try {
    const row = await dbAsync.get(query, [req.user.id]);
    res.json(row || {});
  } catch (err) {
    next(err);
  }
});

// GET TASK DISTRIBUTION BY PRIORITY
router.get("/analytics/priority-distribution", auth, async (req, res, next) => {
  // Changed: user_id -> userId
  const query = `
    SELECT priority as name, COUNT(id) as value 
    FROM tasks
    WHERE user_id = ?
    GROUP BY priority;
  `;
  try {
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ========================
// MISSING AI HELPER ENDPOINTS
// ========================

// GET AI Suggestions
router.get("/:id/ai/suggestions", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const suggestions = await llmService.getTaskSuggestions(task);
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// POST Auto-Categorize
router.post("/:id/ai/categorize", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const category = await llmService.smartCategorize(task.title, task.notes || "");
    await dbAsync.run(
      "UPDATE tasks SET category=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [category, req.params.id, req.user.id]
    );
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

// POST Generate Subtasks
router.post("/:id/ai/generate-subtasks", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const subtasks = await llmService.generateSubtasks(task.title, task.notes || "");
    
    const insertedSubtasks = [];
    for (const subtask of subtasks) {
      if (subtask.title && subtask.title.trim()) {
        const result = await dbAsync.run(
          "INSERT INTO subtasks (task_id, title) VALUES (?, ?)",
          [req.params.id, subtask.title.trim()]
        );
        insertedSubtasks.push({
          id: result.id,
          task_id: parseInt(req.params.id),
          title: subtask.title.trim(),
          completed: 0
        });
      }
    }

    res.json({ subtasks: insertedSubtasks });
  } catch (err) {
    next(err);
  }
});

// POST Estimate Time
router.post("/:id/ai/estimate", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const estimatedMinutes = await llmService.estimateTaskTime(task.title, task.notes || "");
    await dbAsync.run(
      "UPDATE tasks SET estimated_minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [estimatedMinutes, req.params.id, req.user.id]
    );
    res.json({ estimatedMinutes });
  } catch (err) {
    next(err);
  }
});

// POST Recommend Deadline
router.post("/:id/ai/recommend-deadline", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const deadline = await llmService.recommendDeadline(task.title, task.priority || "Medium");
    if (deadline) {
      await dbAsync.run(
        "UPDATE tasks SET due_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
        [deadline, req.params.id, req.user.id]
      );
    }
    res.json({ deadline });
  } catch (err) {
    next(err);
  }
});

// GET Analyze Task
router.get("/:id/ai/analyze", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const analysis = await llmService.analyzeTask(task);
    await dbAsync.run(
      "UPDATE tasks SET ai_insights=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [analysis, req.params.id, req.user.id]
    );
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// ========================
// TIME TRACKING ENDPOINTS
// ========================

// POST Start Focus Timer
router.post("/:id/time/start", auth, async (req, res, next) => {
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await dbAsync.run("UPDATE tasks SET is_tracking=0 WHERE user_id=?", [req.user.id]);
    await dbAsync.run("UPDATE tasks SET is_tracking=1 WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ message: "Time tracking started" });
  } catch (err) {
    next(err);
  }
});

// POST Stop Focus Timer
router.post("/:id/time/stop", auth, async (req, res, next) => {
  const { minutes } = req.body;
  const minsToAdd = parseInt(minutes) || 0;
  try {
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await dbAsync.run(
      "UPDATE tasks SET time_spent_minutes = time_spent_minutes + ?, is_tracking = 0, updated_at = CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [minsToAdd, req.params.id, req.user.id]
    );
    res.json({ message: "Time tracking stopped and saved" });
  } catch (err) {
    next(err);
  }
});

// ========================
// TASK TEMPLATES ENDPOINTS
// ========================

// GET ALL TASK TEMPLATES
router.get("/templates/all", auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all(
      "SELECT * FROM task_templates WHERE user_id = ? OR is_system = 1 ORDER BY name ASC",
      [req.user.id]
    );
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// CREATE TASK TEMPLATE
router.post("/templates", auth, async (req, res, next) => {
  const { name, category, priority, estimated_minutes, tags, subtasks } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Template name is required" });
  }
  try {
    const result = await dbAsync.run(
      "INSERT INTO task_templates (name, category, priority, estimated_minutes, tags, subtasks, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name.trim(), category || null, priority || "Medium", estimated_minutes || null, JSON.stringify(tags || []), JSON.stringify(subtasks || []), req.user.id]
    );
    res.json({ id: result.id, message: "Template created" });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ message: "Template with this name already exists" });
    }
    next(err);
  }
});

// APPLY TASK TEMPLATE (create task from template)
router.post("/templates/:templateId/apply", auth, async (req, res, next) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Task title is required" });
  }
  try {
    const template = await dbAsync.get("SELECT * FROM task_templates WHERE id = ?", [req.params.templateId]);
    if (!template) return res.status(404).json({ message: "Template not found" });

    // Create task from template
    const result = await dbAsync.run(
      "INSERT INTO tasks (title, category, priority, estimated_minutes, user_id) VALUES (?, ?, ?, ?, ?)",
      [title.trim(), template.category || "Personal", template.priority || "Medium", template.estimated_minutes || null, req.user.id]
    );

    // Add subtasks if any
    if (template.subtasks) {
      try {
        const subtaskList = JSON.parse(template.subtasks);
        for (const subtask of subtaskList) {
          if (subtask && subtask.trim()) {
            await dbAsync.run("INSERT INTO subtasks (task_id, title) VALUES (?, ?)", [result.id, subtask.trim()]);
          }
        }
      } catch (e) {
        console.error("Error parsing subtasks template:", e);
      }
    }

    res.json({ id: result.id, message: "Task created from template" });
  } catch (err) {
    next(err);
  }
});

// DELETE TASK TEMPLATE
router.delete("/templates/:templateId", auth, async (req, res, next) => {
  try {
    await dbAsync.run("DELETE FROM task_templates WHERE id = ? AND user_id = ?", [req.params.templateId, req.user.id]);
    res.json({ message: "Template deleted" });
  } catch (err) {
    next(err);
  }
});

// ========================
// TASK DEPENDENCIES ENDPOINTS
// ========================

// ADD TASK DEPENDENCY
router.post("/:taskId/dependencies/:dependsOnTaskId", auth, async (req, res, next) => {
  try {
    // Verify both tasks exist
    const task = await dbAsync.get("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [req.params.taskId, req.user.id]);
    const depTask = await dbAsync.get("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [req.params.dependsOnTaskId, req.user.id]);

    if (!task || !depTask) return res.status(404).json({ message: "Task not found" });

    await dbAsync.run(
      "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      [req.params.taskId, req.params.dependsOnTaskId]
    );
    res.json({ message: "Dependency added" });
  } catch (err) {
    next(err);
  }
});

// GET TASK DEPENDENCIES
router.get("/:taskId/dependencies", auth, async (req, res, next) => {
  try {
    const dependencies = await dbAsync.all(
      `SELECT td.*, t.title, t.completed FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = ?`,
      [req.params.taskId]
    );
    res.json(dependencies || []);
  } catch (err) {
    next(err);
  }
});

// DELETE TASK DEPENDENCY
router.delete("/:taskId/dependencies/:dependsOnTaskId", auth, async (req, res, next) => {
  try {
    await dbAsync.run(
      "DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?",
      [req.params.taskId, req.params.dependsOnTaskId]
    );
    res.json({ message: "Dependency removed" });
  } catch (err) {
    next(err);
  }
});

// ========================
// ADVANCED ANALYTICS ENDPOINTS
// ========================

// GET BUSIEST DAYS/TIMES
router.get("/analytics/busiest-times", auth, async (req, res, next) => {
  try {
    const query = `
      SELECT strftime('%w', completed_at) as day_of_week, COUNT(*) as completion_count
      FROM tasks
      WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
      GROUP BY day_of_week
      ORDER BY completion_count DESC;
    `;
    const rows = await dbAsync.all(query, [req.user.id]);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const result = rows.map(r => ({
      ...r,
      day_name: dayNames[parseInt(r.day_of_week)]
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET TASK COMPLETION VELOCITY (tasks per week)
router.get("/analytics/completion-velocity", auth, async (req, res, next) => {
  try {
    const query = `
      SELECT strftime('%Y-W%W', completed_at) as week, COUNT(*) as completed_count
      FROM tasks
      WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12;
    `;
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows.reverse() || []);
  } catch (err) {
    next(err);
  }
});

// GET ESTIMATED VS ACTUAL TIME ANALYSIS
router.get("/analytics/time-analysis", auth, async (req, res, next) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_tasks,
        AVG(estimated_minutes) as avg_estimated,
        AVG(time_spent_minutes) as avg_actual,
        AVG(ABS(estimated_minutes - time_spent_minutes)) as avg_difference,
        SUM(estimated_minutes) as total_estimated,
        SUM(time_spent_minutes) as total_actual
      FROM tasks
      WHERE user_id = ? AND completed = 1 AND estimated_minutes IS NOT NULL AND time_spent_minutes IS NOT NULL;
    `;
    const row = await dbAsync.get(query, [req.user.id]);
    res.json(row || {});
  } catch (err) {
    next(err);
  }
});

// GET CATEGORY-WISE TIME SPENT
router.get("/analytics/category-time-spent", auth, async (req, res, next) => {
  try {
    const query = `
      SELECT category, SUM(time_spent_minutes) as total_time_spent, COUNT(*) as task_count
      FROM tasks
      WHERE user_id = ? AND time_spent_minutes > 0
      GROUP BY category
      ORDER BY total_time_spent DESC;
    `;
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// GET PRIORITY-WISE COMPLETION RATE
router.get("/analytics/priority-completion-rate", auth, async (req, res, next) => {
  try {
    const query = `
      SELECT 
        priority,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        ROUND(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
      FROM tasks
      WHERE user_id = ?
      GROUP BY priority
      ORDER BY priority;
    `;
    const rows = await dbAsync.all(query, [req.user.id]);
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

module.exports = router;