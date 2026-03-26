const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron')
const os = require('os')

// ── Single instance lock ──────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show(); mainWindow.focus()
  }
})

const path   = require('path')
const fs     = require('fs')
const https  = require('https')
const http   = require('http')
const { spawn } = require('child_process')
const si = require('systeminformation')

const storePath = path.join(app.getPath('userData'), 'spicegames.json')
function readStore()    { try { if (fs.existsSync(storePath)) return JSON.parse(fs.readFileSync(storePath, 'utf8')) } catch (_) {} return {} }
function writeStore(d)  { try { fs.writeFileSync(storePath, JSON.stringify(d, null, 2)) } catch (_) {} }
function getStore(k, def) { const s = readStore(); return k in s ? s[k] : def }
function setStore(k, v) { const s = readStore(); s[k] = v; writeStore(s) }

const DEFAULT_SETTINGS = {
  theme:            'slate',
  accentColor:      '#0EA5E9',
  defaultView:      'grid',
  sortBy:           'name',
  minimizeOnLaunch: true,
  minimizeToTray:   false,
  runOnStartup:     true,
  trackPlaytime:    true,
  autoFill:         true,
  compactMode:      false,
  showItch:         true,
  showNews:         true,
  showDeals:        true,
  hltbEnabled:      true,
}

let mainWindow
let tray = null

// ── Widget window ─────────────────────────────────────────────────────────────
let widgetWindow = null

function createWindow() {
  const isDev    = process.env.NODE_ENV === 'development' || !app.isPackaged
  const iconFile = process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png'
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icons', iconFile)
    : path.join(__dirname, '../../assets/icons', iconFile)

  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 1100, minHeight: 700,
    frame: false, titleBarStyle: 'hidden',
    title: 'SpiceDeck',
    backgroundColor: '#0A0A0F',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })
  mainWindow.on('close', e => {
    const settings = { ...DEFAULT_SETTINGS, ...getStore('settings', {}) }
    if (settings.minimizeToTray && !app._isQuitting) { e.preventDefault(); mainWindow.hide() }
  })
  if (isDev) { mainWindow.loadURL('http://localhost:5173'); mainWindow.webContents.openDevTools() }
  else mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
}

function applyStartupSetting(enable) {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: enable, name: 'SpiceDeck', args: ['--hidden'] })
  } else {
    console.log('[SpiceDeck] Startup setting (dev, skipped):', enable)
  }
}

app.whenReady().then(() => {
  const settings = { ...DEFAULT_SETTINGS, ...getStore('settings', {}) }

  // ── STARTUP FIX ─────────────────────────────
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({
        openAtLogin: settings.runOnStartup !== false,
        path: app.getPath('exe'),
        args: ['--hidden']
      })
      console.log('[Startup]', app.getLoginItemSettings())
    } catch (e) {
      console.error('[Startup Error]', e)
    }
  } else {
    console.log('[Startup] Skipped (dev mode)')
  }

  // ── HIDDEN LAUNCH ───────────────────────────
  const launchHidden =
    process.argv.includes('--hidden') ||
    app.getLoginItemSettings().wasOpenedAsHidden

  createWindow()

  if (launchHidden && settings.minimizeToTray) {
    mainWindow?.hide()
  }

  // ── TRAY  ─────────────────
  setTimeout(() => {
  try {
    const isDev = !app.isPackaged
    const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    const iconSubdir = process.platform === 'win32' ? 'win' : ''

    // ── RESOLVE ICON PATH (CLEAN & RELIABLE) ──
    const iconPath = isDev
      ? path.join(__dirname, '../../assets/icons', iconSubdir, iconFile)
      : path.join(process.resourcesPath, 'assets', 'icons', iconSubdir, iconFile)

    console.log('[Tray] Mode:', isDev ? 'DEV' : 'PROD')
    console.log('[Tray] Path:', iconPath)
    console.log('[Tray] Exists:', fs.existsSync(iconPath))

    // ── LOAD ICON ──
    let img = null

    if (fs.existsSync(iconPath)) {
      img = nativeImage.createFromPath(iconPath)
    }

    // ⚠️ fallback if icon missing (prevents tray crash)
    if (!img || img.isEmpty()) {
      console.warn('[Tray] Icon missing or invalid → using fallback')
      img = nativeImage.createEmpty()
    }

    // ── CREATE TRAY ──
    tray = new Tray(img)
    tray.setToolTip('SpiceDeck')

    const menu = Menu.buildFromTemplate([
      {
        label: 'Open SpiceDeck',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit SpiceDeck',
        click: () => {
          app._isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setContextMenu(menu)

    // ── EVENTS ──
    tray.on('click', () => {
      if (mainWindow?.isVisible() && mainWindow?.isFocused()) {
        mainWindow.hide()
      } else {
        mainWindow?.show()
        mainWindow?.focus()
      }
    })

    tray.on('double-click', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })

  } catch (e) {
    console.error('[Tray Error]', e)
  }
}, 300)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const settings = { ...DEFAULT_SETTINGS, ...getStore('settings', {}) }
    if (!settings.minimizeToTray || app._isQuitting) { app._isQuitting = true; app.quit() }
  }
})
app.on('before-quit', () => { app._isQuitting = true })

// ── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('win-minimize', () => mainWindow?.minimize())
ipcMain.on('win-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize() } })
ipcMain.on('win-close',    () => mainWindow?.close())

// ── Settings & data ───────────────────────────────────────────────────────────
ipcMain.handle('get-settings',    () => ({ ...DEFAULT_SETTINGS, ...getStore('settings', {}) }))
ipcMain.handle('save-settings',   (_, s) => { setStore('settings', { ...getStore('settings', {}), ...s }); return { ok:true } })
ipcMain.handle('get-games',       () => getStore('games', []))
ipcMain.handle('save-games',      (_, games) => { setStore('games', games); return { ok:true } })
ipcMain.handle('get-wishlist',    () => getStore('wishlist', []))
ipcMain.handle('save-wishlist',   (_, items) => { setStore('wishlist', items); return { ok:true } })
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-system-info', async () => {
  const cpu = await si.cpu()
  const mem = await si.mem()
  const os = await si.osInfo()
  const gpu = await si.graphics()
  const memLayout = await si.memLayout()
  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      speed: cpu.speed,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
    },
    gpu: {
      controllers: gpu.controllers.map(c => ({
        vendor: c.vendor,
        model: c.model,
        vram: c.vram,
      })),
    },
    mem: {
      total: mem.total,
      free: mem.free,
      used: mem.used,
    },
    memLayout: memLayout.map(m => ({
      manufacturer: m.manufacturer,
      partNum: m.partNum,
      size: m.size,
      type: m.type,
    })),
    os: {
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      arch: os.arch,
    },
  }
})
ipcMain.handle('get-startup-status', () => {
  if (!app.isPackaged) return { enabled:false, supported:false, devMode:true }
  const s = app.getLoginItemSettings()
  return { enabled:s.openAtLogin, supported:true }
})
ipcMain.handle('set-run-on-startup', (_, enable) => { applyStartupSetting(enable); return { ok:true } })
ipcMain.handle('reveal-in-explorer', (_, exePath) => { shell.showItemInFolder(exePath); return { ok:true } })
ipcMain.handle('open-external',      (_, url) => { shell.openExternal(url); return { ok:true } })

// ── File dialogs ──────────────────────────────────────────────────────────────
ipcMain.handle('browse-exe', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title:'Select Game Executable',
    filters:[{ name:'Executables', extensions:['exe','app','sh','AppImage'] },{ name:'All Files', extensions:['*'] }],
    properties:['openFile'],
  })
  if (r.canceled) return null
  const exePath = r.filePaths[0]
  const name = path.basename(exePath, path.extname(exePath)).replace(/[_-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').trim()
  return { exePath, name }
})
ipcMain.handle('browse-image', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title:'Select Cover Image',
    filters:[{ name:'Images', extensions:['jpg','jpeg','png','webp','gif'] }],
    properties:['openFile'],
  })
  if (r.canceled) return null
  const buf  = fs.readFileSync(r.filePaths[0])
  const ext  = path.extname(r.filePaths[0]).slice(1).toLowerCase()
  const mime = ext==='jpg'||ext==='jpeg' ? 'image/jpeg' : `image/${ext}`
  return `data:${mime};base64,${buf.toString('base64')}`
})

// ── Game launcher ─────────────────────────────────────────────────────────────
const runningGames = new Map()

ipcMain.handle('launch-game', async (event, { gameId, exePath, launchArgs, preLaunchScript }) => {
  if (!fs.existsSync(exePath)) return { ok:false, error:'Executable not found: ' + exePath }
  if (runningGames.has(gameId)) return { ok:false, error:'Already running' }

  const settings  = { ...DEFAULT_SETTINGS, ...getStore('settings', {}) }
  const startTime = Date.now()
  let pollTimer   = null

  const cleanup = (elapsed) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    runningGames.delete(gameId)
    if (!event.sender.isDestroyed()) event.sender.send('game-stopped', { gameId, playtime:elapsed })
    if (settings.minimizeOnLaunch) mainWindow?.restore()
  }

  try {
    if (preLaunchScript?.trim() && fs.existsSync(preLaunchScript.trim())) {
      await new Promise(res => {
        const s = spawn(preLaunchScript.trim(), [], { detached:true, stdio:'ignore', cwd:path.dirname(preLaunchScript.trim()) })
        s.unref(); s.on('exit', res); s.on('error', res); setTimeout(res, 5000)
      })
    }

    if (settings.minimizeOnLaunch) mainWindow?.minimize()

    const args  = launchArgs ? launchArgs.trim().split(/\s+/).filter(Boolean) : []
    const child = spawn(`"${exePath}"`, args, {
      detached: true, stdio:'ignore', cwd:path.dirname(exePath), shell:true, windowsHide:false,
    })
    child.unref()

    if (!child.pid) { if (settings.minimizeOnLaunch) mainWindow?.restore(); return { ok:false, error:'Failed to start — check exe path' } }

    runningGames.set(gameId, { pid:child.pid, startTime })

    pollTimer = setInterval(() => {
      try { process.kill(child.pid, 0) } catch {
        clearInterval(pollTimer); pollTimer = null
        cleanup(Math.floor((Date.now() - startTime) / 60000))
      }
    }, 8000)

    child.on('exit', () => {
      setTimeout(() => {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; cleanup(Math.floor((Date.now()-startTime)/60000)) }
      }, 2000)
    })
    child.on('error', err => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      runningGames.delete(gameId)
      if (settings.minimizeOnLaunch) mainWindow?.restore()
      if (!event.sender.isDestroyed()) event.sender.send('game-stopped', { gameId, error:err.message })
    })

    return { ok:true, pid:child.pid }
  } catch (err) {
    if (pollTimer) clearInterval(pollTimer)
    runningGames.delete(gameId)
    if (settings.minimizeOnLaunch) mainWindow?.restore()
    return { ok:false, error:err.message }
  }
})

ipcMain.handle('is-game-running',  (_, gameId) => runningGames.has(gameId))
ipcMain.handle('get-running-games',() => [...runningGames.keys()])

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proto   = url.startsWith('https') ? https : http
    const method  = options.method || 'GET'
    const reqBody = options.body
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null
    const headers = { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ...(options.headers || {}) }
    if (reqBody) headers['Content-Length'] = Buffer.byteLength(reqBody)

    const parsed  = new URL(url)
    const reqOpts = { hostname:parsed.hostname, path:parsed.pathname+parsed.search, method, headers }

    const req = proto.request(reqOpts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return nodeFetch(res.headers.location, options).then(resolve).catch(reject)
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    })
    req.on('error', reject)
    if (reqBody) req.write(reqBody)
    req.end()
  })
}

