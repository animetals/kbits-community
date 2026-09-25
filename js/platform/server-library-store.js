/**
 * Kbits - Server Library Store
 *
 * Persists MIDI files, song metadata, and ordered playlists on disk.
 *
 * Environment and dependencies: Node.js; filesystem, library directory, clock, and ID generator.
 * Invariant: Metadata edits preserve MIDI filenames.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");

/**
 * @param {Object} options Required directory plus optional fs, now (epoch ms),
 *   and randomId functions. Construction resolves paths but performs no I/O.
 * @returns {Object} Filesystem store. Call ensure before listing a new directory.
 *   CRUD methods return promises and propagate filesystem/validation errors;
 *   createSong takes filename, Buffer and metadata. songPath is synchronous.
 *   Catalog rename is atomic per write, not a transaction across MIDI/catalog
 *   files or concurrent requests. Malformed catalog JSON reads as an empty catalog.
 */
function create(options){
  const fsp=(options.fs||fs).promises,directory=path.resolve(options.directory),catalogFile=path.join(directory,".kbits-library.json"),now=options.now||Date.now,randomId=options.randomId||crypto.randomUUID;
  function validName(value){const name=path.basename(String(value||"")).replace(/[\x00-\x1f<>:"/\\|?*]/g,"_");if(!/\.midi?$/i.test(name))throw Error("A .mid or .midi filename is required");return name}
  function text(value,max=160){return String(value||"").trim().slice(0,max)}
  function metadata(value,fallbackName){const difficulty=["easy","medium","hard","impossible"].includes(String(value.difficulty||"").toLowerCase())?String(value.difficulty).toLowerCase():"",layout=["8","17","21","34"].includes(String(value.layout||""))?String(value.layout):"",seen=new Set(),tags=(Array.isArray(value.tags)?value.tags:String(value.tags||"").split(",")).map(tag=>text(tag,40).trim()).filter(tag=>{const key=tag.toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true}).slice(0,30);return{name:text(value.name||fallbackName),artist:text(value.artist,120),category:text(value.category,80),difficulty,layout,tags,favorite:value.favorite===undefined?true:!!value.favorite,playlistIds:Array.isArray(value.playlistIds)?value.playlistIds.map(String).slice(0,20):[],added:Number(value.added)||now()}}
  async function ensure(){await fsp.mkdir(directory,{recursive:true})}
  async function readCatalog(){try{const value=JSON.parse(await fsp.readFile(catalogFile,"utf8"));return{version:1,songs:value.songs&&typeof value.songs==="object"?value.songs:{},playlists:Array.isArray(value.playlists)?value.playlists:[]}}catch(error){if(error.code!=="ENOENT"&&error.name!=="SyntaxError")throw error;return{version:1,songs:{},playlists:[]}}}
  async function writeCatalog(catalog){const temporary=catalogFile+".tmp";await fsp.writeFile(temporary,JSON.stringify(catalog,null,2));await fsp.rename(temporary,catalogFile)}
  async function uniqueName(name,ignore){const parsed=path.parse(name);let candidate=name,number=2;while(candidate!==ignore&&await fsp.access(path.join(directory,candidate)).then(()=>true,()=>false))candidate=parsed.name+" ("+number+++ ")"+parsed.ext;return candidate}
  function songPath(name){return path.join(directory,validName(name))}
  async function listSongs(){const files=await fsp.readdir(directory,{withFileTypes:true}),catalog=await readCatalog(),songs=[];for(const entry of files){if(!entry.isFile()||!/\.midi?$/i.test(entry.name))continue;const stat=await fsp.stat(path.join(directory,entry.name)),saved=catalog.songs[entry.name],meta=metadata({...saved,added:saved&&saved.added||stat.mtimeMs},entry.name);songs.push({id:entry.name,fileName:entry.name,...meta,size:stat.size})}return songs}
  async function createSong(requestedName,data,meta){const name=await uniqueName(validName(requestedName)),catalog=await readCatalog(),newMeta={favorite:false,...meta};await fsp.writeFile(path.join(directory,name),data);catalog.songs[name]=metadata(newMeta,name);await writeCatalog(catalog);return{id:name,fileName:name,...catalog.songs[name],size:data.length}}
  async function updateSong(requestedName,changes){const name=validName(requestedName),catalog=await readCatalog(),current=metadata(catalog.songs[name]||{},name);catalog.songs[name]=metadata({...current,...changes},name);await writeCatalog(catalog);return{id:name,fileName:name,...catalog.songs[name]}}
  async function deleteSong(requestedName){const name=validName(requestedName),catalog=await readCatalog();await fsp.unlink(path.join(directory,name));delete catalog.songs[name];catalog.playlists.forEach(item=>{item.songIds=(item.songIds||[]).filter(id=>id!==name)});await writeCatalog(catalog)}
  async function listPlaylists(){return(await readCatalog()).playlists}
  async function createPlaylist(value){const catalog=await readCatalog(),name=text(value&&value.name,80);if(!name)throw Error("Playlist name is required");if(catalog.playlists.some(item=>item.name.toLowerCase()===name.toLowerCase()))throw Error("A playlist with this name already exists");const playlist={id:randomId(),name,created:now(),songIds:[]};catalog.playlists.push(playlist);await writeCatalog(catalog);return playlist}
  async function updatePlaylist(id,value){if(!id)throw Error("Playlist id is required");const catalog=await readCatalog(),name=text(value&&value.name,80),playlist=catalog.playlists.find(item=>item.id===id);if(!playlist)throw Error("Playlist not found");if(!name)throw Error("Playlist name is required");if(catalog.playlists.some(item=>item.id!==id&&item.name.toLowerCase()===name.toLowerCase()))throw Error("A playlist with this name already exists");playlist.name=name;if(Array.isArray(value.songIds))playlist.songIds=Array.from(new Set(value.songIds.map(String))).slice(0,5000);await writeCatalog(catalog);return playlist}
  async function deletePlaylist(id){if(!id)throw Error("Playlist id is required");const catalog=await readCatalog();catalog.playlists=catalog.playlists.filter(item=>item.id!==id);Object.keys(catalog.songs).forEach(name=>{catalog.songs[name].playlistIds=(catalog.songs[name].playlistIds||[]).filter(value=>value!==id)});await writeCatalog(catalog)}
  return{ensure,songPath,listSongs,createSong,updateSong,deleteSong,listPlaylists,createPlaylist,updatePlaylist,deletePlaylist};
}
module.exports={create};
