
import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function num(v, f=2) { return Number.parseFloat(v).toFixed(f) }

function useQueryParams(state, setState) {
  // read on load
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const next = {}
    const keys = ['usage','ur','ue','pr','pe','battery','nmc','sys','maint','itc','view','admin']
    keys.forEach(k => { const val = p.get(k); if (val !== null) next[k] = val })
    if (Object.keys(next).length) {
      setState(s => ({
        ...s,
        usage: next.usage ? +next.usage : s.usage,
        utilityRate: next.ur ? +next.ur : s.utilityRate,
        utilityEsc: next.ue ? +next.ue : s.utilityEsc,
        ppaRate: next.pr ? +next.pr : s.ppaRate,
        ppaEsc: next.pe ? +next.pe : s.ppaEsc,
        includeBattery: next.battery === '1' ? true : s.includeBattery,
        netMeteringCredit: next.nmc ? +next.nmc : s.netMeteringCredit,
        systemCost: next.sys ? +next.sys : s.systemCost,
        maintenance: next.maint ? +next.maint : s.maintenance,
        itc: next.itc ? +next.itc : s.itc,
        view: next.view || s.view
      }))
    }
  }, [setState])

  // write on change
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('usage', state.usage)
    p.set('ur', state.utilityRate)
    p.set('ue', state.utilityEsc)
    p.set('pr', state.ppaRate)
    p.set('pe', state.ppaEsc)
    if (state.includeBattery) p.set('battery','1')
    p.set('nmc', state.netMeteringCredit)
    p.set('sys', state.systemCost)
    p.set('maint', state.maintenance)
    p.set('itc', state.itc)
    p.set('view', state.view)
    const url = window.location.pathname + '?' + p.toString()
    window.history.replaceState({}, '', url)
  }, [state])
}

