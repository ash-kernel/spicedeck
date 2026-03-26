import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import logoSvg from '../logo.svg'
import { useStore } from '../store/useStore'
import {
  Wishlist,
  Discover,
  Library,
  Controller,
  Itch,
  Deals,
  News,
  Screenshots,
  Stats,
  Settings,
  SystemInfo
} from '../icons/sideicons'

const NAV = [
  { path: '/library', label: 'Library', icon: Library },
  { path: '/discover', label: 'Discover', icon: Discover },
  { path: '/itch', label: 'itch.io', icon: Itch },
  { path: '/wishlist', label: 'Wishlist', icon: Wishlist },
  { path: '/deals', label: 'Deals', icon: Deals },
  { path: '/news', label: 'News', icon: News },
  { path: '/controller', label: 'Inputs', icon: Controller },
  { path: '/screenshots', label: 'Screenshots', icon: Screenshots },
  { path: '/stats', label: 'Stats', icon: Stats },
  { path: '/systeminfo', label: 'System Info', icon: SystemInfo },
]

function NavBtn({ label, icon, active, expanded, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={!expanded ? label : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        height: 44,
        border: 'none',
        borderRight: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        background: active ? `rgba(var(--accent-rgb),.14)` : hover ? 'rgba(255,255,255,.05)' : 'transparent',
        color: active ? 'var(--accent)' : hover ? '#e2e2ff' : 'rgba(255,255,255,.45)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 18,
        gap: 12,
        overflow: 'hidden',
        transition: 'all .15s',
        flexShrink: 0
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          whiteSpace: 'nowrap',
          opacity: expanded ? 1 : 0,
          transition: 'opacity .15s'
        }}
      >
        {label}
      </span>
    </button>
  )
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const games = useStore(s => s.games)
  const settings = useStore(s => s.settings) || {}
  const setAddOpen = useStore(s => s.setAddGameOpen)
  const setSelectedGame = useStore(s => s.setSelectedGame)

  const visibleNav = NAV.filter(n => {
    if (n.path === '/itch' && settings.showItch === false) return false
    if (n.path === '/news' && settings.showNews === false) return false
    if (n.path === '/deals' && settings.showDeals === false) return false
    if (n.path === '/discover' && settings.showDiscover === false) return false
    if (n.path === '/wishlist' && settings.showWishlist === false) return false
    if (n.path === '/library' && settings.showLibrary === false) return false
    if (n.path === '/controller' && settings.showController === false) return false
    if (n.path === '/screenshots' && settings.showScreenshots === false) return false
    if (n.path === '/stats' && settings.showStats === false) return false
    if (n.path === '/systeminfo' && settings.showSystemInfo === false) return false
    return true
  })

  const go = path => {
    setExpanded(false)
    if (path !== '/library') setSelectedGame(null)
    navigate(path)
  }

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 200 : 56,
        minWidth: 56,
        transition: 'width .22s cubic-bezier(.4,0,.2,1)',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50
      }}
    >
      <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 13, flexShrink: 0 }}>
        <img src={logoSvg} alt="" style={{ width: 30, height: 30, minWidth: 30, borderRadius: 8, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 14,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            opacity: expanded ? 1 : 0,
            transition: 'opacity .15s'
          }}
        >
          SpiceDeck
        </span>
      </div>

      <div style={{ padding: '0 9px', marginBottom: 6, flexShrink: 0 }}>
        <button
          onClick={() => setAddOpen(true)}
          title={!expanded ? 'Add Game' : undefined}
          style={{
            width: '100%',
            height: 32,
            borderRadius: 8,
            border: '1px dashed rgba(var(--accent-rgb),.45)',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            paddingLeft: expanded ? 9 : 0,
            gap: 8,
            overflow: 'hidden',
            transition: 'all .15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `rgba(var(--accent-rgb),.1)`
            e.currentTarget.style.borderStyle = 'solid'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderStyle = 'dashed'
          }}
        >
          {expanded ? <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>+ Add Game</span> : <span style={{ fontSize: 20, lineHeight: 1, fontWeight: 300 }}>+</span>}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleNav.map(n => (
          <NavBtn key={n.path} label={n.label} icon={n.icon} active={location.pathname === n.path} expanded={expanded} onClick={() => go(n.path)} />
        ))}
      </div>

      <NavBtn label="Settings" icon={Settings} active={location.pathname === '/settings'} expanded={expanded} onClick={() => go('/settings')} />
    </div>
  )
}