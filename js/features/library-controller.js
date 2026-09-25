/**
 * Kbits - Library Controller
 * Owns catalog refresh, playlist selection, favorites, and explicit playback queues.
 * Repository, view, dialog, and playback operations remain injected.
 * Invariant: individual song selection never enables automatic queue advancement.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.KbitsLibraryController=api;
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Retains catalog and explicit queue state with injected repository, DOM and view callbacks. Loading returns an async operation and reports failures. Catalog refresh replaces cached records; getters expose live arrays, not defensive copies. Favorites persist before refreshing views; natural completion advances only the explicit queue.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options){
    var document=options.document,libraryCore=options.core,normalizeSong=libraryCore.normalizeSong,MutationObserver=options.MutationObserver;
    var librarySongs=[],libraryPlaylists=[],libraryQueue=[],currentLibrarySongId=null;
    function $(selector){return document.querySelector(selector)}
    function playlistName(id){var found=libraryPlaylists.find(function(item){return String(item.id)===String(id)});return found?found.name:""}
    function populatePlaylistOptions(){var filter=$("#playlist-filter"),browse=$("#browse-playlist"),filterValue=filter.value||"all",browseValue=browse&&browse.value,sorted=libraryPlaylists.sort(function(a,b){return a.name.localeCompare(b.name)});filter.innerHTML='<option value="all">ALL SONGS</option><option value="favorites">FAVORITES</option>';if(browse)browse.innerHTML='<option value="">SELECT PLAYLIST</option><option value="favorites">FAVORITES</option>';sorted.forEach(function(item){var option=document.createElement("option");option.value=item.id;option.textContent=item.name;filter.appendChild(option);if(browse)browse.appendChild(option.cloneNode(true))});filter.value=filterValue==="favorites"||filterValue==="all"||libraryPlaylists.some(function(item){return String(item.id)===filterValue})?filterValue:"all";if(browse)browse.value=browseValue==="favorites"||libraryPlaylists.some(function(item){return String(item.id)===browseValue})?browseValue:"";var custom=filter.value!=="favorites"&&filter.value!=="all";$("#edit-playlist").disabled=!custom;$("#delete-playlist").disabled=!custom;if($("#browse-edit-playlist"))$("#browse-edit-playlist").disabled=!browse||!browse.value||browse.value==="favorites"}
    function hydratePlaylistOrders(){var hydrated=libraryCore.hydratePlaylistOrders(librarySongs,libraryPlaylists);librarySongs=hydrated.songs;libraryPlaylists=hydrated.playlists}
    function queueForCurrentView(){return libraryCore.queueSongIds(librarySongs,libraryPlaylists,$("#playlist-filter").value)}
    function loadLibrarySong(song,autoPlay){if(!autoPlay)libraryQueue=[song.id];currentLibrarySongId=song.id;return options.repository.getSong(song.id).then(function(saved){options.loadBuffer(saved.data,song.name);if(autoPlay)options.play();else options.closeLibrary()}).catch(function(error){options.reportError(error)})}
    function finishSong(){var index=libraryQueue.findIndex(function(id){return String(id)===String(currentLibrarySongId)}),next=index>=0&&libraryQueue[index+1],song=librarySongs.find(function(item){return String(item.id)===String(next)});options.pause(true);if(song)return loadLibrarySong(song,true)}
    function setSongFavorite(song,value){var previous=song.favorite,next=!!value;return options.repository.updateSong(song.id,{favorite:next}).then(function(updated){var saved=normalizeSong(updated),match=librarySongs.find(function(item){return String(item.id)===String(song.id)});song.favorite=saved.favorite;if(match)match.favorite=saved.favorite;return renderLibrary()}).then(options.renderBrowse).catch(function(error){song.favorite=previous;options.renderLibraryRows();options.renderBrowse();throw error})}
    function renderLibrary(){var list=$("#recent-files");if(!list)return Promise.resolve();return Promise.all([options.repository.listSongs(),options.repository.listPlaylists()]).then(function(values){librarySongs=values[0].sort(function(a,b){return b.added-a.added});libraryPlaylists=values[1];hydratePlaylistOrders();populatePlaylistOptions();options.renderLibraryRows()}).catch(function(){list.innerHTML='<div class="library-empty">LOCAL STORAGE IS UNAVAILABLE</div>'})}
    function setup(){
    $("#song-search").oninput=options.filterLibrary;$("#playlist-filter").onchange=options.renderLibraryRows;new MutationObserver(options.filterLibrary).observe($("#recent-files"),{childList:true});
    $("#play-playlist").onclick=function(){var queue=queueForCurrentView(),song=librarySongs.find(function(item){return String(item.id)===String(queue[0])});if(!song)return;libraryQueue=queue;options.closeLibrary();loadLibrarySong(song,true)};
    $("#create-playlist").onclick=function(){var name=options.prompt("New playlist name:");if(!name||!name.trim())return;options.repository.createPlaylist(name.trim()).then(function(item){return renderLibrary().then(function(){$("#playlist-filter").value=item.id;options.filterLibrary()})}).catch(function(error){options.reportError(error)})};
    $("#edit-playlist").onclick=function(){var id=$("#playlist-filter").value;if(id)options.openPlaylistEditor(id)};
    $("#delete-playlist").onclick=function(){var id=$("#playlist-filter").value,name=playlistName(id);if(id!=="favorites"&&id!=="all"&&options.confirm('Delete playlist "'+name+'"? The MIDI files will remain in your library.'))options.repository.deletePlaylist(id).then(function(){$("#playlist-filter").value="all";renderLibrary()}).catch(function(error){options.reportError(error)})};
    }
    function orderedSongs(){var selection=$("#playlist-filter").value,playlist=libraryPlaylists.find(function(item){return String(item.id)===String(selection)});return libraryCore.orderSongsForPlaylist(librarySongs,playlist)}
    function uploadSaved(saved,upload,meta){currentLibrarySongId=saved.id;libraryQueue=[saved.id];options.loadBuffer(upload.data,meta.name)}
    function playlistSaved(id){return renderLibrary().then(function(){$("#playlist-filter").value=id;$("#browse-playlist").value=id;options.renderLibraryRows();options.renderBrowse()})}
    return{getSongs:function(){return librarySongs},getPlaylists:function(){return libraryPlaylists},currentSongId:function(){return currentLibrarySongId},orderedSongs:orderedSongs,playlistName:playlistName,hydrate:hydratePlaylistOrders,queueForView:queueForCurrentView,loadSong:loadLibrarySong,finishSong:finishSong,setFavorite:setSongFavorite,refresh:renderLibrary,setup:setup,uploadSaved:uploadSaved,playlistSaved:playlistSaved};
  }
  return{create:create};
}));
