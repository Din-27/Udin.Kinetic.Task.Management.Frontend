import confetti from "canvas-confetti";

export function triggerTaskCelebration() {
  // Fire Asana-style multi-color confetti burst
  confetti({
    particleCount: 55,
    spread: 60,
    origin: { y: 0.8 },
    colors: ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"],
  });
}
