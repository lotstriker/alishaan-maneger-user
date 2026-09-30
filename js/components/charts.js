/* ============================================================
   ALISHAN · CHARTS
   Pure SVG chart renderers. No external library.
   ============================================================ */

const Charts = (() => {

  function niceMax(value) {
    if (value <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / pow;
    if (n <= 1) return pow;
    if (n <= 2) return 2 * pow;
    if (n <= 5) return 5 * pow;
    return 10 * pow;
  }

  const ACCENT = 'var(--accent)';
  const MUTED  = 'var(--text-muted)';
  const LINE   = 'var(--line)';

  /* ---------- Vertical bar chart ---------- */
  function barChart({ data, height = 200, valueFormat = v => v, barColor = ACCENT, showValues = true }) {
    if (!data.length) return `<div class="empty" style="padding:20px;">No data</div>`;

    const max = niceMax(Math.max(...data.map(d => d.value), 0));
    const chartH = height - 40;
    const barW = 100 / data.length;

    const bars = data.map((d, i) => {
      const h = max > 0 ? (d.value / max) * chartH : 0;
      const x = i * barW;
      const y = chartH - h + 10;
      return `
        <g>
          <rect x="${x + barW * 0.2}%" y="${y}" width="${barW * 0.6}%" height="${Math.max(2, h)}"
                fill="${d.color || barColor}" rx="4" />
          ${showValues ? `
            <text x="${x + barW / 2}%" y="${y - 5}" text-anchor="middle"
                  font-size="10" fill="${MUTED}" font-weight="700">
              ${Utils.esc(valueFormat(d.value))}
            </text>
          ` : ''}
          <text x="${x + barW / 2}%" y="${height - 6}" text-anchor="middle"
                font-size="10" fill="${MUTED}">
            ${Utils.esc(d.label)}
          </text>
        </g>
      `;
    }).join('');

    return `
      <div class="chart-wrap" style="height:${height}px;position:relative;">
        <svg viewBox="0 0 100 ${height}" preserveAspectRatio="none"
             style="width:100%;height:100%;display:block;overflow:visible;">
          <line x1="0" y1="${chartH + 10}" x2="100" y2="${chartH + 10}"
                stroke="${LINE}" stroke-width="1" vector-effect="non-scaling-stroke" />
          ${bars}
        </svg>
      </div>
    `;
  }

  /* ---------- Grouped bar chart (two series) ---------- */
  function groupedBarChart({ data, height = 200, colorA = ACCENT, colorB = 'var(--warning)',
                             labelA = '', labelB = '' }) {
    if (!data.length) return `<div class="empty" style="padding:20px;">No data</div>`;

    const max = niceMax(Math.max(...data.flatMap(d => [d.a, d.b]), 0));
    const chartH = height - 50;
    const groupW = 100 / data.length;

    const bars = data.map((d, i) => {
      const hA = max > 0 ? (d.a / max) * chartH : 0;
      const hB = max > 0 ? (d.b / max) * chartH : 0;
      const x = i * groupW;
      return `
        <g>
          <rect x="${x + groupW * 0.15}%" y="${chartH - hA + 10}"
                width="${groupW * 0.32}%" height="${Math.max(2, hA)}"
                fill="${colorA}" rx="3" />
          <rect x="${x + groupW * 0.53}%" y="${chartH - hB + 10}"
                width="${groupW * 0.32}%" height="${Math.max(2, hB)}"
                fill="${colorB}" rx="3" />
          <text x="${x + groupW / 2}%" y="${height - 6}" text-anchor="middle"
                font-size="10" fill="${MUTED}">${Utils.esc(d.label)}</text>
        </g>
      `;
    }).join('');

    const legend = (labelA || labelB) ? `
      <div class="chart-legend">
        ${labelA ? `<span><i style="background:${colorA}"></i>${Utils.esc(labelA)}</span>` : ''}
        ${labelB ? `<span><i style="background:${colorB}"></i>${Utils.esc(labelB)}</span>` : ''}
      </div>
    ` : '';

    return `
      ${legend}
      <div class="chart-wrap" style="height:${height}px;position:relative;">
        <svg viewBox="0 0 100 ${height}" preserveAspectRatio="none"
             style="width:100%;height:100%;display:block;overflow:visible;">
          <line x1="0" y1="${chartH + 10}" x2="100" y2="${chartH + 10}"
                stroke="${LINE}" stroke-width="1" vector-effect="non-scaling-stroke" />
          ${bars}
        </svg>
      </div>
    `;
  }

  /* ---------- Horizontal bar chart ---------- */
  function horizontalBarChart({ data, valueFormat = v => v, barColor = ACCENT }) {
    if (!data.length) return `<div class="empty" style="padding:20px;">No data</div>`;
    const max = Math.max(...data.map(d => d.value), 1);

    const rows = data.map(d => {
      const pct = max > 0 ? (d.value / max) * 100 : 0;
      return `
        <div class="hbar-row">
          <div class="hbar-label" title="${Utils.esc(d.label)}">${Utils.esc(d.label)}</div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${pct}%;background:${d.color || barColor};"></div>
          </div>
          <div class="hbar-value">${Utils.esc(valueFormat(d.value))}</div>
        </div>
      `;
    }).join('');

    return `<div class="hbar-chart">${rows}</div>`;
  }

  /* ---------- Doughnut chart ---------- */
  function doughnutChart({ data, size = 200, thickness = 28, centerLabel = '', centerValue = '' }) {
    const total = data.reduce((a, d) => a + d.value, 0);
    if (total <= 0) return `<div class="empty" style="padding:20px;">No data</div>`;

    const cx = size / 2, cy = size / 2;
    const r = (size - thickness) / 2;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const segments = data.map(d => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const seg = `
        <circle cx="${cx}" cy="${cy}" r="${r}"
                fill="none" stroke="${d.color}"
                stroke-width="${thickness}"
                stroke-dasharray="${dash} ${circumference - dash}"
                stroke-dashoffset="${-offset}"
                transform="rotate(-90 ${cx} ${cy})" />
      `;
      offset += dash;
      return seg;
    }).join('');

    const center = (centerLabel || centerValue) ? `
      <text x="${cx}" y="${cy - 4}" text-anchor="middle"
            font-size="20" font-weight="800" fill="var(--text)">
        ${Utils.esc(centerValue)}
      </text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle"
            font-size="10" fill="${MUTED}" letter-spacing="0.05em">
        ${Utils.esc(centerLabel)}
      </text>
    ` : '';

    const legend = data.map(d => `
      <span><i style="background:${d.color}"></i>${Utils.esc(d.label)}</span>
    `).join('');

    return `
      <div class="doughnut-wrap">
        <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex:none;">
          <circle cx="${cx}" cy="${cy}" r="${r}"
                  fill="none" stroke="${LINE}" stroke-width="${thickness}" opacity="0.3" />
          ${segments}
          ${center}
        </svg>
        <div class="chart-legend vertical">${legend}</div>
      </div>
    `;
  }

  /* ---------- Line chart ---------- */
  function lineChart({ series, height = 220, xLabels = [] }) {
    if (!series.length || !series[0].points.length) {
      return `<div class="empty" style="padding:20px;">No data</div>`;
    }

    const allValues = series.flatMap(s => s.points.map(p => p.y));
    const max = niceMax(Math.max(...allValues, 0));
    const pointsCount = series[0].points.length;
    const paddingL = 8, paddingR = 8, paddingT = 20, paddingB = 30;
    const chartW = 100 - paddingL - paddingR;
    const chartH = height - paddingT - paddingB;
    const step = pointsCount > 1 ? chartW / (pointsCount - 1) : 0;

    const paths = series.map(s => {
      const d = s.points.map((p, i) => {
        const x = paddingL + i * step;
        const y = paddingT + chartH - (max > 0 ? (p.y / max) * chartH : 0);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');

      const dots = s.points.map((p, i) => {
        const x = paddingL + i * step;
        const y = paddingT + chartH - (max > 0 ? (p.y / max) * chartH : 0);
        return `<circle cx="${x}" cy="${y}" r="1.6" fill="${s.color}" />`;
      }).join('');

      return `
        <path d="${d}" fill="none" stroke="${s.color}"
              stroke-width="2" vector-effect="non-scaling-stroke"
              ${s.dashed ? 'stroke-dasharray="4 3"' : ''}
              stroke-linecap="round" stroke-linejoin="round" />
        ${dots}
      `;
    }).join('');

    const xTicks = (xLabels.length === pointsCount ? xLabels : series[0].points.map(p => p.x)).map((lbl, i) => {
      const x = paddingL + i * step;
      return `<text x="${x}" y="${height - 8}" text-anchor="middle"
                    font-size="10" fill="${MUTED}">${Utils.esc(lbl)}</text>`;
    }).join('');

    const legend = series.length > 1 ? `
      <div class="chart-legend">
        ${series.map(s => `
          <span><i style="background:${s.color};${s.dashed ? 'opacity:.6;' : ''}"></i>${Utils.esc(s.name)}</span>
        `).join('')}
      </div>
    ` : '';

    return `
      ${legend}
      <div class="chart-wrap" style="height:${height}px;position:relative;">
        <svg viewBox="0 0 100 ${height}" preserveAspectRatio="none"
             style="width:100%;height:100%;display:block;overflow:visible;">
          <line x1="${paddingL}" y1="${paddingT + chartH}" x2="${100 - paddingR}" y2="${paddingT + chartH}"
                stroke="${LINE}" stroke-width="1" vector-effect="non-scaling-stroke" />
          ${paths}
          ${xTicks}
        </svg>
      </div>
    `;
  }

  /* ---------- Area chart ---------- */
  function areaChart({ data, height = 200, color = ACCENT }) {
    if (!data.length) return `<div class="empty" style="padding:20px;">No data</div>`;

    const max = niceMax(Math.max(...data.map(d => d.value), 0));
    const paddingT = 20, paddingB = 30, paddingL = 8, paddingR = 8;
    const chartH = height - paddingT - paddingB;
    const chartW = 100 - paddingL - paddingR;
    const step = data.length > 1 ? chartW / (data.length - 1) : 0;

    const linePath = data.map((d, i) => {
      const x = paddingL + i * step;
      const y = paddingT + chartH - (max > 0 ? (d.value / max) * chartH : 0);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    const areaPath = `${linePath} L ${paddingL + (data.length - 1) * step},${paddingT + chartH} L ${paddingL},${paddingT + chartH} Z`;

    const xTicks = data.map((d, i) => {
      const x = paddingL + i * step;
      return `<text x="${x}" y="${height - 8}" text-anchor="middle"
                    font-size="10" fill="${MUTED}">${Utils.esc(d.label)}</text>`;
    }).join('');

    return `
      <div class="chart-wrap" style="height:${height}px;position:relative;">
        <svg viewBox="0 0 100 ${height}" preserveAspectRatio="none"
             style="width:100%;height:100%;display:block;overflow:visible;">
          <line x1="${paddingL}" y1="${paddingT + chartH}" x2="${100 - paddingR}" y2="${paddingT + chartH}"
                stroke="${LINE}" stroke-width="1" vector-effect="non-scaling-stroke" />
          <path d="${areaPath}" fill="${color}" opacity="0.18" />
          <path d="${linePath}" fill="none" stroke="${color}"
                stroke-width="2" vector-effect="non-scaling-stroke"
                stroke-linecap="round" stroke-linejoin="round" />
          ${xTicks}
        </svg>
      </div>
    `;
  }

  /* ---------- Sparkline ---------- */
  function sparkline({ values, width = 80, height = 24, color = ACCENT }) {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step = values.length > 1 ? width / (values.length - 1) : 0;

    const d = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;">
        <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  /* ---------- Gauge ---------- */
  function gaugeChart({ value, size = 180, label = '', color = ACCENT }) {
    const v = Math.max(0, Math.min(100, value));
    const cx = size / 2;
    const cy = size / 2 + 10;
    const r = (size - 40) / 2;
    const startAngle = Math.PI;
    const totalAngle = Math.PI;
    const angle = startAngle + (v / 100) * totalAngle;

    const polar = (a) => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
    const start = polar(startAngle);
    const end = polar(0);
    const cur = polar(angle);

    const bgArc = `M ${start.x},${start.y} A ${r},${r} 0 0 1 ${end.x},${end.y}`;
    const fgArc = `M ${start.x},${start.y} A ${r},${r} 0 0 1 ${cur.x},${cur.y}`;

    return `
      <div class="gauge-wrap">
        <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;">
          <path d="${bgArc}" fill="none" stroke="${LINE}" stroke-width="14" stroke-linecap="round" />
          <path d="${fgArc}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" />
          <text x="${cx}" y="${cy - 6}" text-anchor="middle"
                font-size="26" font-weight="800" fill="var(--text)">${Math.round(v)}</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle"
                font-size="10" fill="${MUTED}" letter-spacing="0.05em">
            ${Utils.esc(label)}
          </text>
        </svg>
      </div>
    `;
  }

  /* ---------- Compare periods ---------- */
  function comparePeriodsChart({ current, previous, labels, type = 'line', height = 220 }) {
    const curSeries = {
      name: 'This period',
      color: ACCENT,
      points: current.map((y, i) => ({ x: labels[i] || '', y })),
    };
    const prevSeries = {
      name: 'Previous period',
      color: 'var(--warning)',
      dashed: true,
      points: previous.map((y, i) => ({ x: labels[i] || '', y })),
    };

    if (type === 'bar') {
      const data = current.map((v, i) => ({ label: labels[i] || '', a: v, b: previous[i] || 0 }));
      return groupedBarChart({
        data, height,
        colorA: ACCENT, colorB: 'var(--warning)',
        labelA: 'This period', labelB: 'Previous period',
      });
    }

    if (type === 'area') {
      const data = current.map((v, i) => ({ label: labels[i] || '', value: v }));
      return areaChart({ data, height, color: ACCENT });
    }

    return lineChart({ series: [curSeries, prevSeries], height, xLabels: labels });
  }

  return {
    barChart, groupedBarChart, horizontalBarChart,
    doughnutChart, lineChart, areaChart,
    sparkline, gaugeChart, comparePeriodsChart,
  };
})();

window.Charts = Charts;