# Australian Road Safety Enforcement Dashboard

An interactive dashboard for exploring Australian police road safety enforcement data from 2020 to 2024. It brings together speeding fines, roadside drug and alcohol testing, and positive drug detections so patterns can be compared across states, years, and age groups.

## Dashboard

The dashboard includes:

- **Map:** Compare enforcement measures across Australian states.
- **Trends:** Explore changes over time and across jurisdictions.
- **Age groups:** Compare measures between age categories.
- **Correlation:** Examine speeding fines and roadside testing, with positive detections represented by bubble size.
- **Data:** Review processing notes and download the datasets, KNIME workflow, and chart images.

## Run locally

Serve the repository root with a local web server so the browser can load the CSV and JSON files. For example, with Python installed, run this from the repository root:

```powershell
py -m http.server 8000
```

Then open [http://localhost:8000/html/index.html](http://localhost:8000/html/index.html). The visualisations use D3.js and TopoJSON from public CDNs, so an internet connection is needed to load those libraries.

## Data

`Data/Final_Dataset.csv` is the processed dataset used by the visualisations. The `Data/` directory also contains the Australian state boundaries, source data files, and the KNIME workflow used in the data preparation process. The dashboard's Data page provides download links and additional processing details.

## Project structure

```text
Data/       Processed and source datasets, state boundaries, KNIME workflow
html/       Dashboard pages
img/        Chart image exports
js/         Dashboard and visualisation logic
styles.css  Shared page styles
README.md   Project documentation
```

## Built with

- HTML, CSS, and JavaScript
- D3.js v7
- TopoJSON Client v3
