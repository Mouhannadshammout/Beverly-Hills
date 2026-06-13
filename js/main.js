/* ════════════════════════════════════════════════════════════
   BEVERLY HILLS ERBIL — experience layer
   Single-screen aerial: hero ↔ explore, drawer, inquire modal,
   synthesized wind ambience, cursor & micro-interactions.
   ════════════════════════════════════════════════════════════ */
import { World, DISTRICTS } from './scene.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── split text into animatable chars ─────────────────────── */
function splitChars(el) {
  if (el.dataset.splitDone) return $$('.char', el);
  el.dataset.splitDone = '1';
  const frag = document.createDocumentFragment();
  for (const word of el.textContent.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); continue; }
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word) {
      const wrap = document.createElement('span');
      wrap.className = 'char-wrap';
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      wrap.appendChild(c);
      w.appendChild(wrap);
    }
    frag.appendChild(w);
  }
  el.textContent = '';
  el.appendChild(frag);
  return $$('.char', el);
}

/* ════ BOOT ═════════════════════════════════════════════════ */
const world = new World($('#world'));
const pctEl = $('#preloaderPct');
const progress = { v: 0 };

splitChars($('.preloader__en'));
gsap.to('.preloader__en .char', { y: 0, duration: 1.1, stagger: 0.04, ease: 'power4.out', delay: 0.2 });
gsap.fromTo('.preloader__mark', { opacity: 0, scale: 0.85 }, { opacity: 0.9, scale: 1, duration: 1.2, ease: 'power3.out' });
gsap.fromTo('.preloader__ar', { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 0.5 });

function setLoadProgress(p) {
  gsap.to(progress, {
    v: p, duration: 0.6, ease: 'power2.out',
    onUpdate: () => { pctEl.textContent = String(Math.round(progress.v * 100)).padStart(2, '0'); },
  });
}

world.load(setLoadProgress)
  .then(() => setTimeout(initExperience, 600))
  .catch((err) => {
    console.error('World failed to load:', err);
    setLoadProgress(1);
    setTimeout(initExperience, 600);
  });

function initExperience() {
  initCursor();
  initMagnetic();
  initExplore();
  initDrawer();
  initModal();
  initSound();
  initHaze();

  const tl = gsap.timeline();
  tl.to('.preloader__inner', { opacity: 0, y: -24, duration: 0.7, ease: 'power3.in' })
    .to('#preloader', { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, '-=0.2')
    .set('#preloader', { display: 'none' })
    .add(heroIntro(), '-=0.9');
}

function heroIntro() {
  const tl = gsap.timeline();
  $$('.hero__title [data-split]').forEach((el, i) => {
    tl.to(splitChars(el), { y: 0, duration: 1.3, stagger: 0.05, ease: 'power4.out' }, 0.35 + i * 0.18);
  });
  tl.fromTo('.hero__star', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 1, ease: 'back.out(2)' }, 0.15)
    .fromTo('.hero__kicker', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.25)
    .fromTo('.hero__sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.0)
    .fromTo('#enterExplore', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.2)
    .fromTo('.brand', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.6)
    .fromTo('.sound, .ui__topright, .ui__bottom', { opacity: 0 }, { opacity: 1, duration: 1.1, stagger: 0.1 }, 0.9);
  return tl;
}

/* ════ CURSOR ═══════════════════════════════════════════════ */
function initCursor() {
  if (isTouch) return;
  document.body.classList.add('no-native-cursor');
  const cursor = $('#cursor');
  const label = $('.cursor__label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: pos.x, y: pos.y };

  window.addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; });
  window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));

  gsap.ticker.add(() => {
    ring.x += (pos.x - ring.x) * 0.16;
    ring.y += (pos.y - ring.y) * 0.16;
    $('.cursor__dot').style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    $('.cursor__ring').style.transform = `translate(${ring.x}px, ${ring.y}px)`;
  });

  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-hover', !!t && t.dataset.cursor === 'hover');
  });

  world.onDistrictHover = (id) => {
    const d = DISTRICTS.find(x => x.id === id);
    if (d) { label.textContent = d.name; cursor.classList.add('is-label'); }
    else { cursor.classList.remove('is-label'); }
    syncLabelActive(id);
  };
}

