/* patryk-sadowski.pl — 404.js
   Types a fake traceroute that fails at the address you tried. No libraries. */
(() => {
  'use strict';
  const here = location.pathname + location.search;
  const shown = here.length > 34 ? here.slice(0, 33) + '…' : here;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ms = (a, b) => (a + Math.random() * (b - a)).toFixed(1).padStart(5) + ' ms';
  const lines = [
    ['cmd', `traceroute patryk-sadowski.pl${shown}`],
    ['out', ` 1  localhost            ${ms(0.2, 0.6)}`],
    ['out', ` 2  router.lan           ${ms(1.5, 3)}`],
    ['out', ` 3  isp-gateway          ${ms(8, 14)}`],
    ['out', ` 4  edge.fastly          ${ms(15, 24)}`],
    ['out', ` 5  github-pages         ${ms(18, 30)}`],
    ['err', ` 6  ${shown.slice(0, 20).padEnd(20)}  * * *`],
    ['err', '    Request timed out (HTTP 404)'],
    ['cmd', 'cd /'],
    ['ok', 'route to / found. head home.'],
  ];

  const log = document.getElementById('nf-log');
  const prompt = '<span class="t-prompt">patryk@portfolio</span><span class="t-dim">:</span><span class="t-path">~</span><span class="t-dim">$</span> ';
  const add = ([kind, text]) => {
    const row = document.createElement('div');
    if (kind === 'cmd') row.innerHTML = prompt;
    else row.className = kind === 'err' ? 't-err' : kind === 'ok' ? 't-val' : 't-dim';
    row.append(document.createTextNode(text));
    log.append(row);
  };

  if (reduced) { lines.forEach(add); return; }
  let i = 0;
  (function next() {
    if (i >= lines.length) return;
    const line = lines[i++];
    setTimeout(() => { add(line); next(); }, line[0] === 'cmd' ? 480 : 260);
  })();
})();
