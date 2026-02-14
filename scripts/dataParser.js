/*
  CSV parsing utilities for the member dashboard.

  Exports:
  - window.parseMembersCSV(csvText): parse raw CSV into member DB
  - window.fetchAndParse(url): fetch CSV URL + parse into member DB

  Note:
  This parser is intentionally lightweight (no third-party CSV dependency).
*/

(function () {
  /*
    Split one CSV line into columns while honoring quoted commas.
    This is sufficient for our published sheet format.
  */
  function splitCsvLine(line) {
    const cols = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        cols.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    cols.push(cur);
    return cols;
  }

  /*
    Parse full CSV text into DB shape:
    {
      abc123: {
        utsaId,
        name,
        points,
        originalPoints,
        categories,
        tier,
        eventsList
      }
    }
  */
  function parseMembersCSV(csv) {
    const rows = csv.split(/\r?\n/).map(row => splitCsvLine(row));
    const db = {};
    if (!rows || rows.length === 0) return db;

    const header = rows[0].map(col => (col || "").trim());

    // Core identity columns.
    const firstIdx = header.findIndex(h => /first/i.test(h));
    const lastIdx = header.findIndex(h => /last/i.test(h));
    const emailIdx = header.findIndex(h => /email/i.test(h));

    // ID column can vary by sheet naming.
    let idIdx = header.findIndex(h => /(id|myutsa|utsa|abc123)/i.test(h));
    if (idIdx === -1) idIdx = header.findIndex(h => /netid|username|myid/i.test(h));

    // Points may exist as an explicit column.
    const pointsIdx = header.findIndex(h => /points/i.test(h));

    /*
      Known non-event columns. Any other columns are treated as event/category
      contributors (ex: GM1Intro_20260217_Meeting).
    */
    const knownIdx = new Set([
      firstIdx,
      lastIdx,
      emailIdx,
      idIdx,
      pointsIdx,
      header.findIndex(h => /notes/i.test(h)),
      header.findIndex(h => /joined/i.test(h)),
      header.findIndex(h => /ambassador/i.test(h)),
      header.findIndex(h => /rank/i.test(h))
    ].filter(i => i >= 0));

    /*
      Map event suffix words into normalized category keys expected by the
      dashboard chart/filter pipeline.
    */
    const suffixMap = {
      social: "socials",
      socials: "socials",
      meeting: "meetings",
      meetings: "meetings",
      workshop: "workshops",
      workshops: "workshops",
      fundraiser: "fundraiser",
      volunteering: "volunteering",
      event: "events",
      events: "events",
      repost: "reposts",
      reposts: "reposts",
      committee: "committee",
      extra: "extra"
    };

    // Resolve each non-core column into a target category key.
    const categoryCols = {};
    header.forEach((h, i) => {
      if (knownIdx.has(i) || !h) return;

      const parts = h.split("_");
      const suffix = parts[parts.length - 1].toLowerCase();
      let key = suffixMap[suffix];

      if (!key) {
        // Fallback keyword search for unexpected header shapes.
        for (const candidate in suffixMap) {
          if (h.toLowerCase().includes(candidate)) {
            key = suffixMap[candidate];
            break;
          }
        }
      }

      if (!key) key = "extra";
      categoryCols[i] = key;
    });

    const categoryKeys = Array.from(new Set(Object.values(categoryCols)));

    // Parse member rows.
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const first = (row[firstIdx] || row[0] || "").trim();
      const last = (row[lastIdx] || row[1] || "").trim();
      const idRaw = (idIdx >= 0 ? row[idIdx] : row[2]) || "";
      const id = (idRaw + "").trim().toLowerCase();
      if (!id) continue;

      const categories = {};
      categoryKeys.forEach(key => {
        categories[key] = 0;
      });

      /*
        Build per-member event list and category totals from event columns.
        Event header convention: Title_YYYYMMDD_Category
      */
      const eventsList = [];
      Object.keys(categoryCols).forEach(col => {
        const key = categoryCols[col];
        const value = parseInt((row[col] || "").trim(), 10) || 0;
        categories[key] = (categories[key] || 0) + value;

        if (value <= 0) return;

        const headerText = header[col] || `event_${col}`;
        const parts = headerText.split("_");
        let eventName = headerText;
        let eventDate = null;

        if (parts.length >= 2) {
          const potentialDate = parts[parts.length - 2];
          if (/^\d{8}$/.test(potentialDate)) {
            eventDate = potentialDate;
            eventName = parts.slice(0, -2).join("_");
          }
        }

        eventsList.push({
          title: eventName,
          date: eventDate,
          category: key,
          points: value
        });
      });

      // Prefer explicit points column; fallback to summed categories.
      let total = 0;
      if (pointsIdx >= 0) total = parseInt((row[pointsIdx] || "").trim(), 10) || 0;
      if (!total) total = Object.values(categories).reduce((a, b) => a + b, 0);

      // Official tier cutoffs.
      let tier = "Member";
      if (total >= 40) tier = "Exec";
      else if (total >= 25) tier = "Professional";
      else if (total >= 15) tier = "Intern";

      db[id] = {
        utsaId: id,
        name: `${first} ${last}`.trim(),
        points: total,
        originalPoints: total,
        categories,
        tier,
        eventsList
      };
    }

    return db;
  }

  // Fetch helper used by the demo page when parser script is loaded.
  async function fetchAndParse(url) {
    const res = await fetch(url);
    const csv = await res.text();
    return parseMembersCSV(csv);
  }

  window.parseMembersCSV = parseMembersCSV;
  window.fetchAndParse = fetchAndParse;
})();
