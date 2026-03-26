import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useStore, STATUS_OPTIONS, COLLECTION_DEFAULTS } from '../store/useStore'
import { GameCardGrid, GameCardList } from '../components/GameCard'
import toast from 'react-hot-toast'

const IS = typeof window !== 'undefined' && window.spicegames != null

const SORT_OPTIONS = [
  { v:'name',       l:'Name A–Z'       },
  { v:'lastPlayed', l:'Recently Played' },
  { v:'playtime',   l:'Most Played'    },
  { v:'rating',     l:'Top Rated'      },
  { v:'added',      l:'Recently Added' },
  { v:'status',     l:'Status'         },
]

export default function LibraryPage() {
  const getFilteredGames   = useStore(s => s.getFilteredGames)
  const getRecentlyPlayed  = useStore(s => s.getRecentlyPlayed)
  const getAllGenres        = useStore(s => s.getAllGenres)
  const view               = useStore(s => s.view)
  const compactMode        = useStore(s => s.compactMode)
  const sortBy             = useStore(s => s.sortBy)
  const filterGenre        = useStore(s => s.filterGenre)
  const filterStatus       = useStore(s => s.filterStatus)
  const filterCollection   = useStore(s => s.filterCollection)
  const searchQuery        = useStore(s => s.searchQuery)
  const setView            = useStore(s => s.setView)
  const setCompactMode     = useStore(s => s.setCompactMode)
  const setSortBy          = useStore(s => s.setSortBy)
  const setFilterGenre     = useStore(s => s.setFilterGenre)
  const setFilterStatus    = useStore(s => s.setFilterStatus)
  const setFilterCollection= useStore(s => s.setFilterCollection)
  const setSearch          = useStore(s => s.setSearch)
  const setAddOpen         = useStore(s => s.setAddGameOpen)
  const setSelectedGame    = useStore(s => s.setSelectedGame)
  const selectedGame       = useStore(s => s.selectedGame)
  const runningGames       = useStore(s => s.runningGames)
  const games              = useStore(s => s.games)
  const collections        = useStore(s => s.collections)
  const nudges             = useStore(s => s.nudges)
  const computeNudges      = useStore(s => s.computeNudges)
  const importFromSteam    = useStore(s => s.importFromSteam)
  const scanFolder         = useStore(s => s.scanFolder)
  const addGame            = useStore(s => s.addGame)
  const pickRandomGame     = useStore(s => s.pickRandomGame)

  const [searchVal, setSearchVal]   = useState(searchQuery)
  const [importing, setImporting]   = useState(false)
  const [scanning,  setScanning]    = useState(false)
  const searchRef                   = useRef(null)
  const timerRef                    = useRef(null)

  const filtered      = getFilteredGames()
  const recentPlayed  = getRecentlyPlayed()
  const genres        = getAllGenres()
  const running       = [...runningGames].length

  useEffect(() => {
    computeNudges()
  }, [games])

  const onSearch = (v) => {
    setSearchVal(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSearch(v), 280)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') { setSearch(''); setSearchVal(''); searchRef.current?.blur() }
      if (e.key === ' ' && selectedGame) {
        e.preventDefault()
        if (!runningGames.has(selectedGame.id)) {
          useStore.getState().launchGame(selectedGame)
            .then(() => toast.success(`Launching ${selectedGame.name}…`))
            .catch(err => toast.error(err.message))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedGame])

  const handleImportSteam = async () => {
    setImporting(true)
    try {
      const res = await importFromSteam()
      if (res?.ok && res.games?.length) {
        const existing = new Set(games.map(g => g.steamId).filter(Boolean))
        const toAdd = res.games.filter(g => !existing.has(g.steamId))
        toAdd.forEach(g => addGame(g))
        toast.success(`Imported ${toAdd.length} games from Steam`)
      } else toast.error('No new Steam games found')
    } catch { toast.error('Steam import failed') }
    setImporting(false)
  }

  const handleScanFolder = async () => {
    setScanning(true)
    try {
      const res = await scanFolder()
      if (res?.ok && res.games?.length) {
        res.games.forEach(g => addGame(g))
        toast.success(`Added ${res.games.length} games from folder`)
      } else toast.error('No executables found')
    } catch { toast.error('Folder scan failed') }
    setScanning(false)
  }

  const wallpaperUrl = selectedGame?.hero || selectedGame?.header ||
    (selectedGame?.steamId ? `https://cdn.akamai.steamstatic.com/steam/apps/${selectedGame.steamId}/library_hero.jpg` : null)

  const gridCols = compactMode ? 'repeat(auto-fill,minmax(140px,1fr))' : 'repeat(auto-fill,minmax(180px,1fr))'

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {wallpaperUrl && (
        <div style={{ position:'absolute', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
          <img src={wallpaperUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.04, filter:'blur(20px)', transform:'scale(1.1)' }} onError={e=>e.target.style.display='none'} />
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, padding:'14px 20px 10px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(var(--bg-rgb, 8,8,15),.92)', backdropFilter:'blur(10px)' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color:'var(--text)', lineHeight:1 }}>Library</h1>
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              {filtered.length}/{games.length} games
              {running > 0 && <span style={{ color:'var(--success)', fontWeight:600 }}> · {running} running</span>}
            </p>
          </div>
          <div style={{ flex:1 }} />

          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:50, padding:'7px 14px', flex:1, maxWidth:260, position:'relative' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ color:'var(--text3)', flexShrink:0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input ref={searchRef} value={searchVal} onChange={e=>onSearch(e.target.value)}
              placeholder="Search… (press /)"
              style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontSize:13, fontFamily:'var(--font-body)', paddingRight:'24px' }} />
            {searchVal && <button onClick={()=>{onSearch('');setSearchVal('')}} style={{ position:'absolute', right:14, background:'none', border:'none', color:'var(--text2)', cursor:'pointer', width:16, height:16, minWidth:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, lineHeight:'1', padding:0 }}>×</button>}
          </div>

          <div style={{ display:'flex', gap:4 }}>
            {[['▦','grid'],['☰','list']].map(([icon,v]) => (
              <button key={v} onClick={() => setView(v)} title={v}
                style={{ width:32, height:32, borderRadius:8, border:`1px solid ${view===v?'var(--accent)':'var(--border2)'}`, background:view===v?`rgba(var(--accent-rgb),.12)`:'var(--bg3)', color:view===v?'var(--accent)':'var(--text3)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}>
                {icon}
              </button>
            ))}
            <button onClick={() => setCompactMode(!compactMode)} title="Compact mode"
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${compactMode?'var(--accent)':'var(--border2)'}`, background:compactMode?`rgba(var(--accent-rgb),.12)`:'var(--bg3)', color:compactMode?'var(--accent)':'var(--text3)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}>
              ⊟
            </button>
          </div>

          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', fontFamily:'var(--font-body)', padding:'7px 28px 7px 10px', borderRadius:8, fontSize:12, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238B89A8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
            {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>

          <button onClick={() => {
              const g = pickRandomGame()
              if (g) setSelectedGame(g)
              else toast('No unplayed games in library!', { icon:'🎲' })
            }} title="Random game picker"
            style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text3)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--bg4)';e.currentTarget.style.color='var(--text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--text3)'}}>
            🎲
          </button>

          {IS && (
            <div style={{ display:'flex', gap:4 }}>
              <button onClick={handleImportSteam} disabled={importing} title="Import from Steam"
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text2)', fontSize:12, cursor:importing?'default':'pointer', display:'flex', alignItems:'center', gap:5, opacity:importing?.6:1, transition:'all .18s', whiteSpace:'nowrap' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg3)'}>
                {importing ? '⟳' : '⬇'} Steam
              </button>
              <button onClick={handleScanFolder} disabled={scanning} title="Scan folder"
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text2)', fontSize:12, cursor:scanning?'default':'pointer', display:'flex', alignItems:'center', gap:5, opacity:scanning?.6:1, transition:'all .18s', whiteSpace:'nowrap' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg3)'}>
                {scanning ? '⟳' : '📁'} Scan
              </button>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)', fontFamily:'var(--font-body)', padding:'5px 24px 5px 10px', borderRadius:20, fontSize:11, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%238B89A8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterCollection} onChange={e=>setFilterCollection(e.target.value)}
            style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)', fontFamily:'var(--font-body)', padding:'5px 24px 5px 10px', borderRadius:20, fontSize:11, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%238B89A8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
            <option value="all">All Collections</option>
            {collections.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {genres.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {['all',...genres.slice(0,8)].map(g => (
                <button key={g} onClick={() => setFilterGenre(g)}
                  style={{ padding:'4px 11px', borderRadius:20, border:`1px solid ${filterGenre===g?'var(--accent)':'var(--border2)'}`, background:filterGenre===g?`rgba(var(--accent-rgb),.12)`:'transparent', color:filterGenre===g?'var(--accent)':'var(--text3)', fontSize:11, fontWeight:filterGenre===g?600:400, cursor:'pointer', transition:'all .18s' }}>
                  {g === 'all' ? 'All Genres' : g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 40px', position:'relative', zIndex:1 }}>

        {nudges.length > 0 && !searchVal && (
          <div style={{ marginBottom:20, padding:'12px 16px', background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.15)', borderRadius:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Haven't played in 30+ days</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {nudges.map(n => (
                <button key={n.id} onClick={() => setSelectedGame(games.find(g=>g.id===n.id))}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:20, border:'1px solid var(--border2)', background:'var(--bg3)', cursor:'pointer', transition:'all .18s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                  onMouseLeave={e=>e.currentTarget.style.background='var(--bg3)'}>
                  <span style={{ fontSize:12, color:'var(--text)' }}>{n.name}</span>
                  <span style={{ fontSize:10, color:'var(--text3)' }}>{new Date(n.lastPlayed).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentPlayed.length > 0 && !searchVal && filterGenre === 'all' && filterStatus === 'all' && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'var(--accent)' }}>◉</span> Recently Played
            </div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6 }}>
              {recentPlayed.map(g => {
                const src = g.cover || g.header || (g.steamId ? `https://cdn.akamai.steamstatic.com/steam/apps/${g.steamId}/header.jpg` : null)
                return (
                  <div key={g.id} onClick={() => setSelectedGame(g)}
                    style={{ flexShrink:0, width:140, borderRadius:10, overflow:'hidden', cursor:'pointer', border:'1px solid var(--border)', transition:'all .2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.3)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='var(--border)'}}>
                    <div style={{ height:80, background:'var(--bg4)', overflow:'hidden' }}>
                      {src && <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />}
                    </div>
                    <div style={{ padding:'7px 8px', background:'var(--bg3)' }}>
                      <div style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                      <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{g.lastPlayed ? new Date(g.lastPlayed).toLocaleDateString() : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {games.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:56, marginBottom:16, opacity:.2 }}>🎮</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Library is empty</h2>
            <p style={{ fontSize:14, color:'var(--text3)', marginBottom:20, lineHeight:1.7 }}>Add games manually, import from Steam,<br/>or scan a folder.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => setAddOpen(true)}
                style={{ padding:'10px 22px', borderRadius:10, border:'none', background:`linear-gradient(135deg,var(--accent),var(--accent2))`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'var(--shadow-glow)' }}>
                + Add Game
              </button>
              {IS && <button onClick={handleImportSteam} disabled={importing}
                style={{ padding:'10px 22px', borderRadius:10, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>
                ⬇ Import Steam
              </button>}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:40, marginBottom:12, opacity:.3 }}>🔍</div>
            <p style={{ fontSize:15, color:'var(--text3)' }}>No games match your filters</p>
          </div>
        ) : view === 'list' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {filtered.map(g => <GameCardList key={g.id} game={g} />)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:gridCols, gap:compactMode?8:14 }}>
            {filtered.map(g => <GameCardGrid key={g.id} game={g} compact={compactMode} />)}
          </div>
        )}
      </div>
    </div>
  )
}