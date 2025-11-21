// =====================================================
//  BSC - LIVE MEMBER LOOKUP DEMO (CLEAN VERSION)
// =====================================================

// ---- LIVE CSV EXPORT FROM GOOGLE SHEETS ----
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpK_hr-oa_6Timk4lHs40Nhe0ukT5eU3jWKutavE0uumf73LgIuIbchhPjSscfvdvZZka4_QyTpgQN/pub?gid=1455140197&single=true&output=csv";

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
    const res = await fetch(SHEET_URL);
    const csv = await res.text();

    const rows = csv.split(/\r?\n/).map(r => r.split(","));
    let db = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[2]) continue;

      const first = row[0].trim();
      const last = row[1].trim();
      const id = row[2].trim().toLowerCase();
      const total = parseInt(row[3] || 0);

      db[id] = {
        utsaId: id,
        name: `${first} ${last}`,
        points: total,
        originalPoints: total,
        categories: {
          socials: parseInt(row[4] || 0),
          meetings: parseInt(row[5] || 0),
          reposts: parseInt(row[6] || 0),
          fundraiser: parseInt(row[7] || 0),
          volunteering: parseInt(row[8] || 0),
          workshops: parseInt(row[9] || 0),
          events: parseInt(row[10] || 0),
          extra: parseInt(row[11] || 0),
          committee: parseInt(row[12] || 0)
        },
        status: "Active",
        eventsList: []
      };
    }

    memberDB = db;
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

  const events = member.events || [];

  if (events.length === 0) {
    eventList.textContent = "No events recorded.";
    return;
  }

  events.forEach(ev => {
    const row = document.createElement("div");
    row.textContent = ev;
    row.style.marginBottom = "4px";
    eventList.appendChild(row);
  });

  const allPill = document.createElement("div");
  allPill.className = "event-filter-pill active";
  allPill.textContent = "All";
  filterRow.appendChild(allPill);
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
    const points = member.pointsByCategory?.[cat.key] || 0;
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
document.addEventListener("DOMContentLoaded", () => {
  const utsaInput = document.getElementById("utsaIdInput");
  const lookupBtn = document.getElementById("lookupBtn");

  loadMembersFromSheet();

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
