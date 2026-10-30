# Callback

[Live demo — callback-hackathon.sja-affu765.workers.dev](https://callback-hackathon.sja-affu765.workers.dev)

Your stream has a memory. Callback connects a live conversation to the moments your community remembers, then brings the old clip back as a live production element.

## Development

Requires Node.js 20+ and npm. Run `npm ci`, then `npm run dev`. Open http://localhost:8787. The account-free replay works immediately. Run `npm test` for retrieval and safety checks.

## Configuration

Environment variable names: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`. Copy `.env.example` to `.dev.vars` for local credentials. Production credentials use `wrangler secret put`. Never commit credentials.

Cloudflare Workers serves the application, Durable Objects isolate streamer sessions and synchronize overlays, and Workers AI supplies neural embeddings for live retrieval. Twitch OAuth and Helix run on the server.

## Deployment

Run `npm run deploy` after authenticating with Wrangler. The Worker is named `callback-hackathon`.

## Demo attribution

The demo uses a curated public clip library credited to LIRIK. Chat is a scripted replay, clearly identified in the interface. Public clip links are embedded from their original host; no video is copied or redistributed. Demo content is isolated from every connected streamer's own library.

MIT License. See [LICENSE](LICENSE).
