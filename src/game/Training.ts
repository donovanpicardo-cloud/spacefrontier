import type { Allocation, Sim } from '../simulation/engine';
export type Point = { x: number; z: number };
export const expeditionSite = 'salvage-near';
export const routePaths: Record<string, Point[]> = {
  short: [{x:-9,z:5},{x:-32,z:24},{x:-55,z:36},{x:-76,z:48}],
  gentle: [{x:-9,z:5},{x:-12,z:9},{x:-15,z:9},{x:-18,z:12},{x:-18,z:24},{x:-24,z:30},{x:-27,z:30},{x:-36,z:39},{x:-45,z:39},{x:-51,z:45},{x:-63,z:45},{x:-66,z:42},{x:-69,z:42},{x:-76,z:48}],
};
export const routeNames = {short:'Ridge crossing',gentle:'Valley detour'};
export type RouteId = keyof typeof routeNames;
// Expedition reserve is a separate training budget, not rover battery telemetry.
export function travelCost(a: Point,b: Point,ground:(x:number,z:number)=>number) {
  return Math.hypot(b.x-a.x,b.z-a.z)*0.12 + Math.abs(ground(b.x,b.z)-ground(a.x,a.z))*0.85;
}
export function routeEstimate(points:Point[],ground:(x:number,z:number)=>number) {
  let distance=0,cost=0,maxSlope=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    let prev=a;
    for(let j=1;j<=n;j++) {
      const next={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};
      const length=Math.hypot(next.x-prev.x,next.z-prev.z);
      distance+=length; cost+=travelCost(prev,next,ground);
      maxSlope=Math.max(maxSlope,Math.atan2(Math.abs(ground(next.x,next.z)-ground(prev.x,prev.z)),length)*180/Math.PI);
      prev=next;
    }
  }
  return {distance:Math.round(distance*2),reserve:Math.max(0,100-cost*2),maxSlope};
}
export type Training = {
  rover?: {route:RouteId; reserve:number; distance:number; last:Point; collected:boolean; returned:boolean; rescue:number};
  garden?: {start:number; battery:number; oxygen:number; water:number; food:number; lit:number; paused:number; recovery:number; harvested:boolean; end?:number; finalBattery?:number; finalOxygen?:number; finalWater?:number; finalFood?:number};
  storm?: {stage:'field'|'choice'|'return'|'finish'|'shelter'|'complete'; warning:number|null; arrival:number|null; choice:'return'|'finish'|null; task:number; supplies:number; battery:number; exposure:number; end?:number; finalBattery?:number; finalExposure?:number; recovery:number};
};
export function startGarden(s:Sim):Sim {
  return {...s,battery:24,crop:25,training:{...s.training,garden:{start:s.time,battery:24,oxygen:s.oxygen,water:s.water,food:s.food,lit:0,paused:0,recovery:0,harvested:false}}};
}
export function trainingTick(s:Sim,a:Allocation):Sim {
  const g=s.training?.garden;
  if (!g || g.end!==undefined) return s;
  const lit=a.greenhouse && s.battery>1 && s.water>0;
  // A local simulated ration window overrides sunlight fluctuations for a readable tradeoff.
  const battery=Math.max(0,Math.min(100,s.battery+(lit?-0.65:0.55)));
  return {...s,battery,crop:Math.min(100,s.crop+(lit?2:0)),training:{...s.training,garden:{...g,lit:g.lit+(lit?1:0),paused:g.paused+(lit?0:1)}}};
}
export function harvest(s:Sim):Sim {
  const g=s.training?.garden;
  if (!g || g.end!==undefined || s.crop<100) return s;
  const food=Math.min(100,s.food+12);
  return {...s,food,training:{...s.training,garden:{...g,harvested:true,end:s.time,finalBattery:s.battery,finalOxygen:s.oxygen,finalWater:s.water,finalFood:food}}};
}
export function validTraining(t:unknown):boolean {
  if (t===undefined) return true;
  if (!t || typeof t!=='object' || Array.isArray(t)) return false;
  const v=t as Training;
  const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  if(v.rover && (!['short','gentle'].includes(v.rover.route)||!finite(v.rover.reserve)||v.rover.reserve>100||!finite(v.rover.distance)||!finite(v.rover.rescue)||!v.rover.last||!Number.isFinite(v.rover.last.x)||!Number.isFinite(v.rover.last.z)||typeof v.rover.collected!=='boolean'||typeof v.rover.returned!=='boolean')) return false;
  if(v.garden && (!['start','battery','oxygen','water','food','lit','paused','recovery'].every(k=>finite(v.garden![k as keyof typeof v.garden]))||typeof v.garden.harvested!=='boolean'||(v.garden.end!==undefined&&!['end','finalBattery','finalOxygen','finalWater','finalFood'].every(k=>finite(v.garden![k as keyof typeof v.garden]))))) return false;
  if(v.storm && (!['field','choice','return','finish','shelter','complete'].includes(v.storm.stage)||![null,'return','finish'].includes(v.storm.choice)||!['task','supplies','battery','exposure','recovery'].every(k=>finite(v.storm![k as keyof typeof v.storm]))||![v.storm.warning,v.storm.arrival].every(x=>x===null||finite(x))||(v.storm.end!==undefined&&!['end','finalBattery','finalExposure'].every(k=>finite(v.storm![k as keyof typeof v.storm]))))) return false;
  return true;
}
