import logoSvg from '../logo.svg'
import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const IS = typeof window !== 'undefined' && window.spicedeck?.isElectron

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
    { id: 'red', label: 'Crimson', accent: '#EF4444', bg: '#0F0808', desc: 'Deep red' },
    { id: 'dark', label: 'Dark', accent: '#6366F1', bg: '#08080F', desc: 'Indigo dark' },
    { id: 'neon', label: 'Neon', accent: '#00FF88', bg: '#050A05', desc: 'Green matrix' },
    { id: 'ember', label: 'Ember', accent: '#F97316', bg: '#0C0806', desc: 'Warm orange' },
]

// ── API data sources ──────────────────────────────────────────────────────────
const APIS = [
    {
        name: 'Steam Store',
        emoji: '🟦',
        accent: '#1a9fff',
        url: 'https://store.steampowered.com',
        badge: 'FREE · NO KEY',
        desc: '50,000+ games. Search, descriptions, pricing, genres, screenshots, Metacritic scores and user reviews.',
        provides: ['Search', 'Descriptions', 'Screenshots', 'Pricing', 'Genres', 'User Reviews', 'Metacritic'],
    },
    {
        name: 'SteamSpy',
        emoji: '📊',
        accent: '#c6d4df',
        url: 'https://steamspy.com',
        badge: 'FREE · NO KEY',
        desc: 'Community stats. Owner estimates, average playtime, and community tags pulled from player data.',
        provides: ['Owner Estimates', 'Avg Playtime', 'Community Tags'],
    },
    {
        name: 'OpenCritic',
        emoji: '🎯',
        accent: '#F28C28',
        url: 'https://opencritic.com',
        badge: 'FREE · NO KEY',
        desc: 'Aggregated critic reviews from 300+ gaming outlets worldwide. Critic score and outlet count.',
        provides: ['Critic Score', 'Review Count', 'Outlet Coverage'],
    },
    {
        name: 'Steam CDN (Akamai)',
        emoji: '🖼',
        accent: '#66c0f4',
        url: 'https://cdn.akamai.steamstatic.com',
        badge: 'FREE',
        desc: 'Official Steam image CDN. Portrait covers → header banners → hero art, with automatic fallback chain.',
        provides: ['Portrait Covers', 'Header Banners', 'Hero Art', 'Screenshots'],
    },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children, noPad }) {
    return (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{title}</span>
            </div>
            {noPad ? children : <div>{children}</div>}
        </div>
    )
}

function Row({ label, desc, children, last }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--border)', minHeight: 56 }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                {desc && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
            </div>
            <div style={{ flexShrink: 0 }}>{children}</div>
        </div>
    )
}

function Toggle({ value, onChange, disabled }) {
    return (
        <div onClick={() => !disabled && onChange(!value)}
            style={{ width: 46, height: 26, borderRadius: 13, background: value ? 'var(--accent)' : 'var(--bg5)', border: `1px solid ${value ? 'var(--accent)' : 'var(--border2)'}`, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .22s', opacity: disabled ? .5 : 1, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .22s', boxShadow: '0 1px 4px rgba(0,0,0,.35)' }} />
        </div>
    )
}

