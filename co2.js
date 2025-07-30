document.addEventListener('DOMContentLoaded', function () {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  // GGPC data
  const ggpcData = {
    Electricity: [150.95,174.488,163.204,0,0,0,0,0,0,0,0,0],
    LPG: [91.8534,101.378,97.7164,0,0,0,0,0,0,0,0,0],
    Gas: [0.19205,0.13475,0.28328,0,0,0,0,0,0,0,0,0],
    Diesel: [5.22416,4.51036,4.42552,0,0,0,0,0,0,0,0,0],
    Oil: [3.02495,2.77509,2.59543,0,0,0,0,0,0,0,0,0],
  };

  // CDPC data
  const cdpcData = {
    Electricity: [128.414,156.365,142.609,0,0,0,0,0,0,0,0,0],
    LPG: [107.241,133.42,124.375,0,0,0,0,0,0,0,0,0],
    Gas: [1.50649,0.86734,0.35991,0,0,0,0,0,0,0,0,0],
    Diesel: [4.51178,5.0954,4.37382,0,0,0,0,0,0,0,0,0],
    Oil: [4.30302,6.02108,1.67616,0,0,0,0,0,0,0,0,0],
  };

  let ggpcChart, cdpcChart;

  function createChart(canvasId, title, data, stacked=false) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Electricity', data: data.Electricity, backgroundColor: 'rgba(59,130,246,0.7)', barPercentage: 0.9, categoryPercentage: 0.8, stack: stacked ? 'co2' : undefined },
          { label: 'LPG', data: data.LPG, backgroundColor: 'rgba(230,130,9,0.9)', barPercentage: 0.9, categoryPercentage: 0.8, stack: stacked ? 'co2' : undefined },
          { label: 'Gas', data: data.Gas, backgroundColor: 'rgba(221,237,232,0.99)', barPercentage: 0.9, categoryPercentage: 0.8, stack: stacked ? 'co2' : undefined },
          { label: 'Diesel', data: data.Diesel, backgroundColor: 'rgba(248,239,74,0.92)', barPercentage: 0.9, categoryPercentage: 0.8, stack: stacked ? 'co2' : undefined },
          { label: 'Oil', data: data.Oil, backgroundColor: 'rgba(65,90,140,0.92)', barPercentage: 0.9, categoryPercentage: 0.8, stack: stacked ? 'co2' : undefined }
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
          x: {
            stacked: stacked,
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
          },
          y: {
            beginAtZero: true,
            stacked: stacked,
            title: { display: true, text: 'CO₂ Emission' }
          }
        }
      }
    });
  }

  // Initial render
  ggpcChart = createChart('co2ChartGGPC', 'GGPC CO₂ Emissions (2025)', ggpcData, false);
  cdpcChart = createChart('co2ChartCDPC', 'CDPC CO₂ Emissions (2025)', cdpcData, false);

  // Toggle handler
  document.getElementById('stackToggle').addEventListener('change', function(e) {
    ggpcChart.destroy();
    cdpcChart.destroy();
    const stacked = e.target.checked;
    ggpcChart = createChart('co2ChartGGPC', 'GGPC CO₂ Emissions (2025)', ggpcData, stacked);
    cdpcChart = createChart('co2ChartCDPC', 'CDPC CO₂ Emissions (2025)', cdpcData, stacked);
  });
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