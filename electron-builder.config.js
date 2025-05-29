/**
 * Optimized Electron Builder Configuration for Secret Sanctuary
 * Fixed icon handling and deployment issues
 */

module.exports = {
  appId: "com.secret.sanctuary.app",
  productName: "Secret Sanctuary",
  artifactName: "${productName}-${version}-${arch}.${ext}",

  directories: {
    output: "dist",
    buildResources: "build"
  },

  // FIXED: Better file inclusion strategy
  files: [
    "**/*",
    "!node_modules/**/*",
    "!dist/**/*",
    "!.git/**/*",
    "!*.log",
    "!README.md",
    "!.gitignore",
    "!build.js",
    "!scripts/**/*",
    // Explicitly include important files
    "main.js",
    "preload.js", 
    "package.json",
    "*.html",
    "*.css",
    "*.js",
    "assets/**/*",
    "*.jpg",
    "*.png",
    "*.ico",
    "*.icns"
  ],

  // IMPORTANT: Keep ASAR disabled for easier file access
  asar: false,

  // Alternative ASAR configuration (commented out)
  // asar: true,
  // asarUnpack: [
  //   "**/*.html",
  //   "assets/**/*",
  //   "preload.js",
  //   "*.css"
  // ],

  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64", "ia32"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico", // Make sure this file exists!
    requestedExecutionLevel: "asInvoker",
    artifactName: "${productName}-Setup-${version}.${ext}",
    fileAssociations: [
      {
        ext: "ssnote", 
        name: "Secret Sanctuary Note",
        description: "Secret Sanctuary Note File",
        icon: "assets/icon.ico"
      }
    ]
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Secret Sanctuary",
    include: "build/installer.nsh",
    perMachine: false,
    allowElevation: true,
    installerIcon: "assets/icon.ico",
    uninstallerIcon: "assets/icon.ico", 
    installerHeaderIcon: "assets/icon.ico",
    deleteAppDataOnUninstall: false,
    menuCategory: "Office"
  },

  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      }
    ],
    icon: "assets/icon.icns", // Make sure this file exists!
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    identity: null
  },

  dmg: {
    title: "Secret Sanctuary",
    icon: "assets/icon.icns",
    contents: [
      { x: 110, y: 150 },
      { x: 240, y: 150, type: "link", path: "/Applications" }
    ],
    window: {
      width: 540,
      height: 380
    }
  },

  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
      { target: "rpm", arch: ["x64"] }
    ],
    icon: "assets/icon.png", // Make sure this file exists!
    category: "Office",
    description: "A secure note-taking app built with Electron.js",
    desktop: {
      Name: "Secret Sanctuary",
      Comment: "Secure note-taking application", 
      Keywords: "notes;diary;journal;secure;password;",
      StartupWMClass: "secret-sanctuary"
    }
  },

  publish: null,
  copyright: "Copyright © 2024 Prerita_Saini",
  compression: "normal",
  buildDependenciesFromSource: false,
  npmRebuild: false,

  protocols: [
    {
      name: "secret-sanctuary",
      schemes: ["secret-sanctuary"]
    }
  ],

  fileAssociations: [
    {
      ext: "ssnote",
      name: "Secret Sanctuary Note", 
      description: "Secret Sanctuary Note File"
    }
  ],

  // ADDED: Better build configuration
  extraResources: [
    {
      from: "assets/",
      to: "assets/",
      filter: ["**/*"]
    }
  ],

  // ADDED: Security and performance optimizations
  buildVersion: process.env.BUILD_VERSION,
  
  // ADDED: Better metadata
  metadata: {
    name: "Secret Sanctuary",
    version: "1.0.0",
    description: "A secure note-taking application"
  }
};