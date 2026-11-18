// bar.js
document.addEventListener("DOMContentLoaded", () => {
  // Wait for main.js to load data
  const selectedState = null;
  if (typeof rawData === "undefined" || rawData.length === 0) {
    // Retry until main.js data is ready
    const check = setInterval(() => {
      if (typeof rawData !== "undefined" && rawData.length > 0) {
        clearInterval(check);
        updateBarChart();
      }
    }, 200);
  } else {
    updateBarChart();
  }
}); 

function updateBarChart() {
  const container = d3.select("#barChart");
  if (container.empty()) return; // safety check

  // Update chart title based on selected filters
  const titleEl = d3.select('.vis .card-title');
  if (!titleEl.empty()) {
    // Build a combined title that reflects both filters when present
    const parts = [];
    if (selectedAgeGroup && selectedAgeGroup !== 'All') parts.push(`Age: ${selectedAgeGroup}`);
    if (selectedState) parts.push(`Jurisdiction: ${selectedState}`);
    const t = parts.length ? parts.join(' — ') : 'Age Groups — All Jurisdictions';
    titleEl.text(t);
  }

  container.selectAll("*").remove();

  const width = container.node().clientWidth || 400;
  const height = 350;
  const margin = { top: 30, right: 20, bottom: 80, left: 80 };

  const metric = selectedMetric;
  const year = selectedYear;
  let filtered = rawData.filter(d => d.YEAR === year);
  if (selectedState) filtered = filtered.filter(d => d.JURISDICTION === selectedState);

  let groupAgg;
  if (selectedAgeGroup && selectedAgeGroup !== 'All') {
    // Show values by jurisdiction for the selected age group
    const byJur = filtered.filter(d => d.AGE_GROUP === selectedAgeGroup);
    groupAgg = d3.rollups(byJur, v => d3.sum(v, d => d[metric]), d => d.JURISDICTION)
      .map(([jur, value]) => ({ age: jur, value }));
  } else {
    // Aggregate by age group
    groupAgg = d3.rollups(
      filtered,
      v => d3.sum(v, d => d[metric]),
      d => d.AGE_GROUP
    ).map(([age, value]) => ({ age, value }));
  }

  const x = d3.scaleBand()
    .domain(groupAgg.map(d => d.age))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, (d3.max(groupAgg, d => d.value) || 1) * 1.1])
    .range([height - margin.bottom, margin.top]);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "auto");

  // Bars
  svg.selectAll(".bar")
    .data(groupAgg)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.age))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.value))
    .attr("fill", "#1f77b4")
    .on("mouseover", function(e, d) {
      const html = makeBarTooltip(d);
      showTooltip(html, e);
    })
    .on("mousemove", function(e, d) {
      const html = makeBarTooltip(d);
      showTooltip(html, e);
    })
    .on("mouseout", hideTooltip);

  // helper to aggregate additional stats for tooltip
  function aggregateForKey(key) {
    const metric = selectedMetric;
    const year = selectedYear;
    let rows = rawData.filter(r => r.YEAR === year);
    if (selectedAgeGroup && selectedAgeGroup !== 'All') {
      // bars are by jurisdiction in this mode
      rows = rows.filter(r => r.AGE_GROUP === selectedAgeGroup && r.JURISDICTION === key);
    } else {
      // bars are by age group
      rows = rows.filter(r => r.AGE_GROUP === key);
      if (selectedState) rows = rows.filter(r => r.JURISDICTION === selectedState);
    }
    return {
      metricValue: d3.sum(rows, r => r[metric] || 0),
      totalTests: d3.sum(rows, r => r.Total_Tests || 0),
      positives: d3.sum(rows, r => (r.Cannabis_Positive || 0) + (r.Meth_Positive || 0) + (r.Cocaine_Positive || 0)),
      rowsCount: rows.length
    };
  }

  function makeBarTooltip(d) {
    const label = (selectedAgeGroup && selectedAgeGroup !== 'All') ? `Jurisdiction: ${d.age}` : `Age Group: ${d.age}`;
    const agg = aggregateForKey(d.age);
    const metricName = selectedMetric.replace(/_/g, ' ');
    return `<b>${label}</b><br>Year: ${selectedYear}<br>${metricName}: ${fmt(agg.metricValue)}<br>Total Tests: ${fmt(agg.totalTests)}<br>Positives: ${fmt(agg.positives)}`;
  }

  // X-axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .style("font-size", "12px");

  // Y-axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // X-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text(selectedAgeGroup && selectedAgeGroup !== 'All' ? 'Jurisdiction' : 'Age Group');

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text(metric.replace(/_/g, " "));
}
