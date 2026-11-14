import { survivorPosition } from "./game/CrashSite";
import { gameAudio } from "./game/GameAudio";
import { ArrivalIntro } from "./game/ArrivalIntro";
import { RocketPanel } from "./game/RocketPanel";
import {
  initialRocket,
  assembleRocket,
  rocketProblem,
  launchProblem,
  rocketPad,
  FLIGHT_DURATION,
  type RocketProgress,
} from "./game/Rocket";
import { SurfaceMap } from "./game/SurfaceMap";
import { expeditionSite, routePaths, routeNames, gardenStartingBattery, gardenStartingCrop, startGarden, harvest, travelCost, type RouteId } from './game/Training';
import { TrainingDebrief } from './game/TrainingDebrief';
import { serviceReward, serviceMessage } from "./simulation/ServiceRewards";
import React, { useEffect, useRef, useState, useReducer } from "react";
import { createRoot } from "react-dom/client";
import {
  CircleHelp,
  ArrowUpRight,
  ArrowRight,
  Orbit,
  Volume2,
  VolumeX,
  Settings2,
  ChevronRight,
  Check,
  Shield,
  Wind,
  Zap,
  Droplets,
  Leaf,
  MapPin,
  X,
  Play,
  Pause,
  Radio,
  Compass,
  Sun,
  MoveUpRight,
} from "lucide-react";
import type { World, WorldState } from "./game/World";
import { stations } from "./game/Stations";
import {
  resourceSites,
  resourceReward,
  hasResourceSpace,
  type ResourceKind,
} from "./game/Resources";
import type { GatherInfo } from "./game/WorldResources";
import {
  initialAdventure,
  collectSample,
  buildProject,
  projectProblem,
  remainingCooldown,
  repairRobot,
  deliverRobot,
  type Adventure,
  type Upgrade,
} from "./game/Adventure";
import { EarthRadio, useEarthRadio } from "./game/EarthRadio";
import { AdventurePanels } from "./game/AdventurePanels";
import type { FieldAction, FieldInfo } from "./game/WorldAdventure";
import "./adventure.css";
import { SimulationClock } from "./game/SimulationClock";
import { warmGraphics } from "./game/GraphicsWarmup";
import {
  initialSim,
  reinforceShelter,
  tick,
  power,
  missions,
  GROW_LIGHT_LOAD,
  SOLAR_DRILL_WARNING,
  STORM_DURATION,
  type Sim,
  type Destination,
  type Allocation,
  type GreenhousePlan,
} from "./simulation/engine";
import { sources, solarArchive, donkiArchive, greenhouseSource } from "./data/science/sources";
import "./styles.css";
import "./play.css";
import "./expedition.css";
import "./field-guide.css";
import "./mission-ui.css";
import type { RepairKind } from "./game/RepairPlan";
import type { RepairInfo } from "./game/WorldRepairs";
import type { VehicleInfo, VehicleSave } from "./game/Vehicle";
import {
  initialTutorial,
  tutorialReducer,
  tutorialSteps,
  tutorialTarget,
  tutorialCanContinue,
  juniorGoal,
  simulationRuns,
  type TutorialEvent,
} from "./game/Tutorial";
import { TutorialOverlay } from "./game/TutorialOverlay";
import { parseSave, readLocal, writeLocal, type Save } from "./game/Save";
type Panel =
  | "destinations"
  | "briefing"
  | "academy"
  | "science"
  | "settings"
  | "dashboard"
  | "greenhouse"
  | "solar-drill"
  | "map"
  | "journal"
  | "outpost"
  | "pause"
  | "repair"
  | "rocket"
  | "homecoming"
  | "debrief"
  | "training-debrief"
  | null;
