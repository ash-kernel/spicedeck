import logoSvg from '../logo.svg'
import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const IS = typeof window !== 'undefined' && window.spicegames != null

const THEMES = [
  { id:'dark',  label:'Indigo', accent:'#6366F1', accent2:'#8B5CF6', desc:'Default' },
  { id:'red',   label:'Crimson',accent:'#EF4444', accent2:'#DC2626', desc:'Red'     },
  { id:'neon',  label:'Matrix', accent:'#00FF88', accent2:'#00E5FF', desc:'Green'   },
  { id:'ember', label:'Ember',  accent:'#F97316', accent2:'#EF4444', desc:'Orange'  },
  { id:'rose',  label:'Rose',   accent:'#F43F5E', accent2:'#EC4899', desc:'Pink'    },
  { id:'teal',  label:'Ocean',  accent:'#14B8A6', accent2:'#0EA5E9', desc:'Teal'    },
  { id:'gold',  label:'Gold',   accent:'#F59E0B', accent2:'#EAB308', desc:'Amber'   },
  { id:'cyber', label:'Cyber',  accent:'#A855F7', accent2:'#EC4899', desc:'Purple'  },
  { id:'slate', label:'Slate',  accent:'#0EA5E9', accent2:'#06B6D4', desc:'Blue'    },
]

const APIS = [
  { name:'Steam Store',    color:'#1a9fff', desc:'Game search, prices, reviews, screenshots, descriptions and Metacritic scores.' },
  { name:'SteamSpy',       color:'#c6d4df', desc:'Discover trending and top-rated games, genre browsing, owner estimates.' },
  { name:'Steam CDN',      color:'#66c0f4', desc:'Portrait covers, headers, hero images — 4-level fallback chain per game.' },
  { name:'CheapShark',     color:'#10B981', desc:'Live deals across Steam, GOG, Epic Games, Humble Bundle and more.' },
  { name:'itch.io',        color:'#FA6432', desc:'Indie game browser with tag filtering, search and detail pages.' },
  { name:'PC Gamer / RPS', color:'#e53e3e', desc:'Game news RSS feeds from PC Gamer, Rock Paper Shotgun, Eurogamer, IGN.' },
  { name:'HowLongToBeat',  color:'#f5c518', desc:'Completion times — Main Story, Main+Extra, 100%. Shows on game panels.' },
]

function Toggle({ value, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!value)}
      style={{ width:42, height:23, borderRadius:12, background:value?'var(--accent)':'var(--bg5)', border:`1px solid ${value?'var(--accent)':'var(--border2)'}`, position:'relative', cursor:disabled?'not-allowed':'pointer', transition:'all .2s', opacity:disabled?.4:1, flexShrink:0 }}>
      <div style={{ position:'absolute', top:2, left:value?20:2, width:17, height:17, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }} />
    </div>
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', fontFamily:'var(--font-body)', padding:'6px 24px 6px 10px', borderRadius:8, fontSize:12, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238B89A8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function Row({ label, desc, children, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderBottom:last?'none':'1px solid var(--border)', minHeight:50 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, lineHeight:1.5 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  )
}

function Card({ title, children, noPad }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:0 }}>
      <div style={{ padding:'9px 16px', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1.2px' }}>
        {title}
      </div>
      {noPad ? children : <div>{children}</div>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type='text', monospace }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} type={type}
      style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', fontFamily:monospace?'monospace':'var(--font-body)', padding:'6px 10px', borderRadius:8, fontSize:12, outline:'none', width:200 }} />
  )
}