function nodeFetchText(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    proto.get(url, { headers:{ 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return nodeFetchText(res.headers.location).then(resolve).catch(reject)
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode))
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    }).on('error', reject)
  })
}

function steamImages(appId) {
  const base = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}`
  return { portrait:`${base}/library_600x900.jpg`, header:`${base}/header.jpg`, capsule:`${base}/capsule_616x353.jpg`, hero:`${base}/library_hero.jpg` }
}

// ── Steam API ─────────────────────────────────────────────────────────────────
ipcMain.handle('search-game', async (_, { name }) => {
  try {
    const data  = await nodeFetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=US`)
    const items = data?.items || []
    return items.slice(0,10).map(g => {
      const sid  = String(g.id)
      const imgs = steamImages(sid)
      return { steamId:sid, name:g.name, cover:imgs.portrait, header:imgs.header, capsule:imgs.capsule, tinyImage:g.tiny_image||null, price:g.price?.final_formatted||(g.price===null?'Free':''), platforms:Object.keys(g.platforms||{}).filter(k=>g.platforms[k]), source:'Steam' }
    })
  } catch (e) { console.error('[SpiceDeck] Steam search:', e.message); return [] }
})

ipcMain.handle('get-game-details', async (_, { steamId }) => {
  try {
    const [steamRes, reviewRes, spyRes, ocSearchRes] = await Promise.allSettled([
      nodeFetch(`https://store.steampowered.com/api/appdetails?appids=${steamId}&l=english`),
      nodeFetch(`https://store.steampowered.com/appreviews/${steamId}?json=1&language=english&num_per_page=0`),
      nodeFetch(`https://steamspy.com/api.php?request=appdetails&appid=${steamId}`),
      nodeFetch(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(steamId)}`),
    ])
    const raw = steamRes.status==='fulfilled' ? steamRes.value?.[steamId] : null
    if (!raw?.success) return null
    const d = raw.data

    let reviewScore=null, reviewTotal=0
    if (reviewRes.status==='fulfilled') {
      const rs = reviewRes.value?.query_summary
      if (rs?.total_reviews>0) { reviewScore=Math.round((rs.total_positive/rs.total_reviews)*100); reviewTotal=rs.total_reviews }
    }

    let spyData = {}
    if (spyRes.status==='fulfilled' && spyRes.value) {
      const spy = spyRes.value
      spyData = { owners:spy.owners||'', avgPlaytime:spy.average_forever||0, spyTags:Object.keys(spy.tags||{}).slice(0,12) }
    }

    let ocScore=null, ocOutlet=null, ocUrl=null
    if (ocSearchRes.status==='fulfilled' && Array.isArray(ocSearchRes.value) && ocSearchRes.value.length>0) {
      const ocGame = ocSearchRes.value[0]
      try {
        const ocDetail = await nodeFetch(`https://api.opencritic.com/api/game/${ocGame.id}`)
        ocScore  = ocDetail?.averageScore ? Math.round(ocDetail.averageScore) : null
        ocOutlet = ocDetail?.numReviews ? `${ocDetail.numReviews} critic reviews` : null
        ocUrl    = `https://opencritic.com/game/${ocGame.id}/${ocGame.slug||''}`
      } catch {}
    }

    const imgs = steamImages(steamId)
    return {
      steamId, name:d.name,
      cover:imgs.portrait, header:imgs.header, capsule:imgs.capsule, hero:imgs.hero,
      description:d.short_description||'',
      fullDesc:(d.detailed_description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),
      developer:(d.developers||[]).join(', '), publisher:(d.publishers||[]).join(', '),
      released:d.release_date?.date||'',
      genres:(d.genres||[]).map(x=>x.description),
      categories:(d.categories||[]).slice(0,8).map(x=>x.description),
      platforms:Object.keys(d.platforms||{}).filter(k=>d.platforms[k]).map(k=>k.charAt(0).toUpperCase()+k.slice(1)),
      website:d.website||'', price:d.price_overview?.final_formatted||(d.is_free?'Free':''),
      screenshots:(d.screenshots||[]).slice(0,10).map(s=>s.path_full),
      steamReviewScore:reviewScore, steamReviewTotal:reviewTotal, reviewScore,
      metacritic:d.metacritic?.score||null, metacriticUrl:d.metacritic?.url||null,
      openCriticScore:ocScore, openCriticOutlets:ocOutlet, openCriticUrl:ocUrl,
      owners:spyData.owners||'', avgPlaytime:spyData.avgPlaytime||0,
      spyTags:spyData.spyTags||[],
      tags:spyData.spyTags?.length ? spyData.spyTags : (d.categories||[]).map(x=>x.description).slice(0,8),
    }
  } catch (e) { console.error('[SpiceDeck] Details:', e.message); return null }
})

ipcMain.handle('get-featured-games', async () => {
  try {
    const data = await nodeFetch('https://store.steampowered.com/api/featuredcategories/?l=english&cc=US')
    const results = []; const seen = new Set()
    for (const key of ['top_sellers','new_releases','specials','coming_soon']) {
      for (const g of (data?.[key]?.items||[]).slice(0,8)) {
        const sid = String(g.id)
        if (seen.has(sid)) continue; seen.add(sid)
        results.push({ steamId:sid, name:g.name, cover:`https://cdn.akamai.steamstatic.com/steam/apps/${sid}/capsule_616x353.jpg`, header:`https://cdn.akamai.steamstatic.com/steam/apps/${sid}/header.jpg`, price:g.final_price===0?'Free':g.final_formatted||'', discount:g.discount_percent||0, section:key, source:'Steam', platforms:Object.keys(g.platforms||{}).filter(k=>g.platforms[k]) })
      }
    }
    return results
  } catch (e) { console.error('[SpiceDeck] Featured:', e.message); return [] }
})

