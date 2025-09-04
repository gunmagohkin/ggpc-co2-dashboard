// Global chart instances
let ggpcChart, cdpcChart;

// --- UTILITY FUNCTIONS ---
function mapRecord(r) {
  console.log('Mapping record:', r); // Debug log
  return {
    dateFrom: r.Date_To?.value || '',
    electricityCO2: parseFloat(r.Electricity_CO2?.value || 0),
    lpgCO2: parseFloat(r.lpg_co2?.value || 0),
    gasCO2: parseFloat(r.Gas_CO2?.value || 0),
    dieselCO2: parseFloat(r.Diesel_CO2?.value || 0),
    oilCO2: parseFloat(r.OIL_CO2?.value || 0),
    Plant_Location: r.Plant_Location?.value || ''
  };
}

async function fetchKintoneData(endpoint) {
  console.log('Fetching data from:', endpoint); // Debug log
  const response = await fetch(endpoint);
  if (!response.ok) {
    console.error('Fetch failed with status:', response.status);
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  const data = await response.json();
  console.log('Fetched data:', data); // Debug log
  return data;
}

function filterByYear(records, year) {
  console.log(`Filtering ${records.length} records by year ${year}`); // Debug log
  const filtered = records.filter(r => new Date(r.dateFrom).getFullYear() === parseInt(year));
  console.log(`Found ${filtered.length} records for year ${year}`); // Debug log
  return filtered;
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
    if (!yearSelect) {
        console.error('Year select element not found');
        return [];
    }

    const allYears = Array.from(new Set(
        allRecords.map(r => new Date(r.dateFrom).getFullYear())
    )).sort((a, b) => b - a);

    console.log('Available years:', allYears); // Debug log

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
function renderTable(tableId, records) {
  console.log(`Rendering table ${tableId} with ${records.length} records`); // Debug log
  
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Table with id ${tableId} not found`);
    return;
  }
  
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error(`Tbody not found in table ${tableId}`);
    return;
  }
  
  tbody.innerHTML = '';
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fields = ['electricityCO2', 'lpgCO2', 'gasCO2', 'dieselCO2', 'oilCO2'];

  months.forEach((monthName, index) => {
    const record = records.find(r => new Date(r.dateFrom).getMonth() === index);
    console.log(`Month ${monthName} (${index}):`, record); // Debug log
    
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';

    const monthCell = document.createElement('td');
    monthCell.textContent = monthName;
    monthCell.className = 'px-2 py-1 border font-semibold bg-gray-50 text-center';
    tr.appendChild(monthCell);

    fields.forEach(field => {
      const td = document.createElement('td');
      td.className = 'px-2 py-1 border text-center';
      const value = record ? record[field] : 0;
      td.textContent = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  
  console.log(`Table ${tableId} rendered with ${tbody.children.length} rows`); // Debug log
}

function renderChart(canvasId, company, data, selectedYear, isStacked) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  
  if (!ctx) {
    console.error(`Canvas element ${canvasId} not found`);
    return;
  }
  
  // Destroy existing chart
  if (company === 'GGPC' && ggpcChart) ggpcChart.destroy();
  if (company === 'CDPC' && cdpcChart) cdpcChart.destroy();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Electricity', data: data.Electricity, backgroundColor: 'rgba(59, 130, 246, 0.8)', stack: isStacked ? 'co2' : undefined },
        { label: 'LPG', data: data.LPG, backgroundColor: 'rgba(249, 115, 22, 0.8)', stack: isStacked ? 'co2' : undefined },
        { label: 'Gas', data: data.Gas, backgroundColor: 'rgba(107, 114, 128, 0.8)', stack: isStacked ? 'co2' : undefined },
        { label: 'Diesel', data: data.Diesel, backgroundColor: 'rgba(234, 179, 8, 0.8)', stack: isStacked ? 'co2' : undefined },
        { label: 'Oil', data: data.Oil, backgroundColor: 'rgba(79, 70, 229, 0.8)', stack: isStacked ? 'co2' : undefined }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: `${company} COâ‚‚ Emissions (${selectedYear})`, font: { size: 16, weight: 'bold' } },
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.formattedValue} t-COâ‚‚`
          }
        }
      },
      scales: {
        x: { stacked: isStacked, grid: { display: false } },
        y: {
          stacked: isStacked,
          beginAtZero: true,
          title: { display: true, text: 'COâ‚‚ Emission (t-COâ‚‚)' }
        }
      }
    }
  });

  if (company === 'GGPC') ggpcChart = chart;
  if (company === 'CDPC') cdpcChart = chart;
}

