document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");
  let selectedYear = yearFilter.value;

  function getSelectedYears() {
    const years = Array.from(document.querySelectorAll('#yearCheckboxes input[type=checkbox]:checked'))
      .map(cb => cb.value)
      .filter(y => /^\d{4}$/.test(y));
    return years.length > 0 ? years.map(Number) : [2025];
  }
  // Universal Active Link Handler
  function setActiveLink(idOrElement) {
    document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active-link"));
    document.querySelectorAll(".subsection-title").forEach(t => t.classList.remove("active-link"));
    if (typeof idOrElement === "string") {
      const el = document.getElementById(idOrElement);
      if (el) el.classList.add("active-link");
    } else if (idOrElement?.classList) {
      idOrElement.classList.add("active-link");
    }
  }
  // Hamburger
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");

  // ✅ Toggle sidebar on hamburger click (works on all screen sizes)
  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // ✅ Auto-close + active highlight on sidebar link click
  const sidebarLinks = sidebar.querySelectorAll("a:not(.logo-wrapper");
  sidebarLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // stop default navigation if needed
      setActiveLink(link); // highlight active link
      sidebar.classList.remove("active"); // auto-close sidebar on mobile

      // Optionally trigger your logic to load section
      // loadSection(link.id); <-- if applicable
    });
  });
  function enableDownload(name = "dfit_table") {
    const btn = document.getElementById("downloadTableBtn");
    const container = document.querySelector(".table-container");

    if (!btn || !container) return;

    btn.style.display = "inline-block";

    btn.onclick = () => {
      // Clone table and prepare full rendering
      const clone = container.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.width = container.scrollWidth + "px";
      clone.style.height = container.scrollHeight + "px";

      // Ensure no clipping
      document.body.appendChild(clone);

      // Use html2canvas on the expanded clone
      setTimeout(() => {
        html2canvas(clone, {
          scrollX: 0,
          scrollY: 0,
          width: clone.scrollWidth,
          height: clone.scrollHeight,
          windowWidth: clone.scrollWidth,
          windowHeight: clone.scrollHeight,
          useCORS: true,
          allowTaint: true,
        }).then(canvas => {
          document.body.removeChild(clone);
          const link = document.createElement("a");
          link.download = `${name}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      }, 200); // delay to ensure layout settles
    };
  }

  // Enable when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    enableDownload("full_table_download");
  });

  // Annual Table
  function renderAnnualTable(dataMap, years) {
    const hasSNO = Object.values(dataMap).some(r => r.SNO);
    let html = `<table><thead><tr>`;

    if (hasSNO) html += `<th>S.NO</th>`;
    html += `<th>Contents</th>`;

    years.forEach(y => html += `<th>Annual ${y}</th>`);
    html += `</tr></thead><tbody>`;

    Object.values(dataMap).forEach(row => {
      // Check if this is the "Total" row (case-insensitive)
      const contents = (row.Contents ?? "").trim().toLowerCase();
      const isTotalRow = contents === "nsn/nep total"
        || contents === "nsp total"
        || contents === "rt +ve total"
        || contents === "rt neg total"
        || contents === "grand total"
        || contents === "total no. of new leprosy cases detected"
        || contents === "total adult disability g-ii"
        || contents === "total children disability g-ii"
        || contents === "total type-1 lepra reactions"
        || contents === "total type 2 lepra reactions"
        || contents === "total rcs done"
        || contents === "total no of beds occupied leprosy patients"
        || contents === "total leprosy patients admitted";


      // Add the class if it's the Total row
      html += `<tr${isTotalRow ? ' class="highlight-row"' : ''}>`;

      if (hasSNO) html += `<td>${row.SNO ?? ""}</td>`;
      html += `<td>${row.Contents ?? ""}</td>`;

      years.forEach(y => {
        const val = row[`Annual ${y}`];
        html += `<td>${(val !== undefined && val !== null && val.toString().trim() !== "") ? val : "0"}</td>`;
      });

      html += `</tr>`;
    });

    html += `</tbody></table>`;
    return html;
  }



  /// MUlti year Selction
  function renderMultiYearSection(basePath, key, sectionName) {
    const years = getSelectedYears();
    const cumulativeData = {};
    const order = [];

    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = `<p>Loading ${sectionName} data...</p>`;

    Promise.all(years.map(year =>
      fetch(`${basePath}/district_wise_${year}/${key}.json`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          data.forEach(row => {
            const sno = row["S.NO"] || row["SNO"] || "";
            const label = row["Contents"] || row["Type of cases"] || row["Annexure M Contents"] || row["Type of Cases"] || row["Type of cases "] || "Unknown";
            const id = `${sno}||${label}`;

            if (!cumulativeData[id]) {
              cumulativeData[id] = { Contents: label };
              if (sno) cumulativeData[id].SNO = sno;
              order.push(id);
            }

            const annualKey = `Annual ${year}`;
            const value = row[`Total ${year}`] ?? row[annualKey] ?? row["Total"];
            cumulativeData[id][annualKey] = (value !== undefined && value !== null && value.toString().trim() !== "") ? value : "0";
          });

        })
    ))
      .then(() => {
        const formattedData = order.reduce((acc, id) => {
          acc[id] = cumulativeData[id];
          return acc;
        }, {});

        const tableHTML = renderAnnualTable(formattedData, years);

        contentArea.innerHTML = `<div class="table-container">
        <h2>${sectionName} Overview</h2>
        ${tableHTML}
      </div>`;

        enableDownload(sectionName.replace(/\s+/g, '_'));
      })
      .catch(err => {
        contentArea.innerHTML = `<p>Error loading data for ${sectionName}. Please try again later.</p>`;
        console.error("Multi-year section error:", err);
      });
  }

  // Quarter - wise data display

  function renderQuarterWiseSection(path, key, sectionTitle) {
    const selectedYear = document.getElementById("yearFilter").value;
    const contentArea = document.getElementById("content-area");

    contentArea.innerHTML = `<p>Loading ${sectionTitle} data for ${selectedYear}...</p>`;

    fetch(`${path}/district_wise_${selectedYear}/${key}.json`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!data || data.length === 0) {
          contentArea.innerHTML = `<p>No data available for ${sectionTitle} – ${selectedYear}</p>`;
          return;
        }

        const keys = Object.keys(data[0]);
        let html = `<h2>${sectionTitle} – ${selectedYear} (Quarter-wise)</h2>`;
        html += `<div class="table-container"><table><thead><tr>`;
        html += keys.map(k => `<th>${k}</th>`).join('');
        html += `</tr></thead><tbody>`;
        data.forEach(row => {
          html += `<tr>${keys.map(k => {
            const val = row[k];
            return `<td>${(val !== undefined && val !== null && val.toString().trim() !== "") ? val : "0"}</td>`;
          }).join('')}</tr>`;

        });
        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;

        enableDownload(sectionTitle.replace(/\s+/g, '_'));
      })
      .catch(err => {
        contentArea.innerHTML = `<p>Error loading ${sectionTitle} data.</p>`;
        console.error("Quarter-wise section error:", err);
      });
  }


  // Auto re-render on checkbox change
  document.querySelectorAll('#yearCheckboxes input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const active = document.querySelector(".active-link");
      if (active) active.click();
    });
  });

  // Bar Graph for LEP and DPMR
  function renderBar(jsonFile, heading, sectionTitle) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";
    let selectedYears = getSelectedYears();

    if (jsonFile === "total_dpmr.json" || "bihar_dpmr.json" || "ap_dpmr.json" || "chat_dpmr.json" || "jhar_dpmr.json" || "kar_dpmr.json" || "tn_dpmr.json") {
      // Only include years from 2020 to 2025
      selectedYears = selectedYears.filter(y => y >= 2020 && y < 2025);
    } else {
      // Include all years from 2014 to 2025
      selectedYears = selectedYears.filter(y => y >= 2014 && y < 2025);
    }

    selectedYears.sort();



    const jsonPath = `GRAPH/BAR/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        // ✅ Labels and Values
        const labels = selectedYears.map(String);
        const values = selectedYears.map(y => {
          const val = data[0][y];
          return val && val.trim() !== "" ? parseInt(val) : 0;
        });

        // ✅ Build Table + Chart
        let html = `
        <div class="table-container" id="table-section">
          <h2>${sectionTitle}</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Contents</th>
                ${labels.map(y => `<th>${y}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.Contents}</td>
                  ${labels.map(y => `<td>${row[y] && row[y].trim() !== "" ? row[y] : "0"}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:30px;">
          <canvas id="annualChart"></canvas>
        </div>
      `;
        contentArea.innerHTML = html;

        // ✅ Setup chart
        const ctx = document.getElementById("annualChart").getContext("2d");
        if (genericChartInstance) genericChartInstance.destroy();

        const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        genericChartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: sectionTitle,
              data: values,
              borderColor: color,
              backgroundColor: color + "33",
              pointBackgroundColor: color,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              barThickness: 50,
            }]
          },
          options: {
            layout: { padding: { right: 30 } },
            plugins: {
              datalabels: {
                align: "top",
                anchor: "end",
                color: "#000",
                font: { weight: "bold", size: 12 },
                clamp: true
              },
              tooltip: {
                titleFont: { weight: "bold", size: 14 },
                bodyFont: { weight: "bold", size: 12 }
              },
              legend: {
                labels: {
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grace: '5%',
                grid: {
                  lineWidth: 0.5, // 👈 thinner axis lines
                  color: '#ccc'
                },
                ticks: {
                  padding: 10,
                  color: "#000",
                  font: { size: 12, weight: "bold" },
                  callback: value => value.toFixed(0) // 👈 round off displayed ticks
                },
                title: {
                  display: true,
                  text: "Values",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              },
              x: {
                offset: true,
                grid: {
                  lineWidth: 0.5,
                  color: '#ccc'
                },
                ticks: {
                  padding: 5,
                  color: "#000",
                  font: { size: 12, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Year-wise",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: false
          },
          plugins: [ChartDataLabels]
        });

        // ✅ Combined Download
        enableDownloadBoth(`${sectionTitle.replace(/\s+/g, "_")}_Report`, "#table-section", "#annualChart");
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  }
  document.getElementById("tot-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("total_dpmr.json", "TOTAL DPMR Services - Practicing self care regularly%", "TOTAL DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("ap-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("ap_dpmr.json", "Andhra Pradesh DPMR Services - Practicing self care regularly%", "Andhra Pradesh DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("bih-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("bihar_dpmr.json", "Bihar DPMR Services - Practicing self care regularly%", "Bihar DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("chat-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("chat_dpmr.json", "Chattisgarh DPMR Services - Practicing self care regularly%", "Chhattisgarh DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("jhar-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("jhar_dpmr.json", "Jharkhand DPMR Services - Practicing self care regularly%", "Jharkhand DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("kar-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("kar_dpmr.json", "Karnataka DPMR Services - Practicing self care regularly%", "Karnataka DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("tn-dpmr").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("tn_dpmr.json", "Tamil Nadu DPMR Services - Practicing self care regularly%", "Tamil Nadu DPMR Services - Practicing self care regularly %");
  });
  document.getElementById("b-lep").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("lep.json", "Total LEP (Socio-economic support) supported", "Total LEP (Socio-economic support) supported");
  });
  document.getElementById("b-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("nsp.json", "Total Nutritional supplements supported for TB Patients", "Total Nutritional supplements supported for TB Patients");
  });
  document.getElementById("del-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("delhi.json", "Delhi project Nutritional supported for TB Patients", "Total Nutritional supplements supported for TB Patients");
  });
  document.getElementById("bih-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("bihar.json", "Bihar state Nutritional supported for TB Patients", "Total Nutritional supplements supported for TB Patients");
  });
  document.getElementById("ap-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("ap.json", "Andhra pradesh state Nutritional supported for TB Patients", "Total Nutritional supplements supported for TB Patients");
  });
  // LEP 3 in one
  function renderLepSupportTrend(jsonFile, sectionTitle, chartId) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    const selectedYears = getSelectedYears().filter(y => y !== 2025);
    selectedYears.sort();

    const jsonPath = `GRAPH/LEP/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        const labels = selectedYears.map(String);

        // Extract rows and datasets
        let tableRows = "";
        const datasets = [];

        const colors = ["#007bff", "#dc3545", "#28a745", "#ff9900", "#6f42c1", "#17a2b8"];

        data.forEach((entry, index) => {
          const rowValues = labels.map(y =>
            entry[y] && entry[y].trim() !== "" ? parseInt(entry[y]) : 0
          );
          tableRows += `<tr><td>${entry.Category}</td>${rowValues.map(val => `<td>${val}</td>`).join("")}</tr>`;

          datasets.push({
            label: entry.Category,
            data: rowValues,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            pointBackgroundColor: colors[index % colors.length],
            borderWidth: 2,
            tension: 0,
            fill: false,
            pointRadius: 3
          });
        });

        // HTML table and chart canvas
        const html = `
        <div class="table-container" id="table-section">
          <h2>${sectionTitle}</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Category</th>
                ${labels.map(y => `<th>${y}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <div style="margin-top:30px;">
          <canvas id="${chartId}"></canvas>
        </div>
      `;
        contentArea.innerHTML = html;

        // Chart rendering
        const ctx = document.getElementById(chartId).getContext("2d");
        if (genericChartInstance) genericChartInstance.destroy();

        genericChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets
          },
          options: {
            layout: { padding: { right: 30, left: 10 } },
            plugins: {
              datalabels: {
                align: "top",
                anchor: "end",
                color: ctx => ctx.dataset.borderColor,
                font: { weight: "bold", size: 11 },
                clamp: true
              },
              tooltip: {
                titleFont: { weight: "bold", size: 13 },
                bodyFont: { weight: "normal", size: 11 }
              },
              legend: {
                labels: {
                  color: "#000",
                  font: { size: 13, weight: "bold" },
                  boxWidth: 20
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grace: "5%",
                ticks: {
                  padding: 8,
                  color: "#000",
                  font: { size: 11, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Values",
                  color: "#000",
                  font: { size: 13, weight: "bold" }
                }
              },
              x: {
                offset: true,
                ticks: {
                  padding: 5,
                  color: "#000",
                  font: { size: 11, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Year-wise",
                  color: "#000",
                  font: { size: 13, weight: "bold" }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: false
          },
          plugins: [ChartDataLabels]
        });

        enableDownloadBoth(`${sectionTitle.replace(/\s+/g, "_")}_Report`, "#table-section", `#${chartId}`);
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  }
  document.getElementById("three-lep").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderLepSupportTrend("lep.json", "Support Categories for Leprosy Patients – Total Projects", "leprosySupportChart");
  });
  document.getElementById("three-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderLepSupportTrend("nut.json", "Nutrition Support Across  Regions", "nutritionSupportChart");
  });


  //IRL LABS GRPAHS
  function renderIRLMultiTrend(jsonFile, sectionTitle, chartId) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    // const selectedYears = getSelectedYears();
    const selectedYears = getSelectedYears().filter(y => y !== 2025);

    selectedYears.sort();

    const jsonPath = `GRAPH/IRL/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        const labels = selectedYears.map(String);

        const presumptive = data.find(d => d.Contents === "No. of Presumptive");
        const followUp = data.find(d => d.Contents === "No. of follow up");
        const drtb = data.find(d => d.Contents === "DR TB cases screened");

        const valuesPresumptive = labels.map(y => (presumptive[y] && presumptive[y].trim() !== "") ? parseInt(presumptive[y]) : 0);
        const valuesFollowUp = labels.map(y => (followUp[y] && followUp[y].trim() !== "") ? parseInt(followUp[y]) : 0);
        const valuesDRTB = labels.map(y => (drtb[y] && drtb[y].trim() !== "") ? parseInt(drtb[y]) : 0);

        let html = `
        <div class="table-container" id="table-section">
          <h2>${sectionTitle}</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Contents</th>
                ${labels.map(y => `<th>${y}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr><td>No. of Presumptive</td>${valuesPresumptive.map(val => `<td>${val}</td>`).join("")}</tr>
              <tr><td>No. of Follow up</td>${valuesFollowUp.map(val => `<td>${val}</td>`).join("")}</tr>
              <tr><td>No. of DR TB cases Confirmed</td>${valuesDRTB.map(val => `<td>${val}</td>`).join("")}</tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top:30px;">
          <canvas id="${chartId}"></canvas>
        </div>
      `;
        contentArea.innerHTML = html;

        const ctx = document.getElementById(chartId).getContext("2d");
        if (genericChartInstance) genericChartInstance.destroy();

        genericChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "No. of Presumptive",
                data: valuesPresumptive,
                borderColor: "#1f77b4",
                backgroundColor: "#1f77b4",
                pointBackgroundColor: "#1f77b4",
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointRadius: 4
              },
              {
                label: "No. of follow up",
                data: valuesFollowUp,
                borderColor: "#b22222",
                backgroundColor: "#b22222",
                pointBackgroundColor: "#b22222",
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointRadius: 4
              },
              {
                label: "DR TB cases screened",
                data: valuesDRTB,
                borderColor: "#228B22",
                backgroundColor: "#228B22",
                pointBackgroundColor: "#228B22",
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointRadius: 4
              }
            ]
          },
          data: {
            labels,
            datasets: [
              {
                label: "No. of Presumptive",
                data: valuesPresumptive,
                borderColor: "#007bff",  // Blue
                backgroundColor: "#007bff",
                pointBackgroundColor: "#007bff",
                borderWidth: 2,
                tension: 0,               // Straight lines
                fill: false,
                pointRadius: 3
              },
              {
                label: "No. of follow up",
                data: valuesFollowUp,
                borderColor: "#dc3545",   // Red
                backgroundColor: "#dc3545",
                pointBackgroundColor: "#dc3545",
                borderWidth: 2,
                tension: 0,               // Straight lines
                fill: false,
                pointRadius: 3
              },
              {
                label: "DR TB cases screened",
                data: valuesDRTB,
                borderColor: "#28a745",
                backgroundColor: "#28a745",
                pointBackgroundColor: "#28a745",
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointRadius: 3,
                datalabels: {
                  align: "bottom",      // ⬅️ Moves labels below the line
                  anchor: "end",
                  color: "#000",
                  font: { weight: "bold", size: 11 }
                }
              }
            ]
          },
          options: {
            layout: { padding: { right: 30, left: 10 } },
            plugins: {
              datalabels: {
                align: "top",
                anchor: "end",
                color: ctx => ctx.dataset.borderColor,
                font: { weight: "bold", size: 11 },
                clamp: true
              },
              tooltip: {
                titleFont: { weight: "bold", size: 13 },
                bodyFont: { weight: "normal", size: 11 }
              },
              legend: {
                labels: {
                  color: "#000",
                  font: { size: 13, weight: "bold" },
                  boxWidth: 20
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grace: "5%",
                ticks: {
                  padding: 8,
                  color: "#000",
                  font: { size: 11, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Values",
                  color: "#000",
                  font: { size: 13, weight: "bold" }
                }
              },
              x: {
                offset: true,
                ticks: {
                  padding: 5,
                  color: "#000",
                  font: { size: 11, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Year-wise",
                  color: "#000",
                  font: { size: 13, weight: "bold" }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: false
          },
          plugins: [ChartDataLabels]

        });

        enableDownloadBoth(`${sectionTitle.replace(/\s+/g, "_")}_Report`, "#table-section", `#${chartId}`);
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  }
  document.getElementById("d-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("dharbanga_irl.json", "DR-TB Laboratories trend – Darbhanga ", "dharbangaChart");
  });

  document.getElementById("n-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("nellore_irl.json", "DR-TB Laboratories trend – Nellore ", "nelloreChart");
  });

  document.getElementById("tp-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("total_irl.json", "DR-TB Laboratories trend – Total ", "totalChart");
  });


  // Annual-Wise Analysis

  let genericChartInstance = null;

  function renderAnnualGraphTableAndChart(folder, jsonFile, sectionTitle) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    const selectedYears = getSelectedYears().filter(y => y !== 2025);
    selectedYears.sort();

    const jsonPath = `GRAPH/${folder}/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        // ✅ Labels and Values
        const labels = selectedYears.map(String);
        const values = selectedYears.map(y => {
          const val = data[0][y];
          return val && val.trim() !== "" ? parseInt(val) : 0;
        });

        // ✅ Build Table + Chart
        let html = `
        <div class="table-container" id="table-section">
          <h2>${sectionTitle} </h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Contents</th>
                ${labels.map(y => `<th>${y}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.Contents}</td>
                  ${labels.map(y => `<td>${row[y] && row[y].trim() !== "" ? row[y] : "0"}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:30px;">
          <canvas id="annualChart"></canvas>
        </div>
      `;
        contentArea.innerHTML = html;

        // ✅ Setup chart
        const ctx = document.getElementById("annualChart").getContext("2d");
        if (genericChartInstance) genericChartInstance.destroy();

        const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        genericChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: sectionTitle,
              data: values,
              borderColor: color,
              backgroundColor: color + "33",
              pointBackgroundColor: color,
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            layout: { padding: { right: 30 } },
            plugins: {
              datalabels: {
                align: "top",
                anchor: "end",
                color: "#000",
                font: { weight: "bold", size: 12 },
                clamp: true
              },
              tooltip: {
                titleFont: { weight: "bold", size: 14 },
                bodyFont: { weight: "bold", size: 12 }
              },
              legend: {
                labels: {
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grace: '5%',                     // 👈 adds vertical breathing room
                ticks: {
                  padding: 10,
                  color: "#000",
                  font: { size: 12, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Values",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              },
              x: {
                offset: true,                    // 👈 this is the key for horizontal gap!
                ticks: {
                  padding: 5,
                  color: "#000",
                  font: { size: 12, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Year-wise",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: false
          },
          plugins: [ChartDataLabels]
        });

        // ✅ Combined Download
        enableDownloadBoth(`${sectionTitle.replace(/\s+/g, "_")}_Report`, "#table-section", "#annualChart");
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  }

  const projects = [
    { code: "tp", title: "Total Projects" },
    { code: "dfit", title: "DFIT Projects" },
    { code: "sup", title: "Supported Projects" },
    { code: "nel", title: "Nellore Project" },
    { code: "del", title: "Delhi Project" },
    { code: "dos", title: "DOS Project" },
    { code: "pol", title: "Polambakkam Project" },
    { code: "dan", title: "Dhanbad Project" },
    { code: "amd", title: "Amda Project" },
    { code: "ars", title: "Arasipalayam Project" },
    { code: "fat", title: "Fathimanagar Project" },
    { code: "nag", title: "Nagepalli Project" },
    { code: "pav", title: "Pavagada Project" },
    { code: "bel", title: "Belatanr Project" },
    { code: "pop", title: "Pope John Garden Project" },
    { code: "chi", title: "Chilakala Palli Project" },
    { code: "tri", title: "Trivendrum Project" },
    { code: "and", title: "Andipatti Project" },
    { code: "amb", title: "Ambalamoola Project" },
  ];

  // Maps for categories
  const categories = {
    OPD: "Out Patients Statistics – ",
    LEPROSY: "New Leprosy cases Diagnosed – ",
    DISABILITY: "New Leprosy cases with Grade II Disability – ",
    LEPRA: "Lepra Reaction Treated – ",
    RCS: "Deformity correction surgeries(RCS) – ",
    LEPAD: "Hospital admission of leprosy patients with complications – ",
    LEPBED: "Leprosy Patients Bed occupancy – ",
    PRETB: "Presumptive TB cases sputum examination – ",
    TB: "Total TB cases Diagnosed – ",
    NSP: "Outcomes of TB-NSP Cure Rate – ",
    RT: "Outcomes of TB-RT Cure Rate – ",
  };

  // Suffix mapping for HTML IDs
  const suffixMap = {
    OPD: "opd",
    LEPROSY: "lep",
    DISABILITY: "dis",
    LEPRA: "lepra",
    RCS: "rcs",
    LEPAD: "lepad",
    LEPBED: "lepbed",
    PRETB: "pretb",
    TB: "tb",
    NSP: "nsp",
    RT: "rt",
  };

  // Build the annualGraphLinks object
  const annualGraphLinks = {};

  // Step 1: Main categories (all projects)
  Object.entries(categories).forEach(([folder, prefix]) => {
    const suffix = suffixMap[folder];
    projects.forEach(({ code, title }) => {
      annualGraphLinks[`${code}-${suffix}`] = {
        folder,
        file: `${code}.json`,
        title: `${prefix}${title}`,
      };
    });
  });

  // Step 2: Add event listeners to each link
  Object.entries(annualGraphLinks).forEach(([id, config]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveLink(e.target);
        renderAnnualGraphTableAndChart(config.folder, config.file, config.title);
      });
    }
  });




  // --- LEP Section ---
  document.getElementById("link-lep")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-lep");

    const selectedYear = document.getElementById("yearFilter").value;
    const selectedYears = selectedYear === "All" ? getSelectedYears() : [selectedYear];

    fetch("LEP/lep.json")
      .then(res => res.json())
      .then(data => {
        const columns = Object.keys(data[0]).filter(k => k !== "Category" && selectedYears.some(yr => k.includes(yr)));

        let html = `<div class="table-container"><h2>Livelihood Enhancement Program Report(LEP)</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;

        data.forEach(row => {
          html += `<tr><td>${row["Category"]}</td>${columns.map(c => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`;
        });

        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`LEP_Report_${selectedYears.join("_")}`);
      });
  });

  // --- NUT Section ---
  // --- Nutritional Support Section ---
  document.getElementById("link-nut")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-nut");

    const selectedYear = document.getElementById("yearFilter").value;
    const selectedYears = selectedYear === "All" ? getSelectedYears() : [selectedYear];

    fetch("LEP/nut.json")
      .then(res => res.json())
      .then(data => {
        const columns = Object.keys(data[0]).filter(k => k !== "Category" && selectedYears.some(yr => k.includes(yr)));

        let html = `<div class="table-container"><h2>Nutritional Support Report</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;

        data.forEach(row => {
          html += `<tr><td>${row["Category"]}</td>${columns.map(c => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`;
        });

        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`NUTRITIONAL_Report_${selectedYears.join("_")}`);
      });
  });

  // --- DELHI DRTB Section ---
  document.getElementById("link-drtb")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-drtb");

    const selectedYear = document.getElementById("yearFilter").value;
    const selectedYears = selectedYear === "All" ? getSelectedYears() : [selectedYear];

    fetch("delhi_drtb.json")
      .then(res => res.json())
      .then(data => {
        let html = `<h2>DELHI DRTB SERVICES</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>Particulars</th>`;

        html += selectedYears.map(yr => `<th>${yr}</th>`).join("");
        html += "</tr></thead><tbody>";

        data.forEach(row => {
          html += `<tr><td>${row["S.NO"]}</td><td>${row["Particulars"]}</td>`;
          html += selectedYears.map(yr => `<td>${row[yr] ?? ""}</td>`).join("");
          html += "</tr>";
        });

        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`DELHI DRTB_Report_${selectedYears.join("_")}`);
      });
  });


  // --- DRTB Bihar ---

  document.getElementById("link-bihar-drtb")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-bihar-drtb");

    const selectedYear = document.getElementById("yearFilter").value;
    const selectedYears = selectedYear === "All" ? getSelectedYears().map(String) : [selectedYear];

    fetch("/DRTB/bihar_drtb.json")
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          contentArea.innerHTML = `<p>No data found for Bihar DRTB.</p>`;
          return;
        }

        // 🔍 Filter out years where all values are empty/null/undefined
        const validYears = selectedYears.filter(year =>
          data.some(row => {
            const val = row[year];
            return val !== null && val !== undefined && val !== "";
          })
        );

        if (validYears.length === 0) {
          contentArea.innerHTML = `<p>No valid data available for selected years in Bihar DRTB section.</p>`;
          return;
        }

        let html = `<h2>BIHAR DRTB SERVICES</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>DRTB contents</th>`;
        html += validYears.map(yr => `<th>${yr}</th>`).join("");
        html += "</tr></thead><tbody>";

        data.forEach(row => {
          html += `<tr><td>${row["S.NO"]}</td><td>${row["DRTB contents"]}</td>`;
          html += validYears.map(yr => `<td>${row[yr] ?? ""}</td>`).join("");
          html += "</tr>";
        });

        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`BIHAR_DRTB_Report_${validYears.join("_")}`);
      })
      .catch(err => {
        contentArea.innerHTML = `<p>Error loading Bihar DRTB data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  });
  // --- IRL Labs ---
  const irlMap = {
    "link-total-labs": "total",
    "link-nlr-lab": "nellore",
    "link-dar-lab": "darbhanga"
  };

  Object.entries(irlMap).forEach(([id, lab]) => {
    document.getElementById(id)?.addEventListener("click", e => {
      e.preventDefault();
      setActiveLink(id);

      const selectedYear = document.getElementById("yearFilter").value;
      const selectedYears = selectedYear === "All" ? getSelectedYears() : [selectedYear];

      fetch(`IRL/${lab}.json`)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || data.length === 0) {
            contentArea.innerHTML = `<p>No data found for ${lab}</p>`;
            return;
          }

          let html = `<h2>${lab.toUpperCase()} DR-TB LAB Overview </h2>`;
          html += `<div class="table-container"><table><thead><tr><th>Contents</th>`;
          html += selectedYears.map(y => `<th>${y}</th>`).join("");
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += `<tr><td>${row["Contents"]}</td>`;
            html += selectedYears.map(y => `<td>${row[y] ?? ""}</td>`).join("");
            html += `</tr>`;
          });

          html += `</tbody></table></div>`;
          contentArea.innerHTML = html;

          enableDownload(`${lab.toUpperCase()}_IRL_Report_${selectedYears.join("_")}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p>Error loading data for ${lab}: ${err.message}</p>`;
          console.error("Fetch error:", err);
        });
    });
  });


  // --- DPMR ---
  const dpmrMap = {
    tot: "link-tot",
    bihar: "link-bihar",
    jhar: "link-jharkhand",
    kar: "link-karnataka",
    tn: "link-tn",
    chat: "link-chhattisgarh",
    ap: "link-ap"
  };

  Object.entries(dpmrMap).forEach(([key, id]) => {
    document.getElementById(id)?.addEventListener("click", e => {
      e.preventDefault();
      setActiveLink(id);

      const selectedYear = document.getElementById("yearFilter").value;
      const selectedYears = selectedYear === "All" ? getSelectedYears().map(String) : [selectedYear];

      fetch(`DPMR/${key}.json`)
        .then(res => res.json())
        .then(data => {
          const headingMap = {
            tot: "TOTAL",
            bihar: "Bihar",
            jhar: "Jharkhand",
            kar: "Karnataka",
            tn: "Tamil Nadu",
            chat: "Chhattisgarh",
            ap: "Andhra Pradesh"
          };
          const heading = headingMap[key] || key;

          if (!Array.isArray(data) || data.length === 0) {
            contentArea.innerHTML = `<p>No data found for ${heading} DPMR.</p>`;
            return;
          }

          // 🔍 Filter out years where all values are empty/null
          const validYears = selectedYears.filter(year =>
            data.some(row => {
              const val = row[year];
              return val !== null && val !== undefined && val !== "";
            })
          );

          if (validYears.length === 0) {
            contentArea.innerHTML = `<p>No valid data available for selected years in ${heading} DPMR.</p>`;
            return;
          }

          // ✅ Build Table
          let html = `<h2>${heading} DPMR Overview</h2>`;
          html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>DPMR Contents</th>`;
          html += validYears.map(y => `<th>${y}</th>`).join("");
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += `<tr><td>${row["S.NO"]}</td><td>${row["DPMR Contents"]}</td>`;
            html += validYears.map(y => `<td>${row[y] ?? ""}</td>`).join("");
            html += `</tr>`;
          });

          html += `</tbody></table></div>`;
          contentArea.innerHTML = html;

          enableDownload(`${heading}_DPMR_Report_${validYears.join("_")}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p>Error loading ${heading} DPMR data: ${err.message}</p>`;
          console.error("Fetch error:", err);
        });
    });
  });

  ///------------------ LEPROSY DIRECT SERVICES---------------////
  //---- HOSPITAL----///
  const hospitalLinks = {
    total: "link-total-projects",
    dfit: "link-dfit-projects",
    supported: "link-sup-projects",
    districts: [
      "nellore", "delhi", "dos", "polambakam", "dhanbad", "amda", "arasipalyam",
      "fathimnagar", "nagepalli", "pavagada", "belatanr", "popejohngarden",
      "chilakalapalli", "trivendrum", "andipatti", "ambalamoola"
    ]
  };
  document.getElementById("link-total-projects")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-total-projects");
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/HOSPITAL", "total_projects", "TOTAL PROJECTS");
    } else {
      renderMultiYearSection("/HOSPITAL", "total_projects", "TOTAL PROJECTS");
    }
  });

  document.getElementById(hospitalLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/HOSPITAL", "dfit_projects", "DFIT PROJECTS");
    } else {
      renderMultiYearSection("/HOSPITAL", "dfit_projects", "DFIT PROJECTS");
    }
  });
  document.getElementById(hospitalLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/HOSPITAL", "supported_projects", "SUPPORTED PROJECTS");
    } else {
      renderMultiYearSection("/HOSPITAL", "supported_projects", "SUPPORTED PROJECTS");
    }
  });

  hospitalLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);

        const selectedQuarterYear = document.getElementById("yearFilter").value;
        const fileName = d.toLowerCase();
        const basePath = "/HOSPITAL";

        if (selectedQuarterYear !== "All") {
          renderQuarterWiseSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );
        }
      });
    }
  });


  /// -------------------TB DIRECT SERVICES------//////////////////

  //---- TB ANNEXURE ---///
  const tbannexureLinks = {
    total: "link-total-projects-AN",
    dfit: "link-dfit-projects-AN",
    supported: "link-sup-projects-AN",
    districts: [
      "nellore", "delhi", "arasipalyam", "fathimnagar", "nagepalli",
      "pavagada", "andipatti", "ambalamoola", "belatanr"
    ]
  };

  document.getElementById(tbannexureLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Annexure", "total_projects", "TOTAL PROJECTS");
    } else {
      renderMultiYearSection("/TB_Annexure", "total_projects", "TOTAL PROJECTS");
    }
  });
  document.getElementById(tbannexureLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Annexure", "dfit_projects", "DFIT PROJECTS");
    } else {
      renderMultiYearSection("/TB_Annexure", "dfit_projects", "DFIT PROJECTS");
    }
  });
  document.getElementById(tbannexureLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Annexure", "supported_projects", "SUPPORTED PROJECTS");
    } else {
      renderMultiYearSection("/TB_Annexure", "supported_projects", "SUPPORTED PROJECTS");
    }
  });
  tbannexureLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-AN`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);

        const selectedQuarterYear = document.getElementById("yearFilter").value;
        const fileName = d.toLowerCase();
        const basePath = "/TB_Annexure";

        if (selectedQuarterYear !== "All") {
          renderQuarterWiseSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );
        }
      });
    }
  });

  //--- TB CASE FINDINGS ----////
  const tbcaseFindingLinks = {
    total: "link-total-projects-CF",
    dfit: "link-dfit-projects-CF",
    supported: "link-sup-projects-CF",
    districts: [
      "nellore", "delhi", "arasipalyam", "fathimnagar", "nagepalli",
      "pavagada", "andipatti", "ambalamoola", "belatanr"
    ]
  };

  document.getElementById(tbcaseFindingLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Case_Finding", "Total_projects", "TOTAL PROJECTS");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "Total_projects", "TOTAL PROJECTS");
    }
  });
  document.getElementById(tbcaseFindingLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Case_Finding", "dfit_projects", "DFIT PROJECTS");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "dfit_projects", "DFIT PROJECTS");
    }
  });
  document.getElementById(tbcaseFindingLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Case_Finding", "supported_projects", "SUPPORTED PROJECTS");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "supported_projects", "SUPPORTED PROJECTS");
    }
  });
  tbcaseFindingLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-CF`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);

        const selectedQuarterYear = document.getElementById("yearFilter").value;
        const fileName = d.toLowerCase();
        const basePath = "/TB_Case_Finding";

        if (selectedQuarterYear !== "All") {
          renderQuarterWiseSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );
        }
      });
    }
  });

  // --- TB Outcomes ---
  const tbOutcomesLinks = {
    total: "link-total-projects-OC",
    dfit: "link-dfit-projects-OC",
    supported: "link-sup-projects-OC",
    districts: [
      "nellore", "delhi", "arasipalyam", "fathimnagar", "nagepalli",
      "pavagada", "andipatti", "ambalamoola", "belatanr"
    ]
  };
  document.getElementById(tbOutcomesLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Outcomes", "Total_projects", "TOTAL PROJECTS");
    } else {
      renderMultiYearSection("/TB_Outcomes", "Total_projects", "TOTAL PROJECTS");
    }
  });
  document.getElementById(tbOutcomesLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Outcomes", "dfit_projects", "DFIT PROJECTS");
    } else {
      renderMultiYearSection("/TB_Outcomes", "dfit_projects", "DFIT PROJECTS");
    }
  });
  document.getElementById(tbOutcomesLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Outcomes", "supported_projects", "SUPPORTED PROJECTS");
    } else {
      renderMultiYearSection("/TB_Outcomes", "supported_projects", "SUPPORTED PROJECTS");
    }
  });
  tbOutcomesLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-OC`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);

        const selectedQuarterYear = document.getElementById("yearFilter").value;
        const fileName = d.toLowerCase();
        const basePath = "/TB_Outcomes";

        if (selectedQuarterYear !== "All") {
          renderQuarterWiseSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " PROJECTS"
          );
        }
      });
    }
  });

  // YEAR-WISE FILTER
  yearFilter.addEventListener("change", () => {
    selectedYear = yearFilter.value;
    const active = document.querySelector(".active-link");
    if (active) active.click(); // Re-trigger click of active link to reload data for new year
  });

  // --- Sidebar collapsibles ---
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      if (content && content.classList.contains("collapsible-content")) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });

  // --- Subsection Toggle ---
  document.querySelectorAll(".subsection-title").forEach(title => {
    title.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      document.querySelectorAll(".subsection-content").forEach(c => {
        if (c.id !== targetId) c.style.display = "none";
      });
      const el = document.getElementById(targetId);
      if (el) el.style.display = el.style.display === "block" ? "none" : "block";
    });
  });

  // 📥 Download Table + Graph as a single PNG
  function enableDownloadBoth(name = "dfit_report", tableSelector, chartSelector) {
    const btn = document.getElementById("downloadTableBtn");
    const table = document.querySelector(tableSelector);
    const chart = document.querySelector(chartSelector);
    if (!btn || !table || !chart) return;

    btn.style.display = "inline-block";
    btn.onclick = async () => {
      const [tableCanvas, chartCanvas] = await Promise.all([
        html2canvas(table),
        html2canvas(chart)
      ]);

      // Create combined canvas
      const mergedCanvas = document.createElement("canvas");
      const width = Math.max(tableCanvas.width, chartCanvas.width);
      const height = tableCanvas.height + chartCanvas.height + 20;

      mergedCanvas.width = width;
      mergedCanvas.height = height;

      const ctx = mergedCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(tableCanvas, 0, 0);
      ctx.drawImage(chartCanvas, 0, tableCanvas.height + 20);

      // Download
      const link = document.createElement("a");
      link.download = `${name}.png`;
      link.href = mergedCanvas.toDataURL("image/png");
      link.click();
    };
  }

  // 📊 Render Table + Chart Together
  let chartInstance = null;
  function renderQuarterlySection(jsonPath, sectionTitle, containerId, triggerId) {
    const selectedYear = yearFilter.value;
    setActiveLink(triggerId);

    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        const filtered = selectedYear === "All" ? data : data.filter(d => d.year == selectedYear);

        // Table + Graph HTML
        const chartCanvasId = `chart-${containerId}`;
        let html = `<h2>${sectionTitle} – ${selectedYear}</h2>
        <div class="table-container" id="table-section" style="margin-bottom: 20px;">
          <table class="styled-table">
            <thead><tr><th>Year</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th></tr></thead>
            <tbody>`;
        filtered.forEach(d => {
          const total = [d.Q1, d.Q2, d.Q3, d.Q4].reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
          html += `<tr>
            <td>${d.year}</td>
            <td>${d.Q1 ?? "-"}</td>
            <td>${d.Q2 ?? "-"}</td>
            <td>${d.Q3 ?? "-"}</td>
            <td>${d.Q4 ?? "-"}</td>
            <td>${total}</td>
          </tr>`;
        });
        html += `</tbody></table></div>
       <button id="downloadTableBtn" class="download-btn"></button>
        <div style="margin-top: 30px;">
          <canvas id="${chartCanvasId}" style="max-height: 400px;"></canvas>
        </div>`;

        contentArea.innerHTML = html;

        // Chart setup
        const labels = [], values = [];
        filtered.forEach(entry => {
          const year = entry.year;
          ["Q1", "Q2", "Q3", "Q4"].forEach(q => {
            if (entry[q] != null) {
              labels.push(`${q} ${year}`);
              values.push(entry[q]);
            }
          });
        });

        const ctx = document.getElementById(chartCanvasId).getContext("2d");
        if (chartInstance) chartInstance.destroy();

        const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        chartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: sectionTitle,
              data: values,
              borderColor: color,
              backgroundColor: color + "33",
              pointBackgroundColor: color,
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            layout: {
              padding: {
                right: 30 // 👈 Add extra space on the right for last label
              }
            },
            plugins: {
              datalabels: {
                align: "top",
                anchor: "end",
                color: "#000",
                font: {
                  weight: "bold",
                  size: 12
                },
                clamp: true // 👈 Prevents overflow outside canvas
              },
              tooltip: {
                titleFont: { weight: "bold", size: 14 },
                bodyFont: { weight: "bold", size: 12 }
              },
              legend: {
                labels: {
                  color: "#000",
                  font: {
                    size: 14,
                    weight: "bold"
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: "#000",
                  font: { size: 12, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Values",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              },
              x: {
                ticks: {
                  color: "#000",
                  font: { size: 12, weight: "bold" }
                },
                title: {
                  display: true,
                  text: "Quarter-wise",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: false
          },

          plugins: [ChartDataLabels]
        });

        // Enable combined download
        enableDownloadBoth(containerId, "#table-section", `#${chartCanvasId}`);
      });
  }

  // 🔗 Section Mapping and Binding
  const sectionMap = {
    "opd": ["/data/opd.json", "Out Patients Statistics"],
    "new-lep": ["/data/new_lep_cases.json", "New Leprosy Cases"],
    "gii": ["/data/gii.json", "New Leprosy Cases With OPD"],
    "lepra": ["/data/lepra_reaction.json", "Lepra Reactions Cases"],
    "rcs": ["/data/rcs_done_cases.json", "RCS Cases Done"],
    "lep-adm": ["/data/lep_admissions.json", "Leprosy Admissions"],
    "lep-bed": ["/data/lep_bed_days.json", "Leprosy Bed Days"],
    "pre-tb": ["/data/pre_tb.json", "Presumptive TB cases"],
    "tot-tb": ["/data/tb_cases.json", "Total TB cases"],
    "nsp-tb": ["/data/nsp.json", "NSP CURE TB Cases %"],
    "rt-tb": ["/data/rt.json", "RT CURE TB Cases %"],
    "tb-bed": ["/data/tb_bed_days.json", "TUBERCULOSIS Bed Days"]
  };

  Object.keys(sectionMap).forEach(id => {
    const [jsonPath, title] = sectionMap[id];
    document.getElementById(id).addEventListener("click", () =>
      renderQuarterlySection(jsonPath, title, "content-area", id)
    );
  });

  // 🔄 Year Filter Change
  yearFilter.addEventListener("change", () => {
    const active = document.querySelector(".subsection-title.active-link");
    if (active && sectionMap[active.id]) {
      const [jsonPath, title] = sectionMap[active.id];
      renderQuarterlySection(jsonPath, title, "content-area", active.id);
    }
  });
});