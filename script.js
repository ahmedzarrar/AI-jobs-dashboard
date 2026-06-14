/* ═══════════════════════════════════════════════════════════════════════════
   AI Impact on Jobs 2030 — D3.js Dashboard  v2
   DSC327 · Data Visualization Techniques · BDS 6
   ═══════════════════════════════════════════════════════════════════════════ */
"use strict";

// ── Globals ────────────────────────────────────────────────────────────────
const tooltip = d3.select("#tooltip");
let RAW = [], DATA = [];

const RISK_COLOR = d3.scaleThreshold()
  .domain([0.33, 0.66])
  .range(["#00d4aa","#ffd166","#ff6b6b"]);

const EDU_ORDER  = ["High School","Bachelor's","Master's","PhD"];
const AUTO_ORDER = ["None","Low","Medium","High","Full"];

const AUTO_PAL = {
  "None":"#74b9ff","Low":"#00d4aa","Medium":"#ffd166","High":"#ff9f43","Full":"#ff6b6b"
};

const fmt   = d3.format(",");
const fmtK  = v => `$${d3.format(",.0f")(v/1000)}k`;
const fmtP  = d3.format(".0%");
const fmtP2 = d3.format(".1%");
const fmtN  = d3.format(".2f");

// ── Tooltip ────────────────────────────────────────────────────────────────
function tip(html, ev) {
  tooltip.style("opacity",1).html(html);
  moveTip(ev);
}
function moveTip(ev) {
  const x=ev.clientX, y=ev.clientY, tw=240, th=130;
  tooltip
    .style("left",(x+14+tw>window.innerWidth ? x-tw-14 : x+14)+"px")
    .style("top", (y+14+th>window.innerHeight? y-th-14 : y+14)+"px");
}
function hideTip() { tooltip.style("opacity",0); }

// ── Get chart container size ───────────────────────────────────────────────
function sz(wrapId) {
  const el = document.getElementById(wrapId);
  return { w: el.clientWidth || 600, h: el.clientHeight || 280 };
}
function clr(wrapId) { d3.select("#"+wrapId).selectAll("*").remove(); }
function noData(wrapId) {
  clr(wrapId);
  d3.select("#"+wrapId).append("div").attr("class","no-data")
    .text("No data for current filters.");
}

