const express = require("express");
const router = express.Router();
const dbAsync = require("./utils/db-async");
const auth = require("./middleware/auth");
const llmService = require("./services/llmService");

// GET all events
router.get("/", auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all("SELECT * FROM events WHERE user_id = ? ORDER BY date ASC", [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// CREATE event
router.post("/", auth, async (req, res, next) => {
  const { name, date, budget_goal, current_savings, notes, type } = req.body;
  if (!name) return res.status(400).json({ message: "Event name is required" });
  
  try {
    const result = await dbAsync.run(
      "INSERT INTO events (name, date, budget_goal, current_savings, notes, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, date, budget_goal || 0, current_savings || 0, notes, type || 'General', req.user.id]
    );
    res.json({ id: result.id, message: "Event created" });
  } catch (err) {
    next(err);
  }
});

// UPDATE event
router.put("/:id", auth, async (req, res, next) => {
  const { name, date, budget_goal, current_savings, notes, type } = req.body;
  try {
    await dbAsync.run(
      "UPDATE events SET name=?, date=?, budget_goal=?, current_savings=?, notes=?, type=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [name, date, budget_goal, current_savings, notes, type || 'General', req.params.id, req.user.id]
    );
    res.json({ message: "Event updated" });
  } catch (err) {
    next(err);
  }
});

// DELETE event
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await dbAsync.run("UPDATE wallets SET event_id = NULL WHERE event_id = ? AND user_id = ?", [req.params.id, req.user.id]);
    await dbAsync.run("DELETE FROM events WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ message: "Event deleted and linked wallets detached" });
  } catch (err) {
    next(err);
  }
});

// GET all wallets with associated event names
router.get("/wallets", auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all(
      `SELECT wallets.*, events.name AS event_name 
       FROM wallets 
       LEFT JOIN events ON wallets.event_id = events.id 
       WHERE wallets.user_id = ? 
       ORDER BY wallets.name ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// CREATE wallet
router.post("/wallets", auth, async (req, res, next) => {
  const { name, balance, target_amount, notes, type, event_id } = req.body;
  if (!name) return res.status(400).json({ message: "Wallet name is required" });

  try {
    const result = await dbAsync.run(
      "INSERT INTO wallets (name, balance, target_amount, notes, type, user_id, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, balance || 0, target_amount || 0, notes, type || "Savings", req.user.id, event_id || null]
    );
    
    // Sync to event if linked
    if (event_id && balance > 0) {
      await dbAsync.run(
        "UPDATE events SET current_savings = current_savings + ?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
        [balance, event_id, req.user.id]
      );
    }
    
    res.json({ id: result.id, message: "Wallet created" });
  } catch (err) {
    next(err);
  }
});

// UPDATE wallet with synchronization logic
router.put("/wallets/:id", auth, async (req, res, next) => {
  const { name, balance, target_amount, notes, type, event_id } = req.body;
  try {
    const oldWallet = await dbAsync.get("SELECT * FROM wallets WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!oldWallet) return res.status(404).json({ message: "Wallet not found" });

    const newBalance = parseFloat(balance) || 0;
    const oldBalance = parseFloat(oldWallet.balance) || 0;
    const balanceDiff = newBalance - oldBalance;

    const newEventId = event_id ? parseInt(event_id) : null;
    const oldEventId = oldWallet.event_id ? parseInt(oldWallet.event_id) : null;

    await dbAsync.run(
      "UPDATE wallets SET name=?, balance=?, target_amount=?, notes=?, type=?, event_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
      [name, newBalance, target_amount || 0, notes, type || "Savings", newEventId, req.params.id, req.user.id]
    );

    // Sync Event savings
    if (newEventId === oldEventId) {
      if (newEventId && balanceDiff !== 0) {
        await dbAsync.run(
          "UPDATE events SET current_savings = current_savings + ?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
          [balanceDiff, newEventId, req.user.id]
        );
      }
    } else {
      // Event changed
      if (oldEventId) {
        await dbAsync.run(
          "UPDATE events SET current_savings = MAX(0, current_savings - ?), updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
          [oldBalance, oldEventId, req.user.id]
        );
      }
      if (newEventId) {
        await dbAsync.run(
          "UPDATE events SET current_savings = current_savings + ?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
          [newBalance, newEventId, req.user.id]
        );
      }
    }

    res.json({ message: "Wallet updated and event savings synchronized" });
  } catch (err) {
    next(err);
  }
});

// DELETE wallet and sync associated event savings
router.delete("/wallets/:id", auth, async (req, res, next) => {
  try {
    const oldWallet = await dbAsync.get("SELECT * FROM wallets WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (oldWallet) {
      if (oldWallet.event_id && oldWallet.balance > 0) {
        await dbAsync.run(
          "UPDATE events SET current_savings = MAX(0, current_savings - ?), updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
          [oldWallet.balance, oldWallet.event_id, req.user.id]
        );
      }
      await dbAsync.run("DELETE FROM wallets WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    }
    res.json({ message: "Wallet deleted and synchronized" });
  } catch (err) {
    next(err);
  }
});

// AI ASSIST FOR AN EVENT
router.post("/:id/ai-assist", auth, async (req, res, next) => {
  try {
    const event = await dbAsync.get("SELECT * FROM events WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const advice = await llmService.getEventPlanningAdvice(event);
    await dbAsync.run(
      "UPDATE events SET ai_plan=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?", 
      [advice, req.params.id, req.user.id]
    );
    res.json({ ai_plan: advice });
  } catch (err) {
    next(err);
  }
});

// AI EVENT PLAN GENERATOR (inserts event, linked wallet, and helper tasks)
router.post("/ai-generate-plan", auth, async (req, res, next) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  try {
    const plan = await llmService.generateEventPlan(prompt);
    
    // Create the event
    const eventRes = await dbAsync.run(
      "INSERT INTO events (name, date, budget_goal, current_savings, notes, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        plan.event.name,
        plan.event.date,
        plan.event.budget_goal || 0,
        0, // Start with 0 savings, wallet balance will update it
        plan.event.notes,
        plan.event.type || 'General',
        req.user.id
      ]
    );
    const eventId = eventRes.id;

    // Create the linked wallet
    const walletRes = await dbAsync.run(
      "INSERT INTO wallets (name, balance, target_amount, notes, type, user_id, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        plan.wallet.name,
        0, // Start with 0 balance
        plan.wallet.target_amount || plan.event.budget_goal || 0,
        plan.wallet.notes,
        plan.wallet.type || 'Savings',
        req.user.id,
        eventId
      ]
    );

    // Create the tasks
    const createdTasks = [];
    if (plan.tasks && Array.isArray(plan.tasks)) {
      for (const t of plan.tasks) {
        const taskRes = await dbAsync.run(
          `INSERT INTO tasks (title, notes, category, board, priority, completed, due_date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.title,
            t.notes || null,
            t.category || "Personal",
            t.board || "To Do",
            t.priority || "Medium",
            0,
            t.due_date || null,
            req.user.id
          ]
        );
        createdTasks.push({ id: taskRes.id, title: t.title });
      }
    }

    res.json({
      message: "AI Plan successfully generated and imported",
      event: { id: eventId, ...plan.event },
      wallet: { id: walletRes.id, ...plan.wallet },
      tasksCount: createdTasks.length
    });
  } catch (err) {
    next(err);
  }
});

