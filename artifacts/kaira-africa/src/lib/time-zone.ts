/** IANA time-zone helpers for date-only business deadlines and local meeting scheduling. */
export function dateInTimeZone(date:Date,timeZone:string):string {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const read=(type:string)=>parts.find(part=>part.type===type)?.value??"";
 return `${read("year")}-${read("month")}-${read("day")}`;
}

export function localDateTimeInTimeZone(instant:Date,timeZone:string):string {
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(instant);
 const read=(type:string)=>parts.find(part=>part.type===type)?.value??"";
 return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function localMeetingTimeToUtc(value:string,timeZone:string):string|null {
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
 if(!match) return null;
 const target=[Number(match[1]),Number(match[2]),Number(match[3]),Number(match[4]),Number(match[5])];
 const targetMs=Date.UTC(target[0],target[1]-1,target[2],target[3],target[4]);
 const normalized=new Date(targetMs);
 if(normalized.getUTCFullYear()!==target[0]||normalized.getUTCMonth()+1!==target[1]||normalized.getUTCDate()!==target[2]||normalized.getUTCHours()!==target[3]||normalized.getUTCMinutes()!==target[4]) return null;
 const targetKey=`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
 const formatLocal=(instant:Date)=>{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(instant);
  const read=(type:string)=>parts.find(part=>part.type===type)?.value??"";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
 };
 let guess=targetMs;
 for(let i=0;i<4;i++){
  const represented=formatLocal(new Date(guess));
  const matchLocal=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(represented);
  if(!matchLocal) return null;
  const representedMs=Date.UTC(Number(matchLocal[1]),Number(matchLocal[2])-1,Number(matchLocal[3]),Number(matchLocal[4]),Number(matchLocal[5]));
  guess=targetMs-(representedMs-guess);
 }
 // Nonexistent spring-forward times fail round-trip. Repeated fall-back times
 // can round-trip twice, so reject them rather than silently choosing an instant.
 if(formatLocal(new Date(guess))!==targetKey) return null;
 const searchWindow=3*60*60*1000, step=15*60*1000;
 for(let delta=-searchWindow;delta<=searchWindow;delta+=step){
  if(delta!==0&&formatLocal(new Date(guess+delta))===targetKey) return null;
 }
 return new Date(guess).toISOString();
}
