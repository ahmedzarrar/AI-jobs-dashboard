# AI Impact on Jobs 2030 — Interactive D3.js Dashboard
### DSC327 · Data Visualization Techniques · BDS 6

## Live Demo
🔗 [View Dashboard](https://ahmedzarrar.github.io/AI-jobs-dashboard/)

---

## Project Overview
An interactive web-based visualization dashboard exploring how AI is reshaping 
the workforce by 2030. Built with D3.js v7, the dashboard analyzes 3,000 job 
profiles across 10 industries and 10 countries — covering automation risk, 
salary trends, hiring outlooks, and future demand scores.

---

## Dataset
- **Name:** AI Impact on Jobs 2030  
- **Records:** 3,000 employees  
- **Features:** 20 columns including AI Replacement Risk, Future Demand Score,
  Average Salary, Job Growth 2030, Automation Level, and more  
- **File:** `data/AI_Impact_on_Jobs_2030.csv`

---

## Visualizations
| # | Chart | Insight |
|---|-------|---------|
| 1 | Donut Chart | AI Replacement Risk distribution |
| 2 | Horizontal Bar | Avg AI Risk by Industry |
| 3 | Scatter Plot | Salary vs AI Risk (zoom + pan) |
| 4 | Grouped Bar | Salary by Education Level |
| 5 | Box Plot | Job Growth 2030 by Hiring Trend |
| 6 | Stacked Bar | Upskilling Need by Automation Level |
| 7 | Heatmap | Avg Salary — Education × Remote Work |
| 8 | Box Plot | Job Satisfaction by Remote Work Type |
| 9 | Bubble Chart | Experience vs Future Demand |
| 10 | Dual-Axis Chart | AI Risk & Job Growth by Country |

---

## Interaction Features
- **6 Filter Dropdowns** — Industry, Country, Education, Automation Level, Remote Work, Hiring Trend
- **Tooltips** — Hover on any chart element for detailed stats
- **Zoom & Pan** — Available on the Scatter Plot
- **Reset Button** — Clears all filters instantly
- **Responsive** — Redraws on window resize
- **Animated** — Smooth transitions on load and filter change

---

## How to Run Locally

### Option 1 — Node.js (recommended)
```bash
npx serve .
```
Then open `http://localhost:3000`

### Option 2 — VS Code
Install the **Live Server** extension → right-click `index.html` → Open with Live Server

### Option 3 — Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`

> ⚠️ Do not open index.html directly in the browser (file://) — the CSV will not load due to CORS restrictions.

---

## Tech Stack
- **D3.js v7** — All visualizations
- **Vanilla JavaScript (ES6)** — Logic and interactivity
- **CSS3** — Dark theme with CSS variables
- **Google Fonts** — Space Grotesk + DM Mono

---

## Project Structure
ai-jobs-dashboard/

├── index.html        # Main HTML layout

├── script.js         # All D3.js chart logic (855 lines)

├── style.css         # Dashboard styling

├── README.md         # This file

└── data/

└── AI_Impact_on_Jobs_2030.csv

---

## Team
| Name | Student ID |
|------|-----------|
| Ahmad Zarrar | FA23-BDS-002 |
| Hashim Nabi | FA23-BDS-060 |

**Course:** DSC327 — Data Visualization Techniques  
**Instructor:** Ma'am Shaneela Naz  
**Due Date:** 17 June 2026