// EVENT TEMPLATES
router.get("/templates", auth, async (req, res, next) => {
  const templates = [
    {
      id: "travel",
      name: "Travel Trip",
      type: "Travel",
      icon: "✈️",
      defaultBudget: 2000,
      suggestedWallets: [
        { name: "Flight", type: "Travel", targetAmount: 800 },
        { name: "Accommodation", type: "Travel", targetAmount: 1000 },
        { name: "Meals & Activities", type: "Travel", targetAmount: 400 }
      ]
    },
    {
      id: "wedding",
      name: "Wedding",
      type: "Wedding",
      icon: "💍",
      defaultBudget: 10000,
      suggestedWallets: [
        { name: "Venue", type: "Wedding", targetAmount: 3000 },
        { name: "Catering", type: "Wedding", targetAmount: 3500 },
        { name: "Photography", type: "Wedding", targetAmount: 1500 },
        { name: "Decorations", type: "Wedding", targetAmount: 1500 },
        { name: "Miscellaneous", type: "Wedding", targetAmount: 500 }
      ]
    },
    {
      id: "birthday",
      name: "Birthday Party",
      type: "Birthday",
      icon: "🎂",
      defaultBudget: 500,
      suggestedWallets: [
        { name: "Venue", type: "General", targetAmount: 150 },
        { name: "Cake & Catering", type: "General", targetAmount: 200 },
        { name: "Decorations & Supplies", type: "General", targetAmount: 150 }
      ]
    },
    {
      id: "house",
      name: "Home Renovation",
      type: "Project",
      icon: "🏠",
      defaultBudget: 5000,
      suggestedWallets: [
        { name: "Materials", type: "General", targetAmount: 2500 },
        { name: "Labor", type: "General", targetAmount: 2000 },
        { name: "Contingency", type: "Emergency", targetAmount: 500 }
      ]
    },
    {
      id: "education",
      name: "Education Course",
      type: "General",
      icon: "📚",
      defaultBudget: 1500,
      suggestedWallets: [
        { name: "Course Fee", type: "General", targetAmount: 1000 },
        { name: "Materials", type: "General", targetAmount: 300 },
        { name: "Certification", type: "General", targetAmount: 200 }
      ]
    }
  ];
  res.json(templates);
});

