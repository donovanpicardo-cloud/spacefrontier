export const tutorialSteps = [
  {
    id: "move",
    title: "Let’s walk!",
    text: "Use W A S D to walk a few steps.",
    keys: ["W", "A", "S", "D"],
    hint: "Hold W to walk forward. You can take your time.",
  },
  {
    id: "look",
    title: "Look around",
    text: "Click the scene and move your mouse to look all the way around. You can also drag or swipe to turn.",
    keys: ["Move mouse"],
    hint: "Move your mouse gently left and right. Press Escape whenever you want to pause.",
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
    title: "Follow the stars",
    text: "Follow the golden trail to the solar panels.",
    keys: ["W", "A", "S", "D"],
    hint: "Walk toward the tall golden marker. The distance tells you how far to go.",
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
    text: "Follow the trail to the airlock. Press E to go inside.",
    keys: ["E"],
    hint: "The entrance has an orange frame. Wait for the doors to finish moving.",
  },
  {
    id: "objective",
    title: "Your next adventure",
    text: "Your goal always appears at the top left. Press “Show my goal” to find it.",
    keys: ["Show my goal"],
    hint: "Look for the card at the top left. It tells you one thing to do next.",
  },
  {
    id: "help",
    title: "Help is always here",
    text: "Press Help me. Mission Control will show you what to do.",
    keys: ["Help me"],
    hint: "The Help me button is beside Reset camera. You can use it at any time.",
  },
  {
    id: "oxygen",
    title: "Air for your adventure",
    text: "Your air meter shows how much air is in your suit. Press “Show my air”.",
    keys: ["Show my air"],
    hint: "Your air meter is at the bottom left. It fills up inside your space home.",
  },
  {
    id: "finish",
    title: "You’re ready, explorer!",
    text: "You walked, jumped, fixed a panel and used an airlock. Your real mission starts next!",
    keys: [],
    hint: "Press Start my mission. You can replay this lesson from Pause.",
  },
] as const;
export type TutorialId = (typeof tutorialSteps)[number]["id"];
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
) {
  return playing && !tutorial && (panel === null || panel === "repair");
}
export const juniorGoals = [
  "Follow the trail to your space home. Press E at the door.",
  "Follow the trail to the solar panels. Let’s fix the plug!",
  "Help the plants! Go inside and fix their water pipe.",
  "Let’s clean the air! Fix the filter inside your space home.",
  "Follow the trail to the shelter. Press E to keep everyone safe.",
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
