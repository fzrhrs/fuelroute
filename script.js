// ── Fuel prices (fetched live from data.gov.my, fallback to last known rates) ──
let PRICES = { ron95_general:2.60, ron95_budi95:1.99, ron97:3.40, diesel_peninsular:3.35, diesel_eastmsia:2.15 };

function refreshSubsidyLabels() {
  // Update button labels with live prices
  const btns = document.querySelectorAll('[data-sub]');
  btns.forEach(btn => {
    const sub = btn.dataset.sub;
    if (sub === 'general') btn.innerHTML = 'RON95 — RM' + PRICES.ron95_general.toFixed(2) + ' (General)';
    if (sub === 'budi95')  btn.innerHTML = 'RON95 — RM' + PRICES.ron95_budi95.toFixed(2) + ' (BUDI95)';
    if (sub === 'ron97')   btn.innerHTML = 'RON97 — RM' + PRICES.ron97.toFixed(2);
  });
  const el = document.getElementById('ron97PriceLabel');
  if (el) el.textContent = 'RM' + PRICES.ron97.toFixed(2);
}

async function loadFuelPrices() {
  try {
    const res  = await fetch('https://api.data.gov.my/data-catalogue?id=fuelprice&sort=-date&filter=series_type@level&limit=1');
    const data = await res.json();
    if (!data || !data.length) throw new Error('empty');
    const r = data[0];
    if (r.ron95          != null) PRICES.ron95_general    = r.ron95;
    if (r.ron95_budi95   != null) PRICES.ron95_budi95     = r.ron95_budi95;
    if (r.ron97          != null) PRICES.ron97             = r.ron97;
    if (r.diesel         != null) PRICES.diesel_peninsular = r.diesel;
    if (r.diesel_eastmsia!= null) PRICES.diesel_eastmsia   = r.diesel_eastmsia;
    // Refresh badge in case car was already selected before prices loaded
    const v = document.getElementById('carType').value;
  } catch(e) {
    // Silently fall back to hardcoded last-known rates — no UI shown
    console.warn('FuelRoute: could not fetch live prices, using fallback.', e);
  }
  refreshSubsidyLabels();
}

// ── Car data ───────────────────────────────────────────────────────────────
// Conditions index: 0=city 1=mixed 2=highway 3=hilly/mountainous
const CARS = {
  axia:      {f:'petrol',  r:[10.5, 8.5,  7.0, 14.0]},
  myvi:      {f:'petrol',  r:[13.0,10.5,  8.5, 16.5]},
  ativa:     {f:'petrol',  r:[14.5,12.0,  9.5, 18.0]},
  saga:      {f:'petrol',  r:[13.0,10.5,  8.5, 16.5]},
  x50:       {f:'petrol', r:[14.0,11.5,  9.0, 17.5]},
  x70:       {f:'petrol', r:[15.5,13.0, 10.5, 19.5]},
  city:      {f:'petrol',  r:[13.0,10.5,  8.5, 16.5]},
  civic:     {f:'petrol',  r:[14.0,11.5,  9.0, 17.5]},
  crv:       {f:'petrol', r:[15.5,13.0, 10.5, 19.5]},
  vios:      {f:'petrol',  r:[13.5,11.0,  9.0, 17.0]},
  camry:     {f:'petrol',  r:[15.0,12.5, 10.0, 19.0]},
  hilux:     {f:'diesel', r:[14.0,11.5,  9.5, 18.5]},
  fortuner_d:{f:'diesel', r:[14.5,12.0, 10.0, 19.0]},
  alphard:   {f:'petrol', r:[18.0,15.5, 13.0, 23.0]},
  hiace:     {f:'diesel', r:[14.0,11.5,  9.5, 18.5]},
  triton:    {f:'diesel', r:[15.0,12.5, 10.5, 19.5]},
  navara:    {f:'diesel', r:[14.5,12.0, 10.0, 19.0]},
  '4wd_d':   {f:'diesel', r:[20.0,17.0, 14.0, 25.5]},
};
const CI = {city:0,mixed:1,highway:2,hilly:3};
const LABEL = {petrol:'Petrol',ron95:'RON95',ron95_general:'RON95',ron95_budi95:'RON95 (BUDI95)',ron97:'RON97',diesel:'Diesel'};
const PCLS  = {petrol:'pill-ron95',ron95:'pill-ron95',ron97:'pill-ron97',diesel:'pill-diesel'};

