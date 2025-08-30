// Global chart instance
let comparisonChart = null;

// --- UTILITY FUNCTIONS ---
function mapRecord(r) {
  const electricityCO2 = parseFloat(r.Electricity_CO2?.value || 0);
  const lpgCO2 = parseFloat(r.lpg_co2?.value || 0);
  const gasCO2 = parseFloat(r.Gas_CO2?.value || 0);
  const dieselCO2 = parseFloat(r.Diesel_CO2?.value || 0);
  const oilCO2 = parseFloat(r.OIL_CO2?.value || 0);
  return {
    month: new Date(r.Date_To?.value),
    plant: r.Plant_Location.value,
    electricityCO2,
    lpgCO2,
    gasCO2,
    dieselCO2,
    oilCO2,
    totalCO2: electricityCO2 + lpgCO2 + gasCO2 + dieselCO2 + oilCO2
  };
}

async function fetchKintoneData() {
  const response = await fetch('/.netlify/functions/kintone');
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// --- UI SETUP FUNCTIONS ---
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

function setupDropdowns() {
  document.querySelectorAll("select").forEach(select => {
    const iconWrapper = select.nextElementSibling;
    if (iconWrapper) {
        select.addEventListener("focus", () => iconWrapper.classList.add("rotate-180"));
        select.addEventListener("blur", () => iconWrapper.classList.remove("rotate-180"));
    }
  });
}

function setupYearSelect(allRecords) {
    const yearSelect = document.getElementById('year-select');
    if (!yearSelect) return [];

    const allYears = Array.from(new Set(
        allRecords.map(r => r.month.getFullYear())
    )).sort((a, b) => b - a);

    yearSelect.innerHTML = '';
    allYears.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
    });
    return allYears;
}

// --- RENDER FUNCTIONS ---
function renderTable(ggpcData, cdpcData) {
  const tbody = document.querySelector('#vsTable tbody');
  tbody.innerHTML = '';
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fields = ['electricityCO2', 'lpgCO2', 'gasCO2', 'dieselCO2', 'oilCO2'];

  months.forEach((monthName, index) => {
    const ggpc = ggpcData.find(r => r.month.getMonth() === index);
    const cdpc = cdpcData.find(r => r.month.getMonth() === index);
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';

    const monthCell = document.createElement('td');
    monthCell.textContent = monthName;
    monthCell.className = 'px-2 py-1 border font-semibold bg-gray-50 text-center';
    tr.appendChild(monthCell);

    const addCells = (record) => {
        fields.forEach(field => {
            const td = document.createElement('td');
            td.className = 'px-2 py-1 border text-center';
            const value = record ? record[field] : 0;
            td.textContent = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            tr.appendChild(td);
        });
    };
    
    addCells(ggpc);
    addCells(cdpc);
    tbody.appendChild(tr);
  });
}

function renderChart(ggpcData, cdpcData, selectedYear, isStacked) {
  const ctx = document.getElementById('comparisonChart').getContext('2d');
  if (comparisonChart) {
    comparisonChart.destroy();
  }
  
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const CO2_SOURCES = [
      { key: 'electricityCO2', label: 'Electricity', ggpcColor: 'rgba(59, 130, 246, 0.8)', cdpcColor: 'rgba(96, 165, 250, 0.8)' },
      { key: 'lpgCO2', label: 'LPG', ggpcColor: 'rgba(249, 115, 22, 0.8)', cdpcColor: 'rgba(251, 146, 60, 0.8)' },
      { key: 'gasCO2', label: 'Gas', ggpcColor: 'rgba(107, 114, 128, 0.8)', cdpcColor: 'rgba(156, 163, 175, 0.8)' },
      { key: 'dieselCO2', label: 'Diesel', ggpcColor: 'rgba(234, 179, 8, 0.8)', cdpcColor: 'rgba(250, 204, 21, 0.8)' },
      { key: 'oilCO2', label: 'Oil', ggpcColor: 'rgba(79, 70, 229, 0.8)', cdpcColor: 'rgba(129, 140, 248, 0.8)' }
  ];
  
  let datasets;
  if (isStacked) {
      datasets = [];
      CO2_SOURCES.forEach(source => {
          datasets.push({
              label: `GGPC ${source.label}`,
              data: months.map((_, i) => ggpcData.find(r => r.month.getMonth() === i)?.[source.key] || 0),
              backgroundColor: source.ggpcColor,
              stack: 'GGPC'
          });
          datasets.push({
              label: `CDPC ${source.label}`,
              data: months.map((_, i) => cdpcData.find(r => r.month.getMonth() === i)?.[source.key] || 0),
              backgroundColor: source.cdpcColor,
              stack: 'CDPC'
          });
      });
  } else {
      datasets = [
          {
              label: 'GGPC Total CO₂',
              data: months.map((_, i) => ggpcData.find(r => r.month.getMonth() === i)?.totalCO2 || 0),
              backgroundColor: 'rgba(59, 130, 246, 0.8)'
          },
          {
              label: 'CDPC Total CO₂',
              data: months.map((_, i) => cdpcData.find(r => r.month.getMonth() === i)?.totalCO2 || 0),
              backgroundColor: 'rgba(250, 204, 21, 0.8)'
          }
      ];
  }

  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: `Monthly CO₂ Emissions: GGPC vs. CDPC (${selectedYear})`, font: { size: 16, weight: 'bold' } },
        legend: { position: 'bottom' },
        tooltip: {
            callbacks: {
                label: (context) => `${context.dataset.label}: ${context.formattedValue} t-CO₂`
            }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, title: { display: true, text: 'CO₂ Emission (t-CO₂)' } }
      }
    }
  });
}

// --- MAIN DASHBOARD LOGIC ---
async function main() {
  const loader = document.getElementById('loader');
  try {
    const kintoneData = await fetchKintoneData();
    const allRecords = kintoneData.records.map(mapRecord);
    
    setupMobileNavigation();
    setupDropdowns();
    lucide.createIcons();
    const allYears = setupYearSelect(allRecords);

    const stackToggle = document.getElementById('stackToggle');
    const yearSelect = document.getElementById('year-select');

    function updateDashboard(selectedYear) {
      const isStacked = stackToggle.checked;
      const year = parseInt(selectedYear);
      
      const ggpcRecords = allRecords.filter(r => r.plant === 'GGPC' && r.month.getFullYear() === year);
      const cdpcRecords = allRecords.filter(r => r.plant === 'CDPC' && r.month.getFullYear() === year);

      renderTable(ggpcRecords, cdpcRecords);
      renderChart(ggpcRecords, cdpcRecords, selectedYear, isStacked);
    }

    stackToggle.addEventListener('change', () => updateDashboard(yearSelect.value));
    yearSelect.addEventListener('change', (e) => updateDashboard(e.target.value));

    if (allYears.length > 0) {
      updateDashboard(allYears[0]);
    }

  } catch (error) {
    console.error("Failed to initialize dashboard:", error);
    alert('Failed to load critical data. Please refresh the page.');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', main);