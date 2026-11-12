/* Country Trading PLC — site script (plain JavaScript, no libraries).
   Everything here is an enhancement: pages still work if it does not load. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var site = window.CT_CONFIG || {};
  var cfg = {};
  try { cfg = JSON.parse(document.getElementById("ct-config").textContent); } catch (e) { /* no page strings */ }
  var t = cfg.t || {};
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var isEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "")); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  doc.classList.remove("no-js");

  /* 1. Contact details from assets/config.js */
  $$('[data-site="email"]').forEach(function (el) {
    if (isEmail(site.email)) el.innerHTML = '<a href="mailto:' + site.email + '">' + site.email + "</a>";
  });
  $$('[data-site="phone"]').forEach(function (el) {
    if (site.phone) el.innerHTML = '<a href="tel:' + site.phone.replace(/\s/g, "") + '">' + site.phone + "</a>";
  });
  $$("[data-site-mailto]").forEach(function (a) {
    var to = site[a.getAttribute("data-site-mailto")] || site.email;
    if (isEmail(to)) a.href = "mailto:" + to + "?subject=" + encodeURIComponent(a.getAttribute("data-subject") || "");
    else a.hidden = true;
  });
  $$("[data-site-missing]").forEach(function (el) {
    if (isEmail(site[el.getAttribute("data-site-missing")] || site.email)) el.hidden = true;
  });

  /* 2. Light / dark theme (the first choice comes from the system setting) */
  var tt = document.querySelector(".theme-toggle");
  if (tt) {
    var sync = function () {
      var dark = doc.getAttribute("data-theme") === "dark";
      tt.setAttribute("aria-pressed", dark ? "true" : "false");
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", dark ? "#00245c" : "#ffffff");
    };
    sync();
    tt.addEventListener("click", function () {
      var next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
      doc.setAttribute("data-theme", next);
      store.set("ct-theme", next);
      sync();
    });
  }

  /* 3. Mobile menu */
  var mt = document.querySelector(".menu-toggle"), nav = document.getElementById("main-nav");
  if (mt && nav) {
    mt.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      mt.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { nav.classList.remove("is-open"); mt.setAttribute("aria-expanded", "false"); mt.focus(); }
    });
  }

  /* 3b. "Our businesses" dropdown: button toggles it (hover and keyboard focus also open it on desktop) */
  $$(".has-sub").forEach(function (li) {
    var btn = li.querySelector(".sub-toggle");
    var set = function (open) { li.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); };
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(!li.classList.contains("is-open")); });
    li.addEventListener("keydown", function (e) { if (e.key === "Escape" && li.classList.contains("is-open")) { set(false); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!li.contains(e.target)) set(false); });
  });

  /* 4. Remember the language choice (used by the root page) */
  $$("[data-lang]").forEach(function (a) { a.addEventListener("click", function () { store.set("ct-locale", a.getAttribute("data-lang")); }); });

  /* 5. Filters: partners (groups) and news (cards). Without JavaScript everything is shown. */
  $$(".filter").forEach(function (filter) {
    filter.hidden = false;
    var items = $$(".partner-group, [data-category]");
    filter.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var val = b.getAttribute("data-filter");
      $$("button", filter).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      items.forEach(function (it) {
        var key = it.getAttribute("data-division") || it.getAttribute("data-category");
        it.hidden = !(val === "all" || key === val);
      });
      var live = document.getElementById("filter-status");
      if (live && t.shown) live.textContent = t.shown.replace("{n}", items.filter(function (i) { return !i.hidden; }).length);
    });
  });

  /* 6. Map: Google Maps loads only after the visitor asks for it */
  $$("[data-map-src]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var box = btn.closest(".map-facade"), f = document.createElement("iframe");
      f.src = btn.getAttribute("data-map-src"); f.title = btn.getAttribute("data-map-title") || "Map";
      f.loading = "lazy"; f.setAttribute("allowfullscreen", "");
      box.appendChild(f); box.querySelector(".inner").hidden = true;
    });
  });

  /* 7. Partner logos: pause button for the scrolling line */
  $$("[data-marquee]").forEach(function (m) {
    var b = m.querySelector(".marquee-toggle"); if (!b || reduce) return;
    b.hidden = false;
    b.addEventListener("click", function () {
      var paused = m.classList.toggle("is-paused");
      b.setAttribute("aria-pressed", paused ? "true" : "false");
      b.setAttribute("aria-label", b.getAttribute(paused ? "data-label-play" : "data-label-pause"));
    });
  });

  /* 8. "At a glance" figures count up once when they scroll into view */
  var nums = $$(".gstat-num[data-count]");
  if (nums.length && !reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "", fr = el.getAttribute("data-locale") === "fr", final = el.textContent, t0 = null;
        if (end >= 1900 && end <= 2100) return; /* years stay as they are */
        (function step(ts) {
          if (!t0) t0 = ts || 0;
          var k = Math.min(1, ((ts || 0) - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
          el.textContent = k < 1 ? v.toLocaleString(fr ? "fr-FR" : "en-GB") + suf : final;
          if (k < 1) requestAnimationFrame(step);
        })();
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* 9. Contact and investor forms: build an email from the visitor's answers and open it in their email app */
  $$("form[data-mailform]").forEach(function (form) {
    var status = form.querySelector(".form-status"), box = form.querySelector(".mail-preview");
    var open = box.querySelector('[data-preview="open"]'), copy = box.querySelector('[data-preview="copy"]'), body = box.querySelector(".mail-body");
    function setErr(f, msg) {
      var id = f.id + "-err", el = document.getElementById(id);
      if (msg) {
        f.setAttribute("aria-invalid", "true");
        if (!el) { el = document.createElement("p"); el.id = id; el.className = "err"; f.closest(".field").appendChild(el); }
        el.textContent = msg;
        f.setAttribute("aria-describedby", id);
      } else { f.removeAttribute("aria-invalid"); if (el) el.textContent = ""; }
    }
    function val(name) { var f = form.elements[name]; return f && f.value ? f.value.trim() : ""; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      $$("input, select, textarea", form).forEach(function (f) {
        if (f.closest(".mail-preview")) return;
        var msg = "";
        if (f.required && f.type === "checkbox" && !f.checked) msg = t.consent;
        else if (f.required && !f.value.trim()) msg = t.required;
        else if (f.type === "email" && f.value && !isEmail(f.value)) msg = t.email;
        setErr(f, msg); if (msg && !bad) bad = f;
      });
      if (bad) { status.className = "form-status is-error"; status.textContent = t.fix || ""; bad.focus(); return; }

      var topic = form.elements.topic ? form.elements.topic.options[form.elements.topic.selectedIndex].text : "";
      var docs = $$('input[name="documents"]:checked', form).map(function (c) { return "- " + c.parentNode.textContent.trim(); });
      var subject = form.getAttribute("data-subject") + (topic ? " — " + topic : "") + " — " + val("name");
      var lines = [t.greeting, "", t.intro, ""];
      if (val("message")) lines.push(val("message"), "");
      if (docs.length) lines.push(t.docsLine, docs.join("\n"), "");
      lines.push(t.closing, val("name"));
      ["organisation", "email", "phone"].forEach(function (k) { if (val(k)) lines.push(val(k)); });
      var text = lines.join("\n");
      var to = site[form.getAttribute("data-to")] || site.email;

      box.querySelector('[data-preview="to"]').textContent = isEmail(to) ? to : "—";
      box.querySelector('[data-preview="subject"]').textContent = subject;
      body.value = text;
      box.hidden = false;
      status.className = "form-status"; status.textContent = "";
      if (isEmail(to)) {
        open.hidden = false;
        open.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text.replace(/\n/g, "\r\n"));
        window.location.href = open.href; /* opens the visitor's email app with everything filled in */
      } else {
        open.hidden = true;
        status.className = "form-status is-error"; status.textContent = t.noEmail || "";
      }
      box.focus();
    });
    copy.addEventListener("click", function () {
      var done = function () { status.className = "form-status"; status.textContent = t.copied || ""; };
      var txt = "Subject: " + box.querySelector('[data-preview="subject"]').textContent + "\n\n" + body.value;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { body.select(); document.execCommand("copy"); done(); });
      else { body.select(); document.execCommand("copy"); done(); }
    });
  });
})();
