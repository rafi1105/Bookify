// Coordinates of Bangladesh district towns and common bus destinations (town centre, WGS84), so
// most routes need no geocoding call. Unknown names fall back to the geocoder on the server.
export const PLACES = {
  dhaka: [23.8103, 90.4125], chattogram: [22.3569, 91.7832], "cox's bazar": [21.4272, 92.0058], sylhet: [24.8949, 91.8687],
  rajshahi: [24.3745, 88.6042], khulna: [22.8456, 89.5403], barishal: [22.701, 90.3535], rangpur: [25.7439, 89.2752],
  mymensingh: [24.7471, 90.4203], bogura: [24.8481, 89.373], cumilla: [23.4607, 91.1809], gazipur: [23.9999, 90.4203],
  narayanganj: [23.6238, 90.5], tangail: [24.2513, 89.9167], jamalpur: [24.9375, 89.9378], sherpur: [25.0205, 90.0153],
  netrokona: [24.8708, 90.7279], kishoreganj: [24.4449, 90.7766], manikganj: [23.8617, 90.0003], munshiganj: [23.5422, 90.5305],
  narsingdi: [23.9322, 90.7151], faridpur: [23.6071, 89.8429], gopalganj: [23.005, 89.8266], madaripur: [23.1641, 90.1897],
  shariatpur: [23.2423, 90.4348], rajbari: [23.7574, 89.6444], brahmanbaria: [23.9571, 91.1119], chandpur: [23.2333, 90.6713],
  lakshmipur: [22.9447, 90.8282], noakhali: [22.8696, 91.0995], feni: [23.0159, 91.3976], khagrachhari: [23.1193, 91.9847],
  rangamati: [22.6533, 92.1751], bandarban: [22.1953, 92.2184], habiganj: [24.374, 91.4155], moulvibazar: [24.4829, 91.7774],
  sunamganj: [25.0715, 91.3992], natore: [24.4206, 89.0003], naogaon: [24.7936, 88.9318], 'chapai nawabganj': [24.5965, 88.2776],
  pabna: [24.0064, 89.2372], sirajganj: [24.4534, 89.7007], joypurhat: [25.0968, 89.0227], dinajpur: [25.6217, 88.6355],
  thakurgaon: [26.0337, 88.4617], panchagarh: [26.3411, 88.5542], nilphamari: [25.931, 88.856], lalmonirhat: [25.9923, 89.2847],
  kurigram: [25.8072, 89.6295], gaibandha: [25.3297, 89.543], jashore: [23.1664, 89.2081], satkhira: [22.7185, 89.0705],
  bagerhat: [22.6516, 89.7859], narail: [23.1725, 89.5127], magura: [23.4873, 89.4199], jhenaidah: [23.545, 89.1726],
  kushtia: [23.9013, 89.1205], chuadanga: [23.6402, 88.8418], meherpur: [23.7622, 88.6318], bhola: [22.6859, 90.6482],
  patuakhali: [22.3596, 90.3299], barguna: [22.1591, 90.1262], pirojpur: [22.5841, 89.972], jhalokathi: [22.6406, 90.1987],
  kuakata: [21.8167, 90.12], teknaf: [20.862, 92.3058], benapole: [23.0423, 88.897], saidpur: [25.778, 88.8917],
  sreemangal: [24.3065, 91.7296], savar: [23.8583, 90.2667], tetulia: [26.4833, 88.35],
};

const ALIASES = {
  chittagong: 'chattogram', ctg: 'chattogram', 'coxs bazar': "cox's bazar", 'cox bazar': "cox's bazar", coxsbazar: "cox's bazar",
  bogra: 'bogura', comilla: 'cumilla', jessore: 'jashore', barisal: 'barishal', chapainawabganj: 'chapai nawabganj',
  nawabganj: 'chapai nawabganj', maulvibazar: 'moulvibazar', 'b baria': 'brahmanbaria', jhalakati: 'jhalokathi', jhalokati: 'jhalokathi',
  maijdee: 'noakhali', srimangal: 'sreemangal', netrakona: 'netrokona', khagrachari: 'khagrachhari', laxmipur: 'lakshmipur',
};

export function placeKey(name) {
  return String(name || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Coordinates for a city or stop name, or null. Accepts "Dhaka (Gabtoli)", "Bogra", "Cox's Bazar".
export function lookupPlace(name) {
  const k = placeKey(name);
  if (!k) return null;
  const direct = PLACES[k] || PLACES[ALIASES[k]] || PLACES[ALIASES[k.replace(/'/g, '')]];
  if (direct) return direct;
  const head = placeKey(String(name).split(/[(,\-–/]/)[0]);
  if (head && head !== k) { const h = lookupPlace(head); if (h) return h; }
  for (const word of k.split(' ')) if (word.length > 3 && (PLACES[word] || PLACES[ALIASES[word]])) return PLACES[word] || PLACES[ALIASES[word]];
  return null;
}
