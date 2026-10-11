// Countdown of a round in timed mode (like in the Flags & Capitals game).

// Calls onTick(secondsLeft) every second (and at once), onTimeout() at 0.
// Returns {stop()}; a stopped timer does nothing more.
export function startTimer(seconds, onTick, onTimeout) {
  const end = Date.now() + seconds * 1000; // by the clock, so it does not drift
  let last = seconds;
  onTick(seconds);
  const id = setInterval(() => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    if (left === last) return;
    last = left;
    onTick(left);
    if (left === 0) {
      clearInterval(id);
      onTimeout();
    }
  }, 200);
  return { stop: () => clearInterval(id) };
}
