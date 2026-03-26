import React, { useState, useEffect, useRef } from 'react'

const BUTTONS = [
  { index:0,  label:'A',       x:215, y:130, r:14, color:'#22c55e' },
  { index:1,  label:'B',       x:240, y:108, r:14, color:'#ef4444' },
  { index:2,  label:'X',       x:190, y:108, r:14, color:'#3b82f6' },
  { index:3,  label:'Y',       x:215, y:86,  r:14, color:'#f59e0b' },
  { index:4,  label:'LB',      x:68,  y:54,  r:12, color:'#8b5cf6' },
  { index:5,  label:'RB',      x:212, y:54,  r:12, color:'#8b5cf6' },
  { index:6,  label:'LT',      x:55,  y:36,  r:12, color:'#a78bfa' },
  { index:7,  label:'RT',      x:225, y:36,  r:12, color:'#a78bfa' },
  { index:8,  label:'⊞',      x:118, y:108, r:10, color:'#6b7280' },
  { index:9,  label:'☰',      x:162, y:108, r:10, color:'#6b7280' },
  { index:10, label:'L3',      x:100, y:148, r:11, color:'#6366f1' },
  { index:11, label:'R3',      x:178, y:148, r:11, color:'#6366f1' },
  { index:12, label:'↑',       x:76,  y:148, r:10, color:'#94a3b8' },
  { index:13, label:'↓',       x:76,  y:170, r:10, color:'#94a3b8' },
  { index:14, label:'←',       x:58,  y:159, r:10, color:'#94a3b8' },
  { index:15, label:'→',       x:94,  y:159, r:10, color:'#94a3b8' },
]

