//main.js
// === CONFIG ===
const config = {
  dataPath: "../Data/Final_Dataset.csv",
  topoPath: "../Data/australian-states.json",
  widthMap: 600,
  heightMap: 350,
  colorRange: ["#e0f3db", "#a8ddb5", "#43a2ca", "#0868ac", "#084081"], // light to dark blue
  jurisdictions: ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"],
  jurisdictionMap: {
    // Exact names found in Australia.geojson (shapeName)
    "New South Wales": "NSW",
    "Victoria": "VIC",
    "Queensland": "QLD",
    "Western Australia": "WA",
    "South Australia": "SA",
    "Northern Territory": "NT",
    "Tasmania": "TAS",
    "Australian Capital Territory": "ACT",
    // some alternate/legacy names
    "Other Territories": null,
    "Australian Capital Territory (ACT)": "ACT",
    "New South Wales (NSW)": "NSW",
    "Victoria (VIC)": "VIC"
  }
};

// === GLOBAL STATE ===
window.rawData = [];
window.combinedByYearJur = [];
window.selectedYear = null;
window.selectedState = null;
window.selectedAgeGroup = "All";
window.selectedMetric = "Speeding_Fines"; // fixed capitalization
window.colorScale = null;

// === DOM ELEMENTS ===
const yearSelect = d3.select("#yearSelect");
const metricSelect = d3.select("#metricSelect");
const resetBtn = d3.select("#resetBtn");
const jurisdictionSelect = d3.select("#jurisdictionSelect");
const ageSelect = d3.select("#ageSelect");

// === Determine current page ===
const page = window.location.pathname.split("/").pop();

// === Load Data ===
Promise.all([
  d3.csv(config.dataPath, parseRow),
  d3.json(config.topoPath)
]).then(init);

// === Parse CSV ===
function parseRow(d) {
  return {
    YEAR: +d.YEAR,
    JURISDICTION: d.JURISDICTION,
    AGE_GROUP: d.AGE_GROUP,
    Speeding_Fines: +d["Speeding_Fines"] || 0,  // fixed typo from "Speeding_FInes"
    Total_Tests: +d["Total_Tests"] || +d["Total_Tests (Right)"] || 0,
    Cannabis_Positive: +d.Cannabis_Positive || 0,
    Cocaine_Positive: +d.Cocaine_Positive || 0,
    Meth_Positive: +d.Meth_Positive || 0
  };
}

