
async function fetchSvgFromPage(pagePath) {
  try {
    const res = await fetch(pagePath);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const svg = doc.querySelector('svg');
    if (!svg) throw new Error('No <svg> found on page: ' + pagePath);
    return svg.outerHTML;
  } catch (err) {
    alert('Error fetching SVG: ' + err.message);
    throw err;
  }
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function downloadSvgString(svgString, filename='chart.svg'){
  downloadBlob(svgString, filename, 'image/svg+xml;charset=utf-8');
}

async function exportSvgFromPage(pagePath, filename){
  const svg = await fetchSvgFromPage(pagePath);
  downloadSvgString(svg, filename);
}

// New helper to download fixed images
function downloadImage(imageUrl, filename) {
  fetch(imageUrl)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      alert('Error downloading image: ' + err.message);
    });
}

// Updated event listeners to download fixed images instead of exporting SVG
document.addEventListener('DOMContentLoaded', () => {
  const mapBtn = document.getElementById('downloadMap');
  const lineBtn = document.getElementById('downloadLine');
  const barBtn = document.getElementById('downloadBar');
  const scatterBtn = document.getElementById('downloadScatter');

  if (mapBtn) mapBtn.addEventListener('click', () => downloadImage('../img/Choropleth.png', 'Choropleth.png'));
  if (lineBtn) lineBtn.addEventListener('click', () => downloadImage('../img/Line.png', 'Line.png'));
  if (barBtn) barBtn.addEventListener('click', () => downloadImage('../img/Bar.png', 'Bar.png'));
  if (scatterBtn) scatterBtn.addEventListener('click', () => downloadImage('../img/Scatter.png', 'Scatter.png'));
});
