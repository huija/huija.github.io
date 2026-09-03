/* huija.github.io · shared interactions
   scramble / particle canvas / spotlight cards / scroll reveal / copy buttons
   all motion gated by prefers-reduced-motion */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- text scramble (hero name) ---------- */

  function scramble(el) {
    var target = el.dataset.text || el.textContent;
    var chars = "!<>-_\\/[]{}=+*^?#01";
    var frame = 0;
    var queue = [];

    for (var i = 0; i < target.length; i++) {
      queue.push({
        from: target[i],
        to: target[i],
        start: Math.floor(Math.random() * 24),
        end: Math.floor(Math.random() * 24) + 20
      });
    }

    function step() {
      var output = "";
      var done = 0;
      for (var i = 0; i < queue.length; i++) {
        var q = queue[i];
        if (frame >= q.end) {
          done++;
          output += q.to;
        } else if (frame >= q.start) {
          if (!q.char || Math.random() < 0.28) {
            q.char = chars[Math.floor(Math.random() * chars.length)];
          }
          output += "<span style=\"color:var(--accent)\">" + q.char + "</span>";
        } else {
          output += q.from;
        }
      }
      el.innerHTML = output;
      if (done < queue.length) {
        frame++;
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    step();
  }

  var scrambleEls = document.querySelectorAll(".scramble");
  if (reduceMotion) {
    scrambleEls.forEach(function (el) { el.textContent = el.dataset.text || el.textContent; });
  } else {
    scrambleEls.forEach(scramble);
  }

  /* ---------- particle canvas ---------- */

  var canvas = document.querySelector(".hero-bg canvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var raf = null;
    var mouse = { x: -9999, y: -9999 };
    var LINK = 130;

    function resize() {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      var count = Math.min(70, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 22000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function tick() {
      var w = canvas.offsetWidth;
      var h = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(1, 1);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110 && dist > 0.1) {
          p.x += (dx / dist) * 0.6;
          p.y += (dy / dist) * 0.6;
        }

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(69, 200, 241, 0.45)";
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var o = particles[j];
          var ddx = p.x - o.x;
          var ddy = p.y - o.y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = "rgba(69, 200, 241, " + (0.12 * (1 - d / LINK)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    canvas.parentElement.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    canvas.parentElement.addEventListener("pointerleave", function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        tick();
      }
    });
  }

  /* ---------- spotlight cards ---------- */

  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - rect.left) + "px");
      card.style.setProperty("--my", (e.clientY - rect.top) + "px");
    });
  });

  /* ---------- scroll reveal (IntersectionObserver) ---------- */

  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- copy buttons ---------- */

  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy || btn.closest(".code-block, .install-line, .term").querySelector("pre, code").innerText;
      function done() {
        btn.classList.add("copied");
        btn.textContent = "已复制";
        setTimeout(function () {
          btn.classList.remove("copied");
          btn.textContent = "复制";
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      }
    });
  });
})();
