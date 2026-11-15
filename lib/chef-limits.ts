import {createHash} from 'node:crypto';
import {AppError} from './gemini';
// Best-effort per-instance limits; no database or identity service required.
const clients=new Map<string,{start:number;count:number;pending:boolean}>();
export function beginChefRequest(request:Request){
  const now=Date.now();const windowMs=10*60*1000;
  for(const [key,value] of clients)if(now-value.start>=windowMs&&!value.pending)clients.delete(key);
  const address=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';
  const key=createHash('sha256').update(address).digest('hex');
  let entry=clients.get(key);
  if(!entry||now-entry.start>=windowMs&&!entry.pending){entry={start:now,count:0,pending:false};clients.set(key,entry)}
  if(entry.pending)throw new AppError(429,'Your chef is already answering a question. Please wait for that answer.');
  if(entry.count>=12)throw new AppError(429,'You have reached 12 chef questions in 10 minutes. Please try again after the window resets.');
  if(clients.size>2000)throw new AppError(429,'The chef is busy. Please try again shortly.');
  entry.count++;entry.pending=true;
  return ()=>{entry.pending=false};
}
