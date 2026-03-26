import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import LibraryPage from './pages/LibraryPage'
import DiscoverPage from './pages/DiscoverPage'
import ItchPage from './pages/ItchPage'
import DealsPage from './pages/DealsPage'
import ScreenshotsPage from './pages/ScreenshotsPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import GameNewsPage from './pages/GameNewsPage'
import WishlistPage from './pages/WishlistPage'
import WidgetPage from './pages/WidgetPage'
import ControllerPage from './pages/ControllerPage'
import SystemInfoPage from './pages/SystemInfoPage'
import AddGameModal from './components/AddGameModal'
import GameDetailPanel from './components/GameDetailPanel'

import { useStore } from './store/useStore'
import toast from 'react-hot-toast'

const IS = typeof window !== 'undefined' && window.spicegames != null

const ROUTES = ['/library','/itch','/deals','/news','/controller','/screenshots','/stats','/settings', '/systeminfo']

function GamepadNav() {
  const navigate        = useNavigate()
  const location        = useLocation()
  const launchGame      = useStore(s => s.launchGame)
  const selectedGame    = useStore(s => s.selectedGame)
  const setSelectedGame = useStore(s => s.setSelectedGame)
  const games           = useStore(s => s.games)

  useEffect(() => {
    let rafId
    const prev = {}
    let navIdx = 0

    const poll = () => {
      if (window.__controllerPageActive) {
        rafId = requestAnimationFrame(poll)
        return
      }
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      for (const pad of pads) {
        if (!pad) continue
        const k   = pad.index
        const btn = i => pad.buttons[i]?.pressed
        const just = i => btn(i) && !prev[k + '_' + i]

        if (just(4)) {
          const cur = ROUTES.indexOf(location.pathname)
          navigate(ROUTES[Math.max(0, cur - 1)])
        }
        if (just(5)) {
          const cur = ROUTES.indexOf(location.pathname)
          navigate(ROUTES[Math.min(ROUTES.length - 1, cur + 1)])
        }
        if (location.pathname === '/library') {
          const filtered = games.filter(Boolean)
          if (just(12)) { navIdx = Math.max(0, navIdx - 1); if (filtered[navIdx]) setSelectedGame(filtered[navIdx]) }
          if (just(13)) { navIdx = Math.min(filtered.length - 1, navIdx + 1); if (filtered[navIdx]) setSelectedGame(filtered[navIdx]) }
          if (just(0) && selectedGame) { launchGame(selectedGame.id); toast(`🎮 Launching ${selectedGame.name}…`, { duration:2000 }) }
          if (just(1)) setSelectedGame(null)
        }
        if (just(9)) toast('🎮  LB/RB: tabs  ·  ↕ D-Pad: games  ·  A: launch  ·  B: back', { duration:3000 })

        for (let i = 0; i < pad.buttons.length; i++) prev[k + '_' + i] = btn(i)
      }
      rafId = requestAnimationFrame(poll)
    }

    const onConnect    = e => toast(`🎮 ${e.gamepad.id.slice(0, 28)} connected`, { duration:3000 })
    const onDisconnect = () => toast('🎮 Controller disconnected', { duration:2000 })
    window.addEventListener('gamepadconnected',    onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    rafId = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('gamepadconnected',    onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
    }
  }, [navigate, location, games, selectedGame, launchGame, setSelectedGame])
  return null
}

function RouteWatcher() {
  const location        = useLocation()
  const setSelectedGame = useStore(s => s.setSelectedGame)
  useEffect(() => {
    if (location.pathname !== '/library') setSelectedGame(null)
  }, [location.pathname])
  return null
}

function AppLayout() {
  const location     = useLocation()
  const init         = useStore(s => s.init)
  const addGameOpen  = useStore(s => s.addGameOpen)
  const selectedGame = useStore(s => s.selectedGame)
  const onLibrary    = location.pathname === '/library'
  const [updateInfo, setUpdateInfo] = useState(null)

  useEffect(() => {
    document.title = 'SpiceDeck'
    if (IS) {
      const saved = (() => { try { return JSON.parse(localStorage.getItem('sw_settings') || '{}') } catch { return {} } })()
      document.body.classList.remove('theme-red','theme-neon','theme-ember','theme-rose','theme-teal','theme-gold','theme-cyber','theme-slate')
      const t = saved.theme || 'slate'
      if (t !== 'slate') document.body.classList.add(`theme-${t}`)
      const accent = saved.accentColor || '#6366F1'
      document.documentElement.style.setProperty('--accent', accent)
      const rgb = accent.replace('#','').match(/.{2}/g).map(h => parseInt(h, 16)).join(',')
      document.documentElement.style.setProperty('--accent-rgb', rgb)
      init()

      // Check for updates 4s after launch — silently
      setTimeout(() => {
        window.spicegames.checkUpdate()
          .then(res => { if (res?.hasUpdate) setUpdateInfo(res) })
          .catch(() => {})
      }, 4000)
    }
  }, [])

  return (
    <>
      <GamepadNav />
      <RouteWatcher />
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
        {IS && <TitleBar />}

        {updateInfo && (
          <div style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', padding:'7px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0, zIndex:200 }}>
            <span style={{ fontSize:13, color:'#fff', flex:1 }}>
              🎉 <strong>SpiceDeck {updateInfo.latest}</strong> is available — you have {updateInfo.current}
            </span>
            <button onClick={() => window.spicegames.openExternal(updateInfo.url)}
              style={{ padding:'4px 14px', borderRadius:6, border:'1px solid rgba(255,255,255,.4)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)' }}>
              View Release ↗
            </button>
            <button onClick={() => setUpdateInfo(null)}
              style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 2px' }}>
              ×
            </button>
          </div>
        )}

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <Sidebar />
          <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
            <Routes>
              <Route path="/"            element={<Navigate to="/library" replace />} />
              <Route path="/library"     element={<LibraryPage />} />
              <Route path="/discover"    element={<DiscoverPage />} />
              <Route path="/itch"        element={<ItchPage />} />
              <Route path="/deals"       element={<DealsPage />} />
              <Route path="/news"        element={<GameNewsPage />} />
              <Route path="/wishlist"     element={<WishlistPage />} />
              <Route path="/widget"       element={<WidgetPage />} />
              <Route path="/controller"  element={<ControllerPage />} />
              <Route path="/screenshots" element={<ScreenshotsPage />} />
              <Route path="/stats"       element={<StatsPage />} />
              <Route path="/settings"    element={<SettingsPage />} />
              <Route path="/systeminfo"  element={<SystemInfoPage />} />
            </Routes>
          </div>
          {selectedGame && onLibrary && <GameDetailPanel />}
        </div>

        {addGameOpen && <AddGameModal />}
        <Toaster position="bottom-right" toastOptions={{
          style:{ background:'var(--bg3)', color:'var(--text)', border:'1px solid var(--border2)', borderRadius:'10px', fontFamily:'var(--font-body)', fontSize:'13px' },
          success:{ iconTheme:{ primary:'var(--success)', secondary:'var(--bg3)' } },
          error:  { iconTheme:{ primary:'var(--danger)',  secondary:'var(--bg3)' } },
        }} />
      </div>
    </>
  )
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
      <AppLayout />
    </HashRouter>
  )
}