// --- MAIN DASHBOARD LOGIC ---
async function main() {
  const loader = document.getElementById('loader');
  try {
    console.log('Starting dashboard initialization...'); // Debug log
    
    const kintoneData = await fetchKintoneData('/.netlify/functions/kintone');
    console.log('Raw Kintone data structure:', kintoneData); // Debug log
    
    if (!kintoneData || !kintoneData.records) {
      throw new Error('Invalid data structure received from Kintone');
    }
    
    const allRecords = kintoneData.records.map(mapRecord);
    console.log('Mapped records:', allRecords); // Debug log

    // **FIXED: Plant_Location filtering**
    const allGGPC = allRecords.filter(r => r.Plant_Location === 'GGPC').sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
    const allCDPC = allRecords.filter(r => r.Plant_Location === 'CDPC').sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
    
    console.log('GGPC records:', allGGPC); // Debug log
    console.log('CDPC records:', allCDPC); // Debug log
    
    // UI Setup
    setupMobileNavigation();
    setupDropdowns();
    
    // Check if lucide is available
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    const allYears = setupYearSelect(allRecords);

    const stackCheckbox = document.getElementById('stackToggle');
    const yearSelect = document.getElementById('year-select');

    if (!stackCheckbox || !yearSelect) {
      console.error('Required UI elements not found');
      return;
    }

    function updateDashboard(selectedYear) {
      console.log(`Updating dashboard for year: ${selectedYear}`); // Debug log
      
      const isStacked = stackCheckbox.checked;
      const ggpcRecords = filterByYear(allGGPC, selectedYear);
      const cdpcRecords = filterByYear(allCDPC, selectedYear);

      // Render Tables
      renderTable('ggpcCo2Table', ggpcRecords);
      renderTable('cdpcCo2Table', cdpcRecords);

      // Prepare Chart Data
      const fillArray = (records, key) => {
        const arr = Array(12).fill(0);
        records.forEach(r => {
          const m = new Date(r.dateFrom).getMonth();
          if (m >= 0 && m < 12) { // Validate month index
            arr[m] = r[key];
          }
        });
        return arr;
      };

      const ggpcData = {
        Electricity: fillArray(ggpcRecords, 'electricityCO2'),
        LPG: fillArray(ggpcRecords, 'lpgCO2'),
        Gas: fillArray(ggpcRecords, 'gasCO2'),
        Diesel: fillArray(ggpcRecords, 'dieselCO2'),
        Oil: fillArray(ggpcRecords, 'oilCO2'),
      };

      const cdpcData = {
        Electricity: fillArray(cdpcRecords, 'electricityCO2'),
        LPG: fillArray(cdpcRecords, 'lpgCO2'),
        Gas: fillArray(cdpcRecords, 'gasCO2'),
        Diesel: fillArray(cdpcRecords, 'dieselCO2'),
        Oil: fillArray(cdpcRecords, 'oilCO2'),
      };

      console.log('GGPC chart data:', ggpcData); // Debug log
      console.log('CDPC chart data:', cdpcData); // Debug log

      // Render Charts
      renderChart('co2ChartGGPC', 'GGPC', ggpcData, selectedYear, isStacked);
      renderChart('co2ChartCDPC', 'CDPC', cdpcData, selectedYear, isStacked);
    }

    // Event Listeners
    stackCheckbox.addEventListener('change', () => updateDashboard(yearSelect.value));
    yearSelect.addEventListener('change', (e) => updateDashboard(e.target.value));

    // Initial Load
    if (allYears.length > 0) {
      console.log('Initializing with year:', allYears[0]); // Debug log
      updateDashboard(allYears[0]);
    } else {
      console.warn('No years available for initialization');
    }

  } catch (error) {
    console.error("Failed to initialize dashboard:", error);
    alert('Failed to load critical data. Please refresh the page.');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', main);