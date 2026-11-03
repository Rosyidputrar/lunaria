/* Lunaria — landing page behaviour
   1. header shadow on scroll
   2. menu mobile
   3. FAQ accordion (height animation, keyboard friendly)
   4. reveal on scroll (IntersectionObserver, dihormati reduced-motion)
   5. count-up kecil pada angka bukti
*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. header ---------- */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 2. menu mobile ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");

  var setMenu = function (open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    menu.hidden = !open;
  };

  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- 3. FAQ accordion ---------- */
  var faqButtons = document.querySelectorAll(".faq__btn");

  faqButtons.forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));

    // siapkan tinggi awal
    panel.style.height = "0px";

    btn.addEventListener("click", function () {
      var isOpen = btn.getAttribute("aria-expanded") === "true";

      // tutup item lain agar daftar tetap ringkas
      faqButtons.forEach(function (other) {
        if (other === btn) return;
        var otherPanel = document.getElementById(other.getAttribute("aria-controls"));
        if (other.getAttribute("aria-expanded") === "true") {
          other.setAttribute("aria-expanded", "false");
          otherPanel.style.height = otherPanel.scrollHeight + "px";
          requestAnimationFrame(function () {
            otherPanel.style.height = "0px";
          });
        }
      });

      btn.setAttribute("aria-expanded", String(!isOpen));

      if (isOpen) {
        panel.style.height = panel.scrollHeight + "px";
        requestAnimationFrame(function () {
          panel.style.height = "0px";
        });
      } else {
        panel.style.height = panel.scrollHeight + "px";
        panel.addEventListener(
          "transitionend",
          function done() {
            // biarkan auto supaya responsif saat viewport berubah
            if (btn.getAttribute("aria-expanded") === "true") panel.style.height = "auto";
            panel.removeEventListener("transitionend", done);
          },
          { once: true }
        );
      }
    });
  });

  /* ---------- 4. reveal on scroll ---------- */
  var revealItems = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          // jeda bertingkat untuk elemen dalam satu grup
          var siblings = Array.prototype.slice.call(el.parentNode.children);
          var index = siblings.indexOf(el);
          el.style.setProperty("--reveal-delay", Math.min(index, 5) * 60 + "ms");
          el.classList.add("is-in");
          observer.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealItems.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 5. count-up angka bukti ---------- */
  var counters = document.querySelectorAll("[data-count]");

  if (!reduceMotion && "IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseFloat(el.dataset.count);
          var suffix = el.dataset.suffix || "";
          var start = performance.now();
          var duration = 900;

          var tick = function (now) {
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var value = target * eased;
            var text =
              target % 1 === 0 ? Math.round(value).toString() : value.toFixed(1).replace(".", ",");
            el.textContent = text + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          countObserver.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach(function (el) {
      countObserver.observe(el);
    });
  }
})();