let cond      = 'highway';
let subsidyChoice = 'general';   // for RON95
let regionChoice  = 'peninsular'; // for diesel

function pickCond(btn) {
  document.querySelectorAll('.cond-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); cond = btn.dataset.c;
}

function pickSubsidy(btn) {
  document.querySelectorAll('[data-sub]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); subsidyChoice = btn.dataset.sub;
}

function pickRegion(btn) {
  document.querySelectorAll('[data-rgn]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); regionChoice = btn.dataset.rgn;
  updateBadge(document.getElementById('carType').value);
}

function getPrice(fuelType) {
  if (fuelType === 'petrol') {
    if (subsidyChoice === 'budi95') return PRICES.ron95_budi95;
    if (subsidyChoice === 'ron97')  return PRICES.ron97;
    return PRICES.ron95_general;
  }
  if (fuelType === 'ron95_general') return PRICES.ron95_general;
  if (fuelType === 'ron95_budi95')  return PRICES.ron95_budi95;
  if (fuelType === 'ron95')  return PRICES.ron95_general;
  if (fuelType === 'ron97')  return PRICES.ron97;
  if (fuelType === 'diesel') return regionChoice === 'eastmsia' ? PRICES.diesel_eastmsia : PRICES.diesel_peninsular;
  return 0;
}


function onCarChange() {
  const val = document.getElementById('carType').value;
  const condWrap     = document.getElementById('condWrap');
  const manualWrap   = document.getElementById('manualWrap');
  const subsidyNotice= document.getElementById('subsidyNotice');
  const dieselRegion = document.getElementById('dieselRegion');

  if (!val) {
    condWrap.style.display='none'; manualWrap.style.display='none';
    subsidyNotice.classList.remove('show'); dieselRegion.classList.remove('show');
    return;
  }

  condWrap.style.display = 'block';
  const ft = val.startsWith('custom_') ? val.replace('custom_','') : CARS[val]?.f;
  manualWrap.style.display   = val.startsWith('custom_') ? 'block' : 'none';
  subsidyNotice.classList.toggle('show', ft === 'petrol' || ft === 'ron95');
  dieselRegion.classList.toggle('show',  ft === 'diesel');
}

function getCalcInputs() {
  const val = document.getElementById('carType').value;
  if (!val) throw new Error('Please select your car.');
  let l100, rawFt;
  if (val.startsWith('custom_')) {
    rawFt = val.replace('custom_','');
    l100  = parseFloat(document.getElementById('consumption').value);
    if (!l100||l100<1) throw new Error('Please enter your fuel consumption (L/100 km).');
  } else {
    rawFt = CARS[val].f;
    l100  = CARS[val].r[CI[cond]];
  }
  // Resolve 'petrol' to the user's actual chosen grade
  let ft = rawFt;
  if (rawFt === 'petrol') {
    if (subsidyChoice === 'ron97')   ft = 'ron97';
    else if (subsidyChoice === 'budi95') ft = 'ron95_budi95';
    else ft = 'ron95_general';
  }
  return {l100, ft, price: getPrice(rawFt)};
}

// ── Autocomplete ──────────────────────────────────────────────────────────
let debT;
function setupAC(inId,suId,latId,lonId) {
  const inp=document.getElementById(inId), box=document.getElementById(suId);
  inp.addEventListener('input',()=>{
    clearTimeout(debT); const q=inp.value.trim();
    if(q.length<3){box.classList.remove('open');return;}
    debT=setTimeout(()=>fetchAC(q,box,inp,latId,lonId),350);
  });
  inp.addEventListener('blur',()=>setTimeout(()=>box.classList.remove('open'),200));
}
async function fetchAC(q,box,inp,latId,lonId) {
  try {
    const d=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=my`,{headers:{'Accept-Language':'en'}})).json();
    box.innerHTML='';
    if(!d.length){box.classList.remove('open');return;}
    d.forEach(p=>{
      const div=document.createElement('div');div.className='suggestion-item';
      div.textContent=p.display_name.split(',').slice(0,3).join(', ');
      div.addEventListener('mousedown',()=>{
        inp.value=div.textContent;
        document.getElementById(latId).value=p.lat;
        document.getElementById(lonId).value=p.lon;
        box.classList.remove('open');
      });
      box.appendChild(div);
    });
    box.classList.add('open');
  } catch(e){box.classList.remove('open');}
}
setupAC('fromInput','fromSugg','fromLat','fromLon');
setupAC('toInput',  'toSugg',  'toLat',  'toLon');

// ── OSRM ─────────────────────────────────────────────────────────────────
async function getDist(fLat,fLon,tLat,tLon) {
  const d=await(await fetch(`https://router.project-osrm.org/route/v1/driving/${fLon},${fLat};${tLon},${tLat}?overview=false`)).json();
  if(d.code!=='Ok'||!d.routes.length) throw new Error('Could not find a driving route between these locations.');
  return d.routes[0].distance/1000;
}

async function geocode(inId,latId,lonId) {
  const lat=document.getElementById(latId).value, lon=document.getElementById(lonId).value;
  if(lat&&lon) return{lat:+lat,lon:+lon};
  const q=document.getElementById(inId).value.trim();
  if(!q) throw new Error(`Please enter a ${inId==='fromInput'?'starting point':'destination'}.`);
  const d=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=my`,{headers:{'Accept-Language':'en'}})).json();
  if(!d.length) throw new Error(`Could not find: "${q}"`);
  return{lat:+d[0].lat,lon:+d[0].lon};
}

// ── Calculate ─────────────────────────────────────────────────────────────
async function calculate() {
  const btn=document.getElementById('calcBtn'),err=document.getElementById('errMsg'),res=document.getElementById('results');
  btn.disabled=true; btn.innerHTML='<div class="spinner"></div> ROUTING…';
  err.classList.remove('show'); res.classList.remove('show');
  try {
    const {l100,ft,price} = getCalcInputs();
    const from = await geocode('fromInput','fromLat','fromLon');
    const to   = await geocode('toInput',  'toLat',  'toLon');
    const km   = await getDist(from.lat,from.lon,to.lat,to.lon);
    const litres = (km * l100) / 100;
    const cost   = litres * price;
    document.getElementById('resLitres').textContent   = litres.toFixed(2);
    document.getElementById('resDist').textContent     = km.toFixed(1);
    document.getElementById('resRate').textContent     = l100.toFixed(1);
    document.getElementById('resFuelType').textContent = LABEL[ft] || ft;
    document.getElementById('resFuelPrice').textContent = 'RM' + price.toFixed(2) + ' / litre';
    document.getElementById('resCost').textContent     = 'RM '+cost.toFixed(2);
    document.getElementById('lblFrom').textContent     = document.getElementById('fromInput').value.split(',')[0];
    document.getElementById('lblTo').textContent       = document.getElementById('toInput').value.split(',')[0];
    res.classList.add('show');
    res.scrollIntoView({behavior:'smooth',block:'nearest'});
    // Show BUDI planner only if user selected BUDI95
    showBudiPlanner(subsidyChoice === 'budi95');
  } catch(e){
    err.textContent='⚠ '+e.message; err.classList.add('show');
  } finally {
    btn.disabled=false; btn.innerHTML='⛽ CALCULATE FUEL';
  }
}


// ── BUDI95 Monthly Planner ─────────────────────────────────────────────────
function showBudiPlanner(show) {
  document.getElementById('budiPlanner').style.display = show ? 'block' : 'none';
  if (show) calcBudi();
}

function calcBudi() {
  const litresPerTrip = parseFloat(document.getElementById('resLitres').textContent);
  if (!litresPerTrip || isNaN(litresPerTrip)) return;

  const tripType    = document.getElementById('tripType').value;
  const workDays    = parseInt(document.getElementById('workDays').value);
  const weeks       = parseInt(document.getElementById('weeksInMonth').value);
  const extraTrips  = parseInt(document.getElementById('extraTrips').value) || 0;

  const tripsPerDay    = tripType === 'roundtrip' ? 2 : 1;
  const commuteTrips   = workDays * weeks * tripsPerDay;
  const totalTrips     = commuteTrips + extraTrips;
  const totalLitres    = totalTrips * litresPerTrip;

  const BUDI_LIMIT     = 200;
  const BUDI_PRICE     = PRICES.ron95_budi95;
  const GENERAL_PRICE  = PRICES.ron95_general;

  const budiLitres     = Math.min(totalLitres, BUDI_LIMIT);
  const generalLitres  = Math.max(0, totalLitres - BUDI_LIMIT);

  const budiCost       = budiLitres * BUDI_PRICE;
  const generalCost    = generalLitres * GENERAL_PRICE;
  const totalCost      = budiCost + generalCost;

  const pct            = Math.min(100, (totalLitres / BUDI_LIMIT) * 100);
  const quotaColor     = pct >= 100 ? 'var(--accent2)' : pct >= 80 ? '#e6a817' : 'var(--accent)';

  document.getElementById('bTotalTrips').textContent    = totalTrips;
  document.getElementById('bTotalLitres').textContent   = totalLitres.toFixed(1);
  document.getElementById('bQuotaUsed').textContent     = budiLitres.toFixed(1) + 'L';
  document.getElementById('bQuotaUsed').style.color     = quotaColor;
  document.getElementById('bQuotaPct').textContent      = pct.toFixed(0) + '%';
  document.getElementById('bProgressBar').style.width   = pct + '%';
  document.getElementById('bProgressBar').style.background = quotaColor;

  document.getElementById('bCostBudi').textContent      = 'RM ' + budiCost.toFixed(2);
  document.getElementById('bLitresBudi').textContent    = budiLitres.toFixed(1) + ' litres';
  document.getElementById('bCostGeneral').textContent   = generalLitres > 0 ? 'RM ' + generalCost.toFixed(2) : 'RM 0.00';
  document.getElementById('bLitresGeneral').textContent = generalLitres > 0 ? generalLitres.toFixed(1) + ' litres (over quota)' : 'Within quota';
  document.getElementById('bTotalCost').textContent     = 'RM ' + totalCost.toFixed(2);

  // Savings vs if you paid general price for everything
  const savingsBox   = document.getElementById('bSavingsBox');
  const fullGeneral  = totalLitres * GENERAL_PRICE;
  const savings      = fullGeneral - totalCost;
  if (savings > 0) {
    savingsBox.style.display = 'block';
    savingsBox.innerHTML =
      `💚 You save <strong>RM${savings.toFixed(2)}</strong> this month with BUDI95. ` +
      `Without the subsidy, you would have paid <strong>RM${fullGeneral.toFixed(2)}</strong> for all ${totalLitres.toFixed(1)}L at the full general price of RM${GENERAL_PRICE.toFixed(2)}/L.`;
  } else {
    savingsBox.style.display = 'none';
  }

  document.getElementById('budiResult').style.display = 'block';
}

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!document.getElementById('calcBtn').disabled)calculate();});

refreshSubsidyLabels();
loadFuelPrices();
