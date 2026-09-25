/**
 * Kbits - Song Editor Controller
 * Owns validated uploads, Song Details fields, playlist drafts, and Save/Cancel.
 * Persistence and player/print updates are injected application callbacks.
 * Invariant: draft changes are persisted only on Save; dismissal discards them.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.KbitsSongEditorController=api;
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document, FileReader, validation, repository and refresh callbacks. open(song) discards pending uploads and opens an existing record; loadFile validates a File asynchronously and reports read errors. close discards drafts. printDraft returns current name/artist/difficulty without saving. Save writes metadata then memberships; failure does not roll back prior writes.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options){
    var document=options.document,libraryCore=options.core,normalizeTags=libraryCore.normalizeTags,normalizeSong=libraryCore.normalizeSong;
    var pendingUpload=null,pendingSongPlaylistIds=[];
    function $(selector){return document.querySelector(selector)}
    function readMidiFile(file){return new Promise(function(resolve,reject){var reader=new options.FileReader();reader.onload=function(){try{options.validate(reader.result,options.parse);resolve(reader.result)}catch(error){reject(error)}};reader.onerror=function(){reject(reader.error)};reader.readAsArrayBuffer(file)})}
    function loadFile(file){return readMidiFile(file).then(function(buffer){pendingUpload={file:file,data:buffer};openSongEditor(null)}).catch(function(error){options.reportError("Could not read MIDI: "+error.message)})}
    function renderSongPlaylistDraft(){var select=$("#song-playlist-select"),list=$("#song-playlist-memberships");select.innerHTML='<option value="">SELECT PLAYLIST</option>';options.getPlaylists().slice().sort(function(a,b){return a.name.localeCompare(b.name)}).forEach(function(playlist){if(pendingSongPlaylistIds.indexOf(String(playlist.id))<0){var option=document.createElement("option");option.value=playlist.id;option.textContent=playlist.name;select.appendChild(option)}});list.innerHTML="";pendingSongPlaylistIds.forEach(function(id){var playlist=options.getPlaylists().find(function(item){return String(item.id)===String(id)});if(!playlist)return;var row=document.createElement("div"),name=document.createElement("span"),remove=document.createElement("button");name.textContent=playlist.name;remove.type="button";remove.className="song-action song-playlist-remove";remove.textContent="×";remove.title="Remove from playlist";remove.setAttribute("aria-label","Remove from "+playlist.name);remove.onclick=function(){pendingSongPlaylistIds=pendingSongPlaylistIds.filter(function(value){return value!==String(id)});renderSongPlaylistDraft()};row.append(name,remove);list.appendChild(row)})}
    function applySongPlaylistDraft(songId){var chain=Promise.resolve();options.getPlaylists().forEach(function(playlist){chain=chain.then(function(){var included=pendingSongPlaylistIds.indexOf(String(playlist.id))>=0,current=playlist.songIds.indexOf(String(songId))>=0;if(included===current)return;var position=included?playlist.songIds.length+1:null,order=libraryCore.positionSong(playlist.songIds,songId,position);return options.updatePlaylist(playlist.id,{name:playlist.name,songIds:order})})});return chain}
    function openSongEditor(song){var dialog=$("#song-details"),isUpload=!!pendingUpload&&!song,$id=$("#song-editor-id"),file=isUpload?pendingUpload.file:null;$id.value=song?song.id:"";options.selectPrintSong(song?song.id:null);pendingSongPlaylistIds=song?options.getPlaylists().filter(function(playlist){return playlist.songIds.indexOf(String(song.id))>=0}).map(function(playlist){return String(playlist.id)}):[];renderSongPlaylistDraft();$("#song-editor-heading").textContent=isUpload?"ADD MIDI TO LIBRARY":"SONG DETAILS";$("#save-song-details").textContent=isUpload?"SAVE TO LIBRARY":"SAVE CHANGES";$("#print-song").hidden=isUpload;$("#song-editor-name").value=song?song.name:file.name.replace(/\.midi?$/i,"");$("#song-editor-artist").value=song?song.artist:"";$("#song-editor-category").value=song?song.category:"";$("#song-editor-tags").value=song?song.tags.join(", "):"";$("#song-editor-difficulty").value=song?song.difficulty:"";$("#song-editor-layout").value=song?song.layout:"";$("#song-file-details").innerHTML="<span>FILE: "+escapeHtml(song?song.fileName:file.name)+"</span><span>"+options.formatBytes(song?song.size:file.size)+"</span>"+(song?"<span>ADDED: "+new Date(song.added).toLocaleString()+"</span>":"");if(!dialog.open)dialog.showModal();options.setTimeout(function(){$("#song-editor-name").focus()},0)}
    function escapeHtml(value){var span=document.createElement("span");span.textContent=value||"";return span.innerHTML}
    function closeSongEditor(){pendingUpload=null;pendingSongPlaylistIds=[];$("#file-input").value="";var dialog=$("#song-details");if(dialog.open)dialog.close()}
    function setup(){
      $("#dialog-upload").onclick=function(){$("#file-input").click()};
      $("#file-input").onchange=function(){if(this.files[0])loadFile(this.files[0])};
      options.host.addEventListener("dragover",function(e){e.preventDefault()});
      options.host.addEventListener("drop",function(e){e.preventDefault();if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});

    document.querySelectorAll("[data-song-editor-close]").forEach(function(button){button.onclick=closeSongEditor});
    $("#song-details").addEventListener("cancel",function(){pendingUpload=null;pendingSongPlaylistIds=[];$("#file-input").value=""});
    $("#song-playlist-add").onclick=function(){var id=$("#song-playlist-select").value;if(!id||pendingSongPlaylistIds.indexOf(String(id))>=0)return;pendingSongPlaylistIds.push(String(id));renderSongPlaylistDraft()};
    $("#song-editor").onsubmit=function(e){e.preventDefault();var saveButton=$("#save-song-details"),originalLabel=saveButton.textContent,existing=options.getSongs().find(function(item){return String(item.id)===$("#song-editor-id").value}),meta={name:$("#song-editor-name").value.trim(),artist:$("#song-editor-artist").value.trim(),category:$("#song-editor-category").value.trim(),tags:normalizeTags($("#song-editor-tags").value),difficulty:$("#song-editor-difficulty").value,layout:$("#song-editor-layout").value,favorite:existing?existing.favorite:false,playlistIds:pendingSongPlaylistIds.slice()};function finishSave(){saveButton.disabled=false;saveButton.textContent=originalLabel}if(!meta.name)return;saveButton.disabled=true;saveButton.textContent="SAVING...";if(pendingUpload){var upload=pendingUpload;meta.fileName=upload.file.name;return Promise.resolve().then(function(){return options.saveSong(meta,upload.data)}).then(function(saved){saved=normalizeSong(saved);options.onUploadSaved(saved,upload,meta);return applySongPlaylistDraft(saved.id)}).then(function(){closeSongEditor();return options.renderLibrary().then(options.renderBrowse)}).then(finishSave,function(error){finishSave();options.reportError("Could not save MIDI: "+(error&&error.message||error))})}else{var song=existing;if(!song){finishSave();return}return Promise.resolve().then(function(){return options.updateSong(song.id,meta)}).then(function(){return applySongPlaylistDraft(song.id)}).then(function(){options.onSongUpdated(song,meta);closeSongEditor();return options.renderLibrary()}).then(options.renderBrowse).then(finishSave,function(error){finishSave();options.reportError("Could not save changes: "+(error&&error.message||error))})}};
    }

    function open(song){pendingUpload=null;openSongEditor(song)}
    function printDraft(){return{name:$("#song-editor-name").value,artist:$("#song-editor-artist").value,difficulty:$("#song-editor-difficulty").value}}
    return{open:open,loadFile:loadFile,close:closeSongEditor,setup:setup,printDraft:printDraft};
  }
  return{create:create};
}));
