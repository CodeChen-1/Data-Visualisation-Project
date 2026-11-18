const width = 800;
const height = 600;

let currentTransform = d3.zoomIdentity;
let zoomBehavior;

let path; // global for geoPath

function formatNumber(val) {
  if (val == null || isNaN(val)) return "N/A";
  if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
  if (val >= 1e3) return (val / 1e3).toFixed(1) + "K";
  return val.toString();
}

function featureName(feature) {
  if (!feature || !feature.properties) return null;
  const p = feature.properties;
  const candidates = [p.shapeName, p.STATE_NAME, p.NAME, p.SHAPE_NAME, p.shapename, p.state_name];
  for (let c of candidates) {
    if (c && String(c).trim()) return String(c).trim();
  }
  return null;
}

function mapNameToCode(name) {
  if (!name) return null;
  const n = String(name).trim();
  const jurisdictions = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
  if (jurisdictions.includes(n)) return n;

  const explicit = {
    "New South Wales": "NSW",
    "New South Wales (Mainland)": "NSW",
    "New South Wales (Island)": "NSW",
    "Victoria": "VIC",
    "Queensland": "QLD",
    "Western Australia": "WA",
    "South Australia": "SA",
    "Northern Territory": "NT",
    "Tasmania": "TAS",
    "Australian Capital Territory": "ACT",
    "Australian Capital Territory (ACT)": "ACT",
  };
  if (explicit[n]) return explicit[n];

  const lower = n.toLowerCase();
  if (lower.includes("wales")) return "NSW";
  if (lower.includes("victoria")) return "VIC";
  if (lower.includes("queensland")) return "QLD";
  if (lower.includes("western")) return "WA";
  if (lower.includes("south")) return "SA";
  if (lower.includes("northern")) return "NT";
  if (lower.includes("tasmania")) return "TAS";
  if (lower.includes("capital")) return "ACT";

  return null;
}

function mapFeatureToCode(feature) {
  if (!feature || !feature.properties) return null;
  const p = feature.properties;

  if (p.STATE_CODE != null) {
    const map = {
      "1": "NSW",
      "2": "VIC",
      "3": "QLD",
      "4": "SA",
      "5": "WA",
      "6": "TAS",
      "7": "NT",
      "8": "ACT"
    };
    const key = String(p.STATE_CODE).trim();
    if (map[key]) return map[key];
  }

  return mapNameToCode(featureName(feature));
}

function getStateData(code) {
  if (!code) return null;
  return window.getDataByState ? window.getDataByState(code) : null;
}

function getStateColor(feature) {
  const code = mapFeatureToCode(feature);
  if (!code) return "#dceefb";

  const ddata = getStateData(code);
  if (!ddata) return "#dceefb";

  const val = ddata[window.selectedMetric] || 0;

  if (window.selectedState === code) {
    // Darken selected state color
    if (typeof window.colorScale === "function") {
      return d3.color(window.colorScale(val)).darker(1.3).formatHex();
    }
    return "#555555"; // fallback darker color
  }

  if (typeof window.colorScale !== "function") return "#dceefb";

  return window.colorScale(val);
}

function showTooltip(html, event) {
  d3.select("#tooltip")
    .style("display", "block")
    .html(html)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY + 15) + "px");
}

function hideTooltip() {
  d3.select("#tooltip").style("display", "none");
}

