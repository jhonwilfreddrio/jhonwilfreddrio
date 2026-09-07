(function () {
  "use strict";

  /**
   * Light/dark theme toggle
   */
  const themeToggle = document.querySelector(".theme-toggle");
  const savedTheme = localStorage.getItem("portfolioTheme");
  const preferredTheme = savedTheme === "light" ? "light" : "dark";

  const setTheme = (theme) => {
    document.body.dataset.theme = theme;

    if (!themeToggle) return;

    const isLight = theme === "light";
    const label = isLight ? "Light" : "Dark";
    const nextLabel = isLight ? "dark mode" : "light mode";

    themeToggle.setAttribute("aria-label", "Switch to " + nextLabel);
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.querySelector(".theme-toggle__text").textContent = label;
    themeToggle.querySelector(".theme-toggle__icon i").className = isLight
      ? "bi bi-sun"
      : "bi bi-moon-stars";
  };

  setTheme(preferredTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem("portfolioTheme", nextTheme);
      setTheme(nextTheme);
    });
  }

  /**
   * Update age function
   */
  var today = new Date();
  var birthDate = new Date("2003/11/04");
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const ageElement = document.getElementById("Drio_age");
  if (ageElement) {
    ageElement.innerHTML = age;
  }

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim();
    if (all) {
      return [...document.querySelectorAll(el)];
    } else {
      return document.querySelector(el);
    }
  };

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all);

    if (selectEl) {
      if (all) {
        selectEl.forEach((e) => e.addEventListener(type, listener));
      } else {
        selectEl.addEventListener(type, listener);
      }
    }
  };

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /**
   * Mobile nav toggle
   */
  const setNavState = (isOpen) => {
    const toggle = select(".mobile-nav-toggle");
    const navbar = select("#navbar");
    if (!toggle || !navbar) return;

    navbar.classList.toggle("navbar-mobile", isOpen);
    document.body.classList.toggle("mobile-nav-active", isOpen);

    const icon = toggle.querySelector("i");
    if (icon) {
      icon.className = isOpen ? "bi bi-x" : "bi bi-list";
    }
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };

  on("click", ".mobile-nav-toggle", function () {
    setNavState(!select("#navbar").classList.contains("navbar-mobile"));
  });

  // Tapping the backdrop (outside the menu list) closes the menu
  on("click", "#navbar", function (e) {
    if (e.target === this) {
      setNavState(false);
    }
  });

  on("keydown", "body", function (e) {
    if (e.key === "Escape") {
      setNavState(false);
    }
  });

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on(
    "click",
    "#navbar .nav-link",
    function (e) {
      let section = select(this.hash);
      if (section) {
        e.preventDefault();

        let navbar = select("#navbar");
        let header = select("#header");
        let sections = select("section", true);
        let navlinks = select("#navbar .nav-link", true);

        navlinks.forEach((item) => {
          item.classList.remove("active");
        });

        this.classList.add("active");

        if (navbar.classList.contains("navbar-mobile")) {
          setNavState(false);
        }

        if (this.hash == "#header") {
          header.classList.remove("header-top");
          sections.forEach((item) => {
            item.classList.remove("section-show");
          });
          return;
        }

        if (!header.classList.contains("header-top")) {
          header.classList.add("header-top");
          setTimeout(function () {
            sections.forEach((item) => {
              item.classList.remove("section-show");
            });
            section.classList.add("section-show");
          }, 350);
        } else {
          sections.forEach((item) => {
            item.classList.remove("section-show");
          });
          section.classList.add("section-show");
        }

        scrollto(this.hash);
      }
    },
    true
  );

  /**
   * Activate/show sections on load and on hash change (e.g. a link
   * to index.html#contact, or the browser back/forward buttons)
   */
  const showSectionFromHash = () => {
    let header = select("#header");
    let sections = select("section", true);
    let navlinks = select("#navbar .nav-link", true);

    navlinks.forEach((item) => {
      if (item.getAttribute("href") == (window.location.hash || "#header")) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    if (!window.location.hash || window.location.hash == "#header") {
      header.classList.remove("header-top");
      sections.forEach((item) => {
        item.classList.remove("section-show");
      });
      return;
    }

    let target = select(window.location.hash);
    if (target) {
      // Anchors inside a section (e.g. #kora, #leaps) show their parent
      // section, then scroll to the anchor once it is visible.
      let inner = target.tagName.toLowerCase() === "section" ? null : target;
      let sectionTarget = inner ? inner.closest("section") : target;
      if (!sectionTarget) return;

      navlinks.forEach((item) => {
        item.classList.toggle("active", item.getAttribute("href") == "#" + sectionTarget.id);
      });

      header.classList.add("header-top");

      setTimeout(function () {
        sections.forEach((item) => {
          item.classList.remove("section-show");
        });
        sectionTarget.classList.add("section-show");
        if (inner) {
          setTimeout(function () {
            inner.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 320);
        }
      }, 350);

      if (!inner) scrollto(window.location.hash);
    }
  };

  window.addEventListener("load", () => {
    if (window.location.hash) {
      showSectionFromHash();
    }
  });

  window.addEventListener("hashchange", showSectionFromHash);

  on(
    "click",
    "a[href^='#']:not(.nav-link)",
    function (e) {
      let hash = this.getAttribute("href");
      if (hash === "#" || !select(hash)) return;
      e.preventDefault();
      if (window.location.hash === hash) {
        showSectionFromHash();
      } else {
        window.location.hash = hash;
      }
    },
    true
  );

  /**
   * Skills animation
   */
  let skilsContent = select(".skills-content");
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: "80%",
      handler: function (direction) {
        let progress = select(".progress .progress-bar", true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute("aria-valuenow") + "%";
        });
      },
    });
  }

  /**
   * Testimonials slider
   */
  new Swiper(".testimonials-slider", {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    slidesPerView: "auto",
    pagination: {
      el: ".swiper-pagination",
      type: "bullets",
      clickable: true,
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20,
      },

      1200: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
    },
  });

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener("load", () => {
    let portfolioContainer = select(".portfolio-container");
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: ".portfolio-item",
        layoutMode: "fitRows",
      });

      let portfolioFilters = select("#portfolio-flters li", true);

      on(
        "click",
        "#portfolio-flters li",
        function (e) {
          e.preventDefault();
          portfolioFilters.forEach(function (el) {
            el.classList.remove("filter-active");
          });
          this.classList.add("filter-active");

          portfolioIsotope.arrange({
            filter: this.getAttribute("data-filter"),
          });
        },
        true
      );
    }
  });

  /**
   * Initiate portfolio lightbox
   */
  const portfolioLightbox = GLightbox({
    selector: ".portfolio-lightbox",
  });

  /**
   * Initiate portfolio details lightbox
   */
  const portfolioDetailsLightbox = GLightbox({
    selector: ".portfolio-details-lightbox",
    width: "90%",
    height: "90vh",
  });

  /**
   * Portfolio details slider
   */
  new Swiper(".portfolio-details-slider", {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".swiper-pagination",
      type: "bullets",
      clickable: true,
    },
  });
})();
window.addEventListener("DOMContentLoaded", function () {
  // get the form elements defined in your form HTML above

  var form = document.getElementById("my-form");
  // var button = document.getElementById("my-form-button");
  var status = document.getElementById("status");

  // Success and Error functions for after the form is submitted

  function success() {
    form.reset();
    status.classList.add("success");
    status.innerHTML = "Your message has been sent!";
  }

  function error() {
    status.classList.add("error");
    status.innerHTML = "Oops! There was a problem.";
  }

  // handle the form submission event

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = new FormData(form);
    ajax(form.method, form.action, data, success, error);
  });
});