// ── Discover (SteamSpy + Steam) ───────────────────────────────────────────────
ipcMain.handle('discover-games', async (_, { mode='trending', genre='', search='', page=1 }) => {
  try {
    const GENRE_MAP = { action:'Action', rpg:'RPG', strategy:'Strategy', simulation:'Simulation', adventure:'Adventure', indie:'Indie', sports:'Sports', racing:'Racing', puzzle:'Puzzle', horror:'Horror', shooter:'Shooter', casual:'Casual' }
    let appids = []

    if (search.trim()) {
      const res = await nodeFetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(search.trim())}&l=english&cc=US`)
      appids = (res?.items||[]).slice(0,24).map(i => ({ appid:i.id, name:i.name, price:i.final_price===0?'Free':i.final_formatted||'' }))
    } else if (genre && GENRE_MAP[genre]) {
      const data = await nodeFetch(`https://steamspy.com/api.php?request=genre&genre=${encodeURIComponent(GENRE_MAP[genre])}`)
      const all  = Object.values(data||{})
      all.sort((a,b) => (parseInt((b.owners||'0').replace(/[^0-9]/g,''))||0) - (parseInt((a.owners||'0').replace(/[^0-9]/g,''))||0))
      appids = all.slice((page-1)*24, page*24).map(g => ({ appid:g.appid, name:g.name, owners:g.owners, score:g.score_rank }))
    } else {
      const ep   = mode==='toprated'?'top100forever':mode==='new'?'top100in2weeks':'top100in2weeks'
      const data = await nodeFetch(`https://steamspy.com/api.php?request=${ep}`)
      const all  = Object.values(data||{})
      appids = all.slice((page-1)*24, page*24).map(g => ({ appid:g.appid, name:g.name, owners:g.owners, score:g.score_rank, positive:g.positive, negative:g.negative, price:g.price==='0'?'Free':g.price?`$${(parseInt(g.price)/100).toFixed(2)}`:'' }))
    }

    const games = appids.map(g => {
      const id = String(g.appid)
      return { steamId:id, name:g.name||'', cover:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`, header:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`, capsule:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/capsule_616x353.jpg`, hero:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_hero.jpg`, price:g.price||'', owners:g.owners||'', score:g.score||null, positive:g.positive||0, negative:g.negative||0, storeUrl:`https://store.steampowered.com/app/${id}` }
    })
    return { ok:true, games, hasMore:appids.length>=24 }
  } catch (e) { console.error('[SpiceDeck] Discover:', e.message); return { ok:false, games:[], hasMore:false } }
})

ipcMain.handle('discover-details', async (_, { steamId }) => {
  try {
    const [details, spy, reviews] = await Promise.all([
      nodeFetch(`https://store.steampowered.com/api/appdetails?appids=${steamId}&l=english`),
      nodeFetch(`https://steamspy.com/api.php?request=appdetails&appid=${steamId}`),
      nodeFetch(`https://store.steampowered.com/appreviews/${steamId}?json=1&language=english&num_per_page=0`),
    ])
    const d = details?.[steamId]?.data
    if (!d) return { ok:false }
    const score = reviews?.query_summary
    const totalVotes = (score?.total_positive||0)+(score?.total_negative||0)
    const rating = totalVotes>0 ? Math.round((score.total_positive/totalVotes)*100) : null
    return {
      ok:true, steamId, name:d.name, description:d.short_description||'', longDesc:d.detailed_description||'',
      cover:`https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`,
      header:d.header_image||`https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/header.jpg`,
      hero:`https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_hero.jpg`,
      screenshots:(d.screenshots||[]).slice(0,10).map(s=>s.path_full),
      genres:(d.genres||[]).map(g=>g.description), categories:(d.categories||[]).slice(0,6).map(c=>c.description),
      developers:d.developers||[], publishers:d.publishers||[], releaseDate:d.release_date?.date||'',
      metacritic:d.metacritic?.score||null, website:d.website||null,
      price:d.is_free?'Free':d.price_overview?.final_formatted||'',
      platforms:Object.keys(d.platforms||{}).filter(k=>d.platforms[k]),
      rating, totalVotes, owners:spy?.owners||'',
      avgPlaytime:spy?.average_forever ? Math.round(spy.average_forever/60) : null,
      peakCCU:spy?.ccu||null,
    }
  } catch (e) { return { ok:false, error:e.message } }
})

// ── itch.io ───────────────────────────────────────────────────────────────────
function parseItchHTML(html) {
  const games = []
  const parts = html.split('data-game_id="')
  for (let i=1; i<parts.length; i++) {
    const gameId = parts[i].slice(0, parts[i].indexOf('"'))
    const full   = parts[i].slice(0, 2000)
    const hrefM  = full.match(/href="(https?:\/\/[^"]+\.itch\.io\/[^"]+)"/)
    const url    = hrefM ? hrefM[1] : null
    if (!url) continue
    const titleM = full.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</)
    const title  = titleM ? titleM[1].trim() : ''
    if (!title) continue
    const imgM   = full.match(/data-lazy_src="([^"]+)"/) || full.match(/data-src="([^"]+)"/) || full.match(/src="(https:\/\/img\.itch\.zone[^"]+)"/)
    const cover  = imgM ? imgM[1] : null
    const priceM = full.match(/class="[^"]*price_tag[^"]*"[^>]*>\s*\$?([\d.]+|Free|free)/i)
    const price  = priceM ? (priceM[1].toLowerCase()==='free'?'Free':'$'+priceM[1]) : 'Free'
    const genreM = full.match(/class="[^"]*genre[^"]*"[^>]*>([^<]+)</)
    const genre  = genreM ? genreM[1].trim() : ''
    const descM  = full.match(/class="[^"]*game_short_text[^"]*"[^>]*>([^<]+)</)
    const shortText = descM ? descM[1].trim() : ''
    const ratingM= full.match(/title="Rated ([0-9.]+)/)
    const rating = ratingM ? parseFloat(ratingM[1]) : null
    games.push({ id:gameId, title, cover, url, shortText, price, genre, rating })
  }
  return games
}

