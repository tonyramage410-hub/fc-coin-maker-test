// OFFLINE converter only. No HTTP, key, scraping or paid call implementation.
import {parseDataset,cardKey,validTime} from './market-data.mjs';
export function parseRelativeAge(value){
 if(typeof value!=='string')return null;
 const m=value.trim().match(/^(\d+)\s+(sec(?:ond)?s?|min(?:ute)?s?|hours?|days?)\s+ago$/i);if(!m)return null;
 const unit=m[2].toLowerCase(),scale=unit.startsWith('sec')?1:unit.startsWith('min')?60:unit.startsWith('hour')?3600:86400;
 const seconds=Number(m[1])*scale;if(!Number.isSafeInteger(seconds))return null;
 return {seconds,uncertaintySeconds:scale};
}
export function convertParsePrice(payload,context){
 // Context supplies identity/rights metadata omitted or ambiguous in the provider payload.
 // Only the documented PS endpoint is supported here. No PS-to-Xbox remapping.
 if(!payload||typeof payload!=='object'||!context||context.game!=='FC27'||context.platform!=='ps'||context.endpoint!=='get_fc27_player_price'||!validTime(context.retrievedAt))throw Error('Only an explicit FC27 PlayStation price export is supported.');
 if(!Number.isSafeInteger(payload.player_id)||payload.player_id<=0||String(payload.player_id)!==context.cardId||payload.version!==context.version||payload.name!==context.name||Number(payload.rating)!==context.rating)throw Error('Export identity differs from verified context; no name/version fallback is allowed.');
 // Response assembly timestamp is NOT the price update timestamp.
 if(!Number.isSafeInteger(payload.timestamp)||payload.timestamp<0||payload.timestamp>Date.parse(context.retrievedAt))throw Error('Provider assembly timestamp is invalid or after retrieval.');
 const age=parseRelativeAge(payload.updated);
 const observedAt=age?new Date(payload.timestamp-age.seconds*1000).toISOString():null;
 const card={provider:'parse-futbin',game:'FC27',cardId:context.cardId,name:context.name,rating:context.rating,version:context.version,finish:context.finish,platform:'ps',price:payload.price===0?null:payload.price??null,observedAt,uncertaintySeconds:age?.uncertaintySeconds??0,bounds:payload.price_range?{min:payload.price_range.min,max:payload.price_range.max}:null,ticksVerified:context.ticksVerified,source:{name:'FUTBIN via Parse (imported export)',url:context.sourceURL,endpoint:context.endpoint,retrievedAt:context.retrievedAt,permittedUseConfirmed:context.permittedUseConfirmed},history:[]};
 const key=cardKey(card);
 // Average graph prices may be fractional or off-tick; they are not listing quotes.
 for(const [field,kind]of [['hourly_prices','hourly-average'],['daily_prices','daily-average']]){
  if(payload[field]!==undefined&&!Array.isArray(payload[field]))throw Error('Invalid historical series.');
  for(const p of payload[field]??[]){if(!Number.isSafeInteger(p.timestamp)||p.timestamp<0||!Number.isSafeInteger(p.price)||p.price<=0)throw Error('Unvalidated historical value: use canonical schema after explicit reconciliation.');
   const t=new Date(p.timestamp).toISOString();card.history.push({cardKey:key,observedAt:t,price:p.price,kind,sourceURL:context.sourceURL});}
 }
 return parseDataset(JSON.stringify({schemaVersion:1,cards:[card]}));
}
