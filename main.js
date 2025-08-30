
document.addEventListener('DOMContentLoaded', async () => {
    // --- UTILITY FUNCTIONS ---
    function mapRecord(r) {
      return {
        dateFrom: r.Date_To?.value || '',
        inggotUsedPcs: parseFloat(r.Inggot_used_pcs?.value || 0),
        inggotUsedKg: parseFloat(r.Inggot_Used_Kg?.value || 0),
        goodsProducedKg: parseFloat(r.Goods_Produced_Kg?.value || 0),
        electricityKWh: parseFloat(r.Electricity_KWhr?.value || 0),
        electricityCO2: parseFloat(r.Electricity_CO2?.value || 0),
        lpgKg: parseFloat(r.LPG_Total_Kg?.value || 0),
        lpgKWh: parseFloat(r.LPG_KWhr?.value || 0),
        lpgCO2: parseFloat(r.lpg_co2?.value || 0),
        gasolineLiters: parseFloat(r.Gasoline_Liters?.value || 0),
        gasCO2: parseFloat(r.Gas_CO2?.value || 0),
        dieselLiters: parseFloat(r.Diesel_Liters?.value || 0),
        dieselCO2: parseFloat(r.Diesel_CO2?.value || 0),
        tellus46: parseFloat(r.Tellus_46?.value || 0),
        tellus32: parseFloat(r.Tellus_32?.value || 0),
        ep220: parseFloat(r.EP_220?.value || 0),
        pl1000: parseFloat(r.PL_1000?.value || 0),
        oilCO2: parseFloat(r.OIL_CO2?.value || 0),
        energyIntensity: parseFloat(r.Energy_Intensity?.value || 0),
        operationsEquivalent: parseFloat(r.Operations_equivalent?.value || 0),
        co2IntensityPc: parseFloat(r.CO2_Intensity_pc?.value || 0),
        co2IntensityKg: parseFloat(r.CO2_Intensity_kg?.value || 0)
      };
    }

    async function fetchKintoneData(endpoint) {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    }

    function formatDateToMonth(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    }

    function renderTableRows(tableId, data) {
      const tbody = document.querySelector(`#${tableId} tbody`);
      tbody.innerHTML = ''; 
      data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        row.forEach((cell, cellIndex) => {
          const td = document.createElement('td');
          if (typeof cell === 'number' && !isNaN(cell)) {
            td.textContent = Number.isInteger(cell) ? cell.toLocaleString('en-US') : cell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          } else {
            td.textContent = cell;
          }
          td.className = 'px-2 py-1 border';
          if (cellIndex === 0) td.classList.add('font-semibold');
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function createEnergyChart(ctx, title, goodsProducedKg, electricityKWh, lpgKWh, stacked = false) {
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Goods Produced (Kg)', data: goodsProducedKg, type: 'line', borderColor: '#3B82F6', backgroundColor: '#3B82F6', yAxisID: 'y', tension: 0.1, fill: false, pointStyle: 'circle', pointRadius: 5, pointBackgroundColor: '#3B82F6'
            },
            {
              label: 'Electricity KWh', data: electricityKWh, backgroundColor: '#F97316', yAxisID: 'y1', barPercentage: 0.7, categoryPercentage: 0.6, stack: stacked ? 'energy' : undefined
            },
            {
              label: 'LPG KWh', data: lpgKWh, backgroundColor: '#6B7280', yAxisID: 'y1', barPercentage: 0.7, categoryPercentage: 0.6, stack: stacked ? 'energy' : undefined
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Kilograms' }, ticks: { callback: value => value.toLocaleString() }, min: 0 },
            y1: { type: 'linear', position: 'right', title: { display: true, text: 'KWh' }, grid: { drawOnChartArea: false }, ticks: { callback: value => value.toLocaleString() }, min: 0, stacked: stacked }
          },
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: title, font: { size: 16, weight: 'bold' } }
          }
        }
      });
    }
    
    function filterByYear(records, year) {
        return records.filter(r => new Date(r.dateFrom).getFullYear() === parseInt(year));
    }

    // --- MAIN DASHBOARD LOGIC ---
    let ggpcChart, cdpcChart;
    const kintoneData = await fetchKintoneData('/.netlify/functions/kintone');
    const ggpcRecords = kintoneData.records.filter(r => r.Plant_Location.value === 'GGPC').map(mapRecord).sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
    const cdpcRecords = kintoneData.records.filter(r => r.Plant_Location.value === 'CDPC').map(mapRecord).sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));

    const yearSelect = document.getElementById('year-select');
    const allYears = Array.from(new Set([...ggpcRecords, ...cdpcRecords].map(r => new Date(r.dateFrom).getFullYear()))).sort((a, b) => b - a);
    
    yearSelect.innerHTML = '';
    allYears.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
    });

    function updateDashboard(selectedYear) {
      const filteredGGPC = filterByYear(ggpcRecords, selectedYear);
      const filteredCDPC = filterByYear(cdpcRecords, selectedYear);
      
      const ggpcTableData = filteredGGPC.map(r => [formatDateToMonth(r.dateFrom), r.inggotUsedPcs, r.inggotUsedKg, r.goodsProducedKg, r.electricityKWh, r.electricityCO2, r.lpgKg, r.lpgKWh, r.lpgCO2, r.gasolineLiters, r.gasCO2, r.dieselLiters, r.dieselCO2, r.tellus46, r.tellus32, r.ep220, r.pl1000, r.oilCO2, r.energyIntensity, r.operationsEquivalent, r.co2IntensityPc, r.co2IntensityKg]);
      renderTableRows('ggpcTable', ggpcTableData);
      
      const cdpcTableData = filteredCDPC.map(r => [formatDateToMonth(r.dateFrom), r.inggotUsedPcs, r.inggotUsedKg, r.goodsProducedKg, r.electricityKWh, r.electricityCO2, r.lpgKg, r.lpgKWh, r.lpgCO2, r.gasolineLiters, r.gasCO2, r.dieselLiters, r.dieselCO2, r.tellus46, r.tellus32, r.ep220, r.pl1000, r.oilCO2, r.energyIntensity, r.operationsEquivalent, r.co2IntensityPc, r.co2IntensityKg]);
      renderTableRows('cdpcTable', cdpcTableData);

      if (ggpcChart) ggpcChart.destroy();
      if (cdpcChart) cdpcChart.destroy();
      
      ggpcChart = createEnergyChart(document.getElementById('ggpcEnergyChart').getContext('2d'), 'GGPC ENERGY CONSUMPTION VS GOODS PRODUCED', filteredGGPC.map(r => r.goodsProducedKg), filteredGGPC.map(r => r.electricityKWh), filteredGGPC.map(r => r.lpgKWh), document.getElementById('stackToggle').checked);
      cdpcChart = createEnergyChart(document.getElementById('cdpcEnergyChart').getContext('2d'), 'CDPC ENERGY CONSUMPTION VS GOODS PRODUCED', filteredCDPC.map(r => r.goodsProducedKg), filteredCDPC.map(r => r.electricityKWh), filteredCDPC.map(r => r.lpgKWh), document.getElementById('stackToggle').checked);
    }
    
    document.getElementById('stackToggle').addEventListener('change', () => updateDashboard(yearSelect.value));
    yearSelect.addEventListener('change', (e) => updateDashboard(e.target.value));

    // Mobile Menu
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    menuBtn.addEventListener('click', () => {
        const isClosed = mobileMenu.style.maxHeight === '' || mobileMenu.style.maxHeight === '0px';
        mobileMenu.style.maxHeight = isClosed ? mobileMenu.scrollHeight + "px" : '0px';
    });

    lucide.createIcons();
    updateDashboard(allYears[0]);
});