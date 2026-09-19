/* Athan Remote - PWA logic */
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const topicCmd = CONFIG.TOPIC_BASE + "/cmd";
const topicStatus = CONFIG.TOPIC_BASE + "/status";

const $ = (id) => document.getElementById(id);
$("topicLabel").textContent = CONFIG.TOPIC_BASE;
$("cityLabel").textContent = CONFIG.CITY;

let times = {};        // {Fajr:"05:12", ...}
let timesMin = {};     // {Fajr: 312, ...}  minutes past midnight

/* ---------- activity log ---------- */
function log(msg) {
  const el = document.createElement("div");
  el.className = "l";
  const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  el.textContent = `${t}  ${msg}`;
  $("log").prepend(el);
  while ($("log").children.length > 40) $("log").lastChild.remove();
}

/* ---------- MQTT ---------- */
let client;
function connectMqtt() {
  log("connecting to broker…");
  client = mqtt.connect(CONFIG.BROKER_WSS, {
    clientId: "athan-web-" + Math.random().toString(16).slice(2, 8),
    reconnectPeriod: 3000,
    connectTimeout: 8000
  });

  client.on("connect", () => {
    setStatus(true, "connected");
    log("broker connected");
    client.subscribe(topicStatus);
  });
  client.on("reconnect", () => setStatus(false, "reconnecting…"));
  client.on("close", () => setStatus(false, "offline"));
  client.on("error", (e) => { setStatus(false, "error"); log("mqtt error: " + e.message); });
  client.on("message", (topic, payload) => {
    if (topic === topicStatus) log("device: " + payload.toString());
  });
}

function setStatus(on, txt) {
  $("dot").classList.toggle("on", on);
  $("statusTxt").textContent = txt;
}

function sendCmd(cmd) {
  if (!client || !client.connected) { log("not connected — can't send " + cmd); return; }
  client.publish(topicCmd, cmd);
  log("sent → " + cmd);
}

document.querySelectorAll("button.trig").forEach((b) => {
  b.addEventListener("click", () => sendCmd(b.dataset.cmd));
});

/* ---------- prayer times ---------- */
function toMin(hhmm) {
  const m = /(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? (+m[1]) * 60 + (+m[2]) : -1;
}

// "16:10" -> "4:10 PM"
function to12(hhmm) {
  const m = /(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm || "—";
  let h = +m[1]; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

async function fetchTimes() {
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(CONFIG.CITY)}`
      + `&country=${encodeURIComponent(CONFIG.COUNTRY)}&method=${CONFIG.METHOD}`;
    const r = await fetch(url);
    const j = await r.json();
    const t = j.data.timings;
    times = {}; timesMin = {};
    PRAYERS.forEach((p) => { times[p] = t[p]; timesMin[p] = toMin(t[p]); });
    renderTimes();
    log("prayer times loaded");
  } catch (e) {
    log("could not load times: " + e.message);
  }
}

function renderTimes() {
  const ul = $("times");
  ul.innerHTML = "";
  const nextP = nextPrayer().name;
  PRAYERS.forEach((p) => {
    const li = document.createElement("li");
    if (p === nextP) li.className = "active";
    li.innerHTML = `<span class="nm">${p}</span><span class="tm">${to12(times[p])}</span>`;
    ul.appendChild(li);
  });
}

function nextPrayer() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let best = null, bestDiff = 1e9;
  PRAYERS.forEach((p) => {
    if (timesMin[p] == null || timesMin[p] < 0) return;
    let d = timesMin[p] - cur;
    if (d < 0) d += 1440;
    if (d < bestDiff) { bestDiff = d; best = p; }
  });
  return { name: best, diff: bestDiff };
}

/* ---------- clock tick ---------- */
function tick() {
  const now = new Date();
  $("clk").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  $("date").textContent = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const np = nextPrayer();
  if (np.name) {
    $("nextName").textContent = `${np.name} · ${to12(times[np.name])}`;
    const h = Math.floor(np.diff / 60), m = np.diff % 60;
    $("nextCd").textContent = `in ${h}h ${String(m).padStart(2, "0")}m`;
    const active = document.querySelector("ul.times li.active .nm");
    if (!active || active.textContent !== np.name) renderTimes();
  }
}

/* ---------- boot ---------- */
connectMqtt();
fetchTimes();
tick();
setInterval(tick, 1000);
setInterval(fetchTimes, 60 * 60 * 1000); // refresh times hourly

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