export default function App() {
  const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || ''
  const [locked, setLocked] = useState(true)

  const [state, setState] = useState({
    usage: 14354,
    utilityRate: 0.38,
    utilityEsc: 0.09,
    ppaRate: 0.22,
    ppaEsc: 0.035,
    includeBattery: false,
    netMeteringCredit: 0.10,
    systemCost: 45000,
    maintenance: 200,
    itc: 0.30,
    view: 'annual'
  })

  // lock/unlock based on ?admin= key
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('admin')
    setLocked(key !== ADMIN_KEY)
  }, [ADMIN_KEY])

  const lockProps = locked ? { disabled: true, readOnly: true } : {}

  useQueryParams(state, setState)

  const years = [...Array(25)].map((_,i)=>i+1)
  const batteryMonthly = 59.99
  const batteryEsc = 0.03

  const results = useMemo(() => {
    let cumPurchaseOps = 0
    let breakeven = null
    const discountedSystemCost = state.systemCost * (1 - state.itc)

    const rows = years.map((year) => {
      const ur = state.utilityRate * Math.pow(1 + state.utilityEsc, year - 1)
      const pr = state.ppaRate * Math.pow(1 + state.ppaEsc, year - 1)
      const batteryYear = state.includeBattery ? batteryMonthly * 12 * Math.pow(1 + batteryEsc, year - 1) : 0

      const utilAnnual = ur * state.usage
      const ppaAnnual = pr * state.usage + batteryYear
      const nemSavings = state.usage * state.netMeteringCredit
      const purchaseAnnual = state.maintenance + (state.includeBattery ? batteryMonthly * 12 : 0) - nemSavings

      cumPurchaseOps += purchaseAnnual
      const cumPPA = state.ppaRate * state.usage * ((Math.pow(1 + state.ppaEsc, year) - 1) / state.ppaEsc) +
                     (state.includeBattery ? batteryMonthly * 12 * ((Math.pow(1 + batteryEsc, year) - 1) / batteryEsc) : 0)
      const cumUtil = state.utilityRate * state.usage * ((Math.pow(1 + state.utilityEsc, year) - 1) / state.utilityEsc)
      const cumPurchase = discountedSystemCost + cumPurchaseOps

      if (!breakeven && cumPurchaseOps >= discountedSystemCost) breakeven = year

      return { year, utilAnnual, ppaAnnual, purchaseAnnual, cumUtil, cumPPA, cumPurchase }
    })
    return { rows, breakeven, discountedSystemCost }
  }, [state])

  const chartData = useMemo(() => results.rows.map(r => ({
    year: r.year,
    'Utility': state.view === 'annual' ? +r.utilAnnual.toFixed(2) : +r.cumUtil.toFixed(2),
    'PPA': state.view === 'annual' ? +r.ppaAnnual.toFixed(2) : +r.cumPPA.toFixed(2),
    'Purchase': state.view === 'annual' ? +r.purchaseAnnual.toFixed(2) : +r.cumPurchase.toFixed(2),
  })), [results, state.view])

  const totalKWh = state.usage * 25
  const co2SavedKg = totalKWh * 0.7; // approx kg CO2 per kWh
  const treesEq = co2SavedKg / 21.77

  const totalPPAvsUtility = results.rows.reduce((acc, r) => acc + (r.utilAnnual - r.ppaAnnual), 0)

  function copyShareLink() {
    const url = new URL(window.location.href)
    url.searchParams.delete('admin') // remove admin key before sharing
    navigator.clipboard.writeText(url.toString())
  }

  function downloadPDF() {
    window.print()
  }

  return (
    <div className="wrap">
      <div className="hero">
        <div className="logo" />
        <div>
          <h1>Solar Savings Comparison {locked && <span className="muted" style={{fontSize:12}}> · View-only</span>}</h1>
          <div className="sub">25-year projection · PPA vs Purchase vs Utility · Battery · NEM · ITC</div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Inputs</h2>
          <div className="row">
            <div className="stack">
              <label>Annual Usage (kWh)</label>
              <input type="number" value={state.usage} onChange={e=>setState(s=>({...s, usage:+e.target.value}))} {...lockProps} />
              <span className="hint">Typical home: 8,000–16,000 kWh</span>
            </div>
            <div className="stack">
              <label>View Mode</label>
              <input type="text" value={state.view} onChange={e=>setState(s=>({...s, view:e.target.value}))} list="views" {...lockProps} />
              <datalist id="views"><option value="annual" /><option value="cumulative" /></datalist>
              <span className="hint">Switch to cumulative for lifetime totals</span>
            </div>
          </div>

          <div className="row">
            <div className="stack">
              <label>Utility Start ($/kWh)</label>
              <input type="number" step="0.001" value={state.utilityRate} onChange={e=>setState(s=>({...s, utilityRate:+e.target.value}))} {...lockProps} />
            </div>
            <div className="stack">
              <label>Utility Escalation (e.g., 0.09 = 9%)</label>
              <input type="number" step="0.001" value={state.utilityEsc} onChange={e=>setState(s=>({...s, utilityEsc:+e.target.value}))} {...lockProps} />
            </div>
          </div>

          <div className="row">
            <div className="stack">
              <label>PPA Start ($/kWh)</label>
              <input type="number" step="0.001" value={state.ppaRate} onChange={e=>setState(s=>({...s, ppaRate:+e.target.value}))} {...lockProps} />
            </div>
            <div className="stack">
              <label>PPA Escalator (e.g., 0.035 = 3.5%)</label>
              <input type="number" step="0.001" value={state.ppaEsc} onChange={e=>setState(s=>({...s, ppaEsc:+e.target.value}))} {...lockProps} />
            </div>
          </div>

          <div className="row">
            <div className="stack">
              <label>Include Battery ($59.99/mo)</label>
              <input type="checkbox" checked={state.includeBattery} onChange={e=>setState(s=>({...s, includeBattery:e.target.checked}))} disabled={locked} />
            </div>
            <div className="stack">
              <label>NEM Credit ($/kWh)</label>
              <input type="number" step="0.001" value={state.netMeteringCredit} onChange={e=>setState(s=>({...s, netMeteringCredit:+e.target.value}))} {...lockProps} />
            </div>
          </div>

          <div className="row">
            <div className="stack">
              <label>Purchase — System Cost ($)</label>
              <input type="number" step="100" value={state.systemCost} onChange={e=>setState(s=>({...s, systemCost:+e.target.value}))} {...lockProps} />
              <span className="hint">ITC applied at {num(state.itc*100,0)}% → Net: ${num(state.systemCost*(1-state.itc),0)}</span>
            </div>
            <div className="stack">
              <label>Purchase — Annual Maintenance ($)</label>
              <input type="number" step="10" value={state.maintenance} onChange={e=>setState(s=>({...s, maintenance:+e.target.value}))} {...lockProps} />
            </div>
          </div>

          <div className="row">
            <div className="stack">
              <label>Federal Tax Credit (ITC, 0.30 = 30%)</label>
              <input type="number" step="0.01" value={state.itc} onChange={e=>setState(s=>({...s, itc:+e.target.value}))} {...lockProps} />
            </div>
            <div className="stack">
              <label>&nbsp;</label>
              <button className="btn secondary" onClick={copyShareLink}>Copy Customer Link</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Projection ({state.view})</h2>
          <div className="legend"><span className="dot u"></span>Utility <span className="dot p"></span>PPA <span className="dot c"></span>Purchase</div>
          <div className="line"></div>
          <div style={{width:'100%', height:320}}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b1e25" />
                <XAxis dataKey="year" stroke="#9aa3ad" />
                <YAxis stroke="#9aa3ad" />
                <Tooltip formatter={(v)=>'$'+Number(v).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="Utility" stroke="#7aa2f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="PPA" stroke="#25d366" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Purchase" stroke="#ff9f43" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="statbar">
            <div className="pill">
              <span className="muted">25-yr PPA Savings vs Utility</span>
              <strong>${Math.round(totalPPAvsUtility).toLocaleString()}</strong>
            </div>
            <div className="pill">
              <span className="muted">Purchase Breakeven (Ops vs ITC-Adjusted Cost)</span>
              <strong>{results.breakeven ? `Year ${results.breakeven}` : '—'}</strong>
            </div>
            <div className="pill">
              <span className="muted">CO₂ Offset (kg) / Trees</span>
              <strong>{Math.round(co2SavedKg).toLocaleString()} / {Math.round(treesEq).toLocaleString()}</strong>
            </div>
          </div>

          <div className="foot">
            <button className="btn secondary" onClick={()=>setState(s=>({...s, view: s.view==='annual'?'cumulative':'annual'}))}>Toggle to {state.view==='annual'?'Cumulative':'Annual'}</button>
            <button className="btn" onClick={downloadPDF}>Download PDF Summary</button>
          </div>
        </div>
      </div>

      <div className="grid1 mt20">
        <div className="card">
          <h2>Why Choose Sunrun?</h2>
          <div className="row">
            <div className="stack">
              <div className="pill"><strong>25-year coverage</strong><span className="muted">Monitoring, maintenance, workmanship</span></div>
            </div>
            <div className="stack">
              <div className="pill"><strong>No upfront cost</strong><span className="muted">Pay for power produced</span></div>
            </div>
          </div>
          <div className="row">
            <div className="stack">
              <div className="pill"><strong>Predictable rates</strong><span className="muted">Fixed PPA escalator</span></div>
            </div>
            <div className="stack">
              <div className="pill"><strong>Battery ready</strong><span className="muted">Optional backup power</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Get Your Personalized Proposal</h2>
          <div className="row">
            <div className="stack">
              <label>Full Name</label>
              <input id="name" type="text" placeholder="Jane Homeowner" />
            </div>
            <div className="stack">
              <label>Email</label>
              <input id="email" type="text" placeholder="jane@email.com" />
            </div>
          </div>
          <div className="row">
            <div className="stack">
              <label>Address</label>
              <input id="addr" type="text" placeholder="123 Main St, Boston MA" />
            </div>
            <div className="stack">
              <label>Phone</label>
              <input id="phone" type="text" placeholder="(555) 555-5555" />
            </div>
          </div>
          <div className="foot">
            <button className="btn" onClick={()=>{
              const name = document.getElementById('name').value
              const email = document.getElementById('email').value
              const addr = document.getElementById('addr').value
              const phone = document.getElementById('phone').value
              const subject = encodeURIComponent('Solar Proposal Request')
              const body = encodeURIComponent(
                `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nAddress: ${addr}\n\nInputs:\n`+
                `Usage: ${state.usage} kWh/yr\nUtility: $${state.utilityRate}/kWh @ ${state.utilityEsc*100}%\n`+
                `PPA: $${state.ppaRate}/kWh @ ${state.ppaEsc*100}%\nBattery: ${state.includeBattery?'Yes':'No'}\n`+
                `NEM Credit: $${state.netMeteringCredit}/kWh\nSystem Cost: $${state.systemCost} (ITC ${state.itc*100}%)`
              )
              window.location.href = `mailto:?subject=${subject}&body=${body}`
            }}>Email My Details</button>
            <button className="btn secondary" onClick={()=>{
              const url = new URL(window.location.href); url.searchParams.delete('admin'); navigator.clipboard.writeText(url.toString())
            }}>Copy Customer Link</button>
          </div>
          <div className="hint">The email button opens your mail app with prefilled inputs.</div>
        </div>
      </div>
    </div>
  )
}
