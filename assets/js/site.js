/* patryk-sadowski.pl — site.js
   Vanilla JS, no dependencies. Handles: theme toggle, mobile menu, scroll-spy,
   language switch (keeps the current section), email-reveal dialog, tiny confetti. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const root = document.documentElement;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked */ } },
  };

  /* ---------------------------------------------------------------- theme */
  const themeBtn = $('#theme-toggle');
  const themeColor = $('meta[name="theme-color"]');
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', next);
    themeColor?.setAttribute('content', next === 'light' ? '#f8fafc' : '#0f172a');
    storage.set('portfolio-theme', next);
    setTimeout(() => root.classList.remove('theme-switching'), 400);
  });

  /* ------------------------------------------------------------ mobile nav */
  const navToggle = $('#nav-toggle');
  const navLinks = $('#site-nav');
  const closeNav = () => {
    navLinks?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  };
  navToggle?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks?.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  document.addEventListener('click', (e) => {
    if (navLinks?.classList.contains('is-open') && !e.target.closest('.site-header')) closeNav();
  });

  /* ------------------------------------------------- scroll-spy + lang links */
  const spyLinks = new Map($$('.nav__links a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
  const langLinks = $$('.lang a');
  let currentSection = '';

  if ('IntersectionObserver' in window && spyLinks.size) {
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        currentSection = entry.target.id;
        spyLinks.forEach((link, id) => {
          if (id === currentSection) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-35% 0px -60% 0px' });
    spyLinks.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  // switching language keeps you in the same section
  langLinks.forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('aria-current') === 'true') { e.preventDefault(); return; }
    if (currentSection) {
      e.preventDefault();
      location.href = a.href.split('#')[0] + '#' + currentSection;
    }
  }));

  /* ---------------------------------------------------------------- year */
  const year = $('#current-year');
  if (year) year.textContent = new Date().getFullYear();

  /* --------------------------------------------------------- toy terminal in the hero */
  const termForm = $('#t-form');
  if (termForm) {
    const log = $('#t-log'), input = $('#t-input'), body = $('.terminal__body');
    const L = termForm.dataset;
    const FILES = {
      'stack.txt': ['backend  python · fastapi · rest', 'data     sql · snowflake · pandas', 'infra    docker · self-hosted', '3d       three.js · webgl'],
      'projects.txt': ['ct-viewer       3D CT scans in the browser', 'warehouse-ai    stock recognition (FastAPI)', 'forest-litter   ESP32 → moisture model', 'kuznik-guide    QR + TTS trail guide'],
      'contact.txt': () => ['email     ' + ['contact', 'patryk-sadowski.pl'].join('@'), 'linkedin  linkedin.com/in/patryk-sadowski3', 'github    github.com/SadowskiPatryk'],
    };
    const lines = (f) => (typeof FILES[f] === 'function' ? FILES[f]() : FILES[f]);
    const COMMANDS = ['help', 'whoami', 'fastfetch', 'ls', 'cat', 'clear', 'pwd', 'date', 'echo'];
    const history = []; let hi = 0;
    const print = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; log.append(d); return d; };
    const echo = (cmd) => {
      const d = document.createElement('div');
      d.innerHTML = '<span class="t-prompt">patryk@portfolio</span><span class="t-dim">:</span><span class="t-path">~</span><span class="t-dim">$</span> ';
      d.append(document.createTextNode(cmd)); log.append(d);
    };
    function run(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      echo(cmd);
      const [name, ...args] = cmd.split(/\s+/);
      switch (name.toLowerCase()) {
        case 'help': print(L.help); break;
        case 'whoami': print('patryk-sadowski'); break;
        case 'ls': print(Object.keys(FILES).join('  ')); break;
        case 'cat':
          if (!args[0]) print('cat: missing file', 't-err');
          else if (FILES[args[0]]) lines(args[0]).forEach((l) => print(l));
          else print(`cat: ${args[0]}: No such file or directory`, 't-err');
          break;
        case 'clear': case 'cls': log.textContent = ''; break;
        case 'parkowanie': {                                    // easter egg (inside joke), not listed in help or Tab completion
          const CAR = ['     _____      ', '  __/__|__\\__   ', ' (_o_______o_)  '];
          const WIDTH = 40;
          const rows = [print('', 't-car'), print('', 't-car'), print('', 't-car'), print('', 't-dim')];
          let pos = -CAR[0].length;
          const timer = setInterval(() => {
            pos += 1;
            CAR.forEach((art, i) => {
              const shifted = pos < 0 ? art.slice(-pos) : ' '.repeat(pos) + art;
              rows[i].textContent = shifted.slice(0, WIDTH);
            });
            const road = '- '.repeat(WIDTH / 2);
            rows[3].textContent = (road.slice(pos % 2 ? 1 : 0) + road).slice(0, WIDTH);
            body.scrollTop = body.scrollHeight;
            if (pos > WIDTH) { clearInterval(timer); rows[3].textContent = ''; }
          }, 55);
          break;
        }
        case 'fastfetch': case 'uname': {
          const dark = document.documentElement.getAttribute('data-theme') !== 'light';
          const up = Math.round(performance.now() / 1000);
          [
            'patryk@portfolio', '----------------',
            'host      GitHub Pages (patryk-sadowski.pl)',
            'os        static site: HTML + CSS + vanilla JS',
            'shell     zsh (a convincing imitation)',
            'backend   none. the page is served as plain files',
            `theme     ${dark ? 'dark' : 'light'}`,
            `lang      ${document.documentElement.lang}`,
            `display   ${innerWidth}x${innerHeight}`,
            `uptime    ${up} s (since you opened this tab)`,
          ].forEach((l, i) => print(l, i === 0 ? 't-val' : ''));
          break;
        }
        case 'pwd': print('/home/patryk'); break;
        case 'date': print(new Date().toString()); break;
        case 'echo': print(args.join(' ')); break;
        case 'sudo': print(L.sudo, 't-err'); break;
        case 'rm': print('rm: nice try', 't-err'); break;
        case 'exit': print('logout… just kidding, scroll down instead'); break;
        default: print(`zsh: ${L.unknown}: ${name}`, 't-err'); print(L.hint, 't-dim');
      }
      body.scrollTop = body.scrollHeight;
    }
    termForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value;
      if (v.trim()) { history.push(v); hi = history.length; }
      run(v); input.value = '';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {                                   // complete a command, or a file name after "cat "
        const v = input.value, m = v.match(/^(\s*cat\s+)(\S*)$/i);
        const pool = m ? Object.keys(FILES) : COMMANDS, part = m ? m[2] : v.trim();
        if (m || !/\s/.test(v.trim())) {
          e.preventDefault();
          const hits = pool.filter((n) => n.startsWith(part));
          if (!hits.length) return;
          let common = hits[0];
          for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1);
          const done = hits.length === 1 ? common + (m || common === 'echo' ? '' : ' ') : common;
          input.value = (m ? m[1] : '') + done + (!m && hits.length === 1 && common === 'cat' ? '' : '');
          if (hits.length > 1 && common === part) { echo(v); print(hits.join('  ')); body.scrollTop = body.scrollHeight; }
        }
        return;
      }
      if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = history[hi]; }
      else if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); hi = Math.min(history.length, hi + 1); input.value = history[hi] ?? ''; }
    });
    const termEl = $('.terminal');
    const fold = $('.tdot--min'), grow = $('.tdot--max');
    $('.tdot--close')?.addEventListener('click', () => {            // gone until the page is reloaded
      termEl.classList.add('is-closing');
      setTimeout(() => { termEl.hidden = true; }, 260);
    });
    fold?.addEventListener('click', () => {
      const folded = termEl.classList.toggle('is-folded');
      fold.setAttribute('aria-expanded', String(!folded));
      if (!folded) input.focus({ preventScroll: true });
    });
    grow?.addEventListener('click', () => {
      termEl.classList.remove('is-folded'); fold?.setAttribute('aria-expanded', 'true');
      termEl.classList.toggle('is-large');
      body.scrollTop = body.scrollHeight;
    });
    $('.terminal')?.addEventListener('click', (e) => { if (!getSelection().toString() && !e.target.closest('input')) input.focus({ preventScroll: true }); });
  }

  /* ------------------------------------- tell the embedded viewer when it is on screen */
  const frame = $('.viz iframe');
  if (frame && 'IntersectionObserver' in window) {
    let visible = true;
    const post = () => { try { frame.contentWindow.postMessage({ ctViewerVisible: visible }, '*'); } catch { /* ignore */ } };
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; post(); }, { threshold: 0.05 }).observe(frame);
    frame.addEventListener('load', post);
  }

  /* ------------------------------------------------- email reveal dialog */
  const dialog = $('#contact-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    // very old browser: let the #contact anchor do its job
    return;
  }
  const form = $('#captcha-form');
  const question = $('#captcha-question');
  const input = $('#captcha-input');
  const error = $('#captcha-error');
  const out = $('#email-out');
  const emailLink = $('#revealed-email');
  const copyBtn = $('#copy-email');
  let answer = 0;
  let lastTrigger = null;

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function newChallenge() {
    if (Math.random() > 0.5) {
      const a = rand(2, 15), b = rand(2, 10);
      answer = a + b; question.textContent = `${a} + ${b} =`;
    } else {
      const a = rand(2, 9), b = rand(2, 6);
      answer = a * b; question.textContent = `${a} × ${b} =`;
    }
    input.value = '';
    error.hidden = true;
  }

  function openDialog(trigger) {
    lastTrigger = trigger || null;
    form.hidden = false;
    out.hidden = true;
    newChallenge();
    dialog.showModal();
    input.focus();
  }

  $$('[data-open-contact]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    openDialog(el);
  }));
  $$('[data-close-dialog]').forEach((el) => el.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.querySelector('.confetti')?.remove();
    lastTrigger?.focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (parseInt(input.value, 10) === answer) {
      // the address never appears in the HTML source: it is assembled here
      const address = ['contact', 'patryk-sadowski.pl'].join('@');
      emailLink.textContent = address;
      emailLink.href = 'mailto:' + address;
      form.hidden = true;
      out.hidden = false;
      emailLink.focus();
      confetti();
    } else {
      error.hidden = false;
      dialog.classList.remove('is-shaking');
      void dialog.offsetWidth; // restart the animation
      dialog.classList.add('is-shaking');
      newChallenge();
      error.hidden = false;
      input.focus();
    }
  });

  copyBtn.addEventListener('click', async () => {
    const label = $('span', copyBtn);
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(emailLink.textContent);
      label.textContent = copyBtn.dataset.copied;
      setTimeout(() => { label.textContent = original; }, 1600);
    } catch { /* clipboard unavailable: the address is selectable text anyway */ }
  });

  /* ------------------------------------------------- ~35 lines of confetti */
  function confetti() {
    if (reducedMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    dialog.append(canvas); // inside the dialog so it renders in the top layer
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = (canvas.width = innerWidth * dpr);
    const H = (canvas.height = innerHeight * dpr);
    const colors = ['#22c55e', '#16a34a', '#86efac', '#3b82f6', '#fbbf24', '#e2e8f0'];
    const parts = Array.from({ length: 120 }, () => {
      const angle = Math.PI + Math.random() * Math.PI;
      const speed = (5 + Math.random() * 9) * dpr;
      return {
        x: W / 2, y: H * 0.5,
        vx: Math.cos(angle) * speed * (0.5 + Math.random()), vy: Math.sin(angle) * speed,
        w: (4 + Math.random() * 5) * dpr, h: (6 + Math.random() * 7) * dpr,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        c: colors[(Math.random() * colors.length) | 0], life: 1,
      };
    });
    let last = performance.now();
    (function frame(now) {
      const dt = Math.min(2, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.34 * dpr * dt; p.vx *= 0.992;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= 0.0055 * dt;
        if (p.life <= 0 || p.y > H + 40) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive && canvas.isConnected) requestAnimationFrame(frame); else canvas.remove();
    })(last);
  }
})();
