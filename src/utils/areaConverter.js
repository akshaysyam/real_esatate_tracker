/**
 * Area conversion utilities.
 * All values are normalized to ACRES for database consistency.
 *
 * Conversion factors:
 *   1 Acre = 40 Guntas
 *   1 Acre = 4046.8564 sqm
 */

const GUNTAS_PER_ACRE = 40;
const SQM_PER_ACRE = 4046.8564;

/**
 * Convert Acres + Guntas to decimal Acres.
 * @param {number} acres    - whole acres (can be 0)
 * @param {number} guntas   - additional guntas (0–39)
 * @returns {number}        - total area in decimal acres
 */
export function acresGuntasToAcres(acres = 0, guntas = 0) {
  const a = parseFloat(acres) || 0;
  const g = parseFloat(guntas) || 0;
  return a + g / GUNTAS_PER_ACRE;
}

/**
 * Convert square meters to acres.
 * @param {number} sqm
 * @returns {number}
 */
export function sqmToAcres(sqm = 0) {
  const s = parseFloat(sqm) || 0;
  return s / SQM_PER_ACRE;
}

/**
 * Format acres to a readable string with 4 decimal places.
 * @param {number} acres
 * @returns {string}
 */
export function formatAcres(acres) {
  return parseFloat(acres).toFixed(4);
}

/**
 * Compute density (units per acre).
 * @param {number} totalUnits
 * @param {number} areaInAcres
 * @returns {number}
 */
export function computeDensity(totalUnits, areaInAcres) {
  if (!areaInAcres || areaInAcres === 0) return 0;
  return parseFloat((totalUnits / areaInAcres).toFixed(2));
}