// ── Box stats ──────────────────────────────────────────────────────────────
function boxStats(arr) {
  const s = arr.slice().sort(d3.ascending);
  return {
    min: d3.min(s), max: d3.max(s), mean: d3.mean(s),
    q1: d3.quantile(s,0.25), median: d3.quantile(s,0.5), q3: d3.quantile(s,0.75)
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. DONUT
   ═══════════════════════════════════════════════════════════════════════════ */
function drawDonut() {
  clr("chart-donut");
  d3.select("#legend-donut").html("");
  if (!DATA.length) { noData("chart-donut"); return; }

  const cats  = ["Low Risk","Medium Risk","High Risk"];
  const rcat  = d => d.AI_Replacement_Risk < 0.33 ? "Low Risk"
                   : d.AI_Replacement_Risk < 0.66 ? "Medium Risk" : "High Risk";
  const cnt   = d3.rollup(DATA, v=>v.length, rcat);
  const pdata = cats.map(c=>({ label:c, value: cnt.get(c)||0 }));

  const { w, h } = sz("chart-donut");
  const radius   = Math.min(w, h) / 2 - 14;
  const col      = d3.scaleOrdinal().domain(cats).range(["#00d4aa","#ffd166","#ff6b6b"]);

  const svg = d3.select("#chart-donut").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${w/2},${h/2})`);

  const pie  = d3.pie().value(d=>d.value).sort(null).padAngle(0.03);
  const arc  = d3.arc().innerRadius(radius*0.56).outerRadius(radius);
  const arcH = d3.arc().innerRadius(radius*0.56).outerRadius(radius+8);

  svg.selectAll("path").data(pie(pdata)).join("path")
    .attr("fill", d=>col(d.data.label))
    .style("cursor","pointer")
    .on("mouseover", function(ev,d) {
      d3.select(this).transition().duration(150).attr("d",arcH);
      tip(`<strong>${d.data.label}</strong>${fmt(d.data.value)} jobs<br>${fmtP2(d.data.value/DATA.length)} of total`,ev);
    })
    .on("mousemove",moveTip).on("mouseout",function(){
      d3.select(this).transition().duration(150).attr("d",arc); hideTip();
    })
    .transition().duration(750)
    .attrTween("d", function(d){
      const i = d3.interpolate({startAngle:d.startAngle,endAngle:d.startAngle},d);
      return t=>arc(i(t));
    });

  svg.append("text").attr("text-anchor","middle").attr("y",-10)
    .style("fill","#e6edf3").style("font-size","26px").style("font-weight","700")
    .text(fmt(DATA.length));
  svg.append("text").attr("text-anchor","middle").attr("y",14)
    .style("fill","#8b949e").style("font-size","12px").text("total jobs");

  // Legend
  const leg = d3.select("#legend-donut");
  cats.forEach(c => {
    const item = leg.append("div").attr("class","legend-item");
    item.append("div").attr("class","legend-dot").style("background",col(c));
    item.append("span").text(`${c} (${fmt(cnt.get(c)||0)})`);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. HORIZONTAL BAR — Avg AI Risk by Industry
   ═══════════════════════════════════════════════════════════════════════════ */
function drawIndustryBar() {
  clr("chart-industry");
  if (!DATA.length) { noData("chart-industry"); return; }

  const byInd = d3.rollup(DATA, v=>d3.mean(v,d=>d.AI_Replacement_Risk), d=>d.Industry);
  const rows  = Array.from(byInd,([k,v])=>({industry:k,risk:v}))
    .sort((a,b)=>b.risk-a.risk).slice(0,12);

  const { w, h } = sz("chart-industry");
  const mg = { top:10, right:65, bottom:30, left:145 };
  const iw = w - mg.left - mg.right;
  const ih = h - mg.top  - mg.bottom;

  const svg = d3.select("#chart-industry").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x = d3.scaleLinear().domain([0,1]).range([0,iw]);
  const y = d3.scaleBand().domain(rows.map(d=>d.industry)).range([0,ih]).padding(0.3);

  // grid
  svg.append("g").attr("class","grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  // bars
  svg.selectAll("rect").data(rows).join("rect")
    .attr("y",d=>y(d.industry)).attr("height",y.bandwidth())
    .attr("rx",5).attr("fill",d=>RISK_COLOR(d.risk))
    .attr("x",0).attr("width",0)
    .style("cursor","pointer")
    .on("mouseover",(ev,d)=>tip(`<strong>${d.industry}</strong>Avg AI Risk: ${fmtN(d.risk)}<br>Jobs in filter: ${fmt(DATA.filter(r=>r.Industry===d.industry).length)}`,ev))
    .on("mousemove",moveTip).on("mouseout",hideTip)
    .transition().duration(600).delay((_,i)=>i*35)
    .attr("width",d=>x(d.risk));

  // value labels
  svg.selectAll(".vlb").data(rows).join("text").attr("class","vlb")
    .attr("y",d=>y(d.industry)+y.bandwidth()/2+4)
    .attr("x",d=>x(d.risk)+6)
    .attr("fill","#8b949e").attr("font-size",11)
    .text(d=>fmtN(d.risk));

  // axes
  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9").attr("font-size",11);

  svg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>fmtP(d)))
    .call(g=>g.select(".domain").remove());
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. SCATTER + ZOOM — Salary vs AI Risk
   ═══════════════════════════════════════════════════════════════════════════ */
function drawScatter() {
  clr("chart-scatter");
  if (!DATA.length) { noData("chart-scatter"); return; }

  const { w, h } = sz("chart-scatter");
  const mg = { top:20, right:170, bottom:55, left:75 };
  const iw = w - mg.left - mg.right;
  const ih = h - mg.top  - mg.bottom;

  const svg = d3.select("#chart-scatter").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`);

  svg.append("defs").append("clipPath").attr("id","sc-clip")
    .append("rect").attr("width",iw).attr("height",ih);

  const g = svg.append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const salExt = d3.extent(DATA, d=>d.Average_Salary_USD);
  const x = d3.scaleLinear().domain([0,1]).range([0,iw]);
  const y = d3.scaleLinear().domain([salExt[0]*0.94, salExt[1]*1.03]).range([ih,0]);

  // grid
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(""))
    .call(gg=>gg.select(".domain").remove());
  g.append("g").attr("class","grid")
    .attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(-ih).tickFormat(""))
    .call(gg=>gg.select(".domain").remove());

  const xA = g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d=>fmtP(d)));
  xA.select(".domain").remove();

  const yA = g.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat(fmtK));
  yA.select(".domain").remove();

  // axis labels
  g.append("text").attr("x",iw/2).attr("y",ih+46)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",12)
    .text("AI Replacement Risk →");
  g.append("text").attr("transform","rotate(-90)")
    .attr("x",-ih/2).attr("y",-58)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",12)
    .text("Annual Salary (USD) →");

  const dotsG = g.append("g").attr("clip-path","url(#sc-clip)");
  const sample = DATA.length > 1000 ? d3.shuffle(DATA.slice()).slice(0,1000) : DATA;

  const dots = dotsG.selectAll("circle").data(sample).join("circle")
    .attr("cx",d=>x(d.AI_Replacement_Risk))
    .attr("cy",d=>y(d.Average_Salary_USD))
    .attr("r",4.5).attr("fill",d=>AUTO_PAL[d.Automation_Level]||"#74b9ff")
    .attr("opacity",0.65).attr("stroke","none")
    .style("cursor","pointer")
    .on("mouseover",function(ev,d){
      d3.select(this).raise().attr("r",8).attr("opacity",1)
        .attr("stroke","#fff").attr("stroke-width",1.5);
      tip(`<strong>${d.Job_Title}</strong>Industry: ${d.Industry}<br>Salary: ${fmtK(d.Average_Salary_USD)}<br>AI Risk: ${fmtN(d.AI_Replacement_Risk)}<br>Automation: ${d.Automation_Level}<br>Country: ${d.Country}`,ev);
    })
    .on("mousemove",moveTip)
    .on("mouseout",function(){
      d3.select(this).attr("r",4.5).attr("opacity",0.65).attr("stroke","none"); hideTip();
    });

  // zoom
  const zoom = d3.zoom().scaleExtent([0.5,20])
    .on("zoom",ev=>{
      const xt=ev.transform.rescaleX(x), yt=ev.transform.rescaleY(y);
      dots.attr("cx",d=>xt(d.AI_Replacement_Risk)).attr("cy",d=>yt(d.Average_Salary_USD));
      xA.call(d3.axisBottom(xt).ticks(8).tickFormat(d=>fmtP(d))); xA.select(".domain").remove();
      yA.call(d3.axisLeft(yt).ticks(6).tickFormat(fmtK));          yA.select(".domain").remove();
    });
  svg.call(zoom);

  // automation legend
  const legG = svg.append("g").attr("transform",`translate(${w-mg.right+18},${mg.top+10})`);
  legG.append("text").attr("fill","#8b949e").attr("font-size",11).attr("font-weight","600")
    .text("Automation Level");
  Object.entries(AUTO_PAL).forEach(([k,col],i)=>{
    const row=legG.append("g").attr("transform",`translate(0,${22+i*22})`);
    row.append("circle").attr("cx",7).attr("cy",7).attr("r",6)
      .attr("fill",col).attr("opacity",0.85);
    row.append("text").attr("x",18).attr("y",11)
      .attr("fill","#8b949e").attr("font-size",11).text(k);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. GROUPED BAR — Salary by Education
   ═══════════════════════════════════════════════════════════════════════════ */
function drawEducationBar() {
  clr("chart-education");
  if (!DATA.length) { noData("chart-education"); return; }

  const byEdu = d3.rollup(DATA,
    v=>({ mean:d3.mean(v,d=>d.Average_Salary_USD), median:d3.median(v,d=>d.Average_Salary_USD), count:v.length }),
    d=>d.Education_Level);
  const eduData = EDU_ORDER.filter(e=>byEdu.has(e)).map(e=>({ edu:e,...byEdu.get(e) }));

  const { w, h } = sz("chart-education");
  const mg = { top:30, right:20, bottom:50, left:72 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-education").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x0 = d3.scaleBand().domain(eduData.map(d=>d.edu)).range([0,iw]).padding(0.3);
  const x1 = d3.scaleBand().domain(["mean","median"]).range([0,x0.bandwidth()]).padding(0.1);
  const maxV = d3.max(eduData,d=>Math.max(d.mean,d.median));
  const y = d3.scaleLinear().domain([0,maxV*1.1]).range([ih,0]);
  const colMap = {mean:"#00d4aa",median:"#74b9ff"};

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  ["mean","median"].forEach(key=>{
    svg.selectAll(`.b-${key}`).data(eduData).join("rect").attr("class",`b-${key}`)
      .attr("x",d=>x0(d.edu)+x1(key)).attr("width",x1.bandwidth()).attr("rx",4)
      .attr("fill",colMap[key]).attr("y",ih).attr("height",0)
      .style("cursor","pointer")
      .on("mouseover",(ev,d)=>tip(`<strong>${d.edu}</strong>${key==="mean"?"Mean":"Median"}: ${fmtK(d[key])}<br>Count: ${fmt(d.count)}`,ev))
      .on("mousemove",moveTip).on("mouseout",hideTip)
      .transition().duration(600).delay((_,i)=>i*55)
      .attr("y",d=>y(d[key])).attr("height",d=>ih-y(d[key]));
  });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9").attr("font-size",11);

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(fmtK))
    .call(g=>g.select(".domain").remove());

  // inline legend
  const legG = svg.append("g").attr("transform",`translate(${iw-155},-22)`);
  ["mean","median"].forEach((k,i)=>{
    const row=legG.append("g").attr("transform",`translate(${i*80},0)`);
    row.append("rect").attr("width",13).attr("height",13).attr("rx",3).attr("fill",colMap[k]);
    row.append("text").attr("x",17).attr("y",11).attr("fill","#8b949e").attr("font-size",11)
      .text(k.charAt(0).toUpperCase()+k.slice(1));
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. BOX PLOT — Job Growth by Hiring Trend
   ═══════════════════════════════════════════════════════════════════════════ */
function drawHiringBox() {
  clr("chart-hiring");
  if (!DATA.length) { noData("chart-hiring"); return; }

  const groups = d3.rollup(DATA,v=>boxStats(v.map(d=>d.Job_Growth_2030)),d=>d.Hiring_Trend_2026);
  const keys   = Array.from(groups.keys()).sort();
  const colScale = d3.scaleOrdinal().domain(["Increasing","Stable","Decreasing"])
    .range(["#00d4aa","#74b9ff","#ff6b6b"]);

  const { w, h } = sz("chart-hiring");
  const mg = { top:20, right:20, bottom:55, left:55 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-hiring").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const allV = DATA.map(d=>d.Job_Growth_2030);
  const y = d3.scaleLinear().domain([d3.min(allV)-2, d3.max(allV)+2]).range([ih,0]);
  const x = d3.scaleBand().domain(keys).range([0,iw]).padding(0.45);
  const bw = x.bandwidth();

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  keys.forEach(k=>{
    const s=groups.get(k), cx=x(k)+bw/2, col=colScale(k);
    // vertical whisker
    svg.append("line").attr("x1",cx).attr("x2",cx).attr("y1",y(s.min)).attr("y2",y(s.max))
      .attr("stroke",col).attr("stroke-width",1.5).attr("stroke-dasharray","4,3");
    // caps
    [s.min,s.max].forEach(v=>{
      svg.append("line").attr("x1",cx-bw*0.22).attr("x2",cx+bw*0.22)
        .attr("y1",y(v)).attr("y2",y(v)).attr("stroke",col).attr("stroke-width",2);
    });
    // IQR box
    const by=y(s.q3), bh=Math.max(2,Math.abs(y(s.q1)-y(s.q3)));
    svg.append("rect").attr("x",x(k)).attr("y",by)
      .attr("width",bw).attr("height",bh).attr("rx",5)
      .attr("fill",col).attr("fill-opacity",0.18)
      .attr("stroke",col).attr("stroke-width",1.5)
      .style("cursor","pointer")
      .on("mouseover",ev=>tip(`<strong>${k}</strong>Min: ${s.min}<br>Q1: ${s.q1?.toFixed(1)}<br>Median: ${s.median?.toFixed(1)}<br>Q3: ${s.q3?.toFixed(1)}<br>Max: ${s.max}<br>Mean: ${s.mean?.toFixed(1)}`,ev))
      .on("mousemove",moveTip).on("mouseout",hideTip);
    // median
    svg.append("line").attr("x1",x(k)).attr("x2",x(k)+bw)
      .attr("y1",y(s.median)).attr("y2",y(s.median))
      .attr("stroke",col).attr("stroke-width",2.5);
    // mean dot
    svg.append("circle").attr("cx",cx).attr("cy",y(s.mean))
      .attr("r",4.5).attr("fill","#fff").attr("stroke",col).attr("stroke-width",2);
  });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9").attr("font-size",11);

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(6)).call(g=>g.select(".domain").remove());

  svg.append("text").attr("x",iw/2).attr("y",ih+48)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",11)
    .text("Hiring Trend 2026");

  // legend note
  svg.append("text").attr("x",iw).attr("y",-6)
    .attr("text-anchor","end").attr("fill","#8b949e").attr("font-size",10)
    .text("● = mean  ─ = median");
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. STACKED BAR — Upskilling by Automation
   ═══════════════════════════════════════════════════════════════════════════ */
function drawStackedBar() {
  clr("chart-stacked");
  if (!DATA.length) { noData("chart-stacked"); return; }

  const nest    = d3.rollup(DATA,v=>v.length,d=>d.Automation_Level,d=>d.Upskilling_Needed);
  const uKeys   = Array.from(new Set(DATA.map(d=>d.Upskilling_Needed))).sort();
  const autoKs  = AUTO_ORDER.filter(k=>nest.has(k));
  const sdata   = autoKs.map(a=>{ const r={key:a}; uKeys.forEach(u=>r[u]=nest.get(a)?.get(u)||0); return r; });
  const series  = d3.stack().keys(uKeys)(sdata);
  const color   = d3.scaleOrdinal().domain(uKeys).range(["#00d4aa","#ffd166","#ff6b6b","#74b9ff"]);

  const { w, h } = sz("chart-stacked");
  const mg = { top:36, right:20, bottom:50, left:55 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-stacked").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x = d3.scaleBand().domain(autoKs).range([0,iw]).padding(0.28);
  const maxY = d3.max(sdata,d=>uKeys.reduce((s,k)=>s+d[k],0));
  const y = d3.scaleLinear().domain([0,maxY*1.06]).range([ih,0]);

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  series.forEach(s=>{
    svg.selectAll(null).data(s).join("rect")
      .attr("x",(_,i)=>x(autoKs[i])).attr("width",x.bandwidth()).attr("rx",3)
      .attr("fill",color(s.key)).attr("opacity",0.88)
      .attr("y",ih).attr("height",0)
      .style("cursor","pointer")
      .on("mouseover",(ev,d)=>tip(`<strong>${s.key}</strong>Count: ${fmt(d[1]-d[0])}`,ev))
      .on("mousemove",moveTip).on("mouseout",hideTip)
      .transition().duration(600).delay((_,i)=>i*45)
      .attr("y",d=>y(d[1])).attr("height",d=>Math.max(0,y(d[0])-y(d[1])));
  });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9");

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(fmt))
    .call(g=>g.select(".domain").remove());

  svg.append("text").attr("x",iw/2).attr("y",ih+44)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",11)
    .text("Automation Level");

  // legend
  const legG = svg.append("g").attr("transform","translate(0,-28)");
  uKeys.forEach((k,i)=>{
    const row=legG.append("g").attr("transform",`translate(${i*100},0)`);
    row.append("rect").attr("width",12).attr("height",12).attr("rx",3).attr("fill",color(k));
    row.append("text").attr("x",16).attr("y",10).attr("fill","#8b949e").attr("font-size",10).text(k);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. HEATMAP — Salary: Education × Remote Work
   ═══════════════════════════════════════════════════════════════════════════ */
function drawHeatmap() {
  clr("chart-heatmap");
  if (!DATA.length) { noData("chart-heatmap"); return; }

  const remKs = Array.from(new Set(DATA.map(d=>d.Remote_Work_Possibility))).sort();
  const eduKs  = EDU_ORDER.filter(e=>DATA.some(d=>d.Education_Level===e));
  const mat    = d3.rollup(DATA,
    v=>d3.mean(v,d=>d.Average_Salary_USD),
    d=>d.Education_Level, d=>d.Remote_Work_Possibility);

  const { w, h } = sz("chart-heatmap");
  const mg = { top:20, right:20, bottom:80, left:110 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-heatmap").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x = d3.scaleBand().domain(remKs).range([0,iw]).padding(0.06);
  const y = d3.scaleBand().domain(eduKs).range([0,ih]).padding(0.06);

  const allVals=[];
  eduKs.forEach(e=>remKs.forEach(r=>{ const v=mat.get(e)?.get(r); if(v) allVals.push(v); }));
  const col = d3.scaleSequential().domain(d3.extent(allVals))
    .interpolator(d3.interpolate("#1a2333","#00d4aa"));
  const mid = (d3.min(allVals)+d3.max(allVals))/2;

  eduKs.forEach(e=>{ remKs.forEach(r=>{
    const val = mat.get(e)?.get(r);
    svg.append("rect")
      .attr("x",x(r)).attr("y",y(e))
      .attr("width",x.bandwidth()).attr("height",y.bandwidth()).attr("rx",5)
      .attr("fill",val?col(val):"#1e2530").attr("opacity",0)
      .style("cursor","pointer")
      .on("mouseover",ev=>tip(`<strong>${e} × ${r}</strong>Avg Salary: ${val?fmtK(val):"N/A"}`,ev))
      .on("mousemove",moveTip).on("mouseout",hideTip)
      .transition().duration(500).attr("opacity",1);

    if (val) {
      svg.append("text")
        .attr("x",x(r)+x.bandwidth()/2).attr("y",y(e)+y.bandwidth()/2+4)
        .attr("text-anchor","middle")
        .attr("fill",val>mid?"#0d1117":"#e6edf3")
        .attr("font-size",Math.min(12,x.bandwidth()/4))
        .attr("font-weight","500")
        .text(fmtK(val));
    }
  }); });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9").attr("dy","1.2em");

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9");
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. BOX PLOT — Job Satisfaction by Remote Work
   ═══════════════════════════════════════════════════════════════════════════ */
function drawSatisfactionBox() {
  clr("chart-satisfaction");
  if (!DATA.length) { noData("chart-satisfaction"); return; }

  const groups = d3.rollup(DATA,v=>boxStats(v.map(d=>d.Job_Satisfaction)),d=>d.Remote_Work_Possibility);
  const keys   = Array.from(groups.keys()).sort();
  const pal    = ["#00d4aa","#74b9ff","#ffd166","#ff6b6b","#a29bfe"];
  const color  = d3.scaleOrdinal().domain(keys).range(pal);

  const { w, h } = sz("chart-satisfaction");
  const mg = { top:20, right:20, bottom:60, left:55 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-satisfaction").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const allV = DATA.map(d=>d.Job_Satisfaction);
  const y = d3.scaleLinear().domain([d3.min(allV)-0.2, d3.max(allV)+0.2]).range([ih,0]);
  const x = d3.scaleBand().domain(keys).range([0,iw]).padding(0.42);
  const bw = x.bandwidth();

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  keys.forEach(k=>{
    const s=groups.get(k), cx=x(k)+bw/2, col=color(k);
    svg.append("line").attr("x1",cx).attr("x2",cx).attr("y1",y(s.min)).attr("y2",y(s.max))
      .attr("stroke",col).attr("stroke-width",1.5).attr("stroke-dasharray","4,3");
    [s.min,s.max].forEach(v=>{
      svg.append("line").attr("x1",cx-bw*0.22).attr("x2",cx+bw*0.22)
        .attr("y1",y(v)).attr("y2",y(v)).attr("stroke",col).attr("stroke-width",2);
    });
    const by=y(s.q3), bh=Math.max(2,Math.abs(y(s.q1)-y(s.q3)));
    svg.append("rect").attr("x",x(k)).attr("y",by)
      .attr("width",bw).attr("height",bh).attr("rx",5)
      .attr("fill",col).attr("fill-opacity",0.18).attr("stroke",col).attr("stroke-width",1.5)
      .style("cursor","pointer")
      .on("mouseover",ev=>tip(`<strong>${k}</strong>Median: ${fmtN(s.median)}<br>Mean: ${fmtN(s.mean)}<br>Q1–Q3: ${fmtN(s.q1)} – ${fmtN(s.q3)}`,ev))
      .on("mousemove",moveTip).on("mouseout",hideTip);
    svg.append("line").attr("x1",x(k)).attr("x2",x(k)+bw)
      .attr("y1",y(s.median)).attr("y2",y(s.median))
      .attr("stroke",col).attr("stroke-width",2.5);
    svg.append("circle").attr("cx",cx).attr("cy",y(s.mean))
      .attr("r",4.5).attr("fill","#fff").attr("stroke",col).attr("stroke-width",2);
  });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text").attr("fill","#c9d1d9").attr("font-size",10);

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5)).call(g=>g.select(".domain").remove());

  svg.append("text").attr("x",iw/2).attr("y",ih+52)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",11)
    .text("Remote Work Possibility");
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. BUBBLE — Experience vs Future Demand
   ═══════════════════════════════════════════════════════════════════════════ */
function drawBubble() {
  clr("chart-bubble");
  if (!DATA.length) { noData("chart-bubble"); return; }

  const byInd = d3.rollup(DATA,
    v=>({ x:d3.mean(v,d=>d.Years_Experience), y:d3.mean(v,d=>d.Future_Demand_Score),
          size:d3.mean(v,d=>d.Average_Salary_USD), risk:d3.mean(v,d=>d.AI_Replacement_Risk), count:v.length }),
    d=>d.Industry);
  const bdata = Array.from(byInd,([k,v])=>({ industry:k,...v }));

  const { w, h } = sz("chart-bubble");
  const mg = { top:20, right:20, bottom:50, left:55 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-bubble").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x = d3.scaleLinear().domain([d3.min(bdata,d=>d.x)-1,d3.max(bdata,d=>d.x)+1]).range([0,iw]);
  const y = d3.scaleLinear().domain([d3.min(bdata,d=>d.y)-0.2,d3.max(bdata,d=>d.y)+0.2]).range([ih,0]);
  const r = d3.scaleSqrt().domain(d3.extent(bdata,d=>d.size)).range([7,32]);

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());
  svg.append("g").attr("class","grid").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(6).tickSize(-ih).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  svg.selectAll("circle").data(bdata).join("circle")
    .attr("cx",d=>x(d.x)).attr("cy",d=>y(d.y))
    .attr("fill",d=>RISK_COLOR(d.risk)).attr("opacity",0.72)
    .attr("stroke","#1e2530").attr("stroke-width",1.5)
    .attr("r",0).style("cursor","pointer")
    .on("mouseover",function(ev,d){
      d3.select(this).raise().attr("stroke","#fff").attr("stroke-width",2);
      tip(`<strong>${d.industry}</strong>Avg Exp: ${fmtN(d.x)} yrs<br>Future Demand: ${fmtN(d.y)}<br>Avg Salary: ${fmtK(d.size)}<br>AI Risk: ${fmtN(d.risk)}<br>Jobs: ${fmt(d.count)}`,ev);
    })
    .on("mousemove",moveTip)
    .on("mouseout",function(){
      d3.select(this).attr("stroke","#1e2530").attr("stroke-width",1.5); hideTip();
    })
    .transition().duration(700).delay((_,i)=>i*28).attr("r",d=>r(d.size));

  // top-6 labels
  bdata.slice().sort((a,b)=>b.size-a.size).slice(0,6).forEach(d=>{
    svg.append("text")
      .attr("x",x(d.x)).attr("y",y(d.y)-r(d.size)-5)
      .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",9)
      .text(d.industry.length>14?d.industry.slice(0,12)+"…":d.industry);
  });

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(6)).call(g=>g.select(".domain").remove());
  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5)).call(g=>g.select(".domain").remove());

  svg.append("text").attr("x",iw/2).attr("y",ih+42)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",11)
    .text("Avg Years of Experience →");
  svg.append("text").attr("transform","rotate(-90)")
    .attr("x",-ih/2).attr("y",-42)
    .attr("text-anchor","middle").attr("fill","#8b949e").attr("font-size",11)
    .text("Avg Future Demand Score →");
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. DUAL-AXIS BAR+LINE — AI Risk & Job Growth by Country
   ═══════════════════════════════════════════════════════════════════════════ */
function drawCountryChart() {
  clr("chart-country");
  if (!DATA.length) { noData("chart-country"); return; }

  const byCtry = d3.rollup(DATA,
    v=>({ risk:d3.mean(v,d=>d.AI_Replacement_Risk), growth:d3.mean(v,d=>d.Job_Growth_2030), count:v.length }),
    d=>d.Country);
  const top15 = Array.from(byCtry,([k,v])=>({ country:k,...v }))
    .sort((a,b)=>b.risk-a.risk).slice(0,15);

  const { w, h } = sz("chart-country");
  const mg = { top:36, right:75, bottom:80, left:62 };
  const iw = w-mg.left-mg.right, ih = h-mg.top-mg.bottom;

  const svg = d3.select("#chart-country").append("svg")
    .attr("viewBox",`0 0 ${w} ${h}`)
    .append("g").attr("transform",`translate(${mg.left},${mg.top})`);

  const x = d3.scaleBand().domain(top15.map(d=>d.country)).range([0,iw]).padding(0.32);
  const yR = d3.scaleLinear().domain([0,1]).range([ih,0]);
  const gExt = d3.extent(top15,d=>d.growth);
  const yG = d3.scaleLinear().domain([Math.min(0,gExt[0]-2),gExt[1]+2]).range([ih,0]);

  // grid
  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(yR).ticks(5).tickSize(-iw).tickFormat(""))
    .call(g=>g.select(".domain").remove());

  // risk bars
  svg.selectAll(".br").data(top15).join("rect").attr("class","br")
    .attr("x",d=>x(d.country)).attr("width",x.bandwidth()).attr("rx",4)
    .attr("fill",d=>RISK_COLOR(d.risk)).attr("opacity",0.82)
    .attr("y",ih).attr("height",0)
    .style("cursor","pointer")
    .on("mouseover",(ev,d)=>tip(`<strong>${d.country}</strong>AI Risk: ${fmtN(d.risk)}<br>Job Growth: ${fmtN(d.growth)}%<br>Jobs: ${fmt(d.count)}`,ev))
    .on("mousemove",moveTip).on("mouseout",hideTip)
    .transition().duration(600).delay((_,i)=>i*28)
    .attr("y",d=>yR(d.risk)).attr("height",d=>ih-yR(d.risk));

  // growth line
  const line = d3.line()
    .x(d=>x(d.country)+x.bandwidth()/2).y(d=>yG(d.growth))
    .curve(d3.curveMonotoneX);

  svg.append("path").datum(top15)
    .attr("fill","none").attr("stroke","#74b9ff").attr("stroke-width",2.5)
    .attr("d",line);

  svg.selectAll(".dg").data(top15).join("circle").attr("class","dg")
    .attr("cx",d=>x(d.country)+x.bandwidth()/2).attr("cy",d=>yG(d.growth))
    .attr("r",5.5).attr("fill","#74b9ff")
    .attr("stroke","#0d1117").attr("stroke-width",2)
    .style("cursor","pointer")
    .on("mouseover",(ev,d)=>tip(`<strong>${d.country}</strong>Job Growth 2030: ${fmtN(d.growth)}%<br>AI Risk: ${fmtN(d.risk)}`,ev))
    .on("mousemove",moveTip).on("mouseout",hideTip);

  // axes
  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(yR).ticks(5).tickFormat(fmtP))
    .call(g=>g.select(".domain").remove());

  svg.append("g").attr("class","axis").attr("transform",`translate(${iw},0)`)
    .call(d3.axisRight(yG).ticks(5).tickFormat(d=>d+"%"))
    .call(g=>g.select(".domain").remove());

  svg.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g=>g.select(".domain").remove())
    .selectAll("text")
    .attr("transform","rotate(-38)").attr("text-anchor","end")
    .attr("fill","#c9d1d9").attr("font-size",11);

  // legend
  const legG = svg.append("g").attr("transform",`translate(${iw-300},-28)`);
  legG.append("rect").attr("width",14).attr("height",14).attr("rx",3)
    .attr("fill","#00d4aa").attr("opacity",0.82);
  legG.append("text").attr("x",18).attr("y",11).attr("fill","#8b949e").attr("font-size",11)
    .text("AI Replacement Risk (bars, left axis)");
  legG.append("circle").attr("cx",172).attr("cy",7).attr("r",5).attr("fill","#74b9ff");
  legG.append("text").attr("x",180).attr("y",11).attr("fill","#8b949e").attr("font-size",11)
    .text("Job Growth % (line, right axis)");
}

/* ═══════════════════════════════════════════════════════════════════════════
   KPIs + DRAW ALL
   ═══════════════════════════════════════════════════════════════════════════ */
function updateKPIs() {
  const n=DATA.length;
  document.getElementById("kpi-total").textContent      = n ? fmt(n) : "0";
  document.getElementById("kpi-industries").textContent = n ? new Set(DATA.map(d=>d.Industry)).size : "—";
  document.getElementById("kpi-countries").textContent  = n ? new Set(DATA.map(d=>d.Country)).size : "—";
  document.getElementById("kpi-risk").textContent       = n ? fmtN(d3.mean(DATA,d=>d.AI_Replacement_Risk)) : "—";
  document.getElementById("kpi-salary").textContent     = n ? fmtK(d3.mean(DATA,d=>d.Average_Salary_USD)) : "—";
}

function drawAll() {
  updateKPIs();
  drawDonut();
  drawIndustryBar();
  drawScatter();
  drawEducationBar();
  drawHiringBox();
  drawStackedBar();
  drawHeatmap();
  drawSatisfactionBox();
  drawBubble();
  drawCountryChart();
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTERS
   ═══════════════════════════════════════════════════════════════════════════ */
function applyFilters() {
  const ind  = document.getElementById("f-industry").value;
  const cty  = document.getElementById("f-country").value;
  const edu  = document.getElementById("f-education").value;
  const auto = document.getElementById("f-automation").value;
  const rem  = document.getElementById("f-remote").value;
  const hire = document.getElementById("f-hiring").value;
  DATA = RAW.filter(d=>
    (ind ==="All"||d.Industry===ind) &&
    (cty ==="All"||d.Country===cty) &&
    (edu ==="All"||d.Education_Level===edu) &&
    (auto==="All"||d.Automation_Level===auto) &&
    (rem ==="All"||d.Remote_Work_Possibility===rem) &&
    (hire==="All"||d.Hiring_Trend_2026===hire)
  );
  drawAll();
}

function populateFilter(id, field) {
  const sel = document.getElementById(id);
  Array.from(new Set(RAW.map(d=>d[field]))).sort().forEach(v=>{
    const o=document.createElement("option"); o.value=o.textContent=v; sel.appendChild(o);
  });
  sel.addEventListener("change", applyFilters);
}

document.getElementById("btnReset").addEventListener("click",()=>{
  ["f-industry","f-country","f-education","f-automation","f-remote","f-hiring"]
    .forEach(id=>document.getElementById(id).value="All");
  DATA=RAW.slice(); drawAll();
});

/* ═══════════════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════════════ */
d3.csv("data/AI_Impact_on_Jobs_2030.csv", d=>({
  Employee_ID:             d.Employee_ID,
  Job_Title:               d.Job_Title,
  Industry:                d.Industry,
  Country:                 d.Country,
  Education_Level:         d.Education_Level,
  Years_Experience:        +d.Years_Experience,
  AI_Replacement_Risk:     +d.AI_Replacement_Risk,
  Future_Demand_Score:     +d.Future_Demand_Score,
  Remote_Work_Possibility: d.Remote_Work_Possibility,
  Average_Salary_USD:      +d.Average_Salary_USD,
  Automation_Level:        d.Automation_Level,
  Job_Growth_2030:         +d.Job_Growth_2030,
  Work_Hours_Per_Week:     +d.Work_Hours_Per_Week,
  Company_Size:            d.Company_Size,
  AI_Tool_Usage:           d.AI_Tool_Usage,
  Performance_Score:       +d.Performance_Score,
  Upskilling_Needed:       d.Upskilling_Needed,
  Job_Satisfaction:        +d.Job_Satisfaction,
  Hiring_Trend_2026:       d.Hiring_Trend_2026,
})).then(data=>{
  RAW=data; DATA=data.slice();
  populateFilter("f-industry","Industry");
  populateFilter("f-country","Country");
  populateFilter("f-education","Education_Level");
  populateFilter("f-automation","Automation_Level");
  populateFilter("f-remote","Remote_Work_Possibility");
  populateFilter("f-hiring","Hiring_Trend_2026");
  drawAll();

  let rt;
  window.addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(drawAll,220); });

}).catch(err=>{
  console.error(err);
  document.querySelector(".dashboard").innerHTML=`
    <div style="grid-column:span 12;padding:80px;text-align:center;color:#8b949e;font-family:var(--font-mono)">
      <p style="font-size:18px;margin-bottom:12px">⚠️ Could not load dataset</p>
      <p>Place <code>AI_Impact_on_Jobs_2030.csv</code> inside the <code>data/</code> folder.</p>
      <p style="margin-top:10px;font-size:12px">Run with a local server: <code>npx serve .</code> then open <code>http://localhost:3000</code></p>
    </div>`;
});
