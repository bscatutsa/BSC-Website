// =====================================================
//  BSC - LIVE MEMBER LOOKUP DEMO (CLEAN VERSION)
// =====================================================

// ---- LIVE CSV EXPORT FROM GOOGLE SHEETS ----
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnVIp76kMhhrA1xalmb_c6AgKzmJ8XfVvgfMJ9vrFvZ-lQae8mzFJB28zH68GNoI5kwXhib3S8joz6/pub?gid=1345780989&single=true&output=csv";

let memberDB = {};
let currentMember = null;
let pointsChart = null;

// NEW — chart mode state
let chartMode = "donut";

// membership tier
function getMembershipTier(points) {
  if (points >= 36) return { tier: "Executive", class: "tier-executive" };
  if (points >= 21) return { tier: "Professional", class: "tier-professional" };
  if (points >= 11) return { tier: "Intern", class: "tier-intern" };
  return { tier: "Member", class: "tier-member" };
}

// --------------------------------------------------
// DONUT CHART RENDER
// --------------------------------------------------
function renderChart(member) {
  const ctx = document.getElementById("pointsChart").getContext("2d");

  const cats = member.categories;
  const labels = [];
  const data = [];
  const colors = [];

  const colorMap = {
    socials: "#5DA8FF",
    meetings: "#1D5DFF",
    reposts: "#7BC8FF",
    fundraiser: "#FF914D",
    volunteering: "#FFCE56",
    workshops: "#FFC0CB",
    events: "#9B59B6",
    extra: "#2ECC71",
    committee: "#34495E"
  };

  for (const key in cats) {
    const val = cats[key];
    if (val > 0) {
      labels.push(key.charAt(0).toUpperCase() + key.slice(1));
      data.push(val);
      colors.push(colorMap[key]);
    }
  }

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          hoverOffset: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 900
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const total = data.reduce((a, b) => a + b, 0);
              const pct = ((val / total) * 100).toFixed(1);
              return `${context.label}: ${val} (${pct}%)`;
            }
          }
        },
        legend: {
          position: "bottom",
          labels: { boxWidth: 15 }
        }
      }
    }
  });
}