// DUPLICATE EVENT (with all wallets)
router.post("/:id/duplicate", auth, async (req, res, next) => {
  try {
    const event = await dbAsync.get("SELECT * FROM events WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Create new event with "Copy of" prefix and no date
    const newEventRes = await dbAsync.run(
      "INSERT INTO events (name, date, budget_goal, current_savings, notes, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [`Copy of ${event.name}`, null, event.budget_goal, 0, event.notes, event.type, req.user.id]
    );
    const newEventId = newEventRes.id;

    // Duplicate all linked wallets
    const wallets = await dbAsync.all("SELECT * FROM wallets WHERE event_id=? AND user_id=?", [event.id, req.user.id]);
    const newWalletIds = [];
    for (const wallet of wallets) {
      const newWalletRes = await dbAsync.run(
        "INSERT INTO wallets (name, balance, target_amount, notes, type, user_id, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [`${wallet.name} (copy)`, 0, wallet.target_amount, wallet.notes, wallet.type, req.user.id, newEventId]
      );
      newWalletIds.push(newWalletRes.id);
    }

    res.json({
      message: "Event duplicated successfully",
      event_id: newEventId,
      wallet_count: newWalletIds.length
    });
  } catch (err) {
    next(err);
  }
});

// DUPLICATE WALLET
router.post("/wallets/:id/duplicate", auth, async (req, res, next) => {
  try {
    const wallet = await dbAsync.get("SELECT * FROM wallets WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    const newWalletRes = await dbAsync.run(
      "INSERT INTO wallets (name, balance, target_amount, notes, type, user_id, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [`${wallet.name} (copy)`, 0, wallet.target_amount, wallet.notes, wallet.type, req.user.id, wallet.event_id]
    );

    res.json({
      message: "Wallet duplicated successfully",
      wallet_id: newWalletRes.id
    });
  } catch (err) {
    next(err);
  }
});

// SMART BUDGET RECOMMENDATIONS
router.post("/recommendations", auth, async (req, res, next) => {
  try {
    const events = await dbAsync.all(
      "SELECT * FROM events WHERE user_id=? AND budget_goal > 0 AND date IS NOT NULL ORDER BY date DESC LIMIT 10",
      [req.user.id]
    );

    if (events.length === 0) {
      return res.json({ message: "No events with budgets found", recommendations: [] });
    }

    // Calculate savings velocity and recommendations
    const recommendations = [];
    for (const event of events) {
      const eventDate = new Date(event.date);
      const today = new Date();
      const daysRemaining = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, (event.budget_goal || 0) - (event.current_savings || 0));
      
      if (daysRemaining > 0 && remaining > 0) {
        const dailyTarget = (remaining / daysRemaining).toFixed(2);
        const isOnTrack = event.current_savings >= (event.budget_goal * (1 - daysRemaining / 365));
        
        recommendations.push({
          event_id: event.id,
          event_name: event.name,
          budget_goal: event.budget_goal,
          current_savings: event.current_savings,
          remaining,
          days_remaining: daysRemaining,
          daily_target: parseFloat(dailyTarget),
          on_track: isOnTrack,
          suggestion: isOnTrack 
            ? `✅ On track! Continue saving $${dailyTarget} daily.`
            : `⚠️ Behind schedule. Increase daily savings to $${dailyTarget} to meet goal.`
        });
      }
    }

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

// ========================
// PLANNER ANALYTICS ENDPOINTS
// ========================

// GET SAVINGS VELOCITY (savings per week)
router.get("/analytics/savings-velocity", auth, async (req, res, next) => {
  try {
    const events = await dbAsync.all(
      "SELECT id, name, created_at, current_savings FROM events WHERE user_id=? ORDER BY created_at ASC",
      [req.user.id]
    );

    // Group by week and calculate cumulative savings
    const weeklyData = {};
    for (const event of events) {
      const date = new Date(event.created_at);
      const weekKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = 0;
      }
      weeklyData[weekKey] += parseFloat(event.current_savings) || 0;
    }

    const result = Object.keys(weeklyData)
      .sort()
      .map(week => ({
        week,
        total_savings: weeklyData[week]
      }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET EVENT COMPLETION FORECAST
router.get("/analytics/event-forecast", auth, async (req, res, next) => {
  try {
    const events = await dbAsync.all(
      "SELECT id, name, date, budget_goal, current_savings FROM events WHERE user_id=? AND date IS NOT NULL ORDER BY date ASC",
      [req.user.id]
    );

    const forecasts = events.map(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      const daysRemaining = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, (event.budget_goal || 0) - (event.current_savings || 0));
      
      // Simple linear projection
      let projectedDate = null;
      if (event.current_savings > 0 && daysRemaining > 0) {
        const savingsRate = event.current_savings / ((new Date() - new Date(event.date)) / (1000 * 60 * 60 * 24));
        if (savingsRate > 0) {
          const daysToComplete = remaining / savingsRate;
          projectedDate = new Date(today.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        }
      }

      return {
        event_id: event.id,
        event_name: event.name,
        budget_goal: event.budget_goal,
        current_savings: event.current_savings,
        remaining,
        target_date: event.date,
        projected_completion: projectedDate ? projectedDate.toISOString().split('T')[0] : null,
        on_track: projectedDate && projectedDate <= eventDate,
        progress_percent: Math.round((event.current_savings / (event.budget_goal || 1)) * 100)
      };
    });

    res.json(forecasts);
  } catch (err) {
    next(err);
  }
});

// GET GANTT CHART DATA FOR EVENTS
router.get("/analytics/gantt-chart", auth, async (req, res, next) => {
  try {
    const events = await dbAsync.all(
      `SELECT e.*, COUNT(DISTINCT w.id) as wallet_count, SUM(w.balance) as total_balance
       FROM events e
       LEFT JOIN wallets w ON e.id = w.event_id
       WHERE e.user_id=? AND e.date IS NOT NULL
       GROUP BY e.id
       ORDER BY e.date ASC`,
      [req.user.id]
    );

    const ganttData = events.map(event => {
      const eventDate = new Date(event.date);
      const createdDate = new Date(event.created_at);
      
      return {
        id: event.id,
        name: event.name,
        type: event.type,
        start_date: event.created_at ? event.created_at.split('T')[0] : null,
        end_date: event.date,
        budget_goal: event.budget_goal,
        current_savings: event.current_savings,
        wallet_count: event.wallet_count,
        total_balance: event.total_balance,
        progress_percent: Math.round((event.current_savings / (event.budget_goal || 1)) * 100),
        status: event.current_savings >= event.budget_goal ? 'completed' : 'in-progress'
      };
    });

    res.json(ganttData);
  } catch (err) {
    next(err);
  }
});

// GET WALLET BREAKDOWN FOR AN EVENT
router.get("/:eventId/wallet-breakdown", auth, async (req, res, next) => {
  try {
    const event = await dbAsync.get("SELECT * FROM events WHERE id=? AND user_id=?", [req.params.eventId, req.user.id]);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const wallets = await dbAsync.all(
      "SELECT * FROM wallets WHERE event_id=? AND user_id=? ORDER BY name ASC",
      [req.params.eventId, req.user.id]
    );

    const breakdown = wallets.map(wallet => ({
      ...wallet,
      percent_of_budget: ((wallet.balance / (event.budget_goal || 1)) * 100).toFixed(2),
      percent_of_target: ((wallet.balance / (wallet.target_amount || 1)) * 100).toFixed(2)
    }));

    res.json({
      event_id: req.params.eventId,
      event_name: event.name,
      total_budget: event.budget_goal,
      total_allocated: wallets.reduce((sum, w) => sum + (w.target_amount || 0), 0),
      total_saved: wallets.reduce((sum, w) => sum + (w.balance || 0), 0),
      wallets: breakdown
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;