import React, { useState, useCallback } from "react";

// Global Loading Spinner Component
export const GlobalLoadingSpinner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const show = useCallback((msg = "Loading...") => {
    setMessage(msg);
    setIsLoading(true);
  }, []);

  const hide = useCallback(() => {
    setIsLoading(false);
    setMessage("");
  }, []);

  // Export handlers globally
  React.useEffect(() => {
    window.showLoading = show;
    window.hideLoading = hide;
  }, [show, hide]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 flex flex-col items-center gap-4 animate-slideIn">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-800 dark:text-white">{message}</p>
      </div>
    </div>
  );
};

// Global Error Toast Component
export const ErrorToast = ({ error, suggestion, onClose }) => {
  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg p-4 max-w-md animate-slideIn shadow-lg z-50">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          {suggestion && <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">💡 {suggestion}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Success Toast
export const SuccessToast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 rounded-lg p-4 max-w-md animate-slideIn shadow-lg z-50">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Modal with animations
export const AnimatedModal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slideIn">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
          <div className="text-gray-700 dark:text-gray-300 mb-6">{children}</div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
                isDangerous
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
