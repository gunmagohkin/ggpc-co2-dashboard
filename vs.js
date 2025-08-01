// Keep a reference to all created charts
const charts = {};

// --- Utility function to map a Kintone record into structured fields ---
function mapRecord(r) {
  return {
    month: r.Date_To?.value || '',
    plant: r.Plant_Location.value,
    electricityCO2: parseFloat(r.Electricity_CO2?.value || 0),
    lpgCO2: parseFloat(r.lpg_co2?.value || 0),
    gasCO2: parseFloat(r.Gas_CO2?.value || 0),
    dieselCO2: parseFloat(r.Diesel_CO2?.value || 0),
    oilCO2: parseFloat(r.OIL_CO2?.value || 0)
  };
}

// Format date to JAN/FEB/MAR
function formatDateToMonth(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

// --- Fetch data from Netlify serverless function ---
async function fetchKintoneData(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// Render table rows dynamically
function renderVsTable(data) {
  const tbody = document.querySelector('#vsTable tbody');
  tbody.innerHTML = '';

  const months = [
    'JAN','FEB','MAR','APR','MAY','JUN',
    'JUL','AUG','SEP','OCT','NOV','DEC'
  ];

  months.forEach(month => {
    const ggpc = data.ggpc.find(d => formatDateToMonth(d.month) === month);
    const cdpc = data.cdpc.find(d => formatDateToMonth(d.month) === month);

    const tr = document.createElement('tr');
    tr.classList.add('border', 'border-black');
    if (['FEB','APR','JUN','AUG','OCT','DEC'].includes(month)) {
      tr.classList.add('bg-gray-50');
    }

    const cell = (value, bold=false) => {
      const td = document.createElement('td');
      td.classList.add('border','border-black','text-center','px-2','py-1');
      if (bold) td.classList.add('font-semibold');
      td.textContent = value !== undefined ? value : '–';
      return td;
    };

    // Month
    tr.appendChild(cell(month, true));

    // GGPC values
    if (ggpc) {
      tr.appendChild(cell(ggpc.electricityCO2.toFixed(3)));
      tr.appendChild(cell(ggpc.lpgCO2.toFixed(3)));
      tr.appendChild(cell(ggpc.gasCO2.toFixed(3)));
      tr.appendChild(cell(ggpc.dieselCO2.toFixed(3)));
      tr.appendChild(cell(ggpc.oilCO2.toFixed(3)));
    } else {
      for (let i = 0; i < 5; i++) tr.appendChild(cell('–'));
    }

    // CDPC values
    if (cdpc) {
      tr.appendChild(cell(cdpc.electricityCO2.toFixed(3)));
      tr.appendChild(cell(cdpc.lpgCO2.toFixed(3)));
      tr.appendChild(cell(cdpc.gasCO2.toFixed(3)));
      tr.appendChild(cell(cdpc.dieselCO2.toFixed(3)));
      tr.appendChild(cell(cdpc.oilCO2.toFixed(3)));
    } else {
      for (let i = 0; i < 5; i++) tr.appendChild(cell('–'));
    }

    tbody.appendChild(tr);
  });
}

// Chart rendering with destroy safeguard
function createChart(canvasId, title, ggpcData, cdpcData) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  // Destroy previous chart if it exists
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }

  const energyLabels = ['Electricity', 'LPG', 'Gas', 'Diesel', 'Oil'];

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: energyLabels,
      datasets: [
        {
          label: 'GGPC',
          data: ggpcData,
          backgroundColor: 'rgba(59,130,246,0.8)',
          barPercentage: 0.4,
          categoryPercentage: 0.5
        },
        {
          label: 'CDPC',
          data: cdpcData,
          backgroundColor: 'rgba(251,191,36,0.8)',
          barPercentage: 0.4,
          categoryPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: title }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'CO₂ Emission' } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const yearSelect = document.getElementById('year-select');
  const loader = document.getElementById('loader');
  const months = [
    'JAN','FEB','MAR','APR','MAY','JUN',
    'JUL','AUG','SEP','OCT','NOV','DEC'
  ];

  const pickMonth = (records, month) => {
    const rec = records.find(r => formatDateToMonth(r.month) === month);
    return rec
      ? [
          rec.electricityCO2,
          rec.lpgCO2,
          rec.gasCO2,
          rec.dieselCO2,
          rec.oilCO2
        ]
      : [0, 0, 0, 0, 0];
  };

  let allRecords = []; // store raw data globally

  function renderDashboard(selectedYear) {
    const selectedYearInt = parseInt(selectedYear);

    const ggpc = allRecords
      .filter(r => r.plant === 'GGPC' && new Date(r.month).getFullYear() === selectedYearInt)
      .sort((a,b)=>new Date(a.month)-new Date(b.month));

    const cdpc = allRecords
      .filter(r => r.plant === 'CDPC' && new Date(r.month).getFullYear() === selectedYearInt)
      .sort((a,b)=>new Date(a.month)-new Date(b.month));

    renderVsTable({ ggpc, cdpc });

    months.forEach(month => {
      const canvasId = `${month.toLowerCase()}Chart`;
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        createChart(
          canvasId,
          `${month} CO₂ Emissions (${selectedYear})`,
          pickMonth(ggpc, month),
          pickMonth(cdpc, month)
        );
      }
    });
  }

  try {
    const kintoneData = await fetchKintoneData('/.netlify/functions/kintone');
    allRecords = kintoneData.records.map(mapRecord);

    // --- Generate unique years from data ---
    const years = Array.from(
      new Set(allRecords.map(r => new Date(r.month).getFullYear()))
    ).sort((a, b) => b - a); // descending

    // Populate year dropdown
    yearSelect.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });

    // Render initial dashboard for latest year
    renderDashboard(years[0]);

    yearSelect.addEventListener('change', e => {
      renderDashboard(e.target.value);
    });

    new Swiper('.swiper-container', {
      direction: 'horizontal',
      loop: true,
      slidesPerView: 1,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    });

  } catch (err) {
    console.error(err);
    alert('Failed to load data');
  } finally {
    loader.style.display = 'none';
  }
});
