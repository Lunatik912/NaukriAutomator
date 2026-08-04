'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { waitForPort } = require('./src/ipc');

let mainWindow = null;
let javaProcess = null;

// Parse --e2e-mock=<url> from argv (used by Playwright E2E tests)
const e2eMockArg = process.argv.find((a) => a.startsWith('--e2e-mock='));
const e2eMockUrl = e2eMockArg ? e2eMockArg.slice('--e2e-mock='.length) : null;

/**
 * Spawn the backend Java process using the packaged JRE and JAR.
 */
function spawnBackend() {
  const resourcesPath = process.resourcesPath || path.join(__dirname, '..');
  const javaExe = path.join(resourcesPath, 'jre', 'bin', 'javaw.exe');
  const jar = path.join(resourcesPath, 'backend', 'naukri-be.jar');

  // Verify resources exist to avoid crashes when JRE/backend build is missing
  if (!fs.existsSync(javaExe)) {
    console.warn(`[electron] JRE binary not found at: ${javaExe}`);
    return null;
  }
  if (!fs.existsSync(jar)) {
    console.warn(`[electron] Backend JAR not found at: ${jar}`);
    return null;
  }

  const child = spawn(javaExe, ['-jar', jar, '--server.port=0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stderr.on('data', (d) => {
    process.stderr.write(d);
  });

  child.on('error', (err) => {
    console.error('[electron] Failed to start backend:', err.message);
  });

  return child;
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#050915',
    autoHideMenuBar: true,
    title: 'NaukriAutomator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Force DevTools to open automatically on startup
  mainWindow.webContents.openDevTools();

  // Safely resolve index.html across different folder locations
  let indexPath = path.join(__dirname, 'renderer', 'index.html');

  if (!fs.existsSync(indexPath)) {
    // Fallback if vite outputs to 'dist' folder
    indexPath = path.join(__dirname, 'dist', 'index.html');
  }

  if (!fs.existsSync(indexPath)) {
    // Fallback if index.html is sitting in root
    indexPath = path.join(__dirname, 'index.html');
  }

  if (fs.existsSync(indexPath)) {
    // Construct query search parameters safely for loadFile
    const queryParams = new URLSearchParams({ port: String(port) });
    if (e2eMockUrl) {
      queryParams.append('e2eMock', e2eMockUrl);
    }

    await mainWindow.loadFile(indexPath, { search: queryParams.toString() });
  } else {
    console.error(`[electron] Could not find renderer index file at: ${indexPath}`);
    dialog.showErrorBox(
      'Missing Frontend Files',
      `Could not load app UI. Searched path:\n${indexPath}\n\nPlease run 'npm run build' before running 'npm run dist'.`
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (javaProcess) {
      javaProcess.kill();
      javaProcess = null;
    }
  });
}

// IPC Handlers
ipcMain.handle('pickFolder', async (_event, defaultPath) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath || undefined,
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('openFolder', async (_event, folderPath) => {
  if (folderPath) {
    shell.openPath(folderPath);
  }
});

app.whenReady().then(async () => {
  try {
    javaProcess = spawnBackend();
    let port = 0;
    if (javaProcess) {
      // Race waitForPort against a 5-second timeout so the UI loads quickly even if backend stalls
      port = await Promise.race([
        waitForPort(javaProcess, 60_000),
        new Promise((resolve) => setTimeout(() => resolve(0), 5000)),
      ]);
    }
    await createWindow(port);
  } catch (err) {
    console.error('[electron] Startup error:', err.message);
    await createWindow(0);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (javaProcess) {
    javaProcess.kill();
    javaProcess = null;
  }
});