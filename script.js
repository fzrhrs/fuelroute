// ── Fuel prices (fetched live from data.gov.my) ──
let PRICES = { ron95_general:2.60, ron95_budi95:1.99, ron97:5.15, diesel_peninsular:3.35, diesel_eastmsia:2.15 };

function refreshSubsidyLabels() {
  document.querySelectorAll('[data-sub]').forEach(btn => {
    const sub = btn.dataset.sub;
    if (sub === 'general' && PRICES.ron95_general) btn.innerHTML = 'RON95 — RM' + PRICES.ron95_general.toFixed(2) + ' (General)';
    if (sub === 'budi95'  && PRICES.ron95_budi95)  btn.innerHTML = 'RON95 — RM' + PRICES.ron95_budi95.toFixed(2) + ' (BUDI95)';
    if (sub === 'ron97'   && PRICES.ron97)          btn.innerHTML = 'RON97 — RM' + PRICES.ron97.toFixed(2);
  });
}

function refreshDieselLabels() {
  document.querySelectorAll('[data-rgn]').forEach(btn => {
    const rgn = btn.dataset.rgn;
    if (rgn === 'peninsular' && PRICES.diesel_peninsular) btn.innerHTML = 'Peninsular Malaysia — RM' + PRICES.diesel_peninsular.toFixed(2);
    if (rgn === 'eastmsia'   && PRICES.diesel_eastmsia)   btn.innerHTML = 'East Malaysia (Sabah / Sarawak / Labuan) — RM' + PRICES.diesel_eastmsia.toFixed(2);
  });
}


function renderTicker(dateStr) {
  const items = [
    { label: 'RON95 General', price: PRICES.ron95_general, cls: 't-ron95',  dot: 'dot-ron95'  },
    { label: 'RON95 BUDI95',  price: PRICES.ron95_budi95,  cls: 't-ron95',  dot: 'dot-ron95'  },
    { label: 'RON97',         price: PRICES.ron97,          cls: 't-ron97',  dot: 'dot-ron97'  },
    { label: 'Diesel (Pen)',  price: PRICES.diesel_peninsular, cls: 't-diesel', dot: 'dot-diesel' },
    { label: 'Diesel (EM)',   price: PRICES.diesel_eastmsia,   cls: 't-diesel', dot: 'dot-diesel' },
  ];

  // Build one set of items, then duplicate for seamless loop
  const buildItems = () => items.map((item, i) => `
    <span class="ticker-item">
      <span class="ticker-dot ${item.dot}"></span>
      <span class="ticker-label">${item.label}</span>
      <span class="ticker-price ${item.cls}">RM${item.price.toFixed(2)}</span>
    </span>
    ${i < items.length - 1 ? '<span class="ticker-divider"></span>' : ''}
  `).join('');

  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  document.getElementById('tickerInner').innerHTML = `
    <div class="ticker-date">Fuel prices as of <strong>${formatted}</strong></div>
    <div class="ticker-scroll-wrap">
      <div class="ticker-scroll">
        ${buildItems()}
        ${buildItems()}
      </div>
    </div>
  `;
}

async function loadFuelPrices() {
  try {
    // Correct endpoint: returns a plain JSON array, sorted latest first, filtered to level rows only
    const url = 'https://api.data.gov.my/data-catalogue?id=fuelprice&sort=-date&filter=level@series_type&limit=1';
    const res  = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Empty or unexpected response');

    const r = data[0]; // latest week's row
    if (r.ron95          != null) PRICES.ron95_general    = r.ron95;
    if (r.ron95_budi95   != null) PRICES.ron95_budi95     = r.ron95_budi95;
    if (r.ron97          != null) PRICES.ron97             = r.ron97;
    if (r.diesel         != null) PRICES.diesel_peninsular = r.diesel;
    if (r.diesel_eastmsia!= null) PRICES.diesel_eastmsia   = r.diesel_eastmsia;

    console.log('FuelRoute: live prices loaded for', r.date, PRICES);
    renderTicker(r.date);
  } catch(e) {
    console.warn('FuelRoute: could not fetch live prices, using fallback rates.', e);
    renderTicker('2026-03-26'); // fallback date
  }
  // Always refresh labels after attempt (uses fallback if fetch failed)
  refreshSubsidyLabels();
  refreshDieselLabels();
}

