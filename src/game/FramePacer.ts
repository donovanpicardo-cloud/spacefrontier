/** Keep the fractional refresh interval instead of losing it after each frame. */
export class FramePacer {
  deadline = 0;
  budget = -1;
  ready(now: number, budget: number) {
    if (budget !== this.budget) {
      this.budget = budget;
      this.deadline = now;
    }
    if (!budget) return true;
    if (now + 0.6 < this.deadline) return false;
    this.deadline += budget;
    // Do not replay a backlog after a hidden tab or long stall.
    if (this.deadline < now - budget) this.deadline = now + budget;
    return true;
  }
}
