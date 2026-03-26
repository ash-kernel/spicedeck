import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const IS = typeof window !== 'undefined' && window.spicegames?.isElectron

const STEP = { SEARCH:'search', DETAIL:'detail', LINK:'link', DONE:'done' }

export default function AddGameModal() {
  const setAddOpen = useStore(s => s.setAddGameOpen)
  const addGame    = useStore(s => s.addGame)

  const [step,       setStep]     = useState(STEP.SEARCH)
  const [query,      setQuery]    = useState('')
  const [searching,  setSearching]= useState(false)
  const [results,    setResults]  = useState([])
  const [selected,   setSelected] = useState(null)   // game from search
  const [details,    setDetails]  = useState(null)   // full details
  const [loadingDet, setLoadDet]  = useState(false)
  const [exePath,    setExePath]  = useState('')
  const [exeName,    setExeName]  = useState('')

  const [form, setForm] = useState({
    name:'', cover:'', description:'', genres:[], developer:'',
    publisher:'', released:'', metacritic:'', reviewScore:'',
    tags:[], platforms:[], website:'', steamId:'', price:'',
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-search as user types (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setSearching(true)
        const search = async () => {
          try {
            const res = IS ? await window.spicegames.searchGame({ name: query }) : []
            setResults(res || [])
          } catch { setResults([]) }
          setSearching(false)
        }
        search()
      } else {
        setResults([])
        setSearching(false)
      }
    }, 500) // 500ms debounce
    return () => clearTimeout(timer)
  }, [query])

  const doSearch = async (q = query) => {
    if (!q.trim()) return
    setSearching(true); setResults([])
    try {
      const res = IS ? await window.spicegames.searchGame({ name: q }) : []
      setResults(res || [])
    } catch { setResults([]) }
    setSearching(false)
  }

  const handleSelect = async (result) => {
    if (loadingDet) return // Prevent multiple clicks while loading
    setSelected(result)
    setLoadDet(true)
    try {
      const d = IS ? await window.spicegames.getGameDetails({ steamId: result.steamId }) : null
      if (d) {
        setDetails(d)
        setForm({
          name:        d.name || result.name,
          cover:       d.cover || result.cover || '',
          header:      d.header || '',
          description: d.description || '',
          fullDesc:    d.fullDesc || '',
          genres:      d.genres || result.genres || [],
          developer:   d.developer || '',
          publisher:   d.publisher || '',
          released:    d.released || result.released || '',
          metacritic:  d.metacritic || '',
          reviewScore: d.reviewScore || '',
          tags:        d.categories || d.tags || [],
          platforms:   d.platforms || result.platforms || [],
          website:     d.website || '',
          steamId:     result.steamId,
          price:       d.price || result.price || '',
          screenshots: d.screenshots || [],
        })
      } else {
        setForm(f => ({ ...f, name: result.name, cover: result.cover || '', steamId: result.steamId, platforms: result.platforms || [] }))
      }
    } catch { toast.error('Could not load game details') }
    setLoadDet(false)
    setStep(STEP.DETAIL)
  }

  const handleBrowseExe = async () => {
    if (!IS) { toast('Browse only works in the desktop app', { icon:'💡' }); return }
    const result = await window.spicegames.browseExe()
    if (!result) return
    setExePath(result.exePath)
    setExeName(result.name)
  }

  const normalizeGenres = (genreInput) => {
    const genreArray = Array.isArray(genreInput) ? genreInput : genreInput.split(',').map(s=>s.trim()).filter(Boolean)
    // Capitalize first letter and remove duplicates
    const normalized = genreArray.map(g => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase())
    return [...new Set(normalized)] // Remove duplicates
  }

  const handleSave = () => {
    if (saving) return // Prevent double clicks
    if (!exePath) { toast.error('Please select the game executable first'); return }
    if (!form.name.trim()) { toast.error('Game name is required'); return }
    setSaving(true)
    const genres = normalizeGenres(form.genres)
    try {
      addGame({
        ...form, exePath, genres,
        tags: Array.isArray(form.tags) ? form.tags : form.tags.split(',').map(s=>s.trim()).filter(Boolean),
        accentColor: accentFromGenres(genres),
      })
      toast.success(`${form.name} added to library!`)
      setAddOpen(false)
    } catch (e) {
      toast.error('Failed to add game')
      setSaving(false)
    }
  }

  const stepNum = { search:1, detail:2, link:3 }[step] || 1

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setAddOpen(false) }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(14px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn .2s ease' }}
    >
      <div style={{ width:'100%', maxWidth: step === STEP.DETAIL || step === STEP.LINK ? 860 : 560, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:20, overflow:'hidden', animation:'fadeInScale .25s ease', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Add Game to Library</h2>
            {}
            <div style={{ display:'flex', alignItems:'center', gap:0 }}>
              {[['1','Search','search'],['2','Details','detail'],['3','Link Exe','link']].map(([n,label,s], i) => {
                const done = stepNum > parseInt(n)
                const active = step === s
                return (
                  <React.Fragment key={n}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--bg4)', color: done||active ? '#fff' : 'var(--text3)', transition:'all .3s' }}>
                        {done ? '✓' : n}
                      </div>
                      <span style={{ fontSize:12, color: active ? 'var(--text)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ width:24, height:1, background:'var(--border2)', margin:'0 6px' }} />}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
          <button onClick={() => setAddOpen(false)}
            style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'var(--bg4)', color:'var(--text2)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg5)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--bg4)'}>×</button>
        </div>

        {}
        {step === STEP.SEARCH && (
          <div style={{ padding:24, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px' }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color:'var(--text3)', flexShrink:0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by game name…"
                  autoFocus
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontSize:14, fontFamily:'var(--font-body)' }}
                />
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
              {searching && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height:76, borderRadius:10 }} />)}
                </div>
              )}

              {!searching && results.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {results.map(r => (
                    <div key={r.steamId || r.name} onClick={() => !loadingDet && handleSelect(r)}
                      style={{ display:'flex', gap:14, padding:12, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg3)', cursor:loadingDet?'not-allowed':'pointer', transition:'all .18s', alignItems:'center', opacity:loadingDet?.5:1 }}
                      onMouseEnter={e=>{if(!loadingDet){e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.4)';e.currentTarget.style.background='var(--bg4)'}}}
                      onMouseLeave={e=>{if(!loadingDet){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg3)'}}}>
                      <div style={{ width:46, height:62, borderRadius:7, overflow:'hidden', flexShrink:0, background:'var(--bg4)' }}>
                        {r.cover
                          ? <img src={r.cover} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎮</div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                        <div style={{ fontSize:12, color:'var(--text3)', display:'flex', gap:10 }}>
                          {r.platforms?.slice(0,3).map(p => <span key={p}>{p}</span>)}
                          {r.price && <span style={{ color:'var(--accent)' }}>{r.price}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:12, color:'var(--accent)', flexShrink:0 }}>Select →</span>
                    </div>
                  ))}
                </div>
              )}

              {!searching && results.length === 0 && query && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)' }}>
                  <div style={{ fontSize:36, marginBottom:8, opacity:.4 }}>🔍</div>
                  <p>No results. Try a different name.</p>
                </div>
              )}

              {!searching && results.length === 0 && !query && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)' }}>
                  <div style={{ fontSize:44, marginBottom:12, opacity:.25 }}>🎮</div>
                  <p style={{ fontSize:15, marginBottom:6 }}>Search for your game</p>
                  <p style={{ fontSize:13 }}>Metadata is fetched from the Steam Store database</p>
                </div>
              )}
            </div>

            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--text3)' }}>Can't find it? Add manually</span>
              <button onClick={() => {
                  if (loadingDet) return
                  setForm({ name:'', cover:'', description:'', genres:[], developer:'', publisher:'', released:'', metacritic:'', reviewScore:'', tags:[], platforms:[], website:'', steamId:'', price:'' })
                  setStep(STEP.DETAIL)
                }}
                disabled={loadingDet}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text2)', fontSize:13, cursor:loadingDet?'not-allowed':'pointer', fontFamily:'var(--font-body)', opacity:loadingDet?.5:1, transition:'all .2s' }}>
                Add manually →
              </button>
            </div>
          </div>
        )}

        {}
        {step === STEP.DETAIL && (
          <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
            {loadingDet ? (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:44, height:44, border:'3px solid var(--bg5)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
              </div>
            ) : (
              <>
                {}
                <div style={{ width:240, borderRight:'1px solid var(--border)', overflowY:'auto', flexShrink:0 }}>
                  {}
                  <div style={{ aspectRatio:'3/4', background:'var(--bg4)', overflow:'hidden', position:'relative' }}>
                    {form.cover
                      ? <img src={form.cover} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                      : form.header
                      ? <img src={form.header} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🎮</div>}
                  </div>

                  <div style={{ padding:16 }}>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, marginBottom:10, color:'var(--text)' }}>{form.name}</h3>
                    {}
                    <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                      {form.metacritic && (
                        <div style={{ padding:'4px 10px', borderRadius:7, background: form.metacritic>=75?'rgba(16,185,129,.15)':'rgba(245,158,11,.15)', color: form.metacritic>=75?'var(--success)':'var(--warning)', fontSize:12, fontWeight:700 }}>
                          MC {form.metacritic}
                        </div>
                      )}
                      {form.reviewScore && (
                        <div style={{ padding:'4px 10px', borderRadius:7, background:'rgba(99,102,241,.12)', color:'var(--accent)', fontSize:12, fontWeight:700 }}>
                          👍 {form.reviewScore}%
                        </div>
                      )}
                    </div>

                    {}
                    {[
                      ['Developer', form.developer],
                      ['Publisher', form.publisher],
                      ['Released',  form.released],
                      ['Price',     form.price],
                    ].filter(([,v])=>v).map(([k,v]) => (
                      <div key={k} style={{ marginBottom:8 }}>
                        <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:2 }}>{k}</div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{v}</div>
                      </div>
                    ))}

                    {}
                    {form.genres?.length > 0 && (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Genres</div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {(Array.isArray(form.genres)?form.genres:form.genres.split(',')).slice(0,4).map(g => (
                            <span key={g} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', fontWeight:600 }}>{g.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {}
                    {form.screenshots?.length > 0 && (
                      <div style={{ marginTop:12 }}>
                        <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Screenshots</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {form.screenshots.slice(0,4).map((s,i) => (
                            <img key={i} src={s} alt="" style={{ width:'100%', borderRadius:6, objectFit:'cover', aspectRatio:'16/9' }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {}
                <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                  <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.2)', borderRadius:10, fontSize:13, color:'var(--text2)' }}>
                    ✏ All fields are editable — customize anything before saving
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <FField label="Game Name *" span={2}>
                      <input value={form.name} onChange={e=>setF('name',e.target.value)} style={finp} />
                    </FField>
                    <FField label="Developer">
                      <input value={form.developer} onChange={e=>setF('developer',e.target.value)} style={finp} />
                    </FField>
                    <FField label="Publisher">
                      <input value={form.publisher} onChange={e=>setF('publisher',e.target.value)} style={finp} />
                    </FField>
                    <FField label="Release Date">
                      <input value={form.released} onChange={e=>setF('released',e.target.value)} style={finp} placeholder="YYYY-MM-DD" />
                    </FField>
                    <FField label="Metacritic Score">
                      <input value={form.metacritic} onChange={e=>setF('metacritic',e.target.value)} style={finp} type="number" min="0" max="100" />
                    </FField>
                    <FField label="Genres (comma separated)" span={2}>
                      <input value={Array.isArray(form.genres)?form.genres.join(', '):form.genres} onChange={e=>setF('genres',e.target.value)} style={finp} />
                    </FField>
                    <FField label="Description" span={2}>
                      <textarea value={form.description} onChange={e=>setF('description',e.target.value)} style={{ ...finp, height:70, resize:'none' }} />
                    </FField>
                    <FField label="Cover Image URL" span={2}>
                      <input value={form.cover} onChange={e=>setF('cover',e.target.value)} style={finp} placeholder="https://…" />
                    </FField>
                    <FField label="Website" span={2}>
                      <input value={form.website} onChange={e=>setF('website',e.target.value)} style={finp} placeholder="https://…" />
                    </FField>
                  </div>

                  <div style={{ marginTop:16, display:'flex', justifyContent:'space-between' }}>
                    <button onClick={() => setStep(STEP.SEARCH)} style={backBtn}>← Back to Search</button>
                    <button onClick={() => setStep(STEP.LINK)} style={nextBtn}>Next: Link Executable →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {}
        {step === STEP.LINK && (
          <div style={{ padding:28, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:480 }}>
              {}
              {form.name && (
                <div style={{ display:'flex', gap:14, alignItems:'center', padding:14, background:'var(--bg3)', borderRadius:12, border:'1px solid var(--border)', marginBottom:28 }}>
                  <div style={{ width:44, height:58, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--bg4)' }}>
                    {form.cover
                      ? <img src={form.cover} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎮</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:3 }}>{form.name}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>{form.developer}{form.released?` · ${form.released.slice(0,4)}`:''}</div>
                  </div>
                </div>
              )}

              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, textAlign:'center', marginBottom:8 }}>Link the Executable</h3>
              <p style={{ fontSize:14, color:'var(--text2)', textAlign:'center', marginBottom:24, lineHeight:1.65 }}>
                Browse to your game's <code style={{ background:'var(--bg4)', padding:'2px 7px', borderRadius:5, fontSize:12, color:'var(--accent)' }}>.exe</code> file so SpiceGames can launch it.
              </p>

              {}
              {exePath ? (
                <div style={{ padding:14, background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontSize:12, color:'var(--success)', fontWeight:700, marginBottom:4 }}>✓ Executable selected</div>
                  <div style={{ fontSize:12, color:'var(--text2)', fontFamily:'monospace', wordBreak:'break-all' }}>{exePath}</div>
                  <button onClick={() => { setExePath(''); setExeName('') }} style={{ marginTop:8, fontSize:12, color:'var(--text3)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    Change
                  </button>
                </div>
              ) : (
                <button onClick={handleBrowseExe}
                  style={{ width:'100%', padding:'16px', borderRadius:12, border:'2px dashed var(--border2)', background:'transparent', color:'var(--text2)', fontSize:14, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .2s', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)';e.currentTarget.style.background=`rgba(var(--accent-rgb),.05)`}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='transparent'}}>
                  <span style={{ fontSize:20 }}>📂</span>
                  Browse for .exe / .app
                </button>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(STEP.DETAIL)} style={{ ...backBtn, flex:1 }}>← Back</button>
                <button onClick={handleSave} disabled={!exePath || saving}
                  style={{ flex:2, padding:'12px', borderRadius:10, border:'none', background: (exePath && !saving) ? `linear-gradient(135deg,var(--accent),var(--accent2))` : 'var(--bg4)', color: (exePath && !saving) ? '#fff' : 'var(--text3)', fontSize:14, fontWeight:700, cursor:(exePath && !saving)?'pointer':'default', fontFamily:'var(--font-display)', boxShadow:(exePath && !saving)?'var(--shadow-glow)':'none', letterSpacing:'.3px', transition:'all .2s', opacity:saving?.6:1 }}>
                  {saving ? '…' : '+ Add to Library'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FField({ label, children, span=1 }) {
  return (
    <div style={{ gridColumn: span===2 ? '1/-1' : undefined }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.4px' }}>{label}</label>
      {children}
    </div>
  )
}

const finp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', fontFamily:'var(--font-body)', padding:'9px 12px', borderRadius:8, fontSize:13, outline:'none', transition:'border-color .18s' }
const backBtn = { padding:'10px 18px', borderRadius:9, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text2)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-body)' }
const nextBtn = { padding:'10px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,var(--accent),var(--accent2))`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'var(--shadow-glow)' }

function accentFromGenres(genres=[]) {
  const g = genres.join(' ').toLowerCase()
  if (g.match(/action|shooter/)) return '#EF4444'
  if (g.match(/rpg|fantasy|role/)) return '#8B5CF6'
  if (g.match(/sport|racing/)) return '#10B981'
  if (g.match(/horror|stealth/)) return '#6B7280'
  if (g.match(/strategy|puzzle/)) return '#F59E0B'
  if (g.match(/adventure/)) return '#06B6D4'
  if (g.match(/simulation/)) return '#0EA5E9'
  return '#6366F1'
}