// ── Car data ───────────────────────────────────────────────────────────────
// Conditions index: 0=city 1=mixed 2=highway 3=hilly/mountainous
const CARS = {
  axia:      {f:'petrol', r:[10.5, 8.5,  7.0, 14.0]},
  myvi:      {f:'petrol', r:[13.0,10.5,  8.5, 16.5]},
  ativa:     {f:'petrol', r:[14.5,12.0,  9.5, 18.0]},
  saga:      {f:'petrol', r:[13.0,10.5,  8.5, 16.5]},
  x50:       {f:'petrol', r:[14.0,11.5,  9.0, 17.5]},
  x70:       {f:'petrol', r:[15.5,13.0, 10.5, 19.5]},
  city:      {f:'petrol', r:[13.0,10.5,  8.5, 16.5]},
  civic:     {f:'petrol', r:[14.0,11.5,  9.0, 17.5]},
  crv:       {f:'petrol', r:[15.5,13.0, 10.5, 19.5]},
  vios:      {f:'petrol', r:[13.5,11.0,  9.0, 17.0]},
  camry:     {f:'petrol', r:[15.0,12.5, 10.0, 19.0]},
  hilux:     {f:'diesel', r:[14.0,11.5,  9.5, 18.5]},
  fortuner_d:{f:'diesel', r:[14.5,12.0, 10.0, 19.0]},
  alphard:   {f:'petrol', r:[18.0,15.5, 13.0, 23.0]},
  hiace:     {f:'diesel', r:[14.0,11.5,  9.5, 18.5]},
  triton:    {f:'diesel', r:[15.0,12.5, 10.5, 19.5]},
  navara:    {f:'diesel', r:[14.5,12.0, 10.0, 19.0]},
  '4wd_d':   {f:'diesel', r:[20.0,17.0, 14.0, 25.5]},
};
const CI = {city:0, mixed:1, highway:2, hilly:3, mountain:3};
const LABEL = {
  petrol:'Petrol', ron95:'RON95', ron95_general:'RON95',
  ron95_budi95:'RON95 (BUDI95)', ron97:'RON97', diesel:'Diesel'
};

let cond          = 'highway';
let subsidyChoice = 'general';    // ron95 petrol grade choice
let regionChoice  = 'peninsular'; // diesel region choice

// Store last calculation results for monthly planner
let lastCalcFuelType = null;
let lastCalcPrice = null;
let lastCalcCostPerTrip = null;

