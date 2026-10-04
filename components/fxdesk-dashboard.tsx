'use client'

import { useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Crosshair,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Newspaper,
  PanelLeft,
  Play,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

const navGroups = [
  { label: 'Workspace', items: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Chart', icon: LineChart }, { label: 'Paper Trading', icon: WalletCards }, { label: 'My Strategy', icon: Target }] },
  { label: 'Training', items: [{ label: 'Order Flow Training', icon: Activity }, { label: 'Trading Training', icon: GraduationCap }] },
  { label: 'AI Analysis', items: [{ label: 'Analysis', icon: Bot }, { label: 'ICT Analysis', icon: Crosshair }, { label: 'SMC Analysis', icon: SlidersHorizontal }] },
  { label: 'Desk', items: [{ label: 'Risk & Profit Manager', icon: BarChart3 }, { label: 'Supply & Demand', icon: ShieldCheck }] },
  { label: 'Insights', items: [{ label: 'Live Forex News', icon: Newspaper }, { label: 'Trade Journal', icon: BookOpen }, { label: 'Analytics', icon: BarChart3 }, { label: 'Learning FX', icon: GraduationCap }] },
]

const tasks = [
  { label: 'Complete daily checklist', meta: '3 of 4 tasks completed', done: true },
  { label: 'Analyze EUR/USD chart', meta: 'Chart workspace', done: true },
  { label: 'Finish order flow lesson', meta: '12 min remaining', done: true },
  { label: 'Log a trade journal entry', meta: 'Not started', done: false },
]

const activity = [
  { date: '01', day: 'Mon', type: 'login' }, { date: '02', day: 'Tue', type: 'win' }, { date: '03', day: 'Wed', type: 'training' }, { date: '04', day: 'Thu', type: 'login' }, { date: '05', day: 'Fri', type: 'win' }, { date: '06', day: 'Sat', type: 'journal' }, { date: '07', day: 'Sun', type: 'login' },
  { date: '08', day: 'Mon', type: 'win' }, { date: '09', day: 'Tue', type: 'training' }, { date: '10', day: 'Wed', type: 'login' }, { date: '11', day: 'Thu', type: 'loss' }, { date: '12', day: 'Fri', type: 'journal' }, { date: '13', day: 'Sat', type: 'login' }, { date: '14', day: 'Sun', type: 'win' },
  { date: '15', day: 'Mon', type: 'login' }, { date: '16', day: 'Tue', type: 'training' }, { date: '17', day: 'Wed', type: 'win' }, { date: '18', day: 'Thu', type: 'login' }, { date: '19', day: 'Fri', type: 'journal' }, { date: '20', day: 'Sat', type: 'login' }, { date: '21', day: 'Sun', type: 'win' },
]

const market = [{ pair: 'EUR/USD', price: '1.0842', change: '+0.24%' }, { pair: 'GBP/USD', price: '1.2678', change: '+0.12%' }, { pair: 'USD/JPY', price: '151.42', change: '-0.18%' }, { pair: 'AUD/USD', price: '0.6548', change: '+0.31%' }]

export function FXDeskDashboard() {
  const [active, setActive] = useState('Dashboard')
  const [completed, setCompleted] = useState(tasks.map((task) => task.done))
  const [notice, setNotice] = useState('')

  const select = (label: string) => {
    setActive(label)
    if (label !== 'Dashboard') setNotice(`${label} workspace selected`)
    else setNotice('')
  }

  return (
    <div className="fx-shell">
      <aside className="fx-sidebar">
        <div className="fx-brand"><div className="fx-brand-mark">F</div><div><strong>FXDESK</strong><span>TRADING INTELLIGENCE</span></div></div>
        <div className="fx-profile"><div className="fx-avatar">JD</div><div><strong>Jordan Davis</strong><span>Pro member</span></div><ChevronDown size={15} /></div>
        <nav className="fx-nav" aria-label="Main navigation">
          {navGroups.map((group) => <div className="fx-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ label, icon: Icon }) => <button className={active === label ? 'fx-nav-item active' : 'fx-nav-item'} key={label} onClick={() => select(label)}><Icon size={16} /><span>{label}</span>{label === 'Trading Training' && <span className="fx-new">NEW</span>}</button>)}</div>)}
          <div className="fx-nav-group bottom-nav"><p>Account</p><button className="fx-nav-item" onClick={() => select('Leaderboard')}><Trophy size={16} /><span>Leaderboard</span></button><button className="fx-nav-item" onClick={() => select('Community')}><Users size={16} /><span>Community</span><span className="fx-premium">PRO</span></button><button className="fx-nav-item" onClick={() => select('Settings')}><Settings size={16} /><span>Settings</span></button></div>
        </nav>
      </aside>
      <main className="fx-main">
        <header className="fx-header"><button className="mobile-menu" aria-label="Open menu"><PanelLeft size={19} /></button><div className="fx-search"><Search size={17} /><input aria-label="Search FXDESK" placeholder="Search workspace..." /></div><div className="fx-header-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="credits"><span><b className="dot blue" /> 1,240</span><span><b className="dot green" /> 380</span></div><button className="premium-button"><Sparkles size={14} /> Premium</button><div className="header-avatar">JD</div></div></header>
        <div className="fx-content">
          {notice && <div className="fx-toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
          <div className="fx-page-heading"><div><div className="eyebrow">MONDAY, OCTOBER 21, 2024 <span className="live-pill"><i /> MARKETS OPEN</span></div><h1>Welcome back, Jordan <span className="wave">✦</span></h1><p>Build your edge. One session at a time.</p></div><button className="outline-button"><CalendarCheck size={16} /> Daily checklist <span className="count-badge">3/4</span></button></div>
          <section className="stats-grid"><StatCard label="Login streak" value="12" suffix="days" icon={<CalendarCheck />} tone="violet" detail="Best: 18 days" /><StatCard label="Total points" value="4,860" suffix="pts" icon={<Trophy />} tone="amber" detail="+240 this week" /><StatCard label="Normal credits" value="1,240" suffix="credits" icon={<CircleDollarSign />} tone="blue" detail="Spendable balance" /><StatCard label="Premium status" value="Active" suffix="" icon={<Sparkles />} tone="green" detail="Renews Dec 21, 2024" /> </section>
          <div className="dashboard-grid">
            <section className="panel tasks-panel"><div className="panel-header"><div><div className="section-kicker">TODAY&apos;S PROGRESS</div><h2>Daily checklist</h2></div><span className="progress-label">{completed.filter(Boolean).length} / {tasks.length}</span></div><div className="progress-track"><span style={{ width: `${completed.filter(Boolean).length / tasks.length * 100}%` }} /></div><div className="task-list">{tasks.map((task, index) => <button className={completed[index] ? 'task-row completed' : 'task-row'} key={task.label} onClick={() => setCompleted((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))}><span className="task-check">{completed[index] && <Check size={13} />}</span><span className="task-copy"><strong>{task.label}</strong><small>{task.meta}</small></span>{completed[index] ? <span className="task-status">Done</span> : <ChevronDown className="task-arrow" size={15} />}</button>)}</div><button className="text-button" onClick={() => select('Daily Checklist')}>View full checklist <span>→</span></button></section>
            <section className="panel chart-panel"><div className="panel-header"><div><div className="section-kicker">MARKET SNAPSHOT</div><h2>EUR/USD <span className="pair-sub">Forex · 1H</span></h2></div><div className="chart-actions"><button className="chart-action active">1H</button><button className="chart-action">4H</button><button className="chart-action">1D</button><button className="icon-button small"><SlidersHorizontal size={15} /></button></div></div><div className="quote"><strong>1.0842</strong><span className="positive">+0.0026 <small>(+0.24%)</small></span></div><MiniChart /><div className="chart-footer"><span><i className="legend-line cyan" /> EMA 20</span><span><i className="legend-line violet" /> EMA 50</span><button className="text-button" onClick={() => select('Chart')}>Open advanced chart <span>→</span></button></div></section>
            <section className="panel performance-panel"><div className="panel-header"><div><div className="section-kicker">TRADING PERFORMANCE</div><h2>This week</h2></div><button className="muted-select">This week <ChevronDown size={14} /></button></div><div className="performance-numbers"><div><span>Win rate</span><strong>68.4%</strong></div><div><span>Net P/L</span><strong className="positive">+$482.60</strong></div><div><span>Trades</span><strong>19</strong></div></div><div className="bars"><span style={{ height: '32%' }} /><span style={{ height: '48%' }} /><span style={{ height: '41%' }} /><span style={{ height: '65%' }} /><span style={{ height: '54%' }} /><span style={{ height: '78%' }} /><span style={{ height: '90%' }} /><span style={{ height: '62%' }} /><span style={{ height: '74%' }} /><span style={{ height: '84%' }} /><span style={{ height: '69%' }} /><span style={{ height: '96%' }} /></div><div className="bar-labels"><span>Oct 14</span><span>Today</span></div></section>
            <section className="panel tip-panel"><div className="tip-glow" /><div className="section-kicker">TODAY&apos;S TIP</div><h2>Protect your downside first.</h2><p>Before entering a trade, define exactly where your idea is invalidated. A small, planned loss is the cost of doing business.</p><div className="tip-by"><div className="tip-avatar">FX</div><span>FXDESK Education <small>Published today</small></span></div></section>
          </div>
          <div className="lower-grid"><section className="panel calendar-panel"><div className="panel-header"><div><div className="section-kicker">CONSISTENCY</div><h2>Activity calendar</h2></div><button className="muted-select">October 2024 <ChevronDown size={14} /></button></div><div className="calendar-week">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{activity.map((day) => <button key={day.date + day.day} className={`calendar-day ${day.type}`} onClick={() => setNotice(`${day.day}, October ${day.date}: ${day.type} activity`}><small>{day.date}</small><i /></button>)}</div><div className="calendar-legend"><span><i className="legend-dot login" /> Login</span><span><i className="legend-dot win" /> Winning day</span><span><i className="legend-dot training" /> Training</span><span><i className="legend-dot journal" /> Journal</span></div></section><section className="panel training-panel"><div className="panel-header"><div><div className="section-kicker">CONTINUE TRAINING</div><h2>Market structure essentials</h2></div><button className="play-button" onClick={() => select('Trading Training')}><Play size={16} fill="currentColor" /></button></div><div className="training-art"><div className="training-line" /><span>MODULE 04 <b>OF 08</b></span><strong>Reading the market<br />through structure</strong></div><div className="training-footer"><div className="mini-progress"><span style={{ width: '58%' }} /></div><span>58% complete</span><button className="text-button" onClick={() => select('Trading Training')}>Resume <span>→</span></button></div></section><section className="panel market-panel"><div className="panel-header"><div><div className="section-kicker">PAPER TRADING</div><h2>Market pulse <span className="live-pill"><i /> LIVE</span></h2></div><button className="text-button" onClick={() => select('Paper Trading')}>Trade <span>→</span></button></div><div className="market-table">{market.map((item) => <button key={item.pair} onClick={() => setNotice(`${item.pair} selected in Paper Trading`)}><span className="pair-dot" /><strong>{item.pair}</strong><span className="market-price">{item.price}</span><span className={item.change.startsWith('+') ? 'positive' : 'negative'}>{item.change}</span></button>)}</div></section></div>
          <footer className="fx-footer"><span>FXDESK © 2024</span><span>For educational purposes only. Not financial advice.</span><span className="footer-links">Status <span>·</span> Privacy <span>·</span> Terms</span></footer>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, suffix, icon, tone, detail }: { label: string; value: string; suffix: string; icon: React.ReactNode; tone: string; detail: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><div className="stat-value">{value} <small>{suffix}</small></div><span className="stat-detail">{detail}</span></div> }
function MiniChart() { return <div className="mini-chart"><div className="chart-y"><span>1.0860</span><span>1.0840</span><span>1.0820</span><span>1.0800</span></div><svg viewBox="0 0 700 180" preserveAspectRatio="none" role="img" aria-label="EUR USD line chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39d9c0" stopOpacity=".22" /><stop offset="1" stopColor="#39d9c0" stopOpacity="0" /></linearGradient></defs><path d="M0 136 L35 128 L70 145 L105 118 L140 124 L175 90 L210 105 L245 87 L280 94 L315 75 L350 85 L385 56 L420 67 L455 53 L490 73 L525 47 L560 59 L595 36 L630 51 L665 26 L700 35 L700 180 L0 180Z" fill="url(#area)" /><path d="M0 136 L35 128 L70 145 L105 118 L140 124 L175 90 L210 105 L245 87 L280 94 L315 75 L350 85 L385 56 L420 67 L455 53 L490 73 L525 47 L560 59 L595 36 L630 51 L665 26 L700 35" fill="none" stroke="#39d9c0" strokeWidth="2.5" /><path d="M0 148 C120 139, 220 129, 330 102 S530 78, 700 52" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 5" opacity=".85" /></svg><div className="chart-x"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div></div> }
