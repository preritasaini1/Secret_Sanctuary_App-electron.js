// reset.js - Run this script to reset your app during development
const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine userData path based on OS
let userDataPath;
if (process.platform === 'win32') {
  userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'secret-sanctuary');
} else if (process.platform === 'darwin') {
  userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'secret-sanctuary');
} else {
  userDataPath = path.join(os.homedir(), '.config', 'secret-sanctuary');
}

const configPath = path.join(userDataPath, 'config.json');
const notesPath = path.join(userDataPath, 'notes.json');

console.log('Resetting Secret Sanctuary app...');
console.log('userData path:', userDataPath);

try {
  // Delete config file
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log('✓ Deleted config.json (setup data)');
  } else {
    console.log('- config.json not found');
  }

  // Optionally delete notes (comment out if you want to keep notes)
  if (fs.existsSync(notesPath)) {
    fs.unlinkSync(notesPath);
    console.log('✓ Deleted notes.json (saved notes)');
  } else {
    console.log('- notes.json not found');
  }

  console.log('\n✅ App reset complete! Next launch will show setup screen.');
} catch (error) {
  console.error('❌ Error resetting app:', error.message);
}

// Usage: Run this script with `node reset.js`