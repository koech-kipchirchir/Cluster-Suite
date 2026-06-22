// UI/UX Helper Functions and Components

// Global loading state management
export const LoadingOverlay = {
  show: null,
  hide: null,
  setHandlers: (showFn, hideFn) => {
    LoadingOverlay.show = showFn;
    LoadingOverlay.hide = hideFn;
  }
};

// Error message formatter with suggestions
export const formatErrorMessage = (error) => {
  const message = error?.response?.data?.message || error?.message || "An error occurred";
  
  const suggestions = {
    "Task not found": "The task may have been deleted. Try refreshing the page.",
    "Event not found": "The event may have been deleted. Try refreshing the page.",
    "Wallet not found": "The wallet may have been deleted. Try refreshing the page.",
    "UNIQUE constraint failed": "This item already exists. Try using a different name.",
    "Template with this name already exists": "Choose a different template name.",
    "Tag already exists": "This tag name is already in use.",
    "Task title is required": "Please enter a task title.",
    "Event name is required": "Please enter an event name.",
    "Wallet name is required": "Please enter a wallet name.",
  };

  const suggestion = Object.keys(suggestions).find(key => message.includes(key));
  
  return {
    message,
    suggestion: suggestion ? suggestions[suggestion] : "Please try again or contact support.",
    fullMessage: `${message}${suggestion ? ` - ${suggestions[suggestion]}` : ''}`
  };
};

// Undo/Redo stack
export class UndoRedoStack {
  constructor(maxSize = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
  }

  push(action) {
    this.undoStack.push(action);
    this.redoStack = [];
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return null;
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    return action;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    return action;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Real-time field preview/calculator
export const calculateFieldPreview = (fields, fieldType) => {
  const preview = {};

  if (fieldType === 'budget') {
    // Calculate remaining budget
    preview.remaining = (fields.budget_goal || 0) - (fields.current_savings || 0);
    preview.progress_percent = Math.round(((fields.current_savings || 0) / (fields.budget_goal || 1)) * 100);
    preview.status = fields.current_savings >= fields.budget_goal ? 'completed' : 'in-progress';
  }

  if (fieldType === 'timeEstimate') {
    // Calculate time difference
    preview.difference = Math.abs((fields.estimated_minutes || 0) - (fields.time_spent_minutes || 0));
    preview.variance_percent = ((preview.difference / (fields.estimated_minutes || 1)) * 100).toFixed(1);
    preview.accuracy = fields.estimated_minutes && fields.time_spent_minutes 
      ? 'good' 
      : 'incomplete';
  }

  if (fieldType === 'eventDate') {
    // Calculate days remaining
    const today = new Date();
    const eventDate = new Date(fields.date);
    preview.days_remaining = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    preview.is_past = preview.days_remaining < 0;
    preview.is_soon = preview.days_remaining <= 7;
  }

  return preview;
};

// Animation utilities
export const getAnimationClass = (animationType) => {
  const animations = {
    slideIn: "animate-slideIn",
    slideOut: "animate-slideOut",
    fadeIn: "animate-fadeIn",
    fadeOut: "animate-fadeOut",
    bounce: "animate-bounce",
    pulse: "animate-pulse",
    spin: "animate-spin"
  };
  return animations[animationType] || "";
};

// Notification queue
export class NotificationQueue {
  constructor() {
    this.notifications = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify(type, message, duration = 3000) {
    const id = Date.now();
    const notification = { id, type, message, duration, timestamp: new Date() };
    
    this.notifications.push(notification);
    this.listeners.forEach(listener => listener([...this.notifications]));

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  clear() {
    this.notifications = [];
    this.listeners.forEach(listener => listener([]));
  }

  success(message, duration) {
    return this.notify('success', message, duration);
  }

  error(message, duration) {
    return this.notify('error', message, duration);
  }

  warning(message, duration) {
    return this.notify('warning', message, duration);
  }

  info(message, duration) {
    return this.notify('info', message, duration);
  }
}

export const notificationQueue = new NotificationQueue();

// Currency formatting helper
export function formatCurrency(amount = 0, currency = 'KES') {
  try {
    const opts = { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 };
    return new Intl.NumberFormat(undefined, opts).format(Number(amount || 0));
  } catch (err) {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

export default { formatCurrency };

