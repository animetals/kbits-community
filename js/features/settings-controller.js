/**
 * Kbits - Settings Controller
 * Owns saved player preferences, labels, stickers, and settings event bindings.
 * Audio, pointer input, and rendering effects remain injected callbacks.
 * Invariant: legacy preference defaults and storage keys remain unchanged.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.KbitsSettingsController=api;
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Retains shared player state, storage and injected DOM/audio/render callbacks. Setup methods restore preferences and bind controls; changes persist locally and update shared state. Call each setup once in composition-root order; updateLabels repaints the current tines.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options){
    var document=options.document,localStorage=options.storage,state=options.state,tines=options.tines;
    var MutationObserver=options.MutationObserver,numberName=options.numberName,labelsReady=false;
    function $(selector){return document.querySelector(selector)}
    function updateLabels(){var showNumber=$("#label-number").checked,showNote=$("#label-note").checked,showKey=$("#label-key").checked;if(labelsReady){localStorage.kbitsLabelNumber=showNumber?"1":"0";localStorage.kbitsLabelNote=showNote?"1":"0";localStorage.kbitsLabelKey=showKey?"1":"0"}document.body.classList.toggle("hide-tine-keys",!showKey);document.querySelectorAll(".tine-label").forEach(function(el){var i=+el.closest(".tine").dataset.lane,parts=[];if(showNumber)parts.push(numberName(options.getPhysical()[i]));if(showNote)parts.push(options.getLetters()[i].replace(/-?\d+$/,""));el.textContent=parts.join(" ")})}
    function settings(){var allowed=["freepats","moozica","vini","keylimba"],zoom=+(localStorage.kbitsTineZoom||1),legacyVolume=+(localStorage.kbitsVolume||.8),oldLabels=localStorage.kbitsLabels||"both";state.sound=localStorage.kbitsSound||"freepats";if(allowed.indexOf(state.sound)<0)state.sound="freepats";state.tineVolume=+(localStorage.kbitsTineVolume||legacyVolume);state.songVolume=+(localStorage.kbitsSongVolume||legacyVolume);state.preview=+(localStorage.kbitsPreview||3);if([.6,.75,.9,1,1.1,1.25,1.4].indexOf(zoom)<0)zoom=1;$("#sound").value=state.sound;$("#tine-volume").value=state.tineVolume*100;$("#tine-volume-value").value=Math.round(state.tineVolume*100)+"%";$("#song-volume").value=state.songVolume*100;$("#song-volume-value").value=Math.round(state.songVolume*100)+"%";$("#preview").value=state.preview;$("#label-number").checked=localStorage.getItem("kbitsLabelNumber")===null?oldLabels==="both"||oldLabels==="number":localStorage.kbitsLabelNumber==="1";$("#label-note").checked=localStorage.getItem("kbitsLabelNote")===null?oldLabels==="both"||oldLabels==="note":localStorage.kbitsLabelNote==="1";$("#label-key").checked=localStorage.getItem("kbitsLabelKey")===null?true:localStorage.kbitsLabelKey==="1";$("#tine-zoom").value=zoom;document.documentElement.style.setProperty("--tine-zoom",zoom);$("#sound").onchange=function(){options.stopVoices();state.sound=this.value;localStorage.kbitsSound=state.sound;options.refreshSoundfont();options.prepareSamples()};$("#tine-volume").oninput=function(){state.tineVolume=this.value/100;$("#tine-volume-value").value=this.value+"%";localStorage.kbitsTineVolume=state.tineVolume};$("#song-volume").oninput=function(){state.songVolume=this.value/100;$("#song-volume-value").value=this.value+"%";localStorage.kbitsSongVolume=state.songVolume};$("#preview").onchange=function(){state.preview=+this.value;localStorage.kbitsPreview=state.preview};["#label-number","#label-note","#label-key"].forEach(function(id){$(id).onchange=updateLabels});labelsReady=true;updateLabels();$("#tine-zoom").onchange=function(){zoom=+this.value;document.documentElement.style.setProperty("--tine-zoom",zoom);localStorage.kbitsTineZoom=zoom}}
    function setupTineSwipe(){var control=$("#tine-swipe");state.tineSwipe=localStorage.getItem("kbitsTineSwipe")===null?true:localStorage.kbitsTineSwipe==="1";control.checked=state.tineSwipe;control.onchange=function(){state.tineSwipe=control.checked;localStorage.kbitsTineSwipe=state.tineSwipe?"1":"0";if(!state.tineSwipe)options.endPointer()}}
    function setupMuteUnmapped(){var control=$("#mute-unmapped");state.muteUnmapped=localStorage.kbitsMuteUnmapped==="1";control.checked=state.muteUnmapped;control.onchange=function(){state.muteUnmapped=control.checked;localStorage.kbitsMuteUnmapped=state.muteUnmapped?"1":"0"}}
    function updateTineStickers(){var control=$("#tine-stickers"),enabled=control&&control.checked;document.body.classList.toggle("show-tine-stickers",!!enabled);document.querySelectorAll(".tine").forEach(function(tine){var lane=+tine.dataset.lane;tine.style.setProperty("--sticker-color",options.getColors()[lane]||"#54e8ff")})}
    function setupTineStickers(){var labels=$(".label-options"),label=document.createElement("label"),control=document.createElement("input");control.id="tine-stickers";control.type="checkbox";control.checked=localStorage.getItem("kbitsTineStickers")===null?true:localStorage.kbitsTineStickers==="1";label.append(control,document.createTextNode(" COLOR STICKERS"));labels.appendChild(label);control.onchange=function(){localStorage.kbitsTineStickers=control.checked?"1":"0";updateTineStickers()};new MutationObserver(updateTineStickers).observe(document.body,{attributes:true,attributeFilter:["data-theme"]});new MutationObserver(updateTineStickers).observe(tines,{childList:true});updateTineStickers()}
    function setupFallingStyle(){setupTineStickers();var control=$("#falling-style"),allowed=["block","note","number"];state.fallingStyle=localStorage.kbitsFallingStyle||"block";if(allowed.indexOf(state.fallingStyle)<0)state.fallingStyle="block";control.value=state.fallingStyle;control.onchange=function(){state.fallingStyle=control.value;options.invalidateSprites();localStorage.kbitsFallingStyle=state.fallingStyle}}
    function setupPlayView(){var control=$("#play-view"),styleLabel=$("#falling-style-label");options.setupStaffInteraction();state.viewMode=localStorage.kbitsPlayView==="staff"?"staff":"blocks";function apply(){control.value=state.viewMode;styleLabel.hidden=state.viewMode==="staff";document.body.classList.toggle("staff-view",state.viewMode==="staff");localStorage.kbitsPlayView=state.viewMode}control.onchange=function(){state.viewMode=this.value==="staff"?"staff":"blocks";apply()};apply()}
    return{setup:settings,updateLabels:updateLabels,setupSwipe:setupTineSwipe,setupMuteUnmapped:setupMuteUnmapped,setupFallingStyle:setupFallingStyle,setupPlayView:setupPlayView};
  }
  return{create:create};
}));
