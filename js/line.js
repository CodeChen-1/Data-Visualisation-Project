// line.js
document.addEventListener("DOMContentLoaded", () => {
  // Wait until main.js data is ready
  const selectedState = null;
  if (typeof combinedByYearJur === "undefined" || combinedByYearJur.length === 0) {
    const check = setInterval(() => {
      if (typeof combinedByYearJur !== "undefined" && combinedByYearJur.length > 0) {
        clearInterval(check);
        updateLineChart();
      }
    }, 200);
  } else {
    updateLineChart();
  }
});

function updateLineChart() {
  const container = d3.select("#lineChart");
  if (container.empty()) return;

  // Update chart title based on selected jurisdiction
  const titleEl = d3.select('.vis .card-title');
  if (!titleEl.empty()) {
    const t = selectedState ? `Trends — ${selectedState}` : `Trends — All Jurisdictions`;
    titleEl.text(t);
  }

  container.selectAll("*").remove();

  const margin = { top: 30, right: 120, bottom: 50, left: 100 };
  const width = container.node().clientWidth || 600;
  const height = 350;

  const metric = selectedMetric; // use global selectedMetric from main.js

  let dataToUse = combinedByYearJur;
  if (selectedState) {
    dataToUse = dataToUse.filter(d => d.JURISDICTION === selectedState);
  }

  const ymax = d3.max(dataToUse, d => d[metric]) || 1;

  // Set scales
  const x = d3.scaleLinear()
    .domain(d3.extent(combinedByYearJur, d => d.YEAR))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, ymax * 1.1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Line generator
  const line = d3.line()
    .x(d => x(d.YEAR))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // Group data by jurisdiction, map to year-value pairs
  const series = d3.rollups(
    dataToUse,
    v => v.map(d => ({ YEAR: d.YEAR, value: d[metric] })),
    d => d.JURISDICTION
  );

  // Create SVG
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "auto");

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text(metric.replace(/_/g, " "));

  // Draw lines
  svg.selectAll(".line")
    .data(series)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", (d, i) => selectedState ? "#ff7f0e" : d3.schemeTableau10[i % 10])
    .attr("stroke-width", selectedState ? 2.5 : 1.5)
    .attr("d", d => line(d[1]));

  // Add point markers + tooltips for interactivity
  // Flatten series into points: {jur, YEAR, value}
  const points = series.flatMap(([jur, arr]) => arr.map(p => ({ JURISDICTION: jur, YEAR: p.YEAR, value: p.value })));

  svg.selectAll('.point')
    .data(points)
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('cx', d => x(d.YEAR))
    .attr('cy', d => y(d.value))
    .attr('r', 3.5)
    .attr('fill', d => selectedState ? (d.JURISDICTION === selectedState ? '#ff7f0e' : '#ddd') : d3.schemeTableau10[config.jurisdictions.indexOf(d.JURISDICTION) % 10])
    .attr('opacity', d => (selectedState && selectedState !== d.JURISDICTION) ? 0.35 : 1)
    .on('mouseover', (e, d) => {
      const rec = combinedByYearJur.find(r => r.JURISDICTION === d.JURISDICTION && r.YEAR === d.YEAR) || {};
      const html = `<b>${d.JURISDICTION}</b><br>Year: ${d.YEAR}<br>${metric.replace(/_/g, ' ')}: ${fmt(d.value)}<br>Total Tests: ${fmt(rec.Total_Tests)}<br>Positives: ${fmt((rec.Cannabis_Positive||0)+(rec.Meth_Positive||0)+(rec.Cocaine_Positive||0))}`;
      showTooltip(html, e);
    })
    .on('mousemove', (e, d) => {
      const rec = combinedByYearJur.find(r => r.JURISDICTION === d.JURISDICTION && r.YEAR === d.YEAR) || {};
      const html = `<b>${d.JURISDICTION}</b><br>Year: ${d.YEAR}<br>${metric.replace(/_/g, ' ')}: ${fmt(d.value)}<br>Total Tests: ${fmt(rec.Total_Tests)}<br>Positives: ${fmt((rec.Cannabis_Positive||0)+(rec.Meth_Positive||0)+(rec.Cocaine_Positive||0))}`;
      showTooltip(html, e);
    })
    .on('mouseout', hideTooltip);

  // Legend for all states
  if (!selectedState) {
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    series.forEach(([jur, _], i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 18)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d3.schemeTableau10[i % 10]);

      legend.append("text")
        .attr("x", 18)
        .attr("y", i * 18 + 10)
        .attr("font-size", "12px")
        .text(jur);
    });
  }
}
