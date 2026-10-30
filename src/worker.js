export class Studio { constructor(state, env) { this.state = state; this.env = env; } async fetch() { return Response.json({ok:true}); } }
export default { async fetch(request, env) { if(new URL(request.url).pathname === '/api/health') return Response.json({ok:true,service:'callback'}); return env.ASSETS.fetch(request); } };
