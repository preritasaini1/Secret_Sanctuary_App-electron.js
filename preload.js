// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  checkSetup: () => ipcRenderer.invoke('check-setup'),
  setupAccount: (data) => ipcRenderer.invoke('setup-account', data),
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  
  // Navigation
  navigateTo: (page) => ipcRenderer.send('navigate-to', page),
  loginSuccess: () => ipcRenderer.send('login-success'),
  
  // Password reset
  getSecurityQuestion: () => ipcRenderer.invoke('get-security-question'),
  verifySecurityAnswer: (answer) => ipcRenderer.invoke('verify-security-answer', answer),
  resetPassword: (password) => ipcRenderer.invoke('reset-password', password),
  
  // App reset
  resetApp: (options) => ipcRenderer.invoke('reset-app', options),
  restartApp: () => ipcRenderer.send('restart-app'),
  
  // Notes
  saveNote: (noteText) => ipcRenderer.send('save-note', noteText),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),
  updateNote: (noteId, content) => ipcRenderer.send('update-note', noteId, content),
  searchNotes: (searchTerm) => ipcRenderer.invoke('search-notes', searchTerm),
  exportNotes: () => ipcRenderer.invoke('export-notes'),
  
  // Notification system
  showNotification: (title, body, options) => ipcRenderer.invoke('show-notification', title, body, options),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
  
  // Event listeners
  onNoteSaved: (callback) => ipcRenderer.on('note-saved', callback),
  onNoteUpdated: (callback) => ipcRenderer.on('note-updated', callback),
  onShowAuthRequired: (callback) => ipcRenderer.on('show-auth-required', callback),
  onNotificationResult: (callback) => ipcRenderer.on('notification-result', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Enhanced error handling for preload
process.on('uncaughtException', (error) => {
  console.error('Preload uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Preload unhandled rejection at:', promise, 'reason:', reason);
});

// For backward compatibility with existing code that uses ipcRenderer directly
window.ipcRenderer = ipcRenderer;

// Additional utilities for the app
window.electronUtils = {
  // Helper to check if running in packaged mode
  isPackaged: () => {
    return process.env.NODE_ENV === 'production' || !process.defaultApp;
  },
  
  // Helper to get platform info
  getPlatform: () => {
    return process.platform;
  },
  
  // Helper to get app version
  getVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  }
};