async function parseItchGamePage(html) {
  const get = p => { const m=html.match(p); return m?m[1].trim():null }
  const title = get(/<h1[^>]*class="[^"]*game_title[^"]*"[^>]*>([^<]+)</) || get(/<title>([^<|]+)/) || ''
  const description = (() => {
    const si = html.indexOf('class="formatted_description')
    if (si===-1) return ''
    const bs = html.indexOf('>',si)+1, be = html.indexOf('</div>',bs)
    return html.slice(bs,be).replace(/<[^>]+>/g,' ').replace(/ +/g,' ').trim().slice(0,800)
  })()
  const screenshots = []
  const ssR = /href="(https:\/\/img\.itch\.zone\/[^"]+\.(png|jpg|jpeg|gif|webp)[^"]*)"/g
  let ssM
  while ((ssM=ssR.exec(html))!==null) { if (!screenshots.includes(ssM[1])&&screenshots.length<8) screenshots.push(ssM[1]) }
  const coverM = html.match(/class="[^"]*screenshot[^"]*"[\s\S]*?src="([^"]+)"/) || html.match(/og:image[^>]+content="([^"]+)"/)
  const cover  = coverM ? coverM[1] : null
  const priceM = html.match(/class="price_tag[^"]*"[^>]*>\$?([\d.]+|Free|free)/)
  const price  = priceM ? (priceM[1].toLowerCase()==='free'?'Free':'$'+priceM[1]) : 'Free'
  const authorM= html.match(/class="[^"]*user_name[^"]*"[^>]*>([^<]+)</)
  const author = authorM ? authorM[1].trim() : null
  const tagsArr= []
  const tagParts = html.split('href="https://itch.io/games/tag-')
  for (let i=1; i<tagParts.length&&tagsArr.length<10; i++) {
    const end=tagParts[i].indexOf('"'), slug=tagParts[i].slice(0,end)
    const labelM=tagParts[i].match(/>([^<]{1,30})</)
    const label=labelM?labelM[1].trim():slug.replace(/-/g,' ')
    if (slug&&label&&label.length>1) tagsArr.push(label)
  }
  return { title, description, cover, screenshots, price, author, tags:[...new Set(tagsArr)] }
}

ipcMain.handle('fetch-itch', async (_, { sort='top-rated', genre='', page=1 }) => {
  try {
    const sortMap = { 'top-rated':'top-rated', 'new':'newest', 'featured':'featured', 'free':'free' }
    const s = sortMap[sort] || 'top-rated'
    const url = genre
      ? `https://itch.io/games/tag-${encodeURIComponent(genre)}?format=game_grid&page=${page}&sort=${s}`
      : `https://itch.io/games/${s}?format=game_grid&platform=windows&page=${page}`
    const html  = await nodeFetchText(url)
    const games = parseItchHTML(html)
    return { ok:true, games }
  } catch (e) { console.error('[SpiceDeck] itch fetch:', e.message); return { ok:false, games:[] } }
})

ipcMain.handle('search-itch', async (_, { query }) => {
  try {
    const html  = await nodeFetchText(`https://itch.io/games/top-rated?format=game_grid&q=${encodeURIComponent(query)}&platform=windows`)
    return { ok:true, games:parseItchHTML(html) }
  } catch (e) { return { ok:false, games:[] } }
})

ipcMain.handle('get-itch-details', async (_, { url }) => {
  try { const html=await nodeFetchText(url); return { ok:true, ...(await parseItchGamePage(html)), url } }
  catch (e) { return { ok:false } }
})

// ── Deals (CheapShark) ────────────────────────────────────────────────────────
ipcMain.handle('fetch-deals', async (_, { storeId='', pageSize=40, sortBy='DealRating', upperPrice=0 }) => {
  try {
    const desc = sortBy!=='Price'
    let url = `https://www.cheapshark.com/api/1.0/deals?pageSize=${pageSize}&sortBy=${sortBy}&desc=${desc?1:0}&onSale=1`
    if (storeId)    url += `&storeID=${storeId}`
    if (upperPrice) url += `&upperPrice=${upperPrice}`
    const deals = await nodeFetch(url)
    return { ok:true, deals:(deals||[]).map(d => ({ id:d.gameID, dealId:d.dealID, title:d.title, cover:d.thumb, salePrice:isNaN(parseFloat(d.salePrice))?0:parseFloat(d.salePrice), normalPrice:isNaN(parseFloat(d.normalPrice))?0:parseFloat(d.normalPrice), savings:isNaN(parseFloat(d.savings))?0:Math.round(parseFloat(d.savings)), store:d.storeID, storeId:d.storeID, metacritic:d.metacriticScore!=='0'?parseInt(d.metacriticScore):null, steamRating:d.steamRatingText||null, dealUrl:`https://www.cheapshark.com/redirect?dealID=${d.dealID}` })) }
  } catch (e) { return { ok:false, deals:[] } }
})

ipcMain.handle('fetch-stores', async () => {
  try { return { ok:true, stores:await nodeFetch('https://www.cheapshark.com/api/1.0/stores')||[] } }
  catch { return { ok:false, stores:[] } }
})

// ── Wishlist + price alerts ───────────────────────────────────────────────────
ipcMain.handle('get-full-wishlist',   () => getStore('wishlist_v2', []))
ipcMain.handle('save-full-wishlist', (_, items) => { setStore('wishlist_v2', items); return { ok:true } })