// === Initialize ===
function init([csvData, topoJson]) {
  window.rawData = csvData;

  // Summarize per year + jurisdiction
  window.combinedByYearJur = d3.rollups(
    window.rawData,
    v => ({
      Speeding_Fines: d3.sum(v, d => d.Speeding_Fines),
      Total_Tests: d3.sum(v, d => d.Total_Tests),
      Cannabis_Positive: d3.sum(v, d => d.Cannabis_Positive),
      Cocaine_Positive: d3.sum(v, d => d.Cocaine_Positive),
      Meth_Positive: d3.sum(v, d => d.Meth_Positive)
    }),
    d => d.YEAR,
    d => d.JURISDICTION
  ).flatMap(([year, arr]) =>
    arr.map(([jur, vals]) => ({ YEAR: year, JURISDICTION: jur, ...vals }))
  );

  // Setup year dropdown if it exists
  const years = Array.from(new Set(window.rawData.map(d => d.YEAR))).sort((a, b) => a - b);
  window.selectedYear = years.at(-1);

  if (!yearSelect.empty()) {
    // If on line.html, add 'All' option
    const yearOptions = (page === 'line.html') ? ['All'].concat(years) : years;
    yearSelect.selectAll("option")
      .data(yearOptions)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);

    yearSelect.property("value", window.selectedYear);
  }

  if (!metricSelect.empty()) {
    metricSelect.property("value", window.selectedMetric);
  }

  // Populate jurisdiction select (if present)
  if (!jurisdictionSelect.empty()) {
    const opts = ["All"].concat(config.jurisdictions);
    jurisdictionSelect.selectAll("option").data(opts).enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);
    jurisdictionSelect.property("value", window.selectedState || "All");
  }

  // Populate age group select (if present)
  if (!ageSelect.empty()) {
    const ages = Array.from(new Set(window.rawData.map(d => d.AGE_GROUP))).sort();
    const opts = ["All"].concat(ages);
    ageSelect.selectAll("option").data(opts).enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);
    ageSelect.property("value", window.selectedAgeGroup);
  }

  // Generic listeners for selects (works across pages)
  if (!jurisdictionSelect.empty()) {
    jurisdictionSelect.on("change", function() {
      const v = this.value;
      window.selectedState = (v === "All") ? null : v;
      updateAll();
    });
  }

  if (!ageSelect.empty()) {
    ageSelect.on("change", function() {
      window.selectedAgeGroup = this.value || "All";
      updateAll();
    });
  }

  if (!yearSelect.empty()) {
    yearSelect.on("change", function() {
      const v = this.value;
      window.selectedYear = (v === 'All') ? null : +v;
      updateAll();
    });
  }

  updateColorScale(window.selectedMetric);

  // Page-specific logic
  switch (page) {
    case "map.html":
      // Convert TopoJSON to GeoJSON if necessary
      let geo = topoJson;
      try {
        if (geo && geo.type === 'Topology' && typeof topojson !== 'undefined') {
          const objNames = Object.keys(geo.objects || {});
          if (objNames.length > 0) {
            geo = topojson.feature(geo, geo.objects[objNames[0]]);
          } else {
            console.warn('TopoJSON has no objects; drawMap may fail');
          }
        }
      } catch (e) {
        console.warn('Failed to convert TopoJSON to GeoJSON:', e);
      }
      drawMap(geo);
      break;
    case "line.html":
      updateLineChart();
      break;
    case "bar.html":
      updateBarChart();
      break;
    case "scatter.html":
      updateScatterPlot();
      break;
  }

  highlightActiveNav();
  updateStory();
}

function updateStory() {
  const container = d3.select("#dataStoryContent");
  if (container.empty()) return;

  const year = window.selectedYear || "all years";
  const state = window.selectedState || "all jurisdictions";
  const ageGroup = window.selectedAgeGroup || "all age groups";
  const metric = window.selectedMetric || "Speeding_Fines";

  let filtered = window.rawData;
  if (window.selectedYear) filtered = filtered.filter(d => d.YEAR === window.selectedYear);
  if (window.selectedState) filtered = filtered.filter(d => d.JURISDICTION === window.selectedState);
  if (ageGroup && ageGroup !== "All") filtered = filtered.filter(d => d.AGE_GROUP === ageGroup);

  const metricValue = d3.sum(filtered, d => d[metric] || 0);
  const totalTests = d3.sum(filtered, d => d.Total_Tests || 0);
  const positives = d3.sum(filtered, d => (d.Cannabis_Positive || 0) + (d.Meth_Positive || 0) + (d.Cocaine_Positive || 0));

  const metricName = metric.replace(/_/g, " ").toLowerCase();

  let story = "";

  const page = window.location.pathname.split("/").pop();

  switch(page) {
    case "map.html":
      story = `
        For <strong>${year}</strong>, in <strong>${state}</strong>, the total <strong>${metricName}</strong> was <strong>${d3.format(",")(metricValue)}</strong>.
        Regions such as New South Wales and Victoria show higher enforcement levels, consistent with traffic density.
      `;
      break;

    case "line.html":
      story = `
        Over the years up to <strong>${year}</strong>, <strong>${metricName}</strong> and testing trends show fluctuations, with a notable recovery post-pandemic.
        Positive detections remain proportionally lower, indicating effectiveness of campaigns.
      `;
      break;

    case "bar.html":
      story = `
        Among <strong>${ageGroup}</strong> drivers in <strong>${state}</strong> for <strong>${year}</strong>, the total <strong>${metricName}</strong> is <strong>${d3.format(",")(metricValue)}</strong>.
        Younger drivers tend to have higher speeding fines, reflecting risk-taking behavior.
      `;
      break;

    case "scatter.html":
      story = `
        In <strong>${year}</strong>, higher speeding fines generally correlate with increased testing, though detection efficiency varies.
        Total positive detections were <strong>${d3.format(",")(positives)}</strong>.
      `;
      break;

    default:
      story = `
        For <strong>${year}</strong>, <strong>${state}</strong>, and age group <strong>${ageGroup}</strong>, the total <strong>${metricName}</strong> is <strong>${d3.format(",")(metricValue)}</strong>.
      `;
  }

  container.html(story);
}

