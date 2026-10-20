// Makes sure we never hammer an API. Jikan allows 3 requests/second and
// 60/minute, so we space requests at least `gapMs` apart and cap per minute.
// Calls wait in line (a queue) and go out one at a time.

export function createLimiter({ gapMs, perMinute }) {
  let chain = Promise.resolve();   // the "line" everyone waits in
  let lastStart = 0;
  let recent = [];                 // start times within the last minute

  return function limited(task) {
    const run = chain.then(async () => {
      // Wait until the per-minute budget has room.
      for (;;) {
        const now = Date.now();
        recent = recent.filter((t) => now - t < 60_000);
        if (recent.length < perMinute) break;
        await sleep(60_000 - (now - recent[0]) + 50);
      }
      // Wait for the small gap between requests.
      const wait = lastStart + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastStart = Date.now();
      recent.push(lastStart);
      return task();
    });
    chain = run.catch(() => {});   // one failure must not block the line
    return run;
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