ipcMain.handle('check-wishlist-alerts', async () => {
  const wishlist = getStore('wishlist_v2', [])
  const alerts   = []
  for (const item of wishlist.filter(w=>w.targetPrice>0).slice(0,30)) {
    try {
      const res = await nodeFetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(item.name)}&limit=1`)
      if (Array.isArray(res) && res[0]) {
        const current = parseFloat(res[0].cheapest)
        if (current <= item.targetPrice) alerts.push({ id:item.id, name:item.name, cover:item.cover, targetPrice:item.targetPrice, currentPrice:current, savings:item.normalPrice?Math.round((1-current/item.normalPrice)*100):null })
      }
    } catch {}
  }
  return { ok:true, alerts }
})

ipcMain.handle('check-price-alerts', async (_, { wishlist }) => {
  const results = []
  for (const item of (wishlist||[]).slice(0,20)) {
    if (!item.targetPrice) continue
    try {
      const res = await nodeFetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(item.name)}&limit=1`)
      if (Array.isArray(res) && res[0]) {
        const price = parseFloat(res[0].cheapest)
        if (price <= item.targetPrice) results.push({ gameId:item.id, name:item.name, targetPrice:item.targetPrice, currentPrice:price })
      }
    } catch {}
  }
  return { ok:true, alerts:results }
})

// ── Price history ─────────────────────────────────────────────────────────────
ipcMain.handle('fetch-price-history', async (_, { gameName }) => {
  try {
    if (!gameName) return { ok:true, history:[], lowestEver:null }
    const search = await nodeFetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameName)}&limit=1`)
    if (!Array.isArray(search) || !search[0]?.gameID) return { ok:true, history:[], lowestEver:null }
    const gid   = search[0].gameID
    const deals = await nodeFetch(`https://www.cheapshark.com/api/1.0/deals?gameID=${gid}&sortBy=Price&desc=0&pageSize=60`)
    const results = []
    if (Array.isArray(deals)) {
      const seen = new Set()
      for (const d of deals) {
        const key = `${d.storeID}-${d.salePrice}`
        if (seen.has(key)) continue; seen.add(key)
        const ts = d.lastChange ? d.lastChange*1000 : Date.now()
        results.push({ date:new Date(ts).toISOString().slice(0,10), price:parseFloat(d.salePrice), normal:parseFloat(d.normalPrice), discount:parseInt(d.savings)||0, storeId:d.storeID, storeName:d.storeName||`Store ${d.storeID}` })
      }
      results.sort((a,b)=>a.date.localeCompare(b.date))
    }
    const gameInfo   = await nodeFetch(`https://www.cheapshark.com/api/1.0/games?id=${gid}`)
    const lowestEver = gameInfo?.info?.lowestPrice
    return { ok:true, history:results, lowestEver, gameId:gid, gameName:search[0].external }
  } catch (e) { return { ok:false, error:e.message } }
})