// helper function for sending an AJAX request

function ajax(method, url, data, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, url);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) return;
    if (xhr.status === 200) {
      success(xhr.response, xhr.responseType);
    } else {
      error(xhr.status, xhr.response, xhr.responseType);
    }
  };
  xhr.send(data);
}

/**
 * KORA mascot — sprite state switcher + speech bubble
 */
(function () {
  "use strict";
  var stage = document.querySelector(".kora-stage");
  if (!stage) return;

  var sprite = stage.querySelector(".kora-sprite");
  var bubble = stage.querySelector(".kora-bubble-text");
  var buttons = Array.prototype.slice.call(stage.querySelectorAll(".kora-state-btn"));
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var typeTimer = null;

  function typeText(text) {
    if (!bubble) return;
    if (typeTimer) clearInterval(typeTimer);
    if (reduceMotion) { bubble.textContent = text; return; }
    bubble.textContent = "";
    var i = 0;
    typeTimer = setInterval(function () {
      i += 2;
      bubble.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; }
    }, 18);
  }

  function setState(btn) {
    var state = btn.getAttribute("data-state");
    buttons.forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
    sprite.setAttribute("data-state", state);
    typeText(btn.getAttribute("data-line") || "");
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () { setState(btn); });
  });

  // Cycle through states automatically until the visitor picks one.
  var idx = 0;
  var auto = setInterval(function () {
    idx = (idx + 1) % buttons.length;
    setState(buttons[idx]);
  }, 5200);
  stage.addEventListener("click", function () { clearInterval(auto); }, { once: true });

  if (buttons[0]) setState(buttons[0]);
})();

/**
 * KORA flowchart tabs
 */
(function () {
  "use strict";
  var root = document.querySelector(".kora-flows");
  if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll(".kora-flow-tab"));
  var panels = Array.prototype.slice.call(root.querySelectorAll(".kora-flow-panel"));

  function activate(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      var on = p.id === tab.getAttribute("aria-controls");
      p.classList.toggle("is-active", on);
      p.hidden = !on;
    });
  }

  tabs.forEach(function (tab, i) {
    tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
    tab.addEventListener("click", function () { activate(tab); });
    tab.addEventListener("keydown", function (e) {
      var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      var t = tabs[(next + tabs.length) % tabs.length];
      t.focus();
      activate(t);
    });
  });
})();
