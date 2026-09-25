/**
 * Kbits - server-library-store.test
 *
 * Checks server library store behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),fsp=fs.promises,os=require("os"),path=require("path");
const serverLibraryStore=require("../js/platform/server-library-store.js");

async function fixture(t){
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),"kbits-store-"));
  t.after(()=>fsp.rm(directory,{recursive:true,force:true}));
  let id=0;
  const store=serverLibraryStore.create({directory,now:()=>123456,randomId:()=>"playlist-"+(++id)});
  await store.ensure();
  return{directory,store};
}

test("persists MIDI data and normalized catalog metadata",async function(t){
  const f=await fixture(t),bytes=Buffer.from([77,84,104,100]);
  const created=await f.store.createSong("theme.mid",bytes,{name:" Theme ",artist:" Composer ",difficulty:"HARD",layout:17,tags:["RPG","rpg"," boss "]});
  assert.deepEqual(created,{id:"theme.mid",fileName:"theme.mid",name:"Theme",artist:"Composer",category:"",difficulty:"hard",layout:"17",tags:["RPG","boss"],favorite:false,playlistIds:[],added:123456,size:4});
  assert.deepEqual(await fsp.readFile(f.store.songPath("theme.mid")),bytes);
  assert.deepEqual(await f.store.listSongs(),[created]);
});

test("creates collision-safe names and confines filenames to the library directory",async function(t){
  const f=await fixture(t);
  await f.store.createSong("song.mid",Buffer.from([1]),{});
  const duplicate=await f.store.createSong("song.mid",Buffer.from([2]),{});
  assert.equal(duplicate.fileName,"song (2).mid");
  assert.equal(f.store.songPath("../outside.mid"),path.join(f.directory,"outside.mid"));
  assert.throws(()=>f.store.songPath("not-midi.txt"),/\.mid or \.midi/);
});

test("preserves ordered unique playlist membership and MIDI files",async function(t){
  const f=await fixture(t);
  await f.store.createSong("one.mid",Buffer.from([1]),{});
  await f.store.createSong("two.mid",Buffer.from([2]),{});
  const playlist=await f.store.createPlaylist({name:"Practice"});
  const updated=await f.store.updatePlaylist(playlist.id,{name:"Practice Set",songIds:["two.mid","one.mid","two.mid"]});
  assert.deepEqual(updated.songIds,["two.mid","one.mid"]);
  await f.store.deletePlaylist(playlist.id);
  assert.deepEqual(await f.store.listPlaylists(),[]);
  assert.equal((await f.store.listSongs()).length,2);
});

test("deleting a song removes it from every playlist",async function(t){
  const f=await fixture(t);
  await f.store.createSong("keep.mid",Buffer.from([1]),{});
  await f.store.createSong("remove.mid",Buffer.from([2]),{});
  const playlist=await f.store.createPlaylist({name:"Queue"});
  await f.store.updatePlaylist(playlist.id,{name:"Queue",songIds:["remove.mid","keep.mid"]});
  await f.store.deleteSong("remove.mid");
  assert.deepEqual((await f.store.listPlaylists())[0].songIds,["keep.mid"]);
  assert.deepEqual((await f.store.listSongs()).map(song=>song.fileName),["keep.mid"]);
  await assert.rejects(fsp.access(path.join(f.directory,"remove.mid")));
});