// ── Steam friends + achievements ──────────────────────────────────────────────
ipcMain.handle('get-steam-friends', async (_, { steamKey, steamId }) => {
  try {
    if (!steamKey || !steamId) return { ok:false, error:'API key and Steam ID required' }
    const [friends] = await Promise.allSettled([
      nodeFetch(`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamKey}&steamid=${steamId}&relationship=friend`),
    ])
    const friendIds = friends.status==='fulfilled' ? (friends.value?.friendslist?.friends||[]).slice(0,50).map(f=>f.steamid).join(',') : ''
    if (!friendIds) return { ok:true, friends:[] }
    const [summaries] = await Promise.allSettled([
      nodeFetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamKey}&steamids=${friendIds}`),
    ])
    const players = summaries.status==='fulfilled' ? summaries.value?.response?.players||[] : []
    return { ok:true, friends:players.map(p=>({ steamId:p.steamid, name:p.personaname, avatar:p.avatarmedium, state:p.personastate, gameId:p.gameid||null, gameName:p.gameextrainfo||null, profileUrl:p.profileurl })).filter(f=>f.gameId) }
  } catch (e) { return { ok:false, error:e.message } }
})

ipcMain.handle('get-achievements', async (_, { steamKey, steamId, appId }) => {
  try {
    if (!steamKey || !steamId || !appId) return { ok:false }
    const [playerAch, schemaAch] = await Promise.allSettled([
      nodeFetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?key=${steamKey}&steamid=${steamId}&appid=${appId}&l=english`),
      nodeFetch(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v0002/?key=${steamKey}&appid=${appId}&l=english`),
    ])
    const achievements = playerAch.status==='fulfilled' ? playerAch.value?.playerstats?.achievements||[] : []
    const schema = schemaAch.status==='fulfilled' ? schemaAch.value?.game?.availableGameStats?.achievements||[] : []
    const schemaMap = {}; schema.forEach(s => { schemaMap[s.name]=s })
    const unlocked = achievements.filter(a=>a.achieved===1).length
    return { ok:true, total:achievements.length, unlocked, pct:achievements.length?Math.round((unlocked/achievements.length)*100):0, list:achievements.slice(0,20).map(a => ({ name:a.apiname, displayName:schemaMap[a.apiname]?.displayName||a.apiname, icon:schemaMap[a.apiname]?.icon||null, achieved:a.achieved===1, unlockTime:a.unlocktime||null })) }
  } catch { return { ok:false } }
})

// ── Screenshots + folder scan ─────────────────────────────────────────────────
ipcMain.handle('scan-screenshots', async () => {
  try {
    const r = await dialog.showOpenDialog(mainWindow, { title:'Select screenshots folder', properties:['openDirectory'] })
    if (r.canceled) return { ok:false, files:[] }
    const dir  = r.filePaths[0]
    const exts = new Set(['.png','.jpg','.jpeg','.webp'])
    const files = []
    const scan = (d, depth=0) => {
      if (depth>3) return
      try { fs.readdirSync(d,{withFileTypes:true}).forEach(e => { if (e.isDirectory()) scan(path.join(d,e.name),depth+1); else if (exts.has(path.extname(e.name).toLowerCase())) { const fp=path.join(d,e.name); const st=fs.statSync(fp); files.push({ path:fp, name:e.name, size:st.size, mtime:st.mtime.toISOString() }) } }) } catch {}
    }
    scan(dir)
    files.sort((a,b)=>new Date(b.mtime)-new Date(a.mtime))
    const withData = files.slice(0,80).map(f => {
      try { const buf=fs.readFileSync(f.path); const ext=path.extname(f.path).slice(1).toLowerCase(); const mime=ext==='jpg'||ext==='jpeg'?'image/jpeg':`image/${ext}`; return { ...f, dataUrl:`data:${mime};base64,${buf.toString('base64')}` } }
      catch { return null }
    }).filter(Boolean)
    return { ok:true, files:withData }
  } catch { return { ok:false, files:[] } }
})

ipcMain.handle('scan-folder', async () => {
  try {
    const r = await dialog.showOpenDialog(mainWindow, { title:'Select folder to scan for games', properties:['openDirectory'] })
    if (r.canceled) return { ok:false, games:[] }
    const dir=r.filePaths[0]; const games=[]
    const scan = (d, depth=0) => {
      if (depth>3) return
      try { fs.readdirSync(d,{withFileTypes:true}).forEach(e => { if (e.isDirectory()) scan(path.join(d,e.name),depth+1); else if (e.name.endsWith('.exe')&&!e.name.match(/unins|setup|install|redist|vcredist|crash|update/i)) { const exePath=path.join(d,e.name); games.push({ name:e.name.replace('.exe','').replace(/[_-]/g,' ').trim(), exePath }) } }) } catch {}
    }
    scan(dir)
    return { ok:true, games:games.slice(0,50) }
  } catch (e) { return { ok:false, games:[], error:e.message } }
})

ipcMain.handle('import-from-steam', async () => {
  try {
    const r = await dialog.showOpenDialog(mainWindow, { title:'Select Steam libraryfolders.vdf', filters:[{ name:'VDF Files', extensions:['vdf'] }], defaultPath:'C:\\Program Files (x86)\\Steam\\steamapps', properties:['openFile'] })
    if (r.canceled) return { ok:false, games:[] }
    const content    = fs.readFileSync(r.filePaths[0],'utf8')
    const pathM      = content.match(/"path"\s+"([^"]+)"/gi)||[]
    const steamPaths = pathM.map(m=>m.replace(/.*"([^"]+)".*/,'$1').replace(/[/\\]+/g,path.sep)).filter(Boolean)
    const games = []
    for (const sp of steamPaths) {
      const appsDir = path.join(sp,'steamapps')
      if (!fs.existsSync(appsDir)) continue
      for (const acf of fs.readdirSync(appsDir).filter(f=>f.startsWith('appmanifest_')&&f.endsWith('.acf'))) {
        try {
          const txt  = fs.readFileSync(path.join(appsDir,acf),'utf8')
          const nameM=txt.match(/"name"\s+"([^"]+)"/), appidM=txt.match(/"appid"\s+"([^"]+)"/), instM=txt.match(/"installdir"\s+"([^"]+)"/)
          if (!nameM||!appidM||!instM) continue
          const sid=appidM[1], name=nameM[1], installDir=path.join(appsDir,'common',instM[1])
          const exes = fs.existsSync(installDir) ? fs.readdirSync(installDir).filter(f=>f.endsWith('.exe')).map(f=>path.join(installDir,f)) : []
          games.push({ name, steamId:sid, exePath:exes[0]||null, source:'steam-import', cover:`https://cdn.akamai.steamstatic.com/steam/apps/${sid}/library_600x900.jpg`, header:`https://cdn.akamai.steamstatic.com/steam/apps/${sid}/header.jpg` })
        } catch {}
      }
    }
    return { ok:true, games }
  } catch (e) { return { ok:false, games:[], error:e.message } }
})

// ── Game News (RSS) ───────────────────────────────────────────────────────────
ipcMain.handle('fetch-news', async () => {
  const FEEDS = [
    { name:'PC Gamer',          url:'https://www.pcgamer.com/rss/',             color:'#e53e3e' },
    { name:'Rock Paper Shotgun',url:'https://www.rockpapershotgun.com/feed',    color:'#6366F1' },
    { name:'Eurogamer',         url:'https://www.eurogamer.net/feed',           color:'#f59e0b' },
    { name:'IGN',               url:'https://feeds.feedburner.com/ign/news',    color:'#e53e3e' },
  ]
  const parseRSS = (xml, feed) => {
    const items=[]; const parts=xml.split('<item>')
    for (let i=1; i<parts.length; i++) {
      const part=parts[i]
      const get = tag => { const m=part.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1]||part.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1]||''; return m.trim() }
      const encM=part.match(/enclosure[^>]+url="([^"]+)"/)
      const medM=part.match(/media:thumbnail[^>]+url="([^"]+)"/) || part.match(/media:content[^>]+url="([^"]+)"/)
      const imgM=part.match(/<img[^>]+src="([^"]+)"/)
      const title=get('title'), link=get('link')||part.match(/<link>([^<]+)<\/link>/)?.[1]?.trim()||'', date=get('pubDate')
      const desc=get('description').replace(/<[^>]+>/g,' ').trim().slice(0,180)
      const image=encM?.[1]||medM?.[1]||imgM?.[1]||null
      if (title&&link) items.push({ title, link, date, description:desc, image, source:feed.name, sourceColor:feed.color, id:link })
    }
    return items
  }
  const results = await Promise.allSettled(FEEDS.map(async feed => { try { return parseRSS(await nodeFetchText(feed.url), feed) } catch { return [] } }))
  const all = results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
  return { ok:true, items:all }
})

