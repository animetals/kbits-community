/**
 * Kbits - Navigation Controller
 * Owns menu/panel visibility, saved top-bar visibility, and fullscreen controls.
 * Feature refresh and canvas resizing remain injected application callbacks.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsNavigationController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document, host, storage, timers and refresh/resize callbacks. Panel actions mutate dialog and body state; top-bar visibility persists locally. Bind once; fullscreen availability and completion remain browser-controlled.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var document = options.document, window = options.host, localStorage = options.storage;
    var setTimeout = options.setTimeout, resize = options.resize;
    function $(selector) { return document.querySelector(selector); }
    function setupSidebarMenu(){var button=$("#menu-button"),menu=$("#side-menu");function setOpen(open){document.body.classList.toggle("side-menu-open",open);menu.setAttribute("aria-hidden",String(!open));button.setAttribute("aria-expanded",String(open));button.setAttribute("aria-label",open?"Close menu":"Open menu");setTimeout(resize,0)}button.onclick=function(){var open=!document.body.classList.contains("side-menu-open");document.querySelectorAll("dialog[open]").forEach(function(dialog){dialog.close()});document.body.classList.remove("side-panel-open");setOpen(open)};window.setSidebarMenu=setOpen}
    function setupTopBar(){var button=$("#toggle-top-menu"),hidden=localStorage.kbitsTopMenuHidden==="1";function apply(){document.body.classList.toggle("top-menu-hidden",hidden);button.setAttribute("aria-expanded",String(!hidden));button.querySelector(".top-panel-label").textContent=hidden?"SHOW TOP BAR":"HIDE TOP BAR";localStorage.kbitsTopMenuHidden=hidden?"1":"0";setTimeout(resize,0)}button.onclick=function(){hidden=!hidden;if(hidden){document.querySelectorAll("dialog[open]").forEach(function(dialog){dialog.close()});document.body.classList.remove("side-panel-open");if(window.setSidebarMenu)window.setSidebarMenu(false)}apply()};apply()}
    function setupFullscreen(){var button=$("#toggle-fullscreen");if(!button)return;function active(){return !!document.fullscreenElement}function update(){var isActive=active();button.setAttribute("aria-pressed",String(isActive));button.setAttribute("aria-label",isActive?"Exit full screen":"Enter full screen");button.title=isActive?"Exit full screen":"Enter full screen";button.textContent=isActive?"↙":"⛶"}if(!document.fullscreenEnabled){button.disabled=true;button.title="Full screen is not supported by this browser"}button.onclick=function(){var action=active()?document.exitFullscreen():document.documentElement.requestFullscreen();if(action&&action.catch)action.catch(update)};document.addEventListener("fullscreenchange",update);update()}
    function closeSidePanel(dialog){if(dialog&&dialog.open)dialog.close();document.body.classList.remove("side-panel-open");setTimeout(resize,0)}
    function openSidePanel(id){var dialog=$("#"+id);if(dialog.open){closeSidePanel(dialog);return}document.querySelectorAll("dialog[open]").forEach(function(openDialog){openDialog.close()});if(window.setSidebarMenu)window.setSidebarMenu(false);options.beforeOpen(id);dialog.show();document.body.classList.add("side-panel-open");setTimeout(resize,0)}
    function setupPanels() {
      document.querySelectorAll("[data-open]").forEach(function(button){button.onclick=function(){openSidePanel(button.dataset.open)}});
      document.querySelectorAll("[data-close]").forEach(function(button){button.onclick=function(){closeSidePanel(button.closest("dialog"))}});
    }
    return { setupMenu: setupSidebarMenu, setupTopBar: setupTopBar, setupFullscreen: setupFullscreen, setupPanels: setupPanels, openPanel: openSidePanel, closePanel: closeSidePanel };
  }
  return { create: create };
}));
