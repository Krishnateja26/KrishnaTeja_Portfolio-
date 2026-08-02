# KrishnaBot Worker

A Cloudflare Worker that proxies portfolio chatbot questions to the Gemini API.
The Gemini API key is stored as a Worker secret and never reaches the browser —
only this Worker's URL is public, and it only accepts requests from the
portfolio's own origin (see `ALLOWED_ORIGINS` in `index.js`).

## One-time setup

1. **Get a free Gemini API key**: https://aistudio.google.com/apikey (sign in
   with your own Google account, click "Create API key").

2. **Create a free Cloudflare account** (if you don't have one):
   https://dash.cloudflare.com/sign-up

3. **Install Wrangler** (Cloudflare's CLI), from this `worker/` folder:

   ```bash
   npm install -g wrangler
   ```

4. **Log in** (opens a browser window to authenticate your Cloudflare account):

   ```bash
   wrangler login
   ```

5. **Set the Gemini key as a secret** (typed/pasted interactively — it is
   never written to any file in this repo):

   ```bash
   wrangler secret put GEMINI_API_KEY
   ```

6. **Deploy**:

   ```bash
   wrangler deploy
   ```

   Wrangler prints a URL like `https://krishnateja-portfolio-chatbot.<your-subdomain>.workers.dev`.

7. **Wire it up**: open `../Chatbot.js` and replace the placeholder at the top:

   ```js
   const WORKER_URL = "https://REPLACE-WITH-YOUR-WORKER.workers.dev";
   ```

   with the URL from step 6, then commit and push so GitHub Pages picks it up.

## Notes

- If the Worker isn't deployed yet, or the URL isn't set, or a request fails
  for any reason (quota, network, etc.), the chatbot automatically falls back
  to the local, fully-offline keyword matcher already in `Chatbot.js` — the
  site never breaks because of this.
- The Worker fetches `portfolio-data.json` live from the deployed GitHub Pages
  site on every request (cached 5 minutes on Cloudflare's edge), so it always
  answers from the current data with no need to redeploy the Worker when you
  edit that file.
- Free tier limits: Gemini free tier and Cloudflare Workers' free plan
  (100,000 requests/day) are both generous for a personal portfolio's traffic.
- To allow a different origin (e.g. a custom domain later), add it to
  `ALLOWED_ORIGINS` in `index.js` and redeploy.
