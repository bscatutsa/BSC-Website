// =====================================================
//  BSC - LIVE MEMBER LOOKUP DEMO (CLEAN VERSION)
// =====================================================

// ---- LIVE CSV EXPORT FROM GOOGLE SHEETS ----
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnVIp76kMhhrA1xalmb_c6AgKzmJ8XfVvgfMJ9vrFvZ-lQae8mzFJB28zH68GNoI5kwXhib3S8joz6/pub?gid=1345780989&single=true&output=csv";

let memberDB = {};
let currentMember = null;
let pointsChart = null;
let chartMode = "donut";

// --------------------------------------------------
// CATEGORY COLOR SYSTEM (SINGLE SOURCE OF TRUTH)
// --------------------------------------------------
// Read a CSS custom property from :root, with a JS fallback.
function readCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const CATEGORY_COLORS = {
  Events: readCssVar("--cat-events", "#7c4cc9"),
  Meetings: readCssVar("--cat-meetings", "#2f8f83"),
  Fundraisers: readCssVar("--cat-fundraisers", "#e6a23c"),
  Socials: readCssVar("--cat-socials", "#d45b7a"),
  Workshops: readCssVar("--cat-workshops", "#3b82f6"),
  Committees: readCssVar("--cat-committees", "#ef4444"),
  Opportunities: readCssVar("--cat-opportunities", "#14b8a6")
};

const CATEGORY_ALIASES = {
  event: "Events",
  events: "Events",
  meeting: "Meetings",
  meetings: "Meetings",
  committee: "Committees",
  committees: "Committees",
  fundraiser: "Fundraisers",
  fundraisers: "Fundraisers",
  social: "Socials",
  socials: "Socials",
  workshop: "Workshops",
  workshops: "Workshops",
  opportunity: "Opportunities",
  opportunities: "Opportunities",
  volunteering: "Opportunities",
  repost: "Opportunities",
  reposts: "Opportunities",
  extra: "Opportunities"
};

const AUTO_COLOR_POOL = [
  ...new Set([
    ...Object.values(CATEGORY_COLORS),
    readCssVar("--bsc-accent", "#2f5d8a"),
    readCssVar("--bsc-primary", "#1f3f66")
  ])
];

// Convert loose labels into title case for consistent UI text.
function toTitleCase(value) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

// Normalize category variants from sheet data into canonical labels.
function normalizeCategoryName(category) {
  const raw = (category || "").toString().trim();
  if (!raw) return "Socials";

  const key = raw.toLowerCase();
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];

  return toTitleCase(raw);
}

// Deterministically assign a fallback color when a category is unknown.
function getAutoColor(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AUTO_COLOR_POOL.length;
  return AUTO_COLOR_POOL[idx] || "#999";
}

// Resolve a category into a stable color token.
function getCategoryColor(category) {
  const normalized = normalizeCategoryName(category);
  if (!CATEGORY_COLORS[normalized]) {
    CATEGORY_COLORS[normalized] = getAutoColor(normalized);
  }
  return CATEGORY_COLORS[normalized] || "#999";
}