// ── YouTube videos ────────────────────────────────────────────────────────────
ipcMain.handle('fetch-yt-videos', async (_, { gameName, type='trailer' }) => {
  try {
    const queries = { trailer:`${gameName} official trailer`, gameplay:`${gameName} gameplay walkthrough`, review:`${gameName} review`, tutorial:`${gameName} tutorial beginner guide` }
    const q    = encodeURIComponent(queries[type]||queries.trailer)
    const html = await nodeFetchText(`https://www.youtube.com/results?search_query=${q}&sp=EgIQAQ%3D%3D`)
    const match = html.match(/var ytInitialData = ({.+?});\s*<\/script>/)
    if (!match) return { ok:true, videos:[] }
    const data     = JSON.parse(match[1])
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents||[]
    const videos   = []
    for (const item of contents) {
      const vr = item.videoRenderer; if (!vr) continue
      const id=vr.videoId, title=vr.title?.runs?.[0]?.text||'', thumb=vr.thumbnail?.thumbnails?.slice(-1)[0]?.url||''
      const channel=vr.ownerText?.runs?.[0]?.text||'', views=vr.viewCountText?.simpleText||'', duration=vr.lengthText?.simpleText||''
      if (id&&title) videos.push({ id, title, thumb, channel, views, duration, url:`https://www.youtube.com/watch?v=${id}` })
      if (videos.length>=4) break
    }
    return { ok:true, videos }
  } catch { return { ok:true, videos:[] } }
})

// ── HowLongToBeat ─────────────────────────────────────────────────────────────
ipcMain.handle('hltb-search', async (_, { name }) => {
  try {
    const payload = JSON.stringify({ searchType:'games', searchTerms:name.split(' ').filter(Boolean), searchPage:1, size:5, searchOptions:{ games:{ userId:0, platform:'', sortCategory:'popular', rangeCategory:'main', rangeTime:{ min:0, max:0 }, gameplay:{ perspective:'', flow:'', genre:'' }, modifier:'' }, users:{ sortCategory:'postcount' }, filter:'', sort:0, randomizer:0 } })
    const res = await nodeFetch('https://howlongtobeat.com/api/search', { method:'POST', body:payload, headers:{ 'Content-Type':'application/json', 'Referer':'https://howlongtobeat.com', 'Origin':'https://howlongtobeat.com', 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
    if (!res?.data?.length) return { ok:true, results:[] }
    return { ok:true, results:res.data.slice(0,3).map(g => ({ id:g.game_id, name:g.game_name, cover:g.game_image?`https://howlongtobeat.com/games/${g.game_image}`:null, mainStory:g.comp_main?Math.round(g.comp_main/3600):null, mainExtra:g.comp_plus?Math.round(g.comp_plus/3600):null, completionist:g.comp_100?Math.round(g.comp_100/3600):null })) }
  } catch { return { ok:true, results:[] } }
})

// ── Update checker ────────────────────────────────────────────────────────────
ipcMain.handle('check-update', async () => {
  try {
    const current = app.getVersion()
    const release = await nodeFetch('https://api.github.com/repos/ash-kernel/spicedeck/releases/latest', { headers:{ 'User-Agent':'SpiceDeck' } })
    if (!release?.tag_name) return { ok:false }
    const latest = release.tag_name.replace(/^v/,'')
    return { ok:true, current, latest, hasUpdate:latest!==current, url:release.html_url||'', notes:release.body||'' }
  } catch { return { ok:false } }
})

// ── Widget window ─────────────────────────────────────────────────────────────
ipcMain.handle('toggle-widget', async () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) { widgetWindow.close(); widgetWindow=null; return { ok:true, open:false } }
  widgetWindow = new BrowserWindow({ width:280, height:80, minWidth:200, maxWidth:400, minHeight:60, maxHeight:200, frame:false, transparent:true, alwaysOnTop:true, skipTaskbar:true, resizable:true, movable:true, hasShadow:true, webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false } })
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen:false })
  const isDev = process.env.NODE_ENV==='development'||!app.isPackaged
  if (isDev) widgetWindow.loadURL('http://localhost:5173/#/widget')
  else widgetWindow.loadFile(path.join(__dirname,'../../dist/index.html'),{ hash:'widget' })
  widgetWindow.on('closed', () => { widgetWindow=null })
  return { ok:true, open:true }
})
ipcMain.handle('get-widget-state',  () => ({ open:widgetWindow!==null&&!widgetWindow?.isDestroyed() }))
ipcMain.handle('widget-set-size',   (_, { width, height }) => { if (widgetWindow&&!widgetWindow.isDestroyed()) widgetWindow.setSize(Math.min(400,Math.max(200,width)),Math.min(200,Math.max(60,height))); return { ok:true } })

// ── GOG catalogue ─────────────────────────────────────────────────────────────
ipcMain.handle('fetch-gog', async (_, { page=1, search='' }) => {
  try {
    let url = `https://catalog.gog.com/v1/catalog?productType=in:game&page=${page}&limit=48&order=desc:trending&countryCode=US&locale=en-US&currencyCode=USD`
    if (search) url += `&phrase=${encodeURIComponent(search)}`
    const data     = await nodeFetch(url)
    const gogImg   = raw => { if (!raw) return null; const base=raw.startsWith('//')?'https:'+raw:raw; return base.replace(/(_product_card_v2_)*$/,'')+' _product_card_v2_mobile_slider_639.jpg' }
    return { ok:true, games:(data?.products||[]).map(g => ({ id:g.id, title:g.title, cover:gogImg(g.coverHorizontal)||gogImg(g.coverVertical)||null, url:`https://www.gog.com/en/game/${g.slug}`, price:g.price?.finalMoney?.amount==='0.00'?'Free':g.price?.finalMoney?.amount?`$${parseFloat(g.price.finalMoney.amount).toFixed(2)}`:'', discount:g.price?.discount||0, rating:g.reviewsRating?Math.round(g.reviewsRating):null, genres:(g.genres||[]).map(x=>x.name) })) }
  } catch { return { ok:false, games:[] } }
})