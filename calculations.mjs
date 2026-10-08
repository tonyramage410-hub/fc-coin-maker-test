// Offline planning only. Tick schedule and card limits require FC 27 verification.
export const TAX_RATE = 0.05;
export const TARGET_LIMIT = 50; // Demo policy, not a live capacity measurement.
export const AUCTION_MINUTES = 15;
export const REVIEW_AFTER_SALES = 10;
export const MIN_PRICE = 150;
export const MAX_PRICE = 15000000; // Demo model cap; per-card ranges take precedence.
function number(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && !value.trim()) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}
function whole(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max;
}
export function priceStep(price) {
  if (price < 1000) return 50;
  if (price < 10000) return 100;
  if (price < 50000) return 250;
  if (price < 100000) return 500;
  return 1000;
}
export function isValidPrice(value) {
  const n = number(value);
  return whole(n, MIN_PRICE, MAX_PRICE) && n % priceStep(n) === 0;
}
export function floorTick(value) {
  const n = number(value);
  if (!Number.isFinite(n) || n < MIN_PRICE || n > MAX_PRICE) return 0;
  return Math.floor(n / priceStep(n)) * priceStep(n);
}
export function planTrade({marketPrice, undercut = 100, minProfit = 75,
  balance = 30000, allocationPct = 30, occupiedTargets = 0,
  auctionMinutes = 15, mode = 'bid', cardMin = MIN_PRICE,
  cardMax = MAX_PRICE, committedCoins = 0} = {}) {
  const errors = [];
  if (!isValidPrice(marketPrice)) errors.push('Reference price must use a valid demo tick (150–15,000,000).');
  for (const [name, value] of [['Undercut', undercut], ['Profit target', minProfit], ['Balance', balance], ['Committed coins', committedCoins]]) {
    if (!whole(value)) errors.push(`${name} must be a non-negative whole number.`);
  }
  if (!whole(allocationPct, 0, 100)) errors.push('Allocation must be a whole percentage from 0 to 100.');
  if (!whole(occupiedTargets, 0, TARGET_LIMIT)) errors.push('Occupied targets must be a whole number from 0 to 50.');
  if (!['bid', 'snipe'].includes(mode)) errors.push('Unknown mode.');
  if (mode === 'bid' && !(number(auctionMinutes) > 0 && number(auctionMinutes) <= AUCTION_MINUTES)) errors.push('Auction time must be above 0 and at most 15 minutes.');
  if (!isValidPrice(cardMin) || !isValidPrice(cardMax) || number(cardMin) > number(cardMax)) errors.push('Card price bounds must be valid ticks in ascending order.');
  if (number(committedCoins) > number(balance)) errors.push('Committed coins exceed balance.');
  const empty = {market:0,sell:0,tax:0,netSale:0,maxBid:0,theoreticalProfit:0,tradingBudget:0,reserve:0,remainingTargets:0,possibleBids:0,targetProfit:0,eligible:false,errors};
  if (errors.length) return empty;
  const market = number(marketPrice), targetProfit = number(minProfit);
  const low = number(cardMin), high = number(cardMax);
  if (market < low || market > high) errors.push('Reference price falls outside the entered card range.');
  const sell = floorTick(market - number(undercut));
  if (sell < low || sell > high) errors.push('Suggested sale falls outside the entered card range.');
  // Round tax UP to avoid overestimating net proceeds when 5% is fractional.
  // Exact FC 27 fractional-tax rounding is unverified; this is a conservative estimate.
  const tax = Math.ceil(sell / 20), netSale = sell - tax;
  const rawCeiling = Math.min(high, netSale - targetProfit);
  const maxBid = floorTick(rawCeiling);
  if (maxBid < low) errors.push('No purchase in this card range meets the profit target.');
  const allocated = Number(BigInt(number(balance)) * BigInt(number(allocationPct)) / 100n);
  const tradingBudget = Math.max(0, allocated - number(committedCoins));
  const remainingTargets = TARGET_LIMIT - number(occupiedTargets);
  const possibleBids = maxBid >= low ? Math.min(remainingTargets, Math.floor(tradingBudget / maxBid)) : 0;
  if (!possibleBids) errors.push('No available budget or target capacity.');
  return {market,sell,tax,netSale,maxBid,theoreticalProfit:maxBid >= low ? netSale-maxBid : 0,tradingBudget,
    reserve:number(balance)-number(committedCoins)-tradingBudget,remainingTargets,possibleBids,targetProfit,eligible:errors.length===0,errors};
}
export function permittedNextBid(nextBid, lockedMaximum, tradingBudgetAvailable, freeSlots, minutesRemaining, cardMin = MIN_PRICE, cardMax = MAX_PRICE) {
  return isValidPrice(nextBid) && isValidPrice(lockedMaximum) && isValidPrice(cardMin) && isValidPrice(cardMax)
    && number(cardMin) <= number(cardMax) && number(nextBid) >= number(cardMin) && number(nextBid) <= number(cardMax)
    && number(nextBid) <= number(lockedMaximum) && whole(tradingBudgetAvailable) && number(nextBid) <= number(tradingBudgetAvailable)
    && whole(freeSlots, 1, TARGET_LIMIT) && number(minutesRemaining) > 0 && number(minutesRemaining) <= AUCTION_MINUTES;
}
