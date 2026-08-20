/* ADIUMENTUM 01 — minimálny skript webu (bez knižníc).
   1) mobilná navigácia, 2) rok v pätičke, 3) odoslanie kontaktného formulára. */
(function () {
  "use strict";

  /* --- Mobilná navigácia ------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("hlavna-navigacia");

  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { setOpen(false); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Pri prechode na širokú obrazovku vrátime navigáciu do základného stavu. */
    var mq = window.matchMedia("(min-width: 861px)");
    var onChange = function (e) { if (e.matches) { setOpen(false); } };
    if (mq.addEventListener) { mq.addEventListener("change", onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }
  }

  /* --- Aktuálny rok v pätičke -------------------------------------------- */
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-rok]"),
    function (el) { el.textContent = String(new Date().getFullYear()); }
  );

  /* --- Kontaktný formulár ------------------------------------------------
     Statický web nemá vlastný server. Formulár preto odosielame na externú
     službu (Formspree / Web3Forms) cez fetch. Kým nie je v atribúte action
     doplnená reálna adresa, formulár otvorí e-mailového klienta (mailto).
     Podrobnosti sú v súbore README.md. */
  var form = document.querySelector("[data-kontakt-formular]");
  if (!form) { return; }

  var status = form.querySelector("[data-stav]");
  var submitBtn = form.querySelector("button[type=submit]");

  var say = function (text, ok) {
    if (!status) { return; }
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle("notice--legal", !ok);
  };

  form.addEventListener("submit", function (e) {
    /* Honeypot: vyplnené skryté pole = robot, ticho končíme. */
    var trap = form.querySelector("input[name=webova-adresa]");
    if (trap && trap.value) { e.preventDefault(); return; }

    var action = form.getAttribute("action") || "";
    if (action.indexOf("http") !== 0) {
      /* Zatiaľ bez servera — poskladáme e-mail. */
      e.preventDefault();
      var d = new FormData(form);
      var telo = [
        "Meno: " + (d.get("meno") || ""),
        "Organizácia: " + (d.get("organizacia") || ""),
        "E-mail: " + (d.get("email") || ""),
        "Telefón: " + (d.get("telefon") || ""),
        "Služba: " + (d.get("sluzba") || ""),
        "",
        d.get("sprava") || ""
      ].join("\n");
      window.location.href =
        "mailto:" + (form.dataset.email || "info@adiumentum.sk") +
        "?subject=" + encodeURIComponent("Dopyt z webu — " + (d.get("sluzba") || "všeobecný")) +
        "&body=" + encodeURIComponent(telo);
      say("Otvorili sme váš e-mailový program s predvyplnenou správou. Ak sa neotvoril, napíšte nám priamo na uvedenú adresu.", true);
      return;
    }

    e.preventDefault();
    if (submitBtn) { submitBtn.disabled = true; }
    say("Odosielame…", true);

    fetch(action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) { throw new Error("HTTP " + res.status); }
        form.reset();
        say("Ďakujeme, dopyt sme prijali. Ozveme sa vám do dvoch pracovných dní.", true);
      })
      .catch(function () {
        say("Správu sa nepodarilo odoslať. Napíšte nám prosím priamo na uvedený e-mail alebo zavolajte.", false);
      })
      .then(function () {
        if (submitBtn) { submitBtn.disabled = false; }
      });
  });
})();
