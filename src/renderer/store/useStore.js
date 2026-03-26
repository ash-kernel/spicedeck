import { create } from 'zustand'

const IS = typeof window !== 'undefined' && window.spicegames != null

function uid() { return `game-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

const STATUS_OPTIONS = ['Not Started', 'Playing', 'Completed', 'Dropped', 'On Hold']
const COLLECTION_DEFAULTS = ['Favorites', 'Playing Now', 'Backlog', 'Completed', 'Wishlist']

export { STATUS_OPTIONS, COLLECTION_DEFAULTS }

export const useStore = create((set, get) => ({
  games: [],
  wishlist: [],
  runningGames: new Set(),
  sessionStarts: {},
  priceAlerts: [],
  settings: null,
  view: 'grid',
  compactMode: false,
  sortBy: 'name',
  filterGenre: 'all',
  filterStatus: 'all',
  filterCollection: 'all',
  searchQuery: '',
  selectedGame: null,
  addGameOpen: false,
  collections: [...COLLECTION_DEFAULTS],
  nudges: [],

  init: async () => {
    if (!IS) return
    const [settings, games, wishlist] = await Promise.all([
      window.spicegames.getSettings(),
      window.spicegames.getGames(),
      window.spicegames.getWishlist ? window.spicegames.getWishlist() : Promise.resolve([]),
    ])
    set({ settings, games: games || [], wishlist: wishlist || [] })

    if (settings.theme && settings.theme !== 'dark') {
      document.body.classList.add(`theme-${settings.theme}`)
    }
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent', settings.accentColor)
      const rgb = settings.accentColor.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')
      document.documentElement.style.setProperty('--accent-rgb', rgb)
    }

    window.spicegames.onGameStopped(({ gameId, playtime, error }) => {
      const { sessionStarts } = get()
      const startTime = sessionStarts[gameId]
      const sessionMins = startTime ? Math.floor((Date.now() - startTime) / 60000) : (playtime || 0)
      const sessionEntry = {
        date: new Date().toISOString(),
        duration: sessionMins,
      }

      set(s => {
        const running = new Set(s.runningGames)
        running.delete(gameId)
        const newStarts = { ...s.sessionStarts }
        delete newStarts[gameId]
        const games = s.games.map(g => {
          if (g.id !== gameId) return g
          const sessions = [...(g.sessions || []), sessionEntry].slice(-50)
          return {
            ...g,
            playtime: (g.playtime || 0) + sessionMins,
            lastPlayed: new Date().toISOString(),
            sessions,
            longestSession: Math.max(g.longestSession || 0, sessionMins),
          }
        })
        return { runningGames: running, sessionStarts: newStarts, games }
      })
      if (!error) get().saveLibrary()
    })

    get().computeNudges()
  },

  saveLibrary: async () => {
    if (!IS) return
    await window.spicegames.saveGames(get().games)
  },

  addGame: (game) => {
    const newGame = {
      id: uid(),
      addedAt: new Date().toISOString(),
      playtime: 0,
      status: 'Not Started',
      collections: [],
      notes: '',
      sessions: [],
      longestSession: 0,
      launchArgs: '',
      preLaunchScript: '',
      exeList: [],
      ...game,
    }
    set(s => ({ games: [...s.games, newGame], addGameOpen: false }))
    get().saveLibrary()
    return newGame
  },

  updateGame: (id, patch) => {
    set(s => {
      const updatedGames = s.games.map(g => g.id === id ? { ...g, ...patch } : g)
      return {
        games: updatedGames,
        selectedGame: s.selectedGame?.id === id ? { ...s.selectedGame, ...patch } : s.selectedGame,
      }
    })
    get().saveLibrary()
  },

  removeGame: (id) => {
    set(s => ({
      games: s.games.filter(g => g.id !== id),
      selectedGame: s.selectedGame?.id === id ? null : s.selectedGame,
    }))
    get().saveLibrary()
  },

  launchGame: async (game, exeOverride) => {
    if (!IS) { alert('Launch only works in the Electron desktop app'); return }
    if (get().runningGames.has(game.id)) return

    set(s => {
      const r = new Set(s.runningGames)
      r.add(game.id)
      return { runningGames: r, sessionStarts: { ...s.sessionStarts, [game.id]: Date.now() } }
    })
    get().updateGame(game.id, { lastPlayed: new Date().toISOString() })

    const exePath = exeOverride || game.exePath
    const result = await window.spicegames.launchGame({
      gameId:          game.id,
      exePath,
      launchArgs:      game.launchArgs || '',
      preLaunchScript: game.preLaunchScript || '',
    })
    if (!result.ok) {
      set(s => {
        const r = new Set(s.runningGames)
        r.delete(game.id)
        const ns = { ...s.sessionStarts }
        delete ns[game.id]
        return { runningGames: r, sessionStarts: ns }
      })
      console.error('[SpiceDeck] Launch failed:', result.error)
      throw new Error(result.error || 'Could not launch game')
    }
  },

  saveSettings: async (patch) => {
    const merged = { ...get().settings, ...patch }
    set({ settings: merged })
    if (IS) await window.spicegames.saveSettings(merged)
  },

  applyTheme: (theme) => {
    document.body.classList.remove('theme-red','theme-neon','theme-ember','theme-rose','theme-teal','theme-gold','theme-cyber')
    if (theme !== 'dark') document.body.classList.add(`theme-${theme}`)
    const defaults = { slate:'#0EA5E9', dark:'#6366F1', red:'#EF4444', neon:'#00FF88', ember:'#F97316' }
    const col = defaults[theme] || '#0EA5E9'
    document.documentElement.style.setProperty('--accent', col)
    const rgb = col.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')
    document.documentElement.style.setProperty('--accent-rgb', rgb)
    get().saveSettings({ theme, accentColor: col })
  },

  computeNudges: () => {
    const { games } = get()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const nudges = games
      .filter(g => g.lastPlayed && new Date(g.lastPlayed).getTime() < thirtyDaysAgo && g.playtime > 0)
      .slice(0, 3)
      .map(g => ({ id: g.id, name: g.name, cover: g.cover, lastPlayed: g.lastPlayed }))
    set({ nudges })
  },

  addCollection: (name) => {
    if (!name.trim()) return
    set(s => ({ collections: [...new Set([...s.collections, name.trim()])] }))
  },

  toggleGameCollection: (gameId, collection) => {
    const game = get().games.find(g => g.id === gameId)
    if (!game) return
    const cols = game.collections || []
    const updated = cols.includes(collection)
      ? cols.filter(c => c !== collection)
      : [...cols, collection]
    get().updateGame(gameId, { collections: updated })
  },

  importFromSteam: async () => {
    if (!IS) return { ok: false }
    return window.spicegames.importFromSteam()
  },

  scanFolder: async () => {
    if (!IS) return { ok: false }
    return window.spicegames.scanFolder()
  },

  addToWishlist: (item) => {
    const wl = get().wishlist
    if (wl.find(w => (w.steamId && w.steamId === item.steamId) || w.name === item.name)) return
    const newWl = [...wl, { ...item, id: item.id||`wl-${Date.now()}`, addedAt: new Date().toISOString(), targetPrice: null }]
    set({ wishlist: newWl })
    if (IS) window.spicegames.saveWishlist && window.spicegames.saveWishlist(newWl)
  },
  removeFromWishlist: (id) => {
    const newWl = get().wishlist.filter(w => w.id !== id)
    set({ wishlist: newWl })
    if (IS) window.spicegames.saveWishlist && window.spicegames.saveWishlist(newWl)
  },
  setWishlistTargetPrice: (id, price) => {
    const newWl = get().wishlist.map(w => w.id===id ? {...w, targetPrice: price} : w)
    set({ wishlist: newWl })
    if (IS) window.spicegames.saveWishlist && window.spicegames.saveWishlist(newWl)
  },
  setGameGoal: (gameId, goalMinutes) => {
    get().updateGame(gameId, { goalMinutes })
  },
  pickRandomGame: () => {
    const eligible = get().games.filter(g => ['Not Started','Backlog','On Hold'].includes(g.status||'Not Started') || !g.status)
    if (!eligible.length) return null
    return eligible[Math.floor(Math.random() * eligible.length)]
  },
  setView:             (v) => set({ view: v }),
  setCompactMode:      (v) => set({ compactMode: v }),
  setSortBy:           (s) => set({ sortBy: s }),
  setFilterGenre:      (g) => set({ filterGenre: g }),
  setFilterStatus:     (s) => set({ filterStatus: s }),
  setFilterCollection: (c) => set({ filterCollection: c }),
  setSearch:           (q) => set({ searchQuery: q }),
  setSelectedGame:     (g) => set({ selectedGame: g }),
  setAddGameOpen:      (v) => set({ addGameOpen: v }),

  getFilteredGames: () => {
    const { games, sortBy, filterGenre, filterStatus, filterCollection, searchQuery } = get()
    let list = [...games]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.genres?.some(x => x.toLowerCase().includes(q)) ||
        g.developer?.toLowerCase().includes(q)
      )
    }
    if (filterGenre !== 'all') list = list.filter(g => g.genres?.includes(filterGenre))
    if (filterStatus !== 'all') list = list.filter(g => (g.status || 'Not Started') === filterStatus)
    if (filterCollection !== 'all') list = list.filter(g => (g.collections || []).includes(filterCollection))

    list.sort((a, b) => {
      if (sortBy === 'name')       return a.name.localeCompare(b.name)
      if (sortBy === 'rating')     return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'playtime')   return (b.playtime || 0) - (a.playtime || 0)
      if (sortBy === 'lastPlayed') return new Date(b.lastPlayed||0) - new Date(a.lastPlayed||0)
      if (sortBy === 'added')      return new Date(b.addedAt||0) - new Date(a.addedAt||0)
      if (sortBy === 'status')     return (a.status||'').localeCompare(b.status||'')
      return 0
    })
    return list
  },

  getRecentlyPlayed: () => [...get().games]
    .filter(g => g.lastPlayed)
    .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
    .slice(0, 8),

  getAllGenres: () => {
    const genres = new Set()
    get().games.forEach(g => (g.genres || []).forEach(x => genres.add(x)))
    return [...genres].sort()
  },

  getTotalPlaytime: () => get().games.reduce((t, g) => t + (g.playtime || 0), 0),

  getPlaytimeByDay: (days = 14) => {
    const result = {}
    const now = Date.now()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      const key = d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
      result[key] = 0
    }
    get().games.forEach(g => {
      (g.sessions || []).forEach(s => {
        const key = new Date(s.date).toLocaleDateString('en-US', { month:'short', day:'numeric' })
        if (key in result) result[key] += s.duration || 0
      })
    })
    return Object.entries(result).map(([date, mins]) => ({ date, mins }))
  },

  getGenreBreakdown: () => {
    const counts = {}
    get().games.forEach(g => (g.genres || ['Unknown']).slice(0,1).forEach(genre => {
      counts[genre] = (counts[genre] || 0) + 1
    }))
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 8)
      .map(([genre, count]) => ({ genre, count }))
  },

  getLongestSession: () => {
    let best = { game: null, duration: 0 }
    get().games.forEach(g => {
      if ((g.longestSession || 0) > best.duration) {
        best = { game: g, duration: g.longestSession }
      }
    })
    return best
  },
}))