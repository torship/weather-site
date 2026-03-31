const apiKey = ""; // Do NOT change this. Automatically injected by execution environment.

let isCelsius = true;
let currentData = null;
let currentLoc = { lat: 51.5074, lon: -0.1278, name: "London, UK" };
let favorites = JSON.parse(localStorage.getItem("skyglass_premium_favs")) || [];

let autoRefreshTimer = null;
let aiTimeout = null; // Prevent AI spam calls

const wCodes = {
  0: { d: "Clear sky", ic: "ph-sun", in: "ph-moon", anim: "anim-clear" },
  1: {
    d: "Mostly clear",
    ic: "ph-cloud-sun",
    in: "ph-cloud-moon",
    anim: "anim-clouds",
  },
  2: {
    d: "Partly cloudy",
    ic: "ph-cloud",
    in: "ph-cloud",
    anim: "anim-clouds",
  },
  3: { d: "Overcast", ic: "ph-clouds", in: "ph-clouds", anim: "anim-clouds" },
  45: { d: "Fog", ic: "ph-cloud-fog", in: "ph-cloud-fog", anim: "anim-clouds" },
  48: {
    d: "Depositing rime fog",
    ic: "ph-cloud-fog",
    in: "ph-cloud-fog",
    anim: "anim-clouds",
  },
  51: {
    d: "Light drizzle",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  53: {
    d: "Moderate drizzle",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  55: {
    d: "Dense drizzle",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  61: {
    d: "Slight rain",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  63: {
    d: "Moderate rain",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  65: {
    d: "Heavy rain",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  71: {
    d: "Slight snow",
    ic: "ph-snowflake",
    in: "ph-snowflake",
    anim: "anim-clouds",
  },
  73: {
    d: "Moderate snow",
    ic: "ph-snowflake",
    in: "ph-snowflake",
    anim: "anim-clouds",
  },
  75: {
    d: "Heavy snow",
    ic: "ph-snowflake",
    in: "ph-snowflake",
    anim: "anim-clouds",
  },
  80: {
    d: "Slight rain showers",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  81: {
    d: "Moderate rain showers",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  82: {
    d: "Violent rain showers",
    ic: "ph-cloud-rain",
    in: "ph-cloud-rain",
    anim: "anim-rain",
  },
  95: {
    d: "Thunderstorm",
    ic: "ph-cloud-lightning",
    in: "ph-cloud-lightning",
    anim: "anim-lightning",
  },
  96: {
    d: "Thunderstorm + Hail",
    ic: "ph-cloud-lightning",
    in: "ph-cloud-lightning",
    anim: "anim-lightning",
  },
  99: {
    d: "Heavy Thunderstorm + Hail",
    ic: "ph-cloud-lightning",
    in: "ph-cloud-lightning",
    anim: "anim-lightning",
  },
};

const getCode = (c) => wCodes[c] || wCodes[0];
const convT = (c) => (isCelsius ? Math.round(c) : Math.round((c * 9) / 5 + 32));

window.onload = () => {
  initSkeletons();
  setupObservers();
  updateFavDrawer();
  getLocation();
  setupSwipeAndKeyboard();
};

function initSkeletons() {
  let h = "";
  for (let i = 0; i < 7; i++)
    h += `<div class="daily-item skeleton" style="height: 40px; border:none; margin-bottom: 10px;"></div>`;
  document.getElementById("dailyContainer").innerHTML = h;
}

function setupObservers() {
  const obs = new IntersectionObserver(
    (ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("active");
          e.target.style.transitionDelay = `${Math.random() * 0.15}s`;
        }
      });
    },
    { threshold: 0.05 },
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

function getLocation() {
  setSkeletons(true);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (p) => fetchAll(p.coords.latitude, p.coords.longitude),
      (e) => {
        console.warn("Geolocation blocked/failed, using default.");
        fetchAll(51.5074, -0.1278);
      },
    );
  } else {
    fetchAll(51.5074, -0.1278);
  }
}

function useCurrentLocation() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  scrollToTop();
  getLocation();
}

async function handleSearch(e) {
  if (e.key === "Enter" && e.target.value) {
    setSkeletons(true);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${e.target.value}&count=1&format=json`,
      );
      const d = await r.json();
      if (d.results?.length > 0) {
        fetchAll(
          d.results[0].latitude,
          d.results[0].longitude,
          `${d.results[0].name}, ${d.results[0].countryCode || ""}`,
        );
      } else {
        alert("City not found.");
        setSkeletons(false);
      }
    } catch (err) {
      console.error(err);
      setSkeletons(false);
    }
    e.target.value = "";
  }
}

function buildLocationLabel(parts = {}) {
  const primary =
    parts.city ||
    parts.town ||
    parts.village ||
    parts.hamlet ||
    parts.suburb ||
    parts.county ||
    parts.state_district ||
    parts.state;

  const secondary =
    parts.state ||
    parts.region ||
    (parts.country_code ? String(parts.country_code).toUpperCase() : null) ||
    parts.country;

  if (primary && secondary && primary !== secondary) {
    return `${primary}, ${secondary}`;
  }

  return primary || secondary || null;
}

async function getCityName(lat, lon) {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&format=json`,
    );
    if (r.ok) {
      const d = await r.json();
      if (d.results?.length > 0) {
        const place = d.results[0];
        return buildLocationLabel({
          city: place.name,
          state: place.admin1,
          country_code: place.countryCode,
          country: place.country,
        });
      }
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    );
    if (res.ok) {
      const data = await res.json();
      const label =
        buildLocationLabel(data.address) ||
        data.name ||
        data.display_name?.split(",").slice(0, 2).join(", ").trim();

      if (label) return label;
    }

    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const label = buildLocationLabel({
        city:
          bdcData.city ||
          bdcData.locality ||
          bdcData.localityInfo?.administrative?.[0]?.name,
        state: bdcData.principalSubdivision,
        country: bdcData.countryName,
        country_code: bdcData.countryCode,
      });

      if (label) return label;
    }
  } catch (e) {
    console.warn("Reverse geocoding failed", e);
  }
  return "Current Location";
}

async function getWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,pressure_msl,visibility&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API Error");
  return await res.json();
}

async function getAQIData(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,uv_index&current=us_aqi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("AQI API Error");
  return await res.json();
}

// =========================================
// AI BRAIN LOGIC
// =========================================
async function fetchWithRetry(url, options, retries = 5) {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((res) => setTimeout(res, delays[i]));
    }
  }
}

