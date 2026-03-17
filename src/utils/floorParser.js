/**
 * Parses a floor configuration string like "2B+G+18" into a sortable integer
 * representing the total number of floors ABOVE GROUND (including Ground).
 *
 * Rules:
 *  - Tokens like "2B", "1B", "B" → basements (ignored for "above ground" count)
 *  - "G" → ground floor = 1
 *  - Pure numeric tokens → number of floors
 *
 * Examples:
 *  "2B+G+18" → 1 (G) + 18 = 19
 *  "G+20"    → 1 + 20 = 21
 *  "G+5"     → 6
 *  "B+G+12"  → 13
 *  "25"      → 25
 *  ""        → 0
 */
export function parseFloors(input) {
  if (!input || typeof input !== 'string') return 0;

  const tokens = input.toUpperCase().split('+').map(t => t.trim());
  let aboveGround = 0;

  for (const token of tokens) {
    if (token === 'G') {
      aboveGround += 1;
    } else if (/^\d+B$/.test(token) || token === 'B') {
      // basement — skip
    } else if (/^\d+$/.test(token)) {
      aboveGround += parseInt(token, 10);
    }
    // Unknown tokens are ignored
  }

  return aboveGround;
}
