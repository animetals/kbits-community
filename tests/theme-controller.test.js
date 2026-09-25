/**
 * Kbits - theme-controller.test
 *
 * Checks theme controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test=require("node:test"),assert=require("node:assert/strict"),themes=require("../js/features/theme-controller.js");

test("normalizes unsupported or missing theme choices",function(){
  assert.equal(themes.normalizeTheme("grove"),"grove");
  assert.equal(themes.normalizeTheme("unknown"),"snes");
  assert.equal(themes.normalizeTheme(),"snes");
});

test("returns independent palettes covering every tine",function(){
  var first=themes.colorsFor("snes",34),second=themes.colorsFor("snes",34);
  assert.equal(first.length,34);
  assert.equal(first[0],"#ff595e");
  assert.match(first[33],/^hsl\(/);
  first[0]="changed";
  assert.equal(second[0],"#ff595e");
  assert.equal(themes.colorsFor("real",8).length,8);
});

test("applies, persists, and selects themes through injected adapters",function(){
  var storage={kbitsTheme:"invalid"},applied=[],buttons=["snes","grove"].map(function(name){return{dataset:{themeChoice:name},classList:{toggle:function(className,active){this.active=active}},onclick:null}}),documentRef={body:{dataset:{}},querySelectorAll:function(){return buttons}};
  var controller=themes.create({document:documentRef,storage:storage,getTineCount:function(){return 21},onApply:function(colors,theme){applied.push({colors:colors,theme:theme})}});
  controller.setup();
  assert.equal(documentRef.body.dataset.theme,"snes");
  assert.equal(storage.kbitsTheme,"snes");
  assert.equal(buttons[0].classList.active,true);
  buttons[1].onclick();
  assert.equal(controller.getTheme(),"grove");
  assert.equal(documentRef.body.dataset.theme,"grove");
  assert.equal(applied.at(-1).colors.length,21);
});