/* ════ MAGNETIC ═════════════════════════════════════════════ */
function initMagnetic() {
  if (isTouch) return;
  $$('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - r.left - r.width / 2) * 0.3,
        y: (e.clientY - r.top - r.height / 2) * 0.3,
        duration: 0.4, ease: 'power3.out',
      });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ════ FOREGROUND HAZE DRIFT ════════════════════════════════ */
function initHaze() {
  if (reducedMotion) return;
  gsap.to('#hazeA', { xPercent: 26, duration: 90, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  gsap.to('#hazeB', { xPercent: 38, duration: 130, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

/* ════ EXPLORE ══════════════════════════════════════════════ */
const labelsWrap = $('#worldLabels');
const labelEls = {};
function syncLabelActive(id) {
  Object.entries(labelEls).forEach(([k, el]) => el.classList.toggle('is-active', k === id));
}

function initExplore() {
  const panel = $('#districtPanel');
  const rail = $('#districtRail');

  DISTRICTS.forEach((d, i) => {
    const label = document.createElement('button');
    label.className = 'world-label';
    label.innerHTML = `<span class="world-label__dot"></span><span class="world-label__name">${d.name}</span>`;
    label.addEventListener('click', () => selectDistrict(d.id));
    labelsWrap.appendChild(label);
    labelEls[d.id] = label;

    const btn = document.createElement('button');
    btn.className = 'rail-btn magnetic';
    btn.dataset.cursor = 'hover';
    btn.innerHTML = `<i>0${i + 1}</i><span>${d.name}</span>`;
    btn.addEventListener('click', () => selectDistrict(d.id));
    rail.appendChild(btn);
    d._railBtn = btn;
  });

  gsap.ticker.add(() => {
    if (!document.body.matches('[data-mode="explore"]')) return;
    for (const p of world.getLabelPositions()) {
      const el = labelEls[p.id];
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-5px, -50%)`;
      el.style.visibility = p.visible ? 'visible' : 'hidden';
    }
  });

  function openPanel(d) {
    $('#panelKicker').textContent = d.kicker;
    $('#panelTitle').textContent = d.name;
    $('#panelDesc').textContent = d.desc;
    $('#panelFacts').innerHTML = d.facts.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    gsap.to(panel, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power3.out' });
  }
  function closePanel() {
    gsap.to(panel, { autoAlpha: 0, x: 30, duration: 0.45, ease: 'power3.in' });
    world.clearSelection();
    DISTRICTS.forEach((d) => d._railBtn.classList.remove('is-active'));
    syncLabelActive(null);
  }

  function selectDistrict(id) {
    const d = DISTRICTS.find(x => x.id === id);
    world.focusDistrict(id);
    DISTRICTS.forEach((x) => x._railBtn.classList.toggle('is-active', x.id === id));
    syncLabelActive(id);
    openPanel(d);
  }
  world.onDistrictSelect = selectDistrict;

  function enterExplore(withAudio) {
    if (document.body.dataset.mode === 'explore') return;
    document.body.dataset.mode = 'explore';
    if (withAudio) startAmbience();
    world.enterExplore();
    gsap.timeline()
      .to('#hero', { opacity: 0, y: -26, scale: 0.985, duration: 0.8, ease: 'power3.in' })
      .fromTo('.explore-ui__rail', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, 1.2)
      .fromTo('#exploreHint', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.5);
  }

  function exitExplore() {
    closePanel();
    document.body.dataset.mode = 'hero';
    world.exitExplore();
    gsap.timeline()
      .to('.explore-ui__rail, #exploreHint', { opacity: 0, duration: 0.4 })
      .to('#hero', { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.7);
  }

  $('#enterExplore').addEventListener('click', () => enterExplore(true));
  $('#enterSilent').addEventListener('click', () => enterExplore(false));
  $('#exitExplore').addEventListener('click', exitExplore);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOpen) return closeModal();
      if (drawerOpen) return closeDrawer();
      if (document.body.dataset.mode === 'explore') exitExplore();
    }
  });
  $('#panelClose').addEventListener('click', closePanel);
  $('#panelCta').addEventListener('click', () => openModal());
}

/* ════ DETAILS DRAWER ═══════════════════════════════════════ */
let drawerOpen = false;
function closeDrawer() {
  if (!drawerOpen) return;
  drawerOpen = false;
  gsap.to('#drawer', {
    x: '102%', duration: 0.7, ease: 'power3.in',
    onComplete: () => gsap.set('#drawer', { visibility: 'hidden' }),
  });
}
function initDrawer() {
  $('#detailsBtn').addEventListener('click', () => {
    if (drawerOpen) return closeDrawer();
    drawerOpen = true;
    gsap.set('#drawer', { visibility: 'visible' });
    gsap.fromTo('#drawer', { x: '102%' }, { x: '0%', duration: 0.9, ease: 'power4.out' });
    gsap.fromTo('#drawer > *:not(.drawer__close)', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.25, ease: 'power3.out' });
  });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerInquire').addEventListener('click', () => { closeDrawer(); openModal(); });
}

/* ════ INQUIRE MODAL ════════════════════════════════════════ */
let modalOpen = false;
function openModal() {
  if (modalOpen) return;
  modalOpen = true;
  gsap.set('#modal', { visibility: 'visible' });
  gsap.to('.modal__bg', { opacity: 1, duration: 0.5 });
  gsap.fromTo('.modal__card', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out', delay: 0.1 });
}
function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  gsap.to('.modal__card', { opacity: 0, y: 24, duration: 0.4, ease: 'power3.in' });
  gsap.to('.modal__bg', {
    opacity: 0, duration: 0.5, delay: 0.1,
    onComplete: () => gsap.set('#modal', { visibility: 'hidden' }),
  });
}
function initModal() {
  $('#inquireBtn').addEventListener('click', openModal);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalBg').addEventListener('click', closeModal);

  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#fName'), email = $('#fEmail');
    if (!name.value.trim() || !email.checkValidity()) {
      gsap.fromTo('.modal__card', { x: 0 }, { x: 8, duration: 0.07, repeat: 5, yoyo: true, clearProps: 'x' });
      return;
    }
    $('#formSuccess').classList.add('is-shown');
    $('#contactForm .btn-cream span').textContent = 'REQUEST RECEIVED ✓';
    gsap.fromTo('#formSuccess', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
  });
}

/* ════ AMBIENT SOUND (synthesized wind — no files) ══════════ */
let audioCtx = null, ambienceGain = null, ambienceOn = false;
function startAmbience() {
  if (ambienceOn) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // looping brown-noise buffer
      const len = audioCtx.sampleRate * 4;
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
      ambienceGain = audioCtx.createGain();
      ambienceGain.gain.value = 0;
      // slow breathing of the wind
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 90;
      lfo.connect(lfoGain).connect(lp.frequency);
      src.connect(lp).connect(ambienceGain).connect(audioCtx.destination);
      src.start(); lfo.start();
    }
    audioCtx.resume();
    ambienceGain.gain.cancelScheduledValues(audioCtx.currentTime);
    ambienceGain.gain.linearRampToValueAtTime(0.055, audioCtx.currentTime + 2.5);
    ambienceOn = true;
    $('#soundBtn').classList.add('is-on');
  } catch (err) { console.warn('Audio unavailable:', err); }
}
function stopAmbience() {
  if (!ambienceOn || !audioCtx) return;
  ambienceGain.gain.cancelScheduledValues(audioCtx.currentTime);
  ambienceGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
  ambienceOn = false;
  $('#soundBtn').classList.remove('is-on');
}
function initSound() {
  $('#soundBtn').addEventListener('click', () => (ambienceOn ? stopAmbience() : startAmbience()));
}

if (reducedMotion) gsap.globalTimeline.timeScale(10);
