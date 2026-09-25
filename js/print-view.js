/**
 * Kbits - Print View
 *
 * Builds printable kalimba tablature and standard-notation preview documents.
 *
 * Environment and dependencies: Browser; accepts parsed songs, print options, and tuned layouts.
 * Invariant: Printing does not alter song data or player tuning.
 *
 * SPDX-License-Identifier: MIT
 */
(function (global) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function midiName(note) {
    var names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    return names[((note % 12) + 12) % 12] + (Math.floor(note / 12) - 1);
  }
  function noteValue(event, division) {
    var quarters = event.durationTicks && division ? event.durationTicks / division : 1,
      values = [
        { quarters: 6, kind: "whole", dots: 1, label: "dotted whole" },
        { quarters: 4, kind: "whole", dots: 0, label: "whole" },
        { quarters: 3, kind: "half", dots: 1, label: "dotted half" },
        { quarters: 2, kind: "half", dots: 0, label: "half" },
        { quarters: 1.5, kind: "quarter", dots: 1, label: "dotted quarter" },
        { quarters: 1, kind: "quarter", dots: 0, label: "quarter" },
        { quarters: 0.75, kind: "eighth", dots: 1, label: "dotted eighth" },
        { quarters: 0.5, kind: "eighth", dots: 0, label: "eighth" },
        { quarters: 0.375, kind: "sixteenth", dots: 1, label: "dotted sixteenth" },
        { quarters: 0.25, kind: "sixteenth", dots: 0, label: "sixteenth" },
        { quarters: 0.1875, kind: "thirtysecond", dots: 1, label: "dotted thirty-second" },
        { quarters: 0.125, kind: "thirtysecond", dots: 0, label: "thirty-second" }
      ],
      best = values[0],
      distance = Infinity;
    values.forEach(function (value) {
      var current = Math.abs(Math.log(Math.max(0.01, quarters) / value.quarters));
      if (current < distance) {
        distance = current;
        best = value;
      }
    });
    return best;
  }
  function mapped(song, config) {
    return song.notes
      .map(function (event) {
        var lane = config.physical.indexOf(event.note);
        return lane < 0
          ? null
          : {
              event: event,
              lane: lane,
              note: midiName(event.note),
              number: config.numbers[lane] || "?",
              value: noteValue(event, song.division)
            };
      })
      .filter(Boolean);
  }
  function measureIndex(song, time) {
    var bars = song.barTimes || [],
      index = 0;
    for (var i = 1; i < bars.length && bars[i] <= time; i++) index = i;
    return index;
  }
  function tabFlags(x, y, count) {
    var paths = "";
    for (var i = 0; i < count; i++) {
      var xx = x + i * 5;
      paths +=
        '<path d="M ' +
        xx +
        " " +
        y +
        " C " +
        (xx + 7) +
        " " +
        (y - 2) +
        ", " +
        (xx + 10) +
        " " +
        (y - 9) +
        ", " +
        (xx + 14) +
        " " +
        (y - 13) +
        '"/>';
    }
    return paths;
  }
  function tabSymbol(item, x, y, rowClass) {
    var value = item.value,
      open = value.kind === "whole" || value.kind === "half",
      whole = value.kind === "whole",
      stemY = y - 3.5,
      stemEnd = x - 25,
      flagCount =
        value.kind === "eighth"
          ? 1
          : value.kind === "sixteenth"
            ? 2
            : value.kind === "thirtysecond"
              ? 3
              : 0,
      stem = whole
        ? ""
        : '<line class="tab-stem" x1="' +
          (x - 5) +
          '" y1="' +
          stemY +
          '" x2="' +
          stemEnd +
          '" y2="' +
          stemY +
          '"/>' +
          tabFlags(stemEnd, stemY, flagCount),
      dots = value.dots ? '<circle class="dot" cx="' + (x + 11) + '" cy="' + y + '" r="2"/>' : "";
    rowClass = rowClass || (item.lane >= 17 ? " upper-row" : " lower-row");
    return (
      '<g class="tab-symbol' +
      rowClass +
      '"><ellipse cx="' +
      x +
      '" cy="' +
      y +
      '" rx="' +
      (whole ? 7 : 6) +
      '" ry="4.5" class="' +
      (open ? "open" : "filled") +
      '"/>' +
      stem +
      dots +
      "</g>"
    );
  }
  function kalimbaChart(measures, row, config, mode, index, autoHeight) {
    var laneCount = row.to - row.from,
      isDual = config.physical.length === 34,
      isEight = laneCount === 8,
      width = Math.max(620, laneCount * 24 + 100),
      minimumHeight = isDual ? 805 : 770,
      height = Math.max(minimumHeight, autoHeight || minimumHeight),
      left = 46,
      right = width - 46,
      top = 42,
      footerSpace = isDual ? 195 : isEight ? 230 : 120,
      bottom = height - footerSpace,
      tineStart = bottom + 8,
      trackWidth = (right - left) / Math.max(1, laneCount),
      dualStep = (right - left) / 17.5,
      start = measures[0].start,
      end = measures[measures.length - 1].end,
      total = Math.max(0.001, end - start),
      tracks = "",
      bars = "",
      symbols = "",
      tines = "",
      labels = "";
    function laneX(lane) {
      if (!isDual) return left + (lane - row.from + 0.5) * trackWidth;
      var rowLane = lane < 17 ? lane : lane - 17;
      return left + (rowLane + (lane < 17 ? 0.5 : 1)) * dualStep;
    }
    for (var lane = row.from; lane < row.to; lane++) {
      var local = lane - row.from,
        x = laneX(lane),
        label = mode === "numbers" ? config.numbers[lane] : midiName(config.physical[lane]),
        center = isDual ? 8 : (laneCount - 1) / 2,
        rowLane = isDual ? (lane < 17 ? lane : lane - 17) : local,
        depth = Math.max(0, center - Math.abs(rowLane - center)),
        isUpper = isDual && lane >= 17,
        lowerLength = 72 + depth * 4.5,
        tineLength = isDual
          ? isUpper
            ? lowerLength - 14
            : lowerLength
          : isEight
            ? 125 + depth * 18
            : 35 + depth * 2.2,
        tineY = tineStart,
        labelY = tineY + 12 + tineLength,
        rowClass = isDual ? (isUpper ? " upper-row" : " lower-row") : "",
        laneWidth = isDual ? dualStep * 0.44 : trackWidth;
      tracks +=
        '<rect class="tine-track track-' +
        (local % 2 ? "dark" : "light") +
        rowClass +
        '" x="' +
        (x - laneWidth / 2) +
        '" y="' +
        top +
        '" width="' +
        laneWidth +
        '" height="' +
        (bottom - top) +
        '"/>';
      tines +=
        '<rect class="printed-tine' +
        rowClass +
        '" x="' +
        (x - Math.min(7, laneWidth * 0.3)) +
        '" y="' +
        tineY +
        '" width="' +
        Math.min(14, laneWidth * 0.6) +
        '" height="' +
        tineLength +
        '"/>';
      labels +=
        '<text class="tine-label-print' +
        rowClass +
        '" x="' +
        x +
        '" y="' +
        labelY +
        '">' +
        esc(label) +
        "</text>";
    }
    measures.forEach(function (measure) {
      var measureBottom = bottom - ((measure.start - start) / total) * (bottom - top),
        measureTop = bottom - ((measure.end - start) / total) * (bottom - top),
        safe = 18,
        usable = Math.max(1, measureBottom - measureTop - safe * 2);
      bars +=
        '<line class="tab-bar" x1="' +
        left +
        '" y1="' +
        measureBottom +
        '" x2="' +
        right +
        '" y2="' +
        measureBottom +
        '"/><text class="tab-measure-number" x="' +
        (right + 8) +
        '" y="' +
        (measureBottom + 4) +
        '">' +
        measure.number +
        "</text>";
      measure.items.forEach(function (item) {
        if (item.lane < row.from || item.lane >= row.to) return;
        var x = laneX(item.lane),
          ratio = Math.max(
            0,
            Math.min(
              1,
              (item.event.start - measure.start) / Math.max(0.001, measure.end - measure.start)
            )
          ),
          noteY = measureBottom - safe - ratio * usable;
        symbols += tabSymbol(item, x, noteY);
      });
    });
    bars +=
      '<line class="tab-bar" x1="' +
      left +
      '" y1="' +
      top +
      '" x2="' +
      right +
      '" y2="' +
      top +
      '"/><line class="tine-start-line" x1="' +
      left +
      '" y1="' +
      tineStart +
      '" x2="' +
      right +
      '" y2="' +
      tineStart +
      '"/>';
    return (
      '<figure class="kalimba-chart' +
      (index ? " print-page-break" : "") +
      '"><figcaption>Page ' +
      (index + 1) +
      " · Measures " +
      measures[0].number +
      "–" +
      measures[measures.length - 1].number +
      '</figcaption><svg viewBox="0 0 ' +
      width +
      " " +
      height +
      '" aria-label="Kalimba tablature page ' +
      (index + 1) +
      '"><g class="tab-tracks">' +
      tracks +
      '</g><g class="tab-bars">' +
      bars +
      '</g><g class="tab-notes">' +
      symbols +
      '</g><g class="tab-tines">' +
      tines +
      labels +
      "</g></svg></figure>"
    );
  }
  function kalimbaMarkup(items, song, mode, config, options) {
    var measures = buildMeasures(items, song),
      charts = [],
      row = { from: 0, to: config.physical.length },
      layoutCount = config.physical.length,
      isDual = layoutCount === 34,
      chartWidth = Math.max(620, layoutCount * 24 + 100),
      pageRatio = options && options.orientation === "landscape" ? 1.8 : 0.9,
      slotRatio = layoutCount === 8 ? pageRatio / 2.12 : pageRatio,
      minimumHeight = isDual ? 805 : 770,
      autoHeight = Math.max(minimumHeight, Math.ceil(chartWidth / slotRatio)),
      footerSpace = isDual ? 195 : layoutCount === 8 ? 230 : 120,
      guideEnd = autoHeight - footerSpace + 8,
      guideX = layoutCount === 17 || layoutCount === 21 ? chartWidth / 2 - 9.5 : chartWidth / 2,
      printMeta = (options && options.meta) || {},
      chartInfo =
        esc(printMeta.name || "Untitled") +
        " · " +
        esc(config.layoutName) +
        " · " +
        esc(printMeta.difficulty || "Not set");
    for (var i = 0; i < measures.length; i += 4)
      charts.push(
        kalimbaChart(measures.slice(i, i + 4), row, config, mode, charts.length, autoHeight)
      );
    charts = charts.map(function (chart, chartIndex) {
      if (layoutCount === 8)
        chart = chart.replace(
          "Page " + (chartIndex + 1) + " ·",
          "Page " + (Math.floor(chartIndex / 2) + 1) + " ·"
        );
      chart = chart.replace(
        "</figcaption>",
        ' · <span class="chart-meta">' + chartInfo + "</span></figcaption>"
      );
      return chart.replace(
        '</g><g class="tab-bars">',
        '</g><line class="center-guide" x1="' +
          guideX +
          '" y1="42" x2="' +
          guideX +
          '" y2="' +
          guideEnd +
          '"/><g class="tab-bars">'
      );
    });
    return (
      '<section class="kalimba-sheet layout-' +
      layoutCount +
      '"><style>.kalimba-chart .tine-start-line{stroke:#111;stroke-width:3}.kalimba-chart .printed-tine{width:19px;transform:translateX(-2.5px);rx:6px;ry:6px;stroke:#3d4650;stroke-width:1.6;filter:drop-shadow(1px 1px 0 rgba(0,0,0,.28))}.kalimba-chart .center-guide{stroke:#111;stroke-width:3;opacity:.9}.kalimba-chart .chart-meta{font-size:9px;font-weight:normal;color:#555}.layout-8{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:8mm;align-items:start}.layout-8 .kalimba-chart{min-width:0}.layout-8 .printed-tine{width:52px;transform:translateX(-19px);rx:12px;ry:12px}.layout-34 .printed-tine{transform:translateX(-3.3px)}.layout-34 .tine-track.lower-row.track-light{fill:#ddf4f1}.layout-34 .tine-track.lower-row.track-dark{fill:#c5e8e3}.layout-34 .tine-track.upper-row.track-light{fill:#eee4f7}.layout-34 .tine-track.upper-row.track-dark{fill:#ddcbea}.layout-34 .printed-tine.lower-row{fill:#55b8ae}.layout-34 .printed-tine.upper-row{fill:#a77ac7}.layout-34 .tab-symbol.lower-row ellipse,.layout-34 .tab-symbol.lower-row .tab-stem{stroke:#18786f}.layout-34 .tab-symbol.lower-row .filled,.layout-34 .tab-symbol.lower-row .dot,.layout-34 .tab-symbol.lower-row path{fill:#18786f}.layout-34 .tab-symbol.upper-row ellipse,.layout-34 .tab-symbol.upper-row .tab-stem{stroke:#69408a}.layout-34 .tab-symbol.upper-row .filled,.layout-34 .tab-symbol.upper-row .dot,.layout-34 .tab-symbol.upper-row path{fill:#69408a}.layout-34 .tab-symbol .open{fill:#fff}@media print{.kalimba-sheet{margin-top:2mm}.kalimba-chart{margin:1mm auto 0}.layout-8 .kalimba-chart.print-page-break{break-before:auto;page-break-before:auto}.layout-8 .kalimba-chart.print-page-break:nth-of-type(odd){break-before:page;page-break-before:always}}</style>' +
      charts.join("") +
      "</section>"
    );
  }
  function noteY(note) {
    var octave = Math.floor(note / 12) - 1,
      pc = ((note % 12) + 12) % 12,
      steps = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 },
      natural = [0, 2, 4, 5, 7, 9, 11].reduce(function (best, value) {
        return Math.abs(value - pc) < Math.abs(best - pc) ? value : best;
      }, 0),
      step = octave * 7 + steps[natural];
    return 82 - (step - 28) * 5;
  }
  function buildMeasures(items, song) {
    var bars = (song.barTimes || []).slice().filter(function (value, index, array) {
      return index === 0 || value > array[index - 1] + 0.0001;
    });
    if (!bars.length || bars[0] > 0.001) bars.unshift(0);
    if (bars[bars.length - 1] < song.duration - 0.001) bars.push(song.duration + 0.001);
    var measures = [];
    for (var i = 0; i < bars.length - 1; i++)
      measures.push({ number: i + 1, start: bars[i], end: bars[i + 1], items: [] });
    items.forEach(function (item) {
      var index = Math.min(measures.length - 1, measureIndex(song, item.event.start));
      if (measures[index]) measures[index].items.push(item);
    });
    return measures;
  }
  function activeSignature(song, time) {
    var signatures = song.timeSignatures || [{ seconds: 0, numerator: 4, denominator: 4 }],
      active = signatures[0];
    for (var i = 1; i < signatures.length && signatures[i].seconds <= time + 0.001; i++)
      active = signatures[i];
    return active || { numerator: 4, denominator: 4 };
  }
  function ledgerLines(x, y) {
    var lines = "",
      line;
    if (y > 92) {
      for (line = 102; line <= y + 1; line += 10)
        lines +=
          '<line class="ledger" x1="' +
          (x - 10) +
          '" y1="' +
          line +
          '" x2="' +
          (x + 10) +
          '" y2="' +
          line +
          '"/>';
    } else if (y < 52) {
      for (line = 42; line >= y - 1; line -= 10)
        lines +=
          '<line class="ledger" x1="' +
          (x - 10) +
          '" y1="' +
          line +
          '" x2="' +
          (x + 10) +
          '" y2="' +
          line +
          '"/>';
    }
    return lines;
  }
  function flags(x, stemEnd, count) {
    var paths = "";
    for (var i = 0; i < count; i++) {
      var y = stemEnd + i * 6;
      paths +=
        '<path d="M ' +
        (x + 6) +
        " " +
        y +
        " C " +
        (x + 19) +
        " " +
        (y + 4) +
        ", " +
        (x + 17) +
        " " +
        (y + 13) +
        ", " +
        (x + 9) +
        " " +
        (y + 17) +
        '" />';
    }
    return paths;
  }
  function scoreNote(item, x) {
    var y = noteY(item.event.note),
      value = item.value,
      open = value.kind === "whole" || value.kind === "half",
      whole = value.kind === "whole",
      stemEnd = y - 31,
      flagCount =
        value.kind === "eighth"
          ? 1
          : value.kind === "sixteenth"
            ? 2
            : value.kind === "thirtysecond"
              ? 3
              : 0,
      stem = whole
        ? ""
        : '<line class="stem" x1="' +
          (x + 6) +
          '" y1="' +
          y +
          '" x2="' +
          (x + 6) +
          '" y2="' +
          stemEnd +
          '"/>' +
          flags(x, stemEnd, flagCount),
      dots = value.dots ? '<circle class="dot" cx="' + (x + 13) + '" cy="' + y + '" r="2.2"/>' : "",
      accidental = /♯/.test(item.note)
        ? '<text class="accidental" x="' + (x - 15) + '" y="' + (y + 5) + '">♯</text>'
        : "";
    return (
      '<g class="score-note">' +
      ledgerLines(x, y) +
      accidental +
      '<ellipse cx="' +
      x +
      '" cy="' +
      y +
      '" rx="' +
      (whole ? 8 : 7) +
      '" ry="5" class="' +
      (open ? "open" : "filled") +
      '"/>' +
      stem +
      dots +
      "</g>"
    );
  }
  function scoreSystem(measures, index, song) {
    var width = 940,
      height = 145,
      header = 96,
      right = 930,
      usable = right - header,
      measureWidth = usable / Math.max(1, measures.length),
      signature = activeSignature(song, measures[0].start),
      bars = "",
      notes = "";
    measures.forEach(function (measure, measureIndex) {
      var left = header + measureIndex * measureWidth,
        duration = Math.max(0.001, measure.end - measure.start);
      bars +=
        '<line class="bar-line" x1="' +
        left +
        '" y1="52" x2="' +
        left +
        '" y2="92"/><text class="measure-number" x="' +
        (left + 4) +
        '" y="43">' +
        measure.number +
        "</text>";
      measure.items.forEach(function (item) {
        var ratio = Math.max(0, Math.min(0.97, (item.event.start - measure.start) / duration)),
          x = left + 14 + ratio * (measureWidth - 28);
        notes += scoreNote(item, x);
      });
    });
    bars += '<line class="bar-line" x1="' + right + '" y1="52" x2="' + right + '" y2="92"/>';
    return (
      '<svg class="staff" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" aria-label="Score system ' +
      (index + 1) +
      '"><text class="clef" x="14" y="91">𝄞</text><g class="time-signature"><text x="68" y="69">' +
      signature.numerator +
      '</text><text x="68" y="88">' +
      signature.denominator +
      '</text></g><g class="staff-lines"><line x1="8" y1="52" x2="930" y2="52"/><line x1="8" y1="62" x2="930" y2="62"/><line x1="8" y1="72" x2="930" y2="72"/><line x1="8" y1="82" x2="930" y2="82"/><line x1="8" y1="92" x2="930" y2="92"/></g>' +
      bars +
      notes +
      "</svg>"
    );
  }
  function scoreMarkup(items, song) {
    var measures = buildMeasures(items, song),
      systems = [];
    for (var i = 0; i < measures.length; i += 4)
      systems.push(scoreSystem(measures.slice(i, i + 4), systems.length, song));
    return (
      '<section class="score-sheet">' +
      (systems.join("") || "<p>No mapped notes to print.</p>") +
      "</section>"
    );
  }
  function documentMarkup(song, meta, config, options) {
    var items = mapped(song, config),
      format = options.format,
      content =
        format === "numbers"
          ? kalimbaMarkup(items, song, "numbers", config, options)
          : format === "notes"
            ? kalimbaMarkup(items, song, "notes", config, options)
            : format === "score"
              ? scoreMarkup(items, song)
              : scoreMarkup(items, song) + kalimbaMarkup(items, song, "numbers", config, options);
    return (
      '<!doctype html><html><head><meta charset="utf-8"><title>' +
      esc(meta.name) +
      " · Kbits Print</title><style>@page{size:" +
      options.paper +
      " " +
      options.orientation +
      ';margin:12mm}*{box-sizing:border-box}body{margin:0;color:#111;background:#e8e8e8;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:10px 18px;background:#17203a;color:white}.toolbar button{padding:9px 18px;border:0;background:#38bcd5;font-weight:bold;cursor:pointer}.page{width:min(100%,1000px);min-height:80vh;margin:18px auto;padding:28px 36px;background:white;box-shadow:0 2px 12px #777}.title{text-align:center}.title h1{margin:0 0 6px}.title p{margin:3px;color:#555}.sheet-meta{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;font-size:12px}.kalimba-sheet,.score-sheet{margin-top:28px}.kalimba-chart{break-inside:avoid;margin:12px auto 24px;max-width:1000px}.kalimba-chart figcaption{text-align:center;font-weight:bold;font-size:12px}.kalimba-chart svg{display:block;width:100%;max-height:78vh}.kalimba-chart .tine-track{stroke:#777;stroke-width:.8}.kalimba-chart .track-light{fill:#f3f3f3}.kalimba-chart .track-dark{fill:#d8d8d8}.kalimba-chart .tab-bar{stroke:#222;stroke-width:2}.kalimba-chart .tab-measure-number{font:11px Arial,sans-serif;fill:#444}.kalimba-chart .printed-tine{fill:#c8cbd0;stroke:#555;stroke-width:1.5}.kalimba-chart .printed-tine.upper-row{fill:#aeb3ba}.kalimba-chart .tine-label-print{font:9px Arial,sans-serif;text-anchor:middle;fill:#111}.tab-symbol ellipse,.tab-symbol .tab-stem{stroke:#111;stroke-width:2}.tab-symbol .filled,.tab-symbol .dot,.tab-symbol path{fill:#111}.tab-symbol .open{fill:white}.tab-symbol path{stroke:none}.staff{display:block;width:100%;break-inside:avoid;margin:8px 0}.staff line{stroke:#111;stroke-width:1.35}.staff .clef{font:48px serif}.staff .time-signature text{font:700 18px Georgia,serif;text-anchor:middle}.staff .bar-line{stroke-width:2}.staff .measure-number{font:9px Arial,sans-serif;fill:#555}.score-note ellipse,.score-note .stem,.score-note .ledger{stroke:#111;stroke-width:2}.score-note .filled,.score-note .dot,.score-note path{fill:#111}.score-note .open{fill:white}.score-note .accidental{font:17px serif}.score-note path{stroke:none}@media print{body{background:white}.toolbar{display:none}.page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.staff,.kalimba-chart{page-break-inside:avoid}.kalimba-chart.print-page-break{break-before:page;page-break-before:always}.kalimba-chart svg{max-height:none}}</style></head><body><div class="toolbar"><strong>KBITS PRINT PREVIEW · ' +
      items.length +
      ' MAPPED NOTES</strong><button onclick="window.print()">PRINT / SAVE PDF</button></div><main class="page"><header class="title"><h1>' +
      esc(meta.name || "Untitled") +
      "</h1><p>" +
      esc(meta.artist || "") +
      '</p><div class="sheet-meta"><span>Layout: ' +
      esc(config.layoutName) +
      "</span><span>Difficulty: " +
      esc(meta.difficulty || "Not set") +
      "</span></div></header>" +
      content +
      "</main></body></html>"
    );
  }
  /**
   * Replace an already-open preview document with printable HTML/SVG.
   * The caller must open the same-origin window during a user gesture. This
   * function does not open a popup or invoke the browser print dialog.
   * @param {Window} target Writable preview window; its document is replaced.
   * @param {Object} song Parsed MIDI with notes, division, barTimes and timeSignatures.
   * @param {{name: string, artist: string, difficulty: string}} meta Display metadata.
   * @param {{physical: number[], numbers: Array, layoutName: string}} config
   *   Tuned MIDI pitches in physical lane order and matching number labels.
   * @param {{format: string, paper: string, orientation: string}} options
   *   Trusted UI values: numbers/notes/score, Letter/A4, portrait/landscape.
   *   Mutated by assigning options.meta; song and config remain unchanged.
   * @returns {void}
   * @throws {Error} Propagates rendering or preview-document access failures.
   */
  function open(target, song, meta, config, options) {
    options.meta = meta;
    target.document.open();
    target.document.write(documentMarkup(song, meta, config, options));
    target.document.close();
  }
  global.KbitsPrint = { open: open };
})(window);
