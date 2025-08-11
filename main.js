// --- Utility function to map a Kintone record into structured fields ---
function mapRecord(r) {
  return {
    // Dates
    dateFrom: r.Date_To?.value || '',

    // Production data
    inggotUsedPcs: parseFloat(r.Inggot_used_pcs?.value || 0),
    inggotUsedKg: parseFloat(r.Inggot_Used_Kg?.value || 0),
    goodsProducedKg: parseFloat(r.Goods_Produced_Kg?.value || 0),

    // Electricity
    electricityKWh: parseFloat(r.Electricity_KWhr?.value || 0),
    electricityCO2: parseFloat(r.Electricity_CO2?.value || 0),

    // LPG
    lpgKg: parseFloat(r.LPG_Total_Kg?.value || 0),
    lpgKWh: parseFloat(r.LPG_KWhr?.value || 0),
    lpgCO2: parseFloat(r.lpg_co2?.value || 0),

    // Fuels
    gasolineLiters: parseFloat(r.Gasoline_Liters?.value || 0),
    gasCO2: parseFloat(r.Gas_CO2?.value || 0),
    dieselLiters: parseFloat(r.Diesel_Liters?.value || 0),
    dieselCO2: parseFloat(r.Diesel_CO2?.value || 0),

    // Oil
    tellus46: parseFloat(r.Tellus_46?.value || 0),
    tellus32: parseFloat(r.Tellus_32?.value || 0),
    ep220: parseFloat(r.EP_220?.value || 0),
    pl1000: parseFloat(r.PL_1000?.value || 0),
    oilCO2: parseFloat(r.OIL_CO2?.value || 0),

    // Performance metrics
    energyIntensity: parseFloat(r.Energy_Intensity?.value || 0),
    operationsEquivalent: parseFloat(r.Operations_equivalent?.value || 0),
    co2IntensityPc: parseFloat(r.CO2_Intensity_pc?.value || 0),
    co2IntensityKg: parseFloat(r.CO2_Intensity_kg?.value || 0)
  };
}

// --- Fetch data from Netlify serverless function ---
async function fetchKintoneData(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// -- Convert date to short month label
function formatDateToMonth(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

// --- Render table helper ---
function renderTableRows(tableId, data) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = ''; // Clear old rows

  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.classList.add(rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50');

    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');

      // ✅ Format numbers with thousand separators
      if (typeof cell === 'number' && !isNaN(cell)) {
        td.textContent = Number.isInteger(cell)
          ? cell.toLocaleString('en-US')
          : cell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        td.textContent = cell;
      }

      td.classList.add('px-2', 'py-1', 'border', 'border-gray-500');
      if (cellIndex === 0) {
        td.classList.add('font-semibold');
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// --- Chart.js configuration factory ---
function createEnergyChart(ctx, title, goodsProducedKg, electricityKWh, lpgKWh, stacked = false) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Goods Produced (Kg)',
          data: goodsProducedKg,
          type: 'line',
          borderColor: 'blue',
          backgroundColor: 'blue',
          yAxisID: 'y',
          tension: 0.1,
          fill: false,
          pointStyle: 'circle',
          pointRadius: 5,
          pointBackgroundColor: 'blue'
        },
        {
          label: 'Electricity KWh',
          data: electricityKWh,
          backgroundColor: 'orange',
          yAxisID: 'y1',
          barPercentage: 0.7,
          categoryPercentage: 0.6,
          stack: stacked ? 'energy' : undefined
        },
        {
          label: 'LPG KWh',
          data: lpgKWh,
          backgroundColor: 'gray',
          yAxisID: 'y1',
          barPercentage: 0.7,
          categoryPercentage: 0.6,
          stack: stacked ? 'energy' : undefined
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Kilograms' },
          ticks: { callback: value => value.toLocaleString() },
          min: 0,
          max: 180000
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'KWh' },
          grid: { drawOnChartArea: false },
          ticks: { callback: value => value.toLocaleString() },
          min: 0,
          max: 600000,
          stacked: stacked
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: title, font: { size: 16, weight: 'bold' } }
      }
    }
  });
}

// --- Filter by year helper ---
function filterByYear(records, year) {
  return records.filter(r => {
    const recordYear = new Date(r.dateFrom).getFullYear();
    return recordYear === parseInt(year);
  });
}

