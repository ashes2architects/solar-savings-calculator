
# Solar Savings Comparison (Full App)
Customer-facing calculator that compares **Utility vs PPA vs Purchase** over 25 years, with **Battery**, **NEM**, and **ITC**. 
Includes **annual/cumulative chart**, **print-to-PDF** summary, **admin lock** (view-only for customers), and **shareable URL params**.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy on Vercel (novice-friendly)
1. Create a free account at https://vercel.com (login with GitHub).
2. Push this folder to a GitHub repo (GitHub → New → Upload files → drag all project files).
3. In Vercel: **New Project → Import Repo**.
4. Framework: **Vite**, Build Command: `npm run build`, Output Directory: `dist/`.
5. Deploy → you’ll get a live URL (works on any phone; no downloads).

### Set your admin key
Vercel → Project → **Settings → Environment Variables**
- **Name:** `VITE_ADMIN_KEY`
- **Value:** a long random secret (e.g., `bd6f3e7f-AdminKey-2025`)
- **Environment:** Production (and Preview if desired)
- **Redeploy**

### Admin vs Customer links
- **Admin (editable):** `https://your-url.app?admin=YOUR_SECRET_KEY`
- **Customer (view-only):** open the admin link, set values, then copy the link using **Copy Customer Link** (it strips the admin param).

## URL parameters (auto-updated)
- `usage`, `ur`, `ue`, `pr`, `pe`, `battery` (1 or omit), `nmc`, `sys`, `maint`, `itc`, `view`.

Example:
```
https://your-url.app?usage=12000&ur=0.38&ue=0.09&pr=0.22&pe=0.035&battery=1&nmc=0.10&sys=42000&maint=250&itc=0.30&view=cumulative
```

## Notes
- CO₂ factor uses ~0.7 kg/kWh.
- Contact button composes a prefilled email via `mailto:` (no backend needed).
