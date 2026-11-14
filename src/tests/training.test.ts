import {describe,it,expect} from 'vitest';
import {terrainHeight} from '../game/environments/Terrain';
import {routePaths,routeEstimate,startGarden,harvest,validTraining} from '../game/Training';
import {initialSim,tick,type Allocation} from '../simulation/engine';
import {parseSave} from '../game/Save';
const ground=(x:number,z:number)=>terrainHeight(x,z,'mars');
const allocation:Allocation={oxygen:true,greenhouse:true,recycler:true,backup:false};
describe('source-backed training',()=>{
 it('offers a longer gentler route with viable reserves on the actual terrain',()=>{
  const short=routeEstimate(routePaths.short,ground),gentle=routeEstimate(routePaths.gentle,ground);
  expect(gentle.maxSlope).toBeLessThan(short.maxSlope);expect(gentle.distance).toBeGreaterThan(short.distance);
  expect(short.reserve).toBeGreaterThan(30);expect(gentle.reserve).toBeGreaterThan(30);
 });
 it('pauses growth, conserves power and continues oxygen, then resumes to harvest once',()=>{
  const initial=startGarden({...initialSim(),irrigation:true,repaired:true});
  let paused=initial,lit=initial;
  for(let i=0;i<15;i++){paused=tick(paused,{...allocation,greenhouse:false},'moon',true);lit=tick(lit,allocation,'moon',true);}
  expect(paused.battery).toBeGreaterThan(lit.battery);expect(paused.crop).toBe(initial.crop);expect(paused.oxygen).toBeGreaterThan(initial.oxygen);
  for(let i=0;i<38;i++) paused=tick(paused,allocation,'moon',true);
  expect(paused.crop).toBe(100);const done=harvest(paused);expect(done.food).toBeGreaterThan(paused.food);expect(harvest(done)).toEqual(done);
 });
 it('round-trips mission progress and rejects malformed training saves',()=>{
  const sim=startGarden({...initialSim(),irrigation:true});
  const save={version:1,destination:'moon',sim,allocation,mission:2,done:[0,1],position:[0,0,-22],inside:true};
  expect(parseSave(JSON.stringify(save))?.sim.training).toEqual(sim.training);
  expect(validTraining({rover:{route:'invented'}})).toBe(false);
  expect(validTraining({garden:{...sim.training!.garden,lit:NaN}})).toBe(false);
 });
 it('activates a warning on time and shields late arrivals without a dead end',()=>{
  let s={...initialSim(),stormSince:30};for(let i=0;i<30;i++)s=tick(s,allocation,'moon',false) as typeof s;
  expect(s.storm).toBe(true);const outside=tick(s,allocation,'moon',false),inside=tick({...s,shielded:true},{...allocation,backup:true,greenhouse:false},'moon',true);
  expect(outside.radiation-s.radiation).toBeGreaterThan(inside.radiation-s.radiation);
 });
});
