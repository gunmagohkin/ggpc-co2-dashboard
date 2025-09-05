const Dashboard = {
  // --- Properties ---
  state: {
    records: [],
    year: new Date().getFullYear().toString(),
    highlightedIndices: {
      ggpc: null,
      cdpc: null,
    },
  },
  charts: {
    ggpc: null,
    cdpc: null,
  },
  dom: {
    loader: null,
    yearSelect: null,
    kpi: {}, // Will be populated in init
  },
  config: {
    monthNames: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    kintoneFields: {
      electricity_kwhr: 'Electricity_KWhr',
      electricity_co2: 'Electricity_CO2',
      lpg_kg: 'LPG_Total_Kg',
      lpg_kwhr: 'LPG_KWhr',
      lpg_co2: 'lpg_co2',
      diecasting_runtime: 'Diecasting_Runtime',
      machining_runtime: 'Machining_Runtime',
      total_runtime: 'Total_Runtime'
    }
  },

  // --- Initialization ---
  async init() {
    this.cacheDomElements();
    this.setupEventListeners();
    this.setupYearSelect();
    lucide.createIcons();
    await this.loadAndRenderData();
  },

  cacheDomElements() {
    this.dom.loader = document.getElementById('loader');
    this.dom.yearSelect = document.getElementById('year-select');
    this.dom.kpi = {
      ggpc: {
        energy: document.getElementById('ggpc-kpi-energy'),
        runtime: document.getElementById('ggpc-kpi-runtime'),
        efficiency: document.getElementById('ggpc-kpi-efficiency'),
      },
      cdpc: {
        energy: document.getElementById('cdpc-kpi-energy'),
        runtime: document.getElementById('cdpc-kpi-runtime'),
        efficiency: document.getElementById('cdpc-kpi-efficiency'),
      },
    };
  },
  
  // --- Data Handling ---
  async fetchData(year) {
    this.dom.loader.style.display = 'flex';
    try {
      const response = await fetch(`/.netlify/functions/kintone?year=${year}`);
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

  processData() {
    const processed = {
      ggpc: Array(12).fill(null).map(() => ({})),
      cdpc: Array(12).fill(null).map(() => ({})),
    };

    for (const record of this.state.records) {
      const plant = record['Plant_Location']?.value;
      const dateStr = record['Date_To']?.value;
      if (!plant || !dateStr || !processed[plant.toLowerCase()]) continue;

      const monthIndex = new Date(dateStr).getMonth();
      const monthlyData = processed[plant.toLowerCase()][monthIndex];

      for (const [key, field] of Object.entries(this.config.kintoneFields)) {
        monthlyData[key] = (monthlyData[key] || 0) + (parseFloat(record[field]?.value) || 0);
      }
    }
    
    // Pre-calculate totals for both plants
    ['ggpc', 'cdpc'].forEach(plant => {
        processed[plant].forEach(monthData => {
            monthData.total_energy_kwhr = (monthData.electricity_kwhr || 0) + (monthData.lpg_kwhr || 0);
        });
    });

    return processed;
  },

  // --- Rendering ---
  async loadAndRenderData() {
    this.state.year = this.dom.yearSelect.value;
    await this.fetchData(this.state.year);
    const processedData = this.processData();
    
    this.renderTables(processedData);
    this.renderKpiCards(processedData);
    this.renderCharts(processedData);
  },
  
  renderTables(data) {
    this._renderSingleTable('ggpcTable', data.ggpc);
    this._renderSingleTable('cdpcTable', data.cdpc);
  },

  _renderSingleTable(tableId, monthlyData) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';
    const fields = ['electricity_kwhr', 'electricity_co2', 'lpg_kg', 'lpg_kwhr', 'lpg_co2', 'diecasting_runtime', 'machining_runtime', 'total_runtime'];
    
    monthlyData.forEach((totals, index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="px-2 py-1 border font-semibold bg-gray-50 text-center">${this.config.monthNames[index]}</td>
        ${fields.map(field => `<td class="px-2 py-1 border text-center">${this.formatNumber(totals[field] || 0)}</td>`).join('')}
      `;
    });
  },

  renderKpiCards(data) {
    ['ggpc', 'cdpc'].forEach(plant => {
      const annualTotals = data[plant].reduce((acc, month) => {
        acc.energy += month.total_energy_kwhr || 0;
        acc.runtime += month.total_runtime || 0;
        return acc;
      }, { energy: 0, runtime: 0 });

      const efficiency = annualTotals.runtime > 0 ? annualTotals.energy / annualTotals.runtime : 0;

      this.dom.kpi[plant].energy.textContent = `${this.formatNumber(annualTotals.energy, 0)} KWh`;
      this.dom.kpi[plant].runtime.textContent = `${this.formatNumber(annualTotals.runtime, 0)} Hrs`;
      this.dom.kpi[plant].efficiency.textContent = `${this.formatNumber(efficiency)} KWh/hr`;
    });
  },

  renderCharts(data) {
    this.charts.ggpc = this._renderSingleChart('ggpcChart', 'GGPC', data.ggpc, this.charts.ggpc);
    this.charts.cdpc = this._renderSingleChart('cdpcChart', 'CDPC', data.cdpc, this.charts.cdpc);
    this.updateChartVisibility();
  },

  _renderSingleChart(canvasId, title, monthlyData, existingChart) {
    if (existingChart) existingChart.destroy();

    const ctx = document.getElementById(canvasId).getContext('2d');
    const chartData = {
      labels: this.config.monthNames,
      datasets: [
        // Breakdown Energy
        { label: 'Electricity (KWhr)', data: monthlyData.map(d => d.electricity_kwhr), yAxisID: 'y', backgroundColor: 'rgba(59, 130, 246, 0.8)', hidden: true },
        { label: 'LPG (KWhr)', data: monthlyData.map(d => d.lpg_kwhr), yAxisID: 'y', backgroundColor: 'rgba(249, 115, 22, 0.8)', hidden: true },
        // Total Energy (Stacked)
        { label: 'Electricity (KWhr)', data: monthlyData.map(d => d.electricity_kwhr), yAxisID: 'y', backgroundColor: 'rgba(59, 130, 246, 0.9)', stack: 'energy', hidden: false },
        { label: 'LPG (KWhr)', data: monthlyData.map(d => d.lpg_kwhr), yAxisID: 'y', backgroundColor: 'rgba(249, 115, 22, 0.9)', stack: 'energy', hidden: false },
        // Breakdown Runtime
        { label: 'Diecasting (hrs)', type: 'line', data: monthlyData.map(d => d.diecasting_runtime), yAxisID: 'y1', borderColor: 'rgba(34, 197, 94, 1)', tension: 0.1, borderDash: [5, 5], hidden: true },
        { label: 'Machining (hrs)', type: 'line', data: monthlyData.map(d => d.machining_runtime), yAxisID: 'y1', borderColor: 'rgba(239, 68, 68, 1)', tension: 0.1, borderDash: [10, 5], hidden: true },
        // Total Runtime
        { label: 'Total Runtime (hrs)', type: 'line', data: monthlyData.map(d => d.total_runtime), yAxisID: 'y1', borderColor: 'rgba(168, 85, 247, 1)', borderWidth: 3, tension: 0.1, hidden: false },
      ]
    };

    return new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: this.getChartBaseConfig(title, canvasId.replace('Chart', 'Table'))
    });
  },

  getChartBaseConfig(title, tableId) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (event, elements) => this.chartClickHandler(elements, tableId),
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Energy (KWhr)' }, beginAtZero: true, stacked: true },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Runtime (hours)' }, beginAtZero: true, grid: { drawOnChartArea: false } }
      },
      plugins: { title: { display: false }, legend: { position: 'bottom' } },
    };
  },

  // --- Event Handlers & UI Updates ---
  setupEventListeners() {
    this.dom.yearSelect.addEventListener('change', () => this.loadAndRenderData());
    document.querySelectorAll('input[name="energyView"], input[name="runtimeView"]').forEach(radio => {
        radio.addEventListener('change', () => this.updateChartVisibility());
    });
    // Mobile nav, etc.
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      const menu = document.getElementById('mobile-menu');
      menu.style.maxHeight = (menu.style.maxHeight === '0px' || !menu.style.maxHeight) ? `${menu.scrollHeight}px` : '0px';
    });
  },

  updateChartVisibility() {
      const energyView = document.querySelector('input[name="energyView"]:checked').value;
      const runtimeView = document.querySelector('input[name="runtimeView"]:checked').value;

      [this.charts.ggpc, this.charts.cdpc].forEach(chart => {
          if (!chart) return;
          // Energy visibility
          chart.data.datasets[0].hidden = energyView !== 'breakdown'; // Elec Breakdown
          chart.data.datasets[1].hidden = energyView !== 'breakdown'; // LPG Breakdown
          chart.data.datasets[2].hidden = energyView !== 'total';     // Elec Total
          chart.data.datasets[3].hidden = energyView !== 'total';     // LPG Total
          chart.options.scales.y.stacked = energyView === 'total';
          
          // Runtime visibility
          chart.data.datasets[4].hidden = runtimeView !== 'breakdown'; // Diecast
          chart.data.datasets[5].hidden = runtimeView !== 'breakdown'; // Machining
          chart.data.datasets[6].hidden = runtimeView !== 'total';     // Total
          
          chart.update();
      });
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

  setupYearSelect() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2020; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      this.dom.yearSelect.appendChild(option);
    }
  },

  // --- Utilities ---
  formatNumber(value, digits = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0.00';
    const options = digits === 0 
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } 
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return new Intl.NumberFormat('en-US', options).format(value);
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());