export default function SettingsPage() {
  const settings     = useStore(s => s.settings)
  const saveSettings = useStore(s => s.saveSettings)
  const applyTheme   = useStore(s => s.applyTheme)
  const games        = useStore(s => s.games)

  const [local,          setLocal]         = useState(settings || {})
  const [version,        setVersion]       = useState('1.0.0')
  const [startupStatus,  setStartupStatus] = useState({ enabled:false, supported:false })
  const [startupLoading, setStartupLoading]= useState(false)
  const [updateChecking, setUpdateChecking]= useState(false)

  useEffect(() => {
    if (settings) setLocal(settings)
    if (IS) {
      window.spicegames.getAppVersion().then(v => setVersion(v)).catch(() => {})
      window.spicegames.getStartupStatus().then(s => setStartupStatus(s)).catch(() => {})
    }
  }, [settings])

  const set = (k, v) => {
    setLocal(p => ({ ...p, [k]: v }))
    saveSettings({ [k]: v })
  }

  const handleTheme = id => {
    applyTheme(id)
    setLocal(p => ({ ...p, theme: id }))
  }

  const handleStartup = async enable => {
    if (!IS) return
    setStartupLoading(true)
    try {
      await window.spicegames.setRunOnStartup(enable)
      set('runOnStartup', enable)
      setStartupStatus(s => ({ ...s, enabled: enable }))
      toast.success(enable ? 'Launches on startup' : 'Removed from startup')
    } catch {
      toast.error('Failed to update startup')
    }
    setStartupLoading(false)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(games, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href:url, download:'spicedeck-library.json' }).click()
    URL.revokeObjectURL(url)
    toast.success('Library exported!')
  }

  const checkForUpdates = async () => {
    setUpdateChecking(true)
    try {
      const res = await window.spicegames.checkUpdate()
      if (res?.hasUpdate) {
        toast(`🎉 Update available: v${res.latest}`, { duration: 5000 })
      } else if (res?.ok) {
        toast.success(`You're on the latest version (v${res.current})`)
      } else {
        toast('Could not check for updates', { icon: '⚠️' })
      }
    } catch {
      toast.error('Update check failed')
    }
    setUpdateChecking(false)
  }

  const activeTheme = local.theme || 'slate'
  const currentTheme = THEMES.find(t => t.id === activeTheme) || THEMES[0]

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'16px 20px 60px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <img src={logoSvg} alt="" style={{ width:34, height:34, borderRadius:8 }} />
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:900, color:'var(--text)' }}>Settings</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>SpiceDeck v{version}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, alignItems:'start' }}>

        {/* ── LEFT COLUMN ──────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <Card title="Theme">
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
                {THEMES.map(t => {
                  const active = activeTheme === t.id
                  return (
                    <button key={t.id} onClick={() => handleTheme(t.id)}
                      style={{ padding:'9px 4px', borderRadius:9, border:`2px solid ${active?t.accent:'var(--border2)'}`, background:active?`${t.accent}18`:'var(--bg3)', cursor:'pointer', textAlign:'center', transition:'all .18s' }}>
                      <div style={{ width:9, height:9, borderRadius:'50%', background:t.accent, boxShadow:`0 0 6px ${t.accent}`, margin:'0 auto 5px' }} />
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:active?t.accent:'var(--text)' }}>{t.label}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ padding:'8px 10px', borderRadius:8, background:`${currentTheme.accent}12`, border:`1px solid ${currentTheme.accent}28`, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:currentTheme.accent, boxShadow:`0 0 5px ${currentTheme.accent}` }} />
                <span style={{ fontSize:12, color:'var(--text)', fontWeight:600 }}>{currentTheme.label}</span>
                <span style={{ fontSize:11, color:'var(--text3)' }}>{currentTheme.desc}</span>
              </div>
            </div>
          </Card>

          <Card title="Display">
            <Row label="Default library view">
              <Sel value={local.defaultView||'grid'} onChange={v=>set('defaultView',v)}
                options={[{v:'grid',l:'Grid'},{v:'list',l:'List'}]} />
            </Row>
            <Row label="Default sort" last>
              <Sel value={local.sortBy||'name'} onChange={v=>set('sortBy',v)}
                options={[{v:'name',l:'Name A–Z'},{v:'rating',l:'Top Rated'},{v:'playtime',l:'Most Played'},{v:'lastPlayed',l:'Recent'},{v:'added',l:'Added'}]} />
            </Row>
          </Card>

          <Card title="Tabs" noPad>
            <div style={{ padding:'10px 14px 6px', fontSize:12, color:'var(--text3)' }}>
              Hide tabs you don't use — they'll be removed from the sidebar.
            </div>
            <Row label="Library" desc="Game collection and management">
              <Toggle value={local.showLibrary!==false} onChange={v=>set('showLibrary',v)} />
            </Row>
            <Row label="Discover" desc="Trending and featured games">
              <Toggle value={local.showDiscover!==false} onChange={v=>set('showDiscover',v)} />
            </Row>
            <Row label="Wishlist" desc="Your wishlist of games">
              <Toggle value={local.showWishlist!==false} onChange={v=>set('showWishlist',v)} />
            </Row>
            <Row label="itch.io" desc="Indie games browser">
              <Toggle value={local.showItch!==false} onChange={v=>set('showItch',v)} />
            </Row>
            <Row label="Controller" desc="Controller and input settings">
              <Toggle value={local.showController!==false} onChange={v=>set('showController',v)} />
            </Row>
            <Row label="Game News" desc="PC Gamer, RPS, Eurogamer, IGN">
              <Toggle value={local.showNews!==false} onChange={v=>set('showNews',v)} />
            </Row>
            <Row label="Deals" desc="CheapShark game deals aggregator">
              <Toggle value={local.showDeals!==false} onChange={v=>set('showDeals',v)} />
            </Row>
            <Row label="Screenshots" desc="Game screenshots collection">
              <Toggle value={local.showScreenshots!==false} onChange={v=>set('showScreenshots',v)} />
            </Row>
            <Row label="Stats" desc="Gaming statistics and insights">
              <Toggle value={local.showStats!==false} onChange={v=>set('showStats',v)} />
            </Row>
            <Row label="System Info" desc="Hardware and system details" last>
              <Toggle value={local.showSystemInfo!==false} onChange={v=>set('showSystemInfo',v)} />
            </Row>
          </Card>

          <Card title="Data Sources" noPad>
            {APIS.map((api, i) => (
              <div key={api.name} style={{ padding:'10px 16px', borderBottom:i<APIS.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:api.color, boxShadow:`0 0 4px ${api.color}`, flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', flex:1 }}>{api.name}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', paddingLeft:14, lineHeight:1.5 }}>{api.desc}</div>
              </div>
            ))}
          </Card>

        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <Card title="System">
            <Row label="Run on startup" desc={!startupStatus.supported?'Available in installed build':undefined}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {startupLoading && <div style={{ width:12, height:12, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
                <Toggle value={startupStatus.enabled||local.runOnStartup===true} onChange={handleStartup} disabled={!IS||!startupStatus.supported||startupLoading} />
              </div>
            </Row>
            <Row label="Minimize to tray" desc="Close button hides to system tray">
              <Toggle value={local.minimizeToTray===true} onChange={v=>set('minimizeToTray',v)} />
            </Row>
            <Row label="Minimize on game launch">
              <Toggle value={local.minimizeOnLaunch!==false} onChange={v=>set('minimizeOnLaunch',v)} />
            </Row>
            <Row label="Track playtime" last>
              <Toggle value={local.trackPlaytime!==false} onChange={v=>set('trackPlaytime',v)} />
            </Row>
          </Card>

          <Card title="Library">
            <Row label="Auto-fill metadata" desc="Search Steam when browsing for a .exe">
              <Toggle value={local.autoFill!==false} onChange={v=>set('autoFill',v)} />
            </Row>
            <Row label={`${games.length} game${games.length!==1?'s':''} in library`} last>
              <button onClick={handleExport}
                style={{ padding:'5px 12px', borderRadius:7, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-body)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg3)'}>
                📤 Export JSON
              </button>
            </Row>
          </Card>

          

          <Card title="HowLongToBeat">
            <div style={{ padding:'10px 16px', fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
              Automatically shows estimated completion times on game detail panels — no account or API key needed.
            </div>
            <Row label="Enable HowLongToBeat" desc="Shows Main Story, Side Quests and 100% times" last>
              <Toggle value={local.hltbEnabled!==false} onChange={v=>set('hltbEnabled',v)} />
            </Row>
          </Card>

          <Card title="About">
            <div style={{ padding:'14px 16px', display:'flex', gap:12, alignItems:'center', borderBottom:'1px solid var(--border)' }}>
              <img src={logoSvg} alt="" style={{ width:40, height:40, borderRadius:10, flexShrink:0 }} />
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:'var(--text)' }}>SpiceDeck</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>v{version} · Electron 28 · React 18</div>
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  {[
                    ['Privacy Policy', 'https://ash-kernel.github.io/spicedeck/#legal'],
                    ['Terms',          'https://ash-kernel.github.io/spicedeck/#legal'],
                    ['GitHub ↗',       'https://github.com/ash-kernel'],
                  ].map(([label, url]) => (
                    <span key={label} onClick={() => window.spicegames?.openExternal(url)}
                      style={{ fontSize:10, color:'var(--accent)', cursor:'pointer' }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Row label="Check for updates" last>
              <button onClick={checkForUpdates} disabled={updateChecking||!IS}
                style={{ padding:'5px 12px', borderRadius:7, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontSize:12, cursor:updateChecking?'default':'pointer', fontFamily:'var(--font-body)', opacity:updateChecking?.6:1, transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg3)'}>
                {updateChecking ? '…' : '↻ Check Now'}
              </button>
            </Row>
          </Card>

        </div>
      </div>
    </div>
  )
}