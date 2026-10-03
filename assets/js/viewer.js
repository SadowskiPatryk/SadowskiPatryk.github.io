/* patryk-sadowski.pl — viewer.js
   Embedded CT-Viewer-style widget in plain WebGL (no libraries): a procedural part, X/Y/Z clip planes,
   real capping (stencil buffer), a self-playing random choreography and a hand-over to the visitor.
   Test hooks: ?seed=N repeats a choreography, ?t=SECONDS freezes it at that moment. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('gl');
  const gl = canvas.getContext('webgl', { antialias: true, stencil: true });
  if (!gl) { $('nogl').hidden = false; return; }

  const params = new URLSearchParams(location.search);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------ small math */
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  };
  const perspective = (fovy, asp, n, f) => {
    const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
    return o;
  };
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const lookAt = (e, t, up) => {
    const f = norm([t[0] - e[0], t[1] - e[1], t[2] - e[2]]), s = norm(cross(f, up)), u = cross(s, f);
    const o = new Float32Array(16);
    o[0] = s[0]; o[4] = s[1]; o[8] = s[2];
    o[1] = u[0]; o[5] = u[1]; o[9] = u[2];
    o[2] = -f[0]; o[6] = -f[1]; o[10] = -f[2]; o[15] = 1;
    o[12] = -(s[0] * e[0] + s[1] * e[1] + s[2] * e[2]);
    o[13] = -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]);
    o[14] = f[0] * e[0] + f[1] * e[1] + f[2] * e[2];
    return o;
  };

  /* ----------------------------------------------------------------- shader */
  const VS = `
    attribute vec3 aPos; attribute vec3 aNrm;
    uniform mat4 uVP;
    varying vec3 vP; varying vec3 vN;
    void main() { vP = aPos; vN = aNrm; gl_Position = uVP * vec4(aPos, 1.0); }`;

  const FS = `
    precision highp float;
    varying vec3 vP; varying vec3 vN;
    uniform vec3 uEye, uBmin, uBmax, uClip, uFlip, uMask, uCapColor, uCapAxis;
    uniform float uMode;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x) {
      vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    // uMask selects which clip planes take part in this pass: all for the body, one for the stencil pass,
    // the other two for the cap quad. The tiny bias keeps faces lying exactly in a plane from flickering.
    bool removed(vec3 p) {
      vec3 t = (p - uBmin) / (uBmax - uBmin);
      return (uMask.x > 0.5 && (uFlip.x < 0.5 ? t.x < uClip.x - 2e-4 : t.x > 1.0 - uClip.x + 2e-4))
          || (uMask.y > 0.5 && (uFlip.y < 0.5 ? t.y < uClip.y - 2e-4 : t.y > 1.0 - uClip.y + 2e-4))
          || (uMask.z > 0.5 && (uFlip.z < 0.5 ? t.z < uClip.z - 2e-4 : t.z > 1.0 - uClip.z + 2e-4));
    }
    void main() {
      if (removed(vP)) discard;
      vec3 V = normalize(uEye - vP);
      if (uMode > 0.5) {                                                            // cap quad lying on a clip plane
        float g = 0.78 + 0.3 * vnoise(vP * 14.0) + 0.16 * vnoise(vP * 46.0);
        gl_FragColor = vec4(uCapColor * g * (0.66 + 0.34 * abs(dot(uCapAxis, V))), 1.0);
        return;
      }
      vec3 N = normalize(vN);
      float nv = dot(N, V); bool back = nv < 0.0;
      if (back) { N = -N; nv = -nv; }
      float s = 0.2 + 0.7 * (vnoise(vP * 7.0) * 0.28 + vnoise(vP * 26.0) * 0.40 + vnoise(vP * 70.0) * 0.32);
      float v = clamp((s - 0.05) / 0.9, 0.0, 1.0);
      vec3 base = mix(vec3(0.02), vec3(0.96), v);                                    // gray colormap
      if (back) base *= 0.4;
      vec3 L2 = normalize(vec3(0.5, 0.8, 0.3));
      float light = 0.26 + 0.5 * nv + 0.3 * max(dot(N, L2), 0.0);
      gl_FragColor = vec4(base * light + vec3(pow(nv, 28.0) * 0.18), 1.0);
    }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) { $('nogl').hidden = false; $('nogl').textContent = 'Shader error: ' + err.message; return; }
  gl.useProgram(prog);

  const U = {};
  ['uVP', 'uEye', 'uBmin', 'uBmax', 'uClip', 'uFlip', 'uMask', 'uCapColor', 'uCapAxis', 'uMode']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  const aPos = gl.getAttribLocation(prog, 'aPos'), aNrm = gl.getAttribLocation(prog, 'aNrm');

  /* --------------------------------------------------------------- geometry */
  const SEG = 128;
  // closed cross-section (r, y) of the part, revolved around the Y axis
  const PROFILE = [[1, -1], [1, 0.62], [0.55, 0.62], [0.55, 1], [0.36, 1], [0.36, 0.4], [0.78, 0.4], [0.78, -0.78], [0, -0.78], [0, -1]];

  function revolve() {
    let area = 0;
    PROFILE.forEach((p, i) => { const q = PROFILE[(i + 1) % PROFILE.length]; area += p[0] * q[1] - q[0] * p[1]; });
    const sign = area >= 0 ? 1 : -1;
    const verts = [], tris = [];
    PROFILE.forEach((p, i) => {
      const q = PROFILE[(i + 1) % PROFILE.length];
      if (p[0] < 1e-6 && q[0] < 1e-6) return;                          // edge lying on the axis
      const dr = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dr, dy);
      const nr = (sign * dy) / len, ny = (-sign * dr) / len;
      const base = verts.length / 6;
      for (let k = 0; k <= SEG; k++) {
        const a = (k / SEG) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        verts.push(p[0] * c, p[1], p[0] * s, nr * c, ny, nr * s, q[0] * c, q[1], q[0] * s, nr * c, ny, nr * s);
      }
      for (let k = 0; k < SEG; k++) {
        const a = base + k * 2, b = a + 1, c = a + 2, d = a + 3;
        tris.push(a, b, c, c, b, d);
      }
    });
    return { verts: new Float32Array(verts), tris: new Uint16Array(tris) };
  }

  const mk = (target, data) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
  const geo = revolve();
  const body = { vbo: mk(gl.ARRAY_BUFFER, geo.verts), ibo: mk(gl.ELEMENT_ARRAY_BUFFER, geo.tris), count: geo.tris.length };
  const quadVbo = gl.createBuffer();

  function bindAttribs() {
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aNrm); gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 24, 12);
  }
  function bindBody() {
    gl.bindBuffer(gl.ARRAY_BUFFER, body.vbo); bindAttribs();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, body.ibo);
  }

  /* ------------------------------------------------------------------ state */
  // all three clip planes remove the "upper" side (flip = 1), so a cut face looks towards the default camera
  const state = { clip: [0, 0, 0], flip: [1, 1, 1], cap: true, auto: !reduceMotion };
  const CAP_COLOR = [0.64, 0.66, 0.68];            // neutral gray that matches the model
  const cam = { yaw: 0.65, pitch: 0.38, dist: 5.4, target: [0, -0.12, 0] };   // pulled back to leave room for the overlay
  let dirty = true;

  /* ------------------------------------------------------------------- draw */
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; dirty = true; }
  }
  const eyePos = () => {
    const c = Math.cos(cam.pitch), asp = W / H, d = cam.dist * Math.max(1, 0.78 / asp);   // widen the view on portrait screens
    return [cam.target[0] + d * c * Math.sin(cam.yaw), cam.target[1] + d * Math.sin(cam.pitch), cam.target[2] + d * c * Math.cos(cam.yaw)];
  };

  function draw() {
    resize();
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const eye = eyePos();
    gl.uniformMatrix4fv(U.uVP, false, mul(perspective(0.7, W / H, 0.1, 40), lookAt(eye, cam.target, [0, 1, 0])));
    gl.uniform3fv(U.uEye, eye);
    gl.uniform3f(U.uBmin, -1, -1, -1); gl.uniform3f(U.uBmax, 1, 1, 1);
    gl.uniform3fv(U.uClip, state.clip);
    gl.uniform3fv(U.uFlip, state.flip);
    gl.uniform3fv(U.uCapColor, CAP_COLOR);

    // 1) the body, clipped by all planes
    gl.uniform3f(U.uMask, 1, 1, 1); gl.uniform1f(U.uMode, 0);
    bindBody(); gl.drawElements(gl.TRIANGLES, body.count, gl.UNSIGNED_SHORT, 0);

    // 2) caps: per clip plane, count the surfaces behind the plane in the stencil buffer (back faces +1, front faces -1).
    //    Non-zero means the plane cuts through solid material there, so only those pixels get a cap.
    if (!state.cap) return;
    for (let a = 0; a < 3; a++) {
      if (state.clip[a] < 0.001) continue;
      const only = [0, 0, 0], others = [1, 1, 1]; only[a] = 1; others[a] = 0;
      gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.uniform3fv(U.uMask, only); gl.uniform1f(U.uMode, 0);
      bindBody(); gl.drawElements(gl.TRIANGLES, body.count, gl.UNSIGNED_SHORT, 0);

      gl.colorMask(true, true, true, true); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      const thr = state.flip[a] ? 1 - state.clip[a] : state.clip[a];
      const pos = -1 + 2 * thr, i1 = (a + 1) % 3, i2 = (a + 2) % 3, q = new Float32Array(24);
      [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([u, v], k) => { q[k * 6 + a] = pos; q[k * 6 + i1] = u; q[k * 6 + i2] = v; });
      gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo); gl.bufferData(gl.ARRAY_BUFFER, q, gl.DYNAMIC_DRAW); bindAttribs();
      gl.uniform3fv(U.uMask, others); gl.uniform3fv(U.uCapAxis, only); gl.uniform1f(U.uMode, 1);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);     // win the depth tie with faces lying in the plane
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.disable(gl.STENCIL_TEST);
    }
  }

  /* ------------------------------------------------- the visitor takes over */
  const HOLD_MS = 20000;                           // any interaction freezes the script for this long
  let pausedUntil = 0, needRebuild = false;
  const hold = () => { pausedUntil = performance.now() + HOLD_MS; };

  /* ------------------------------------------------------------ interaction */
  const ptrs = new Map();
  let pinch = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.button === 1 || e.shiftKey });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    hold(); calm();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) cam.dist = clamp(cam.dist * (pinch / d), 2.4, 9);
      pinch = d;
    } else if (p.pan) {
      const f = (2 * cam.dist * Math.tan(0.35)) / canvas.clientHeight;
      const right = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)];
      const up = [-Math.sin(cam.pitch) * Math.sin(cam.yaw), Math.cos(cam.pitch), -Math.sin(cam.pitch) * Math.cos(cam.yaw)];
      for (let i = 0; i < 3; i++) cam.target[i] = clamp(cam.target[i] - right[i] * dx * f + up[i] * dy * f, -2, 2);
    } else {
      cam.yaw -= dx * 0.008;
      cam.pitch = clamp(cam.pitch + dy * 0.008, -1.5, 1.5);
    }
    hold(); dirty = true;
  });
  const release = (e) => { ptrs.delete(e.pointerId); pinch = 0; hold(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;                                           // plain scrolling belongs to the page
    e.preventDefault(); hold();
    cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.001), 2.4, 9); dirty = true;
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (!k) return;
    e.preventDefault(); hold(); calm();
    cam.yaw += k[0]; cam.pitch = clamp(cam.pitch + k[1], -1.5, 1.5); dirty = true;
  });

  /* ----------------------------------------------------- overlay (sliders) */
  const hudRows = [...document.querySelectorAll('.hud-row')];
  const hudInputs = hudRows.map((r) => r.querySelector('input'));
  const hudCap = $('hud-cap'), hudAuto = $('hud-auto');
  const glowTimer = [0, 0, 0], lastMove = [0, 0, 0];

  function showClip(k, v, active) {
    state.clip[k] = v / 100;
    hudRows[k].style.setProperty('--v', v.toFixed(2));
    hudRows[k].querySelector('em').textContent = Math.round(v) + '%';
    hudRows[k].classList.toggle('active', active);
    dirty = true;
  }
  // the "someone is moving this" glow belongs to the script; once a human is in control only their own slider may glow
  function calm(except = -1) {
    hudRows.forEach((r, i) => { if (i !== except) { r.classList.remove('active'); clearTimeout(glowTimer[i]); } });
  }
  const syncSwitches = () => {
    hudCap.setAttribute('aria-checked', String(state.cap));
    hudAuto.setAttribute('aria-checked', String(state.auto));
  };

  hudInputs.forEach((input, k) => {
    showClip(k, state.clip[k] * 100, false);
    const takeOver = () => {
      hold(); needRebuild = true; calm(k);
      showClip(k, Number(input.value), true);
      clearTimeout(glowTimer[k]); glowTimer[k] = setTimeout(() => hudRows[k].classList.remove('active'), 700);
    };
    input.addEventListener('input', takeOver);
    input.addEventListener('pointerdown', () => { hold(); needRebuild = true; calm(k); });
  });
  hudCap.addEventListener('click', () => { hold(); calm(); state.cap = !state.cap; syncSwitches(); dirty = true; });
  hudAuto.addEventListener('click', () => { hold(); calm(); state.auto = !state.auto; syncSwitches(); });
  syncSwitches();

  /* ------------------------------------------ the self-playing choreography */
  // Every loop is a fresh random sequence of "moves"; every value is jittered by a few percent.
  // A key is [seconds, x%, y%, z%] and values glide between keys (smoothstep).
  // Capping and auto-rotate are never touched by the script.
  function mulberry(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const seedParam = params.get('seed');
  const rnd = mulberry(seedParam !== null ? Number(seedParam) || 1 : (Date.now() ^ 0x9e3779b9) >>> 0);

  function buildLoop(start = [0, 0, 0]) {
    const R = (lo, hi) => lo + (hi - lo) * rnd();
    const J = (v, spread = 4) => clamp(v + (rnd() * 2 - 1) * spread, 0, 85);
    let lastAxis = -1;                                      // consecutive moves never reuse the same axis
    const axis = () => { let a; do { a = (rnd() * 3) | 0; } while (a === lastAxis); lastAxis = a; return a; };
    const keys = [[0, ...start.map((x) => +x.toFixed(2))]];
    let t = 0, cur = start.slice();
    const go = (dur, v) => { t += dur; cur = v; keys.push([t, ...v.map((x) => +x.toFixed(2))]); };
    const hold_ = (d) => go(d, cur.slice());

    const moves = {
      single() { const v = [0, 0, 0]; v[axis()] = J(R(42, 68)); go(R(1.9, 2.8), v); hold_(R(0.4, 1.1)); },
      corner() {                                            // two planes at once: a wedge cut
        const a = axis(), b = (a + 1 + ((rnd() * 2) | 0)) % 3, v = [0, 0, 0];
        v[a] = J(R(30, 58)); v[b] = J(R(28, 50)); go(R(2.2, 3.0), v); hold_(R(0.5, 1.1));
      },
      octant() { go(R(2.4, 3.2), [J(R(28, 42)), J(R(25, 40)), J(R(25, 40))]); hold_(R(0.6, 1.2)); },   // all three: an octant cut
      scan() {                                              // slow sweep through the part, like paging through slices
        const a = axis(), lo = [0, 0, 0], hi = [0, 0, 0], back = [0, 0, 0];
        lo[a] = J(12, 6); hi[a] = J(R(66, 78), 5); back[a] = J(R(28, 40), 6);
        go(R(1.1, 1.7), lo); go(R(3.2, 4.3), hi); hold_(R(0.3, 0.7)); go(R(1.8, 2.6), back); hold_(R(0.4, 0.9));
      },
      wobble() { for (let i = 0; i < 3; i++) go(R(0.5, 0.8), cur.map((v) => (v > 1 ? J(v, 5) : 0))); },   // values waver by a few %
    };

    hold_(R(0.5, 1));
    const order = ['single', 'corner', 'octant', 'scan'];
    let prev = '';
    const count = 5 + ((rnd() * 2) | 0);
    for (let i = 0; i < count; i++) {
      let name;
      do { name = order[(rnd() * order.length) | 0]; } while (name === prev);
      prev = name;
      moves[name]();
      if (rnd() < 0.45 && cur.some((v) => v > 5)) moves.wobble();
    }
    go(R(1.8, 2.4), [0, 0, 0]); hold_(0.6);
    return keys;
  }
  let KEYS = buildLoop(), LOOP = KEYS[KEYS.length - 1][0];
  const smooth = (u) => u * u * (3 - 2 * u);
  let demoT = 0, frozen = false, offscreen = false;
  const startAt = params.get('t');
  if (startAt !== null) { demoT = Number(startAt) || 0; frozen = true; }
  if (reduceMotion) showClip(0, 45, false);

  function playDemo(t, now) {
    let i = 0;
    while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1), e = smooth(u);
    for (let k = 0; k < 3; k++) {
      let v = a[k + 1] + (b[k + 1] - a[k + 1]) * e;
      v = clamp(v + 1.3 * Math.sin(now * 0.0021 + k * 2.1) * Math.min(1, v / 12), 0, 100);   // organic drift
      if (Math.abs(v - state.clip[k] * 100) > 0.01) lastMove[k] = now;
      hudInputs[k].value = v.toFixed(2);
      showClip(k, v, now - lastMove[k] < 350);
    }
  }
  const restart = () => { KEYS = buildLoop(state.clip.map((v) => v * 100)); LOOP = KEYS[KEYS.length - 1][0]; demoT = 0; };

  window.addEventListener('message', (e) => {      // the portfolio page tells us when we are on screen
    if (e.data && typeof e.data.ctViewerVisible === 'boolean') offscreen = !e.data.ctViewerVisible;
  });

  /* ------------------------------------------------------------------- loop */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (offscreen) { requestAnimationFrame(frame); return; }
    if (!reduceMotion && now >= pausedUntil && !ptrs.size) {
      if (needRebuild) { restart(); needRebuild = false; }      // 20 s of quiet: continue from wherever the visitor left the sliders
      if (!frozen) { demoT += dt; if (demoT >= LOOP) { demoT -= LOOP; restart(); demoT = 0; } }
      playDemo(demoT, now);
    }
    if (state.auto && !ptrs.size && !document.hidden) { cam.yaw += dt * 0.5; dirty = true; }
    if (dirty && !document.hidden) { dirty = false; draw(); }
    requestAnimationFrame(frame);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => { dirty = true; }).observe(canvas);
  requestAnimationFrame(frame);
})();