function drawMap(geoJson) {
  if (!d3.select("#map").node()) return;

  d3.select("#map").selectAll("svg").remove();

  const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g");

  const projection = d3.geoMercator()
    .fitSize([width, height], geoJson);

  path = d3.geoPath(projection);

  g.selectAll("path")
    .data(geoJson.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => getStateColor(d))
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget).attr("stroke-width", 2);
      const code = mapFeatureToCode(d);
      const ddata = getStateData(code);
      const totalTests = ddata ? ddata.Total_Tests : null;
      const totalPositive = ddata ? ((ddata.Cannabis_Positive || 0) + (ddata.Cocaine_Positive || 0) + (ddata.Meth_Positive || 0)) : null;

      const html = `<strong>${d.properties.STATE_NAME || code}</strong><br>
                    Speeding Fines: ${formatNumber(ddata ? ddata.Speeding_Fines : null)}<br>
                    Total Tests: ${formatNumber(totalTests)}<br>
                    Total Positive: ${formatNumber(totalPositive)}`;
      showTooltip(html, event);
    })
    .on("mousemove", event => {
      d3.select("#tooltip")
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY + 15) + "px");
    })
    .on("mouseout", (event) => {
      d3.select(event.currentTarget).attr("stroke-width", 1);
      hideTooltip();
    })
    .on("click", (event, d) => {
      const clickedStateCode = mapFeatureToCode(d);
      if (!clickedStateCode) return;

      if (window.selectedState === clickedStateCode) {
        // Toggle off selection if same state clicked
        window.selectedState = null;
      } else {
        window.selectedState = clickedStateCode;
      }

      // Update dropdown if exists
      const jurisdictionSelect = document.getElementById("jurisdictionSelect");
      if (jurisdictionSelect) {
        jurisdictionSelect.value = window.selectedState || "";
      }

      updateMapColors();

      if (typeof window.updateAll === "function") {
        window.updateAll();
      }
    });

  addStateLabels(g, geoJson.features);

  zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      currentTransform = event.transform;
    });

  svg.call(zoomBehavior);

  drawLegend();
}

function updateMapColors() {
  d3.select("#map").selectAll("path")
    .attr("fill", d => getStateColor(d));
}

function addStateLabels(g, features) {
  g.selectAll(".state-label").remove();

  g.selectAll(".state-label")
    .data(features)
    .join("text")
    .attr("class", "state-label")
    .attr("pointer-events", "none")
    .attr("dy", "0.35em")
    .style("font-weight", "bold")
    .style("fill", "#222")
    .style("text-shadow", "0 0 2px #fff")
    .text(d => mapFeatureToCode(d) || "")
    .attr("transform", d => {
      const centroid = path.centroid(d);
      return `translate(${centroid[0]},${centroid[1]})`;
    });
}

function updateStateLabelVisibility() {
  d3.selectAll(".state-label").style("display", "block");
}

function drawLegend() {
  if (!window.colorScale || typeof window.colorScale.domain !== "function") return;

  const legend = d3.select("#mapLegend");
  legend.html("");

  const domain = window.colorScale.domain();
  const minVal = domain[0];
  const maxVal = domain[domain.length - 1];

  const legendWidth = 300;
  const legendHeight = 15;

  const svgLegend = legend.append("svg")
    .attr("width", legendWidth)
    .attr("height", 50);

  const defs = svgLegend.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "legend-gradient");

  const nStops = 10;
  const stopStep = 1 / (nStops - 1);
  for (let i = 0; i < nStops; i++) {
    gradient.append("stop")
      .attr("offset", `${stopStep * i * 100}%`)
      .attr("stop-color", window.colorScale(minVal + (maxVal - minVal) * stopStep * i));
  }

  svgLegend.append("rect")
    .attr("x", 0)
    .attr("y", 10)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")
    .style("stroke", "#ccc")
    .style("stroke-width", 1);

  const xScale = d3.scaleLinear()
    .domain([minVal, maxVal])
    .range([0, legendWidth]);

  const tickValues = xScale.ticks(5);

  const axis = d3.axisBottom(xScale)
    .tickValues(tickValues)
    .tickFormat(formatNumber)
    .tickSizeOuter(0);

  svgLegend.append("g")
    .attr("transform", `translate(0, ${10 + legendHeight})`)
    .call(axis);
}

function updateMap() {
  updateMapColors();
  drawLegend();
  updateStateLabelVisibility();
}

window.drawMap = drawMap;
window.updateMap = updateMap;
window.getStateColor = getStateColor;
window.mapFeatureToCode = mapFeatureToCode;
