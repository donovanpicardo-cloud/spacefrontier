import type { Sim } from '../simulation/engine';
import { routeNames } from './Training';
import { research, radlabSample, romaineStudy } from '../data/science/training';
const link=(url:string,label:string)=><p><a href={url} target="_blank" rel="noreferrer">{label} ↗</a></p>;
export function TrainingDebrief({sim,kind}:{sim:Sim;kind:'rover'|'garden'|'storm'}) {
 const t=sim.training;
 return <article className="science-note">
 {kind==='rover'&&t?.rover&&<><h2>Mars supply run debrief</h2>
 <p>{routeNames[t.rover.route]} · {t.rover.distance.toFixed(0)} m driven · {t.rover.collected?'1 spare part recovered':'No supplies recovered yet'} · {t.rover.reserve.toFixed(1)}% expedition reserve remaining. {t.rover.returned?'Returned to the rover departure point.':'Return still in progress.'}</p>
 <p>Emergency reserve refills: {t.rover.rescue}. Distance and climbing use reserve; detours and rough driving can change the estimate.</p>
 <details><summary>Learn more · Jezero</summary><p>NASA’s proposed Perseverance traverse crosses a delta and climbs Jezero’s 610 m crater rim. Both distance and slope matter when planning a drive. This game uses its own generated terrain and crew rover, not Jezero elevation data or Perseverance performance. Reserve costs are game values: 0.12 points per metre plus 0.85 per metre of vertical travel.</p>
 {link(research.jezero,'NASA/JPL-Caltech · Annotated Jezero route')}{link(research.trek,'NASA Mars Trek')}{link(research.layers,'NASA Trek map layers')}</details></>}
 {kind==='garden'&&t?.garden&&<><h2>Greenhouse ration debrief</h2>
 <p>{t.garden.harvested?'Harvest reached':'Harvest not reached yet'} · lights on {t.garden.lit}s · paused {t.garden.paused}s · emergency packs {t.garden.recovery}.</p>
 <p>Battery {t.garden.battery.toFixed(1)} → {(t.garden.finalBattery??sim.battery).toFixed(1)}%; oxygen {t.garden.oxygen.toFixed(1)} → {(t.garden.finalOxygen??sim.oxygen).toFixed(1)}%; water {t.garden.water.toFixed(1)} → {(t.garden.finalWater??sim.water).toFixed(1)}%; food {t.garden.food.toFixed(1)} → {(t.garden.finalFood??sim.food).toFixed(1)}%.</p>
 <p>Pausing lights slowed the harvest and conserved charge. Oxygen came from powered life support, not from plants growing in darkness. Growth time, shortage load and the 12-point food yield are game values.</p>
 <details><summary>Learn more · Space crops</summary><p>{romaineStudy.accession} studied {romaineStudy.crop} in Veggie on the ISS, compared with ground-grown plants. VEG-01A ran from {romaineStudy.start} to {romaineStudy.harvest}. Water and suitable lighting support growth; fresh produce can supplement stored food.</p><p>Discuss: When would you pause the lights, and what reserve would tell you to restart?</p>
 {link(research.study,'NASA OSD-267 · Red romaine study')}{link(research.bioApi,'NASA Biological Data API')}{link(research.farming,'CSA · Interplanetary Farming')}{link(research.food,'CSA · Space food toolkit')}</details></>}
 {kind==='storm'&&t?.storm&&<><h2>Lunar storm response debrief</h2>
 <p>Warning at mission second {t.storm.warning??'—'}; shelter reached at {t.storm.arrival??'—'}; preparation time {t.storm.arrival!==null&&t.storm.warning!==null?Math.max(0,t.storm.warning+30-t.storm.arrival):'—'}s. Choice: {t.storm.choice==='finish'?'finish the field task':'return immediately'}. Supplies recovered: {t.storm.supplies} spare part.</p>
 <p>Exposure index {t.storm.exposure.toFixed(3)} → {(t.storm.finalExposure??sim.radiation).toFixed(3)}; battery {t.storm.battery.toFixed(1)} → {(t.storm.finalBattery??sim.battery).toFixed(1)}%. Emergency packs: {t.storm.recovery}. Shielding lowers exposure; backup and paused lights protect charge.</p>
 <p>DONKI supplies the historical 10 September 2017 event. The 30-second warning, local exposure index and power effects are simulated. A late return remains recoverable: enter, reinforce, enable backup and pause lights.</p>
 <details><summary>Learn more · Compare a real instrument</summary><p>{radlabSample.spacecraft} / {radlabSample.instrument} · {radlabSample.date} UTC · absorbed dose rate ({radlabSample.units}). This separate 2022 example is not the 2017 event and is not a lunar dose prediction. These measurements have physical units; the game index is unitless. Do not compare their numerical sizes.</p>
 <table><thead><tr><th>UTC</th><th>μGy/hour</th></tr></thead><tbody>{radlabSample.readings.map(([time,value])=><tr key={time}><td>{time}</td><td>{value}</td></tr>)}</tbody></table>
 {link(research.event,'NASA · September 2017 event archive')}{link(research.donki,'NASA · DONKI overview')}{link(research.radlab,'NASA · RadLab overview')}{link(research.radApi,'NASA · RadLab API and units')}{link(radlabSample.query,'NASA · Bundled sample query')}</details></>}
 </article>;
}

