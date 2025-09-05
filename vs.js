const Dashboard = {
  // --- Properties ---
  state: {
    records: [],
    year: new Date().getFullYear().toString(),
    highlightedIndex: null,
  },
  charts: {
    monthly: null,
    annual: null,
    difference: null,
  },
  dom: {
    loader: null,
    yearSelect: null,
    detailToggle: null,
    kpi: {}, 
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
    plantColors: { ggpc: '#3b82f6', cdpc: '#f59e0b' }, // Blue, Amber
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
    this.dom.detailToggle = document.getElementById('detailToggle');
    this.dom.kpi = {
      ggpcTotal: document.getElementById('ggpc-kpi-total'),
      cdpcTotal: document.getElementById('cdpc-kpi-total'),
      higherEmitter: document.getElementById('kpi-higher-emitter'),
      difference: document.getElementById('kpi-difference'),
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
      console.error('Failed to fetch data:', error);
    } finally {
      this.dom.loader.style.display = 'none';
    }
  },

  processData() {
    const processed = {};
    const years = [...new Set(this.state.records.map(r => new Date(r.Date_To?.value).getFullYear()))];

    years.forEach(year => {
        processed[year] = {
            ggpc: Array(12).fill(null).map(() => ({ total: 0 })),
            cdpc: Array(12).fill(null).map(() => ({ total: 0 })),
        };
        const yearRecords = this.state.records.filter(r => new Date(r.Date_To?.value).getFullYear() === year);
        
        for (const record of yearRecords) {
            const plant = record.Plant_Location?.value?.toLowerCase();
            const monthIndex = new Date(record.Date_To?.value).getMonth();
            if (!plant || monthIndex < 0 || !processed[year][plant]) continue;

            const monthlyData = processed[year][plant][monthIndex];
            let total = 0;
            // *** THIS IS THE CORRECTED LOGIC ***
            for (const [key, sourceConfig] of Object.entries(this.config.sources)) {
                const value = parseFloat(record[sourceConfig.field]?.value) || 0;
                monthlyData[key] = (monthlyData[key] || 0) + value;
                total += value;
            }
            monthlyData.total += total;
        }
    });
    return processed;
  },

  // --- Rendering ---
  async loadAndRenderData() {
    if (!this.state.records.length) {
        await this.fetchData();
        this.setupYearSelect();
    }
    this.state.year = this.dom.yearSelect.value;
    const allData = this.processData();
    const yearData = allData[this.state.year] || { ggpc: [], cdpc: [] };

    this.renderTable(yearData);
    this.renderKpiCards(yearData);
    this.renderMonthlyChart(yearData);
    this.renderAnnualChart(yearData);
    this.renderDifferenceChart(yearData);
  },
  
  renderTable(data) {
    const tbody = document.querySelector('#vsTable tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const row = tbody.insertRow();
        const monthName = new Date(this.state.year, i).toLocaleString('default', { month: 'long' });
        let rowHTML = `<td class="px-2 py-1 border font-semibold bg-gray-50 text-center">${monthName}</td>`;
        
        ['ggpc', 'cdpc'].forEach(plant => {
            const monthData = data[plant][i];
            for (const key in this.config.sources) {
                rowHTML += `<td class="px-2 py-1 border text-center">${(monthData[key] || 0).toFixed(2)}</td>`;
            }
            rowHTML += `<td class="px-2 py-1 border text-center font-bold">${(monthData.total || 0).toFixed(2)}</td>`;
        });
        row.innerHTML = rowHTML;
    }
  },

  renderKpiCards(data) {
      const ggpcTotal = data.ggpc.reduce((sum, month) => sum + month.total, 0);
      const cdpcTotal = data.cdpc.reduce((sum, month) => sum + month.total, 0);
      const difference = Math.abs(ggpcTotal - cdpcTotal);
      let higherEmitter = 'TIE';
      if (ggpcTotal > cdpcTotal) higherEmitter = 'GGPC';
      if (cdpcTotal > ggpcTotal) higherEmitter = 'CDPC';

      this.dom.kpi.ggpcTotal.textContent = ggpcTotal.toFixed(2);
      this.dom.kpi.cdpcTotal.textContent = cdpcTotal.toFixed(2);
      this.dom.kpi.higherEmitter.textContent = higherEmitter;
      this.dom.kpi.difference.textContent = difference.toFixed(2);
  },

  renderMonthlyChart(data) {
    if (this.charts.monthly) this.charts.monthly.destroy();
    const isDetailed = this.dom.detailToggle.checked;
    let datasets = [];

    if (isDetailed) {
      for (const [key, { label }] of Object.entries(this.config.sources)) {
          datasets.push({ label: `GGPC ${label}`, data: data.ggpc.map(m => m[key] || 0), backgroundColor: this.config.plantColors.ggpc, stack: 'GGPC' });
          datasets.push({ label: `CDPC ${label}`, data: data.cdpc.map(m => m[key] || 0), backgroundColor: this.config.plantColors.cdpc, stack: 'CDPC' });
      }
    } else {
      datasets.push({ label: 'GGPC Total CO₂', data: data.ggpc.map(m => m.total), backgroundColor: this.config.plantColors.ggpc });
      datasets.push({ label: 'CDPC Total CO₂', data: data.cdpc.map(m => m.total), backgroundColor: this.config.plantColors.cdpc });
    }

    const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
    this.charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: { labels: this.config.monthNames, datasets },
      options: this.getMonthlyChartConfig(),
    });
  },
  
  renderAnnualChart(data) {
    if (this.charts.annual) this.charts.annual.destroy();
    const annualGGPC = data.ggpc.reduce((acc, month) => {
        for(const key in this.config.sources) acc[key] = (acc[key] || 0) + (month[key] || 0);
        return acc;
    }, {});
    const annualCDPC = data.cdpc.reduce((acc, month) => {
        for(const key in this.config.sources) acc[key] = (acc[key] || 0) + (month[key] || 0);
        return acc;
    }, {});
    
    const datasets = [
        { label: 'GGPC', data: Object.keys(this.config.sources).map(key => annualGGPC[key] || 0), backgroundColor: this.config.plantColors.ggpc },
        { label: 'CDPC', data: Object.keys(this.config.sources).map(key => annualCDPC[key] || 0), backgroundColor: this.config.plantColors.cdpc },
    ];

    const ctx = document.getElementById('annualSummaryChart').getContext('2d');
    this.charts.annual = new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.values(this.config.sources).map(s => s.label), datasets },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true }, x: { title: { display: true, text: 'Total Annual CO₂ (t-CO₂)'}}}
        }
    });
  },
  
  renderDifferenceChart(data) {
    if (this.charts.difference) this.charts.difference.destroy();
    const diffData = data.ggpc.map((ggpcMonth, i) => ggpcMonth.total - data.cdpc[i].total);
    const backgroundColors = diffData.map(d => d >= 0 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(245, 158, 11, 0.7)');
    
    const ctx = document.getElementById('differenceChart').getContext('2d');
    this.charts.difference = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: this.config.monthNames, 
            datasets: [{ label: 'Difference (GGPC - CDPC)', data: diffData, backgroundColor: backgroundColors }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Difference: ${c.formattedValue} t-CO₂` }}},
            scales: { y: { beginAtZero: false, title: { display: true, text: 'GGPC higher <==> CDPC higher' } } }
        }
    });
  },

  // --- Configs and Handlers ---
  getMonthlyChartConfig() {
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (event, elements) => this.chartClickHandler(elements),
      plugins: {
        title: { display: false },
        legend: { position: this.dom.detailToggle.checked ? 'right' : 'top' },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.formattedValue} t-CO₂` } }
      },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, title: { display: true, text: 'CO₂ Emission (t-CO₂)' } } }
    }
  },

  setupEventListeners() {
    this.dom.yearSelect.addEventListener('change', () => this.loadAndRenderData());
    this.dom.detailToggle.addEventListener('change', () => this.loadAndRenderData());
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

  chartClickHandler(elements) {
    const tableRows = document.querySelectorAll('#vsTable tbody tr');
    if (!elements.length) return;
    const index = elements[0].index;

    if (index === this.state.highlightedIndex) {
      tableRows[index].classList.remove('highlight-row');
      this.state.highlightedIndex = null;
    } else {
      tableRows.forEach(row => row.classList.remove('highlight-row'));
      tableRows[index].classList.add('highlight-row');
      this.state.highlightedIndex = index;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());