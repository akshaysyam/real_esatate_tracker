import { kml } from '@tmcw/togeojson';

/**
 * Parses a KML File object into GeoJSON and extracts the first coordinate pair.
 * Then reverse-geocodes via Nominatim (free, no API key).
 *
 * @param {File} file - .kml file from user input
 * @returns {Promise<{ geojson: object, address: string, lat: number, lng: number }>}
 */
export async function processKml(file) {
  // 1. Read file as text
  const text = await file.text();

  // 2. Parse XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');

  // 3. Convert KML → GeoJSON
  const geojson = kml(xmlDoc);

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    throw new Error('No features found in KML file.');
  }

  // 4. Extract first coordinate pair [lng, lat]
  const firstCoord = extractFirstCoord(geojson);
  if (!firstCoord) {
    throw new Error('Could not extract coordinates from KML.');
  }

  const [lng, lat] = firstCoord;

  // 5. Reverse geocode via Nominatim
  let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'RealEstateTracker/1.0'
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      address = data.display_name || address;
    }
  } catch (err) {
    // Silently fall back to raw coordinates
    console.warn('Nominatim geocoding failed:', err);
  }

  return { geojson, address, lat, lng };
}

/**
 * Walk the GeoJSON feature tree to find the first coordinate pair.
 * Handles Point, LineString, Polygon, MultiPolygon etc.
 */
function extractFirstCoord(geojson) {
  for (const feature of geojson.features) {
    const coord = getFirstCoordFromGeometry(feature.geometry);
    if (coord) return coord;
  }
  return null;
}

function getFirstCoordFromGeometry(geometry) {
  if (!geometry) return null;
  const { type, coordinates } = geometry;

  switch (type) {
    case 'Point':
      return coordinates; // [lng, lat]
    case 'LineString':
    case 'MultiPoint':
      return coordinates[0];
    case 'Polygon':
    case 'MultiLineString':
      return coordinates[0][0];
    case 'MultiPolygon':
      return coordinates[0][0][0];
    case 'GeometryCollection':
      for (const g of geometry.geometries) {
        const c = getFirstCoordFromGeometry(g);
        if (c) return c;
      }
      return null;
    default:
      return null;
  }
}
