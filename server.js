/**
 * Kbits - Community Server
 *
 * Serves application assets and routes local MIDI and playlist requests.
 *
 * Environment and dependencies: Node.js; HTTP/filesystem APIs, library store, PORT, and MIDI_DIR.
 * Invariant: Persistent library data remains separate from static assets.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const http=require("http"),fs=require("fs"),fsp=fs.promises,path=require("path");
const serverLibraryStore=require("./js/platform/server-library-store.js");
const ROOT=__dirname,MIDI_DIR=process.env.MIDI_DIR||path.join(__dirname,"midi"),PORT=Number(process.env.PORT||5248),MAX=50*1024*1024;
const libraryStore=serverLibraryStore.create({directory:MIDI_DIR});
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".mid":"audio/midi",".midi":"audio/midi",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon"};
function json(res,status,value){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(value))}
async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>MAX)throw Error("File is too large");chunks.push(chunk)}return Buffer.concat(chunks)}
async function midiApi(req,res,url){
  const requested=url.searchParams.get("name");
  if(req.method==="GET"&&!requested)return json(res,200,await libraryStore.listSongs());
  if(req.method==="GET")return fs.createReadStream(libraryStore.songPath(requested)).on("error",()=>json(res,404,{error:"MIDI not found"})).pipe(res.writeHead(200,{"Content-Type":"audio/midi","Cache-Control":"no-store"}));
  if(req.method==="POST"){let payload={};try{payload=JSON.parse(url.searchParams.get("meta")||"{}")}catch(error){}return json(res,201,await libraryStore.createSong(requested,await body(req),payload))}
  if(req.method==="PUT")return json(res,200,await libraryStore.updateSong(requested,JSON.parse((await body(req)).toString("utf8"))));
  if(req.method==="DELETE"){await libraryStore.deleteSong(requested);res.writeHead(204);return res.end()}
  json(res,405,{error:"Method not allowed"});
}
async function playlistApi(req,res,url){
  const id=url.searchParams.get("id");
  if(req.method==="GET")return json(res,200,await libraryStore.listPlaylists());
  if(req.method==="POST")return json(res,201,await libraryStore.createPlaylist(JSON.parse((await body(req)).toString("utf8"))));
  if(req.method==="PUT")return json(res,200,await libraryStore.updatePlaylist(id,JSON.parse((await body(req)).toString("utf8"))));
  if(req.method==="DELETE"){await libraryStore.deletePlaylist(id);res.writeHead(204);return res.end()}
  json(res,405,{error:"Method not allowed"});
}
async function staticFile(req,res,url){let pathname=decodeURIComponent(url.pathname);if(pathname==="/")pathname="/index.html";const file=path.resolve(ROOT,"."+pathname);if(!file.startsWith(ROOT)||/\/(?:server\.js|Dockerfile|compose\.ya?ml|\.kbits-library\.json)$/i.test(pathname))return json(res,404,{error:"Not found"});const stat=await fsp.stat(file);if(!stat.isFile())throw Error("Not found");res.writeHead(200,{"Content-Type":types[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":/\.(?:html|js|css)$/i.test(file)?"no-cache":"public, max-age=86400"});fs.createReadStream(file).pipe(res)}
libraryStore.ensure().then(()=>http.createServer((req,res)=>{const url=new URL(req.url,"http://localhost");Promise.resolve(url.pathname==="/api/midi"?midiApi(req,res,url):url.pathname==="/api/playlists"?playlistApi(req,res,url):staticFile(req,res,url)).catch(error=>json(res,error.code==="ENOENT"?404:400,{error:error.message}))}).listen(PORT,"0.0.0.0",()=>console.log("Kbits listening on "+PORT+"; MIDI folder: "+MIDI_DIR)));