async function getAIInsights(data, type = "general") {
  let prompt = "";

  if (type === "general") {
    prompt = `You are an intelligent weather assistant.
                
                Weather:
                Temp: ${data.temp}
                Feels like: ${data.feels}
                Condition: ${data.condition}
                Wind: ${data.wind}
                Humidity: ${data.humidity}
                UV: ${data.uv}
                AQI: ${data.aqi}
                Rain chance: ${data.precip}
                
                Give:
                1 short summary
                should user go outside
                any warning
                
                Keep response under 60 words.`;
  } else if (type === "outfit") {
    prompt = `Suggest outfit: temp ${data.temp}, rain ${data.precip}, wind ${data.wind}. Return 1 line only.`;
  }
  // Note: Using the environment's required model endpoint (2.5-flash-preview)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  try {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("No text returned");
    return resultText;
  } catch (e) {
    console.error("AI Error:", e);
    // Fallback if Gemini fails
    return type === "general"
      ? "Weather looks normal today. Good time to go outside."
      : "Wear comfortable clothes suitable for the current temperature.";
  }
}

async function fetchAll(lat, lon, cityName = null) {
  try {
    if (!cityName) cityName = await getCityName(lat, lon);
    currentLoc = { lat, lon, name: cityName };
    checkFav();

    const [wData, aData] = await Promise.all([
      getWeatherData(lat, lon),
      getAQIData(lat, lon),
    ]);

    currentData = { w: wData, a: aData };
    updateUI();

    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = setTimeout(
      () => {
        fetchAll(lat, lon, cityName);
      },
      10 * 60 * 1000,
    );
  } catch (err) {
    console.error("Fetch Error:", err);
    document.getElementById("cityName").textContent = "Data Error";
    document.getElementById("currentDesc").textContent =
      "Failed to load weather data.";
    setSkeletons(false);
  }
}

