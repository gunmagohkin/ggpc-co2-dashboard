// Global variables
let allRecords = [];
let ggpcEnergyChart;
let cdpcEnergyChart;

// Month names for display
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

// Configuration for data mapping - updated to include Total_Runtime
const DATA_CONFIG = {
  electricity_kwhr: 'Electricity_KWhr',
  electricity_co2: 'Electricity_CO2',
  lpg_kg: 'LPG_Total_Kg',
  lpg_kwhr: 'LPG_KWhr',
  lpg_co2: 'lpg_co2',
  diecasting_runtime: 'Diecasting_Runtime',
  machining_runtime: 'Machining_Runtime',
  total_runtime: 'Total_Runtime'
};

// --- UTILITY FUNCTIONS ---
function formatNumber(value) {
  if (value === 0) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

async function fetchKintoneAllData(year) {
  let url = '/.netlify/functions/kintone?year=' + year;
  const response = await fetch(url);
  if (!response.ok) {
    console.error('Failed to fetch data');
    return [];
  }
  const data = await response.json();
  return data.records || [];
}

function groupRecordsByMonth(records) {
  const grouped = {
    GGPC: {},
    CDPC: {}
  };
  
  records.forEach(record => {
    const dateStr = record['Date_To']?.value;
    const plant = record['Plant_Location']?.value;
    
    if (!dateStr || !plant) return;
    
    const date = new Date(dateStr);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const plantKey = plant === 'GGPC' ? 'GGPC' : 'CDPC';
    
    if (!grouped[plantKey][monthKey]) {
      grouped[plantKey][monthKey] = [];
    }
    grouped[plantKey][monthKey].push(record);
  });
  
  return grouped;
}

function calculateMonthlyTotals(records) {
  return records.reduce((totals, record) => {
    Object.keys(DATA_CONFIG).forEach(key => {
      const fieldKey = DATA_CONFIG[key];
      const value = parseFloat(record[fieldKey]?.value) || 0;
      totals[key] = (totals[key] || 0) + value;
    });
    return totals;
  }, {});
}

// --- TABLE RENDERING ---
function renderTable(tableId, company, groupedData, selectedYear) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  const companyData = groupedData[company] || {};
  
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
    const monthRecords = companyData[monthKey] || [];
    const totals = calculateMonthlyTotals(monthRecords);
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    const monthCell = document.createElement('td');
    monthCell.className = 'px-2 py-1 border font-semibold bg-gray-50 text-center';
    monthCell.textContent = MONTH_NAMES[month - 1];
    row.appendChild(monthCell);
    
    const fields = ['electricity_kwhr', 'electricity_co2', 'lpg_kg', 'lpg_kwhr', 'lpg_co2', 'diecasting_runtime', 'machining_runtime', 'total_runtime'];
    fields.forEach((field) => {
      const cell = document.createElement('td');
      cell.className = 'px-2 py-1 border text-center';
      const value = totals[field] || 0;
      cell.textContent = formatNumber(value);
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  }
}

// --- CHART RENDERING ---
function renderChart(chartId, company, groupedData, selectedYear) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const companyData = groupedData[company] || {};
  
  const labels = [];
  const electricityData = [];
  const lpgData = [];
  const diecastingData = [];
  const machiningData = [];
  const totalRuntimeData = [];
  
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
    const monthRecords = companyData[monthKey] || [];
    const totals = calculateMonthlyTotals(monthRecords);
    
    labels.push(MONTH_NAMES_SHORT[month - 1]);
    electricityData.push(totals.electricity_kwhr || 0);
    lpgData.push(totals.lpg_kwhr || 0);
    diecastingData.push(totals.diecasting_runtime || 0);
    machiningData.push(totals.machining_runtime || 0);
    totalRuntimeData.push(totals.total_runtime || 0);
  }
  
  const existingChart = company === 'GGPC' ? ggpcEnergyChart : cdpcEnergyChart;
  if (existingChart) {
    existingChart.destroy();
  }
  
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Electricity (KWhr)',
          data: electricityData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'LPG (KWhr)',
          data: lpgData,
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Diecasting Runtime (hrs)',
          data: diecastingData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          yAxisID: 'y1',
          type: 'line',
          fill: false
        },
        {
          label: 'Machining Runtime (hrs)',
          data: machiningData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          yAxisID: 'y1',
          type: 'line',
          fill: false
        },
        {
          label: 'Total Runtime (hrs)',
          data: totalRuntimeData,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 3,
          yAxisID: 'y1',
          type: 'line',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${company} - Energy vs Runtime (${selectedYear})`
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Energy (KWhr)'
          },
          beginAtZero: true,
          stacked: false
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Runtime (hours)'
          },
          beginAtZero: true,
          stacked: false,
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
  
  if (company === 'GGPC') {
    ggpcEnergyChart = chart;
  } else {
    cdpcEnergyChart = chart;
  }
}

// --- YEAR SELECT SETUP ---
function setupYearSelect() {
  const yearSelect = document.getElementById('year-select');
  if (!yearSelect) return;
  
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  
  for (let year = currentYear; year >= 2020; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }
}

// --- MOBILE NAVIGATION ---
function setupMobileNavigation() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
        const isClosed = mobileMenu.style.maxHeight === '' || mobileMenu.style.maxHeight === '0px';
        mobileMenu.style.maxHeight = isClosed ? mobileMenu.scrollHeight + "px" : '0px';
    });
  }
}

// --- DROPDOWN ANIMATIONS ---
function setupDropdowns() {
  document.querySelectorAll("select").forEach(select => {
    const iconWrapper = select.nextElementSibling;
    if (iconWrapper) {
        select.addEventListener("focus", () => iconWrapper.classList.add("rotate-180"));
        select.addEventListener("blur", () => iconWrapper.classList.remove("rotate-180"));
    }
  });
}

// --- ENHANCED TOGGLE FUNCTIONALITY ---
function setupToggleButtons() {
  const energyToggle = document.getElementById('energyStackToggle');
  const runtimeToggle = document.getElementById('runtimeStackToggle');
  
  if (energyToggle) {
    energyToggle.addEventListener('change', (e) => {
      const isStacked = e.target.checked;
      updateChartStacking('energy', isStacked);
      
      const label = document.querySelector('label[for="energyStackToggle"]');
      if (label) {
        if (isStacked) {
          label.classList.add('text-blue-600', 'font-semibold');
          label.textContent = 'Total Electricity & LPG (Stacked ✓)';
        } else {
          label.classList.remove('text-blue-600', 'font-semibold');
          label.textContent = 'Total Electricity & LPG';
        }
      }
      showToast(isStacked ? 'Energy charts stacked' : 'Energy charts unstacked', 'success');
    });
  }
  
  if (runtimeToggle) {
    runtimeToggle.addEventListener('change', (e) => {
      const isStacked = e.target.checked;
      updateChartStacking('runtime', isStacked);
      
      const label = document.querySelector('label[for="runtimeStackToggle"]');
      if (label) {
        if (isStacked) {
          label.classList.add('text-green-600', 'font-semibold');
          label.textContent = 'Total Runtime (Combined View ✓)';
        } else {
          label.classList.remove('text-green-600', 'font-semibold');
          label.textContent = 'Total Diecast Runtime & Machining Runtime';
        }
      }
      showToast(isStacked ? 'Runtime view combined' : 'Runtime view separated', 'success');
    });
  }
}

function updateChartStacking(type, isStacked) {
  if (ggpcEnergyChart) {
    updateSingleChart(ggpcEnergyChart, type, isStacked);
  }
  if (cdpcEnergyChart) {
    updateSingleChart(cdpcEnergyChart, type, isStacked);
  }
}

function updateSingleChart(chart, type, isStacked) {
  if (type === 'energy') {
    chart.options.scales.y.stacked = isStacked;
    chart.data.datasets[0].stack = isStacked ? 'energy' : undefined;
    chart.data.datasets[1].stack = isStacked ? 'energy' : undefined;
    
    if (isStacked) {
      chart.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.9)';
      chart.data.datasets[1].backgroundColor = 'rgba(249, 115, 22, 0.9)';
    } else {
      chart.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.8)';
      chart.data.datasets[1].backgroundColor = 'rgba(249, 115, 22, 0.8)';
    }
    
  } else if (type === 'runtime') {
    if (isStacked) {
      if (chart.data.datasets[2]) chart.data.datasets[2].hidden = true;
      if (chart.data.datasets[3]) chart.data.datasets[3].hidden = true;
      if (chart.data.datasets[4]) chart.data.datasets[4].hidden = true;
      
      const combinedRuntimeData = chart.data.datasets[2].data.map((diecast, index) => {
        const machining = chart.data.datasets[3].data[index] || 0;
        return diecast + machining;
      });
      
      let combinedDataset = chart.data.datasets.find(d => d.label === 'Total Combined Runtime (hrs)');
      if (!combinedDataset) {
        combinedDataset = {
          label: 'Total Combined Runtime (hrs)',
          data: combinedRuntimeData,
          backgroundColor: 'rgba(168, 85, 247, 0.3)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 3,
          yAxisID: 'y1',
          type: 'line',
          fill: true,
          tension: 0.4
        };
        chart.data.datasets.push(combinedDataset);
      } else {
        combinedDataset.data = combinedRuntimeData;
        combinedDataset.hidden = false;
      }
    } else {
      if (chart.data.datasets[2]) chart.data.datasets[2].hidden = false;
      if (chart.data.datasets[3]) chart.data.datasets[3].hidden = false;
      if (chart.data.datasets[4]) chart.data.datasets[4].hidden = false;
      
      const combinedDataset = chart.data.datasets.find(d => d.label === 'Total Combined Runtime (hrs)');
      if (combinedDataset) {
        combinedDataset.hidden = true;
      }
    }
  }
  chart.update('active');
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-20 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium z-50 transition-all duration-300 transform translate-x-full`;
  
  if (type === 'success') toast.classList.add('bg-green-500');
  else if (type === 'error') toast.classList.add('bg-red-500');
  else toast.classList.add('bg-blue-500');
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.remove('translate-x-full'), 10);
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// --- LOADER FUNCTIONS ---
function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'flex';
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

// --- MAIN DATA LOADING AND RENDERING ---
async function loadAndRenderData(selectedYear) {
  showLoader();
  
  try {
    allRecords = await fetchKintoneAllData(selectedYear);
    const groupedData = groupRecordsByMonth(allRecords);
    
    renderTable('ggpcTable', 'GGPC', groupedData, selectedYear);
    renderTable('cdpcTable', 'CDPC', groupedData, selectedYear);
    
    renderChart('ggpcEnergyChart', 'GGPC', groupedData, selectedYear);
    renderChart('cdpcEnergyChart', 'CDPC', groupedData, selectedYear);
    
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    hideLoader();
  }
}

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  setupYearSelect();
  setupMobileNavigation();
  setupToggleButtons();
  setupDropdowns();
  lucide.createIcons();
  
  const yearSelect = document.getElementById('year-select');
  const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear().toString();
  
  await loadAndRenderData(selectedYear);
  
  if (yearSelect) {
    yearSelect.addEventListener('change', async () => {
      const newYear = yearSelect.value;
      await loadAndRenderData(newYear);
    });
  }
});