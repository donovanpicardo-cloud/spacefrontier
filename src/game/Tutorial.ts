export const tutorialSteps = [
  {
    id: "move",
    title: "Learn to explore",
    text: "Hold W A S D to walk. First, practise moving a few steps; your air and supplies are paused during this lesson.",
    keys: ["W", "A", "S", "D"],
    hint: "Hold W to walk forward. You can take your time.",
  },
  {
    id: "look",
    title: "Look around",
    text: "Drag the scene with your mouse or swipe to turn the camera.",
    keys: ["Drag or swipe"],
    hint: "Drag the scene gently left and right. Press Escape whenever you want to pause.",
  },
  {
    id: "reset",
    title: "Find your astronaut",
    text: "Press R to put the camera behind you.",
    keys: ["R"],
    hint: "Press R. It puts the camera behind your astronaut.",
  },
  {
    id: "jump",
    title: "A giant little leap!",
    text: "Press Space to jump. Wait until your boots touch the ground.",
    keys: ["Space"],
    hint: "Press Space. The Moon has gentler gravity than Mars.",
  },
  {
    id: "marker",
    title: "Find the solar array",
    text: "Walk to the solar panels beside the habitat. Watch the objective distance decrease as you approach.",
    keys: ["W", "A", "S", "D"],
    hint: "Find the solar array beside the habitat. The objective distance tells you how far to go.",
  },
  {
    id: "repair",
    title: "Your first repair",
    text: "Press E near the solar panels. Follow the short repair instruction beside your astronaut.",
    keys: ["E"],
    hint: "On the Moon, drag the plugs to matching shapes. On Mars, brush away the red dust first. Take your time!",
  },
  {
    id: "airlock",
    title: "Welcome to your space home",
    text: "Head to the airlock. Press E to go inside.",
    keys: ["E"],
    hint: "Approach the main habitat door until Cycle airlock appears. Press E, walk into the chamber, and wait for the pressure cycle.",
  },
  {
    id: "objective",
    title: "Your next adventure",
    text: "Your goal always appears at the top left. Press Enter to highlight it.",
    keys: ["Enter"],
    hint: "Look for the card at the top left. It tells you one thing to do next.",
  },
  {
    id: "help",
    title: "Help is always here",
    text: "Press Enter or H to try asking Mission Control for help.",
    keys: ["Enter", "H"],
    hint: "Use the question-mark button at the top right, or Help me in this lesson. Escape opens Pause and R resets your camera.",
  },
  {
    id: "oxygen",
    title: "Air for your adventure",
    text: "Your air meter shows how much air is in your suit. Press Enter to highlight it.",
    keys: ["Enter"],
    hint: "Your air meter is at the bottom left. It fills up inside your space home.",
  },
  {
    id: "finish",
    title: "You’re ready, explorer!",
    text: "Your goal is to get back to Earth. Finish the five outpost missions, gather supplies and scan a rock sample. Build three rocket sections at the workbench inside the habitat, then go to the launch pad. Press Enter to start your mission.",
    keys: ["Enter"],
    hint: "Press Enter to finish. You can replay this lesson from Pause.",
  },
] as const;
export type TutorialId = (typeof tutorialSteps)[number]["id"];
export function tutorialCanContinue(id: TutorialId) {
  return id === "objective" || id === "help" || id === "oxygen" || id === "finish";
}
export type TutorialEvent = {
  type: TutorialId | "reset-session";
  amount?: number;
};
export type TutorialState = { index: number; amount: number };
export const initialTutorial: TutorialState = { index: 0, amount: 0 };
export function tutorialReducer(
  s: TutorialState,
  e: TutorialEvent,
): TutorialState {
  if (e.type === "reset-session") return initialTutorial;
  const step = tutorialSteps[s.index];
  if (!step || e.type !== step.id || e.type === "finish") return s;
  const amount =
    s.amount + Math.max(0, Number.isFinite(e.amount) ? e.amount! : 1);
  const required = step.id === "move" ? 2 : step.id === "look" ? 110 : 1;
  return amount >= required
    ? { index: s.index + 1, amount: 0 }
    : { ...s, amount };
}
export function tutorialTarget(id: TutorialId): string | null {
  return id === "marker" || id === "repair"
    ? "solar"
    : id === "airlock"
      ? "airlock"
      : null;
}
export function simulationRuns(
  playing: boolean,
  panel: string | null,
  tutorial: boolean,
  worldReady = true,
) {
  return playing && worldReady && !tutorial && (panel === null || panel === "repair");
}
export const juniorGoals = [
  "Head to your space home. Press E at the door.",
  "Head to the solar panels. Let’s fix the plug!",
  "Help the plants! Go inside and fix their water pipe.",
  "Let’s clean the air! Fix the filter inside your space home.",
  "Head to the shelter. Press E to keep everyone safe.",
];
export function juniorGoal(mission: number, destination: "moon" | "mars") {
  if (destination === "mars") {
    if (mission === 1)
      return "Brush the red dust off the solar contacts. Then connect the two leads.";
    if (mission === 2)
      return "Go inside. Turn both water valves to help the plants.";
    if (mission === 3)
      return "Go inside. Put the dirty air filter in the left tray, then fit a clean one.";
  }
  return juniorGoals[mission] || "Explore your space home.";
}
