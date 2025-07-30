document.addEventListener('DOMContentLoaded', async function() {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let ggpcChart, cdpcChart;

  // Fetch data from your proxy endpoints
  const ggpcData = await fetchKintoneData('/api/ggpc');
  const cdpcData = await fetchKintoneData('/api/cdpc');

  // Map your Kintone data to arrays for the charts
  const ggpcGoodsProducedKg = ggpcData.goodsProducedKg;
  const ggpcElectricityKWh = ggpcData.electricityKWh;
  const ggpcLpgKWh = ggpcData.lpgKWh;

  const cdpcGoodsProducedKg = cdpcData.goodsProducedKg;
  const cdpcElectricityKWh = cdpcData.electricityKWh;
  const cdpcLpgKWh = cdpcData.lpgKWh;

  function createEnergyChart(ctx, title, goodsProducedKg, electricityKWh, lpgKWh, stacked=false) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
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
          },
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

  // Initial render
  const ggpcCanvas = document.getElementById('ggpcEnergyChart');
  const cdpcCanvas = document.getElementById('cdpcEnergyChart');
  ggpcChart = createEnergyChart(ggpcCanvas.getContext('2d'), 'GGPC ENERGY CONSUMPTION VS GOODS PRODUCED', ggpcGoodsProducedKg, ggpcElectricityKWh, ggpcLpgKWh, false);
  cdpcChart = createEnergyChart(cdpcCanvas.getContext('2d'), 'CDPC ENERGY CONSUMPTION VS GOODS PRODUCED', cdpcGoodsProducedKg, cdpcElectricityKWh, cdpcLpgKWh, false);

  // Toggle handler
  document.getElementById('stackToggle').addEventListener('change', function(e) {
    ggpcChart.destroy();
    cdpcChart.destroy();
    const stacked = e.target.checked;
    ggpcChart = createEnergyChart(ggpcCanvas.getContext('2d'), 'GGPC ENERGY CONSUMPTION VS GOODS PRODUCED', ggpcGoodsProducedKg, ggpcElectricityKWh, ggpcLpgKWh, stacked);
    cdpcChart = createEnergyChart(cdpcCanvas.getContext('2d'), 'CDPC ENERGY CONSUMPTION VS GOODS PRODUCED', cdpcGoodsProducedKg, cdpcElectricityKWh, cdpcLpgKWh, stacked);
  });

  // Render table rows
  const ggpcRecords = kintoneData.records.filter(r => r.type.value === 'GGPC');
  const cdpcRecords = kintoneData.records.filter(r => r.type.value === 'CDPC');

  const ggpcTableRows = ggpcRecords.map(record => [
    record.month.value,
    record.pcs.value,
    record.kg.value,
    // ...other fields
  ]);
  renderTableRows('ggpcTable', ggpcTableRows);

  const cdpcTableRows = cdpcRecords.map(record => [
    record.month.value,
    record.pcs.value,
    record.kg.value,
    // ...other fields
  ]);
  renderTableRows('cdpcTable', cdpcTableRows);
});

// filepath: c:\Users\Systemdevr3\Documents\CO2 Dashboard\index.html
document.addEventListener('DOMContentLoaded', () => {
  // Get elements for hamburger
  const navToggle = document.getElementById('nav-toggle');
  const navMobile = document.getElementById('nav-mobile');

  // Toggle mobile menu with fade + slide animation
  navToggle.addEventListener('click', () => {
    const isHidden = navMobile.classList.contains('hidden');

    if (isHidden) {
      // Show menu with fade + slide down
      navMobile.classList.remove('hidden');
      // Trigger a reflow so that transition works after removing 'hidden'
      void navMobile.offsetWidth;
      navMobile.classList.remove('opacity-0', '-translate-y-4');
      navMobile.classList.add('opacity-100', 'translate-y-0');
    } else {
      // Fade out and slide up
      navMobile.classList.add('opacity-0', '-translate-y-4');
      navMobile.classList.remove('opacity-100', 'translate-y-0');
      setTimeout(() => {
        navMobile.classList.add('hidden');
      }, 300); // matches duration-300
    }

    // Toggle hamburger icon morph to X
    navToggle.classList.toggle('open');
  });

  // Current page detection
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('#nav-menu a, #nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    const isIndex =
      href === 'index.html' &&
      (current === '' || current === '/' || current === 'index.html');

    // Add base underline animation for ALL links (desktop & mobile)
    link.classList.add(
      'relative',
      'font-medium',
      'text-gray-700',
      'hover:text-blue-600',
      'after:content-[""]',
      'after:absolute',
      'after:left-0',
      'after:-bottom-1',
      'after:w-0',
      'after:h-[2px]',          // underline thickness
      'after:bg-blue-600',
      'after:transition-all',
      'after:duration-300',
      'hover:after:w-full'
    );

    // Apply active styling
    if (href === current || isIndex) {
      link.classList.remove('text-gray-700');
      link.classList.add(
        'text-blue-700',
        'after:w-full' // underline stays visible
      );
    }
  });
});

function renderTableRows(tableId, data) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = ''; // Clear existing rows
  data.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function fetchKintoneData(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

