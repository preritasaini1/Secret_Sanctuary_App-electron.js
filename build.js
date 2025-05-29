#!/usr/bin/env node

/**
 * Enhanced build script for Secret Sanctuary
 * Ensures all files are properly prepared for production build
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkRequiredFiles() {
  log('🔍 Checking required files...', colors.blue);
  
  const requiredFiles = [
    'main.js',
    'package.json'
  ];
  
  const htmlFiles = [
    'index.html',
    'login.html',
    'setup.html',
    'new_note.html',
    'saved_notes.html',
    'forgot_password.html',
    'secure_reset.html'
  ];

  const assetFiles = [
    'assets/icon.ico',
    'assets/icon.png',
    'Front_Note.jpg'
  ];
  
  let allFilesExist = true;
  
  // Check required files
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Missing required file: ${file}`, colors.red);
      allFilesExist = false;
    } else {
      log(`✅ Found: ${file}`, colors.green);
    }
  }
  
  // Check HTML files
  for (const file of htmlFiles) {
    if (!fs.existsSync(file)) {
      log(`⚠️  Missing HTML file: ${file}`, colors.yellow);
    } else {
      log(`✅ Found: ${file}`, colors.green);
    }
  }

  // Check asset files
  for (const file of assetFiles) {
    if (!fs.existsSync(file)) {
      log(`⚠️  Missing asset file: ${file}`, colors.yellow);
    } else {
      log(`✅ Found: ${file}`, colors.green);
    }
  }
  
  return allFilesExist;
}

function ensureBuildDirectories() {
  log('📁 Ensuring build directories exist...', colors.blue);
  
  const directories = ['build', 'dist'];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ Created directory: ${dir}`, colors.green);
    }
  }
}

function createMissingIcons() {
  log('🎨 Checking and creating missing icons...', colors.blue);
  
  // Ensure assets directory exists
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
    log('✅ Created assets directory', colors.green);
  }

  // Check for icon files and create placeholders if missing
  const iconFiles = [
    { file: 'assets/icon.ico', desc: 'Windows icon' },
    { file: 'assets/icon.png', desc: 'Linux icon' },
    { file: 'assets/icon.icns', desc: 'macOS icon' }
  ];

  for (const { file, desc } of iconFiles) {
    if (!fs.existsSync(file)) {
      log(`⚠️  Missing ${desc}: ${file}`, colors.yellow);
      log(`💡 Please add your ${desc} file at ${file}`, colors.cyan);
    } else {
      log(`✅ Found ${desc}: ${file}`, colors.green);
    }
  }
}

function copyConfigFile() {
  log('📋 Setting up configuration files...', colors.blue);
  
  // Ensure installer.nsh exists
  const installerNsh = 'build/installer.nsh';
  if (!fs.existsSync(installerNsh)) {
    const defaultInstallerContent = `; Custom installer script for Secret Sanctuary
!macro customInstall
  ; Register for Windows notifications
  WriteRegStr HKCU "SOFTWARE\\Classes\\AppUserModelId\\com.secret.sanctuary.app" "DisplayName" "Secret Sanctuary"
  WriteRegStr HKCU "SOFTWARE\\Classes\\AppUserModelId\\com.secret.sanctuary.app" "IconUri" "$INSTDIR\\resources\\assets\\icon.ico"
  
  ; Create file association
  WriteRegStr HKCU "SOFTWARE\\Classes\\.ssnote" "" "SecretSanctuaryNote"
  WriteRegStr HKCU "SOFTWARE\\Classes\\SecretSanctuaryNote" "" "Secret Sanctuary Note"
  WriteRegStr HKCU "SOFTWARE\\Classes\\SecretSanctuaryNote\\DefaultIcon" "" "$INSTDIR\\resources\\assets\\icon.ico"
  WriteRegStr HKCU "SOFTWARE\\Classes\\SecretSanctuaryNote\\shell\\open\\command" "" "$INSTDIR\\Secret Sanctuary.exe %1"
!macroend

!macro customUnInstall
  ; Clean up registry entries
  DeleteRegKey HKCU "SOFTWARE\\Classes\\AppUserModelId\\com.secret.sanctuary.app"
  DeleteRegKey HKCU "SOFTWARE\\Classes\\.ssnote"
  DeleteRegKey HKCU "SOFTWARE\\Classes\\SecretSanctuaryNote"
!macroend`;
    
    fs.writeFileSync(installerNsh, defaultInstallerContent);
    log(`✅ Created ${installerNsh}`, colors.green);
  }
}

function installDependencies() {
  log('📦 Installing/updating dependencies...', colors.blue);
  
  try {
    // Check if node_modules exists and has the required packages
    const requiredPackages = ['electron', 'electron-builder'];
    let needsInstall = false;

    for (const pkg of requiredPackages) {
      const pkgPath = path.join('node_modules', pkg);
      if (!fs.existsSync(pkgPath)) {
        needsInstall = true;
        break;
      }
    }

    if (needsInstall) {
      log('Installing dependencies...', colors.yellow);
      execSync('npm install', { stdio: 'inherit' });
      log('✅ Dependencies installed', colors.green);
    } else {
      log('✅ Dependencies already installed', colors.green);
    }
  } catch (error) {
    log('⚠️  Warning: Could not install dependencies automatically', colors.yellow);
    log('Please run: npm install', colors.cyan);
  }
}

function validatePackageJson() {
  log('📋 Validating package.json...', colors.blue);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'main'];
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        log(`⚠️  Missing ${field} in package.json`, colors.yellow);
      } else {
        log(`✅ Found ${field}: ${packageJson[field]}`, colors.green);
      }
    }

    // Check if build scripts exist
    if (packageJson.scripts) {
      const buildScripts = ['build', 'dist'];
      for (const script of buildScripts) {
        if (packageJson.scripts[script]) {
          log(`✅ Found build script: ${script}`, colors.green);
        }
      }
    }

  } catch (error) {
    log('❌ Error reading package.json:', colors.red);
    console.error(error.message);
    return false;
  }
  
  return true;
}

function buildApp() {
  try {
    log('🚀 Starting Electron build process...', colors.blue);
    
    const platform = process.argv[2] || 'current';
    let command;
    
    switch (platform.toLowerCase()) {
      case 'win':
      case 'windows':
        log(`📦 Building for: Windows`, colors.magenta);
        command = 'npx electron-builder --win';
        break;
        
      case 'mac':
      case 'macos':
        log(`📦 Building for: macOS`, colors.magenta);
        command = 'npx electron-builder --mac';
        break;
        
      case 'linux':
        log(`📦 Building for: Linux`, colors.magenta);
        command = 'npx electron-builder --linux';
        break;
        
      case 'all':
        log(`📦 Building for: All platforms`, colors.magenta);
        command = 'npx electron-builder --win --mac --linux';
        break;
        
      default:
        log(`📦 Building for: Current platform`, colors.magenta);
        command = 'npx electron-builder';
    }
    
    log(`Executing: ${command}`, colors.cyan);
    
    // Execute the command with better error handling
    execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    log('🎉 Build completed successfully!', colors.green);
    log('📂 Check the dist/ folder for your packaged app', colors.blue);
    
    // List the created files
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist');
      if (distFiles.length > 0) {
        log('\n📋 Created files:', colors.cyan);
        distFiles.forEach(file => {
          const filePath = path.join('dist', file);
          const stats = fs.statSync(filePath);
          const size = (stats.size / (1024 * 1024)).toFixed(2);
          log(`   📄 ${file} (${size} MB)`, colors.green);
        });
      }
    }
    
  } catch (error) {
    log('❌ Build failed:', colors.red);
    console.error(error.message);
    
    // Provide helpful debugging information
    log('\n🔧 Troubleshooting tips:', colors.yellow);
    log('1. Make sure all dependencies are installed: npm install', colors.cyan);
    log('2. Check that all required files exist', colors.cyan);
    log('3. Verify your electron-builder configuration', colors.cyan);
    log('4. Try building with verbose output: npx electron-builder --win --publish=never', colors.cyan);
    
    process.exit(1);
  }
}

function cleanBuild() {
  log('🧹 Cleaning previous build artifacts...', colors.blue);
  
  const dirsToClean = ['dist', 'build'];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        log(`✅ Cleaned ${dir}/`, colors.green);
      } catch (error) {
        log(`⚠️  Could not clean ${dir}/: ${error.message}`, colors.yellow);
      }
    }
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean') || args.includes('-c');
  
  log(`${colors.bright}🏗️  Secret Sanctuary Enhanced Build Script${colors.reset}\n`);
  
  if (shouldClean) {
    cleanBuild();
  }
  
  // Validate package.json first
  if (!validatePackageJson()) {
    log('❌ package.json validation failed. Please fix the issues before building.', colors.red);
    process.exit(1);
  }
  
  // Check if all required files exist
  if (!checkRequiredFiles()) {
    log('\n❌ Some required files are missing. Please ensure all files are present before building.', colors.red);
    process.exit(1);
  }
  
  // Install dependencies if needed
  installDependencies();
  
  // Create missing icons (with warnings)
  createMissingIcons();
  
  // Ensure build directories exist
  ensureBuildDirectories();
  
  // Copy configuration files
  copyConfigFile();
  
  // Start build process
  buildApp();
}

// Show help
function showHelp() {
  log(`${colors.bright}Secret Sanctuary Build Script${colors.reset}\n`);
  log('Usage: node build.js [platform] [options]\n');
  log('Platforms:');
  log('  win, windows    Build for Windows');
  log('  mac, macos      Build for macOS');
  log('  linux           Build for Linux');
  log('  all             Build for all platforms');
  log('  (no platform)  Build for current platform\n');
  log('Options:');
  log('  --clean, -c     Clean previous builds');
  log('  --help, -h      Show this help\n');
  log('Examples:');
  log('  node build.js win          Build for Windows');
  log('  node build.js --clean      Clean and build for current platform');
  log('  node build.js all --clean  Clean and build for all platforms');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  checkRequiredFiles, 
  ensureBuildDirectories, 
  copyConfigFile, 
  buildApp,
  cleanBuild,
  validatePackageJson
};