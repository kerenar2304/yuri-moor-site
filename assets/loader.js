(function () {
  var L = document.getElementById('ldr');
  var seen = false; try { seen = sessionStorage.getItem('ymm-ldr') === '1'; sessionStorage.setItem('ymm-ldr', '1'); } catch (e) {}
  if (seen) { L.remove(); return; }
  document.documentElement.classList.add('ldr-on');
  var lens = document.getElementById('ldr-lens'), glass = document.getElementById('ldr-glass-c');
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CX = 119.5, CY = 125.5;
  // where the glass centre wanders, in logo units: in from the left, over the letters, a pass too far, then home
  // one continuous curve (Catmull-Rom) through these points, in logo units: in from the left, a slow sweep over the words, a small overshoot, home
  var P = [[-90, 150], [-40, 140], [50, 108], [140, 150], [165, 112], [128, 118], [CX, CY], [CX, CY]], T = 2300, finished = false, tilt = 0, lastX = null;
  // the loupe leans a little into its motion, like a hand holding it, and straightens when it stops
  function place(x, y) {
    if (lastX !== null) tilt += (Math.max(-7, Math.min(7, (x - lastX) * 1.6)) - tilt) * .18;
    lastX = x;
    lens.setAttribute('transform', 'translate(' + (x - CX).toFixed(2) + ' ' + (y - CY).toFixed(2) + ') rotate(' + tilt.toFixed(2) + ' ' + CX + ' ' + CY + ')');
    glass.setAttribute('cx', x.toFixed(2)); glass.setAttribute('cy', y.toFixed(2));
  }
  function spline(p0, p1, p2, p3, u) { var u2 = u * u, u3 = u2 * u; return .5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u3); }
  function done() {
    if (finished) return; finished = true;
    tilt = 0; lastX = null; place(CX, CY); L.classList.add('found');
    setTimeout(function () { L.classList.add('out'); document.documentElement.classList.remove('ldr-on'); }, calm ? 600 : 1300);
    setTimeout(function () { L.remove(); }, calm ? 1200 : 2000);
  }
  if (calm) return setTimeout(done, 200);
  var t0 = 0;
  function frame(t) {
    if (finished) return;
    if (!t0) t0 = t;
    var k = Math.min(1, (t - t0) / T), e = .5 - Math.cos(Math.PI * k) / 2; // gentle ease in and out over the whole path
    var f = e * (P.length - 3), i = Math.min(P.length - 4, Math.floor(f)), u = f - i;
    place(spline(P[i][0], P[i + 1][0], P[i + 2][0], P[i + 3][0], u), spline(P[i][1], P[i + 1][1], P[i + 2][1], P[i + 3][1], u));
    if (k < 1) requestAnimationFrame(frame); else done();
  }
  requestAnimationFrame(frame);
  setTimeout(done, 4200); // never hold the visitor
})();