function updateUI() {
  if (!currentData || !currentData.w || !currentData.w.current) return;

  const cur = currentData.w.current;
  const dai = currentData.w.daily || {};
  const aqi = currentData.a?.current?.us_aqi || 0;
  const isDay = cur.is_day === 1;
  const tempDisplay =
    cur.temperature_2m !== undefined ? `${convT(cur.temperature_2m)}°` : "--°";

  document.title = `${tempDisplay} - ${currentLoc.name} | SkyGlass`;

  setBg(cur.temperature_2m, isDay);
  getWeatherAnimation(cur.weather_code, isDay);

  document.getElementById("cityName").textContent = currentLoc.name;
  document.getElementById("currentTemp").textContent = tempDisplay;
  document.getElementById("currentDesc").textContent = getCode(
    cur.weather_code,
  ).d;

  const tMax =
    dai.temperature_2m_max?.[0] !== undefined
      ? convT(dai.temperature_2m_max[0])
      : "--";
  const tMin =
    dai.temperature_2m_min?.[0] !== undefined
      ? convT(dai.temperature_2m_min[0])
      : "--";
  document.getElementById("highLow").innerHTML =
    `H: ${tMax}° &nbsp;&nbsp; L: ${tMin}°`;

  document.getElementById("feelsLike").textContent =
    cur.apparent_temperature !== undefined
      ? `Feels like ${convT(cur.apparent_temperature)}°`
      : "Feels like --°";

  const alert = document.getElementById("weatherAlert");
  alert.style.display = cur.weather_code >= 95 ? "flex" : "none";

  document.getElementById("windVal").textContent =
    cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) : "--";
  document.getElementById("humidityVal").textContent =
    cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m : "--";
  document.getElementById("pressureVal").textContent =
    cur.pressure_msl !== undefined ? Math.round(cur.pressure_msl) : "--";
  document.getElementById("visVal").textContent =
    cur.visibility !== undefined ? (cur.visibility / 1000).toFixed(1) : "--";

  let uv = 0;
  if (currentData.a?.hourly?.uv_index) {
    const now = new Date();
    const hrIdx =
      currentData.a.hourly.time.findIndex((t) => new Date(t) > now) - 1;
    uv = hrIdx >= 0 ? currentData.a.hourly.uv_index[hrIdx] : 0;
  }

  document.getElementById("uvVal").textContent = uv ? uv.toFixed(1) : "0.0";
  let uC = "#34d399",
    uT = "Low";
  if (uv > 3) {
    uC = "#fbbf24";
    uT = "Moderate";
  }
  if (uv > 7) {
    uC = "#fb7185";
    uT = "High";
  }
  document.getElementById("uvDesc").textContent = uT;
  document.getElementById("uvDesc").style.color = uC;

  document.getElementById("aqiVal").textContent = aqi;
  let aC = "#34d399",
    aT = "Good";
  if (aqi > 50) {
    aC = "#fbbf24";
    aT = "Moderate";
  }
  if (aqi > 100) {
    aC = "#fb7185";
    aT = "Poor";
  }
  document.getElementById("aqiVal").style.color = aC;
  document.getElementById("aqiDesc").textContent = aT;

  if (currentData.w.hourly && currentData.w.hourly.time) {
    renderSmoothChart(currentData.w.hourly);
  }
  if (dai && dai.time) {
    renderDaily(dai);
    updateSolar(dai.sunrise?.[0], dai.sunset?.[0]);
  }

  let precip = 0;
  if (currentData.w.hourly?.precipitation_probability) {
    precip = currentData.w.hourly.precipitation_probability[0];
  }
  calcComfort(cur.temperature_2m, precip, cur.wind_speed_10m);

  // Fetch AI Insights with Debounce
  const aiContainer = document.getElementById("aiInsights");
  const outfitContainer = document.getElementById("aiOutfit");

  aiContainer.classList.add("skeleton");
  outfitContainer.classList.add("skeleton");
  aiContainer.textContent = "Analyzing atmospheric conditions...";
  outfitContainer.textContent = "Recommending attire...";

  clearTimeout(aiTimeout);
  aiTimeout = setTimeout(() => {
    const aiData = {
      temp: convT(cur.temperature_2m),
      feels: convT(cur.apparent_temperature),
      condition: getCode(cur.weather_code).d,
      wind: Math.round(cur.wind_speed_10m),
      humidity: cur.relative_humidity_2m,
      uv: document.getElementById("uvVal").textContent,
      aqi: document.getElementById("aqiVal").textContent,
      precip: precip,
    };

    // General Summary
    getAIInsights(aiData, "general").then((text) => {
      aiContainer.classList.remove("skeleton");
      aiContainer.textContent = text;
    });

    // Outfit Suggestion
    getAIInsights(aiData, "outfit").then((text) => {
      outfitContainer.classList.remove("skeleton");
      outfitContainer.textContent = text;
    });
  }, 800);

  setTimeout(() => {
    document
      .querySelectorAll(".reveal")
      .forEach((el) => el.classList.add("active"));
  }, 50);
  setSkeletons(false);
}

