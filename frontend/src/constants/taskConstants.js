export const CATEGORIES = ["Personal", "Work", "School", "Urgent", "Health", "Finance", "Shopping", "Home"];
export const BOARDS = ["General", "Planning", "Execution", "Review"];
export const PRIORITIES = ["Low", "Medium", "High"];
export const RECURRENCE_OPTIONS = ["None", "Daily", "Weekly", "Monthly"];
export const REMINDER_CHANNELS = ["email", "push", "sms"];

export const INITIAL_TASK_STATE = {
  title: "", notes: "", category: "Personal", board: "General", priority: "Medium",
  due_date: "", recurrence: "None", reminder_date: "", reminder_time: "",
  reminder_channel: "email"
};