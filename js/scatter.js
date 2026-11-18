// Declare selectedState globally or at module level to be accessible inside updateScatterPlot
let selectedState = null;

document.addEventListener("DOMContentLoaded", () => {
  // Reset selectedState to null to ignore any external selections (show default filter)
  selectedState = null;

  // Call update function to draw chart on load
  updateScatterPlot();
});

function updateScatterPlot() {
  const container = d3.select("#scatterPlot");
  container.selectAll("*").remove();

  // Update title based on selected year
  const titleEl = d3.select('.vis .card-title');
  if (!titleEl.empty()) {
    titleEl.text(`Speeding vs Testing — ${selectedYear}`);
  }

  const width = container.node().clientWidth || 900;
  const height = 230; // increased height to match others
  const margin = { top: 20, right: 20, bottom: 60, left: 85 }; // wider left margin

  // Filter data for selected year
  const filtered = combinedByYearJur.filter(d => d.YEAR === selectedYear);

  // Safeguard against empty data or zero max values
  const maxSpeedingFines = d3.max(filtered, d => d.Speeding_Fines) || 1;
  const maxTotalTests = d3.max(filtered, d => d.Total_Tests) || 1;
  const maxPositives = d3.max(filtered, d => d.Cannabis_Positive + d.Meth_Positive + d.Cocaine_Positive) || 1;

  // Scales
  const x = d3.scaleLinear()
    .domain([0, maxSpeedingFines * 1.1])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, maxTotalTests * 1.1])
    .range([height - margin.bottom, margin.top]);

  const size = d3.scaleSqrt()
    .domain([0, maxPositives])
    .range([4, 25]);

  const stateColorScale = d3.scaleOrdinal()
    .domain(config.jurisdictions)
    .range(d3.schemeTableau10);

  // SVG container
  const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Speeding Fines");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 12)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Total Tests");

  // Circles
  svg.selectAll("circle")
    .data(filtered)
    .enter().append("circle")
    .attr("cx", d => x(d.Speeding_Fines))
    .attr("cy", d => y(d.Total_Tests))
    .attr("r", d => size(d.Cannabis_Positive + d.Meth_Positive + d.Cocaine_Positive))
    .attr("fill", d =>
      selectedState === d.JURISDICTION
        ? "#ff7f0e"
        : stateColorScale(d.JURISDICTION)
    )
    .attr("stroke", d =>
      selectedState === d.JURISDICTION ? "#000" : "none"
    )
    .attr("opacity", d =>
      selectedState && selectedState !== d.JURISDICTION ? 0.3 : 1
    )
    .on("mouseover", (e, d) =>
      showTooltip(
        `${d.JURISDICTION}<br>Speeding Fines: ${fmt(d.Speeding_Fines)}<br>Total Tests: ${fmt(d.Total_Tests)}<br>Positive Detections: ${fmt(d.Cannabis_Positive + d.Meth_Positive + d.Cocaine_Positive)}`,
        e
      )
    )
    .on("mousemove", (e, d) =>
      showTooltip(
        `${d.JURISDICTION}<br>Speeding Fines: ${fmt(d.Speeding_Fines)}<br>Total Tests: ${fmt(d.Total_Tests)}<br>Positive Detections: ${fmt(d.Cannabis_Positive + d.Meth_Positive + d.Cocaine_Positive)}`,
        e
      )
    )
    .on("mouseout", hideTooltip)
    .on("click", (e, d) => {
      onStateClick(d.JURISDICTION);
    });

  // Labels on circles
  svg.selectAll(".label")
    .data(filtered)
    .enter()
    .append("text")
    .attr("x", d => x(d.Speeding_Fines))
    .attr("y", d => y(d.Total_Tests) - size(d.Cannabis_Positive + d.Meth_Positive + d.Cocaine_Positive) - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .text(d => d.JURISDICTION);
}
