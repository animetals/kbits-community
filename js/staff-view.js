/**
 * Kbits - Staff View
 *
 * Draws scrolling notation and supports note-preview hit testing.
 *
 * Environment and dependencies: Browser; accepts canvas, song data, and view configuration.
 * Invariant: Rendering reads playback position without advancing the clock.
 *
 * SPDX-License-Identifier: MIT
 */
(function(global){
  "use strict";

  var naturalIndex={0:0,2:1,4:2,5:3,7:4,9:5,11:6};
  var sharpNames={0:[0,""],1:[0,"♯"],2:[2,""],3:[2,"♯"],4:[4,""],5:[5,""],6:[5,"♯"],7:[7,""],8:[7,"♯"],9:[9,""],10:[9,"♯"],11:[11,""]};
  var flatNames={0:[0,""],1:[2,"♭"],2:[2,""],3:[4,"♭"],4:[4,""],5:[5,""],6:[7,"♭"],7:[7,""],8:[9,"♭"],9:[9,""],10:[11,"♭"],11:[11,""]};
  var keySpellings={
    0:{0:[0,""],2:[2,""],4:[4,""],5:[5,""],7:[7,""],9:[9,""],11:[11,""]},
    2:{2:[2,""],4:[4,""],6:[5,"♯"],7:[7,""],9:[9,""],11:[11,""],1:[0,"♯"]},
    "-1":{11:[11,""],1:[0,"♯"],3:[2,"♯"],4:[4,""],6:[5,"♯"],8:[7,"♯"],10:[9,"♯"]},
    1:{1:[0,"♯"],3:[2,"♯"],5:[4,"♯"],6:[5,"♯"],8:[7,"♯"],10:[9,"♯"],0:[11,"♯"]}
  };
  var keySharps={0:[],2:["F5","C5"],"-1":["F5","C5","G5","D5","A4"],1:["F5","C5","G5","D5","A4","E5","B4"]};
  var signatureSharps={0:[],2:[5,0],"-1":[5,0,7,2,9],1:[5,0,7,2,9,4,11]};
  var themes={
    snes:{line:"rgba(226,238,255,.72)",ink:"#f7f3e8",play:"#ffe66d",shadow:"#070713"},
    real:{line:"rgba(220,225,226,.68)",ink:"#eef0ef",play:"#9ec7d4",shadow:"#141719"},
    grove:{line:"rgba(255,235,194,.68)",ink:"#fff0cc",play:"#d0a45a",shadow:"#28160b"},
    chrono:{line:"rgba(218,255,231,.72)",ink:"#dfffea",play:"#ffd968",shadow:"#071d2b"},
    fantasy:{line:"rgba(224,245,255,.76)",ink:"#f4f7ff",play:"#bff8ff",shadow:"#080b2d"}
  };
  var hitRegions=[],selectedEvent=null,selectedUntil=0;

  function naturalStep(midi){
    var octave=Math.floor(midi/12)-1,pc=((midi%12)+12)%12;
    return octave*7+naturalIndex[pc];
  }

  function spelling(note,lane,offset,keyShift){
    var pc=((note%12)+12)%12,map=keyShift!==null&&keySpellings[keyShift],pair=map&&map[pc];
    if(!pair)pair=offset<0?flatNames[pc]:sharpNames[pc];
    var naturalMidi=note+(pair[1]==="♭"?1:pair[1]==="♯"?-1:0);
    var accidental=pair[1],sharpened=keyShift!==null&&(signatureSharps[keyShift]||[]).indexOf(pair[0])>=0;
    if(sharpened)accidental=pair[1]==="♯"?"":pair[1]||"♮";
    return {step:naturalStep(naturalMidi),accidental:accidental,lane:lane};
  }

  function lineY(center,spacing,step){return center+spacing*2-(step-30)*spacing/2}

  function drawLedger(g,x,y,step,center,spacing,color){
    g.strokeStyle=color;g.lineWidth=1.5;
    if(step<=28){for(var s=28;s>=step;s-=2){g.beginPath();g.moveTo(x-10,lineY(center,spacing,s));g.lineTo(x+10,lineY(center,spacing,s));g.stroke()}}
    if(step>=40){for(var u=40;u<=step;u+=2){g.beginPath();g.moveTo(x-10,lineY(center,spacing,u));g.lineTo(x+10,lineY(center,spacing,u));g.stroke()}}
  }

  function drawClef(g,x,center,spacing,style){
    g.save();g.fillStyle=style.ink;g.shadowColor=style.shadow;g.shadowOffsetX=2;g.shadowOffsetY=2;
    g.font="32px 'Segoe UI Symbol','Noto Music',serif";g.textAlign="left";g.textBaseline="middle";g.fillText("𝄞",x,center+2);g.restore();
  }

  function keySignatureWidth(shift){return (keySharps[shift]||[]).length*8}

  function drawKeySignature(g,x,center,spacing,shift,style){
    var sharps=keySharps[shift]||[];
    g.save();g.fillStyle=style.ink;g.font="bold 16px 'Segoe UI Symbol',serif";g.textAlign="center";g.textBaseline="middle";
    sharps.forEach(function(name,i){var letter=name.charAt(0),octave=+name.slice(1),pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter],step=octave*7+naturalIndex[pc];g.fillText("♯",x+i*8,lineY(center,spacing,step))});g.restore();
  }

  function currentTimeSignature(song,position){
    var signatures=song&&song.timeSignatures||[{seconds:0,numerator:4,denominator:4}],active=signatures[0];
    for(var i=1;i<signatures.length&&signatures[i].seconds<=position;i++)active=signatures[i];
    return active||{numerator:4,denominator:4};
  }

  function drawTimeSignature(g,x,center,spacing,signature,style){
    g.save();g.fillStyle=style.ink;g.font="900 "+Math.max(11,spacing*1.55)+"px Georgia,serif";g.textAlign="center";g.textBaseline="middle";
    g.fillText(String(signature.numerator),x,center-spacing*.85);g.fillText(String(signature.denominator),x,center+spacing*.85);g.restore();
  }

  function drawStaff(g,w,center,spacing,shift,signature,style){
    g.strokeStyle=style.line;g.lineWidth=1.25;
    for(var i=-2;i<=2;i++){g.beginPath();g.moveTo(8,center+i*spacing);g.lineTo(w-8,center+i*spacing);g.stroke()}
    drawClef(g,12,center,spacing,style);drawKeySignature(g,47,center,spacing,shift,style);
    var signatureX=54+keySignatureWidth(shift);drawTimeSignature(g,signatureX,center,spacing,signature,style);
    var playX=signatureX+18;
    g.save();g.strokeStyle=style.play;g.lineWidth=3;g.shadowColor=style.play;g.shadowBlur=6;g.beginPath();g.moveTo(playX,center-spacing*3.2);g.lineTo(playX,center+spacing*3.2);g.stroke();g.restore();
    return playX;
  }

  function drawBarLine(g,x,center,spacing,style){
    g.save();g.strokeStyle=style.line;g.lineWidth=2;g.beginPath();g.moveTo(x,center-spacing*2);g.lineTo(x,center+spacing*2);g.stroke();g.restore();
  }

  function noteValue(event,division){
    var quarters=event.durationTicks&&division?event.durationTicks/division:Math.max(.125,event.duration/.5);
    var values=[
      {quarters:6,kind:"whole",dots:1},{quarters:4,kind:"whole",dots:0},{quarters:3,kind:"half",dots:1},
      {quarters:2,kind:"half",dots:0},{quarters:1.5,kind:"quarter",dots:1},{quarters:1,kind:"quarter",dots:0},
      {quarters:.75,kind:"eighth",dots:1},{quarters:.5,kind:"eighth",dots:0},{quarters:.375,kind:"sixteenth",dots:1},
      {quarters:.25,kind:"sixteenth",dots:0},{quarters:.1875,kind:"thirtysecond",dots:1},{quarters:.125,kind:"thirtysecond",dots:0}
    ],best=values[0],distance=Infinity;
    values.forEach(function(value){var d=Math.abs(Math.log(Math.max(.01,quarters)/value.quarters));if(d<distance){distance=d;best=value}});
    return best;
  }

  function drawFlags(g,stemX,stemEnd,stemUp,count,color){
    g.fillStyle=color;
    for(var i=0;i<count;i++){
      var y=stemEnd+(stemUp?i*5:-i*5);g.beginPath();g.moveTo(stemX,y);
      if(stemUp){g.lineTo(stemX+9,y+5);g.lineTo(stemX+3,y+10)}else{g.lineTo(stemX-9,y-5);g.lineTo(stemX-3,y-10)}
      g.closePath();g.fill();
    }
  }

  function drawNote(g,x,center,spacing,event,lane,offset,keyShift,color,style,division,selected){
    var written=spelling(event.note,lane,offset,keyShift),y=lineY(center,spacing,written.step),stemUp=y>=center,value=noteValue(event,division);
    drawLedger(g,x,y,written.step,center,spacing,style.line);
    var open=value.kind==="whole"||value.kind==="half",whole=value.kind==="whole",radiusX=whole?8:7;
    if(selected){g.save();g.fillStyle=style.play;g.globalAlpha=.28;g.beginPath();g.arc(x,y,14,0,Math.PI*2);g.fill();g.strokeStyle=style.play;g.globalAlpha=1;g.lineWidth=2;g.stroke();g.restore()}
    g.save();g.translate(x,y);g.rotate(-.22);g.fillStyle=color;g.strokeStyle=open?color:style.shadow;g.lineWidth=open?3:2;g.beginPath();g.ellipse(0,0,radiusX,5,0,0,Math.PI*2);if(!open)g.fill();g.stroke();g.restore();
    if(!whole){var stemX=x+(stemUp?6:-6),stemEnd=y+(stemUp?-22:22);g.strokeStyle=color;g.lineWidth=2.5;g.beginPath();g.moveTo(stemX,y);g.lineTo(stemX,stemEnd);g.stroke();var flags=value.kind==="eighth"?1:value.kind==="sixteenth"?2:value.kind==="thirtysecond"?3:0;if(flags)drawFlags(g,stemX,stemEnd,stemUp,flags,color)}
    if(value.dots){g.fillStyle=color;g.beginPath();g.arc(x+11,y,2.2,0,Math.PI*2);g.fill()}
    if(written.accidental){g.save();g.fillStyle=style.ink;g.font="bold 14px 'Segoe UI Symbol',serif";g.textAlign="center";g.textBaseline="middle";g.fillText(written.accidental,x-12,y);g.restore()}
  }

  /**
   * @param {Object} config Canvas context, CSS-pixel width/height, theme, layout,
   *   parsed song, song-second position/preview, physical MIDI pitches, semitone
   *   tuningOffsets/keyShift, colors and a song-second lowerBound callback.
   * @returns {void} Paints notation and replaces hit regions for the current frame.
   *   Does not advance playback or mutate the song; selection state is retained.
   */
  function draw(config){
    var g=config.context,w=config.width,h=config.height,style=themes[config.theme]||themes.snes;
    hitRegions=[];
    var dual=config.layout===34,spacing=Math.max(7,Math.min(10,h/(dual?34:22)));
    var centers=dual?[Math.max(52,h*.18),Math.max(138,h*.43)]:[Math.max(62,Math.min(h*.28,150))],signature=currentTimeSignature(config.song,config.position);
    var rows=dual?[{from:17,to:34,center:centers[0]},{from:0,to:17,center:centers[1]}]:[{from:0,to:config.physical.length,center:centers[0]}];
    rows.forEach(function(row){row.playX=drawStaff(g,w,row.center,spacing,config.keyShift,signature,style)});
    if(!config.song)return;
    (config.song.barTimes||[]).forEach(function(barTime){if(barTime<config.position||barTime>config.position+config.preview||barTime===0)return;var ratio=(barTime-config.position)/config.preview;rows.forEach(function(row){drawBarLine(g,row.playX+ratio*Math.max(20,w-row.playX-20)-24,row.center,spacing,style)})});
    var start=config.lowerBound(config.position),end=config.lowerBound(config.position+config.preview+.1);
    for(var i=start;i<end;i++){
      var event=config.song.notes[i],lane=config.physical.indexOf(event.note);if(lane<0)continue;
      var row=dual?(lane>=17?rows[0]:rows[1]):rows[0],ratio=Math.max(0,Math.min(1,(event.start-config.position)/config.preview));
      var x=row.playX+ratio*Math.max(20,w-row.playX-20);
      var written=spelling(event.note,lane,config.tuningOffsets[lane]||0,config.keyShift),y=lineY(row.center,spacing,written.step);
      hitRegions.push({x:x,y:y,event:event,lane:lane});
      drawNote(g,x,row.center,spacing,event,lane,config.tuningOffsets[lane]||0,config.keyShift,config.colors[lane],style,config.song.division,event===selectedEvent&&performance.now()<selectedUntil);
    }
  }

  /**
   * @param {number} x Canvas-local CSS pixels.
   * @param {number} y Canvas-local CSS pixels.
   * @returns {?Object} Nearest current hit region {x,y,event,lane}, or null.
   *   A hit updates visual selection for 450 ms but does not play or seek.
   */
  function hitTest(x,y){
    var best=null,bestDistance=Infinity;
    hitRegions.forEach(function(region){var dx=x-region.x,dy=y-region.y,distance=dx*dx+dy*dy;if(Math.abs(dx)<=22&&Math.abs(dy)<=18&&distance<bestDistance){best=region;bestDistance=distance}});
    if(best){selectedEvent=best.event;selectedUntil=performance.now()+450}
    return best;
  }

  global.KbitsStaff={draw:draw,hitTest:hitTest};
}(window));