export default function ControllerPage() {
  const [pads,           setPads]           = useState([])
  const [activePad,      setActivePad]      = useState(0)
  const [state,          setState]          = useState({ buttons:[], axes:[] })
  const [keys,           setKeys]           = useState({})
  const [mouse,          setMouse]          = useState({ buttons: {}, x: 0, y: 0 })
  const [testingMode,    setTestingMode]    = useState(true)
  const [testKeyboard,   setTestKeyboard]   = useState(true)
  const [testMouse,      setTestMouse]      = useState(true)
  const rafRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Tell the app-level gamepad nav to pause while we're on this page
    window.__controllerPageActive = true
    return () => { window.__controllerPageActive = false }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!testingMode || !testKeyboard) return
      
      const key = e.key.toLowerCase()
      
      // Check if Shift + E is pressed to exit
      if (key === 'e' && (keys['shift'] || keys['shiftleft'] || keys['shiftright'])) {
        setTestingMode(false)
        e.preventDefault()
        return
      }
      
      setKeys(k => ({ ...k, [key]: true }))
      e.preventDefault()
    }
    
    const handleKeyUp = (e) => {
      if (!testingMode || !testKeyboard) return
      const key = e.key.toLowerCase()
      setKeys(k => ({ ...k, [key]: false }))
      e.preventDefault()
    }
    
    if (testingMode && testKeyboard) {
      window.addEventListener('keydown', handleKeyDown, true)
      window.addEventListener('keyup', handleKeyUp, true)
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [testingMode, testKeyboard, keys])

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (!testingMode || !testMouse) return
      setMouse(m => ({ ...m, buttons: { ...m.buttons, [e.button]: true } }))
      e.preventDefault()
    }
    const handleMouseUp = (e) => {
      if (!testingMode || !testMouse) return
      setMouse(m => ({ ...m, buttons: { ...m.buttons, [e.button]: false } }))
      e.preventDefault()
    }
    const handleMouseMove = (e) => {
      if (!testingMode || !testMouse) return
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMouse(m => ({ ...m, x: e.clientX - rect.left, y: e.clientY - rect.top }))
      }
    }
    
    if (testingMode && testMouse) {
      window.addEventListener('mousedown', handleMouseDown, true)
      window.addEventListener('mouseup', handleMouseUp, true)
      window.addEventListener('mousemove', handleMouseMove, true)
    }
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
      window.removeEventListener('mousemove', handleMouseMove, true)
    }
  }, [testingMode, testMouse])

  useEffect(() => {
    const onConnect    = () => setPads([...navigator.getGamepads()].filter(Boolean))
    const onDisconnect = () => setPads([...navigator.getGamepads()].filter(Boolean))
    window.addEventListener('gamepadconnected',    onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    setPads([...navigator.getGamepads()].filter(Boolean))

    const poll = () => {
      const pads = [...navigator.getGamepads()].filter(Boolean)
      setPads(pads)
      const pad = pads[activePad]
      if (pad) setState({ buttons: [...pad.buttons].map(b => ({ pressed: b.pressed, value: b.value })), axes: [...pad.axes] })
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('gamepadconnected',    onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
    }
  }, [activePad])

  const pressed = state.buttons.map ? state.buttons : []
  const btnPressed = (i) => pressed[i]?.pressed
  const btnValue   = (i) => pressed[i]?.value ?? 0
  const axes    = state.axes
  const lx = axes[0] || 0, ly = axes[1] || 0
  const rx = axes[2] || 0, ry = axes[3] || 0

  // Check if any keys are pressed
  const hasAnyKeyPressed = Object.values(keys).some(k => k)
  // Check if any mouse buttons are pressed
  const hasAnyMouseButtonPressed = Object.values(mouse.buttons).some(b => b)

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:`linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)` }} ref={containerRef}>
      <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(8,8,15,0.6)', backdropFilter:'blur(10px)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:900, color:'var(--text)', lineHeight:1, background:'linear-gradient(135deg, #fff 30%, rgba(200,200,255,0.55))', backgroundClip:'text', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Input Tester</h1>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setTestKeyboard(!testKeyboard)} style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${testKeyboard?'#60a5fa':'var(--border2)'}`, background:testKeyboard?'rgba(96,165,250,.1)':'var(--bg3)', color:testKeyboard?'#60a5fa':'var(--text3)', fontSize:11, cursor:'pointer', fontWeight:600, transition:'all .2s' }}>
              {testKeyboard ? '⌨️ Keyboard' : '⌨️ Off'}
            </button>
            <button onClick={() => setTestMouse(!testMouse)} style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${testMouse?'#f43f5e':'var(--border2)'}`, background:testMouse?'rgba(244,63,94,.1)':'var(--bg3)', color:testMouse?'#f43f5e':'var(--text3)', fontSize:11, cursor:'pointer', fontWeight:600, transition:'all .2s' }}>
              {testMouse ? '🖱️ Mouse' : '🖱️ Off'}
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:testingMode?`rgba(var(--accent-rgb),.1)`:'rgba(239,68,68,.1)', borderRadius:10, border:`1px solid ${testingMode?'rgba(99,102,241,0.3)':'rgba(239,68,68,0.2)'}`, boxShadow:testingMode?`0 0 16px rgba(99,102,241,0.15)`:`0 0 16px rgba(239,68,68,0.1)`, marginLeft:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:testingMode?'var(--accent)':'#ef4444', boxShadow:`0 0 8px ${testingMode?'var(--accent)':'#ef4444'}`, animation:testingMode?'pulse 2s infinite':'none' }} />
              <span style={{ fontSize:12, fontWeight:600, color:testingMode?'var(--accent)':'#ef4444', letterSpacing:'0.5px' }}>
                {testingMode ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:2, letterSpacing:'0.3px' }}>Test your controller, keyboard, and mouse inputs · Toggle inputs above or press <span style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:'4px', fontFamily:'monospace', fontWeight:700, marginLeft:'4px', marginRight:'4px' }}>Shift + E</span> to disable testing</p>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 60px' }}>
        {!testingMode && (
          <div style={{ padding:'20px 16px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, marginBottom:24, textAlign:'center', boxShadow:'0 4px 16px rgba(239,68,68,0.1)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#ef4444', marginBottom:8, letterSpacing:'0.5px' }}>🔒 Testing Mode Disabled</div>
            <p style={{ fontSize:12, color:'#ef4444', opacity:0.85, lineHeight:'1.6' }}>Input capture has been released. Reload this page to re-enable testing mode.</p>
          </div>
        )}
        {/* CONTROLLER SECTION */}
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>🎮 Gamepad</h2>
          {pads.length === 0 ? (
            <div style={{ padding:'28px 24px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, textAlign:'center', color:'var(--text3)', fontSize:13, boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}>
              No controller detected · plug in and press any button
            </div>
          ) : (
            <>
              {pads.length > 1 && (
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  {pads.map((p,i) => (
                    <button key={i} onClick={() => setActivePad(i)}
                      style={{ padding:'7px 16px', borderRadius:8, border:`1px solid ${activePad===i?'var(--accent)':'var(--border2)'}`, background:activePad===i?`rgba(var(--accent-rgb),.12)`:'var(--bg3)', color:activePad===i?'var(--accent)':'var(--text)', fontSize:12, cursor:'pointer' }}>
                      {p.id.slice(0,30)}
                    </button>
                  ))}
                </div>
              )}

              {pads[activePad] && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:700 }}>
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Buttons</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {BUTTONS.map(btn => (
                        <div key={btn.index}
                          style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, border:`1px solid ${btnPressed(btn.index)?btn.color:'var(--border2)'}`, background:btnPressed(btn.index)?`${btn.color}22`:'var(--bg3)', color:btnPressed(btn.index)?btn.color:'var(--text3)', transition:'all .08s', transform:btnPressed(btn.index)?'scale(.94)':'scale(1)' }}>
                          {btn.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1px' }}>Analog Sticks</div>

                    {[['Left Stick', lx, ly], ['Right Stick', rx, ry]].map(([name, ax, ay]) => (
                      <div key={name}>
                        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{name}</div>
                        <div style={{ width:80, height:80, borderRadius:'50%', border:'2px solid var(--border2)', background:'var(--bg3)', position:'relative', margin:'0 auto' }}>
                          <div style={{ position:'absolute', top:'50%', left:'50%', width:18, height:18, borderRadius:'50%', background:'var(--accent)', transform:`translate(calc(-50% + ${ax*28}px), calc(-50% + ${ay*28}px))`, transition:'transform .04s', boxShadow:`0 0 8px var(--accent)` }} />
                          <div style={{ position:'absolute', top:'49%', left:0, right:0, height:1, background:'var(--border)' }} />
                          <div style={{ position:'absolute', left:'49%', top:0, bottom:0, width:1, background:'var(--border)' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>
                          <span>X: {ax.toFixed(2)}</span><span>Y: {ay.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}

                    {[6,7].map(ti => {
                        const val = btnValue(ti)
                        const pct = Math.round(val * 100)
                        return (
                          <div key={ti}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>{ti===6?'Left Trigger':'Right Trigger'}</span>
                              <span style={{ fontSize:10, color: val > 0.05 ? 'var(--accent)' : 'var(--text3)', fontFamily:'monospace', fontWeight:700 }}>{pct}%</span>
                            </div>
                            <div style={{ height:8, borderRadius:4, background:'var(--bg3)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,var(--accent),var(--accent2))`, borderRadius:4, transition:'width .03s' }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* KEYBOARD SECTION */}
        {testingMode && testKeyboard && (
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>⌨️ Keyboard</h2>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:18, boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}>
            {/* Function Keys */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6, fontWeight:700 }}>FUNCTION KEYS</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(35px, 1fr))', gap:4, marginBottom:12, maxWidth:450 }}>
                {['f1','f2','f3','f4','f5','f6','f7','f8','f9','f10','f11','f12'].map(k => (
                  <div key={k} style={{ height:32, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                    {k.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Escape, Print, etc */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(50px, 1fr))', gap:4, marginBottom:12, maxWidth:300 }}>
              {['escape','printscreen','scrolllock','pause'].map(k => {
                const labels = { escape: 'Esc', printscreen: 'PrtScn', scrolllock: 'ScrLk', pause: 'Pause' }
                return (
                  <div key={k} style={{ height:34, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                    {labels[k]}
                  </div>
                )
              })}
            </div>

            {/* Number Row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40px, 1fr))', gap:6, marginBottom:8, maxWidth:600 }}>
              {['1','2','3','4','5','6','7','8','9','0','-','='].map(k => (
                <div key={k}
                  style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                  {k}
                </div>
              ))}
            </div>

            {/* Top Row (QWERTY) */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40px, 1fr))', gap:6, marginBottom:8, maxWidth:600 }}>
              {['q','w','e','r','t','y','u','i','o','p','[',']','\\'].map(k => (
                <div key={k}
                  style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                  {k === '\\' ? '\\' : k.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Middle Row (ASDFGH) */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40px, 1fr))', gap:6, marginBottom:8, maxWidth:600 }}>
              {['a','s','d','f','g','h','j','k','l',';',"'"].map(k => (
                <div key={k}
                  style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                  {k === "'" ? "'" : k.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Bottom Row (ZXCV) */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40px, 1fr))', gap:6, marginBottom:8, maxWidth:600 }}>
              {['z','x','c','v','b','n','m',',','.','/'].map(k => (
                <div key={k}
                  style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                  {k}
                </div>
              ))}
            </div>

            {/* Insert, Home, Delete Keys */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(45px, 1fr))', gap:4, marginBottom:12, maxWidth:200 }}>
              {['insert','home','pageup','delete','end','pagedown'].map(k => {
                const labels = { insert: 'Ins', home: 'Home', pageup: 'PgUp', delete: 'Del', end: 'End', pagedown: 'PgDn' }
                return (
                  <div key={k} style={{ height:34, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                    {labels[k]}
                  </div>
                )
              })}
            </div>

            {/* Space and Modifiers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40px, 1fr))', gap:6, marginBottom:8, maxWidth:600 }}>
              {['control','shift','alt',' ','backspace'].map(k => {
                const displayKey = k === ' ' ? '␣' : k === 'control' ? 'Ctrl' : k === 'shift' ? 'Shift' : k === 'alt' ? 'Alt' : k === 'backspace' ? '⌫' : k.toUpperCase()
                const keyMatch = k === 'control' ? 'control' : k === ' ' ? ' ' : k === 'backspace' ? 'backspace' : k
                return (
                  <div key={k}
                    style={{ height:38, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, border:`1px solid ${keys[keyMatch]?'var(--accent)':'var(--border2)'}`, background:keys[keyMatch]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[keyMatch]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[keyMatch]?'scale(.92)':'scale(1)' }}>
                    {displayKey}
                  </div>
                )
              })}
            </div>

            {/* Arrow Keys */}
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>Arrow Keys</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 40px)', gap:6, maxWidth:200 }}>
                {['arrowup','arrowleft','arrowdown','arrowright'].map(k => {
                  const icons = { arrowup: '↑', arrowleft: '←', arrowdown: '↓', arrowright: '→' }
                  return (
                    <div key={k}
                      style={{ height:40, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                      {icons[k]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Numpad */}
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, fontWeight:700 }}>NUMPAD</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 40px)', gap:4, maxWidth:200 }}>
                {['numlock','numpaddivide','numpadmultiply','numpadsubtract','numpad7','numpad8','numpad9','numpadadd','numpad4','numpad5','numpad6','numpad1','numpad2','numpad3','numpad0','numpaddecimal'].map((k, idx) => {
                  const labels = { numlock: 'Num', numpaddivide: '/', numpadmultiply: '*', numpadsubtract: '-', numpadadd: '+', numpaddecimal: '.', numpad0: '0', numpad1: '1', numpad2: '2', numpad3: '3', numpad4: '4', numpad5: '5', numpad6: '6', numpad7: '7', numpad8: '8', numpad9: '9' }
                  return (
                    <div key={k} style={{ height:34, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, border:`1px solid ${keys[k]?'var(--accent)':'var(--border2)'}`, background:keys[k]?`rgba(var(--accent-rgb),.15)`:'var(--bg3)', color:keys[k]?'var(--accent)':'var(--text2)', transition:'all .08s', transform:keys[k]?'scale(.92)':'scale(1)' }}>
                      {labels[k]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active Keys Display */}
            <div style={{ marginTop:14, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)', fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>
              {Object.entries(keys).filter(([_, v]) => v).map(([k]) => {
                const display = k === ' ' ? 'SPACE' : k === 'control' ? 'CTRL' : k === 'shift' ? 'SHIFT' : k === 'alt' ? 'ALT' : k === 'backspace' ? 'BACKSPACE' : k === 'arrowup' ? 'UP' : k === 'arrowdown' ? 'DOWN' : k === 'arrowleft' ? 'LEFT' : k === 'arrowright' ? 'RIGHT' : k.toUpperCase()
                return display
              }).join(' + ') || 'Press any key...'}
            </div>
          </div>
        </div>
        )}

        {/* MOUSE SECTION */}
        {testingMode && testMouse && (
        <div>
          <h2 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>🖱️ Mouse</h2>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:18, maxWidth:400, boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Buttons</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { i: 0, label: 'Left', color: '#3b82f6' },
                { i: 1, label: 'Wheel', color: '#8b5cf6' },
                { i: 2, label: 'Right', color: '#ef4444' },
              ].map(btn => (
                <div key={btn.i}
                  style={{ height:50, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4, fontSize:12, fontWeight:700, border:`2px solid ${mouse.buttons[btn.i]?btn.color:'var(--border2)'}`, background:mouse.buttons[btn.i]?`${btn.color}25`:'var(--bg3)', color:mouse.buttons[btn.i]?btn.color:'var(--text3)', transition:'all .08s', transform:mouse.buttons[btn.i]?'scale(.9)':'scale(1)' }}>
                  <div style={{ fontSize:16 }}>{btn.i === 0 ? '◀' : btn.i === 1 ? '⊙' : '▶'}</div>
                  <div style={{ fontSize:10 }}>{btn.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}