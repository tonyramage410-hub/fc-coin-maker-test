// Deliberately fixed historical timestamps. A request never makes data newer.
// Fictional identities only; never a provider response or trading recommendation.
const observedAt = '2026-10-01T12:00:00Z';
const retrievedAt = '2026-10-01T12:01:00Z';
const identity = (platform, version, finish) =>
  JSON.stringify(['synthetic-test', 'FC27', 'TEST-001', version, finish, platform]);
const make = (platform, version, finish, price) => ({
  provider: 'synthetic-test', game: 'FC27', cardId: 'TEST-001',
  name: 'TEST FIXTURE — NOT A REAL PLAYER', rating: 80, version, finish, platform,
  price, observedAt: price === null ? null : observedAt, uncertaintySeconds: 0,
  bounds: { min: 150, max: 15000000 }, ticksVerified: false,
  source: { name: 'Synthetic development fixture', url: 'https://example.com/synthetic',
    endpoint: 'offline-fixture', retrievedAt, permittedUseConfirmed: false },
  history: price === null ? [] : [1200, 1000, 1100].map((p, i) => ({
    cardKey: identity(platform, version, finish),
    observedAt: `2026-10-01T${String(9+i).padStart(2,'0')}:00:00Z`,
    price: p, kind: 'hourly-average', sourceURL: 'https://example.com/synthetic'
  }))
});
export const FIXTURES = [
  make('ps', 'TEST TOTW', 'standard', 1200),
  make('pc', 'TEST TOTW', 'standard', 1300),
  make('ps', 'TEST GOLD', 'holographic', 1000),
  make('xbox', 'TEST TOTW', 'standard', null)
];
// Freeze deeply so one request cannot corrupt later responses.
function freeze(value) {
  Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); });
  return Object.freeze(value);
}
freeze(FIXTURES);
