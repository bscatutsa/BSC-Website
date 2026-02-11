// Simple CSV parser for the BSC demo
// Exposes: window.parseMembersCSV(csv) -> returns member DB object
// Also exposes: window.fetchAndParse(url) -> fetches url and returns parsed DB

(function () {
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

  function parseMembersCSV(csv) {
    const rows = csv.split(/\r?\n/).map(r => splitCsvLine(r));
    const db = {};
    if (!rows || rows.length === 0) return db;

    const header = rows[0].map(h => (h || "").trim());

    const firstIdx = header.findIndex(h => /first/i.test(h));
    const lastIdx = header.findIndex(h => /last/i.test(h));
    const emailIdx = header.findIndex(h => /email/i.test(h));
    // id column: common names or example like 'abc123'
    let idIdx = header.findIndex(h => /(id|myutsa|utsa|abc123)/i.test(h));
    if (idIdx === -1) idIdx = header.findIndex(h => /netid|username|myid/i.test(h));
    // points index
    let pointsIdx = header.findIndex(h => /points/i.test(h));

    // determine which header columns are event/category columns (rest after Notes)
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

    // mapping from suffix/type to our category keys
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

    // collect category columns and their target keys
    const categoryCols = {};
    header.forEach((h, i) => {
      if (knownIdx.has(i)) return;
      if (!h) return;
      // try to parse suffix after last underscore
      const parts = h.split("_");
      const suffix = parts[parts.length - 1].toLowerCase();
      let key = suffixMap[suffix];
      if (!key) {
        // try matching keywords in the header
        for (const k in suffixMap) {
          if (h.toLowerCase().includes(k)) {
            key = suffixMap[k];
            break;
          }
        }
      }
      if (!key) key = "extra";
      categoryCols[i] = key;
    });

    // ensure we know the set of categories
    const categoryKeys = Array.from(new Set(Object.values(categoryCols)));

    // parse each data row
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const first = (row[firstIdx] || row[0] || "").trim();
      const last = (row[lastIdx] || row[1] || "").trim();
      const idRaw = (idIdx >= 0 ? row[idIdx] : row[2]) || "";
      const id = (idRaw + "").trim().toLowerCase();
      if (!id) continue;

      const categories = {};
      categoryKeys.forEach(k => (categories[k] = 0));

      // aggregate category values and collect events attended
      const eventsList = [];
      Object.keys(categoryCols).forEach(col => {
        const key = categoryCols[col];
        const val = parseInt((row[col] || "").trim(), 10) || 0;
        categories[key] = (categories[key] || 0) + val;
        if (val > 0) {
          // parse event header format: EventTitle_YYYYMMDD_Category
          const headerText = header[col] || (`event_${col}`);
          const parts = headerText.split("_");
          let eventName = headerText;
          let eventDate = null;
          
          if (parts.length >= 2) {
            // Last part is category, second-to-last might be date
            const potentialDate = parts[parts.length - 2];
            if (/^\d{8}$/.test(potentialDate)) {
              eventDate = potentialDate; // YYYYMMDD format
              eventName = parts.slice(0, -2).join("_"); // everything except date and category
            }
          }
          
          eventsList.push({
            title: eventName,
            date: eventDate,
            category: key,
            points: val
          });
        }
      });

      // determine total points: prefer explicit Points column, otherwise sum categories
      let total = 0;
      if (pointsIdx >= 0) total = parseInt((row[pointsIdx] || "").trim(), 10) || 0;
      if (!total) total = Object.values(categories).reduce((a, b) => a + b, 0);

      // compute membership tier based on points (user-provided thresholds)
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

  async function fetchAndParse(url) {
    const res = await fetch(url);
    const csv = await res.text();
    return parseMembersCSV(csv);
  }

  window.parseMembersCSV = parseMembersCSV;
  window.fetchAndParse = fetchAndParse;
})();