function pickCond(btn) {
  document.querySelectorAll('.cond-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cond = btn.dataset.c;
}

function pickSubsidy(btn) {
  document.querySelectorAll('[data-sub]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  subsidyChoice = btn.dataset.sub;
}

function pickRegion(btn) {
  document.querySelectorAll('[data-rgn]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  regionChoice = btn.dataset.rgn;
}

function getPrice(rawFt) {
  if (rawFt === 'petrol') {
    if (subsidyChoice === 'budi95') return PRICES.ron95_budi95;
    if (subsidyChoice === 'ron97')  return PRICES.ron97;
    return PRICES.ron95_general;
  }
  if (rawFt === 'ron95_general') return PRICES.ron95_general;
  if (rawFt === 'ron95_budi95')  return PRICES.ron95_budi95;
  if (rawFt === 'ron95')         return PRICES.ron95_general;
  if (rawFt === 'ron97')         return PRICES.ron97;
  if (rawFt === 'diesel')        return regionChoice === 'eastmsia' ? PRICES.diesel_eastmsia : PRICES.diesel_peninsular;
  return 0;
}

function onCarChange() {
  const val          = document.getElementById('carType').value;
  const condWrap     = document.getElementById('condWrap');
  const manualWrap   = document.getElementById('manualWrap');
  const subsidyNotice= document.getElementById('subsidyNotice');
  const dieselRegion = document.getElementById('dieselRegion');

  if (!val) {
    condWrap.style.display = 'none';
    manualWrap.style.display = 'none';
    subsidyNotice.classList.remove('show');
    dieselRegion.classList.remove('show');
    return;
  }

  condWrap.style.display = 'block';
  const ft = val.startsWith('custom_') ? val.replace('custom_', '') : CARS[val]?.f;
  manualWrap.style.display = val.startsWith('custom_') ? 'block' : 'none';
  subsidyNotice.classList.toggle('show', ft === 'petrol' || ft === 'ron95');
  dieselRegion.classList.toggle('show',  ft === 'diesel');
}

function getCalcInputs() {
  const val = document.getElementById('carType').value;
  if (!val) throw new Error('Please select your car.');

  let l100, rawFt;
  if (val.startsWith('custom_')) {
    rawFt = val.replace('custom_', '');
    l100  = parseFloat(document.getElementById('consumption').value);
    if (!l100 || l100 < 1) throw new Error('Please enter your fuel consumption (L/100 km).');
  } else {
    rawFt = CARS[val].f;
    l100  = CARS[val].r[CI[cond]];
  }

  // Resolve 'petrol' to the user's actual chosen grade for display & price
  let ft = rawFt;
  if (rawFt === 'petrol') {
    if (subsidyChoice === 'ron97')   ft = 'ron97';
    else if (subsidyChoice === 'budi95') ft = 'ron95_budi95';
    else ft = 'ron95_general';
  }

  return { l100, ft, price: getPrice(rawFt) };
}

// ── Autocomplete ──────────────────────────────────────────────────────────
let debT;
function setupAC(inId, suId, latId, lonId) {
  const inp = document.getElementById(inId);
  const box = document.getElementById(suId);
  inp.addEventListener('input', () => {
    clearTimeout(debT);
    const q = inp.value.trim();
    if (q.length < 3) { box.classList.remove('open'); return; }
    debT = setTimeout(() => fetchAC(q, box, inp, latId, lonId), 350);
  });
  inp.addEventListener('blur', () => setTimeout(() => box.classList.remove('open'), 200));
}

async function fetchAC(q, box, inp, latId, lonId) {
  try {
    const d = await (await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=my`,
      { headers: { 'Accept-Language': 'en' } }
    )).json();
    box.innerHTML = '';
    if (!d.length) { box.classList.remove('open'); return; }
    d.forEach(p => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = p.display_name.split(',').slice(0, 3).join(', ');
      div.addEventListener('mousedown', () => {
        inp.value = div.textContent;
        document.getElementById(latId).value = p.lat;
        document.getElementById(lonId).value = p.lon;
        box.classList.remove('open');
      });
      box.appendChild(div);
    });
    box.classList.add('open');
  } catch(e) { box.classList.remove('open'); }
}

setupAC('fromInput', 'fromSugg', 'fromLat', 'fromLon');
setupAC('toInput',   'toSugg',   'toLat',   'toLon');

// ── OSRM routing ──────────────────────────────────────────────────────────
async function getDist(fLat, fLon, tLat, tLon) {
  const d = await (await fetch(
    `https://router.project-osrm.org/route/v1/driving/${fLon},${fLat};${tLon},${tLat}?overview=false`
  )).json();
  if (d.code !== 'Ok' || !d.routes.length) throw new Error('Could not find a driving route between these locations.');
  return d.routes[0].distance / 1000;
}

async function geocode(inId, latId, lonId) {
  const lat = document.getElementById(latId).value;
  const lon = document.getElementById(lonId).value;
  if (lat && lon) return { lat: +lat, lon: +lon };
  const q = document.getElementById(inId).value.trim();
  if (!q) throw new Error(`Please enter a ${inId === 'fromInput' ? 'starting point' : 'destination'}.`);
  const d = await (await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=my`,
    { headers: { 'Accept-Language': 'en' } }
  )).json();
  if (!d.length) throw new Error(`Could not find: "${q}"`);
  return { lat: +d[0].lat, lon: +d[0].lon };
}

// ── Calculate ─────────────────────────────────────────────────────────────
async function calculate() {
  const btn = document.getElementById('calcBtn');
  const err = document.getElementById('errMsg');
  const res = document.getElementById('results');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> ROUTING…';
  err.classList.remove('show');
  res.classList.remove('show');

  try {
    const { l100, ft, price } = getCalcInputs();
    const from   = await geocode('fromInput', 'fromLat', 'fromLon');
    const to     = await geocode('toInput',   'toLat',   'toLon');
    const km     = await getDist(from.lat, from.lon, to.lat, to.lon);
    const litres = (km * l100) / 100;
    const cost   = litres * price;

    // Store for monthly planner
    lastCalcFuelType = ft;
    lastCalcPrice = price;
    lastCalcCostPerTrip = cost;

    const isReturn = document.getElementById('returnTrip').checked;

    document.getElementById('resLitres').textContent    = litres.toFixed(2);
    document.getElementById('resUnit').textContent      = 'Litres — one way';
    document.getElementById('resDist').textContent      = km.toFixed(1);
    document.getElementById('resRate').textContent      = l100.toFixed(1);
    document.getElementById('resFuelType').textContent  = LABEL[ft] || ft;
    document.getElementById('resFuelPrice').textContent = 'RM' + price.toFixed(2) + ' / litre';
    document.getElementById('resCost').textContent      = 'RM ' + cost.toFixed(2);
    document.getElementById('resCostSub').textContent   = 'one way';
    document.getElementById('lblFrom').textContent      = document.getElementById('fromInput').value;
    document.getElementById('lblTo').textContent        = document.getElementById('toInput').value;

    // Return trip row
    const returnRow     = document.getElementById('returnRow');
    const returnCostBox = document.getElementById('returnCostBox');
    if (isReturn) {
      document.getElementById('resReturnLitres').textContent = (litres * 2).toFixed(2);
      document.getElementById('resReturnCost').textContent   = 'RM ' + (cost * 2).toFixed(2);
      returnRow.style.display     = 'block';
      returnCostBox.style.display = 'block';
    } else {
      returnRow.style.display     = 'none';
      returnCostBox.style.display = 'none';
    }

    // Enable and show the return toggle once we have a result
    document.getElementById('returnTrip').disabled = false;
    document.getElementById('returnToggle').classList.add('show');

    res.classList.add('show');
    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Show monthly planner for all users once result is available
    if (typeof showMonthlyPlanner === 'function') {
      showMonthlyPlanner(true);
    }
  } catch(e) {
    err.textContent = '⚠ ' + e.message;
    err.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⛽ CALCULATE FUEL';
  }
}

// ── Monthly Commute Summary ──────────────────────────────────────────────
function showMonthlyPlanner(show) {
  const planner = document.getElementById('monthlyPlanner');
  if (!planner) return;
  planner.style.display = show ? 'block' : 'none';
  if (show) calcMonthly();
}

function calcMonthly() {
  const litresPerTrip = parseFloat(document.getElementById('resLitres').textContent);
  if (!litresPerTrip || isNaN(litresPerTrip)) return;

  const tripSel    = document.getElementById('tripType').value;
  const weeks      = parseInt(document.getElementById('weeksInMonth').value);
  const extraTrips = parseInt(document.getElementById('extraTrips').value) || 0;
  const tripsPerWeek = parseInt(tripSel);

  const commuteTrips = tripsPerWeek * weeks;
  const totalTrips   = commuteTrips + extraTrips;
  const totalLitres  = totalTrips * litresPerTrip;

  // Use the actual fuel type and price from the last calculation
  const actualFuelType = lastCalcFuelType || 'ron95_general';
  const actualPrice    = lastCalcPrice || PRICES.ron95_general;
  const costPerTrip    = lastCalcCostPerTrip || 0;
  
  // Cost based on current fuel type
  const isBudi95       = actualFuelType === 'ron95_budi95';
  const BUDI_LIMIT     = 200;
  const BUDI_PRICE     = PRICES.ron95_budi95;
  const GENERAL_PRICE  = PRICES.ron95_general;

  // Calculate total cost - BUDI95 needs special handling for quota
  let totalCost, pricePerLitre;
  if (isBudi95) {
    // Recalculate for BUDI95 to account for 200L quota limit
    const budiLitres    = Math.min(totalLitres, BUDI_LIMIT);
    const generalLitres = Math.max(0, totalLitres - BUDI_LIMIT);
    totalCost = (budiLitres * BUDI_PRICE) + (generalLitres * GENERAL_PRICE);
    pricePerLitre = totalCost / totalLitres;
  } else {
    // For non-BUDI95, use cost per trip to maintain accuracy
    totalCost = totalTrips * costPerTrip;
    pricePerLitre = totalLitres > 0 ? (totalCost / totalLitres) : actualPrice;
  }

  const weeklyCost = (totalCost / weeks);
  const perTrip    = totalLitres > 0 ? (totalCost / totalTrips) : 0;
  const yearlyCost = totalCost * 12;

  // Main boxes
  document.getElementById('mTotalTrips').textContent  = totalTrips;
  document.getElementById('mTotalLitres').textContent = totalLitres.toFixed(1);
  document.getElementById('mTotalCost').textContent   = 'RM ' + totalCost.toFixed(2);
  document.getElementById('mFuelTypeNote').textContent= LABEL[actualFuelType] || actualFuelType;
  document.getElementById('mWeeklyCost').textContent  = 'RM ' + weeklyCost.toFixed(2);
  document.getElementById('mPerTrip').textContent     = 'RM ' + perTrip.toFixed(2);
  document.getElementById('mYearlyCost').textContent  = 'RM ' + yearlyCost.toFixed(0);

  // BUDI95 quota section
  const budiSection = document.getElementById('budiQuotaSection');
  if (isBudi95) {
    budiSection.style.display = 'block';
    const budiLitres    = Math.min(totalLitres, BUDI_LIMIT);
    const generalLitres = Math.max(0, totalLitres - BUDI_LIMIT);
    const budiCost      = budiLitres * BUDI_PRICE;
    const generalCost   = generalLitres * GENERAL_PRICE;
    const pct           = Math.min(100, (totalLitres / BUDI_LIMIT) * 100);
    const quotaColor    = pct >= 100 ? 'var(--accent2)' : pct >= 80 ? '#e6a817' : 'var(--accent)';

    document.getElementById('bQuotaUsed').textContent      = budiLitres.toFixed(1) + 'L';
    document.getElementById('bQuotaUsed').style.color      = quotaColor;
    document.getElementById('bCostBudi').textContent       = 'RM ' + budiCost.toFixed(2);
    document.getElementById('bLitresBudi').textContent     = budiLitres.toFixed(1) + ' litres';
    document.getElementById('bCostGeneral').textContent    = generalLitres > 0 ? 'RM ' + generalCost.toFixed(2) : 'RM 0.00';
    document.getElementById('bLitresGeneral').textContent  = generalLitres > 0 ? generalLitres.toFixed(1) + 'L over quota' : 'Within quota ✓';
    document.getElementById('bQuotaPct').textContent       = pct.toFixed(0) + '%';
    document.getElementById('bProgressBar').style.width    = pct + '%';
    document.getElementById('bProgressBar').style.background = quotaColor;

    const savingsBox  = document.getElementById('bSavingsBox');
    const fullGeneral = totalLitres * GENERAL_PRICE;
    const savings     = fullGeneral - totalCost;
    if (savings > 0) {
      savingsBox.style.display = 'block';
      savingsBox.innerHTML =
        `💚 You save <strong>RM${savings.toFixed(2)}</strong> this month with BUDI95. ` +
        `Without the subsidy, you would have paid <strong>RM${fullGeneral.toFixed(2)}</strong> ` +
        `for all ${totalLitres.toFixed(1)}L at RM${GENERAL_PRICE.toFixed(2)}/L.`;
    } else {
      savingsBox.style.display = 'none';
    }
  } else {
    budiSection.style.display = 'none';
  }

  document.getElementById('monthlyResult').style.display = 'block';
}


document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('calcBtn').disabled) calculate();
});

// Show fallback prices immediately, then attempt to load live prices
refreshSubsidyLabels();
refreshDieselLabels();
loadFuelPrices();

// ── Share Functionality ───────────────────────────────────────────────────
function shareResult() {
  const modal = document.getElementById('shareModal');
  
  // Populate share card with current results
  const from = document.getElementById('fromInput').value;
  const to = document.getElementById('toInput').value;
  const litres = document.getElementById('resLitres').textContent;
  const cost = document.getElementById('resCost').textContent;
  const dist = document.getElementById('resDist').textContent;
  const fuelType = document.getElementById('resFuelType').textContent;
  const isReturn = document.getElementById('returnTrip').checked;
  
  // Get vehicle name
  const carSelect = document.getElementById('carType');
  const vehicleName = carSelect.options[carSelect.selectedIndex].text;
  
  document.getElementById('shareFrom').textContent = from;
  document.getElementById('shareTo').textContent = to;
  document.getElementById('shareLitres').textContent = litres;
  document.getElementById('shareCost').textContent = cost;
  document.getElementById('shareDist').textContent = dist + ' km';
  document.getElementById('shareVehicle').textContent = vehicleName;
  document.getElementById('shareFuelType').textContent = fuelType;
  document.getElementById('shareUnit').textContent = isReturn ? 'litres (return)' : 'litres (one way)';
  
  const today = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('shareDate').textContent = today;
  
  modal.classList.add('show');
}

function closeShareModal() {
  document.getElementById('shareModal').classList.remove('show');
}

function shareWhatsApp() {
  const from = document.getElementById('fromInput').value;
  const to = document.getElementById('toInput').value;
  const litres = document.getElementById('resLitres').textContent;
  const cost = document.getElementById('resCost').textContent;
  const dist = document.getElementById('resDist').textContent;
  const fuelType = document.getElementById('resFuelType').textContent;
  const isReturn = document.getElementById('returnTrip').checked;
  
  const tripType = isReturn ? 'Return Trip' : 'One-Way Trip';
  
  const message = `🚗 *FuelRoute Trip Estimate*\n\n` +
    `📍 *Route:* ${from} → ${to}\n` +
    `📏 *Distance:* ${dist} km\n` +
    `⛽ *Fuel Required:* ${litres}L ${isReturn ? '(return)' : '(one way)'}\n` +
    `💰 *Est. Cost:* ${cost}\n` +
    `🚙 *Fuel Type:* ${fuelType}\n\n` +
    `Calculated via FuelRoute — Fuel cost calculator for Malaysia`;
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

function copyShareText() {
  const from = document.getElementById('fromInput').value;
  const to = document.getElementById('toInput').value;
  const litres = document.getElementById('resLitres').textContent;
  const cost = document.getElementById('resCost').textContent;
  const dist = document.getElementById('resDist').textContent;
  const fuelType = document.getElementById('resFuelType').textContent;
  const isReturn = document.getElementById('returnTrip').checked;
  
  const carSelect = document.getElementById('carType');
  const vehicleName = carSelect.options[carSelect.selectedIndex].text;
  
  const text = `FuelRoute Trip Estimate\n\n` +
    `Route: ${from} → ${to}\n` +
    `Distance: ${dist} km\n` +
    `Fuel Required: ${litres}L ${isReturn ? '(return)' : '(one way)'}\n` +
    `Est. Cost: ${cost}\n` +
    `Vehicle: ${vehicleName}\n` +
    `Fuel Type: ${fuelType}\n\n` +
    `Calculated via FuelRoute — Fuel cost calculator for Malaysia`;
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard');
  });
}

function downloadCard() {
  // For now, we'll use html2canvas library to convert the card to image
  // This is a placeholder - you'll need to include html2canvas library
  alert('Download feature coming soon! For now, you can take a screenshot of the summary card or use WhatsApp/Copy options.');
}

// Close modal on escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeShareModal();
});