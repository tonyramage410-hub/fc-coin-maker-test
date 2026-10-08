import { FIXTURES } from './fixtures.mjs';
import { freshness, historyRisk } from '../../market-data.mjs';

// Security boundary: no provider implementation, credential binding, outbound
// request function, scheduled handler, trade route or writable state exists.
// Environment variables and client headers cannot enable any of these.
const RELEASE = 'm5-synthetic-only';
const ORIGIN = 'https://tonyramage410-hub.github.io';
const MAX_URL = 2048;
const PLATFORMS = ['ps', 'xbox', 'pc', 'switch'];
const FINISHES = ['standard', 'holographic'];
const NOTICE = 'Synthetic test data only. Not real players, live prices or approved recommendations.';
const PAGE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FC Coin Maker — synthetic backend</title><body><main><h1>FC Coin Maker · Milestone 5 backend</h1><p><strong>All provider requests disabled. Synthetic test data only.</strong></p><p>No EA connection, trades, billing integration or approval writes.</p><ul><li><a href="/v1/status">Backend status</a></li><li><a href="/v1/demo/cards?game=FC27">Synthetic card search</a></li><li><a href="/v1/approvals">Empty approvals register</a></li></ul><p>The real market routes return unavailable. Owner operations remain locked until authentication and durable audit storage are approved and configured.</p></main></body></html>`;

function reply(request, payload, status = 200, extra = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000',
    'Vary': 'Origin',
    ...extra
  });
  // Public read-only synthetic/status resources. No cookies, bearer token or
  // credentialed CORS; this allowlist is not represented as authentication.
  if (request.headers.get('Origin') === ORIGIN) headers.set('Access-Control-Allow-Origin', ORIGIN);
  return new Response(request.method === 'HEAD' || status === 204 ? null : JSON.stringify(payload), { status, headers });
}
const error = (request, code, status) => reply(request, { error: { code }, release: RELEASE }, status);
function validateQuery(params, exact = false) {
  const allowed = exact ? ['game', 'platform', 'version', 'finish'] : ['game', 'q', 'platform', 'version', 'finish'];
  for (const key of params.keys()) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1) return null;
  }
  if (params.get('game') !== 'FC27') return null;
  const q = params.get('q') ?? '';
  const platform = params.get('platform') ?? '';
  const version = params.get('version') ?? '';
  const finish = params.get('finish') ?? '';
  if (q.length > 64 || version.length > 60 || /[\x00-\x1f\x7f<>]/.test(q + version)) return null;
  if ((platform && !PLATFORMS.includes(platform)) || (finish && !FINISHES.includes(finish))) return null;
  if (exact && (!platform || !version || !finish)) return null;
  return { q: q.toLowerCase(), platform, version, finish };
}
function select(query, id) {
  return FIXTURES.filter(c => (!id || c.cardId === id)
    && (!query.q || (c.name + ' ' + c.cardId).toLowerCase().includes(query.q))
    && (!query.platform || c.platform === query.platform)
    && (!query.version || c.version === query.version)
    && (!query.finish || c.finish === query.finish));
}
function envelope(data) {
  return { schemaVersion: 1, mode: 'synthetic', synthetic: true, notice: NOTICE,
    realMarketConnected: false, approved: false, ...data };
}
function projectedCard(c) {
  return { ...c, history: [], synthetic: true, ownerApproval: 'not-approved', freshness: freshness(c) };
}

export async function handleRequest(request) {
  if (request.url.length > MAX_URL) return error(request, 'url_too_long', 414);
  let url;
  try { url = new URL(request.url); } catch { return error(request, 'invalid_url', 400); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    return error(request, 'https_required', 400);
  if (request.headers.has('Upgrade')) return error(request, 'upgrade_not_supported', 400);
  if (request.headers.has('Origin') && request.headers.get('Origin') !== ORIGIN) return error(request, 'origin_not_allowed', 403);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    // No payload is read, echoed, stored or forwarded, even for owner routes.
    if (url.pathname.startsWith('/v1/owner/')) return error(request, 'owner_writes_locked', 423);
    return reply(request, { error: { code: 'method_not_allowed' } }, 405, { Allow: 'GET, HEAD, OPTIONS' });
  }
  if (request.body !== null || (request.headers.has('Content-Length') && request.headers.get('Content-Length') !== '0'))
    return error(request, 'body_not_allowed', 400);
  if (url.username || url.password || url.hash || /%(?:2f|5c|2e|00)/i.test(url.pathname) || url.pathname.includes('\\'))
    return error(request, 'invalid_path', 400);
  if (url.pathname.startsWith('/v1/owner/')) return error(request, 'owner_auth_not_configured', 503);
  const demoExact = url.pathname.match(/^\/v1\/demo\/cards\/([A-Z0-9-]{1,40})\/(quote|history)$/);
  const known = ['/', '/v1/status', '/v1/approvals', '/v1/cards', '/v1/demo/cards'].includes(url.pathname)
    || demoExact || /^\/v1\/cards\/[A-Za-z0-9-]{1,40}\/(quote|history)$/.test(url.pathname);
  if (!known) return error(request, 'not_found', 404);
  if (request.method === 'OPTIONS') {
    if (request.headers.get('Origin') !== ORIGIN) return error(request, 'preflight_not_allowed', 403);
    const method = request.headers.get('Access-Control-Request-Method');
    if (!['GET', 'HEAD'].includes(method) || request.headers.get('Access-Control-Request-Headers'))
      return error(request, 'preflight_not_allowed', 403);
    return reply(request, null, 204, { 'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Max-Age': '0' });
  }
  if (url.pathname === '/v1/cards' || url.pathname.startsWith('/v1/cards/'))
    return error(request, 'provider_disabled', 503);
  if (url.pathname === '/v1/status') {
    if (url.search) return error(request, 'invalid_query', 400);
    return reply(request, { release: RELEASE, mode: 'synthetic-only', providerRequestsEnabled: false,
      providerCreditBudget: 0, realMarketConnected: false, eaConnected: false,
      tradingAutomationEnabled: false, approvalWritesEnabled: false,
      ownerAuthentication: 'not-configured', storage: 'none', syntheticFixtureCount: FIXTURES.length });
  }
  if (url.pathname === '/v1/approvals') {
    if (url.search) return error(request, 'invalid_query', 400);
    return reply(request, { approvals: [], writesEnabled: false, reason: 'explicit_owner_decision_required' });
  }
  if (url.pathname === '/') {
    if (url.search) return error(request, 'invalid_query', 400);
    const response = reply(request, null, 200, { 'Content-Type': 'text/html; charset=utf-8' });
    return new Response(request.method === 'HEAD' ? null : PAGE, { status: 200, headers: response.headers });
  }
  const query = validateQuery(url.searchParams, Boolean(demoExact));
  if (!query) return error(request, 'invalid_query', 400);
  const found = select(query, demoExact?.[1]);
  if (!demoExact) return reply(request, envelope({ count: found.length, cards: found.map(projectedCard) }));
  if (found.length !== 1) return error(request, 'exact_card_not_found', 404);
  const c = found[0];
  if (demoExact[2] === 'history') return reply(request, envelope({ identity: { provider:c.provider, game:c.game,
    cardId:c.cardId, platform:c.platform, version:c.version, finish:c.finish }, history:c.history, risk:historyRisk(c) }));
  return reply(request, envelope({ card: projectedCard(c) }));
}

export default {
  async fetch(request, _env, _ctx) {
    try { return await handleRequest(request); }
    catch { return error(request, 'internal_error', 500); } // No stack/secret leakage.
  }
};