function setBg(t, isDay) {
  const r = document.documentElement;
  document.body.classList.toggle("dark-theme", !isDay);
  if (isDay) {
    if (t <= 5) {
      r.style.setProperty("--bg-top", "#a1c4fd");
      r.style.setProperty("--bg-bottom", "#c2e9fb");
    } else if (t <= 18) {
      r.style.setProperty("--bg-top", "#4facfe");
      r.style.setProperty("--bg-bottom", "#00f2fe");
    } else if (t <= 28) {
      r.style.setProperty("--bg-top", "#f6d365");
      r.style.setProperty("--bg-bottom", "#fda085");
    } else {
      r.style.setProperty("--bg-top", "#ff0844");
      r.style.setProperty("--bg-bottom", "#ffb199");
    }
  } else {
    r.style.setProperty("--bg-top", "#0f2027");
    r.style.setProperty("--bg-bottom", "#203a43");
  }
}

// --- Smooth Bezier Curve Chart Engine ---
function renderSmoothChart(hourly) {
  const svg = document.getElementById("hourlySvg");
  const lbls = document.getElementById("chartLabels");
  lbls.innerHTML = "";

  if (!hourly.time || hourly.time.length === 0) return;

  const now = hourly.time.findIndex((t) => new Date(t) >= new Date());
  const startIdx = now > -1 ? now : 0;
  const pts = Math.min(24, hourly.time.length - startIdx);

  if (pts <= 0) return;

  const temps = hourly.temperature_2m.slice(startIdx, startIdx + pts);
  const codes = hourly.weather_code.slice(startIdx, startIdx + pts);
  const times = hourly.time.slice(startIdx, startIdx + pts);

  const min = Math.min(...temps),
    max = Math.max(...temps),
    range = max - min || 1;
  const w = 800,
    h = 160,
    p = 30;

  let path = `M 0,${h} L 0,${p + ((max - temps[0]) / range) * (h - p * 2)}`;
  let coords = [];

  for (let i = 0; i < pts; i++) {
    const x = (i / (pts - 1)) * w;
    const y = p + ((max - temps[i]) / range) * (h - p * 2);
    coords.push({ x, y });

    // UI FIX 2: Fixed chart label overlapping by changing to 4
    if (i % 4 === 0) {
      const dt = new Date(times[i]);
      const ts = i === 0 ? "Now" : dt.getHours() + ":00";
      const isD = dt.getHours() > 5 && dt.getHours() < 19;
      const ic = isD ? getCode(codes[i]).ic : getCode(codes[i]).in;

      lbls.innerHTML += `
                        <div class="chart-label" style="left: ${(x / w) * 100}%; top: ${y - 40}px;">
                            ${convT(temps[i])}°
                            <i class="ph ${ic}"></i>
                            <span class="time">${ts}</span>
                        </div>`;
    }
  }

  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i],
      next = coords[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    path += ` C ${cp1x},${curr.y} ${cp2x},${next.y} ${next.x},${next.y}`;
  }

  const fillPath = path + ` L ${w},${h} Z`;

  svg.innerHTML = `
                <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>
                <!-- Area Fill -->
                <path d="${fillPath}" fill="url(#cGrad)" />
                <!-- Smooth Stroke -->
                <path d="${path.replace(`M 0,${h} L `, "M ")}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3" stroke-linecap="round" />
            `;
}

