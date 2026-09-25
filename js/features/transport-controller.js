/**
 * Kbits - Transport Controller
 * Owns transport buttons, speed menu, practice-loop controls, and keyboard bindings.
 * Invariant: all playback actions delegate to the existing player clock/controller.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.KbitsTransportController=api;
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Retains shared state and injected player/document/clock formatter. setup binds buttons and keyboard once; resetLoop clears markers; updateLoopControls paints current state. Marker positions are song seconds and speed is a multiplier; actions delegate audio lifecycle to the player.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options){
    var state=options.state,player=options.player,clock=options.clock;
    function $(selector){return options.document.querySelector(selector)}
    function updateLoopControls(){var toggle=$("#loop-toggle"),start=$("#loop-start"),end=$("#loop-end"),shell=$("#progress-shell"),ready=player.loopReady(),duration=state.song&&state.song.duration||0,startPercent=duration&&state.loopStart!==null?state.loopStart/duration*100:0,endPercent=duration&&state.loopEnd!==null?state.loopEnd/duration*100:0;toggle.disabled=!ready;toggle.classList.toggle("loop-active",state.loopEnabled&&ready);toggle.setAttribute("aria-pressed",String(state.loopEnabled&&ready));toggle.title=ready?(state.loopEnabled?"Disable loop":"Enable loop")+" · "+clock(state.loopStart)+"–"+clock(state.loopEnd):"Set start and end markers first";start.classList.toggle("marker-set",state.loopStart!==null);end.classList.toggle("marker-set",state.loopEnd!==null);start.title=state.loopStart===null?"Set loop start marker":"Loop starts at "+clock(state.loopStart)+" · press to replace";end.title=state.loopEnd===null?"Set loop end marker":"Loop ends at "+clock(state.loopEnd)+" · press to replace";shell.style.setProperty("--loop-start-position",startPercent+"%");shell.style.setProperty("--loop-end-position",endPercent+"%");shell.classList.toggle("has-loop-start",state.loopStart!==null);shell.classList.toggle("has-loop-end",state.loopEnd!==null);shell.classList.toggle("has-loop-range",ready)}
    function resetLoop(){state.loopEnabled=false;state.loopStart=null;state.loopEnd=null;updateLoopControls()}
    function setupLoopControls(){var toggle=$("#loop-toggle"),start=$("#loop-start"),end=$("#loop-end");start.onclick=function(){if(!state.song)return;state.loopStart=Math.min(player.position(),state.song.duration);if(state.loopEnd!==null&&state.loopEnd<=state.loopStart+.05)state.loopEnd=null;state.loopEnabled=false;updateLoopControls()};end.onclick=function(){if(!state.song)return;if(state.loopStart===null)state.loopStart=0;var marker=Math.min(player.position(),state.song.duration);state.loopEnd=marker>state.loopStart+.05?marker:null;state.loopEnabled=false;updateLoopControls()};toggle.onclick=function(){if(!player.loopReady())return;state.loopEnabled=!state.loopEnabled;if(state.loopEnabled&&(player.position()<state.loopStart||player.position()>=state.loopEnd))player.seek(state.loopStart);updateLoopControls()};updateLoopControls()}
    function setup(){
      $("#play").onclick=function(){player.play()};
      $("#stop").onclick=function(){player.stop()};
      $("#rewind").onclick=function(){if(state.song)player.seek(player.position()-5)};
      $("#forward").onclick=function(){if(state.song)player.seek(player.position()+5)};
      $("#progress").oninput=function(){if(state.song)player.seek(state.song.duration*this.value/1000)};
      var speedButton=$("#speed"),speedOptions=$("#speed-options"),speedControl=speedButton.closest(".speed-control");
      function closeSpeedOptions(){speedOptions.hidden=true;speedButton.setAttribute("aria-expanded","false")}
      speedButton.onchange=null;
      speedButton.onclick=function(e){e.stopPropagation();speedOptions.hidden=!speedOptions.hidden;this.setAttribute("aria-expanded",String(!speedOptions.hidden))};
      speedOptions.querySelectorAll("[data-speed]").forEach(function(option){
        option.onclick=function(e){e.stopPropagation();player.setSpeed(+option.dataset.speed);speedButton.textContent="×"+state.speed;speedButton.setAttribute("aria-label","Playback speed ×"+state.speed);closeSpeedOptions()};
      });
      options.host.addEventListener("pointerdown",function(e){if(!speedControl.contains(e.target))closeSpeedOptions()});
      options.host.addEventListener("keydown",function(e){
        if(e.target.matches("input,select,textarea"))return;
        if(e.code==="Space"){e.preventDefault();player.play()}
      });
      options.host.addEventListener("keydown",function(e){
        if(e.target.matches("input,select,textarea")||!state.song)return;
        if(e.code==="ArrowLeft"){e.preventDefault();player.seek(player.position()-5)}
        else if(e.code==="ArrowRight"){e.preventDefault();player.seek(player.position()+5)}
      });
    }
    return{setup:setup,setupLoops:setupLoopControls,resetLoop:resetLoop};
  }
  return{create:create};
}));