// --------------------------------------------------
// BAR CHART RENDER
// --------------------------------------------------
function renderBarChart(member) {
  const ctx = document.getElementById("pointsChart").getContext("2d");

  const cats = member.categories;
  const labels = [];
  const data = [];

  for (const key in cats) {
    if (cats[key] > 0) {
      labels.push(key.charAt(0).toUpperCase() + key.slice(1));
      data.push(cats[key]);
    }
  }

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map(label => {
            const key = label.toLowerCase();
            return {
              socials:      "#5DA8FF",
              meetings:     "#1D5DFF",
              reposts:      "#7BC8FF",
              fundraiser:   "#FF914D",
              volunteering: "#FFCE56",
              workshops:    "#FFC0CB",
              events:       "#9B59B6",
              extra:        "#2ECC71",
              committee:    "#34495E"
            }[key] || "#1A4B89";
          }),
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// --------------------------------------------------
// CHART MODE HANDLER
// --------------------------------------------------
function renderChartByMode(member) {
  if (chartMode === "donut") renderChart(member);
  else renderBarChart(member);
}

// --------------------------------------------------
// LOAD + PARSE SHEET
// --------------------------------------------------
async function loadMembersFromSheet() {
  try {
    // Fully use the dedicated data parser
    if (window.fetchAndParse && typeof window.fetchAndParse === "function") {
      memberDB = await window.fetchAndParse(SHEET_URL);
    } else if (window.parseMembersCSV && typeof window.parseMembersCSV === "function") {
      // fallback: fetch raw CSV and parse
      const res = await fetch(SHEET_URL);
      const csv = await res.text();
      memberDB = window.parseMembersCSV(csv);
    } else {
      throw new Error("Data parser not available");
    }
  } catch (err) {
    console.error("CSV PARSE FAILED:", err);
  }
}

// --------------------------------------------------
// RENDER EVENTS
// --------------------------------------------------
function renderEvents(member) {
  const eventList = document.getElementById("eventList");
  const filterRow = document.getElementById("eventFilters");

  if (!eventList || !filterRow) return;

  eventList.innerHTML = "";
  filterRow.innerHTML = "";

  const events = member.eventsList || [];

  if (events.length === 0) {
    eventList.textContent = "No events recorded.";
    return;
  }

  const categoryColors = {
    socials: "#5DA8FF",
    meetings: "#1D5DFF",
    reposts: "#7BC8FF",
    fundraiser: "#FF914D",
    volunteering: "#FFCE56",
    workshops: "#FFC0CB",
    events: "#9B59B6",
    extra: "#2ECC71",
    committee: "#34495E"
  };

  // Get unique categories present in events
  const categoriesInEvents = [...new Set(events.map(e => e.category))];

  // Render filter pills
  const allPill = document.createElement("button");
  allPill.className = "event-filter-pill active";
  allPill.textContent = "All";
  allPill.style.cursor = "pointer";
  allPill.style.padding = "6px 14px";
  allPill.style.border = "1px solid #ddd";
  allPill.style.borderRadius = "20px";
  allPill.style.backgroundColor = "#222";
  allPill.style.color = "white";
  allPill.style.fontWeight = "600";
  allPill.style.fontSize = "12px";
  allPill.style.marginRight = "8px";
  filterRow.appendChild(allPill);

  categoriesInEvents.forEach(cat => {
    const pill = document.createElement("button");
    pill.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    pill.style.cursor = "pointer";
    pill.style.padding = "6px 14px";
    pill.style.border = `1px solid ${categoryColors[cat] || "#ddd"}`;
    pill.style.borderRadius = "20px";
    pill.style.backgroundColor = "transparent";
    pill.style.color = categoryColors[cat] || "#666";
    pill.style.fontWeight = "600";
    pill.style.fontSize = "12px";
    pill.style.marginRight = "8px";
    filterRow.appendChild(pill);
  });

  // Render all events initially
  const renderFilteredEvents = (filterCategory = null) => {
    eventList.innerHTML = "";
    const filteredEvents = filterCategory 
      ? events.filter(e => e.category === filterCategory)
      : events;

    filteredEvents.forEach(ev => {
      const row = document.createElement("div");
      row.style.marginBottom = "12px";
      row.style.padding = "10px";
      row.style.backgroundColor = "#f9f9f9";
      row.style.borderRadius = "6px";
      row.style.fontSize = "14px";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.borderLeft = `4px solid ${categoryColors[ev.category] || "#999"}`;
      
      const leftContent = document.createElement("div");
      let dateHtml = "";
      
      // Format date if available
      if (ev.date) {
        const dateStr = ev.date; // YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const formatted = `${month}/${day}/${year}`;
        dateHtml = `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${formatted}</div>`;
      }
      
      leftContent.innerHTML = dateHtml + `<div style="font-weight: 500; color: #222;">${ev.title || "Event"}</div>`;
      
      const rightContent = document.createElement("div");
      rightContent.style.display = "flex";
      rightContent.style.gap = "10px";
      rightContent.style.alignItems = "center";
      
      // Category badge
      const badge = document.createElement("span");
      badge.style.display = "inline-block";
      badge.style.padding = "4px 10px";
      badge.style.borderRadius = "12px";
      badge.style.backgroundColor = categoryColors[ev.category] || "#999";
      badge.style.color = "white";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "600";
      badge.textContent = (ev.category || "Event").charAt(0).toUpperCase() + (ev.category || "Event").slice(1);
      
      // Points display
      const pointsSpan = document.createElement("span");
      pointsSpan.style.fontWeight = "700";
      pointsSpan.style.fontSize = "15px";
      pointsSpan.style.color = categoryColors[ev.category] || "#999";
      pointsSpan.textContent = `+${ev.points || 0}`;
      
      rightContent.appendChild(badge);
      rightContent.appendChild(pointsSpan);
      
      row.appendChild(leftContent);
      row.appendChild(rightContent);
      eventList.appendChild(row);
    });
  };

  // Add click handlers to filter pills
  allPill.addEventListener("click", () => {
    document.querySelectorAll(".event-filter-pill").forEach(p => {
      p.style.backgroundColor = "transparent";
      p.style.color = "#999";
      p.style.borderColor = "#ddd";
    });
    allPill.style.backgroundColor = "#222";
    allPill.style.color = "white";
    renderFilteredEvents(null);
  });

  document.querySelectorAll(".event-filter-pill:not(.active)").forEach((pill, idx) => {
    const cat = categoriesInEvents[idx];
    pill.addEventListener("click", () => {
      document.querySelectorAll(".event-filter-pill").forEach(p => {
        p.style.backgroundColor = "transparent";
        p.style.color = "#999";
        p.style.borderColor = "#ddd";
      });
      pill.style.backgroundColor = categoryColors[cat];
      pill.style.color = "white";
      pill.style.borderColor = categoryColors[cat];
      renderFilteredEvents(cat);
    });
  });

  // Initial render
  renderFilteredEvents(null);
}

// --------------------------------------------------
// CATEGORY BADGES
// --------------------------------------------------
function renderCategoryBadges(member) {
  const container = document.getElementById("categoryBadges");
  if (!container) return;

  container.innerHTML = "";

  const categories = [
    { key: "socials", label: "Socials", color: "#4F8AFF" },
    { key: "meetings", label: "Meetings", color: "#7C4DFF" },
    { key: "workshops", label: "Workshops", color: "#FFB2C4" },
    { key: "events", label: "Events", color: "#54C1A9" },
    { key: "extra", label: "Extra", color: "#7BD13A" }
  ];

  categories.forEach(cat => {
    const points = member.categories?.[cat.key] || 0;
    if (points > 0) {
      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = `${cat.label}: ${points}`;
      badge.style.backgroundColor = cat.color;
      container.appendChild(badge);
    }
  });
}

// --------------------------------------------------
// LEADERBOARD
// --------------------------------------------------
function renderLeaderboard(db) {
  const container = document.getElementById("leaderboardList");
  const card = document.getElementById("leaderboardCard");
  if (!container || !card) return;
  container.innerHTML = "";

  const arr = Object.values(db || {}).slice();
  arr.sort((a, b) => (b.points || 0) - (a.points || 0));
  const top = arr.slice(0, 10);

  top.forEach((m, i) => {
    const li = document.createElement("li");

    const rankSpan = document.createElement("span");
    rankSpan.className = "rank" + (i === 0 ? " gold" : i === 1 ? " silver" : i === 2 ? " bronze" : "");
    rankSpan.textContent = (i + 1).toString();

    const nameSpan = document.createElement("span");
    nameSpan.className = "leader-name";
    nameSpan.textContent = m.name || m.utsaId || "—";

    const tierSpan = document.createElement("span");
    const tier = m.tier || (getMembershipTier(m.points || 0) || {}).tier || "Member";
    tierSpan.className = `leader-tier ${tier}`;
    tierSpan.textContent = tier;

    const ptsSpan = document.createElement("span");
    ptsSpan.className = "leader-points";
    ptsSpan.textContent = (m.points || 0).toString();

    li.appendChild(rankSpan);
    li.appendChild(nameSpan);
    li.appendChild(tierSpan);
    li.appendChild(ptsSpan);

    container.appendChild(li);
  });

  // show card if we have at least one member
  card.style.display = top.length > 0 ? "block" : "none";
}

// --------------------------------------------------
// RENDER MEMBER
// --------------------------------------------------
function renderMember(member) {
  const card = document.getElementById("memberCard");

  if (!member) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";

  document.getElementById("memberName").textContent = member.name;
  document.getElementById("memberPoints").textContent = member.points;

  const tierInfo = getMembershipTier(member.points);
  const badge = document.getElementById("membershipTierBadge");
  badge.textContent = tierInfo.tier;
  badge.className = tierInfo.class;

  renderChartByMode(member);
  renderCategoryBadges(member);
  renderEvents(member);
}

// --------------------------------------------------
// DOM LOGIC
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const utsaInput = document.getElementById("utsaIdInput");
  const lookupBtn = document.getElementById("lookupBtn");

  // load data then render leaderboard
  await loadMembersFromSheet();
  renderLeaderboard(memberDB);

  // CHART TOGGLE
  const toggleTrack = document.getElementById("chartToggleTrack");
  const toggleKnob = document.getElementById("chartToggleKnob");
  const toggleOptions = document.querySelectorAll(".chart-toggle-option");

  toggleOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      chartMode = opt.dataset.mode;

      toggleKnob.style.left = chartMode === "donut" ? "3px" : "107px";

      toggleOptions.forEach(o => o.classList.remove("active"));
      opt.classList.add("active");

      if (currentMember) renderChartByMode(currentMember);
    });
  });

  // LOOKUP
  function doLookup() {
    const id = (utsaInput.value || "").trim().toLowerCase();

    if (!id) {
      document.getElementById("lookupMessage").textContent = "Enter a myUTSA ID.";
      renderMember(null);
      currentMember = null;
      return;
    }

    if (!memberDB[id]) {
      document.getElementById("lookupMessage").textContent = `No member found for "${id}".`;
      renderMember(null);
      currentMember = null;
      return;
    }

    currentMember = { ...memberDB[id] };
    document.getElementById("lookupMessage").textContent = `Loaded ${currentMember.name}.`;
    renderMember(currentMember);
  }

  lookupBtn.addEventListener("click", doLookup);
  utsaInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doLookup();
  });
});
