const { app, BrowserWindow, ipcMain, Menu, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let isAuthenticated = false; // Global authentication state

// Use app.getPath('userData') to store files in a writable location
const notesPath = path.join(app.getPath('userData'), 'notes.json');
const configPath = path.join(app.getPath('userData'), 'config.json');

// Enhanced helper function for resource paths
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    // In production, resources are in different locations
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, relativePath);
}

// Enhanced helper function for HTML files
function getHtmlPath(fileName) {
  if (app.isPackaged) {
    // Check multiple possible locations in packaged app
    const possiblePaths = [
      path.join(process.resourcesPath, fileName),
      path.join(process.resourcesPath, 'app.asar.unpacked', fileName),
      path.join(__dirname, fileName)
    ];
    
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`Found HTML file at: ${filePath}`);
          return filePath;
        }
      } catch (error) {
        console.log(`HTML file not found at ${filePath}`);
      }
    }
    
    // Fallback to first path
    console.log(`Using fallback HTML path: ${possiblePaths[0]}`);
    return possiblePaths[0];
  }
  return path.join(__dirname, fileName);
}

// Enhanced helper function for assets
function getAssetPath(assetName) {
  if (app.isPackaged) {
    // Try multiple possible locations for assets
    const locations = [
      path.join(process.resourcesPath, 'assets', assetName),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', assetName),
      path.join(__dirname, 'assets', assetName),
      path.join(process.resourcesPath, assetName) // Direct in resources
    ];
    
    for (const location of locations) {
      try {
        if (fs.existsSync(location)) {
          console.log(`Found asset at: ${location}`);
          return location;
        }
      } catch (error) {
        console.log(`Asset not found at ${location}`);
      }
    }
    
    // Fallback to first location
    console.log(`Using fallback asset path: ${locations[0]}`);
    return locations[0];
  }
  return path.join(__dirname, 'assets', assetName);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,     // Enable for compatibility
      contextIsolation: false,   // Disable for compatibility with existing code
      enableRemoteModule: false,
      webSecurity: false // Enable for local file loading
    },
    icon: getIconPath(),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Initialize notifications after window is ready
    initializeNotifications();
  });

  // Check if setup is complete, if not go to setup, else login
  checkSetupAndNavigate();

  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Enhanced window events for better user experience
  mainWindow.on('minimize', () => {
    // Show notification when minimized (with better error handling)
    if (isAuthenticated) {
      showNotificationSafe('Secret Sanctuary', 'App minimized to system tray');
    }
  });
}

