/*
  BSC V3 CSV DATA PARSER

  Sources:
  - roster
  - log
  - events

  Final memberDB shape remains compatible with demo.js:

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

(function () {

  // --------------------------------------------------
  // CSV UTILITIES
  // --------------------------------------------------

  function splitCsvLine(line) {
    const cols = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        // Handle escaped double quotes inside quoted fields.
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }

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


  function parseCsv(csv) {
    return String(csv || "")
      .split(/\r?\n/)
      .filter(row => row.trim() !== "")
      .map(row => splitCsvLine(row));
  }


  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }


  function findHeaderIndex(headers, possibleNames) {
    const normalized = headers.map(normalizeHeader);

    for (const name of possibleNames) {
      const index = normalized.indexOf(
        normalizeHeader(name)
      );

      if (index !== -1) {
        return index;
      }
    }

    return -1;
  }


  function clean(value) {
    return String(value || "").trim();
  }


  function normalizeABC123(value) {
    return clean(value).toLowerCase();
  }


  // --------------------------------------------------
  // CATEGORY NORMALIZATION
  // --------------------------------------------------

  /*
    These keys match what the existing demo.js
    category/chart system already understands.
  */
  function normalizeCategoryKey(category) {
    const value = clean(category).toLowerCase();

    const map = {
      social: "socials",
      socials: "socials",

      meeting: "meetings",
      meetings: "meetings",

      workshop: "workshops",
      workshops: "workshops",

      fundraiser: "fundraiser",
      fundraisers: "fundraiser",

      volunteering: "volunteering",
      volunteer: "volunteering",

      event: "events",
      events: "events",

      repost: "reposts",
      reposts: "reposts",

      committee: "committee",
      committees: "committee"
    };

    return map[value] || value || "extra";
  }


  // --------------------------------------------------
  // DATE NORMALIZATION
  // --------------------------------------------------

  /*
    demo.js currently expects YYYYMMDD.

    Events may give us:
      2026-02-03
      2/3/2026
      02/03/2026
      20260203

    Convert everything to YYYYMMDD.
  */
  function normalizeEventDate(value) {
    const raw = clean(value);

    if (!raw) {
      return null;
    }

    if (/^\d{8}$/.test(raw)) {
      return raw;
    }

    const isoMatch = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, "0");
      const day = isoMatch[3].padStart(2, "0");

      return `${year}${month}${day}`;
    }

    const slashMatch = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
    );

    if (slashMatch) {
      const month = slashMatch[1].padStart(2, "0");
      const day = slashMatch[2].padStart(2, "0");
      const year = slashMatch[3];

      return `${year}${month}${day}`;
    }

    return raw.replace(/\D/g, "").slice(0, 8) || null;
  }


  // --------------------------------------------------
  // TIER
  // --------------------------------------------------

  function getTier(points) {
    const total = Number(points) || 0;

    if (total >= 40) {
      return "Exec";
    }

    if (total >= 25) {
      return "Professional";
    }

    if (total >= 15) {
      return "Intern";
    }

    return "Member";
  }


  // --------------------------------------------------
  // ROSTER PARSER
  // --------------------------------------------------

  function parseRosterCSV(csv) {
    const rows = parseCsv(csv);
    const db = {};

    if (!rows.length) {
      return db;
    }

    const headers = rows[0];

    const firstIdx = findHeaderIndex(
      headers,
      ["First"]
    );

    const lastIdx = findHeaderIndex(
      headers,
      ["Last"]
    );

    const emailIdx = findHeaderIndex(
      headers,
      ["Email"]
    );

    const abcIdx = findHeaderIndex(
      headers,
      [
        "abc123",
        "myUTSA ID",
        "UTSA ID",
        "ID"
      ]
    );

    const pointsIdx = findHeaderIndex(
      headers,
      ["Points"]
    );

    const joinedIdx = findHeaderIndex(
      headers,
      ["Joined"]
    );

    const ambassadorIdx = findHeaderIndex(
      headers,
      ["Ambassador"]
    );

    const rankIdx = findHeaderIndex(
      headers,
      ["Rank"]
    );


    if (abcIdx === -1) {
      throw new Error(
        'Roster CSV is missing "abc123".'
      );
    }


    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const abc123 = normalizeABC123(
        row[abcIdx]
      );

      if (!abc123) {
        continue;
      }

      const first =
        firstIdx >= 0
          ? clean(row[firstIdx])
          : "";

      const last =
        lastIdx >= 0
          ? clean(row[lastIdx])
          : "";

      const points =
        pointsIdx >= 0
          ? Number(clean(row[pointsIdx])) || 0
          : 0;


      db[abc123] = {
        utsaId: abc123,

        name: `${first} ${last}`.trim(),

        email:
          emailIdx >= 0
            ? clean(row[emailIdx])
            : "",

        joined:
          joinedIdx >= 0
            ? clean(row[joinedIdx])
            : "",

        ambassador:
          ambassadorIdx >= 0
            ? clean(row[ambassadorIdx])
            : "",

        rank:
          rankIdx >= 0
            ? clean(row[rankIdx])
            : "",

        // Roster is authoritative for total points.
        points,

        originalPoints: points,

        tier: getTier(points),

        // Populated later from log + events.
        categories: {},

        eventsList: []
      };
    }

    return db;
  }


  // --------------------------------------------------
  // EVENTS PARSER
  // --------------------------------------------------

  function parseEventsCSV(csv) {
    const rows = parseCsv(csv);
    const events = {};

    if (!rows.length) {
      return events;
    }

    const headers = rows[0];

    const eventIdIdx = findHeaderIndex(
      headers,
      ["Event ID"]
    );

    const eventNameIdx = findHeaderIndex(
      headers,
      ["Event Name"]
    );

    const dateIdx = findHeaderIndex(
      headers,
      ["Date"]
    );

    const categoryIdx = findHeaderIndex(
      headers,
      ["Category"]
    );

    const pointsIdx = findHeaderIndex(
      headers,
      ["Points"]
    );

    const activeIdx = findHeaderIndex(
      headers,
      ["Active"]
    );


    if (eventIdIdx === -1) {
      throw new Error(
        'Events CSV is missing "Event ID".'
      );
    }


    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const eventId = clean(
        row[eventIdIdx]
      );

      if (!eventId) {
        continue;
      }

      events[eventId] = {
        eventId,

        eventName:
          eventNameIdx >= 0
            ? clean(row[eventNameIdx])
            : eventId,

        date:
          dateIdx >= 0
            ? normalizeEventDate(row[dateIdx])
            : null,

        category:
          categoryIdx >= 0
            ? normalizeCategoryKey(
                row[categoryIdx]
              )
            : "extra",

        defaultPoints:
          pointsIdx >= 0
            ? Number(clean(row[pointsIdx])) || 0
            : 0,

        active:
          activeIdx >= 0
            ? clean(row[activeIdx]).toLowerCase() === "true"
            : false
      };
    }

    return events;
  }


  // --------------------------------------------------
  // LOG → MEMBER ENRICHMENT
  // --------------------------------------------------

  function applyLogCSV(csv, memberDB, eventDB) {
    const rows = parseCsv(csv);

    if (!rows.length) {
      return memberDB;
    }

    const headers = rows[0];

    const abcIdx = findHeaderIndex(
      headers,
      ["ABC123", "abc123"]
    );

    const eventIdIdx = findHeaderIndex(
      headers,
      ["Event ID"]
    );

    const eventNameIdx = findHeaderIndex(
      headers,
      ["Event Name"]
    );

    const pointsIdx = findHeaderIndex(
      headers,
      ["Points Awarded", "Points"]
    );

    const statusIdx = findHeaderIndex(
      headers,
      ["Status"]
    );


    if (abcIdx === -1) {
      throw new Error(
        'Log CSV is missing "ABC123".'
      );
    }

    if (eventIdIdx === -1) {
      throw new Error(
        'Log CSV is missing "Event ID".'
      );
    }


    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const abc123 = normalizeABC123(
        row[abcIdx]
      );

      if (!abc123) {
        continue;
      }

      // Ignore activity belonging to people
      // who are not in the current roster.
      const member = memberDB[abc123];

      if (!member) {
        continue;
      }


      const status =
        statusIdx >= 0
          ? clean(row[statusIdx]).toLowerCase()
          : "valid";

      // Only official valid transactions
      // contribute to charts/history.
      if (status !== "valid") {
        continue;
      }


      const eventId = clean(
        row[eventIdIdx]
      );

      const event = eventDB[eventId] || null;


      /*
        Prefer log.Points Awarded because that is
        the historical amount actually given to
        this member.

        Only fall back to the event default if the
        log somehow does not contain points.
      */
      let pointsAwarded =
        pointsIdx >= 0
          ? Number(clean(row[pointsIdx]))
          : NaN;

      if (!Number.isFinite(pointsAwarded)) {
        pointsAwarded =
          event
            ? Number(event.defaultPoints) || 0
            : 0;
      }


      /*
        Event table is authoritative for category,
        name and date.
      */
      const category =
        event
          ? event.category
          : "extra";

      const eventName =
        event
          ? event.eventName
          : (
              eventNameIdx >= 0
                ? clean(row[eventNameIdx])
                : eventId
            );

      const eventDate =
        event
          ? event.date
          : null;


      // Build category totals.
      member.categories[category] =
        (member.categories[category] || 0) +
        pointsAwarded;


      // Build event history.
      member.eventsList.push({
        eventId,

        title:
          eventName || "Event",

        date:
          eventDate,

        category,

        points:
          pointsAwarded
      });
    }


    // Sort event history chronologically.
    Object.values(memberDB).forEach(member => {
      member.eventsList.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";

        return dateA.localeCompare(dateB);
      });
    });


    return memberDB;
  }


  // --------------------------------------------------
  // FETCH
  // --------------------------------------------------

  async function fetchText(url) {
    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `CSV request failed (${response.status}): ${url}`
      );
    }

    return await response.text();
  }


  // --------------------------------------------------
  // MAIN V3 LOADER
  // --------------------------------------------------

  async function fetchAndParseV3(
    rosterUrl,
    logUrl,
    eventsUrl
  ) {

    const [
      rosterCsv,
      logCsv,
      eventsCsv
    ] = await Promise.all([
      fetchText(rosterUrl),
      fetchText(logUrl),
      fetchText(eventsUrl)
    ]);


    const memberDB =
      parseRosterCSV(rosterCsv);

    const eventDB =
      parseEventsCSV(eventsCsv);

    applyLogCSV(
      logCsv,
      memberDB,
      eventDB
    );


    return memberDB;
  }


  // --------------------------------------------------
  // EXPORTS
  // --------------------------------------------------

  window.parseRosterCSV = parseRosterCSV;
  window.parseEventsCSV = parseEventsCSV;
  window.applyLogCSV = applyLogCSV;

  window.fetchAndParseV3 =
    fetchAndParseV3;

})();