function updateSolar(riseStr, setStr) {
  if (!riseStr || !setStr) return;
  const now = new Date(),
    rise = new Date(riseStr),
    set = new Date(setStr);
  document.getElementById("sunriseTime").textContent = rise.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" },
  );
  document.getElementById("sunsetTime").textContent = set.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" },
  );

  let prg = 0;
  if (now > rise && now < set) prg = (now - rise) / (set - rise);
  else if (now >= set) prg = 1;

  const ang = prg * Math.PI;
  const x = 50 - Math.cos(ang) * 50;
  const y = 80 - Math.sin(ang) * 80;

  const orb = document.getElementById("sunOrb");
  orb.style.left = `calc(${x}% + 0px)`;
  orb.style.top = `${y}px`;
}

function calcComfort(t, p, w) {
  if (t === undefined) return;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          3 * Math.abs(t - 21) -
          0.5 * (p || 0) -
          (w > 15 ? (w - 15) * 1.5 : 0),
      ),
    ),
  );
  document.getElementById("comfortScore").textContent = score;
  const d = document.getElementById("comfortDesc");
  if (score > 80) {
    d.textContent = "Ideal conditions";
    d.style.color = "var(--color-good)";
  } else if (score > 60) {
    d.textContent = "Pleasant outdoors";
    d.style.color = "var(--color-mod)";
  } else {
    d.textContent = "Suboptimal weather";
    d.style.color = "var(--color-poor)";
  }
}

function renderDaily(dai) {
  let h = "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wMin = Math.min(...(dai.temperature_2m_min || [0]));
  const range = Math.max(...(dai.temperature_2m_max || [1])) - wMin;

  for (let i = 0; i < 7; i++) {
    if (!dai.time || !dai.time[i]) break;
    const dn = i === 0 ? "Today" : days[new Date(dai.time[i]).getDay()];
    const ic = getCode(dai.weather_code[i]).ic;
    const tMin = dai.temperature_2m_min[i],
      tMax = dai.temperature_2m_max[i];

    const lP = ((tMin - wMin) / range) * 100,
      wP = ((tMax - tMin) / range) * 100;

    h += `
                    <div class="daily-item">
                        <span style="width: 50px; opacity:0.9;">${dn}</span>
                        <i class="ph ${ic}" style="font-size:1.4rem; opacity:0.8;"></i>
                        <div class="day-temp-bar">
                            <span style="width: 30px; text-align:right;">${convT(tMin)}°</span>
                            <div class="temp-bar"><div class="temp-fill" style="left:${lP}%; width:${Math.max(wP, 12)}%;"></div></div>
                            <span style="width: 30px;">${convT(tMax)}°</span>
                        </div>
                    </div>`;
  }
  document.getElementById("dailyContainer").innerHTML = h;
}

function getWeatherAnimation(code, isDay) {
  document
    .querySelectorAll(".weather-layer")
    .forEach((e) => e.classList.remove("active"));

  const mapping = getCode(code);
  const anim = mapping.anim;

  if (anim === "anim-clear") {
    if (isDay)
      document.getElementById("anim-clear-day").classList.add("active");
    else document.getElementById("anim-clear-night").classList.add("active");
  } else if (anim === "anim-clouds") {
    document.getElementById("anim-clouds").classList.add("active");
    if (!isDay)
      document.getElementById("anim-clear-night").classList.add("active");
  } else if (anim === "anim-rain") {
    document.getElementById("anim-clouds").classList.add("active");
    document.getElementById("anim-rain").classList.add("active");
  } else if (anim === "anim-lightning") {
    document.getElementById("anim-clouds").classList.add("active");
    document.getElementById("anim-rain").classList.add("active");
    document.getElementById("anim-lightning").classList.add("active");
  }
}

