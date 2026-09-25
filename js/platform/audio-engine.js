/**
 * Kbits - Audio Engine
 *
 * Manages Web Audio voices, sample decoding, sound banks, and synthesis fallback.
 *
 * Environment and dependencies: Browser; injected host, note conversion, and bundled soundfont data.
 * Invariant: Scheduled song voices use the audio context clock.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsAudioEngine = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var banks = { keylimba: "kalimba", freepats: "kalimba_freepats", moozica: "kalimba_moozica", vini: "kalimba_vini" };

  /** @returns {string} Embedded bank identifier; unknown choices fall back to Keylimba. */
  function bankName(sound) { return banks[sound] || banks.keylimba; }

  /** @returns {number|undefined} Sample MIDI key: inclusive range first, otherwise nearest pitch; undefined for an empty map. */
  function nearestSample(sampleMap, note) {
    var available = Object.keys(sampleMap).map(Number);
    if (!available.length) return undefined;
    var ranged = available.find(function (candidate) {
      var sample = sampleMap[candidate];
      return sample.lo !== undefined && note >= sample.lo && note <= sample.hi;
    });
    var best = available[0];
    if (ranged !== undefined) return ranged;
    available.forEach(function (candidate) {
      if (Math.abs(candidate - note) < Math.abs(best - note)) best = candidate;
    });
    return best;
  }

  /** @returns {number} Rate multiplier using MIDI pitches, optional root pitch and sample.tune in cents. */
  function playbackRate(note, sampleNote, sample) {
    var root = sample.root === undefined ? sampleNote : sample.root;
    return Math.pow(2, (note - root + (sample.tune || 0) / 100) / 12);
  }

  /**
   * @param {Object} options Host browser APIs/soundfonts, nameToMidi and initial sound.
   * @returns {Object} Stateful audio adapter. context/currentTime lazily create the
   *   audio graph; currentTime is seconds. prepare returns a decoding promise.
   *   play(note,velocity,when,duration,sound,level) returns no completion promise:
   *   when is absolute audio seconds (zero means now), duration is seconds,
   *   velocity uses MIDI units and level is a gain multiplier. stopAll cancels
   *   voices and invalidates pending starts; setSound also resets sample caches.
   */
  function create(options) {
    options = options || {};
    var host = options.host || root;
    var nameToMidi = options.nameToMidi;
    var context, master, limiter, sound = "", sampleCache = {}, sampleMap = {}, ready = false, preparation = null, voices = [], generation = 0;

    function refresh(nextSound) {
      sound = banks[nextSound] ? nextSound : "keylimba";
      var soundfont = host.MIDI && host.MIDI.Soundfont && host.MIDI.Soundfont[bankName(sound)];
      sampleMap = {};
      sampleCache = {};
      ready = false;
      preparation = null;
      generation++;
      if (soundfont) Object.keys(soundfont).forEach(function (name) {
        var sample = soundfont[name];
        sampleMap[nameToMidi(name)] = typeof sample === "string" ? { data: sample, tune: 0 } : sample;
      });
    }

    function ensureContext() {
      if (!context) {
        var AudioContext = host.AudioContext || host.webkitAudioContext;
        if (!AudioContext) throw new Error("Web Audio is not supported by this browser");
        context = new AudioContext();
        master = context.createGain();
        limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 8;
        limiter.ratio.value = 12;
        limiter.attack.value = .003;
        limiter.release.value = .2;
        master.gain.value = 2.5;
        master.connect(limiter);
        limiter.connect(context.destination);
      }
      if (context.state === "suspended") context.resume();
      return context;
    }

    function useSound(nextSound) {
      var normalized = banks[nextSound] ? nextSound : "keylimba";
      if (normalized !== sound) refresh(normalized);
    }

    function decodeSample(note) {
      if (sampleCache[note]) return sampleCache[note];
      var sample = sampleMap[note];
      if (!sample) return Promise.resolve(null);
      var raw = host.atob(sample.data.split(",")[1]);
      var bytes = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return sampleCache[note] = ensureContext().decodeAudioData(bytes.buffer);
    }

    function prepare(nextSound) {
      useSound(nextSound);
      ensureContext();
      if (ready) return Promise.resolve();
      if (preparation) return preparation;
      preparation = Promise.all(Object.keys(sampleMap).map(function (note) { return decodeSample(note); })).then(function () { ready = true; });
      return preparation;
    }

    function synth(note, velocity, when, duration, preset) {
      var ctx = ensureContext(), start = Math.max(ctx.currentTime, when), freq = 440 * Math.pow(2, (note - 69) / 12), gain = ctx.createGain(), filter = ctx.createBiquadFilter(), oscillators = [];
      filter.type = "bandpass";
      filter.frequency.value = freq * (preset === "wood" ? 2.5 : 4);
      filter.Q.value = preset === "wood" ? 1.2 : .7;
      filter.connect(gain);
      gain.connect(master);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.04, velocity / 127), start + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, start + Math.min(3, Math.max(.25, duration + 1.2)));
      [1, preset === "chip" ? 2 : 2.01, preset === "wood" ? 3 : 3.96].forEach(function (ratio, index) {
        var oscillator = ctx.createOscillator(), partial = ctx.createGain();
        oscillator.type = preset === "chip" ? (index ? "square" : "triangle") : (index ? "sine" : "triangle");
        oscillator.frequency.value = freq * ratio;
        partial.gain.value = [.8, .18, .05][index];
        oscillator.connect(partial);
        partial.connect(filter);
        oscillator.start(start);
        oscillator.stop(start + 3);
        oscillators.push(oscillator);
      });
      return { stop: function () { oscillators.forEach(function (oscillator) { try { oscillator.stop(); } catch (error) {} }); } };
    }

    function sampled(buffer, velocity, when, preset, rate) {
      var ctx = ensureContext(), source = ctx.createBufferSource(), gain = ctx.createGain(), tail = gain;
      source.buffer = buffer;
      source.playbackRate.value = rate || 1;
      gain.gain.value = velocity / 127;
      if (preset === "freepats") {
        var soft = ctx.createBiquadFilter();
        soft.type = "lowpass";
        soft.frequency.value = 3200;
        soft.Q.value = .55;
        gain.gain.value *= .72;
        source.connect(soft);
        soft.connect(gain);
      } else if (preset === "moozica") {
        gain.gain.value *= .8;
        source.connect(gain);
      } else if (preset === "vini") {
        gain.gain.value *= .86;
        source.connect(gain);
      } else if (preset === "keylimba") {
        gain.gain.value *= .55;
        source.connect(gain);
      } else source.connect(gain);
      tail.connect(master);
      source.start(Math.max(ctx.currentTime, when));
      return { stop: function () { try { source.stop(); } catch (error) {} } };
    }

    function play(note, velocity, when, duration, nextSound, level) {
      useSound(nextSound);
      if (level <= 0) return;
      var ctx = ensureContext(), start = when || ctx.currentTime, sampleNote = sampleMap[note] ? note : nearestSample(sampleMap, note), sample = sampleMap[sampleNote], requestGeneration = generation;
      if (!sample) {
        voices.push(synth(note, velocity * level, start, duration, "crystal"));
        return;
      }
      decodeSample(sampleNote).then(function (buffer) {
        if (requestGeneration !== generation) return;
        var voice = buffer ? sampled(buffer, velocity * level, start, sound, playbackRate(note, sampleNote, sample)) : synth(note, velocity * level, start, duration, "crystal");
        voices.push(voice);
      });
    }

    function stopAll() {
      generation++;
      voices.splice(0).forEach(function (voice) { try { voice.stop(); } catch (error) {} });
    }

    refresh(options.sound || "keylimba");
    return {
      context: ensureContext,
      currentTime: function () { return ensureContext().currentTime; },
      isReady: function (nextSound) { useSound(nextSound); return ready; },
      prepare: prepare,
      setSound: function (nextSound) { stopAll(); refresh(nextSound); },
      play: play,
      stopAll: stopAll
    };
  }

  return { bankName: bankName, nearestSample: nearestSample, playbackRate: playbackRate, create: create };
}));