// --- Main dashboard initialization ---
document.addEventListener('DOMContentLoaded', async function () {
  let ggpcChart, cdpcChart;

  const kintoneData = await fetchKintoneData('/.netlify/functions/kintone');

  const ggpcRecords = kintoneData.records
    .filter(r => r.Plant_Location.value === 'GGPC')
    .map(mapRecord);

  const cdpcRecords = kintoneData.records
    .filter(r => r.Plant_Location.value === 'CDPC')
    .map(mapRecord);

  ggpcRecords.sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
  cdpcRecords.sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));

  const ggpcCanvas = document.getElementById('ggpcEnergyChart');
  const cdpcCanvas = document.getElementById('cdpcEnergyChart');
  const yearSelect = document.getElementById('year-select');

  // --- Automatically generate year list based on data ---
  const allYears = Array.from(
    new Set([...ggpcRecords, ...cdpcRecords]
      .map(r => new Date(r.dateFrom).getFullYear())
    )
  ).sort((a, b) => b - a);

  // Populate dropdown
  yearSelect.innerHTML = '';
  allYears.forEach(year => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });

  // --- Update dashboard function ---
  function updateDashboard(selectedYear) {
    const filteredGGPC = filterByYear(ggpcRecords, selectedYear);
    const filteredCDPC = filterByYear(cdpcRecords, selectedYear);

    renderTableRows('ggpcTable', filteredGGPC.map(r => [
      formatDateToMonth(r.dateFrom),
      r.inggotUsedPcs,
      r.inggotUsedKg,
      r.goodsProducedKg,
      r.electricityKWh,
      r.electricityCO2,
      r.lpgKg,
      r.lpgKWh,
      r.lpgCO2,
      r.gasolineLiters,
      r.gasCO2,
      r.dieselLiters,
      r.dieselCO2,
      r.tellus46,
      r.tellus32,
      r.ep220,
      r.pl1000,
      r.oilCO2,
      r.energyIntensity,
      r.operationsEquivalent,
      r.co2IntensityPc,
      r.co2IntensityKg
    ]));

    renderTableRows('cdpcTable', filteredCDPC.map(r => [
      formatDateToMonth(r.dateFrom),
      r.inggotUsedPcs,
      r.inggotUsedKg,
      r.goodsProducedKg,
      r.electricityKWh,
      r.electricityCO2,
      r.lpgKg,
      r.lpgKWh,
      r.lpgCO2,
      r.gasolineLiters,
      r.gasCO2,
      r.dieselLiters,
      r.dieselCO2,
      r.tellus46,
      r.tellus32,
      r.ep220,
      r.pl1000,
      r.oilCO2,
      r.energyIntensity,
      r.operationsEquivalent,
      r.co2IntensityPc,
      r.co2IntensityKg
    ]));

    if (ggpcChart) ggpcChart.destroy();
    if (cdpcChart) cdpcChart.destroy();

    ggpcChart = createEnergyChart(
      ggpcCanvas.getContext('2d'),
      'GGPC ENERGY CONSUMPTION VS GOODS PRODUCED',
      filteredGGPC.map(r => r.goodsProducedKg),
      filteredGGPC.map(r => r.electricityKWh),
      filteredGGPC.map(r => r.lpgKWh),
      document.getElementById('stackToggle').checked
    );

    cdpcChart = createEnergyChart(
      cdpcCanvas.getContext('2d'),
      'CDPC ENERGY CONSUMPTION VS GOODS PRODUCED',
      filteredCDPC.map(r => r.goodsProducedKg),
      filteredCDPC.map(r => r.electricityKWh),
      filteredCDPC.map(r => r.lpgKWh),
      document.getElementById('stackToggle').checked
    );
  }

  // --- Toggle stacked view ---
  document.getElementById('stackToggle').addEventListener('change', function () {
    updateDashboard(yearSelect.value);
  });

  // --- Year filter ---
  yearSelect.addEventListener('change', (e) => {
    updateDashboard(e.target.value);
  });

  // --- Initial load using latest year ---
  updateDashboard(allYears[0]);
});

// --- Mobile nav menu ---
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('nav-toggle');
  const navMobile = document.getElementById('nav-mobile');

  navToggle.addEventListener('click', () => {
    const isHidden = navMobile.classList.contains('hidden');
    if (isHidden) {
      navMobile.classList.remove('hidden');
      void navMobile.offsetWidth;
      navMobile.classList.remove('opacity-0', '-translate-y-4');
      navMobile.classList.add('opacity-100', 'translate-y-0');
    } else {
      navMobile.classList.add('opacity-0', '-translate-y-4');
      navMobile.classList.remove('opacity-100', 'translate-y-0');
      setTimeout(() => {
        navMobile.classList.add('hidden');
      }, 300);
    }
    navToggle.classList.toggle('open');
  });

  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('#nav-menu a, #nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    const isIndex = href === 'index.html' &&
      (current === '' || current === '/' || current === 'index.html');
    link.classList.add(
      'relative', 'font-medium', 'text-gray-700', 'hover:text-blue-600',
      'after:content-[""]', 'after:absolute', 'after:left-0', 'after:-bottom-1',
      'after:w-0', 'after:h-[2px]', 'after:bg-blue-600',
      'after:transition-all', 'after:duration-300', 'hover:after:w-full'
    );
    if (href === current || isIndex) {
      link.classList.remove('text-gray-700');
      link.classList.add('text-blue-700', 'after:w-full');
    }
  });
});

// --- Loader hide after data load ---
document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  try {
    await fetchKintoneData('/.netlify/functions/kintone'); // Just to ensure it runs
  } catch (err) {
    console.error(err);
    alert('Failed to load data');
  } finally {
    loader.style.display = 'none';
  }
});