function toggleUnit() {
  isCelsius = !isCelsius;
  document.getElementById("unitBtn").textContent = isCelsius ? "°C" : "°F";
  if (currentData) {
    setSkeletons(true);
    setTimeout(updateUI, 150);
  }
}

function setSkeletons(s) {
  document.querySelectorAll(".skeleton").forEach((e) => {
    if (s) {
      e.style.color = "transparent";
      e.classList.add("skeleton");
    } else {
      e.style.color = "";
      e.classList.remove("skeleton");
    }
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleFavorite() {
  const i = favorites.findIndex((f) => f.name === currentLoc.name);
  if (i > -1) favorites.splice(i, 1);
  else favorites.push(currentLoc);
  localStorage.setItem("skyglass_premium_favs", JSON.stringify(favorites));
  checkFav();
  updateFavDrawer();
}

function checkFav() {
  const b = document.getElementById("favBtn");
  if (favorites.some((f) => f.name === currentLoc.name)) {
    b.innerHTML = '<i class="ph-fill ph-heart" style="color:#fb7185;"></i>';
  } else {
    b.innerHTML = '<i class="ph ph-heart"></i>';
  }
}

function toggleDrawer() {
  document.getElementById("favDrawer").classList.toggle("open");
}

function updateFavDrawer() {
  const l = document.getElementById("favList");

  // UI FIX 6: Missing Empty States
  if (favorites.length === 0) {
    l.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center;">
                    <i class="ph-fill ph-map-pin-line" style="font-size: 3.5rem; margin-bottom: 16px; opacity: 0.4;"></i>
                    <div style="font-size: 1.1rem; font-weight: 500; color: var(--text-main); margin-bottom: 8px;">No Saved Locations</div>
                    <div style="font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5;">Search for a city and tap the heart icon to save it here.</div>
                    <button class="glass-btn" style="width: auto; padding: 0 24px; border-radius: 20px; font-size: 0.95rem;" onclick="toggleDrawer(); document.getElementById('searchInput').focus();">Search Now</button>
                </div>`;
    return;
  }

  l.innerHTML = favorites
    .map(
      (f) => `
                <div class="fav-list-item" onclick="loadFav(${f.lat}, ${f.lon}, '${f.name}')">
                    <span>${f.name}</span> <i class="ph ph-caret-right" style="opacity:0.5"></i>
                </div>`,
    )
    .join("");
}

function loadFav(lat, lon, name) {
  const drawer = document.getElementById("favDrawer");
  if (drawer.classList.contains("open")) toggleDrawer();
  scrollToTop();
  fetchAll(lat, lon, name);
}

function setupSwipeAndKeyboard() {
  let touchstartX = 0;
  let touchendX = 0;

  function cycleFavorite(direction) {
    if (favorites.length === 0) return;

    let currentIndex = favorites.findIndex((f) => f.name === currentLoc.name);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex =
      (currentIndex + direction + favorites.length) % favorites.length;
    let nextFav = favorites[nextIndex];

    if (nextFav && nextFav.name !== currentLoc.name) {
      loadFav(nextFav.lat, nextFav.lon, nextFav.name);
    }
  }

  function checkDirection() {
    if (touchendX < touchstartX - 75) cycleFavorite(1);
    if (touchendX > touchstartX + 75) cycleFavorite(-1);
  }

  document.addEventListener("touchstart", (e) => {
    if (e.target.closest("#chartContainer")) return;
    touchstartX = e.changedTouches[0].screenX;
  });

  document.addEventListener("touchend", (e) => {
    if (e.target.closest("#chartContainer")) return;
    touchendX = e.changedTouches[0].screenX;
    checkDirection();
  });

  document.addEventListener("keydown", (e) => {
    if (document.activeElement.id === "searchInput") return;

    if (e.key === "ArrowRight") cycleFavorite(1);
    if (e.key === "ArrowLeft") cycleFavorite(-1);
  });
}
