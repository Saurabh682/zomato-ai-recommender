// Bangalore Micro-Location Coordinates Mapping & Jitter Utility

export const BANGALORE_COORDS: Record<string, [number, number]> = {
  koramangala: [12.9352, 77.6245],
  indiranagar: [12.9784, 77.6408],
  "hsr layout": [12.9121, 77.6446],
  hsr: [12.9121, 77.6446],
  whitefield: [12.9698, 77.7499],
  btm: [12.9166, 77.6101],
  "jp nagar": [12.9063, 77.5857],
  "mg road": [12.9756, 77.6066],
  "church street": [12.9744, 77.6074],
  "brigade road": [12.9738, 77.6075],
  jayanagar: [12.9308, 77.5838],
  malleshwaram: [13.0031, 77.5643],
  bellandur: [12.926, 77.6762],
  marathahalli: [12.9591, 77.6974],
  bannerghatta: [12.8946, 77.5986],
  "bannerghatta road": [12.8946, 77.5986],
  "residency road": [12.9705, 77.6012],
  "lavelle road": [12.9708, 77.5976],
  "cunningham road": [12.9868, 77.596],
  "kalyan nagar": [13.0221, 77.6403],
  "frazer town": [12.9972, 77.6136],
  "electronic city": [12.8452, 77.6602],
  basavanagudi: [12.9416, 77.5755],
  rajajinagar: [12.9915, 77.5521],
  "richmond town": [12.9615, 77.5987],
  "shanti nagar": [12.9575, 77.5965],
  "sarjapur road": [12.9242, 77.6841],
  "old airport road": [12.959, 77.6534],
  brookefield: [12.9654, 77.7185],
  kammanahalli: [13.009, 77.6375],
  banashankari: [12.9255, 77.5468],
  "new bel road": [13.0305, 77.5648],
  "vijay nagar": [12.9714, 77.5303],
  domlur: [12.9609, 77.6387],
  "sadashiv nagar": [13.0068, 77.5813],
  ulsoor: [12.9817, 77.6286],
  "vasanth nagar": [12.9882, 77.5912],
  shivajinagar: [12.9857, 77.6057],
  "commercial street": [12.9822, 77.6083],
};

const BANGALORE_DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

// Simple deterministic hash to slightly jitter pins of restaurants in the same neighbourhood
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getRestaurantCoords(
  location: string,
  restaurantName: string
): [number, number] {
  const locLower = location.toLowerCase().trim();
  let baseCoords: [number, number] = BANGALORE_DEFAULT_CENTER;

  // Match against known Bangalore micro-locations
  for (const [key, coords] of Object.entries(BANGALORE_COORDS)) {
    if (locLower.includes(key)) {
      baseCoords = coords;
      break;
    }
  }

  // Jitter offset (+-0.002 deg, roughly 100-250 meters) so pins don't overlap directly
  const h1 = (hashString(restaurantName) % 100) - 50;
  const h2 = (hashString(restaurantName + "lng") % 100) - 50;
  const latOffset = (h1 / 50) * 0.0025;
  const lngOffset = (h2 / 50) * 0.0025;

  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
}
