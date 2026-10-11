// A game = a series of rounds: score, lives and levels (no drawing).

export const LIVES = 3;
export const POINTS_PER_LEVEL = 10; // level up every this many points of the score
export const WIN_SCORE = 50; // the game is won with this score

// levelCount = number of levels (numbered from 0 here); winScore = score that wins
export function createSession(levelCount, winScore = WIN_SCORE) {
  let score = 0;
  let lives = LIVES;
  let free = false; // playing on after a win: no points, no lives
  const level = () => Math.min(Math.floor(score / POINTS_PER_LEVEL), levelCount - 1);

  return {
    get score() {
      return score;
    },
    get lives() {
      return lives;
    },
    get level() {
      return level();
    },
    // Won the whole game
    get winner() {
      return score >= winScore;
    },
    get over() {
      return !free && (lives === 0 || score >= winScore);
    },
    get free() {
      return free;
    },
    // After a win: go on playing, rounds change nothing any more
    playFree() {
      free = true;
    },
    // Round won with `points` left in the pool; returns true on a level up
    won(points) {
      if (free) return false;
      const before = level();
      score += points;
      return level() > before;
    },
    // Round lost (pool empty or gave up)
    lost() {
      if (free) return;
      lives = Math.max(0, lives - 1);
    },
  };
}
