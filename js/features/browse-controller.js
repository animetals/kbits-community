/**
 * Kbits - Browse Controller
 *
 * Owns catalog filtering, rows, navigation, and playlist ordering.
 * Environment: Browser with injected catalog and application callbacks.
 * Invariant: Browse reads metadata only; persistence and playback stay injected.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsBrowseController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses injected document, catalog access, persistence and navigation callbacks. Owns catalog filtering and ordering DOM; repository operations remain asynchronous. Bind setup once and use live getters so refreshed metadata is visible.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var document = options.document, libraryCore = options.core;
    function $(selector) { return document.querySelector(selector); }
    function positionControl(input,onMove){var control=document.createElement("span"),up=document.createElement("button"),down=document.createElement("button");control.className="playlist-position-control";up.type=down.type="button";up.className=down.className="playlist-position-arrow";up.textContent="▲";down.textContent="▼";up.title="Move earlier";down.title="Move later";up.setAttribute("aria-label","Move earlier");down.setAttribute("aria-label","Move later");function move(direction){onMove(direction)}up.onclick=function(){move(-1)};down.onclick=function(){move(1)};input.onkeydown=function(event){if(event.key==="ArrowUp"||event.key==="ArrowDown"){event.preventDefault();move(event.key==="ArrowUp"?-1:1)}};control.append(input,up,down);return control}
    function populateBrowseCategories(){var select=$("#browse-category"),current=select.value,categories=libraryCore.browseCategories(options.getSongs());select.innerHTML='<option value="">ALL CATEGORIES</option>';categories.forEach(function(category){var option=document.createElement("option");option.value=category.toLowerCase();option.textContent=category;select.appendChild(option)});select.value=categories.some(function(category){return category.toLowerCase()===current})?current:""}
    function setBrowsePlaylistPosition(songId,value){var playlist=options.getPlaylists().find(function(item){return String(item.id)===String($("#browse-playlist").value)});if(!playlist)return Promise.resolve();var order=libraryCore.positionSong(playlist.songIds,songId,value);return options.updatePlaylist(playlist.id,{name:playlist.name,songIds:order}).then(function(updated){playlist.songIds=updated.songIds.map(String);playlist.ordered=true;options.hydratePlaylistOrders();options.renderLibraryRows();renderBrowse()})}
    function browsePlaylistPosition(song,playlist){var cell=document.createElement("td");cell.className="browse-position";if(!playlist){cell.textContent="—";return cell}var input=document.createElement("input"),position=playlist.songIds.indexOf(String(song.id))+1;input.type="number";input.min="1";input.max=String(options.getSongs().length);input.inputMode="numeric";input.value=position||"";input.placeholder="—";input.setAttribute("aria-label","Playlist position for "+song.name);input.onchange=function(){setBrowsePlaylistPosition(song.id,input.value).catch(function(error){options.reportError(error);renderBrowse()})};cell.appendChild(positionControl(input,function(direction){var current=parseInt(input.value,10)||0;if(direction<0){if(current<=1)return;input.value=current-1}else input.value=current?Math.min(current+1,options.getSongs().length):1;input.onchange()}));return cell}
    function renderBrowse(){
      var body=$("#browse-results");if(!body)return;populateBrowseCategories();
      var selection=$("#browse-playlist").value,favoritesMode=selection==="favorites",playlist=options.getPlaylists().find(function(item){return String(item.id)===String(selection)}),visible=0;
      var filters={query:($("#browse-search").value||"").trim().toLowerCase(),category:$("#browse-category").value,difficulty:$("#browse-difficulty").value,layout:$("#browse-layout").value};
      var browseSongs=playlist?libraryCore.orderSongsForPlaylist(options.getSongs(),playlist).filter(function(song){return playlist.songIds.indexOf(String(song.id))>=0}):favoritesMode?options.getSongs().filter(function(song){return song.favorite}):options.getSongs();
      $("#browse-edit-playlist").disabled=!playlist;body.innerHTML="";
      browseSongs.forEach(function(song){
        if(!libraryCore.matchesBrowse(song,filters))return;visible++;
        var row=document.createElement("tr"),actions=document.createElement("td"),play=document.createElement("button"),details=document.createElement("button"),print=document.createElement("button"),favorite=options.favoriteButton(song),positionCell=browsePlaylistPosition(song,playlist);
        play.type=details.type=print.type="button";play.className=details.className=print.className="song-action";
        play.textContent="▶";play.title="Play";play.onclick=function(){closeBrowse();options.loadLibrarySong(song,false)};
        details.textContent="ⓘ";details.title="Song details";details.onclick=function(){options.openDetails(song)};
        favorite.title=song.favorite?"Remove from favorites":"Add to favorites";
        print.textContent="▤";print.title="Print song";print.onclick=function(){options.openPrintOptions(song)};
        actions.className="browse-actions";actions.append(play,details,favorite,print);
        if(!selection){var del=document.createElement("button");del.type="button";del.className="song-action delete";del.textContent="🗑";del.title="Delete from library";del.setAttribute("aria-label","Delete "+song.name+" from library");del.onclick=function(){if(options.confirm('Delete "'+song.name+'" from your library?'))options.removeSong(song.id).then(options.renderLibrary).then(renderBrowse).catch(function(error){options.reportError(error)})};actions.appendChild(del)}
        [song.name,song.artist||"—",song.category||"—",song.difficulty||"—",options.layoutLabel(song.layout),song.tags.join(", ")||"—",positionCell,actions].forEach(function(value,index){var cell=value instanceof options.HTMLElement?value:document.createElement("td");if(!(value instanceof options.HTMLElement))cell.textContent=value;if(index===0)cell.className="browse-song-name";if(index===5)cell.className="browse-tags";row.appendChild(cell)});body.appendChild(row)
      });
      $("#browse-empty").textContent=(playlist||favoritesMode)&&!visible?"NO SONGS IN THIS PLAYLIST":"NO MATCHING MIDI FILES";$("#browse-empty").hidden=visible>0
    }
    function openBrowse(){$("#browse-view").hidden=false;document.body.classList.add("browse-open");options.closeLibrary();renderBrowse();options.renderLibrary().then(renderBrowse)}
    function closeBrowse(){$("#browse-view").hidden=true;document.body.classList.remove("browse-open")}
    function setup(){$("#browse-library").onclick=openBrowse;$("#close-browse").onclick=function(){closeBrowse();options.openLibrary()};$("#browse-upload").onclick=function(){$("#file-input").click()};["#browse-search","#browse-category","#browse-difficulty","#browse-layout","#browse-playlist"].forEach(function(selector){var control=$(selector);control[control.tagName==="INPUT"?"oninput":"onchange"]=renderBrowse});$("#browse-create-playlist").onclick=function(){var name=options.prompt("New playlist name:");if(!name||!name.trim())return;options.createPlaylist(name.trim()).then(function(item){return options.renderLibrary().then(function(){$("#browse-playlist").value=item.id;renderBrowse()})}).catch(function(error){options.reportError(error)})};$("#browse-edit-playlist").onclick=function(){var id=$("#browse-playlist").value;if(id)options.openPlaylistEditor(id)};}

    return { render: renderBrowse, open: openBrowse, close: closeBrowse, setup: setup, setPlaylistPosition: setBrowsePlaylistPosition };
  }
  return { create: create };
}));
