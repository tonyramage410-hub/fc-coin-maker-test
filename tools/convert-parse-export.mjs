// Usage: node tools/convert-parse-export.mjs price-export.json verified-context.json > market.json
// Sanitised, already authorised exports only. No API calls.
import {readFileSync} from 'node:fs';
import {convertParsePrice} from '../parse-export.mjs';
try{
 const [price,context]=process.argv.slice(2);if(!price||!context)throw Error('Two sanitised JSON file paths are required.');
 const read=path=>{const raw=readFileSync(path,'utf8');if(Buffer.byteLength(raw)>1000000)throw Error('Input exceeds 1 MB.');return JSON.parse(raw);};
 console.log(JSON.stringify(convertParsePrice(read(price),read(context)),null,2));
}catch{console.error('Conversion rejected: check sanitised input, documented payload and exact verified context. No provider request was made.');process.exitCode=1;}
