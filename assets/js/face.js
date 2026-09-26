/* Hero portrait whose head and eyes follow the cursor.
   Frames (assets/img/face/) were rendered from me-clipart.png with LivePortrait:
   look-rR  - one sprite per row of the look grid, COLS frames side by side;
              row 0 = up, col 0 = viewer's right
   blink-RC - 5x5 grid with the eyes closed, same angle range
   smile, smile-big, eyes-wide - centred expressions
   The head position is continuous: each animation frame blends the four
   nearest grid frames on a canvas, so it glides instead of stepping.
   The body never moves. */
(function () {
  var box = document.querySelector('.hero-face');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var img = box.querySelector('img');
  var ROWS = 9, COLS = 17, BLINK_N = 5, BASE = 'assets/img/face/';
  var MID_R = (ROWS - 1) / 2, MID_C = (COLS - 1) / 2;
  var W = 400, H = 480;
  var frames = {};
  var names = ['smile', 'smile-big', 'eyes-wide'];
  for (var r = 0; r < ROWS; r++) names.push('look-r' + r);
  for (r = 0; r < BLINK_N; r++) {
    for (var c = 0; c < BLINK_N; c++) names.push('blink-' + r + c);
  }

  // Grid cell (r, c) -> [image, source x] for drawImage.
  var look = { rows: ROWS, cols: COLS, cell: function (r, c) { return [frames['look-r' + r], c * W]; } };
  var blinks = { rows: BLINK_N, cols: BLINK_N, cell: function (r, c) { return [frames['blink-' + r + c], 0]; } };

  var canvas, ctx, blinkLayer, blinkCtx;
  var pos = { r: MID_R, c: MID_C }, target = { r: MID_R, c: MID_C };
  var blinkAlpha = 0, blinkTarget = 0;
  var mood = null, moodShown = null, moodAlpha = 0, moodTimer = 0;
  var hovering = false, dirty = true, lastFrame = 0;
  var lastMove = 0, lastX = 0, lastY = 0, lastT = 0, lastSurprise = 0;
  var touchOnly = matchMedia('(hover: none)').matches;

  function preload() {
    var left = names.length, failed = false;
    function done() { if (--left === 0 && !failed) start(); }
    names.forEach(function (n) {
      var i = new Image();
      i.onload = function () {
        frames[n] = i;
        // Warm the decode so the first blend doesn't hitch; never wait on it.
        if (i.decode) i.decode().catch(function () {});
        done();
      };
      i.onerror = function () { failed = true; done(); };
      i.src = BASE + n + '.webp';
    });
  }

  function visible() {
    if (box.offsetParent === null || document.hidden) return false;
    var r = box.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  // Crossfade mostly in the middle of the gap between two frames. A full-width
  // blend shows two faces at once (a ghost); this keeps close to one clean
  // frame on screen and fades as the head passes the midpoint.
  function sharpen(f) {
    var t = Math.max(0, Math.min(1, (f - 0.1) / 0.8));
    return t * t * (3 - 2 * t);
  }

  // Draw the four grid frames around (r, c). Each layer goes on top with
  // alpha = its weight / running total, which composites to exactly the
  // weighted average.
  function blend(g, grid, r, c) {
    var r0 = Math.min(Math.floor(r), grid.rows - 2), c0 = Math.min(Math.floor(c), grid.cols - 2);
    var fr = sharpen(r - r0), fc = sharpen(c - c0);
    var layers = [
      [r0, c0, (1 - fr) * (1 - fc)], [r0, c0 + 1, (1 - fr) * fc],
      [r0 + 1, c0, fr * (1 - fc)], [r0 + 1, c0 + 1, fr * fc]
    ];
    var total = 0;
    layers.forEach(function (l) {
      if (l[2] <= 0.001) return;
      total += l[2];
      g.globalAlpha = l[2] / total;
      var t = grid.cell(l[0], l[1]);
      g.drawImage(t[0], t[1], 0, W, H, 0, 0, W, H);
    });
    g.globalAlpha = 1;
  }

  function draw() {
    blend(ctx, look, pos.r, pos.c);
    if (blinkAlpha > 0.01) {
      blend(blinkCtx, blinks, pos.r * (BLINK_N - 1) / (ROWS - 1), pos.c * (BLINK_N - 1) / (COLS - 1));
      ctx.globalAlpha = blinkAlpha;
      ctx.drawImage(blinkLayer, 0, 0);
    }
    if (moodShown && moodAlpha > 0.01) {
      ctx.globalAlpha = moodAlpha;
      ctx.drawImage(frames[moodShown], 0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  // Move `value` toward `goal`, frame-rate independent. `ms` is roughly how
  // long it takes to close most of the gap.
  function ease(value, goal, dt, ms) {
    return value + (goal - value) * (1 - Math.exp(-dt / ms));
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(now - lastFrame, 64);
    lastFrame = now;
    if (!visible()) return;

    if (now - lastMove > 7000 && !touchOnly) { target.r = MID_R; target.c = MID_C; }

    var before = pos.r + pos.c + blinkAlpha + moodAlpha;
    pos.r = ease(pos.r, target.r, dt, 110);
    pos.c = ease(pos.c, target.c, dt, 110);
    blinkAlpha = ease(blinkAlpha, blinkTarget, dt, 22);

    if (mood !== moodShown) {
      // Fade the old expression out before the new one fades in.
      moodAlpha = ease(moodAlpha, 0, dt, 45);
      if (moodAlpha < 0.02) { moodShown = mood; moodAlpha = 0; }
    } else {
      moodAlpha = ease(moodAlpha, mood ? 1 : 0, dt, 60);
    }

    var after = pos.r + pos.c + blinkAlpha + moodAlpha;
    if (dirty || Math.abs(after - before) > 0.0005) {
      dirty = false;
      draw();
    }
  }

  function setMood(name, ms) {
    clearTimeout(moodTimer);
    mood = name;
    if (ms) moodTimer = setTimeout(function () { mood = hovering ? 'smile' : null; }, ms);
  }

  // Cursor offset from the eyes -> 0..1 along one axis. The power curve
  // makes small moves near the face register, while far corners reach the edge.
  function axis(v) {
    v = Math.max(-1, Math.min(1, v));
    v = (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), 0.75);
    return (v + 1) / 2;
  }

  function aim(x, y) {
    var r = box.getBoundingClientRect();
    var ex = r.left + r.width / 2, ey = r.top + r.height * 0.38;
    target.c = (1 - axis((x - ex) / (innerWidth * 0.4))) * (COLS - 1);
    target.r = axis((y - ey) / (innerHeight * 0.45)) * (ROWS - 1);
  }

  function blink() {
    if (visible() && !mood) {
      blinkTarget = 1;
      setTimeout(function () {
        blinkTarget = 0;
        if (Math.random() < 0.2) setTimeout(blink, 200);
      }, 120);
    }
  }

  function scheduleBlink() {
    setTimeout(function () { blink(); scheduleBlink(); }, 2500 + Math.random() * 3500);
  }

  // Touch screens have no cursor: glance around now and then.
  function glance() {
    if (visible() && !mood) {
      target.r = Math.random() * (ROWS - 1);
      target.c = Math.random() * (COLS - 1);
      setTimeout(function () { target.r = MID_R; target.c = MID_C; }, 1400);
    }
    setTimeout(glance, 4000 + Math.random() * 4000);
  }

  function start() {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    blinkLayer = document.createElement('canvas');
    blinkLayer.width = W;
    blinkLayer.height = H;
    blinkCtx = blinkLayer.getContext('2d');
    draw();
    box.replaceChild(canvas, img);

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var now = performance.now();
      lastMove = now;
      aim(e.clientX, e.clientY);

      // A fast flick of the cursor gets a brief wide-eyed look, but only while
      // the head is near centre, where the centred expression frame lines up.
      var dt = now - lastT;
      if (dt > 0 && dt < 100 && !hovering && now - lastSurprise > 6000 &&
          Math.abs(pos.r - MID_R) < ROWS / 6 && Math.abs(pos.c - MID_C) < COLS / 6) {
        var speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;
        if (speed > 4) { lastSurprise = now; setMood('eyes-wide', 500); }
      }
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) { target.r = MID_R; target.c = MID_C; }
    });

    box.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      hovering = true;
      setMood('smile');
    });
    box.addEventListener('pointerleave', function () {
      hovering = false;
      setMood(null);
    });
    box.addEventListener('click', function () { setMood('smile-big', 1400); });

    requestAnimationFrame(function (t) { lastFrame = t; loop(t); });
    scheduleBlink();
    if (touchOnly) glance();
  }

  if (document.readyState === 'complete') preload();
  else addEventListener('load', preload);
})();
