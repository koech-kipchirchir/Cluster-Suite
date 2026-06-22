import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: false,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

const savedToken = localStorage.getItem("token");
if (savedToken) {
  setAuthToken(savedToken);
}

// ========================
// TASK ENDPOINTS
// ========================
export const taskApi = {
  getAll: (filters = {}) => api.get("/tasks", { params: filters }),
  create: (task) => api.post("/tasks", task),
  bulk: (tasks) => api.post("/tasks/bulk", { tasks }),
  bulkUpdate: (taskIds, updates) => api.put("/tasks/bulk", { task_ids: taskIds, updates }),
  bulkDelete: (taskIds) => api.post("/tasks/bulk-delete", { task_ids: taskIds }),
  update: (id, completed) => api.put(`/tasks/${id}`, { completed }),
  edit: (id, task) => api.put(`/tasks/edit/${id}`, task),
  delete: (id) => api.delete(`/tasks/${id}`),
  deleteMany: (ids) => Promise.all(ids.map(id => api.delete(`/tasks/${id}`))),
};

// ========================
// TASK TEMPLATES ENDPOINTS
// ========================
export const taskTemplateApi = {
  getAll: () => api.get("/tasks/templates/all"),
  create: (template) => api.post("/tasks/templates", template),
  apply: (templateId, title) => api.post(`/tasks/templates/${templateId}/apply`, { title }),
  delete: (templateId) => api.delete(`/tasks/templates/${templateId}`),
};

// ========================
// TASK DEPENDENCIES ENDPOINTS
// ========================
export const taskDependencyApi = {
  get: (taskId) => api.get(`/tasks/${taskId}/dependencies`),
  add: (taskId, dependsOnTaskId) => api.post(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`),
  remove: (taskId, dependsOnTaskId) => api.delete(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`),
};

// ========================
// SUBTASKS ENDPOINTS
// ========================
export const subtasksApi = {
  getAll: (taskId) => api.get(`/tasks/${taskId}/subtasks`),
  create: (taskId, title) => api.post(`/tasks/${taskId}/subtasks`, { title }),
  toggle: (subtaskId, completed) =>
    api.put(`/tasks/subtasks/${subtaskId}`, { completed }),
  delete: (subtaskId) => api.delete(`/tasks/subtasks/${subtaskId}`),
};

// ========================
// TAGS ENDPOINTS
// ========================
export const tagsApi = {
  getUserTags: () => api.get("/tasks/user/tags"),
  create: (name, color) => api.post("/tasks/user/tags", { name, color }),
  addToTask: (taskId, tagId) => api.post(`/tasks/${taskId}/tags/${tagId}`),
  removeFromTask: (taskId, tagId) =>
    api.delete(`/tasks/${taskId}/tags/${tagId}`),
  getTaskTags: (taskId) => api.get(`/tasks/${taskId}/tags`),
};

// ========================
// TIME TRACKING ENDPOINTS
// ========================
export const timeTrackingApi = {
  start: (taskId) => api.post(`/tasks/${taskId}/time/start`),
  stop: (taskId, minutes) =>
    api.post(`/tasks/${taskId}/time/stop`, { minutes }),
};

// ========================
// AI ENDPOINTS
// ========================
export const aiApi = {
  getSuggestions: (taskId) => api.get(`/tasks/${taskId}/ai/suggestions`),
  categorize: (taskId) => api.post(`/tasks/${taskId}/ai/categorize`),
  generateSubtasks: (taskId) =>
    api.post(`/tasks/${taskId}/ai/generate-subtasks`),
  estimateTime: (taskId) => api.post(`/tasks/${taskId}/ai/estimate`),
  recommendDeadline: (taskId) =>
    api.post(`/tasks/${taskId}/ai/recommend-deadline`),
  analyzeTask: (taskId) => api.get(`/tasks/${taskId}/ai/analyze`),
  feedback: (eventId, rating, text) =>
    api.post(`/tasks/ai/feedback`, { event_id: eventId, rating, feedback_text: text }),
};

// ========================
// TASK ANALYTICS ENDPOINTS
// ========================
export const taskAnalyticsApi = {
  getCompletionTrends: () => api.get("/tasks/analytics/completion-trends"),
  getCategoryDistribution: () => api.get("/tasks/analytics/category-distribution"),
  getPriorityDistribution: () => api.get("/tasks/analytics/priority-distribution"),
  getOverview: () => api.get("/tasks/analytics/overview"),
  getBustiestTimes: () => api.get("/tasks/analytics/busiest-times"),
  getCompletionVelocity: () => api.get("/tasks/analytics/completion-velocity"),
  getTimeAnalysis: () => api.get("/tasks/analytics/time-analysis"),
  getCategoryTimeSpent: () => api.get("/tasks/analytics/category-time-spent"),
  getPriorityCompletionRate: () => api.get("/tasks/analytics/priority-completion-rate"),
};

// ========================
// PLANNER API
// ========================
export const plannerApi = {
  getEvents: () => api.get("/planner"),
  createEvent: (event) => api.post("/planner", event),
  updateEvent: (id, event) => api.put(`/planner/${id}`, event),
  deleteEvent: (id) => api.delete(`/planner/${id}`),
  getWallets: () => api.get("/planner/wallets"),
  createWallet: (wallet) => api.post("/planner/wallets", wallet),
  updateWallet: (id, wallet) => api.put(`/planner/wallets/${id}`, wallet),
  deleteWallet: (id) => api.delete(`/planner/wallets/${id}`),
  getTemplates: () => api.get("/planner/templates"),
  duplicateEvent: (id) => api.post(`/planner/${id}/duplicate`),
  duplicateWallet: (id) => api.post(`/planner/wallets/${id}/duplicate`),
  getRecommendations: () => api.post("/planner/recommendations"),
  getEventAdvice: (id) => api.post(`/planner/${id}/ai-assist`),
  generatePlan: (prompt) => api.post("/planner/ai-generate-plan", { prompt }),
};

// ========================
// PLANNER ANALYTICS ENDPOINTS
// ========================
export const plannerAnalyticsApi = {
  getSavingsVelocity: () => api.get("/planner/analytics/savings-velocity"),
  getEventForecast: () => api.get("/planner/analytics/event-forecast"),
  getGanttChart: () => api.get("/planner/analytics/gantt-chart"),
  getWalletBreakdown: (eventId) => api.get(`/planner/${eventId}/wallet-breakdown`),
};

// ========================
// USER / PROFILE ENDPOINTS
// ========================
export const userApi = {
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

export default api;
