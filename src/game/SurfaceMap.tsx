import { useState } from 'react';
import { Droplets,Zap,Wrench,Home,CarFront } from 'lucide-react';
import type { ResourceSite } from './Resources';
import { expeditionSite,routePaths,routeNames,routeEstimate,type RouteId,type Training } from './Training';
export function SurfaceMap(p:{sites:ResourceSite[];collected:Set<string>;player:number[];vehicle:{x:number;z:number};roomBuilt:boolean;onSelect:(s:ResourceSite)=>void;destination:'moon'|'mars';ground:(x:number,z:number)=>number;expedition?:Training['rover'];onRoute:(id:RouteId)=>void}) {
 const [kind,setKind]=useState<ResourceSite['kind']>('salvage');
 const [expanded,setExpanded]=useState(false);
 const [selected,setSelected]=useState<RouteId|null>(p.expedition?.route??null);
 const destination=p.sites.find(s=>s.id===expeditionSite)!;
 const matches=p.sites.filter(s=>!p.collected.has(s.id)&&s.kind===kind&&Math.hypot(s.x-p.player[0],s.z-p.player[2])<160).sort((a,b)=>Math.hypot(a.x-p.player[0],a.z-p.player[2])-Math.hypot(b.x-p.player[0],b.z-p.player[2])).slice(0,6);
 const route=selected?routePaths[selected]:[];
 const estimate=selected?routeEstimate(route,p.ground):null;
 const span=Math.max(105,Math.abs(p.player[0])+15,Math.abs(p.player[2])+15,Math.abs(p.vehicle.x)+15,Math.abs(p.vehicle.z)+15);
 const xy=(x:number,z:number)=>[50+x/span*42,50+z/span*42];
 const point=(x:number,z:number)=>({left:xy(x,z)[0]+'%',top:xy(x,z)[1]+'%'});
 return <>
 <p>{p.destination==='mars'?'Mars supply run · Recover the canyon drone’s spare part, then drive back to the departure point.':'Surface navigation · Your habitat and rover.'}</p>
 <div className="surface-map training-map" aria-label="Surface map, north at the top">
 <div className="map-grid"/><span className="survey-north">N ↑</span>
 <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={route.map(s=>xy(s.x,s.z).join(',')).join(' ')} fill="none" stroke="#72fce8" strokeWidth="0.7"/></svg>
 <span className="survey-base" style={point(0,-22)} title="Habitat"><Home size={16}/></span>
 <span className="survey-rover" style={point(p.vehicle.x,p.vehicle.z)} title="Rover"><CarFront size={16}/></span>
 {p.destination==='mars'&&<span className="survey-site salvage" style={point(destination.x,destination.z)} title="Supply run destination"><Wrench size={16}/></span>}
 {expanded&&matches.filter(s=>s.id!==expeditionSite).map(s=><button key={s.id} className={'survey-site '+s.kind} style={point(s.x,s.z)} title={s.name} aria-label={'Mark trail to '+s.name} onClick={()=>p.onSelect(s)}>{s.kind==='ice'?<Droplets size={14}/>:s.kind==='battery'?<Zap size={14}/>:<Wrench size={14}/>}</button>)}
 <span className="survey-player" style={point(p.player[0],p.player[2])} title="You">▲</span>
 </div>
 <p className="map-legend">▲ You · ⌂ Habitat · ▣ Rover · ⚒ Destination · cyan: selected trail</p>
 {p.destination==='mars'&&<>
 <div className="route-choices">{(['short','gentle'] as const).map(id=><button className={selected===id?'primary':'secondary'} key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}>{routeNames[id]} · {id==='short'?'shorter / rougher':'longer / gentler'}</button>)}</div>
 {estimate&&selected&&<article className="science-note"><h3>{routeNames[selected]}</h3><p>{estimate.distance} m round trip · estimated return reserve {estimate.reserve.toFixed(0)}% · steepest sampled grade {estimate.maxSlope.toFixed(1)}°.</p><p>{selected==='short'?'Terrain warning: steeper rolling ground; brake before a crest.':'Terrain warning: winding contour turns; slow down before steering.'}</p><p>Estimates sample this game’s terrain every metre. Rover wheels follow slopes, and collisions stop motion. Reserve is a separate 100-point training budget; it decreases with distance and vertical travel. Off-trail driving changes the result. Press P below 20% for a recorded emergency refill.</p><button className="primary" disabled={p.collected.has(expeditionSite)||!!p.expedition&&!p.expedition.returned} onClick={()=>p.onRoute(selected)}>Drive this route</button>{p.collected.has(expeditionSite)&&<p>This supply cache was already collected. Start a new Mars mission to replay.</p>}</article>}
 </>}
 <details open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Nearby supplies · optional</summary>
 <label className="survey-filter">Filter <select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="salvage">Parts</option><option value="ice">Water</option><option value="battery">Power</option></select></label>
 <div className="survey-list">{matches.map(s=><button className="secondary" key={s.id} onClick={()=>p.onSelect(s)}>{s.name}<small>{Math.round(Math.hypot(s.x-p.player[0],s.z-p.player[2]))} m · {s.amount} {s.kind==='salvage'?'parts':'%'}</small></button>)}</div>
 </details></>;
}