function SelectInput({ value, onChange, options }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', fontFamily: 'var(--font-body)', padding: '8px 28px 8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238B89A8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const settings = useStore(s => s.settings)
    const saveSettings = useStore(s => s.saveSettings)
    const applyTheme = useStore(s => s.applyTheme)
    const games = useStore(s => s.games)

    const [local, setLocal] = useState(settings || {})
    const [version, setVersion] = "2.0.0";
    const [startupStatus, setStartupStatus] = useState({ enabled: false, supported: false })
    const [startupLoading, setStartupLoading] = useState(false)

    useEffect(() => {
        if (settings) setLocal(settings)
        if (IS) {
            window.spicedeck.getAppVersion().then(v => setVersion(v)).catch(() => { })
            window.spicedeck.getStartupStatus().then(s => setStartupStatus(s)).catch(() => { })
        }
    }, [settings])

    const set = (k, v) => { setLocal(p => ({ ...p, [k]: v })); saveSettings({ [k]: v }) }

    const handleTheme = (id) => {
        applyTheme(id)
        setLocal(p => ({ ...p, theme: id }))
    }

    const handleStartup = async (enable) => {
        if (!IS) { toast('Only works in the installed desktop app', { icon: '💡' }); return }
        setStartupLoading(true)
        try {
            await window.spicedeck.setRunOnStartup(enable)
            set('runOnStartup', enable)
            setStartupStatus(s => ({ ...s, enabled: enable }))
            toast.success(enable ? 'SpiceDeck will launch on startup' : 'Removed from startup')
        } catch { toast.error('Failed to update startup setting') }
        setStartupLoading(false)
    }

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(games, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        Object.assign(document.createElement('a'), { href: url, download: 'spicedeck-library.json' }).click()
        URL.revokeObjectURL(url)
        toast.success('Library exported!')
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '22px 26px 60px' }}>

            {/* Page title */}
            <div style={{ marginBottom: 26 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>Settings</h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 5 }}>Customize SpiceDeck to your setup</p>
            </div>

            <div style={{ maxWidth: 680 }}>

                {/* ── APPEARANCE ──────────────────────────────────────── */}
                <Section title="Appearance">
                    {/* Theme picker */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>Theme</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                            {THEMES.map(t => {
                                const active = (local.theme || 'dark') === t.id
                                return (
                                    <button key={t.id} onClick={() => handleTheme(t.id)}
                                        style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${active ? t.accent : 'var(--border2)'}`, background: active ? `${t.accent}14` : 'var(--bg3)', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>
                                        {/* Glow corner */}
                                        <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: t.accent, opacity: .08 }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                            <div style={{ width: 11, height: 11, borderRadius: '50%', background: t.accent, boxShadow: `0 0 7px ${t.accent}`, flexShrink: 0 }} />
                                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: active ? t.accent : 'var(--text)' }}>{t.label}</span>
                                            {active && <span style={{ marginLeft: 'auto', fontSize: 13, color: t.accent }}>✓</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.desc}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <Row label="Default library view">
                        <SelectInput value={local.defaultView || 'grid'} onChange={v => set('defaultView', v)}
                            options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
                    </Row>
                    <Row label="Default sort order" last>
                        <SelectInput value={local.sortBy || 'name'} onChange={v => set('sortBy', v)}
                            options={[
                                { value: 'name', label: 'Name A–Z' },
                                { value: 'rating', label: 'Top Rated' },
                                { value: 'playtime', label: 'Most Played' },
                                { value: 'lastPlayed', label: 'Recently Played' },
                                { value: 'added', label: 'Recently Added' },
                            ]} />
                    </Row>
                </Section>

                {/* ── SYSTEM ──────────────────────────────────────────── */}
                <Section title="System">
                    <Row
                        label="Run on startup"
                        desc={
                            !IS ? 'Only available in the installed desktop app' :
                                !startupStatus.supported ? 'Only available in packaged build (npm run build)' :
                                    'Launch SpiceDeck automatically when you log in to Windows'
                        }>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {startupLoading && <div style={{ width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
                            <Toggle
                                value={startupStatus.enabled || local.runOnStartup === true}
                                onChange={handleStartup}
                                disabled={!IS || !startupStatus.supported || startupLoading}
                            />
                        </div>
                    </Row>
                    <Row label="Minimize on game launch" desc="Minimize SpiceDeck window when a game starts">
                        <Toggle value={local.minimizeOnLaunch !== false} onChange={v => set('minimizeOnLaunch', v)} />
                    </Row>
                    <Row label="Track playtime" desc="Record how long you play each session" last>
                        <Toggle value={local.trackPlaytime !== false} onChange={v => set('trackPlaytime', v)} />
                    </Row>
                </Section>

                {/* ── METADATA ────────────────────────────────────────── */}
                <Section title="Metadata">
                    <Row label="Auto-fill metadata" desc="Auto-search Steam when you browse for an .exe">
                        <Toggle value={local.autoFill !== false} onChange={v => set('autoFill', v)} />
                    </Row>
                    <Row label="Metadata sources" desc="APIs used in priority order" last>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {['Steam', 'SteamSpy', 'OpenCritic'].map(s => (
                                <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,.2)', fontWeight: 600 }}>✓ {s}</span>
                            ))}
                        </div>
                    </Row>
                </Section>

                {/* ── LIBRARY ─────────────────────────────────────────── */}
                <Section title="Library">
                    <Row label="Games in library">
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>{games.length}</span>
                    </Row>
                    <Row label="Export library" desc="Download your library as a JSON backup" last>
                        <button onClick={handleExport}
                            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background .18s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg3)'}>
                            📤 Export JSON
                        </button>
                    </Row>
                </Section>

                {/* ── DATA SOURCES & CREDITS ───────────────────────────── */}
                <Section title="Data Sources & Credits" noPad>
                    <div>
                        {APIS.map((api, i) => (
                            <div key={api.name} style={{ padding: '16px 20px', borderBottom: i < APIS.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                {/* Icon */}
                                <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 12, background: `${api.accent}18`, border: `1px solid ${api.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                                    {api.emoji}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Name + badges + link */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{api.name}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,.22)' }}>● ACTIVE</span>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${api.accent}15`, color: api.accent, border: `1px solid ${api.accent}28` }}>{api.badge}</span>
                                        <a href={api.url} target="_blank" rel="noreferrer"
                                            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', textDecoration: 'none', transition: 'color .18s', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                                            onMouseEnter={e => e.currentTarget.style.color = api.accent}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                                            {api.url.replace('https://', '').split('/')[0]} ↗
                                        </a>
                                    </div>

                                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 8 }}>{api.desc}</p>

                                    {/* Provides pills */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {api.provides.map(p => (
                                            <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{p}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── LEGAL ───────────────────────────────────────────── */}
                <Section title="Legal">
                    <Row label="Privacy Policy" desc="How SpiceDeck handles your data — we collect nothing">
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Online hosted version — replace # with your URL when published */}
                            <a href="https://ash-kernel.github.io/spicedeck/#legal"
                                target="_blank" rel="noreferrer" style={linkStyle}>
                                View ↗
                            </a>
                        </div>
                    </Row>
                    <Row label="Terms of Service" desc="Rules and conditions for using SpiceDeck" last>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Online hosted version — replace # with your URL when published */}
                            <a href="https://ash-kernel.github.io/spicedeck/#legal"
                                target="_blank" rel="noreferrer" style={linkStyle}>
                                View ↗
                            </a>
                        </div>
                    </Row>
                </Section>

                {/* ── ABOUT ───────────────────────────────────────────── */}
                <Section title="About">
                    {/* App info */}
                    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center' }}>
                        <img src={logoSvg} alt="SpiceDeck" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, boxShadow: '0 4px 16px rgba(99,102,241,.35)' }} />
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--text)', marginBottom: 3 }}>SpiceDeck</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>A personal game launcher</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: `rgba(var(--accent-rgb),.12)`, color: 'var(--accent)' }}>v{version}</span>
                                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)' }}>Electron 28 · React 18</span>
                            </div>
                        </div>
                    </div>

                    {/* Author */}
                    <Row label="Developer" desc="Built with ❤ by ash-kernel">
                        <a href="https://github.com/ash-kernel" target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg3)', textDecoration: 'none', transition: 'all .18s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--border3)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text)" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.09.682-.218.682-.484 0-.236-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .269.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>ash-kernel</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>↗</span>
                        </a>
                    </Row>

                    <Row label="Repository" desc="Source code and releases" last>
                        <a href="https://github.com/ash-kernel/spicedeck" target="_blank" rel="noreferrer"
                            style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg3)', transition: 'all .18s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)' }}>
                            View on GitHub ↗
                        </a>
                    </Row>
                </Section>

            </div>
        </div>
    )
}

const linkStyle = {
    padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'var(--bg3)', color: 'var(--accent)', textDecoration: 'none',
    fontSize: 13, transition: 'background .18s', display: 'inline-block',
}
const comingSoonStyle = {
    fontSize: 12, color: 'var(--text3)', padding: '7px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg3)', fontStyle: 'italic',
    display: 'inline-block',
}