// Build chart-ready category arrays from raw member category totals.
function buildCategorySeries(categories) {
  const totals = {};

  Object.entries(categories || {}).forEach(([key, rawValue]) => {
    const value = Number(rawValue) || 0;
    if (value <= 0) return;

    const normalized = normalizeCategoryName(key);
    totals[normalized] = (totals[normalized] || 0) + value;
  });

  const baseOrder = Object.keys(CATEGORY_COLORS);
  const labels = Object.keys(totals).sort((a, b) => {
    const ia = baseOrder.indexOf(a);
    const ib = baseOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const data = labels.map(label => totals[label]);
  const maxValue = data.length ? Math.max(...data) : 0;

  return { labels, data, maxValue };
}

// Map total points to official BSC membership tiers.
function getMembershipTier(points) {
  // Official BSC tiers:
  // Member: 0-14, Intern: 15-24, Professional: 25-39, Exec: 40+
  if (points >= 40) return { tier: "Exec", class: "tier-executive" };
  if (points >= 25) return { tier: "Professional", class: "tier-professional" };
  if (points >= 15) return { tier: "Intern", class: "tier-intern" };
  return { tier: "Member", class: "tier-member" };
}

// Build category badge markup used in event rows.
function getCategoryBadge(category) {
  const normalized = normalizeCategoryName(category);
  const color = getCategoryColor(normalized) || "#999";
  return `<span class="event-tag" style="display:inline-block;padding:4px 10px;border-radius:12px;background-color:${color}20;color:${color};border:1px solid ${color}40;font-size:12px;font-weight:600;line-height:1.2;">${normalized}</span>`;
}

// --------------------------------------------------
// DONUT CHART RENDER
// --------------------------------------------------
// Render category distribution as a donut chart.
function renderChart(member) {
  const canvas = document.getElementById("pointsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { labels, data } = buildCategorySeries(member.categories || {});

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map(label => getCategoryColor(label) || "#999"),
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
            label(context) {
              const val = Math.round(Number(context.raw) || 0);
              const total = data.reduce((a, b) => a + b, 0);
              const pct = total ? ((val / total) * 100).toFixed(1) : "0.0";
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
// Render category distribution as a horizontal bar chart.
function renderBarChart(member) {
  const canvas = document.getElementById("pointsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { labels, data, maxValue } = buildCategorySeries(member.categories || {});

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map(label => getCategoryColor(label) || "#999"),
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: Math.max(1, Math.ceil(maxValue)),
          ticks: {
            precision: 0,
            stepSize: 1,
            callback(value) {
              const numeric = Number(value);
              return Number.isInteger(numeric) ? numeric : "";
            }
          }
        },
        y: {
          ticks: {
            autoSkip: false
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const value = Math.round(Number(context.raw) || 0);
              return `${context.label}: ${value}`;
            }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Route to selected chart renderer.
function renderChartByMode(member) {
  if (chartMode === "donut") renderChart(member);
  else renderBarChart(member);
}

// --------------------------------------------------
// LOAD + PARSE SHEET
// --------------------------------------------------
// Load member DB from published Google Sheets CSV.
async function loadMembersFromSheet() {
  try {
    if (window.fetchAndParse && typeof window.fetchAndParse === "function") {
      memberDB = await window.fetchAndParse(SHEET_URL);
    } else if (window.parseMembersCSV && typeof window.parseMembersCSV === "function") {
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
// Render event history + category filter pills for the selected member.
function renderEvents(member) {
  const eventList = document.getElementById("eventList");
  const filterRow = document.getElementById("eventFilters");
  if (!eventList || !filterRow) return;

  const primaryColor = readCssVar("--bsc-primary", "#1f3f66");
  const mutedColor = readCssVar("--clr-text-muted", "#6c757d");
  const neutralBorder = readCssVar("--bsc-light-gray", "rgba(0, 0, 0, 0.05)");
  const surfaceColor = readCssVar("--clr-bg-card", "#ffffff");
  const darkText = readCssVar("--clr-text-dark", "#1c1c1c");

  eventList.innerHTML = "";
  filterRow.innerHTML = "";

  const events = member.eventsList || [];
  if (!events.length) {
    eventList.textContent = "No events recorded.";
    return;
  }

  const normalizedEvents = events.map(ev => {
    const normalizedCategory = normalizeCategoryName(ev.category);
    return {
      ...ev,
      normalizedCategory,
      categoryColor: getCategoryColor(normalizedCategory)
    };
  });

  const categoriesInEvents = [...new Set(normalizedEvents.map(e => e.normalizedCategory))];

  const allPill = document.createElement("button");
  allPill.className = "event-filter-pill active";
  allPill.textContent = "All";
  allPill.style.cursor = "pointer";
  allPill.style.padding = "6px 14px";
  allPill.style.border = `1px solid ${neutralBorder}`;
  allPill.style.borderRadius = "20px";
  allPill.style.backgroundColor = primaryColor;
  allPill.style.color = "white";
  allPill.style.fontWeight = "600";
  allPill.style.fontSize = "12px";
  allPill.style.marginRight = "8px";
  filterRow.appendChild(allPill);

  const categoryPills = [];

  categoriesInEvents.forEach(category => {
    const color = getCategoryColor(category);
    const pill = document.createElement("button");
    pill.className = "event-filter-pill";
    pill.textContent = category;
    pill.style.cursor = "pointer";
    pill.style.padding = "6px 14px";
    pill.style.border = `1px solid ${color}55`;
    pill.style.borderRadius = "20px";
    pill.style.backgroundColor = "transparent";
    pill.style.color = color;
    pill.style.fontWeight = "600";
    pill.style.fontSize = "12px";
    pill.style.marginRight = "8px";

    filterRow.appendChild(pill);
    categoryPills.push({ pill, category, color });
  });

  // Keep filter pill styles synchronized with selected category.
  const setPillState = activeCategory => {
    allPill.style.backgroundColor = activeCategory ? "transparent" : primaryColor;
    allPill.style.color = activeCategory ? mutedColor : "white";
    allPill.style.borderColor = neutralBorder;

    categoryPills.forEach(({ pill, category, color }) => {
      const isActive = category === activeCategory;
      pill.style.backgroundColor = isActive ? color : "transparent";
      pill.style.color = isActive ? "white" : color;
      pill.style.borderColor = isActive ? color : `${color}55`;
    });
  };

  // Render visible rows based on current filter selection.
  const renderFilteredEvents = filterCategory => {
    eventList.innerHTML = "";

    const filteredEvents = filterCategory
      ? normalizedEvents.filter(e => e.normalizedCategory === filterCategory)
      : normalizedEvents;

    filteredEvents.forEach(ev => {
      const row = document.createElement("div");
      row.className = "event-item";
      row.style.marginBottom = "12px";
      row.style.padding = "10px";
      row.style.backgroundColor = surfaceColor;
      row.style.borderRadius = "6px";
      row.style.fontSize = "14px";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.borderLeft = `4px solid ${ev.categoryColor}`;

      const leftContent = document.createElement("div");
      let dateHtml = "";

      if (ev.date) {
        const dateStr = ev.date;
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const formatted = `${month}/${day}/${year}`;
        dateHtml = `<div style="font-size:12px; color:${mutedColor}; margin-bottom:4px;">${formatted}</div>`;
      }

      leftContent.innerHTML = `${dateHtml}<div style="font-weight:500; color:${darkText};">${ev.title || "Event"}</div>`;

      const rightContent = document.createElement("div");
      rightContent.style.display = "flex";
      rightContent.style.gap = "10px";
      rightContent.style.alignItems = "center";

      const badgeWrapper = document.createElement("div");
      badgeWrapper.innerHTML = getCategoryBadge(ev.normalizedCategory);
      rightContent.appendChild(badgeWrapper.firstElementChild);

      const pointsSpan = document.createElement("span");
      pointsSpan.style.fontWeight = "700";
      pointsSpan.style.fontSize = "15px";
      pointsSpan.style.color = ev.categoryColor;
      pointsSpan.textContent = `+${ev.points || 0}`;
      rightContent.appendChild(pointsSpan);

      row.appendChild(leftContent);
      row.appendChild(rightContent);
      eventList.appendChild(row);
    });
  };

  allPill.addEventListener("click", () => {
    setPillState(null);
    renderFilteredEvents(null);
  });

  categoryPills.forEach(({ pill, category }) => {
    pill.addEventListener("click", () => {
      setPillState(category);
      renderFilteredEvents(category);
    });
  });

  setPillState(null);
  renderFilteredEvents(null);
}

// --------------------------------------------------
// CATEGORY BADGES
// --------------------------------------------------
// Render category point badges beneath the member summary.
function renderCategoryBadges(member) {
  const container = document.getElementById("categoryBadges");
  if (!container) return;

  container.innerHTML = "";

  const { labels, data } = buildCategorySeries(member.categories || {});

  labels.forEach((label, index) => {
    const points = data[index] || 0;
    if (points <= 0) return;

    const color = getCategoryColor(label);
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = `${label}: ${points}`;
    badge.style.backgroundColor = `${color}20`;
    badge.style.color = color;
    badge.style.border = `1px solid ${color}40`;
    container.appendChild(badge);
  });
}

// --------------------------------------------------
// LEADERBOARD
// --------------------------------------------------
// Render podium + rank list from all members sorted by points.
function renderLeaderboard(db) {
  const container = document.getElementById("leaderboardList");
  const podium = document.getElementById("leaderboardPodium");
  const card = document.getElementById("leaderboardCard");
  if (!container || !podium || !card) return;

  container.innerHTML = "";
  podium.innerHTML = "";

  const arr = Object.values(db || {}).slice();
  arr.sort((a, b) => (b.points || 0) - (a.points || 0));
  const top = arr.slice(0, 10);

  const podiumSlots = [
    { dataIndex: 1, className: "second", rank: 2, tone: "silver" },
    { dataIndex: 0, className: "first", rank: 1, tone: "gold" },
    { dataIndex: 2, className: "third", rank: 3, tone: "bronze" }
  ];

  podiumSlots.forEach(slot => {
    const member = top[slot.dataIndex];
    if (!member) return;

    const cardEl = document.createElement("div");
    cardEl.className = `podium-card ${slot.className}`;

    const rankEl = document.createElement("span");
    rankEl.className = `leader-rank ${slot.tone}`;
    rankEl.textContent = slot.rank.toString();

    const nameEl = document.createElement("span");
    nameEl.className = "podium-name";
    nameEl.textContent = member.name || member.utsaId || "-";

    const pointsEl = document.createElement("span");
    pointsEl.className = "podium-points";
    pointsEl.textContent = `${member.points || 0} pts`;

    cardEl.appendChild(rankEl);
    cardEl.appendChild(nameEl);
    cardEl.appendChild(pointsEl);
    podium.appendChild(cardEl);
  });

  top.slice(3).forEach((member, index) => {
    const row = document.createElement("div");
    row.className = "rank-row";

    const left = document.createElement("div");
    left.className = "rank-left";

    const number = document.createElement("span");
    number.className = "rank-number";
    number.textContent = (index + 4).toString();

    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = member.name || member.utsaId || "-";

    const points = document.createElement("span");
    points.className = "rank-points";
    points.textContent = `${member.points || 0} pts`;

    left.appendChild(number);
    left.appendChild(name);
    row.appendChild(left);
    row.appendChild(points);
    container.appendChild(row);
  });

  card.style.display = top.length > 0 ? "block" : "none";
}

// --------------------------------------------------
// RENDER MEMBER
// --------------------------------------------------
// Fill the member details card and connected visual components.
function renderMember(member) {
  const card = document.getElementById("memberCard");
  if (!card) return;

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
// Boot sequence for the members dashboard page.
document.addEventListener("DOMContentLoaded", async () => {
  const utsaInput = document.getElementById("utsaIdInput");
  const lookupBtn = document.getElementById("lookupBtn");

  await loadMembersFromSheet();
  renderLeaderboard(memberDB);

  const toggleKnob = document.getElementById("chartToggleKnob");
  const toggleOptions = document.querySelectorAll(".chart-toggle-option");

  toggleOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      chartMode = opt.dataset.mode;

      if (toggleKnob) {
        toggleKnob.style.left = chartMode === "donut" ? "3px" : "107px";
      }

      toggleOptions.forEach(o => o.classList.remove("active"));
      opt.classList.add("active");

      if (currentMember) renderChartByMode(currentMember);
    });
  });

  // Lookup by myUTSA ID and refresh the card state.
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
