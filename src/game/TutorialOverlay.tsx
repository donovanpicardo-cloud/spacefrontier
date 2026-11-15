import {
  tutorialSteps,
  touchLesson,
  type TutorialState,
} from "./Tutorial";
export function TutorialOverlay(p: {
  state: TutorialState;
  stronger: boolean;
  narration: boolean;
  touch: boolean;
  onHighlight: (id: "objective" | "oxygen") => void;
  onHelp: () => void;
  onRepeat: () => void;
  onNarration: () => void;
  onFinish: () => void;
  onSkip: () => void;
  finishLabel: string;
}) {
  const step = tutorialSteps[p.state.index];
  const copy = p.touch ? touchLesson[step.id] : step;
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
          TUTORIAL<strong>Step {p.state.index + 1} of {tutorialSteps.length} · Safe practice</strong>
        </span>
        <span className="practice-badge">SAFE PRACTICE</span>
      </div>
      <div
        className="lesson-progress"
        aria-label={`Step ${p.state.index + 1} of ${tutorialSteps.length}`}
      >
        {tutorialSteps.map((s, i) => (
          <i key={s.id} className={i <= p.state.index ? "learned" : ""} />
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        <h2>{step.title}</h2>
        <p>{copy.text}</p>
        {!p.touch && <div className="lesson-keys">
          {step.keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </div>}
      </div>
      {p.stronger && <p className="lesson-hint">💡 {copy.hint}</p>}

      {step.id === "objective" && (
        <button
          className="primary"
          onClick={() => p.onHighlight("objective")}
        >
          Show my goal ↖
        </button>
      )}
      {step.id === "oxygen" && (
        <button
          className="primary"
          onClick={() => p.onHighlight("oxygen")}
        >
          Show my air ↙
        </button>
      )}
      {step.id === "finish" && (
        <button className="primary" onClick={p.onFinish}>
          {p.finishLabel} →
        </button>
      )}
      <button className="lesson-help" onClick={p.onHelp}>Help with this step</button>
      <details className="lesson-options">
        <summary>Mission goal & options</summary>
        <p className="lesson-mission"><strong>Final goal: return to Earth.</strong> Restore the outpost, gather supplies and research, then assemble and launch your return rocket. Air and supplies stay safe during practice.</p>
        <button onClick={p.onRepeat}>Repeat instruction</button>
      <div className="lesson-footer">
        <button onClick={p.onNarration}>
          {p.narration ? "🔊 Voice on" : "🔈 Read aloud"}
        </button>
        <button onClick={p.onSkip}>{p.touch ? "Skip tutorial" : "Skip tutorial · K"}</button>
      </div>
      </details>
    </aside>
  );
}
