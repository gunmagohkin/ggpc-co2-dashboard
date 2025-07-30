const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const labelSpan = menuButton.querySelector('span') || menuButton.childNodes[0];

// On page load, check if a label is stored and set it
const savedLabel = localStorage.getItem('selectedChartLabel');
if (savedLabel) {
  labelSpan.textContent = savedLabel;
}

menuButton.addEventListener('click', () => {
  dropdownMenu.classList.toggle('hidden');
});

// Update button text when selecting a chart and navigate
const dropdownLinks = dropdownMenu.querySelectorAll('a');
dropdownLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const selectedText = link.textContent;
    labelSpan.textContent = selectedText;
    localStorage.setItem('selectedChartLabel', selectedText);
    dropdownMenu.classList.add('hidden');
    
    // Navigate to page based on href
    const href = link.getAttribute('href');
    if (href) {
      window.location.href = href;
    }
  });
});

dropdownMenu.classList.add('grid', 'grid-cols-6', 'gap-1', 'p-2');

// Chart data
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const runTime = [18392, 26125, 23977, 19373, 21667, 22751, 22626, 24695, 26574, 27139, 26438, 22959];
const consumption = [313441, 406810, 359603, 320859, 365476, 390272, 385708, 397898, 402442, 411642, 422809, 370591];
const consumptionRate = [5.82, 6.43, 6.67, 6.03, 5.93, 5.82, 5.84, 6.19, 6.55, 6.56, 6.22, 6.20];

// Runtime vs Electric Consumption chart
new Chart(document.getElementById('runtimeChart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: months,
    datasets: [
      { label: 'Total Run Hours', data: runTime, backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'y' },
      { label: 'Electric Consumption', data: consumption, type: 'line', borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', yAxisID: 'y1' }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: { type: 'linear', position: 'left', title: { display: true, text: 'Time (HRS)' } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'Electric Consumption (kWh)' }, grid: { drawOnChartArea: false } }
    }
  }
});

// Consumption Rate chart
new Chart(document.getElementById('consumptionRateChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: months,
    datasets: [{ label: 'Consumption Rate (%)', data: consumptionRate, borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: true, tension: 0.3, pointRadius: 5 }]
  },
  options: {
    responsive: true,
    scales: {
      y: { title: { display: true, text: 'Rate (%)' } }
    }
  }
});
