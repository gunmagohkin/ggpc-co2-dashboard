const Dashboard = {
  // --- Properties ---
  state: {
    records: [],
    year: new Date().getFullYear().toString(),
    highlightedIndices: { ggpc: null, cdpc: null },
  },
  charts: {
    ggpcBar: null,
    cdpcBar: null,
    ggpcPie: null,
    cdpcPie: null,
  },
  dom: {
    loader: null,
    yearSelect: null,
    stackToggle: null,
    kpi: {}, // Populated in init
  },
  config: {
    monthNames: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    sources: {
      electricityCO2: { label: 'Electricity', color: '#0ea5e9', field: 'Electricity_CO2' },
      lpgCO2: { label: 'LPG', color: '#f97316', field: 'lpg_co2' },
      gasCO2: { label: 'Gas', color: '#64748b', field: 'Gas_CO2' },
      dieselCO2: { label: 'Diesel', color: '#f59e0b', field: 'Diesel_CO2' },
      oilCO2: { label: 'Oil', color: '#8b5cf6', field: 'OIL_CO2' },
    },
  },

  // --- Initialization ---
  async init() {
    this.cacheDomElements();
    this.setupEventListeners();
    await this.loadAndRenderData();
    lucide.createIcons();
  },

  cacheDomElements() {
    this.dom.loader = document.getElementById('loader');
    this.dom.yearSelect = document.getElementById('year-select');
    this.dom.stackToggle = document.getElementById('stackToggle');
    this.dom.kpi = {
      ggpc: { total: document.getElementById('ggpc-kpi-total'), source: document.getElementById('ggpc-kpi-source') },
      cdpc: { total: document.getElementById('cdpc-kpi-total'), source: document.getElementById('cdpc-kpi-source') },
    };
  },
  
  // --- Data Handling ---
  async fetchData() {
    this.dom.loader.style.display = 'flex';
    try {
      const response = await fetch('/.netlify/functions/kintone');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      this.state.records = data.records || [];
    } catch (error) {
      console.error('Failed to fetch Kintone data:', error);
      this.state.records = [];
    } finally {
      this.dom.loader.style.display = 'none';
    }
  },

  processData(year) {
    const yearNum = parseInt(year);
    const processed = {
      ggpc: Array(12).fill(null).map(() => ({ total: 0 })),
      cdpc: Array(12).fill(null).map(() => ({ total: 0 })),
    };
  
    const filteredRecords = this.state.records.filter(r => new Date(r.Date_To?.value).getFullYear() === yearNum);

    for (const record of filteredRecords) {
        const plant = record.Plant_Location?.value?.toLowerCase();
        const dateStr = record.Date_To?.value;
        if (!plant || !dateStr || !processed[plant]) continue;

        const monthIndex = new Date(dateStr).getMonth();
        const monthlyData = processed[plant][monthIndex];

        // *** THIS IS THE CORRECTED LOGIC ***
        for (const [key, sourceConfig] of Object.entries(this.config.sources)) {
            const value = parseFloat(record[sourceConfig.field]?.value) || 0;
            monthlyData[key] = (monthlyData[key] || 0) + value;
            monthlyData.total += value;
        }
    }
    return processed;
  },

  // --- Rendering ---
  async loadAndRenderData() {
    if (!this.state.records.length) {
        await this.fetchData();
        this.setupYearSelect();
    }
    this.state.year = this.dom.yearSelect.value;
    const processedData = this.processData(this.state.year);
    
    this.renderTables(processedData);
    this.renderKpiCards(processedData);
    this.renderBarCharts(processedData);
    this.renderPieCharts(processedData);
  },
  
  renderTables(data) {
    this._renderSingleTable('ggpcCo2Table', data.ggpc);
    this._renderSingleTable('cdpcCo2Table', data.cdpc);
  },

  _renderSingleTable(tableId, monthlyData) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthlyData.forEach((totals, index) => {
        const row = tbody.insertRow();
        let rowHTML = `<td class="px-2 py-1 border font-semibold bg-gray-50 text-center">${fullMonthNames[index]}</td>`;
        for (const key in this.config.sources) {
            rowHTML += `<td class="px-2 py-1 border text-center">${(totals[key] || 0).toFixed(2)}</td>`;
        }
        row.innerHTML = rowHTML;
    });
  },

  renderKpiCards(data) {
    ['ggpc', 'cdpc'].forEach(plant => {
        const annualTotals = data[plant].reduce((acc, month) => {
            for (const key in this.config.sources) {
                acc[key] = (acc[key] || 0) + (month[key] || 0);
            }
            acc.total += month.total || 0;
            return acc;
        }, { total: 0 });

        let topSource = 'N/A';
        let maxSourceValue = 0;
        for (const key in this.config.sources) {
            if (annualTotals[key] > maxSourceValue) {
                maxSourceValue = annualTotals[key];
                topSource = this.config.sources[key].label;
            }
        }
        
        this.dom.kpi[plant].total.textContent = `${annualTotals.total.toFixed(2)} t-CO₂`;
        this.dom.kpi[plant].source.textContent = topSource;
    });
  },

  renderBarCharts(data) {
    this.charts.ggpcBar = this._renderSingleBarChart('ggpcBarChart', 'GGPC', data.ggpc, this.charts.ggpcBar);
    this.charts.cdpcBar = this._renderSingleBarChart('cdpcBarChart', 'CDPC', data.cdpc, this.charts.cdpcBar);
  },

  _renderSingleBarChart(canvasId, title, monthlyData, existingChart) {
    if (existingChart) existingChart.destroy();
    
    const datasets = Object.entries(this.config.sources).map(([key, { label, color }]) => ({
      label,
      data: monthlyData.map(d => d[key] || 0),
      backgroundColor: color,
      stack: 'sources',
    }));

    datasets.push({
      label: 'Total CO₂',
      data: monthlyData.map(d => d.total || 0),
      type: 'line',
      borderColor: '#ef4444', // red-500
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointBackgroundColor: '#ef4444',
      yAxisID: 'y',
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: { labels: this.config.monthNames, datasets },
      options: this.getBarChartBaseConfig(title, canvasId.replace('BarChart', 'Co2Table')),
    });
  },

  renderPieCharts(data) {
    this.charts.ggpcPie = this._renderSinglePieChart('ggpcPieChart', 'GGPC', data.ggpc, this.charts.ggpcPie);
    this.charts.cdpcPie = this._renderSinglePieChart('cdpcPieChart', 'CDPC', data.cdpc, this.charts.cdpcPie);
  },

  _renderSinglePieChart(canvasId, title, monthlyData, existingChart) {
    if (existingChart) existingChart.destroy();

    const annualTotals = monthlyData.reduce((acc, month) => {
        for (const key in this.config.sources) {
            acc[key] = (acc[key] || 0) + (month[key] || 0);
        }
        return acc;
    }, {});

    const labels = Object.values(this.config.sources).map(s => s.label);
    const chartData = Object.keys(this.config.sources).map(key => annualTotals[key] || 0);
    const colors = Object.values(this.config.sources).map(s => s.color);

    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: chartData, backgroundColor: colors }]
        },
        options: this.getPieChartBaseConfig(title),
    });
  },

  getBarChartBaseConfig(title, tableId) {
    const isStacked = this.dom.stackToggle.checked;
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (event, elements) => this.chartClickHandler(elements, tableId),
      scales: {
        x: { stacked: isStacked },
        y: { stacked: isStacked, beginAtZero: true, title: { display: true, text: `CO₂ Emission (t-CO₂)` } },
      },
      plugins: {
        title: { display: true, text: `${title} Monthly CO₂ Emissions (${this.state.year})`, font: { size: 16 } },
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.formattedValue} t-CO₂` } },
      },
    };
  },

  getPieChartBaseConfig(title) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: `${title} Annual Breakdown`, font: { size: 16 } },
            legend: { position: 'right' },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const total = c.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((c.raw / total) * 100).toFixed(1) : 0;
                        return `${c.label}: ${percentage}%`;
                    }
                }
            }
        }
    };
  },

  // --- Event Handlers & UI Updates ---
  setupEventListeners() {
    this.dom.yearSelect.addEventListener('change', () => this.loadAndRenderData());
    this.dom.stackToggle.addEventListener('change', () => this.loadAndRenderData());
    document.getElementById('menu-btn')?.addEventListener('click', () => {
        const menu = document.getElementById('mobile-menu');
        menu.style.maxHeight = (menu.style.maxHeight === '0px' || !menu.style.maxHeight) ? `${menu.scrollHeight}px` : '0px';
    });
  },
  
  setupYearSelect() {
    const years = [...new Set(this.state.records.map(r => new Date(r.Date_To?.value).getFullYear()))].sort((a,b)=>b-a);
    this.dom.yearSelect.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year; option.textContent = year;
        this.dom.yearSelect.appendChild(option);
    });
    if (this.dom.yearSelect.value) {
        this.state.year = this.dom.yearSelect.value;
    }
  },

  chartClickHandler(elements, tableId) {
    if (!elements.length) return;
    const index = elements[0].index;
    const tableRows = document.querySelectorAll(`#${tableId} tbody tr`);
    const plant = tableId.includes('ggpc') ? 'ggpc' : 'cdpc';

    if (index === this.state.highlightedIndices[plant]) {
      tableRows[index].classList.remove('highlight-row');
      this.state.highlightedIndices[plant] = null;
    } else {
      tableRows.forEach(row => row.classList.remove('highlight-row'));
      tableRows[index].classList.add('highlight-row');
      this.state.highlightedIndices[plant] = index;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());