// Initialize notifications with proper setup
function initializeNotifications() {
  try {
    // Set app user model ID for Windows (important for notifications)
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.secret.sanctuary.app');
    }
    
    // Check notification support
    const isSupported = Notification.isSupported();
    console.log('Notification support status:', isSupported);
    
    if (isSupported) {
      console.log('Notifications are supported and initialized');
      // Test notification to ensure they're working
      setTimeout(() => {
        showNotificationSafe('Secret Sanctuary', 'Application started successfully!', { silent: true });
      }, 2000);
    } else {
      console.warn('Notifications are not supported on this system');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

// Enhanced icon path function
function getIconPath() {
  const iconPaths = {
    win32: ['icon.ico'],
    darwin: ['icon.icns'], 
    linux: ['icon.png']
  };
  
  const iconNames = iconPaths[process.platform] || iconPaths.linux;
  
  for (const iconName of iconNames) {
    if (app.isPackaged) {
      const possiblePaths = [
        path.join(process.resourcesPath, 'assets', iconName),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', iconName),
        path.join(__dirname, 'assets', iconName),
        path.join(process.resourcesPath, iconName) // Direct in resources
      ];
      
      for (const iconPath of possiblePaths) {
        try {
          if (fs.existsSync(iconPath)) {
            console.log(`Found icon at: ${iconPath}`);
            return iconPath;
          }
        } catch (error) {
          console.log(`Icon not found at ${iconPath}`);
        }
      }
      
      // Return first path as fallback
      console.log(`Using fallback icon path: ${possiblePaths[0]}`);
      return possiblePaths[0];
    } else {
      return path.join(__dirname, 'assets', iconName);
    }
  }
}

async function checkSetupAndNavigate() {
  try {
    const setupComplete = await isSetupComplete();
    if (setupComplete) {
      mainWindow.loadFile(getHtmlPath('login.html'));
    } else {
      mainWindow.loadFile(getHtmlPath('setup.html'));
    }
  } catch (error) {
    console.error('Error checking setup:', error);
    mainWindow.loadFile(getHtmlPath('setup.html'));
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (isAuthenticated) {
              mainWindow.loadFile(getHtmlPath('new_note.html'));
              showNotificationSafe('New Note', 'Creating a new note...');
            } else {
              showAuthRequired();
            }
          }
        },
        {
          label: 'View Notes',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (isAuthenticated) {
              mainWindow.loadFile(getHtmlPath('saved_notes.html'));
              showNotificationSafe('Notes', 'Opening saved notes...');
            } else {
              showAuthRequired();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reset App',
          click: () => {
            mainWindow.loadFile(getHtmlPath('secure_reset.html'));
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => {
            logout();
          }
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            showDialog('info', 'About Secret Sanctuary', 
              'Secret Sanctuary v1.0.0', 
              'A sweet and secure note-taking app built with Electron.js.\n\nCreated by: Prerita_Saini');
          }
        },
        {
          label: 'App Data Location',
          click: () => {
            showDialog('info', 'App Data Location', 
              'Your app data is stored at:', 
              app.getPath('userData'));
          }
        },
        {
          label: 'Test Notification',
          click: () => {
            showNotificationSafe('Test Notification', 'This is a test notification to check if notifications are working properly.');
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Enhanced and safer notification function
function showNotificationSafe(title, body, options = {}) {
  try {
    // Force check notification support
    const isSupported = Notification.isSupported();
    console.log('Notification support check:', isSupported);
    
    if (!isSupported) {
      console.log('Notifications not supported on this system');
      // Fallback to console log for debugging
      console.log(`[NOTIFICATION] ${title}: ${body}`);
      return null;
    }

    const notificationOptions = {
      title: title || 'Secret Sanctuary',
      body: body || '',
      silent: options.silent || false,
      timeoutType: 'default',
      urgency: 'normal',
      ...options
    };

    // Try to set icon with better error handling
    try {
      const iconPath = getIconPath();
      if (iconPath && fs.existsSync(iconPath)) {
        notificationOptions.icon = iconPath;
        console.log(`Using notification icon: ${iconPath}`);
      } else {
        console.log('Notification icon not found, proceeding without icon');
      }
    } catch (iconError) {
      console.log('Could not set notification icon:', iconError.message);
    }

    console.log('Creating notification with options:', JSON.stringify(notificationOptions, null, 2));
    
    const notification = new Notification(notificationOptions);

    // Enhanced event handlers
    notification.on('show', () => {
      console.log('✅ Notification shown successfully');
    });

    notification.on('click', () => {
      console.log('👆 Notification clicked');
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.show();
      }
    });

    notification.on('close', () => {
      console.log('❌ Notification closed');
    });

    notification.on('failed', (error) => {
      console.error('💥 Notification failed:', error);
    });

    // Show the notification with error handling
    try {
      notification.show();
      console.log('📢 Notification.show() called successfully');
    } catch (showError) {
      console.error('Error calling notification.show():', showError);
      throw showError;
    }

    return notification;
  } catch (error) {
    console.error('❌ Error in showNotificationSafe:', error);
    console.log(`[FALLBACK LOG] ${title} - ${body}`);
    
    // Try alternative notification method for Windows
    if (process.platform === 'win32') {
      try {
        console.log('Attempting Windows-specific notification method...');
        const winNotification = new Notification({
          title: title || 'Secret Sanctuary',
          body: body || '',
          silent: true // Start with silent to avoid permission issues
        });
        winNotification.show();
        console.log('✅ Windows notification shown');
        return winNotification;
      } catch (winError) {
        console.error('Windows notification also failed:', winError);
      }
    }
    
    return null;
  }
}

// Wrapper for backward compatibility
function showNotification(title, body, options = {}) {
  return showNotificationSafe(title, body, options);
}

// Enhanced dialog function
function showDialog(type, title, message, detail = '') {
  if (!mainWindow) return;

  return dialog.showMessageBox(mainWindow, {
    type: type,
    title: title,
    message: message,
    detail: detail,
    buttons: ['OK'],
    defaultId: 0
  });
}

function showAuthRequired() {
  const currentURL = mainWindow.webContents.getURL();
  
  if (currentURL.includes('secure_reset.html')) {
    mainWindow.webContents.send('show-auth-required');
  } else {
    showDialog('warning', 'Authentication Required', 
      'Please login first to access this feature.');
    
    showNotificationSafe('Authentication Required', 
      'Please login to access this feature');
    
    mainWindow.loadFile(getHtmlPath('login.html'));
  }
}

function logout() {
  isAuthenticated = false;
  showNotificationSafe('Logged Out', 'You have been successfully logged out');
  mainWindow.loadFile(getHtmlPath('login.html'));
}

// Reset app function
async function resetApp(options = {}) {
  try {
    const { clearNotes = false, clearAll = false } = options;
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('Deleted config.json');
    }
    
    if (clearNotes || clearAll) {
      if (fs.existsSync(notesPath)) {
        fs.unlinkSync(notesPath);
        console.log('Deleted notes.json');
      }
    }
    
    isAuthenticated = false;
    
    showNotificationSafe('App Reset', 'Application has been reset successfully');
    
    return { success: true, message: 'App reset successfully' };
  } catch (error) {
    console.error('Error resetting app:', error);
    return { success: false, error: error.message };
  }
}

// Utility functions for password hashing
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashToVerify;
}

// Ensure the notes.json file exists in the userData folder
function ensureNotesFile() {
  try {
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    if (!fs.existsSync(notesPath)) {
      fs.writeFileSync(notesPath, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error ensuring notes file:', error);
  }
}

// Config file operations
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    return null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

function saveConfig(config) {
  try {
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

function isSetupComplete() {
  const config = loadConfig();
  return config && config.passwordHash && config.securityQuestion && config.securityAnswer;
}

// Enhanced app initialization
app.whenReady().then(() => {
  // Set app user model ID BEFORE creating window (critical for Windows notifications)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.secret.sanctuary.app');
    console.log('✅ App User Model ID set for Windows');
  }

  // Additional Windows-specific notification setup
  if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient('secret-sanctuary');
  }

  ensureNotesFile();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Handle certificate errors in production
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('file://')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Setup IPC handlers
ipcMain.handle('check-setup', async () => {
  return isSetupComplete();
});

ipcMain.handle('setup-account', async (event, { password, securityQuestion, securityAnswer }) => {
  try {
    const { hash, salt } = hashPassword(password);
    
    const config = {
      passwordHash: hash,
      passwordSalt: salt,
      securityQuestion: securityQuestion,
      securityAnswer: securityAnswer.toLowerCase(),
      setupComplete: true,
      createdAt: new Date().toISOString()
    };

    const saved = saveConfig(config);
    
    if (saved) {
      showNotificationSafe('Setup Complete', 'Your account has been set up successfully!');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save configuration' };
    }
  } catch (error) {
    console.error('Setup error:', error);
    return { success: false, error: 'An error occurred during setup' };
  }
});

// Authentication IPC handlers
ipcMain.handle('verify-password', async (event, password) => {
  try {
    const config = loadConfig();
    
    if (!config || !config.passwordHash || !config.passwordSalt) {
      return { success: false, error: 'No password configured' };
    }

    const isValid = verifyPassword(password, config.passwordHash, config.passwordSalt);
    
    if (isValid) {
      showNotificationSafe('Login Successful', 'Welcome back to Secret Sanctuary!');
    }
    
    return { success: isValid };
  } catch (error) {
    console.error('Password verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
});

ipcMain.on('login-success', () => {
  isAuthenticated = true;
});

ipcMain.handle('check-auth', () => {
  return isAuthenticated;
});

// Forgot password IPC handlers
ipcMain.handle('get-security-question', async () => {
  try {
    const config = loadConfig();
    
    if (!config || !config.securityQuestion) {
      return { success: false, error: 'No security question configured' };
    }

    return { 
      success: true, 
      data: { question: config.securityQuestion }
    };
  } catch (error) {
    console.error('Error getting security question:', error);
    return { success: false, error: 'Failed to load security question' };
  }
});

ipcMain.handle('verify-security-answer', async (event, answer) => {
  try {
    const config = loadConfig();
    
    if (!config || !config.securityAnswer) {
      return { success: false, error: 'No security answer configured' };
    }

    const isValid = answer.toLowerCase().trim() === config.securityAnswer.trim();
    return { success: isValid };
  } catch (error) {
    console.error('Error verifying security answer:', error);
    return { success: false, error: 'Verification failed' };
  }
});

ipcMain.handle('reset-password', async (event, newPassword) => {
  try {
    const config = loadConfig();
    
    if (!config) {
      return { success: false, error: 'Configuration not found' };
    }

    const { hash, salt } = hashPassword(newPassword);
    
    config.passwordHash = hash;
    config.passwordSalt = salt;
    config.passwordResetAt = new Date().toISOString();

    const saved = saveConfig(config);
    
    if (saved) {
      showNotificationSafe('Password Reset', 'Your password has been reset successfully!');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save new password' };
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: 'An error occurred during password reset' };
  }
});

// Reset app IPC handler
ipcMain.handle('reset-app', async (event, options = {}) => {
  return await resetApp(options);
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

// Navigation with auth check
ipcMain.on('navigate-to', (event, page) => {
  if (!isAuthenticated && page !== 'login' && page !== 'setup' && page !== 'forgot-password' && page !== 'secure-reset') {
    showAuthRequired();
    return;
  }
  
  switch (page) {
    case 'new-note':
      mainWindow.loadFile(getHtmlPath('new_note.html'));
      break;
    case 'saved-notes':
      mainWindow.loadFile(getHtmlPath('saved_notes.html'));
      break;
    case 'index':
      mainWindow.loadFile(getHtmlPath('index.html'));
      break;
    case 'login':
      mainWindow.loadFile(getHtmlPath('login.html'));
      break;
    case 'setup':
      mainWindow.loadFile(getHtmlPath('setup.html'));
      break;
    case 'forgot-password':
      mainWindow.loadFile(getHtmlPath('forgot_password.html'));
      break;
    case 'secure-reset':
      mainWindow.loadFile(getHtmlPath('secure_reset.html'));
      break;
    default:
      mainWindow.loadFile(getHtmlPath('login.html'));
  }
});

// Enhanced note handlers
ipcMain.on('save-note', (event, noteText) => {
  try {
    let notes = [];

    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      notes = fileContent ? JSON.parse(fileContent) : [];
    }

    const newNote = {
      id: Date.now(),
      content: noteText.trim(),
      timestamp: new Date().toISOString(),
      created: new Date().toLocaleDateString(),
      wordCount: noteText.trim().split(/\s+/).length
    };

    notes.unshift(newNote);
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));

    showNotificationSafe('Note Saved', `Note saved with ${newNote.wordCount} words`);
    event.reply('note-saved', { success: true, note: newNote });
  } catch (error) {
    console.error('Error saving note:', error);
    event.reply('note-saved', { success: false, error: error.message });
  }
});

ipcMain.handle('get-notes', async () => {
  try {
    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      return fileContent ? JSON.parse(fileContent) : [];
    }
    return [];
  } catch (error) {
    console.error('Error reading notes:', error);
    return [];
  }
});

ipcMain.handle('delete-note', async (event, noteId) => {
  try {
    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      let notes = fileContent ? JSON.parse(fileContent) : [];

      const idToDelete = Number(noteId);
      const originalLength = notes.length;
      notes = notes.filter(note => note.id !== idToDelete);

      if (notes.length < originalLength) {
        fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
        showNotificationSafe('Note Deleted', 'Note has been deleted successfully');
        return { success: true, noteId };
      } else {
        return { success: false, error: 'Note not found' };
      }
    }
    return { success: false, error: 'Notes file not found' };
  } catch (error) {
    console.error('Error deleting note:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('update-note', (event, noteId, newContent) => {
  try {
    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      let notes = fileContent ? JSON.parse(fileContent) : [];
      
      const noteIndex = notes.findIndex(note => note.id === noteId);
      if (noteIndex !== -1) {
        notes[noteIndex].content = newContent.trim();
        notes[noteIndex].lastModified = new Date().toISOString();
        notes[noteIndex].wordCount = newContent.trim().split(/\s+/).length;
        
        fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
        showNotificationSafe('Note Updated', 'Your note has been updated successfully');
        event.reply('note-updated', { success: true, note: notes[noteIndex] });
      } else {
        event.reply('note-updated', { success: false, error: 'Note not found' });
      }
    }
  } catch (error) {
    console.error('Error updating note:', error);
    event.reply('note-updated', { success: false, error: error.message });
  }
});

ipcMain.handle('search-notes', async (event, searchTerm) => {
  try {
    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      const notes = fileContent ? JSON.parse(fileContent) : [];
      
      if (!searchTerm) return notes;
      
      const filteredNotes = notes.filter(note => 
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return filteredNotes;
    }
    return [];
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
});

ipcMain.handle('export-notes', async () => {
  try {
    if (fs.existsSync(notesPath)) {
      const fileContent = fs.readFileSync(notesPath, 'utf8');
      const notes = fileContent ? JSON.parse(fileContent) : [];
      
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Notes',
        defaultPath: 'my-notes.txt',
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled) {
        let exportContent = 'My Notes Export\n';
        exportContent += '================\n\n';
        
        notes.forEach((note, index) => {
          exportContent += `Note ${index + 1}\n`;
          exportContent += `Created: ${note.created}\n`;
          exportContent += `Word Count: ${note.wordCount}\n`;
          exportContent += '---\n';
          exportContent += note.content + '\n\n';
          exportContent += '================\n\n';
        });
        
        fs.writeFileSync(result.filePath, exportContent);
        showNotificationSafe('Export Complete', `Notes exported to ${result.filePath}`);
        return { success: true, path: result.filePath };
      }
    }
    return { success: false, error: 'Export cancelled' };
  } catch (error) {
    console.error('Error exporting notes:', error);
    return { success: false, error: error.message };
  }
});