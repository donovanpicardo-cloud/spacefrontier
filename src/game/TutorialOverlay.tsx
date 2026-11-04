import {
  tutorialSteps,
  type TutorialState,
  type TutorialEvent,
} from "./Tutorial";
export function TutorialOverlay(p: {
  state: TutorialState;
  stronger: boolean;
  narration: boolean;
  onEvent: (e: TutorialEvent) => void;
  onHelp: () => void;
  onRepeat: () => void;
  onNarration: () => void;
  onFinish: () => void;
  onSkip: () => void;
  finishLabel: string;
}) {
  const step = tutorialSteps[p.state.index];
  return (
    <aside
      className={"tutorial-card" + (p.stronger ? " extra-help" : "")}
      aria-label="Astronaut tutorial"
    >
      <div className="guide-identity">
        <span className="guide-avatar" aria-hidden="true">
          ✦
        </span>
        <span>
          MISSION CONTROL<strong>Your astronaut lesson</strong>
        </span>
        <span className="practice-badge">SAFE PRACTICE</span>
      </div>
      <div
        className="lesson-progress"
        aria-label={`Step ${Math.min(7, p.state.index < 2 ? p.state.index + 1 : p.state.index < 4 ? p.state.index : p.state.index < 7 ? p.state.index : 7)} of 7`}
      >
        {tutorialSteps.map((s, i) => (
          <i key={s.id} className={i <= p.state.index ? "learned" : ""} />
        ))}
      </div>
      <div aria-live="polite" aria-atomic="true">
        <h2>{step.title}</h2>
        <p>{step.text}</p>
        <div className="lesson-keys">
          {step.keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </div>
      </div>
      {p.stronger && <p className="lesson-hint">💡 {step.hint}</p>}
      <small>Your air and supplies stay safe while you learn.</small>
      {step.id === "objective" && (
        <button
          className="primary"
          onClick={() => p.onEvent({ type: "objective" })}
        >
          Show my goal ↖
        </button>
      )}
      {step.id === "oxygen" && (
        <button
          className="primary"
          onClick={() => p.onEvent({ type: "oxygen" })}
        >
          Show my air ↙
        </button>
      )}
      {step.id === "finish" && (
        <button className="primary" onClick={p.onFinish}>
          {p.finishLabel} →
        </button>
      )}
      <div className="lesson-actions">
        <button onClick={p.onRepeat}>↻ Repeat instruction</button>
        <button onClick={p.onHelp}>? Help me</button>
      </div>
      <div className="lesson-footer">
        <button onClick={p.onNarration}>
          {p.narration ? "🔊 Voice on" : "🔈 Read aloud"}
        </button>
        <button onClick={p.onSkip}>Skip tutorial · K</button>
      </div>
    </aside>
  );
}
