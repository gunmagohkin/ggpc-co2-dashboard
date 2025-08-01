// --- Utility function to map a Kintone record into structured fields ---
function mapRecord(r) {
  return {
    dateFrom: r.Date_To?.value || '',
    electricityCO2: parseFloat(r.Electricity_CO2?.value || 0),
    lpgCO2: parseFloat(r.lpg_co2?.value || 0),
    gasCO2: parseFloat(r.Gas_CO2?.value || 0),
    dieselCO2: parseFloat(r.Diesel_CO2?.value || 0),
    oilCO2: parseFloat(r.OIL_CO2?.value || 0)
  };
}

// --- Fetch data from Netlify serverless function ---
async function fetchKintoneData(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// --- Render CO2 table ---
function renderCO2Table(recordsGGPC, recordsCDPC) {
  const tbody = document.getElementById('co2TableBody');
  tbody.innerHTML = '';

  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  months.forEach((month, index) => {
    const g = recordsGGPC.find(r => new Date(r.dateFrom).getMonth() === index);
    const c = recordsCDPC.find(r => new Date(r.dateFrom).getMonth() === index);

    const tr = document.createElement('tr');
    if (index % 2 === 1) tr.classList.add('bg-gray-50');
    tr.classList.add('border','border-black');

    // Month column
    const tdMonth = document.createElement('td');
    tdMonth.textContent = month;
    tdMonth.className = 'border border-black px-2 py-1 font-semibold';
    tr.appendChild(tdMonth);

    function addCells(rec) {
      const cols = ['electricityCO2','lpgCO2','gasCO2','dieselCO2','oilCO2'];
      cols.forEach(col => {
        const td = document.createElement('td');
        td.className = 'border border-black text-center';
        td.textContent = rec ? rec[col].toLocaleString() : '–';
        if (!rec) td.classList.add('text-gray-400');
        tr.appendChild(td);
      });
    }

    addCells(g);
    addCells(c);

    tbody.appendChild(tr);
  });
}

// --- Create chart ---
function createChart(canvasId, title, data, stacked=false) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Electricity', data: data.Electricity, backgroundColor: 'rgba(59,130,246,0.7)', stack: stacked ? 'co2' : undefined },
        { label: 'LPG', data: data.LPG, backgroundColor: 'rgba(230,130,9,0.9)', stack: stacked ? 'co2' : undefined },
        { label: 'Gas', data: data.Gas, backgroundColor: 'rgba(221,237,232,0.99)', stack: stacked ? 'co2' : undefined },
        { label: 'Diesel', data: data.Diesel, backgroundColor: 'rgba(248,239,74,0.92)', stack: stacked ? 'co2' : undefined },
        { label: 'Oil', data: data.Oil, backgroundColor: 'rgba(65,90,140,0.92)', stack: stacked ? 'co2' : undefined }
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
        x: { stacked: stacked },
        y: {
          stacked: stacked,
          beginAtZero: true,
          title: { display: true, text: 'CO₂ Emission' }
        }
      }
    }
  });
}

// --- Filter records by year ---
function filterByYear(records, year) {
  return records.filter(r => new Date(r.dateFrom).getFullYear() === parseInt(year));
}

// --- Main dashboard initialization ---
document.addEventListener('DOMContentLoaded', async function () {
  let ggpcChart, cdpcChart;
  const kintoneData = await fetchKintoneData('/.netlify/functions/kintone');

  const allGGPC = kintoneData.records
    .filter(r => r.Plant_Location.value === 'GGPC')
    .map(mapRecord)
    .sort((a,b)=>new Date(a.dateFrom)-new Date(b.dateFrom));

  const allCDPC = kintoneData.records
    .filter(r => r.Plant_Location.value === 'CDPC')
    .map(mapRecord)
    .sort((a,b)=>new Date(a.dateFrom)-new Date(b.dateFrom));

  const stackCheckbox = document.getElementById('stackToggle');
  const yearSelect = document.getElementById('year-select');

  // --- Automatically generate the list of years ---
  const allYears = Array.from(new Set(
    [...allGGPC, ...allCDPC].map(r => new Date(r.dateFrom).getFullYear())
  )).sort((a,b) => b - a); // latest first

  // Populate dropdown
  yearSelect.innerHTML = '';
  allYears.forEach(year => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });

  function updateDashboard(selectedYear) {
    const ggpcRecords = filterByYear(allGGPC, selectedYear);
    const cdpcRecords = filterByYear(allCDPC, selectedYear);

    // Update table
    renderCO2Table(ggpcRecords, cdpcRecords);

    // Prepare data
    const monthsCount = 12;
    const fillArray = (records, key) => {
      const arr = Array(monthsCount).fill(0);
      records.forEach(r => {
        const m = new Date(r.dateFrom).getMonth();
        arr[m] = r[key];
      });
      return arr;
    };

    const ggpcData = {
      Electricity: fillArray(ggpcRecords,'electricityCO2'),
      LPG: fillArray(ggpcRecords,'lpgCO2'),
      Gas: fillArray(ggpcRecords,'gasCO2'),
      Diesel: fillArray(ggpcRecords,'dieselCO2'),
      Oil: fillArray(ggpcRecords,'oilCO2'),
    };

    const cdpcData = {
      Electricity: fillArray(cdpcRecords,'electricityCO2'),
      LPG: fillArray(cdpcRecords,'lpgCO2'),
      Gas: fillArray(cdpcRecords,'gasCO2'),
      Diesel: fillArray(cdpcRecords,'dieselCO2'),
      Oil: fillArray(cdpcRecords,'oilCO2'),
    };

    // Destroy old charts
    if (ggpcChart) ggpcChart.destroy();
    if (cdpcChart) cdpcChart.destroy();

    // Draw new charts
    ggpcChart = createChart('co2ChartGGPC', `GGPC CO₂ Emissions (${selectedYear})`, ggpcData, stackCheckbox.checked);
    cdpcChart = createChart('co2ChartCDPC', `CDPC CO₂ Emissions (${selectedYear})`, cdpcData, stackCheckbox.checked);
  }

  // Stacked toggle
  stackCheckbox.addEventListener('change', () => {
    updateDashboard(yearSelect.value);
  });

  // Year change
  yearSelect.addEventListener('change', e => {
    updateDashboard(e.target.value);
  });

  // Initial load with latest year
  updateDashboard(allYears[0]);
});

// --- Mobile menu ---
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
      setTimeout(() => navMobile.classList.add('hidden'), 300);
    }
    navToggle.classList.toggle('open');
  });

  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('#nav-menu a, #nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    const isIndex = href === 'index.html' &&
      (current === '' || current === '/' || current === 'index.html');

    link.classList.add(
      'relative','font-medium','text-gray-700','hover:text-blue-600',
      'after:content-[""]','after:absolute','after:left-0','after:-bottom-1',
      'after:w-0','after:h-[2px]','after:bg-blue-600',
      'after:transition-all','after:duration-300','hover:after:w-full'
    );

    if (href === current || isIndex) {
      link.classList.remove('text-gray-700');
      link.classList.add('text-blue-700','after:w-full');
    }
  });
});

// --- Loader hide after data load ---
document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  try {
    await fetchKintoneData('/.netlify/functions/kintone');
  } catch (err) {
    console.error(err);
    alert('Failed to load data');
  } finally {
    loader.style.display = 'none';
  }
});