function App() {
  const [trainingDebrief,setTrainingDebrief]=useState<'rover'|'garden'|'storm'>('garden');
  const mount = useRef<HTMLDivElement>(null),
    world = useRef<World | null>(null);
  const [worldEnabled, setWorldEnabled] = useState(false);
  const [worldModule, setWorldModule] = useState<typeof import("./game/World") | null>(null);
  const [worldLoadError, setWorldLoadError] = useState(false);
  useEffect(() => {
    if (!worldEnabled || worldModule) return;
    let cancelled = false;
    void import("./game/World").then(
      module => { if (!cancelled) setWorldModule(module); },
      () => { if (!cancelled) setWorldLoadError(true); },
    );
    return () => { cancelled = true; };
  }, [worldEnabled, worldModule]);
  const [destination, setDestination] = useState<Destination>("moon"),
    [playing, setPlaying] = useState(false),
    [panel, setPanel] = useState<Panel>(null),
    [sim, setSim] = useState(initialSim),
    [allocation, setAllocation] = useState<Allocation>({
      oxygen: true,
      greenhouse: true,
      recycler: true,
      backup: false,
    }),
    [inside, setInside] = useState(false),
    [near, setNear] = useState<string | null>(null),
    [flashlight, setFlashlight] = useState(false),
    [mission, setMission] = useState(0),
    [done, setDone] = useState<number[]>([]),
    [notification, setNotification] = useState(""),
    [repairing, setRepairing] = useState(false),
    [muted, setMuted] = useState(() => readLocal("frontier-audio-muted") === "true"),
    [sensitivity, setSensitivity] = useState(1),
    [reducedMotion, setReducedMotion] = useState(false),
    [quality, setQuality] = useState("High"),
    [speed, setSpeed] = useState(1),
    [saved, setSaved] = useState(() => !!parseSave(readLocal("frontier-save")));
  const [tutorialActive, setTutorialActive] = useState(false);
  const [volume, setVolume] = useState(() => {
    const stored = readLocal("frontier-audio-volume");
    const value = stored === null ? 0.65 : Number(stored);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.65;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    const stored = readLocal("frontier-music-volume");
    const value = stored === null ? 0.25 : Number(stored);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.25;
  });
  useEffect(() => {
    gameAudio.configure(muted, volume, musicVolume);
    writeLocal("frontier-audio-muted", String(muted));
    writeLocal("frontier-audio-volume", String(volume));
    writeLocal("frontier-music-volume", String(musicVolume));
  }, [muted, volume, musicVolume]);
  useEffect(() => {
    const unlock = () => gameAudio.unlock();
    const interfaceClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("button, select, input[type='checkbox']"))
        gameAudio.cue("click");
    };
    const visibility = () => gameAudio.setHidden(document.hidden);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", interfaceClick, true);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", interfaceClick, true);
      document.removeEventListener("visibilitychange", visibility);
      gameAudio.silence();
    };
  }, []);
  const [tutorial, dispatchTutorial] = useReducer(
    tutorialReducer,
    initialTutorial,
  );
  const [lessonKey, setLessonKey] = useState(0);
  const [strongerHint, setStrongerHint] = useState(false);
  const [narration, setNarration] = useState(false);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [graphicsReady, setGraphicsReady] = useState(false);
  const [distanceToGoal, setDistanceToGoal] = useState(0);
  const [performance, setPerformance] = useState({
    fps: 0,
    calls: 0,
    triangles: 0,
    cpu: 0,
    gpu: null as number | null,
    frameP95: 0,
  });
  const [highlight, setHighlight] = useState("");
  const repairReady = useRef(false);
  const finishRepairRef = useRef<(() => void) | null>(null);
  finishRepairRef.current = repair;
  const [repairInfo, setRepairInfo] = useState<RepairInfo | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const pendingVehicle = useRef<VehicleSave | undefined>(undefined);
  const practiceReturn = useRef<Save | null>(null);
  const practiceReplay = useRef(false);
  const pendingPosition = useRef<number[] | null>(null);
  const guideStep = tutorialSteps[tutorial.index];
  const tutorialLive = useRef({ active: tutorialActive, id: guideStep.id });
  tutorialLive.current = { active: tutorialActive, id: guideStep.id };
  function lessonEvent(e: TutorialEvent) {
    if (tutorialLive.current.active && e.type === tutorialLive.current.id)
      dispatchTutorial(e);
  }
  function highlightTutorialMeter(id: "objective" | "oxygen") {
    setHighlight(id);
    lessonEvent({ type: id });
    window.setTimeout(() => setHighlight(""), 4500);
  }
  function speak(text: string, force = false) {
    if ((!narration && !force) || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = "en-US";
    voice.rate = 0.86;
    window.speechSynthesis.speak(voice);
  }
  const live = useRef({
    playing,
    panel,
    sim,
    allocation,
    inside,
    mission,
    near,
    repairing,
    driving: !!(vehicleInfo?.driving || vehicleInfo?.boarding),
  });
  live.current = {
    playing,
    panel,
    sim,
    allocation,
    inside,
    mission,
    near,
    repairing,
    driving: !!(vehicleInfo?.driving || vehicleInfo?.boarding),
  };
  const list = missions(destination);
  const objective = list[Math.min(mission, 4)];
  const greenhouseDecision = mission === 2 && sim.irrigation && !tutorialActive;
  const garden=sim.training?.garden;
  const expedition=sim.training?.rover;
  const drill=sim.training?.storm;
  useEffect(()=>{if(world.current) world.current.vehicle.expeditionReserve=expedition&&!expedition.returned?expedition.reserve:100;},[expedition?.reserve,expedition?.returned,worldModule]);
  const stormTime = sim.stormSince === null ? null : sim.time - sim.stormSince;
  const radio = useEarthRadio(sim.time, destination);
  const [gatherInfo, setGatherInfo] = useState<GatherInfo | null>(null);
  const [supplyGoal, setSupplyGoal] = useState<string | null>(null);
  const pendingResources = useRef<string[] | undefined>(undefined);
  const [adventure, setAdventure] = useState<Adventure>(initialAdventure);
  const adventureLive = useRef(adventure);
  adventureLive.current = adventure;
  const fieldActionRef = useRef<(action: FieldAction) => void>(() => {});
  fieldActionRef.current = fieldAction;
  const currentRepair = useRef<RepairKind>("solar");
  const scanMarker = useRef<HTMLSpanElement>(null);
  const [fieldInfo, setFieldInfo] = useState<FieldInfo | null>(null),
    [airlockInfo, setAirlockInfo] = useState<FieldInfo | null>(null);
  const [rocket, setRocket] = useState<RocketProgress>(initialRocket);
  const rocketLive = useRef(rocket);
  rocketLive.current = rocket;
  const [inFlight, setInFlight] = useState(false);
  const inFlightLive = useRef(false);
  const [flightCaption, setFlightCaption] = useState("");
  const [sideInstruction, setSideInstruction] = useState<string | null>(null);
  const pause = panel !== null && panel !== "repair";
  function toast(s: string) {
    setNotification(s);
    window.setTimeout(() => setNotification(""), 6000);
  }
  function open(p: Panel) {
    if (inFlightLive.current && p !== null && p !== "pause") return;
    if (rocketLive.current.arrived && playing && p === null) {
      setPanel("homecoming");
      return;
    }
    if (p !== null) world.current?.adventure.cancel();
    if (p !== null) world.current?.resources.cancel();
    setPanel(p);
    if (p !== "repair") world.current?.cancelRepair();
    if (p !== null) world.current?.releaseLook();
    if (p === null && live.current.playing && !tutorialLive.current.active)
      world.current?.lock();
  }
  useEffect(() => {
    if (!mount.current || !worldEnabled || !worldModule) return;
    setGraphicsReady(false);
    setModelStatus("loading");
    const ws: WorldState = {
      onReady: () => setGraphicsReady(true),
      playing: false,
      paused: false,
      inside: false,
      repairing: false,
      flashlight: false,
      sensitivity: 1,
      reducedMotion: false,
      quality: "High",
      power: 74,
      storm: false,
      crop: 25,
      telemetry: { oxygen: 86, water: 82, time: 0, history: [] },
      onNear: setNear,
      onInside: (v) => {
        setInside(v);
        if (!v) setSim((s) => ({ ...s, shielded: false }));
      },
      onMove: () => {},
      onLookReleased: () => {
        if (!world.current?.transit) setRepairing(false);
        setPanel("pause");
      },
      onModel: setModelStatus,
      onRepair: setRepairInfo,
      onRepairComplete: () => {
        gameAudio.cue("success");
        repairReady.current = true;
        finishRepairRef.current?.();
      },
      onVehicle: (info) => {
        setVehicleInfo(info);
        if (info.driving && world.current?.supplyTarget === "rover") {
          world.current.supplyTarget = null;
          setSupplyGoal(null);
          setSideInstruction(null);
        }
      },
      adventure,
      onField: setFieldInfo,
      onScanPosition: position => {
        if (scanMarker.current) scanMarker.current.style.left = position * 100 + "%";
      },
      onFieldAction: (action) => fieldActionRef.current(action),
      onAirlock: setAirlockInfo,
      onAirlockComplete: () => {
        gameAudio.cue("airlock");
        setRepairing(false);
        const a = adventureLive.current;
        commitAdventure({
          ...a,
          cooldowns: { ...a.cooldowns, airlock: live.current.sim.time + 3 },
        });
        toast("Pressure balanced. You can move freely.");
      },
      onGather: setGatherInfo,
      onGatherComplete: (site) => {
        gameAudio.cue("success");
        setSim((s) => resourceReward(s, site));
        setSupplyGoal(null);
        resumeTowGuide();
        toast(
          site.kind === "ice"
            ? `Water collected · up to +${site.amount}%.`
            : site.kind === "battery"
              ? `Power restored · up to +${site.amount}%.`
              : `Salvage recovered · +${site.amount} spare ${site.amount === 1 ? "part" : "parts"}.`,
        );
      },
    };
    world.current = new worldModule.World(mount.current, destination, ws);
    world.current.state.onModel = setModelStatus;
    if (pendingPosition.current) {
      world.current.resetPlayer(pendingPosition.current);
      world.current.restoreVehicle(pendingVehicle.current);
      world.current.restoreResources(pendingResources.current);
      pendingResources.current = undefined;
      pendingVehicle.current = undefined;
      pendingPosition.current = null;
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, [destination, worldEnabled, worldModule]);
  useEffect(() => {
    if (world.current)
      Object.assign(world.current.state, {
        rocketStage: rocket.stage,
        playing,
        paused: pause,
        inside,
        repairing,
        flashlight,
        sensitivity,
        reducedMotion,
        quality,
        power: sim.battery,
        storm: sim.storm,
        crop: sim.crop,
        telemetry: {
          oxygen: sim.oxygen,
          suitAir: sim.suit,
          water: sim.water,
          time: sim.time,
          history: sim.history,
        },
        tutorial: tutorialActive,
        guideTarget: tutorialActive
          ? tutorialTarget(guideStep.id)
          : null,
        onAction: lessonEvent,
        restored: {
          solar: sim.repaired,
          greenhouse: sim.irrigation,
          life: done.includes(3),
        },
        adventure,
        onModel: setModelStatus,
      });
  }, [
    rocket,
    adventure,
    playing,
    pause,
    inside,
    repairing,
    flashlight,
    sensitivity,
    reducedMotion,
    quality,
    sim,
    tutorialActive,
    tutorial.index,
    destination,
    mission,
    done,
    worldModule,
  ]);
  useEffect(() => {
    if (world.current) {
      world.current.state.quality = quality;
      world.current.appliedQuality = "";
      world.current.applyQuality();
    }
  }, [quality, destination]);
  useEffect(() => {
    const clock = new SimulationClock();
    let observedWorld = world.current;
    clock.reset(observedWorld?.simulationSeconds ?? 0);
    const id = setInterval(() => {
      const v = live.current;
      const w = world.current;
      if (w !== observedWorld) {
        clock.reset(w?.simulationSeconds ?? 0);
        observedWorld = w;
      }
      const ticks = clock.poll(w?.simulationSeconds ?? 0,
        !inFlightLive.current &&
        !rocketLive.current.arrived &&
        simulationRuns(v.playing, v.panel, tutorialLive.current.active,
          !!w && !w.warming), speed);
      if (ticks)
        setSim((s) => {
          for (let i = 0; i < ticks; i++) s = tick(
            s,
            v.allocation,
            destination,
            v.inside || (v.driving && destination === "mars"),
            adventureLive.current.upgrades,
            world.current?.inRecoveryRoom() ?? false,
          );
          return s;
        });
    }, 100);
    return () => clearInterval(id);
  }, [destination, speed]);
  useEffect(() => {
    if (tutorialActive && tutorialCanContinue(guideStep.id))
      world.current?.releaseLook();
  }, [tutorialActive, guideStep.id, worldModule]);
  useEffect(() => {
    if (sim.health <= 0 && playing) {
      setRepairing(false);
      open("debrief");
    }
  }, [sim.health]);
  useEffect(() => {
    if (inside && mission === 0 && playing && !tutorialActive) complete(0);
  }, [inside, tutorialActive, mission, playing]);
  useEffect(() => {
    if (
      mission === 4 &&
      !tutorialActive &&
      near === "shelter" &&
      inside &&
      allocation.backup &&
      !allocation.greenhouse &&
      sim.shielded &&
      playing &&
      stormTime !== null &&
      stormTime >= STORM_DURATION
    )
      complete(4);
  }, [
    near,
    inside,
    allocation,
    sim.shielded,
    mission,
    stormTime,
    tutorialActive,
  ]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || !live.current.playing) return;
      const v = live.current;
      if (rocketLive.current.arrived) return;
      if (inFlightLive.current) {
        if (e.code === "Escape") {
          e.preventDefault();
          open(v.panel ? null : "pause");
        }
        return;
      }
      if (
        tutorialLive.current.active &&
        ["Tab", "KeyM", "KeyJ"].includes(e.code)
      ) {
        e.preventDefault();
        return;
      }
      if (e.code === "KeyK" && tutorialLive.current.active) {
        endTutorial(false);
        return;
      }
      if (e.code === "Enter" && tutorialLive.current.active && !v.panel) {
        const step = tutorialLive.current.id;
        if (tutorialCanContinue(step)) {
          e.preventDefault();
          if (step === "finish") endTutorial(true);
          else if (step === "help") help();
          else if (step === "objective" || step === "oxygen") highlightTutorialMeter(step);
          return;
        }
      }
      if (e.code === "KeyQ") world.current?.resources.cancel();
      if(!v.panel&&!tutorialLive.current.active) {
        if(e.code==='KeyL'&&(v.sim.training?.garden||v.sim.training?.storm)) {setAllocation(a=>({...a,oxygen:true,greenhouse:!a.greenhouse}));return;}
        if(e.code==='KeyB'&&v.sim.training?.storm) {setAllocation(a=>({...a,backup:true}));return;}
        if(e.code==='KeyP'&&v.sim.training) {emergencyPack();return;}
        if(e.code==='KeyC'&&v.sim.training?.storm?.stage==='finish') {stormChoice('return');return;}
      }
      if (e.code === "Escape") {
        if (
          world.current &&
          window.performance.now() - world.current.unlockedAt < 150
        ) {
          setPanel("pause");
          return;
        }
        if (!world.current?.transit) setRepairing(false);
        open(v.panel ? null : "pause");
      }
      if (e.code === "Tab" && world.current?.adventure.hold) return;
      if (e.code === "Tab" && v.panel) return;
      if (e.code === "Tab") {
        e.preventDefault();
        open(v.panel === "dashboard" ? null : "dashboard");
      }
      if (e.code === "KeyM") open(v.panel === "map" ? null : "map");
      if (e.code === "KeyJ") open(v.panel === "journal" ? null : "journal");
      if (e.code === "KeyU" && !tutorialLive.current.active)
        open(v.panel === "outpost" ? null : "outpost");
      if (e.code === "KeyF") setFlashlight((f) => !f);
      if (e.code === "KeyH") help();
      if (e.code === "KeyG" && !v.panel && !tutorialLive.current.active)
        findSupplies();
      if (world.current?.adventure.hold && e.code === "KeyE") {
        world.current.adventure.capturePulse();
        return;
      }
      if (e.code === "KeyE" && !v.panel && v.near) interact(v.near);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [playing, muted, tutorialActive, tutorial.index, mission, narration]);
  function complete(n: number) {
    if (tutorialLive.current.active) return;
    if (done.includes(n)) return;
    gameAudio.cue("success");
    setDone((d) => (d.includes(n) ? d : [...d, n]));
    toast(
      [
        "Welcome to your space home!",
        "Solar power restored!",
        "Greenhouse power plan set.",
        "Fresh air restored!",
        "Mission complete. Great work!",
      ][n],
    );
    if (n === 4) {
      setSim((s) => ({ ...s, storm: false,training:s.training?.storm?{...s.training,storm:{...s.training.storm,stage:'complete',end:s.time,finalBattery:s.battery,finalExposure:s.radiation}}:s.training }));
      world.current?.setTrainingTrail([]);
      setTimeout(() => open("debrief"), 900);
    } else {
      setMission(n + 1);
      if (n === 3) {
        if(destination==='moon') {
          setSim(s=>({...s,training:{...s.training,storm:{stage:'field',warning:null,arrival:null,choice:null,task:0,supplies:0,battery:s.battery,exposure:s.radiation,recovery:0}}}));
          open(null);
          world.current?.guideAdventure('solar');
          return;
        }
        setSim((s) => ({
          ...s,
          storm: destination === "mars",
          stormSince: s.time,
        }));

      }
    }
  }
  function chooseGreenhousePlan(plan: GreenhousePlan) {
    if (!greenhouseDecision || done.includes(2)) return;
    setSim((s) => ({ ...(s.training?.garden?s:startGarden(s)), greenhousePlan: plan }));
    setAllocation((a) => ({ ...a, oxygen: true, greenhouse: plan === "grow" }));
    open(null);
  }
  function finishHarvest() {
    if(!live.current.sim.training?.garden || live.current.sim.crop<100) return;
    setSim(harvest); complete(2); setTrainingDebrief('garden'); open('training-debrief');
  }
  function emergencyPack() {
    const {garden,storm,rover}=live.current.sim.training??{};
    if (!(garden&&garden.end===undefined) && !(storm&&storm.stage!=='complete') && !(rover&&!rover.returned&&rover.reserve<20)) return;
    setSim(s=>{
      const g=s.training?.garden,d=s.training?.storm,r=s.training?.rover;
      if(g&&g.end===undefined) return {...s,battery:Math.min(100,s.battery+12),water:Math.max(20,s.water),training:{...s.training,garden:{...g,recovery:g.recovery+1}}};
      if(d&&d.stage!=='complete') return {...s,battery:Math.max(16,s.battery),parts:Math.max(2,s.parts),training:{...s.training,storm:{...d,recovery:d.recovery+1}}};
      if(r&&!r.returned&&r.reserve<20) return {...s,training:{...s.training,rover:{...r,reserve:Math.min(100,r.reserve+30),rescue:r.rescue+1}}};
      return s;
    });
    toast('Training emergency pack used; recorded in your debrief.');
  }
  function selectRoute(route:RouteId) {
    const w=world.current;
    if(!w || w.resources.gather.collected.has(expeditionSite) || live.current.sim.training?.rover) return;
    setSim(s=>({...s,training:{...s.training,rover:{route,reserve:100,distance:0,last:{x:w.vehicle.state.x,z:w.vehicle.state.z},collected:false,returned:false,rescue:0}}}));
    findSupplies('salvage',expeditionSite);
  }
  function stormChoice(choice:'return'|'finish') {
    setSim(s=>{
      const storm=s.training?.storm;
      if(!storm) return s;
      const firstChoice=storm.stage==='choice';
      return {
        ...s,
        stormSince:firstChoice?s.time+SOLAR_DRILL_WARNING:s.stormSince,
        training:{...s.training,storm:{
          ...storm,
          warning:firstChoice?s.time:storm.warning,
          battery:firstChoice?s.battery:storm.battery,
          exposure:firstChoice?s.radiation:storm.exposure,
          choice:firstChoice?choice:storm.choice,
          stage:choice,
        }},
      };
    });
    world.current?.guideAdventure(choice==='return'?'shelter':'solar');
    setSupplyGoal(null); open(null);
  }
  useEffect(()=>{
    const w=world.current;
    if(!w||!playing||tutorialActive) return;
    const r=sim.training?.rover,d=sim.training?.storm;
    if(r&&!r.returned) {
      const now={x:w.vehicle.state.x,z:w.vehicle.state.z};
      const collected=w.resources.gather.collected.has(expeditionSite);
      const returned=collected&&Math.hypot(now.x+9,now.z-5)<7;
      setSim(s=>{
        const rover=s.training?.rover;
        if(!rover||rover.returned) return s;
        const distance=Math.hypot(now.x-rover.last.x,now.z-rover.last.z);
        if(!distance&&collected===rover.collected&&!returned) return s;
        const reserve=Math.max(0,rover.reserve-travelCost(rover.last,now,(x,z)=>w.groundHeight(x,z)));
        return {...s,training:{...s.training,rover:{...rover,last:now,distance:rover.distance+distance,reserve,collected,returned}}};
      });
      w.setTrainingTrail(routePaths[r.route]);
      if(returned){w.setTrainingTrail([]);setSupplyGoal(null);setTrainingDebrief('rover');open('training-debrief');}
    } else if(d&&d.warning!==null&&d.stage!=='complete') {
      const p=w.getPosition();
      const target=inside?{x:0,z:-31}:{x:0,z:-8};
      w.setTrainingTrail([{x:p[0],z:p[2]},target]);
      if(d.stage==='finish'&&near==='solar'&&w.keys.has('KeyE')) {
        const task=d.task+1,finished=task>=10;
        setSim(s=>({...s,parts:Math.min(20,s.parts+(finished?1:0)),training:{...s.training,storm:{...d,task,stage:finished?'return':'finish',supplies:finished?1:0}}}));
        if(finished) {toast('Field task finished · 1 spare part. Return to shelter.');w.guideAdventure('shelter');}
      }
      if(inside&&near==='shelter'&&d.arrival===null) setSim(s=>{
        const storm=s.training?.storm;
        if(!storm||storm.arrival!==null) return s;
        return {...s,training:{...s.training,storm:{...storm,arrival:s.time,stage:storm.stage==='complete'?'complete':'shelter'}}};
      });
    } else w.setTrainingTrail([]);
  },[sim.time,playing,tutorialActive]);
  const trainingInstruction = garden&&garden.end===undefined
    ? sim.crop>=100?'Press E at the greenhouse to harvest.':`Press L to ${allocation.greenhouse?'pause':'restart'} grow lights. Battery ${sim.battery.toFixed(1)}% · oxygen ${sim.oxygen.toFixed(1)}% · crop ${sim.crop.toFixed(0)}%.${sim.battery<8?' Press P for an emergency pack.':''}`
    : drill&&drill.stage!=='complete'
      ? drill.stage==='field'||drill.stage==='choice'?'Press E at the outdoor solar panel to open the storm drill.'
        : drill.stage==='finish'?`Hold E at the solar panel to finish the check · ${10-drill.task}s left. Or press C to abandon and return.`
        : !inside?'Follow the cyan trail to the airlock. Press E to enter.'
        : near!=='shelter'?'Walk down the centre aisle to the shelter.'
        : !sim.shielded?'Press E to reinforce the shelter. Low supplies? Press P.'
        : !allocation.backup?'Press B to switch on backup power.'
        : allocation.greenhouse?'Press L to pause grow lights.'
        : 'Shelter ready. Stay here until the active storm ends.'
      : expedition&&!expedition.returned
        ? !vehicleInfo?.driving?`${expedition.collected?'Press E beside the rover to board and drive back to the departure point.':'Press E beside the rover to board, or at the marked site to recover supplies.'} Reserve ${expedition.reserve.toFixed(0)}%.`
          : `Drive with WASD along the cyan trail ${expedition.collected?'back to the departure point':'to the supply site'}. Space: brake. E: exit. Reserve ${expedition.reserve.toFixed(0)}%.${expedition.reserve<20?' P: emergency reserve.':''}`
        : null;
  function interact(id: string) {
    if(!tutorialLive.current.active&&mission===4&&destination==='moon'&&id==='solar'&&live.current.sim.training?.storm&&live.current.sim.training.storm.stage!=='complete') {
      const d=live.current.sim.training.storm;
      if(d.stage==='field'||d.stage==='choice') {
        if(d.stage==='field') setSim(s=>({...s,training:{...s.training,storm:{...d,stage:'choice'}}}));
        open('solar-drill');
      }
      return;
    }
    if(id==='greenhouse'&&live.current.sim.training?.garden?.end===undefined&&live.current.sim.crop>=100&&live.current.sim.training?.garden) {finishHarvest();return;}
    if (tutorialLive.current.active) {
      const step = tutorialLive.current.id;
      if (
        !(step === "airlock" && id === "airlock") &&
        !(step === "repair" && id === "solar")
      ) {
        toast(
          "Let’s finish this practice step first. Press Help me for a hint.",
        );
        return;
      }
    }
    const cooldown = remainingCooldown(
      adventureLive.current,
      id,
      live.current.sim.time,
    );
    if (cooldown > 0 && !tutorialLive.current.active) {
      toast(`System settling. Ready again in ${cooldown} seconds.`);
      return;
    }
    if (id === "recovery-room-project") {
      open("outpost");
      return;
    }
    if (id === "medbay") {
      toast(
        "Stay in the recovery room to recover health and suit air. Treatment uses a little food and power.",
      );
      return;
    }
    if (id === "rocket") {
      open("rocket");
      return;
    }
    if (id === "fabricator") {
      open("outpost");
      return;
    }
    if (
      id.startsWith("sample:") ||
      id.startsWith("robot:") ||
      id.startsWith("hitch:")
    ) {
      const w = world.current,
        a = adventureLive.current;
      if (!w) return;
      const robot = id.startsWith("robot:") || id.startsWith("hitch:"),
        target = id.slice(id.indexOf(":") + 1);
      if (robot && a.readyRobots.includes(target)) {
        const r = w.adventure.robotModels.get(target);
        if (
          !r ||
          a.towing ||
          Math.hypot(
            r.position.x - w.vehicle.state.x,
            r.position.z - w.vehicle.state.z,
          ) > 4.5 ||
          Math.abs(w.vehicle.state.speed) > 0.4
        ) {
          toast(
            "Park the buggy close to this robot, then press E to hitch it.",
          );
          return;
        }
        commitAdventure({ ...a, towing: target });
        guideSide(
          "recovery",
          "Robot recovery pad",
          "Robot in tow. Drive gently to the blue pad and brake to deliver.",
        );
        toast(
          w.vehicle.driving
            ? "Tow cable attached. Drive to the recovery pad."
            : "Tow cable attached. Climb into your buggy and head home.",
        );
        return;
      }
      if (
        robot &&
        (live.current.sim.parts < 1 || live.current.sim.battery < 8)
      ) {
        toast(
          "Robot repair needs 1 spare part and 8% power. Find supplies on the map.",
        );
        return;
      }
      if (!robot && a.samples.includes(target)) {
        toast("This sample is already in your journal.");
        return;
      }
      w.releaseLook();
      w.adventure.start(robot ? "robot" : "sample", target);
      return;
    }
    if (id === "vehicle") {
      world.current?.toggleVehicle();
      return;
    }
    if (id.startsWith("resource:")) {
      const site = resourceSites(destination).find((s) => s.id === id.slice(9));
      if (!site) return;
      if (!hasResourceSpace(live.current.sim, site.kind, site.amount)) {
        toast(
          "This whole cache won’t fit yet. Use some supplies, then come back; nothing here is wasted.",
        );
        return;
      }
      world.current?.beginGather(site.id);
      return;
    }
    if (id === "airlock") {
      if (!world.current?.cycleAirlock()) {
        toast("Finish the current movement before cycling the airlock.");
        return;
      }
      toast("AIRLOCK · Suit verified. Pressure cycle in progress…");
      setRepairing(true);
    } else if (id === "greenhouse" && greenhouseDecision) {
      open("greenhouse");
    } else if (id === "shelter") {
      if (live.current.sim.shielded) {
        toast("Shelter protection is active. Stay here while the emergency passes.");
        return;
      }
      if (live.current.sim.parts < 1 || live.current.sim.battery < 6) {
        toast(
          "Reinforce shelter: 1 spare part and 6% power. Find supplies on the map.",
        );
        return;
      }
      setSim((s) => reinforceShelter(s) ?? s);

      toast(
        "Shelter reinforced · 1 part + 6% power used. Shielding reduces exposure.",
      );
    } else {
      if (!tutorialLive.current.active && live.current.sim.parts < 1) {
        toast(
          "No spare parts remain. Try a checkpoint or start a new mission.",
        );
        return;
      }
      repairReady.current = false;
      currentRepair.current = id as RepairKind;
      if (world.current?.beginRepair(id as RepairKind)) {
        open("repair");
        setRepairing(true);
      }
    }
  }
  function repair() {
    const id = currentRepair.current;
    if (!repairReady.current) return;
    repairReady.current = false;

    if (tutorialLive.current.active) {
      setRepairing(false);
      open(null);
      lessonEvent({ type: "repair" });
      toast(
        "Great job! The solar panel is working. Now let’s visit your space home.",
      );
      return;
    }
    const message = serviceMessage(
      live.current.sim,
      serviceReward(live.current.sim, id),
      id,
    );
    setSim((s) => serviceReward(s, id));
    setRepairing(false);
    const a = adventureLive.current;
    commitAdventure({
      ...a,
      cooldowns: { ...a.cooldowns, [id]: live.current.sim.time + 45 },
    });
    if (id === "greenhouse" && mission === 2) open("greenhouse");
    else if (id !== "life" || mission !== 3 || destination === "mars") open(null);
    if (id === "solar" && mission === 1) complete(1);
    if (id === "life" && mission === 3) complete(3);

    toast(message);
  }
  function beginMission(atWreck = false) {
    rocketLive.current = initialRocket();
    setRocket(rocketLive.current);
    inFlightLive.current = false;
    setInFlight(false);
    radio.reset();
    commitAdventure(initialAdventure());
    setLessonKey((k) => k + 1);
    setSideInstruction(null);
    setSupplyGoal(null);
    setSim(initialSim());
    setAllocation({
      oxygen: true,
      greenhouse: true,
      recycler: true,
      backup: false,
    });
    setMission(0);
    setDone([]);
    setInside(false);
    setPlaying(true);
    setPanel(null);
    setRepairing(false);
    setFlashlight(false);
    world.current?.resetPlayer(atWreck ? survivorPosition : undefined);
    world.current?.lock();
    toast(
      "WASD to move. Click the terrain for mouse look. Escape pauses.",
    );
  }
  function start() {
    if (world.current?.warming || modelStatus === "loading") {
      toast(
        "Getting the detailed graphics ready. Please try again in a moment.",
      );
      return;
    }
    beginMission();
  }
  function snapshot(): Save {
    return {
      version: 1,
      destination,
      sim,
      allocation,
      mission,
      done,
      position: world.current?.getPosition() || [0, 0.12, 4],
      inside,
      vehicle: world.current?.getVehicleState(),
      collectedResources: world.current?.getResourceSave(),
      adventure: adventureLive.current,
      rocket: rocketLive.current,
      radio: { sent: radio.sent, used: radio.used },
    };
  }
  function restore(v: Save) {
    setWorldEnabled(true);
    inFlightLive.current = false;
    setInFlight(false);
    rocketLive.current = v.rocket || initialRocket();
    setRocket(rocketLive.current);
    radio.restore(v.radio);
    commitAdventure(v.adventure || initialAdventure());
    setFieldInfo(null);
    setAirlockInfo(null);
    setSideInstruction(null);
    setSupplyGoal(null);
    if (destination !== v.destination || !world.current) {
      pendingPosition.current = v.position;
      pendingVehicle.current = v.vehicle;
      pendingResources.current = v.collectedResources;
    } else {
      world.current?.resetPlayer(v.position);
      world.current?.restoreVehicle(v.vehicle);
      world.current?.restoreResources(v.collectedResources);
    }
    setDestination(v.destination);
    setSim(v.sim);
    setAllocation(v.allocation);
    setMission(v.mission);
    setDone(v.done);
    setInside(v.inside);
    setRepairing(false);
    setPanel(
      v.rocket?.arrived
        ? "homecoming"
        : v.done.includes(4)
          ? "debrief"
          : v.sim.training?.storm?.stage === 'choice'
            ? "solar-drill"
          : v.mission === 2 && v.sim.irrigation && !v.sim.training?.garden
            ? "greenhouse"
            : null,
    );
    setPlaying(true);
    if (v.adventure?.towing) {
      setSupplyGoal("Robot recovery pad");
      setSideInstruction(
        "Robot in tow. Drive gently to the blue pad and brake to deliver.",
      );
      if (destination === v.destination)
        world.current?.guideAdventure("recovery");
    }
  }
  function beginTutorial(replay: boolean) {
    practiceReturn.current = replay && playing ? snapshot() : null;
    commitAdventure(initialAdventure());
    practiceReplay.current = replay;
    tutorialLive.current.active = false;
    dispatchTutorial({ type: "reset-session" });
    setLessonKey((k) => k + 1);
    setSim(initialSim());
    setMission(0);
    setDone([]);
    setInside(false);
    setRepairing(false);
    setPanel(null);
    setPlaying(true);
    tutorialLive.current.active = true;
    tutorialLive.current.id = "move";
    setTutorialActive(true);
    setStrongerHint(false);
    world.current?.resetPlayer([6, 0.12, 0]);
    world.current?.releaseLook();
    toast("Welcome, explorer! Let’s learn together. Your supplies are safe.");
  }
  function endTutorial(completed: boolean) {
    if (completed) writeLocal("frontier-tutorial-complete", "1");
    tutorialLive.current.active = false;
    setTutorialActive(false);
    setRepairing(false);
    setPanel(null);
    window.speechSynthesis?.cancel();
    if (practiceReturn.current) {
      restore(practiceReturn.current);
      practiceReturn.current = null;
      toast("Lesson finished. Your mission is right where you left it.");
    } else if (practiceReplay.current) {
      setPlaying(false);
      setInside(false);
      setSim(initialSim());
      world.current?.resetPlayer();
    } else {
      beginMission();
      toast(
        completed
          ? "You earned your Explorer patch! Head to begin."
          : "Ready when you are! Help me is always here.",
      );
    }
  }
  function help() {
    setSideInstruction(null);
    setSupplyGoal(null);
    if (world.current) world.current.supplyTarget = null;
    const text = tutorialActive
      ? guideStep.hint
      : greenhouseDecision
        ? "Choose a power plan at the greenhouse, or open Systems with Tab."
        : juniorGoal(mission, destination);
    setStrongerHint(true);
    toast(text);
    speak(text);
    world.current?.focusGuide();
    lessonEvent({ type: "help" });
  }
  function findSupplies(kind?: ResourceKind, exactId?: string) {
    setSideInstruction(null);
    if (tutorialLive.current.active) return;
    const s = live.current.sim;
    const choice =
      kind ||
      (s.parts < 2 ? "salvage" : s.water < s.battery ? "ice" : "battery");
    const site = world.current?.findSupply(choice, exactId);
    if (!site) {
      toast("Those supply sites are empty. Try another type on the map.");
      return;
    }
    setSupplyGoal(site.name);
    open(null);
    toast(
      `${site.name}: locate the site and follow the equipment’s own instructions. H returns to your mission.`,
    );
  }
  useEffect(() => {
    if (!tutorialActive) return;
    setStrongerHint(false);
    speak(guideStep.text);
    const hint = window.setTimeout(() => setStrongerHint(true), 18000);
    return () => {
      clearTimeout(hint);
      window.speechSynthesis?.cancel();
    };
  }, [tutorialActive, tutorial.index, lessonKey, narration]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const w = world.current;
      const timing = w?.diagnostics.active
        ? w.diagnostics.snapshot()
        : w?.diagnostics.lastGameplay;
      if (w)
        setPerformance({
          fps: timing?.fps || w.fps,
          cpu: timing?.cpuMs || 0,
          gpu: timing?.gpuMs ?? null,
          frameP95: timing?.frameP95 || 0,
          calls: w.renderer.info.render.calls,
          triangles: w.renderer.info.render.triangles,
        });
      const target = w
        ?.navigationSites()
        .find((s) => s.id === (w?.supplyTarget || w?.state.guideTarget));
      if (w && target) {
        const p = w.getPosition();
        setDistanceToGoal(
          Math.round(Math.hypot(w.guidePoint.x - p[0], w.guidePoint.z - p[2])),
        );
      }
    }, 500);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (!playing || tutorialActive || done.includes(4)) return;
    const checkpoint = snapshot();
    const key = window.setTimeout(() => {
      if (writeLocal("frontier-save", JSON.stringify(checkpoint)))
        setSaved(true);
    }, 600);
    return () => clearTimeout(key);
  }, [mission, playing, tutorialActive]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  useEffect(() => {
    if (!playing || tutorialActive) return;
    const id = window.setInterval(() => {
      if (writeLocal("frontier-save", JSON.stringify(latestSnapshot.current())))
        setSaved(true);
    }, 30000);
    return () => clearInterval(id);
  }, [playing, tutorialActive]);
  useEffect(() => {
    const persist = () => {
      if (live.current.playing && !tutorialLive.current.active)
        writeLocal("frontier-save", JSON.stringify(latestSnapshot.current()));
    };
    const hide = () => {
      if (document.hidden) persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  function save() {
    if (tutorialLive.current.active) {
      toast(
        "Practice is safe. Your real mission save stays where you left it.",
      );
      return;
    }
    try {
      localStorage.setItem("frontier-save", JSON.stringify(snapshot()));
      setSaved(true);
      toast("Mission saved locally.");
    } catch {
      toast("Unable to save: browser storage unavailable.");
    }
  }
  function load() {
    if (world.current?.warming) {
      toast("Preparing your graphics. Please try again in a moment.");
      return;
    }
    try {
      const v = parseSave(readLocal("frontier-save"));
      if (
        !v ||
        v.version !== 1 ||
        !["moon", "mars"].includes(v.destination) ||
        !Number.isFinite(v.sim?.time) ||
        !Array.isArray(v.position)
      )
        throw Error();
      restore(v);
    } catch {
      toast("Save could not be read. Start a new mission.");
    }
  }
  const metrics = [
    { name: "Oxygen", value: sim.oxygen, unit: "%", icon: Wind },
    { name: "Battery", value: sim.battery, unit: "%", icon: Zap },
    { name: "Water", value: sim.water, unit: "%", icon: Droplets },
    { name: "Food", value: sim.food, unit: "%", icon: Leaf },
  ];
  function commitAdventure(next: Adventure) {
    adventureLive.current = next;
    setAdventure(next);
    const w = world.current;
    if (w) {
      w.state.adventure = next;
      w.recoveryRoom.sync(next.upgrades.includes("medbay"));
      w.adventure.sync(next, w.vehicle, 0);
    }
  }
  function guideSide(id: string, name: string, text: string) {
    if (!world.current?.guideAdventure(id)) return;
    setSupplyGoal(name);
    setSideInstruction(text);
    open(null);
    toast(text);
  }
  function fieldAction(action: FieldAction) {
    gameAudio.cue("click");
    const a = adventureLive.current,
      w = world.current;
    if (action.type === "sample") {
      if (a.samples.includes(action.id)) return;
      commitAdventure(collectSample(a, action.id));
      setSupplyGoal(null);
      setSideInstruction(null);
      toast(
        "Sample sealed · +1 research. Open J to see your discoveries and badges.",
      );
    } else if (action.type === "robot") {
      const result = repairRobot(a, live.current.sim, action.id);
      if (!result) {
        toast("You need 1 part and 8% power to finish this repair.");
        return;
      }
      live.current.sim = result.sim;
      setSim(result.sim);
      commitAdventure(result.adventure);
      setSideInstruction(
        "Robot ready! Bring your buggy close and press E to attach the cable.",
      );
      toast(
        "Robot track repaired. Bring your buggy within a few steps to hitch it.",
      );
    } else {
      const result = deliverRobot(a, live.current.sim, action.id);
      if (!result) return;
      live.current.sim = result.sim;
      setSim(result.sim);
      commitAdventure(result.adventure);
      setSupplyGoal(null);
      setSideInstruction(null);
      if (w) w.supplyTarget = null;
      toast(
        "Robot home safely! +3 spare parts and +10% power. Check your rescue patch in J.",
      );
    }
    resumeTowGuide();
    if (w && !w.vehicle.driving && !w.vehicle.transition) {
      w.player.root.position.copy(
        w.physics.safeFoot(
          w.player.root.position,
          (x, z) => w.groundHeight(x, z),
          [...w.vehicle.bounds(), ...w.adventure.bounds()],
        ),
      );
      w.keys.clear();
    }
  }
  function resumeTowGuide() {
    if (!adventureLive.current.towing) return;
    world.current?.guideAdventure("recovery");
    setSupplyGoal("Robot recovery pad");
    setSideInstruction(
      "Robot in tow. Drive gently to the blue pad and brake to deliver.",
    );
  }
  function buildOutpost(id: Upgrade) {
    if (live.current.near !== "fabricator" || !live.current.inside) {
      toast("Build projects at the fabricator inside your base.");
      return;
    }
    const result = buildProject(adventureLive.current, live.current.sim, id);
    if (!result) {
      toast(
        projectProblem(adventureLive.current, live.current.sim, id) ||
          "Project unavailable.",
      );
      return;
    }
    live.current.sim = result.sim;
    setSim(result.sim);
    commitAdventure(result.adventure);
    toast(
      "Construction complete. Your new module is visible and operating outside.",
    );
    if (id === "medbay")
      guideSide(
        "medbay",
        "Crew recovery room",
        "Your recovery room is ready. Head through the east doorway to rest inside.",
      );
  }
  function buildReturnRocket() {
    if (
      tutorialLive.current.active ||
      live.current.near !== "fabricator" ||
      !live.current.inside
    )
      return;
    const result = assembleRocket(
      rocketLive.current,
      live.current.sim,
      adventureLive.current.research,
    );
    if (!result) {
      toast(
        rocketProblem(
          rocketLive.current,
          live.current.sim,
          adventureLive.current.research,
        ) || "Cannot build yet",
      );
      return;
    }
    rocketLive.current = result.rocket;
    setRocket(result.rocket);
    live.current.sim = result.sim;
    setSim(result.sim);
    commitAdventure({ ...adventureLive.current, research: result.research });
    world.current?.rocket.sync(result.rocket.stage);
    writeLocal(
      "frontier-save",
      JSON.stringify({ ...snapshot(), sim: result.sim, rocket: result.rocket }),
    );
    setSaved(true);
    toast(
      result.rocket.stage === 3
        ? "Rocket ready! Finish your missions, then board at the launch pad."
        : "Rocket section built! See it taking shape at the launch pad.",
    );
  }
  function launchReturnRocket() {
    const w = world.current;
    if (
      !w ||
      inFlightLive.current ||
      tutorialLive.current.active ||
      live.current.near !== "rocket"
    )
      return;
    const problem = launchProblem(
      rocketLive.current,
      done,
      live.current.inside,
      live.current.driving,
    );
    if (problem) {
      toast(problem);
      return;
    }
    writeLocal("frontier-save", JSON.stringify(snapshot()));
    setSaved(true);
    w.resources.cancel();
    w.adventure.cancel();
    w.cancelRepair();
    w.keys.clear();
    w.releaseLook();
    w.rocket.sync(3);
    if (
      !w.rocket.start(() => {
        rocketLive.current = { stage: 3, arrived: true };
        setRocket(rocketLive.current);
        inFlightLive.current = false;
        setInFlight(false);
        writeLocal(
          "frontier-save",
          JSON.stringify({
            ...latestSnapshot.current(),
            rocket: rocketLive.current,
          }),
        );
        setPanel("homecoming");
      })
    )
      return;
    if (w.rocket.flight)
      void warmGraphics(w.renderer, w.rocket.flight.space, w.camera,
        () => w.disposed || !w.rocket.flight);
    inFlightLive.current = true;
    setInFlight(true);
    setNotification("");
    setPanel(null);
  }
  useEffect(() => {
    if (!inFlight) return;
    const timer = window.setInterval(() => {
      const t = world.current?.rocket.flight?.elapsed || 0;
      setFlightCaption(
        t < 4
          ? "Mission Control: Launch in " + Math.max(1, Math.ceil(4 - t)) + "…"
          : t < 13
            ? "Liftoff! Goodbye, " +
              (destination === "moon" ? "Moon" : "Mars") +
              "."
            : t < 22
              ? "Journey home · Time passes…"
              : t < FLIGHT_DURATION
                ? "Earth ahead. You’re nearly home!"
                : "Welcome home.",
      );
    }, 200);
    return () => window.clearInterval(timer);
  }, [inFlight, destination]);
  const p = power(sim, allocation, destination, adventure.upgrades);
  return (
    <div
      className={
        "app edition-" + destination + " " +
        (playing ? "in-game" : "in-menu") +
        (inFlight ? " in-flight" : "") +
        (tutorialActive ? " learning" : "") +
        (repairing ? " repairing" : "") +
        (gatherInfo ? " gathering" : "") +
        (fieldInfo || airlockInfo ? " gathering" : "") +
        (fieldInfo && !fieldInfo.scanWindow ? " track-repair" : "") +
        " highlight-" +
        highlight
      }
    >
      <div className="world" ref={mount} />
      {worldLoadError && (
        <div className="surface-load-error" role="alert">
          <h2>The surface could not load.</h2>
          <p>Check your connection and reload to try again.</p>
          <button onClick={() => window.location.reload()}>Reload game</button>
        </div>
      )}
      <div className="vignette" />
      <div className={"model-status " + modelStatus} role="status">
        {!graphicsReady
          ? "◌ Preparing detailed graphics…"
          : modelStatus === "loading"
            ? "◌ Getting your astronaut ready…"
            : modelStatus === "error"
              ? "Using backup astronaut · reload to retry"
              : "✦ Astronaut by Grab3D · CC0"}
      </div>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (playing) open("pause");
          }}
        >
          <Orbit size={28} />
          <span>
            FRONTIER<small>MISSION TRAINER</small>
          </span>
        </a>
        <nav>
          <span className="status-dot" />{" "}
          {playing ? "MISSION ACTIVE" : "EXPLORATION PROGRAM"}{" "}
          <span className="nav-divider" />{" "}
          <span className="edition">VOL. 01 — BEYOND EARTH</span>
        </nav>
        <div className="header-actions">
          <button aria-label={muted ? "Unmute game audio" : "Mute game audio"} aria-pressed={!muted} onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button aria-label="Settings" onClick={() => open("settings")}>
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      {!playing && <ArrivalIntro
        onFilm={(quiet, show, finish) => { void world.current?.filmLanding(quiet, show, finish); }}
        onSkip={() => world.current?.skipLanding()}
        ready={graphicsReady && modelStatus !== "loading"}
        saved={saved}
        reducedMotion={reducedMotion}
        onChoose={next => {
          setWorldEnabled(true);
          setGraphicsReady(false);
          setModelStatus("loading");
          setDestination(next);
          setPanel(null);
        }}
        onStart={() => beginTutorial(false)}
        onContinue={load}
      />}
      {playing && (
        <>
          <div className={"objective" + (done.includes(4) && !supplyGoal ? " expedition-complete" : "")}>
            <div className="eyebrow">
              MISSION {String(Math.min(mission + 1, 5)).padStart(2, "0")} / 05{" "}
              <span> • {inside ? "HABITAT" : "EVA"}</span>
            </div>
            <h2>
              {tutorialActive
                ? "Your first space adventure"
                : supplyGoal
                  ? sideInstruction
                    ? "Field mission"
                    : "Supply run"
                  : done.includes(4)
                    ? "Outpost restored"
                    : objective.name}
            </h2>
            <p>
              {trainingInstruction&&!tutorialActive?trainingInstruction:tutorialActive
                ? "Practice together with Mission Control."
                : supplyGoal
                  ? sideInstruction ||
                    `${supplyGoal}. Each rig has its own controls. H returns to your mission.`
                  : done.includes(4)
                    ? "Explore, recover robots or build your return rocket. J · Journal  /  U · Projects"
                    : greenhouseDecision
                      ? "Choose a power plan at the greenhouse, or open Systems with Tab."
                      : objective.task}
              {mission === 4 &&
                !done.includes(4) &&
                stormTime !== null && (
                  <strong className="storm-countdown">
                    {stormTime < 0
                      ? `Solar storm drill starts in ${-stormTime}s`
                      : `Hold essential systems · ${Math.max(0, STORM_DURATION - stormTime)}s remaining`}
                  </strong>
                )}
            </p>
            {!panel &&
              tutorialActive && tutorialTarget(guideStep.id) && (
                <small className="goal-distance">
                  ✦ {distanceToGoal} m to next stop
                </small>
              )}
            <div className="mission-dots">
              {list.map((_, i) => (
                <i
                  key={i}
                  className={
                    done.includes(i) ? "done" : i === mission ? "current" : ""
                  }
                />
              ))}
            </div>
          </div>
          <div className="telemetry">
            <span className="eyebrow">
              {destination === "moon" ? "LUNAR OUTPOST" : "MARTIAN COLONY"}
            </span>
            <strong>
              {String(Math.floor(sim.time / 60)).padStart(2, "0")}:
              {String(sim.time % 60).padStart(2, "0")} <small>MET</small>
            </strong>
            <span className={sim.storm ? "warning" : ""}>
              {sim.storm
                ? "⚠ " + (destination === "moon" ? "SOLAR EVENT" : "DUST STORM")
                : sim.suit < 20 || sim.oxygen < 20 || sim.battery < 15
                  ? "⚠ RESERVES LOW · CHECK SYSTEMS"
                  : "● ALL SYSTEMS MONITORED"}
            </span>
          </div>
          <div className="reticle">+</div>
          <div className="suit">
            <div className="eyebrow">
              <Shield size={13} /> SUIT TELEMETRY{" "}
              <span>{inside ? "RECHARGING" : "EVA ACTIVE"}</span>
            </div>
            {[
              { name: "Suit air", value: sim.suit },
              ...(sim.battery < 25
                ? [{ name: "Battery low", value: sim.battery }]
                : []),
            ].map((m) => (
              <div className="suit-row" key={m.name}>
                <span>{m.name}</span>
                <strong>
                  {m.value.toFixed(0)}
                  <small>%</small>
                </strong>
                <div className="bar">
                  <i style={{ width: m.value + "%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="controls">
            <span>
              <kbd>W A S D</kbd> Move <kbd>SHIFT</kbd> Sprint <kbd>SPACE</kbd>{" "}
              Jump
            </span>
            <span>
              <kbd>F</kbd> Light <kbd>TAB</kbd> Systems <kbd>M</kbd> Map{" "}
              <kbd>ESC</kbd> Pause
            </span>
            <small>MOVE MOUSE TO LOOK · ESC TO PAUSE</small>
          </div>
          {!panel && (
            <div className="explorer-tools">
              <button aria-label="Help me" title="Help me" onClick={help}>
                <CircleHelp size={19} aria-hidden="true" />
              </button>
              <button
                aria-label="Pause game"
                title="Pause · Escape"
                onClick={() => open("pause")}
              >
                <Pause size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          {tutorialActive && !panel && (
            <TutorialOverlay
              key={lessonKey}
              state={tutorial}
              stronger={strongerHint}
              narration={narration}
              finishLabel={
                practiceReturn.current
                  ? "Back to my mission"
                  : practiceReplay.current
                    ? "Back to menu"
                    : "Start my mission"
              }
              onHighlight={highlightTutorialMeter}
              onHelp={help}
              onRepeat={() => {
                setStrongerHint(true);
                speak(guideStep.text, true);
              }}
              onNarration={() => {
                setNarration((n) => !n);
                if (!narration) speak(guideStep.text, true);
              }}
              onFinish={() => endTutorial(true)}
              onSkip={() => endTutorial(false)}
            />
          )}
          {near && !fieldInfo && !panel && !airlockInfo && !gatherInfo && (
            <button
              className={
                "interact" +
                (near.startsWith("resource:") ? " resource-interact" : "")
              }
              onClick={() => {
                if (!near.startsWith("resource:")) interact(near);
              }}
              onPointerDown={(e) => {
                if (near.startsWith("resource:")) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  interact(near);
                  if (world.current) world.current.resources.buttonHeld = true;
                }
              }}
              onPointerUp={() => {
                if (world.current) world.current.resources.buttonHeld = false;
              }}
              onPointerCancel={() => {
                world.current?.resources.cancel();
                world.current?.adventure.cancel();
              }}
            >
              <kbd>E</kbd>
              <span>
                {fieldInfo
                  ? "Field instrument active"
                  : remainingCooldown(adventure, near, sim.time) > 0
                    ? `System settling · ${remainingCooldown(adventure, near, sim.time)}s`
                    : near === "medbay"
                      ? "Rest & recover"
                      : near === "recovery-room-project"
                        ? "Recovery room project"
                        : near === "rocket"
                          ? "Return rocket · build / board"
                          : near === "fabricator"
                            ? "Outpost projects"
                            : near.startsWith("hitch:")
                              ? "Attach robot tow cable"
                              : near.startsWith("sample:")
                                ? "Start pulse scan"
                                : near.startsWith("robot:")
                                  ? adventure.readyRobots.includes(
                                      near.slice(6),
                                    )
                                    ? "Hitch robot · bring buggy close"
                                    : "Refit robot track"
                                  : near.startsWith("resource:")
                                    ? "Extract " +
                                      resourceSites(destination).find(
                                        (s) => s.id === near.slice(9),
                                      )?.name
                                    : near === "vehicle"
                                      ? vehicleInfo?.driving
                                        ? "Get out of " + vehicleInfo.name
                                        : "Drive " +
                                          (vehicleInfo?.name || "rover")
                                      : near === "airlock"
                                        ? "Cycle airlock"
                                        : near === "shelter"
                                          ? sim.shielded ? "Shelter protected · stay here" : "Reinforce shelter · 1 part + 6% power"
                                          : "Inspect " +
                                            stations.find((s) => s.id === near)
                                              ?.name}
              </span>
              <ArrowRight size={18} />
            </button>
          )}
          <div className="compass">
            <Compass size={16} />{" "}
            {inside ? "FRONTIER HABITAT" : "SURFACE EXPLORATION"}{" "}
            <span>{(world.current?.getPosition()[0] ?? 0).toFixed(0)} E</span>
          </div>
        </>
      )}
      {playing && panel === "repair" && repairInfo && (
        <aside className="world-repair-hud" aria-live="polite">
          <strong>{repairInfo.title}</strong>
          <span>{repairInfo.instruction}</span>
          <div className="repair-progress">
            <i style={{ width: repairInfo.progress * 100 + "%" }} />
          </div>
          <small>
            {repairInfo.steps > 1
              ? "Stage " + repairInfo.step + " / " + repairInfo.steps + " · "
              : ""}
            Left-drag equipment · Escape
            to stop
          </small>
        </aside>
      )}
      {playing && !panel && world.current?.inRecoveryRoom() && !gatherInfo && (
        <div className="recovery-status">
          <strong>Crew recovery room</strong>
          <span>
            Health {Math.round(sim.health)}% · Suit air {Math.round(sim.suit)}%
          </span>
          <small>
            {sim.health >= 100 && sim.suit >= 100
              ? "Health and suit air are full · ready for your next trip"
              : sim.battery > 0 && sim.food > 0
                ? "Recovering while you rest · uses food + power"
                : "Treatment needs food and power"}
          </small>
        </div>
      )}
      {playing && !panel && gatherInfo && (
        <aside className="world-repair-hud" aria-live="polite">
          <strong>{gatherInfo.name}</strong>
          <span>{gatherInfo.instruction}</span>
          <div
            className="repair-progress"
            role="progressbar"
            aria-label="Collecting supplies"
            aria-valuenow={Math.round(gatherInfo.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: gatherInfo.progress * 100 + "%" }} />
          </div>
          {gatherInfo.voltage !== undefined && gatherInfo.band && (
            <div className="pulse-track" aria-label="Battery voltage gauge">
              <i style={{left: (gatherInfo.band - 6) + "%", width: "12%"}} />
              <span style={{left: gatherInfo.voltage + "%"}} />
            </div>
          )}
          {gatherInfo.heat !== undefined && (
            <label className="tool-heat">
              Tool heat{" "}
              <meter
                min={0}
                max={1}
                low={0.55}
                high={0.75}
                optimum={0.2}
                value={gatherInfo.heat}
              />
              <span>{Math.round(gatherInfo.heat * 100)}%</span>
            </label>
          )}
          <small>{gatherInfo.controls}</small>
        </aside>
      )}
      {playing &&
        vehicleInfo &&
        (vehicleInfo.driving || vehicleInfo.boarding) &&
        !panel && (
          <aside className="vehicle-hud">
            <strong>
              {vehicleInfo.name}
              <span>{vehicleInfo.speed.toFixed(1)} m/s</span>
            </strong>
            <small>
              {vehicleInfo.hint ||
                "W/S drive · A/D steer · Space brake · E get out"}
            </small>
            {vehicleInfo.pressurized && (
              <small>Pressurized cabin · suit air recharging</small>
            )}
          </aside>
        )}
      {playing && !panel && (fieldInfo || airlockInfo) && (
        <aside className={"world-repair-hud" + (fieldInfo ? " field-instrument" : "")} aria-live="polite">
          <strong>{(fieldInfo || airlockInfo)!.name}</strong>
          <span>{(fieldInfo || airlockInfo)!.text}</span>
          <div className="repair-progress">
            <i
              style={{
                width: (fieldInfo || airlockInfo)!.progress * 100 + "%",
              }}
            />
          </div>
          {fieldInfo?.scanWindow && <>
            <div className="pulse-track" aria-hidden="true">
              <i style={{left: fieldInfo.scanWindow[0] * 100 + "%", width: (fieldInfo.scanWindow[1] - fieldInfo.scanWindow[0]) * 100 + "%"}} />
              <span ref={scanMarker} />
            </div>
            <button onClick={() => world.current?.adventure.capturePulse()}>Capture pulse · E</button>
          </>}
          {fieldInfo && <button onClick={() => world.current?.adventure.cancel()}>Cancel</button>}
          <small>
            {airlockInfo
              ? "Both doors are interlocked · Escape pauses safely"
              : "Cancel to return to exploration."}
          </small>
        </aside>
      )}
      {playing &&
        !tutorialActive &&
        !panel &&
        radio.sent !== null &&
        !radio.used && (
          <aside className="radio-status" aria-live="polite">
            {radio.left
              ? `Earth reply in ${radio.left}s · Keep exploring`
              : "Earth reply received · Open systems with Tab"}
          </aside>
        )}
      {inFlight && (
        <div className="flight-overlay">
          <div className="flight-top">
            <span>F R O N T I E R</span>
            <small>EARTHBOUND · FICTIONAL TIME-COMPRESSED FLIGHT</small>
            <button onClick={() => open(live.current.panel ? null : "pause")}>
              {pause ? "Resume flight" : "Pause flight"}
            </button>
          </div>
          <div className="flight-caption" role="status">
            {flightCaption || "Mission Control: Preparing for launch…"}
          </div>
          <div className="flight-bottom">
            NASA Earth Observatory · Blue Marble imagery
          </div>
        </div>
      )}
      {notification && !inFlight && (
        <div className="notification">
          <Radio size={17} />
          {notification}
        </div>
      )}
      {panel && panel !== "repair" && (
        <div
          className="overlay"
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              panel !== "briefing" &&
              panel !== "debrief" &&
              panel !== "homecoming"
            ) {
              setRepairing(false);
              open(null);
            }
          }}
        >
          <section className={"panel panel-" + panel}>
            <div className="panel-plate" aria-hidden="true"><span>{destination === "moon" ? "02 / Lunar surface" : "01 / Martian surface"}</span></div>
            <div className="panel-top">
              <span className="eyebrow">
                FRONTIER /{" "}
                {panel === "destinations"
                  ? "MISSION PLANNING"
                  : panel.toUpperCase()}
              </span>
              <button
                hidden={panel === "homecoming"}
                aria-label="Close"
                onClick={() => {
                  setRepairing(false);
                  open(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            {panel === "solar-drill" && (
              <>
                <h2>Archived solar storm drill</h2>
                <p>
                  Mission Control is replaying a solar particle event from{" "}
                  {donkiArchive.date}. NASA’s DONKI archive records particles
                  detected by {donkiArchive.instrument} at {donkiArchive.detection}.
                </p>
                <p>
                  You have {SOLAR_DRILL_WARNING} game seconds to prepare.
                  Head to the shelter, reinforce it, and use Systems (Tab) to
                  turn on backup power and pause the grow lights.
                </p>
                <p>Your outdoor parts check is in progress. Finishing takes 10 seconds and recovers 1 spare part, leaving less time to prepare. The clock pauses while you choose.</p>
                <button className="primary" onClick={() => stormChoice('return')}>Return to shelter now</button>
                <button className="secondary" onClick={() => stormChoice('finish')}>Finish the short field task</button>
              </>
            )}
            {panel==='training-debrief'&&<><TrainingDebrief sim={sim} kind={trainingDebrief}/><button className="primary" onClick={()=>open(null)}>Continue mission</button></>}
            {panel === "greenhouse" && (
              <>
                <h2>Choose a greenhouse power plan</h2>
                <p>Red romaine ration window · {garden?'Current':'Starting'} battery {garden?sim.battery.toFixed(1):gardenStartingBattery}% · oxygen {sim.oxygen.toFixed(1)}% · crop {garden?sim.crop.toFixed(0):gardenStartingCrop}%.</p>
                <p>
                  Irrigation is ready. The grow lights share a battery with
                  oxygen production. What should the outpost prioritize?
                </p>
                <button className="primary" onClick={() => chooseGreenhousePlan("grow")}>
                  Run grow lights <ArrowRight size={18} />
                </button>
                <p>Use more power to bring the next food harvest closer.</p>
                <button className="secondary" onClick={() => chooseGreenhousePlan("save-power")}>
                  Save power for life support
                </button>
                <p>Pause crop growth and give the battery more room to recover.</p>
                <p>Press L during play to change plans. Growth takes about 38 lit seconds. The training shortage adds 0.65 battery points/second of load with lights on; paused lights recover 0.55 points/second, alongside normal outpost power. All times, costs and yields are game values. Oxygen production stays on.</p>
                <p>No deadline: paused crops can resume. If charge or water runs low, press P during play for an emergency pack; its use is recorded.</p>
              </>
            )}
            {panel === "destinations" && (
              <>
                <h2>Choose your frontier.</h2>
                <p>Two worlds. A different kind of survival.</p>
                <div className="destination-grid">
                  {(["moon", "mars"] as Destination[]).map((d) => (
                    <button
                      key={d}
                      className={
                        "destination " +
                        d +
                        (destination === d ? " selected" : "")
                      }
                      onClick={() => setDestination(d)}
                    >
                      <div className="planet-preview">
                        <div className={"planet " + d} />
                        <span>{d === "moon" ? "01 / LUNA" : "02 / ARES"}</span>
                      </div>
                      <div className="destination-info">
                        <div className="eyebrow">
                          {d === "moon" ? "LUNAR OUTPOST" : "MARTIAN COLONY"}
                        </div>
                        <h3>
                          {d === "moon" ? "The Moon" : "Mars"}{" "}
                          <ArrowUpRight size={24} />
                        </h3>
                        <p>
                          {d === "moon"
                            ? "A quiet world. An unforgiving vacuum. Make your first home on the edge of darkness."
                            : "Red horizons. Restless dust. Keep a distant colony alive against the elements."}
                        </p>
                        <div className="destination-data">
                          <span>{d === "moon" ? "1.62" : "3.71"} m/s²</span>
                          <span>{d === "moon" ? "Vacuum" : "Thin CO₂"}</span>
                          <span>
                            {d === "moon" ? "Radiation" : "Dust storms"}
                          </span>
                        </div>
                      </div>
                      {destination === d && (
                        <span className="selected-badge">
                          <Check size={13} /> SELECTED
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button className="primary" onClick={() => open("briefing")}>
                  Begin {destination === "moon" ? "lunar" : "Martian"} mission{" "}
                  <ArrowRight size={18} />
                </button>
              </>
            )}
            {panel === "briefing" && (
              <>
                <h2>Your outpost. Your responsibility.</h2>
                <p>Reach the airlock, restore power, grow food, and protect your crew through an environmental emergency.</p>
                <div className="brief-grid">
                  {[
                    ["W A S D", "Move relative to camera"],
                    ["MOUSE", "Move mouse to look around"],
                    ["SHIFT", "Sprint"],
                    ["SPACE", "Jump · assisted low gravity"],
                    ["E", "Interact / repair / enter vehicle"],
                    [
                      "DRIVING",
                      "W/S drive · A/D steer · Space brake · E get out",
                    ],
                    ["F", "Helmet light"],
                    [
                      "G / HOLD E",
                      "Find remote supplies / follow each rig’s controls",
                    ],
                    ["SCROLL", "Adjust shoulder camera"],
                    ["TAB / M / J / U", "Systems / map / journal / outpost"],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <kbd>{a}</kbd>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <p className="science-note">
                  Press Escape to release the mouse. Your astronaut stays
                  visible throughout exploration and repairs.
                </p>
                <button className="primary" onClick={start}>
                  Launch mission <ArrowUpRight size={19} />
                </button>
              </>
            )}
            {panel === "academy" && (
              <>
                <button className="primary" onClick={() => beginTutorial(true)}>
                  Play the astronaut tutorial →
                </button>
                <h2>Learn to live beyond Earth.</h2>
                <div className="academy-grid">
                  {[
                    {
                      i: Compass,
                      t: "Take a drive.",
                      p: "Find the Luna Buggy on the Moon or the six-wheel Ares Scout on Mars, parked to the left of your starting point. Press E beside it. W/S drive, A/D steer, Space brakes, and E gets out once stopped.",
                    },
                    {
                      i: Wind,
                      t: "Every breath has a cost.",
                      p: "Oxygen generation consumes water and electricity. Turning it off conserves energy while your reserves continue to fall.",
                    },
                    {
                      i: Sun,
                      t: "Power follows the sunlight.",
                      p: "Repair the array to increase output. Dust storms and darkness reduce generation; batteries only store energy.",
                    },
                    {
                      i: Leaf,
                      t: "Grow a little independence.",
                      p: "Restore irrigation and allocate grow lights. Crops need time, water and power before you can harvest them.",
                    },
                    {
                      i: Shield,
                      t: "Know when to take shelter.",
                      p: "Radiation rises during solar events. Enter the reinforced habitat shelter and reduce nonessential electrical loads.",
                    },
                  ].map((a) => (
                    <article key={a.t}>
                      <a.i size={25} />
                      <h3>{a.t}</h3>
                      <p>{a.p}</p>
                    </article>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => open("destinations")}
                >
                  Put it into practice <ArrowRight size={18} />
                </button>
              </>
            )}
            {panel === "science" && (
              <>
                <h2>
                  Grounded in science.
                  <br />
                  Built for discovery.
                </h2>
                <p>
                  A simplified educational simulation, inspired by real space
                  engineering. Independent project; no NASA endorsement.
                </p>
                <article className="science-note">
                  <strong>
                    Archive mission inspiration · {solarArchive.date}
                  </strong>
                  <p>
                    NASA observed a {solarArchive.classification} solar flare at{" "}
                    {solarArchive.peak}. Our shelter mission explores preparing
                    for solar activity. The mission’s timing and exposure index
                    are fictional; a flare classification does not determine
                    astronaut dose. Mars dust storms and solar radiation events
                    are different phenomena.
                  </p>
                </article>
                {sources.map((s) => (
                  <a
                    className="source"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    key={s.title}
                  >
                    <span>
                      <strong>{s.title}</strong>
                      <small>{s.note}</small>
                    </span>
                    <ArrowUpRight size={19} />
                  </a>
                ))}
                <p className="science-note">
                  Astronaut model and walk/run animations by Grab3D, Public
                  Domain (CC0); AI-assisted source asset.{" "}
                  <a
                    href="https://grab3d.com/models/characters/astronaut-in-spacesuit/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View original asset ↗
                  </a>
                  . Optimized and scaled locally. Idle, jump, landing and repair
                  poses are authored on its skeleton, not motion capture.
                </p>
                <p className="science-note">
                  Mars crew-rover concept model: NASA / LaRC / Advanced Concepts
                  Lab. Adapted for this educational game; no NASA endorsement.
                  Industrial metal textures: Poly Haven, CC0. Source links and
                  modification details are in the bundled asset credits.
                </p>
                <p className="science-note">
                  Planet facts show natural gravity. Jumping uses assisted,
                  game-tuned gravity and gentle air steering for easier control.
                  Resource percentages, crop times, environmental schedules, and
                  the radiation exposure index are game balance values, not
                  measured NASA datasets or medical predictions. Simulation time
                  is accelerated.
                </p>
              </>
            )}
            {panel === "settings" && (
              <>
                <h2>Make yourself at home.</h2>
                <p className="science-note">
                  This preview:{" "}
                  {Math.round(performance.fps || world.current?.fps || 0) ||
                    "…"}{" "}
                  FPS · {performance.calls} draw calls ·{" "}
                  {Math.round(performance.triangles / 1000)}k triangles. School
                  mode uses a fixed render resolution budget. High adds soft
                  contact shading and detailed shadows. Ultra adds sharper
                  4096-pixel shadows and needs more graphics power. Medium uses
                  simpler shadows; Low disables directional shadows.
                </p>
                <p className="science-note">
                  Last gameplay timing: CPU {performance.cpu.toFixed(1)} ms ·
                  GPU{" "}
                  {performance.gpu === null
                    ? "unavailable in this browser"
                    : performance.gpu.toFixed(1) + " ms"}{" "}
                  · 95th-percentile frame {performance.frameP95.toFixed(1)} ms.
                  Paused rendering is capped separately.
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setQuality("School computer");
                    toast(
                      "School mode: stable pixel budget, detailed models and soft shadows, without heavy post-processing.",
                    );
                  }}
                >
                  Use school-computer performance mode
                </button>

                <p className="science-note">
                  You control the camera. Objectives and distances stay in the HUD;
                  selecting a destination never turns your view. During hands-on tasks, the camera zooms in on the equipment.
                </p>
                <label className="setting">
                  Read tutorial aloud
                  <input
                    type="checkbox"
                    checked={narration}
                    onChange={(e) => setNarration(e.target.checked)}
                  />
                </label>
                <label className="setting">
                  Graphics preset
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                  >
                    {["School computer", "Low", "Medium", "High", "Ultra"].map(
                      (q) => (
                        <option key={q}>{q}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="setting">
                  Camera sensitivity{" "}
                  <input
                    aria-label="Camera sensitivity"
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(+e.target.value)}
                  />
                  <span>{sensitivity.toFixed(1)}</span>
                </label>
                <label className="setting">
                  Reduce camera motion
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                  />
                </label>
                <label className="setting">
                  Game audio
                  <input
                    type="checkbox"
                    checked={!muted}
                    onChange={(e) => setMuted(!e.target.checked)}
                  />
                </label>
                <label className="setting">
                  Master volume
                  <input type="range" min="0" max="1" step="0.05" value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))} />
                  <span>{Math.round(volume * 100)}%</span>
                </label>
                <label className="setting">
                  Music volume
                  <input type="range" min="0" max="1" step="0.05" value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))} />
                  <span>{Math.round(musicVolume * 100)}%</span>
                </label>
                <p className="science-note">The Moon mixes sound through the suit, while Mars adds exterior wind and grit. The interior mix uses recorded deck and machinery sounds. Additional recordings by Kenney, CC0.</p>
                <label className="setting">
                  Simulation speed
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                  >
                    {[1, 2, 4].map((q) => (
                      <option key={q} value={q}>
                        {q}×
                      </option>
                    ))}
                  </select>
                </label>
                <p className="science-note">
                  School computer caps resolution, disables directional shadows and skips
                  ambient occlusion. Low disables shadows. Pointer sensitivity
                  applies to cursor dragging and captured mouse movement.
                </p>
              </>
            )}
            {panel === "dashboard" && (
              <>
                <h2>Keep the frontier alive.</h2>
                <div className="metrics">
                  {metrics.map((m) => (
                    <article key={m.name}>
                      <m.icon size={19} />
                      <span>{m.name}</span>
                      <strong>
                        {m.value.toFixed(1)}
                        <small>{m.unit}</small>
                      </strong>
                      <div className="bar">
                        <i style={{ width: m.value + "%" }} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="dashboard-columns">
                  <div>
                    <div className="eyebrow">
                      RESOURCE HISTORY · ACTUAL SIMULATION
                    </div>
                    <svg
                      className="chart"
                      viewBox="0 0 360 120"
                      role="img"
                      aria-label="Resource history graph"
                    >
                      {[25, 50, 75, 100].map((v) => (
                        <line
                          key={v}
                          x1="0"
                          x2="360"
                          y1={120 - v}
                          y2={120 - v}
                          stroke="#ffffff15"
                        />
                      ))}
                      {[0, 1, 2, 3].map((n) => (
                        <polyline
                          key={n}
                          fill="none"
                          stroke={
                            ["#b8e7d7", "#e7bb75", "#81b2d0", "#91ac79"][n]
                          }
                          strokeWidth="2"
                          points={sim.history
                            .map(
                              (row, i) =>
                                `${(i * 360) / Math.max(1, sim.history.length - 1)},${120 - row[n]}`,
                            )
                            .join(" ")}
                        />
                      ))}
                    </svg>
                    <p className="science-note">
                      O₂ · amber battery · blue water · green food. Samples
                      every 5 simulation seconds.
                    </p>
                    <div className="mini-metrics">
                      <span>
                        CO₂ <strong>{sim.co2.toFixed(2)}%</strong>
                      </span>
                      <span>
                        Cabin <strong>{sim.temperature.toFixed(1)}°C</strong>
                      </span>
                      <span>
                        Pressure <strong>{sim.pressure.toFixed(0)} kPa</strong>
                      </span>
                      <span>
                        Crew <strong>{sim.health.toFixed(0)}%</strong>
                      </span>
                      <span>
                        Exposure index{" "}
                        <strong>{sim.radiation.toFixed(2)}</strong>
                      </span>
                      <span>
                        Parts <strong>{sim.parts.toFixed(1)}</strong>
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">POWER DISTRIBUTION</div>
                    {greenhouseDecision && (
                      <button className="secondary" onClick={() => open("greenhouse")}>
                        Choose greenhouse power plan
                      </button>
                    )}
                    <p className="power-net">
                      {p.generated.toFixed(2)} <small>generation</small> /{" "}
                      {p.consumed.toFixed(2)} <small>load · game units</small>
                    </p>
                    {(Object.keys(allocation) as (keyof Allocation)[]).map(
                      (k) => (
                        <label className="setting compact" key={k}>
                          {
                            {
                              oxygen: "Oxygen production",
                              greenhouse: "Greenhouse lights",
                              recycler: "Water recovery",
                              backup: "Emergency backup",
                            }[k]
                          }
                          <input
                            type="checkbox"
                            checked={allocation[k]}
                            onChange={(e) =>
                              setAllocation((a) => ({
                                ...a,
                                [k]: e.target.checked,
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                    <p className="science-note">
                      Decision preview: current battery trend{" "}
                      <strong>
                        {(p.net * 0.18 * 60).toFixed(1)}% / simulation minute
                      </strong>
                      . Disabling grow lights saves {GROW_LIGHT_LOAD} power units and stops
                      growth. Backup consumes spare parts.
                    </p>
                    <button
                      className="secondary"
                      disabled={sim.crop < 100}
                      onClick={() => {
                        setSim((s) => ({
                          ...s,
                          crop: 0,
                          food: Math.min(100, s.food + 20),
                        }));
                        toast("Harvest complete · Food reserves +20%.");
                      }}
                    >
                      Harvest crops · {sim.crop.toFixed(0)}%
                    </button>
                  </div>
                </div>
                <EarthRadio
                  sim={sim}
                  destination={destination}
                  state={radio}
                  charge={() =>
                    setSim((s) => ({
                      ...s,
                      battery: Math.max(0, s.battery - 5),
                    }))
                  }
                  resume={() => open(null)}
                  apply={(a) => setAllocation((old) => ({ ...old, ...a }))}
                />
              </>
            )}
            {panel === "map" && (
              <>
                <h2>Surface map</h2>
                <button
                  className="secondary"
                  onClick={() =>
                    guideSide(
                      "rover",
                      "Your buggy",
                      "Press E beside the buggy to climb in.",
                    )
                  }
                >
                  Find my buggy →
                </button>
                <SurfaceMap
                  destination={destination}
                  ground={(x,z)=>world.current?.groundHeight(x,z)??0}
                  expedition={expedition}
                  onRoute={selectRoute}
                  sites={resourceSites(destination)}
                  collected={
                    world.current?.resources.gather.collected ?? new Set()
                  }
                  player={world.current?.getPosition() ?? [0, 0, 0]}
                  vehicle={world.current?.vehicle.state ?? { x: -8, z: 5 }}
                  roomBuilt={adventure.upgrades.includes("medbay")}
                  onSelect={(site) => findSupplies(site.kind, site.id)}
                />
              </>
            )}
            {panel === "journal" && (
              <>
                <AdventurePanels
                  mode="journal"
                  data={adventure}
                  sim={sim}
                  destination={destination}
                  atFabricator={near === "fabricator" && inside}
                  onBuild={buildOutpost}
                  onGuide={guideSide}
                />
                <details className="legacy-missions">
                  <summary>Your mission log · {done.length}/5 goals</summary>
                  {list.map((m, i) => (
                    <article
                      className={
                        "journal-entry " + (done.includes(i) ? "complete" : "")
                      }
                      key={m.name}
                    >
                      <span>
                        {done.includes(i) ? (
                          <Check size={20} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <h3>{m.name}</h3>
                        <p>{m.task}</p>
                        {done.includes(i) && <small>{m.lesson}</small>}
                      </div>
                    </article>
                  ))}
                </details>
              </>
            )}

            {panel === "outpost" && (
              <>
                <button className="secondary" onClick={() => open("rocket")}>
                  Earthbound · build your return rocket
                </button>
                <AdventurePanels
                  mode="outpost"
                  data={adventure}
                  sim={sim}
                  destination={destination}
                  atFabricator={near === "fabricator" && inside}
                  onBuild={buildOutpost}
                  onGuide={guideSide}
                />
              </>
            )}
            {panel === "rocket" && (
              <RocketPanel
                rocket={rocket}
                sim={sim}
                research={adventure.research}
                atFabricator={near === "fabricator" && inside}
                atPad={near === "rocket"}
                launchProblem={launchProblem(
                  rocket,
                  done,
                  inside,
                  !!vehicleInfo?.driving,
                )}
                onBuild={buildReturnRocket}
                onLaunch={launchReturnRocket}
                onGuide={(id) => {
                  guideSide(
                    id,
                    id === "rocket" ? rocketPad.name : "Fabrication station",
                    id === "rocket"
                      ? "Park at the pad, get out and press E to board."
                      : "Build rocket sections at the fabricator inside your habitat.",
                  );
                }}
              />
            )}
            {panel === "homecoming" && (
              <>
                <div className="expedition-kicker">
                  EARTHBOUND / MISSION COMPLETE
                </div>
                <h2>Welcome home, astronaut.</h2>
                <p>
                  You built your rocket, left{" "}
                  {destination === "moon" ? "the Moon" : "Mars"} behind and
                  brought your discoveries back to Earth.
                </p>
                <div className="mini-metrics">
                  <span>
                    Outpost missions<strong>{done.length}/5</strong>
                  </span>
                  <span>
                    Samples<strong>{adventure.samples.length}</strong>
                  </span>
                  <span>
                    Robots rescued<strong>{adventure.rescued.length}</strong>
                  </span>
                </div>
                <p>Your completed expedition is saved locally.</p>
                <button
                  className="primary"
                  onClick={() => {
                    world.current?.rocket.stop();
                    setPlaying(false);
                    setPanel(null);
                  }}
                >
                  Return to main menu
                </button>
                <button className="secondary" onClick={start}>
                  Start a new expedition
                </button>
              </>
            )}
            {panel === "pause" && inFlight && (
              <>
                <h2>Flight paused.</h2>
                <p>Your rocket will wait here. No supplies are being used.</p>
                <button className="primary" onClick={() => open(null)}>
                  Resume flight
                </button>
              </>
            )}
            {panel === "pause" && !inFlight && (
              <>
                <h2>A moment of stillness.</h2>
                <p>
                  Simulation paused. Your outpost will be here when you return.
                </p>
                <div className="pause-actions">
                  {!tutorialActive && (
                    <>
                      <button
                        className="secondary"
                        onClick={() => open("journal")}
                      >
                        Explorer journal · J
                      </button>
                      <button
                        className="secondary"
                        onClick={() => open("outpost")}
                      >
                        Outpost projects · U
                      </button>
                    </>
                  )}
                  {!inFlight && !tutorialActive && (
                    <button
                      className="secondary"
                      onClick={() => open("rocket")}
                    >
                      Earthbound · return rocket
                    </button>
                  )}
                  <button className="primary" onClick={() => open(null)}>
                    <Play size={17} /> Resume exploration
                  </button>
                  {!tutorialActive && (
                    <button
                      className="secondary"
                      onClick={() => findSupplies()}
                    >
                      Find needed supplies · G
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => {
                      world.current?.resetCamera();
                      open(null);
                    }}
                  >
                    Reset camera · R
                  </button>
                  {!tutorialActive && (
                    <button
                      className="secondary"
                      onClick={() => beginTutorial(true)}
                    >
                      Replay tutorial
                    </button>
                  )}
                  {tutorialActive && (
                    <button
                      className="secondary"
                      onClick={() => endTutorial(false)}
                    >
                      Exit tutorial safely
                    </button>
                  )}
                  {!tutorialActive && (
                    <>
                      <button className="secondary" onClick={save}>
                        Save mission
                      </button>
                    </>
                  )}
                  <button
                    className="secondary"
                    onClick={() => open("settings")}
                  >
                    Settings
                  </button>
                  {!tutorialActive && (
                    <button
                      className="secondary"
                      onClick={() => {
                        save();
                        setPlaying(false);
                        open(null);
                      }}
                    >
                      Save & return to title
                    </button>
                  )}
                </div>
              </>
            )}
            {panel === "debrief" && (
              <>
                <div className="debrief-grade">
                  {sim.health <= 0
                    ? "F"
                    : sim.health > 80 && sim.battery > 30
                      ? "A"
                      : "B"}
                </div>
                <h2>
                  {sim.health <= 0
                    ? "The frontier teaches."
                    : "A foothold in the future."}
                </h2>
                <p>
                  {sim.health <= 0
                    ? "Life support reserves became unsafe. Review your power allocation and return from EVA sooner."
                    : "You restored the outpost and sheltered through an emergency. Your engineering decisions kept the crew alive."}
                </p>
                <div className="mini-metrics">
                  <span>
                    Objectives <strong>{done.length}/5</strong>
                  </span>
                  <span>
                    Crew health <strong>{sim.health.toFixed(0)}%</strong>
                  </span>
                  <span>
                    Water remaining <strong>{sim.water.toFixed(0)}%</strong>
                  </span>
                  <span>
                    Battery <strong>{sim.battery.toFixed(0)}%</strong>
                  </span>
                </div>
                {garden&&<TrainingDebrief sim={sim} kind="garden"/>}
                {drill&&<TrainingDebrief sim={sim} kind="storm"/>}
                {expedition&&<TrainingDebrief sim={sim} kind="rover"/>}
                {sim.irrigation && !garden && (
                  <article className="science-note">
                    <h3>Greenhouse power debrief</h3>
                    <p>
                      {sim.greenhousePlan === "grow"
                        ? "You chose to run the grow lights after restoring irrigation."
                        : sim.greenhousePlan === "save-power"
                          ? "You chose to save battery power and pause crop growth after restoring irrigation."
                          : "You restored greenhouse irrigation."}{" "}
                      While the battery has charge, running the lights lets
                      watered crops grow. Switching them off pauses the next
                      harvest and reduces battery drain by up to{" "}
                      {(GROW_LIGHT_LOAD * 0.18 * 60).toFixed(1)} percentage
                      points per simulation minute.
                    </p>
                    <a href={greenhouseSource} target="_blank" rel="noreferrer">
                      Canadian Space Agency · Interplanetary Farming
                    </a>
                  </article>
                )}
                {destination === "moon" && stormTime !== null && !drill && (
                  <article className="science-note">
                    <h3>Solar storm drill debrief</h3>
                    <p>
                      NASA archived the {donkiArchive.date} particle event as{" "}
                      {donkiArchive.eventId}. Reinforcing the shelter reduces
                      the simulated exposure rate. The warning window,
                      power shortage, and exposure index are game parameters.
                    </p>
                    <a href={donkiArchive.url} target="_blank" rel="noreferrer">
                      NASA CCMC · Archived DONKI event
                    </a>
                  </article>
                )}
                {sim.health > 0 && (
                  <button className="primary" onClick={() => open("rocket")}>
                    Continue expedition · build return rocket
                  </button>
                )}
                <button className="secondary" onClick={start}>
                  Replay mission <ArrowRight size={18} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setPlaying(false);
                    open(null);
                  }}
                >
                  Back to main menu
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
