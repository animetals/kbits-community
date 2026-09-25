/**
 * Kbits - Theme Controller
 *
 * Applies the selected visual theme and builds the per-tine color palette.
 * Theme persistence and DOM controls are kept outside the application root.
 *
 * Environment: Browser; testable in Node.js with injected DOM and storage.
 * Invariant: Every physical tine receives a stable display color.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsThemeController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var palettes = {
    snes: ["#ff595e", "#ff924c", "#ffca3a", "#c5e63c", "#62f66f", "#32e3a1", "#2de2e6", "#39b9ff", "#4d7cff", "#7259ff", "#9d5cff", "#c45cff", "#ee5cce", "#ff5ca8", "#ff6680", "#ff8d62", "#ffd166"],
    real: ["#b96f6f", "#b98265", "#b99a65", "#aab06a", "#81aa76", "#6fa28c", "#6e9fa3", "#708fae", "#777eb5", "#8878b1", "#9978aa", "#a878a1", "#b37894", "#b97887", "#ad8580", "#b09278", "#b5a670"],
    grove: ["#c86f4a", "#d0834f", "#d19a55", "#c4ab5b", "#98a863", "#6fa173", "#5d9b84", "#5d9194", "#647fa0", "#756f9d", "#896b93", "#9d6985", "#ad6d77", "#ba776a", "#bb8760", "#b99a5b", "#b6aa64"],
    chrono: ["#ff7043", "#ff8f3d", "#ffb43b", "#e5cf45", "#9ed35c", "#55d890", "#35d6b3", "#30c9cd", "#36afd1", "#478fd0", "#6178cc", "#826ac4", "#a761b5", "#c25f9c", "#d9657e", "#ed7a5d", "#ffd27a"],
    fantasy: ["#66f2ff", "#61d8ff", "#64baff", "#6d9cff", "#777fff", "#8b6cff", "#a35fff", "#bd5cff", "#d35edb", "#e765c0", "#f06fa5", "#f47f91", "#ee947e", "#dca96f", "#c0bc72", "#9fd080", "#7de3a1"]
  };
  var allowed = Object.keys(palettes);
  var hueOffsets = { snes: 0, real: 18, grove: 36, chrono: 28, fantasy: 195 };

  /** @returns {string} Supported theme name; invalid input falls back to snes. */
  function normalizeTheme(value) {
    return allowed.indexOf(value) >= 0 ? value : "snes";
  }

  /** @returns {string[]} Independent palette expanded to the requested tine count. */
  function colorsFor(theme, count) {
    theme = normalizeTheme(theme);
    var colors = palettes[theme].slice(0, count);
    while (colors.length < count) {
      var hue = (colors.length * 360 / count + hueOffsets[theme]) % 360;
      var natural = theme === "real" || theme === "grove";
      colors.push("hsl(" + hue + " " + (natural ? 32 : 78) + "% " + (natural ? 58 : 62) + "%)");
    }
    return colors;
  }

  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document, storage, tine-count getter and theme callbacks. apply persists a normalized theme and updates DOM/palette; getTheme returns the active name. setup binds controls once.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var theme = normalizeTheme(options.storage.kbitsTheme || "snes");

    function apply(value) {
      theme = normalizeTheme(value === undefined ? theme : value);
      var colors = colorsFor(theme, options.getTineCount());
      options.document.body.dataset.theme = theme;
      options.storage.kbitsTheme = theme;
      options.document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
        button.classList.toggle("active", button.dataset.themeChoice === theme);
      });
      options.onApply(colors, theme);
      return colors;
    }

    function setup() {
      options.document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
        button.onclick = function () { apply(button.dataset.themeChoice); };
      });
      return apply();
    }

    return { setup: setup, apply: apply, getTheme: function () { return theme; } };
  }

  return { create: create, normalizeTheme: normalizeTheme, colorsFor: colorsFor };
}));
