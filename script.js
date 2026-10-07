(function () {
  "use strict";
  var CYCLE = 90, DAY = 1440;
  var state = { mode: "wake", hour12: true, fall: 15, best: 5 };
  var LABELS = { 6: "Ideal", 5: "Recommended", 4: "Okay", 3: "Minimum" };
  var TIPS = {
    6: "6 cycles (9 h) suits children, teens and anyone catching up on sleep.",
    5: "5 cycles (7.5 h) is the sweet spot for most adults.",
    4: "4 cycles (6 h) works now and then, but builds up sleep debt.",
    3: "3 cycles (4.5 h) is a bare minimum. Avoid making it a habit."
  };
  var ROUTINE = ["Dim the lights", "Put your phone away", "Warm shower or light stretching", "No caffeine or heavy meals", "Set tomorrow's alarm"];
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function wrap(m) { return ((m % DAY) + DAY) % DAY; }          /* negative-safe: wraps past midnight both ways */
  function save(k, v) { try { localStorage.setItem("sc." + k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem("sc." + k); } catch (e) { return null; } }

  function fmt(mins) {
    var m = wrap(mins), h = Math.floor(m / 60), mm = m % 60;
    if (!state.hour12) return pad(h) + ":" + pad(mm);
    return (h % 12 || 12) + ":" + pad(mm) + " " + (h >= 12 ? "PM" : "AM");
  }
  function dur(mins) { var h = Math.floor(mins / 60), m = mins % 60; return (h ? h + "h" : "") + (m ? (h ? " " : "") + m + "m" : h ? "" : "0m"); }
  function parse(v) {
    if (!v) return null;
    var p = v.split(":"), h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  }
  function nowMins() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

  function item(t, note, c, delay) {
    var li = document.createElement("li"), text = fmt(t);
    li.className = "result" + (c === state.best ? " best" : "");
    li.tabIndex = 0; li.setAttribute("role", "button");
    li.style.animationDelay = delay + "ms";
    li.setAttribute("data-copy", text); li.setAttribute("data-c", c);
    var segs = '<i class="f" style="flex:' + state.fall + '"></i>';
    for (var i = 0; i < c; i++) segs += '<i style="flex:' + CYCLE + '"></i>';
    li.innerHTML = '<div class="top"><div><span class="t">' + text + '</span>' + (note ? '<span class="day">' + note + '</span>' : '') +
      '</div><div class="meta"><b>' + c + ' cycles</b> · ' + dur(c * CYCLE) + '<br><span class="badge">' +
      LABELS[c] + (c === state.best ? " · best for you" : "") + '</span></div></div><div class="bar" aria-hidden="true">' + segs + '</div>';
    return li;
  }
  /* sign -1: count back from a wake time; +1: count forward from a bed/now time */
  function build(ul, base, sign, cs) {
    ul.innerHTML = "";
    if (base === null) { ul.innerHTML = '<li class="small">Pick a time above.</li>'; return; }
    cs.forEach(function (c, i) {
      var raw = base + sign * (c * CYCLE + state.fall);
      var note = sign < 0 ? (raw < 0 ? "evening before" : "") : (raw >= DAY ? "tomorrow" : "");
      ul.appendChild(item(raw, note, c, i * 80));
    });
  }
  function countdown() {
    var w = parse($("wakeTime").value), el = $("count");
    if (w === null) { el.textContent = ""; return; }
    var bed = wrap(w - (state.best * CYCLE + state.fall)), diff = wrap(bed - nowMins());
    el.textContent = diff === 0 ? "🌙 Bedtime is now!" : "🌙 Best bedtime (" + fmt(bed) + ") is in " + dur(diff);
  }
  function render() {
    if (state.mode === "wake") {
      build($("r-wake"), parse($("wakeTime").value), -1, [6, 5, 4, 3]); countdown();
      var q = document.querySelectorAll("#quick button");
      for (var k = 0; k < q.length; k++) q[k].classList.toggle("on", q[k].getAttribute("data-t") === $("wakeTime").value);
    } else if (state.mode === "bed") {
      build($("r-bed"), parse($("bedTime").value), 1, [3, 4, 5, 6]);
    } else {
      var n = nowMins();
      $("nowTime").textContent = fmt(n);
      $("nowDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      build($("r-now"), n, 1, [3, 4, 5, 6]);
    }
  }
  function setTip(c) { $("tip").textContent = TIPS[c || state.best]; }

  function setMode(m) {
    state.mode = m;
    ["wake", "bed", "now"].forEach(function (x) { $("p-" + x).hidden = x !== m; });
    document.querySelectorAll(".tab").forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-m") === m); });
    render();
  }
  function setFormat(is12) {
    state.hour12 = is12;
    $("f12").setAttribute("aria-pressed", is12); $("f24").setAttribute("aria-pressed", !is12);
    save("h12", is12 ? "1" : "0"); render();
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    $("theme").textContent = t === "dawn" ? "☀️" : "🌙"; save("theme", t);
  }

  var tt;
  function toast(msg) {
    var el = $("toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove("show"); }, 1600);
  }
  function activate(e) {
    var li = e.target.closest && e.target.closest(".result");
    if (!li) return;
    if (e.type === "keydown") { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); }
    var t = li.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(t).then(function () { toast("Copied " + t); }, function () { toast(t); });
    else toast(t);
    setTip(parseInt(li.getAttribute("data-c"), 10));
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { setMode(b.getAttribute("data-m")); }; });
  $("f12").onclick = function () { setFormat(true); };
  $("f24").onclick = function () { setFormat(false); };
  $("theme").onclick = function () { setTheme(document.documentElement.getAttribute("data-theme") === "dawn" ? "night" : "dawn"); };
  $("wakeTime").addEventListener("input", render);
  $("bedTime").addEventListener("input", render);
  $("quick").addEventListener("click", function (e) {
    var t = e.target.getAttribute && e.target.getAttribute("data-t");
    if (t) { $("wakeTime").value = t; render(); }
  });
  $("fall").addEventListener("input", function () { state.fall = parseInt(this.value, 10); $("fallOut").textContent = state.fall + " min"; render(); });
  $("age").addEventListener("change", function () { state.best = parseInt(this.value, 10); setTip(); render(); });
  ["r-wake", "r-bed", "r-now"].forEach(function (id) { $(id).addEventListener("click", activate); $(id).addEventListener("keydown", activate); });

  /* ---------- sleep sounds (Web Audio, generated live) ---------- */
  var ac, src, gain, lfo, lfoG;
  function makeBuffer(type) {
    var n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0), l = 0, b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (type === "white") d[i] = w * 0.5;
      else if (type === "pink") { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; }
      else { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
    }
    return buf;
  }
  function volume() { return $("vol").value / 100; }
  function stopSound() {
    try { if (src) src.stop(); if (lfo) lfo.stop(); } catch (e) {}
    src = lfo = lfoG = gain = null; $("play").textContent = "▶ Play";
  }
  function playSound() {
    stopSound();
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { toast("Audio not supported here"); return; }
    ac = ac || new Ctx(); if (ac.resume) ac.resume();
    var type = $("snd").value, ocean = type === "ocean";
    src = ac.createBufferSource(); src.buffer = makeBuffer(ocean ? "brown" : type); src.loop = true;
    gain = ac.createGain(); gain.gain.value = volume() * (ocean ? 0.6 : 1);
    src.connect(gain); gain.connect(ac.destination);
    if (ocean) {                                      /* slow volume swell = waves */
      lfo = ac.createOscillator(); lfo.frequency.value = 0.12;
      lfoG = ac.createGain(); lfoG.gain.value = volume() * 0.4;
      lfo.connect(lfoG); lfoG.connect(gain.gain); lfo.start();
    }
    src.start(); $("play").textContent = "⏸ Stop";
  }
  $("play").onclick = function () { if (src) stopSound(); else playSound(); };
  $("snd").onchange = function () { if (src) playSound(); };
  $("vol").oninput = function () {
    if (gain) gain.gain.value = volume() * ($("snd").value === "ocean" ? 0.6 : 1);
    if (lfoG) lfoG.gain.value = volume() * 0.4;
  };

  /* ---------- 4-7-8 breathing ---------- */
  var P = [["Inhale", 4, 1.3], ["Hold", 7, 1.3], ["Exhale", 8, 0.75]], bi = null, ph = 2, left = 0, orb = $("orb");
  function bStep() {
    if (left <= 0) {
      ph = (ph + 1) % 3; left = P[ph][1];
      orb.style.transitionDuration = left + "s"; orb.style.transform = "scale(" + P[ph][2] + ")";
    }
    $("bText").textContent = P[ph][0] + " · " + left; left--;
  }
  $("bBtn").onclick = function () {
    if (bi) { clearInterval(bi); bi = null; orb.style.transitionDuration = "1s"; orb.style.transform = "scale(1)"; $("bText").textContent = "Ready"; this.textContent = "Start"; }
    else { ph = 2; left = 0; bStep(); bi = setInterval(bStep, 1000); this.textContent = "Stop"; }
  };

  /* ---------- night routine checklist ---------- */
  var done; try { done = JSON.parse(load("routine")) || []; } catch (e) { done = []; }
  function renderChecks() {
    var ul = $("checks"); ul.innerHTML = "";
    ROUTINE.forEach(function (txt, i) {
      var li = document.createElement("li"), lb = document.createElement("label"), cb = document.createElement("input"), sp = document.createElement("span");
      cb.type = "checkbox"; cb.checked = !!done[i]; sp.textContent = txt;
      cb.onchange = function () { done[i] = cb.checked; save("routine", JSON.stringify(done)); prog(); };
      lb.appendChild(cb); lb.appendChild(sp); li.appendChild(lb); ul.appendChild(li);
    });
    prog();
  }
  function prog() {
    var n = ROUTINE.filter(function (_, i) { return done[i]; }).length;
    $("prog").textContent = n + "/" + ROUTINE.length + (n === ROUTINE.length ? " 🌟 sweet dreams" : "");
  }

  /* ---------- starfield ---------- */
  var cv = $("sky"), cx = cv.getContext("2d"), stars = [], W, H;
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight; stars = [];
    for (var i = 0; i < Math.min(160, Math.floor(W * H / 9000)); i++)
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6.28, s: Math.random() * 0.02 + 0.005 });
  }
  function draw() {
    cx.clearRect(0, 0, W, H); cx.fillStyle = "#fff";
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i]; s.p += s.s; cx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.p));
      cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
    }
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(draw);
  }
  var lastW = innerWidth, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  addEventListener("resize", function () {
    if (innerWidth === lastW && Math.abs(innerHeight - H) < 150) return;   /* ignore mobile address-bar show/hide */
    lastW = innerWidth; resize(); if (still) draw();
  });

  /* ---------- init ---------- */
  if (load("h12") === "0") state.hour12 = false;
  $("f12").setAttribute("aria-pressed", state.hour12); $("f24").setAttribute("aria-pressed", !state.hour12);
  setTheme(load("theme") === "dawn" ? "dawn" : "night");
  renderChecks(); setTip(); render(); resize(); draw();
  setInterval(function () { if (state.mode === "now") render(); else if (state.mode === "wake") countdown(); }, 15000);
})();
