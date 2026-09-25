/**
 * Kbits - Playfield Renderer
 * Owns canvas sizing, falling-note sprites, staff delegation, and progress painting.
 * Invariant: drawing reads the injected playback clock; it never advances playback.
 * Tine geometry is measured once per frame and unmapped notes remain invisible.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.KbitsPlayfieldRenderer=api;
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Retains canvas, shared state and injected clock/view/audio callbacks. renderFrame paints without advancing playback; resize updates backing pixels; invalidateSprites clears the cache. start begins a recurring animation chain: call once, as no disposal API exists. Staff hit coordinates use canvas-local CSS pixels; resetProgress requires a loaded song.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options){
    var document=options.document,canvas=options.canvas,g=canvas.getContext("2d"),state=options.state;
    var midiName=options.midiName,numberName=options.numberName,clock=options.clock,lowerBound=options.lowerBound;
    var fallingSpriteCache={},lastPlayerPaint=0,lastTimeText="";
    function $(selector){return document.querySelector(selector)}
    function fallingSprite(lane){var view=options.getView(),physical=view.physical,colors=view.colors,currentLayout=view.layout;var text=state.fallingStyle==="note"?midiName(physical[lane]):numberName(physical[lane]),size=currentLayout===34&&lane<17?9:12,d=options.getPixelRatio()||1,key=state.fallingStyle+"|"+lane+"|"+text+"|"+colors[lane]+"|"+d;if(fallingSpriteCache[key])return fallingSpriteCache[key];var sprite=document.createElement("canvas"),sg=sprite.getContext("2d");sg.font="900 "+size+"px Arial";var width=Math.ceil(sg.measureText(text).width)+8,height=size+8;sprite.width=Math.ceil(width*d);sprite.height=Math.ceil(height*d);sg.scale(d,d);sg.font="900 "+size+"px Arial";sg.textAlign="center";sg.textBaseline="middle";sg.lineJoin="round";sg.lineWidth=3;sg.strokeStyle="#060712";sg.strokeText(text,width/2,height/2);sg.fillStyle=colors[lane];sg.fillText(text,width/2,height/2);return fallingSpriteCache[key]={canvas:sprite,width:width,height:height}}
    function resize(){var w=canvas.clientWidth,h=canvas.clientHeight,d=options.getPixelRatio()||1,targetWidth=Math.round(w*d),targetHeight=Math.round(h*d);if(canvas.width!==targetWidth||canvas.height!==targetHeight){canvas.width=targetWidth;canvas.height=targetHeight}g.setTransform(d,0,0,d,0,0)}
    function standardTuningShift(){var tuningOffsets=options.getView().tuningOffsets;if(!tuningOffsets.length)return 0;var shift=tuningOffsets[0];return [0,1,-1,2].indexOf(shift)>=0&&tuningOffsets.every(function(value){return value===shift})?shift:null}
    function renderFrame(){var view=options.getView(),physical=view.physical,colors=view.colors,tuningOffsets=view.tuningOffsets,currentLayout=view.layout;var w=canvas.clientWidth,h=canvas.clientHeight,pos=options.position();g.clearRect(0,0,w,h);if(state.viewMode==="staff"&&options.getStaff()){options.getStaff().draw({context:g,width:w,height:h,position:pos,preview:state.preview,song:state.song,physical:physical,tuningOffsets:tuningOffsets,colors:colors,layout:currentLayout,keyShift:standardTuningShift(),theme:document.body.dataset.theme||"snes",lowerBound:lowerBound})}else{g.strokeStyle="rgba(84,232,255,.08)";g.lineWidth=1;var canvasRect=canvas.getBoundingClientRect(),laneGeometry=[];document.querySelectorAll(".tine").forEach(function(t){var r=t.getBoundingClientRect(),x=r.left-canvasRect.left+r.width/2,strike=r.top-canvasRect.top;laneGeometry[+t.dataset.lane]={x:x,strike:strike};g.beginPath();g.moveTo(x,0);g.lineTo(x,strike);g.stroke()});if(state.song){var start=lowerBound(pos),end=lowerBound(pos+state.preview+.1);for(var i=start;i<end;i++){var n=state.song.notes[i],lane=physical.indexOf(n.note);if(lane<0)continue;var geometry=laneGeometry[lane],x=geometry.x,strike=geometry.strike,ratio=Math.max(0,Math.min(1,(n.start-pos)/state.preview)),y=strike*(1-ratio),blockWidth=currentLayout===34&&lane<17?12:28;if(state.fallingStyle==="block"){g.fillStyle=colors[lane];g.shadowColor=g.fillStyle;g.shadowBlur=8;g.fillRect(Math.round(x-blockWidth/2),Math.round(y-5),blockWidth,10);g.shadowBlur=0}else{var sprite=fallingSprite(lane);g.drawImage(sprite.canvas,Math.round(x-sprite.width/2),Math.round(y-sprite.height/2),sprite.width,sprite.height)}}}}if(state.song){var paintNow=options.now();if(paintNow-lastPlayerPaint>=100){var p=Math.min(state.song.duration,pos),timeText=clock(p)+" / "+clock(state.song.duration);$("#progress").value=state.song.duration?p/state.song.duration*1000:0;if(timeText!==lastTimeText){$("#time").textContent=timeText;lastTimeText=timeText}lastPlayerPaint=paintNow}}}
    function setupStaffInteraction(){canvas.addEventListener("pointerdown",function(e){if(state.viewMode!=="staff"||!state.song||!options.getStaff()||!options.getStaff().hitTest)return;var rect=canvas.getBoundingClientRect(),picked=options.getStaff().hitTest(e.clientX-rect.left,e.clientY-rect.top);if(!picked)return;e.preventDefault();options.playNote(picked.event.note,picked.event.velocity||100,0,.8);options.hit(picked.event.note)})}
    function draw(){options.requestAnimationFrame(draw);renderFrame()}
    function invalidateSprites(){fallingSpriteCache={}}
    function resetProgress(){ $("#progress").value=0;lastTimeText="00:00 / "+clock(state.song.duration);$("#time").textContent=lastTimeText; }
    return{start:draw,renderFrame:renderFrame,resize:resize,invalidateSprites:invalidateSprites,resetProgress:resetProgress,setupStaffInteraction:setupStaffInteraction};
  }
  return{create:create};
}));
