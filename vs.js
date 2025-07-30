document.addEventListener('DOMContentLoaded', function () {
  const energyLabels = ['Electricity', 'LPG', 'Gas', 'Diesel', 'Oil'];

  const janGGPC = [150.9497, 91.85337, 0.192053, 5.224156, 3.024945];
  const janCDPC = [128.4142, 107.2412, 1.50649, 4.511781, 4.303017];

  const febGGPC = [174.4881, 101.3782, 0.134746, 4.51036, 2.775092];
  const febCDPC = [156.3649, 133.4195, 0.867337, 5.095397, 6.021081];

  const marGGPC = [163.2044, 97.71642, 0.283284, 4.42552, 2.595429];
  const marCDPC = [142.6091, 124.3745, 0.35991, 4.37382, 1.67616];

  function createChart(canvasId, title, ggpcData, cdpcData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: energyLabels,
        datasets: [
          {
            label: 'GGPC',
            data: ggpcData,
            backgroundColor: 'rgba(59,130,246,0.8)',
            barPercentage: 0.4,         // 🟢 reduce thickness
            categoryPercentage: 0.5     // 🟢 tighter group
          },
          {
            label: 'CDPC',
            data: cdpcData,
            backgroundColor: 'rgba(251,191,36,0.8)',
            barPercentage: 0.4,         // 🟢 reduce thickness
            categoryPercentage: 0.5     // 🟢 tighter group
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
          y: {
            beginAtZero: true,
            title: { display: true, text: 'CO₂ Emission' }
          }
        }
      }
    });
  }

  createChart('janChart', 'JAN CO₂ Emissions', janGGPC, janCDPC);
  createChart('febChart', 'FEB CO₂ Emissions', febGGPC, febCDPC);
  createChart('marChart', 'MAR CO₂ Emissions', marGGPC, marCDPC);
});

new Swiper('.swiper-container', {
  direction: 'horizontal',
  loop: true,
  pagination: {
    el: '.swiper-pagination',
    clickable: true
  }
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