// === Setup control listeners (map page) ===
function setupControls() {
  if (yearSelect.empty() || metricSelect.empty() || resetBtn.empty()) return;

  const years = Array.from(new Set(window.rawData.map(d => d.YEAR))).sort((a, b) => a - b);

  yearSelect.on("change", function() {
    window.selectedYear = +this.value;
    updateAll();
  });

  metricSelect.on("change", function() {
    window.selectedMetric = this.value;
    updateColorScale(window.selectedMetric);
    updateAll();
  });

  resetBtn.on("click", function() {
    window.selectedYear = years.at(-1);
    window.selectedMetric = "Speeding_Fines";
    window.selectedState = null;

    yearSelect.property("value", window.selectedYear);
    metricSelect.property("value", window.selectedMetric);

    updateColorScale(window.selectedMetric);
    updateAll();
  });
}

// === Color Scale ===
function updateColorScale(metric) {
  const vals = window.combinedByYearJur.map(d => d[metric]).filter(v => v != null);
  const min = d3.min(vals);
  const max = d3.max(vals);
  window.colorScale = d3.scaleQuantize().domain([min, max]).range(config.colorRange);
}

// === Helpers ===
function fmt(n) { return n ? d3.format(",")(n) : "0"; }
window.getDataByState = function(code) {
  if (!code) return null;
  if (!window.selectedYear) return null; // must select year (or handle null differently)
  return window.combinedByYearJur.find(d => d.YEAR === window.selectedYear && d.JURISDICTION === code);
};

function showTooltip(html, e) {
  const tooltip = d3.select("#tooltip");
  if (!tooltip.node()) return;
  tooltip.html(html).style("display", "block");

  let px = 0, py = 0;
  try {
    if (e && e.pageX != null) { px = e.pageX; py = e.pageY; }
    else if (e && e.clientX != null) { px = e.clientX + window.scrollX; py = e.clientY + window.scrollY; }
    else if (e && e.target && e.target.getBoundingClientRect) {
      const r = e.target.getBoundingClientRect();
      px = r.x + r.width / 2 + window.scrollX;
      py = r.y + window.scrollY;
    }
  } catch {
    px = window.scrollX + 20; py = window.scrollY + 20;
  }

  const node = tooltip.node();
  const rect = node.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = px + 12;
  let top = py - rect.height - 12;
  if (left + rect.width > window.scrollX + vw - 8) left = px - rect.width - 12;
  if (top < window.scrollY + 6) top = py + 12;

  tooltip.style("left", left + "px").style("top", top + "px");
}
function hideTooltip() {
  const tooltip = d3.select("#tooltip");
  if (!tooltip.node()) return;
  tooltip.style("display", "none");
}

// === Navbar Highlighting ===
function highlightActiveNav() {
  const mapPages = {
    "index.html": "nav-home",
    "map.html": "nav-map",
    "line.html": "nav-line",
    "bar.html": "nav-bar",
    "scatter.html": "nav-scatter"
  };
  const activeId = mapPages[page] || "nav-home";
  const activeLink = document.getElementById(activeId);
  if (activeLink) activeLink.classList.add("active");
}

// Central update helper
function updateAll() {
  switch (page) {
    case "map.html":
      updateMap();
      break;
    case "line.html":
      updateLineChart();
      break;
    case "bar.html":
      updateBarChart();
      break;
    case "scatter.html":
      updateScatterPlot();
      break;
  }
  updateStory();
}
