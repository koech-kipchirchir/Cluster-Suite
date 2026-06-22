const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Gemini model variable
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-pro";

// Check if LLM is configured
const isLLMConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() !== "" && key !== "your-gemini-api-key-here";
};

/**
 * Generic Google Gemini API call wrapper
 */
const callGemini = async (messages, temperature = 0.7) => {
  if (!isLLMConfigured()) {
    const error = new Error("Google Gemini API key not configured. Please check your .env file.");
    error.statusCode = 503; // Service Unavailable
    throw error;
  }
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  try {
    let fullPrompt = "";
    messages.forEach(msg => {
      if (msg.role === "system") {
        fullPrompt += `System Instruction: ${msg.content}\n\n`;
      } else if (msg.role === "user") {
        fullPrompt += `User Request: ${msg.content}\n`;
      } else {
        fullPrompt += `${msg.role}: ${msg.content}\n`;
      }
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt.trim() }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 1000,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Raw AI Service Error:", error);

    if (error.message.includes("API_KEY_INVALID") || (error.response && error.response.status === 401) || (error.message && error.message.includes("401"))) {
      error.statusCode = 401;
      error.message = "AI Service Error: Invalid or expired Google Gemini API Key. Please check your .env file.";
    } else if (error.response && error.response.status) {
      error.statusCode = error.response.status;
      error.message = `AI Service Error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
    } else {
      error.statusCode = 500;
      error.message = `AI Service Error: ${error.message}`;
    }
    throw error;
  }
};

/**
 * Get AI suggestions for task completion (using Gemini or Local Fallback)
 */
const getTaskSuggestions = async (task) => {
  if (!isLLMConfigured()) {
    // Local Fallback Suggestions Engine
    const suggestions = [];
    const category = task.category || "Personal";
    const priority = task.priority || "Medium";

    if (priority === "High") {
      suggestions.push("Focus on this high-priority task first to prevent bottlenecks.");
      suggestions.push("Break down this task into smaller steps and tackle the most critical piece first.");
    } else {
      suggestions.push("Schedule a small 15-to-30 minute window in your calendar for this.");
    }

    if (category === "Work" || category === "School") {
      suggestions.push("Gather all files, logins, and reference materials before you start.");
      suggestions.push("Disable non-essential notifications to maintain a solid focus state.");
    } else if (category === "Finance") {
      suggestions.push("Double-check calculations and review your budget records first.");
    } else if (category === "Health") {
      suggestions.push("Make sure to stay hydrated and take short breaks if needed.");
    } else {
      suggestions.push("Start with a simple step to build immediate work momentum.");
    }

    suggestions.push("Mark subtasks complete as you go to track visual progress.");
    return suggestions.join("\n");
  }

  const prompt = `I have a task: "${task.title}". 
  Category: ${task.category || "Uncategorized"}
  Priority: ${task.priority || "Normal"}
  Due Date: ${task.due_date || "No deadline"}
  Notes: ${task.notes || "No notes"}
  
  Provide 3-4 actionable suggestions to help complete this task efficiently. Keep each suggestion brief (1 sentence).`;

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful productivity assistant. Provide practical, actionable advice for task completion.",
    },
    { role: "user", content: prompt },
  ];

  return await callGemini(messages, 0.7);
};

/**
 * Smart categorization of tasks (using Gemini or Local Fallback)
 */
const smartCategorize = async (taskTitle, taskDescription = "") => {
  if (!isLLMConfigured()) {
    // Local Fallback Categorization Engine
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();
    if (/urgent|asap|immediately|critical|emergency/i.test(text)) return "Urgent";
    if (/work|project|meeting|client|email|report|call|office|team|manager|sprint|dev|code|task/i.test(text)) return "Work";
    if (/school|homework|study|learn|course|class|read|exam|book|assignment|quiz|research/i.test(text)) return "School";
    if (/gym|workout|doctor|dentist|medicine|pill|run|walk|sleep|dental|medical|health|yoga/i.test(text)) return "Health";
    if (/buy|sell|budget|spend|money|cost|cash|finance|tax|bill|pay|bank|invoice/i.test(text)) return "Finance";
    if (/grocery|shop|purchase|market|store|order/i.test(text)) return "Shopping";
    if (/clean|fix|laundry|dish|kitchen|room|paint|yard|garden|home|house|repair|wash/i.test(text)) return "Home";
    return "Personal";
  }

  const categories = [
    "Personal",
    "Work",
    "School",
    "Urgent",
    "Health",
    "Finance",
    "Shopping",
    "Home",
  ];

  const prompt = `Given this task: "${taskTitle}"${taskDescription ? ` with description: "${taskDescription}"` : ""}, which category from this list is most appropriate?
  Categories: ${categories.join(", ")}
  
  Respond with ONLY the category name, nothing else.`;

  const messages = [
    {
      role: "system",
      content: "You are a task categorization expert. Respond with only the category.",
    },
    { role: "user", content: prompt },
  ];

  const result = await callGemini(messages, 0.2);
  return result.trim();
};

/**
 * Generate task breakdown (subtasks) (using Gemini or Local Fallback)
 */
const generateSubtasks = async (taskTitle, taskDescription = "") => {
  if (!isLLMConfigured()) {
    // Local Fallback Subtasks Engine
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();
    
    if (/learn|study|read|research|exam|course/i.test(text)) {
      return [
        { title: "Define the study scope and key concepts" },
        { title: "Review source material and take initial notes" },
        { title: "Synthesize findings or create summaries" },
        { title: "Self-test comprehension of key areas" }
      ];
    }
    
    if (/clean|fix|laundry|dish|home|house|repair/i.test(text)) {
      return [
        { title: "Sort items and clear initial workspace clutter" },
        { title: "Deep clean target surfaces and components" },
        { title: "Organize items back into proper places" },
        { title: "Perform final checks and clean-up" }
      ];
    }
    
    if (/project|build|code|dev|implement|app/i.test(text)) {
      return [
        { title: "Outline core technical requirements" },
        { title: "Configure local development workspace" },
        { title: "Build core functionalities step-by-step" },
        { title: "Write tests and debug edge cases" },
        { title: "Refactor logic and document code" }
      ];
    }
    
    if (/buy|shop|grocery|purchase/i.test(text)) {
      return [
        { title: "Research specifications or select brands" },
        { title: "Draft a comprehensive checklist of items" },
        { title: "Compare retail prices and select vendor" },
        { title: "Complete purchase and store confirmation records" }
      ];
    }

    // Default checklist fallback
    return [
      { title: "Outline objectives and list materials needed" },
      { title: "Execute the core workload" },
      { title: "Review quality and check for mistakes" },
      { title: "Finalize details and save progress" }
    ];
  }

  const prompt = `Break down this task into 3-5 specific, actionable subtasks:
  Task: "${taskTitle}"${taskDescription ? ` Details: "${taskDescription}"` : ""}
  
  Format as a JSON array of objects with "title" property only. Example: [{"title": "First step"}, {"title": "Second step"}]
  Return only valid JSON, no markdown formatting.`;

  const messages = [
    {
      role: "system",
      content:
        "You are a task breakdown expert. Generate concrete subtasks. Return only valid JSON.",
    },
    { role: "user", content: prompt },
  ];

  try {
    const result = await callGemini(messages, 0.5);
    let parsedResult = result.trim();
    if (parsedResult.startsWith("```json") && parsedResult.endsWith("```")) {
      parsedResult = parsedResult.substring(7, parsedResult.length - 3).trim();
    } else if (parsedResult.startsWith("```") && parsedResult.endsWith("```")) {
      parsedResult = parsedResult.substring(3, parsedResult.length - 3).trim();
    }
    
    const subtasks = JSON.parse(parsedResult);
    return Array.isArray(subtasks) ? subtasks : [];
  } catch (error) {
    console.error("Error parsing subtasks JSON:", error);
    return [];
  }
};

/**
 * Estimate task time (using Gemini or Local Fallback)
 */
const estimateTaskTime = async (taskTitle, taskDescription = "") => {
  if (!isLLMConfigured()) {
    // Local Fallback Time Estimator
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();
    if (/build|implement|write|code|paint|project|course|study|compile/i.test(text)) return 90;
    if (/clean|laundry|grocery|cook|exercise|workout/i.test(text)) return 45;
    if (/email|message|call|check|read|review|status/i.test(text)) return 30;
    return 15;
  }

  const prompt = `Estimate how many minutes this task would typically take to complete:
  Task: "${taskTitle}"${taskDescription ? ` Details: "${taskDescription}"` : ""}
  
  Respond with ONLY a number representing estimated minutes (e.g., 30, 120, etc).`;

  const messages = [
    {
      role: "system",
      content: "You are a project management expert. Estimate task time in minutes. Respond with only a number.",
    },
    { role: "user", content: prompt },
  ];

  try {
    const result = await callGemini(messages, 0.3);
    return parseInt(result.trim()) || 30;
  } catch (error) {
    console.error("Error estimating time:", error);
    return 30;
  }
};

/**
 * Generate task deadline recommendation (using Gemini or Local Fallback)
 */
const recommendDeadline = async (taskTitle, priority = "Medium") => {
  if (!isLLMConfigured()) {
    // Local Fallback Deadline Recommender
    const today = new Date();
    let daysToAdd = 3;
    if (priority === "High") daysToAdd = 1;
    else if (priority === "Low") daysToAdd = 7;
    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split("T")[0];
  }

  const prompt = `Recommend a deadline for this task based on its priority:
  Task: "${taskTitle}"
  Priority: ${priority}
  
  Today is ${new Date().toISOString().split("T")[0]}.
  Respond with ONLY a date in YYYY-MM-DD format.`;

  const messages = [
    {
      role: "system",
      content:
        "You are a time management expert. Recommend realistic deadlines. Respond with only a date in YYYY-MM-DD format.",
    },
    { role: "user", content: prompt },
  ];

  try {
    const result = await callGemini(messages, 0.3);
    return result.trim();
  } catch (error) {
    console.error("Error recommending deadline:", error);
    return null;
  }
};

/**
 * Generate task analysis/insights (using Gemini or Local Fallback)
 */
const analyzeTask = async (task) => {
  if (!isLLMConfigured()) {
    // Local Fallback Analysis Engine
    const statusText = task.completed ? "completed" : "pending";
    const priority = task.priority || "Medium";
    const category = task.category || "General";
    const board = task.board || "General";
    
    let analysis = `Task details reflect a ${priority} priority focus in ${category}. `;
    if (priority === "High" && statusText === "pending") {
      analysis += "Due to its high importance, we recommend completing this task immediately to prevent build up. ";
    } else {
      analysis += "Ensure that dependencies are met and time blocks are scheduled to maintain continuous output. ";
    }
    
    analysis += `This is currently tracked under the "${board}" board status.`;
    return analysis;
  }

  const prompt = `Provide a brief analysis of this task (2-3 sentences):
  Title: "${task.title}"
  Category: ${task.category || "Uncategorized"}
  Priority: ${task.priority || "Normal"}
  Due: ${task.due_date || "No deadline"}
  Status: ${task.completed ? "Completed" : "Pending"}
  Notes: ${task.notes || "No notes"}
  
  Include insights on urgency, effort, or strategic importance.`;

  const messages = [
    {
      role: "system",
      content: "You are a productivity coach. Provide insightful analysis of tasks.",
    },
    { role: "user", content: prompt },
  ];

  return await callGemini(messages, 0.7);
};

/**
 * Provide event planning and budgeting advice (using Gemini or Local Fallback)
 */
const getEventPlanningAdvice = async (event) => {
  if (!isLLMConfigured()) {
    // Local Fallback Event Planning Engine
    const budget = event.budget_goal || 0;
    const savings = event.current_savings || 0;
    const deficit = Math.max(0, budget - savings);
    
    return `### 📅 Planning Guide for "${event.name}"

**1. Estimated Budget Allocations**
* 📍 Venue & Decor (40%): **$${(budget * 0.4).toFixed(2)}**
* 🍔 Food, Catering & Refreshments (35%): **$${(budget * 0.35).toFixed(2)}**
* ✉️ Invitations, RSVPs & Logistics (10%): **$${(budget * 0.10).toFixed(2)}**
* 🛡️ Buffer/Contingency Reserve (15%): **$${(budget * 0.15).toFixed(2)}**

**2. Financial Goals & Savings Tips**
* **Target Budget:** $${budget.toLocaleString()} | **Current Savings:** $${savings.toLocaleString()}
* **Savings Target Deficit:** **$${deficit.toLocaleString()}**
* *Recommendation:* Save **$${(deficit / 4).toFixed(2)}** per week over the next month to reach your goal.
* *Budget Tip:* Automate transfers directly into a separate savings account to reduce temptation.

**3. Planning Timeline**
* **Immediate Steps:** Set event dates, select theme and create the attendee roster.
* **Midway Steps:** Book required vendors, send online invitations, and outline food choices.
* **Final Week Steps:** Re-confirm guest RSVPs, set agenda, and double check booking confirmations.`;
  }

  const prompt = `Help me plan an event and save money for it.
  Event Name: "${event.name}"
  Target Budget: $${event.budget_goal}
  Current Savings: $${event.current_savings}
  Event Type: ${event.type || "General"}
  Event Date: ${event.date || "Not set"}
  Notes: ${event.notes || "No notes"}
  
  Provide a detailed plan including:
  1. A breakdown of potential expenses.
  2. Actionable tips to save specifically for this target.
  3. A timeline of what to do and when.
  
  Keep it encouraging and practical.`;

  const messages = [
    {
      role: "system",
      content: "You are an expert event planner and financial advisor. Provide detailed, actionable planning and budgeting advice.",
    },
    { role: "user", content: prompt },
  ];

  return await callGemini(messages, 0.7);
};

/**
 * Generate a complete event structure, linked wallet, and initial planning tasks.
 */
const generateEventPlan = async (userPrompt) => {
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + 90); // 3 months from now
  const todayStr = today.toISOString().split("T")[0];
  const targetDateStr = targetDate.toISOString().split("T")[0];

  const fallbackPlan = {
    event: {
      name: "Event Plan: " + (userPrompt.length > 30 ? userPrompt.substring(0, 30) + "..." : userPrompt),
      date: targetDateStr,
      budget_goal: 1000,
      notes: `Smart-generated plan based on: "${userPrompt}"`,
      type: "General"
    },
    wallet: {
      name: "Savings for " + (userPrompt.length > 20 ? userPrompt.substring(0, 20) + "..." : userPrompt),
      target_amount: 1000,
      notes: "Target savings wallet for event.",
      type: "Savings"
    },
    tasks: [
      {
        title: "Define event theme and guest list",
        notes: "Brainstorm ideas and identify key attendees.",
        priority: "High",
        category: "Personal",
        board: "To Do",
        due_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      },
      {
        title: "Research venues and service providers",
        notes: "Get quotes for event spaces and caters.",
        priority: "Medium",
        category: "Personal",
        board: "To Do",
        due_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      },
      {
        title: "Send out invitations",
        notes: "Verify RSVPs and compile headcount.",
        priority: "Medium",
        category: "Personal",
        board: "To Do",
        due_date: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      }
    ]
  };

  if (!isLLMConfigured()) {
    return fallbackPlan;
  }

  const prompt = `Based on the user's request: "${userPrompt}", help them plan the event.
  Create a structure containing:
  1. An event object with:
     - name (string)
     - date (string in YYYY-MM-DD format, estimate based on prompt context, or put a reasonable date like 3 months from now. Make sure it's YYYY-MM-DD format)
     - budget_goal (number, estimate if not provided, e.g. 500-2000)
     - notes (string, brief summary of the plan)
     - type (string, one of: "General", "Travel", "Birthday", "Wedding", "Project", "Other")
  2. A savings wallet object with:
     - name (string, e.g. "Japan Trip Fund")
     - target_amount (number, same as the event's budget_goal)
     - notes (string, e.g. "Wallet for saving for Japan trip")
     - type (string, one of: "Savings", "Emergency", "Travel", "Investment", "General")
  3. An array of tasks (3-5 items) to get started with planning. Each task has:
     - title (string)
     - notes (string)
     - priority (string, one of: "High", "Medium", "Low")
     - category (string, one of: "Personal", "Work", "School", "Urgent", "Health", "Finance", "Shopping", "Home")
     - board (string, one of: "To Do", "In Progress", "Done")
     - due_date (string in YYYY-MM-DD format, set sequential deadlines leading up to the event date)

  Respond with ONLY valid JSON. Do NOT wrap in markdown code blocks like \`\`\`json ... \`\`\`. Avoid any other explanation text.`;

  const messages = [
    {
      role: "system",
      content: "You are an expert event planning assistant. Your output must be a single valid JSON object matching the requested schema exactly, with no conversational prefix or suffix."
    },
    { role: "user", content: prompt }
  ];

  try {
    const result = await callGemini(messages, 0.7);
    let parsedResult = result.trim();
    if (parsedResult.startsWith("```json") && parsedResult.endsWith("```")) {
      parsedResult = parsedResult.substring(7, parsedResult.length - 3).trim();
    } else if (parsedResult.startsWith("```") && parsedResult.endsWith("```")) {
      parsedResult = parsedResult.substring(3, parsedResult.length - 3).trim();
    }
    
    const parsed = JSON.parse(parsedResult);
    if (parsed.event && parsed.wallet && Array.isArray(parsed.tasks)) {
      return parsed;
    }
    return fallbackPlan;
  } catch (error) {
    console.error("AI Event Plan generation error, using fallback:", error);
    return fallbackPlan;
  }
};

module.exports = {
  isLLMConfigured,
  getTaskSuggestions,
  smartCategorize,
  generateSubtasks,
  estimateTaskTime,
  recommendDeadline,
  analyzeTask,
  getEventPlanningAdvice,
  generateEventPlan,
};
