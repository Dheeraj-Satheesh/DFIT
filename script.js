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
        || contents === "grand total";


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
        <h2>${sectionName} Overview – ${years.join(', ')}</h2>
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
        // const followUp = data.find(d => d.Contents === "No. of follow up");
        const drtb = data.find(d => d.Contents === "DR TB cases screened");

        const valuesPresumptive = labels.map(y => (presumptive[y] && presumptive[y].trim() !== "") ? parseInt(presumptive[y]) : 0);
        // const valuesFollowUp = labels.map(y => (followUp[y] && followUp[y].trim() !== "") ? parseInt(followUp[y]) : 0);
        const valuesDRTB = labels.map(y => (drtb[y] && drtb[y].trim() !== "") ? parseInt(drtb[y]) : 0);

        let html = `
        <div class="table-container" id="table-section">
          <h2>${sectionTitle} (${labels.join(", ")})</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Contents</th>
                ${labels.map(y => `<th>${y}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr><td>No. of Presumptive</td>${valuesPresumptive.map(val => `<td>${val}</td>`).join("")}</tr>
              <tr><td>DR TB cases screened</td>${valuesDRTB.map(val => `<td>${val}</td>`).join("")}</tr>
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
              // {
              //   label: "No. of follow up",
              //   data: valuesFollowUp,
              //   borderColor: "#b22222",
              //   backgroundColor: "#b22222",
              //   pointBackgroundColor: "#b22222",
              //   borderWidth: 2,
              //   tension: 0,
              //   fill: false,
              //   pointRadius: 4
              // },
              {
                label: "DR TB cases screened",
                data: valuesDRTB,
                borderColor: "#b22222",
                backgroundColor: "#b22222",
                pointBackgroundColor: "#b22222",
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointRadius: 4
              }
            ]
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
                offset: true,
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
    renderIRLMultiTrend("dharbanga_irl.json", "Reference Laboratories trend – Dharbanga IRL", "dharbangaChart");
  });

  document.getElementById("n-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("nellore_irl.json", "Reference Laboratories trend – Nellore IRL", "nelloreChart");
  });

  document.getElementById("tp-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("total_irl.json", "Reference Laboratories trend – Total IRL", "totalChart");
  });


  // Annual-Wise Analysis

  let genericChartInstance = null;

  function renderAnnualGraphTableAndChart(folder, jsonFile, sectionTitle) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    const selectedYears = getSelectedYears();
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
          <h2>${sectionTitle} – ${labels.join(", ")}</h2>
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

  const annualGraphLinks = {
    "tp-opd": { folder: "OPD", file: "tp_opd.json", title: "OPD – Total Projects" },
    "dfit-opd": { folder: "OPD", file: "dfit_opd.json", title: "OPD – DFIT Projects" },
    "sup-opd": { folder: "OPD", file: "sup_opd.json", title: "OPD – Supported Projects" },

    "tp-lep": { folder: "LEPROSY", file: "tp.json", title: "New Leprosy cases Diagnosed – Total Projects" },
    "dfit-lep": { folder: "LEPROSY", file: "dfit.json", title: "New Leprosy cases Diagnosed – DFIT Projects" },
    "sup-lep": { folder: "LEPROSY", file: "sup.json", title: "New Leprosy cases Diagnosed – Supported Projects" },

    // Add entries for LEPBED, LEPRA, LEPROSY, NSP, OPD, PRETB, RCS, RT, TB
    "tp-dis": { folder: "DISABILITY", file: "tp.json", title: "New Leprosy cases with Grade II Disability – Total Projects" },
    "dfit-dis": { folder: "DISABILITY", file: "dfit.json", title: "New Leprosy cases with Grade II Disability – DFIT Projects" },
    "sup-dis": { folder: "DISABILITY", file: "sup.json", title: "New Leprosy cases with Grade II Disability – Supported Projects" },

    "tp-lepra": { folder: "LEPRA", file: "tp.json", title: "Lepra Reaction Treated – Total Projects" },
    "dfit-lepra": { folder: "LEPRA", file: "dfit.json", title: "Lepra Reaction Treated – DFIT Projects" },
    "sup-lepra": { folder: "LEPRA", file: "sup.json", title: "Lepra Reaction Treated – Supported Projects" },

    "tp-rcs": { folder: "RCS", file: "tp.json", title: "Deformity correction surgeries(RCS) – Total Projects" },
    "dfit-rcs": { folder: "RCS", file: "dfit.json", title: "Deformity correction surgeries(RCS) – DFIT Projects" },
    "sup-rcs": { folder: "RCS", file: "sup.json", title: "Deformity correction surgeries(RCS) – Supported Projects" },

    "tp-lepad": { folder: "LEPAD", file: "tp.json", title: "Hospital admission of leprosy patients with complications – Total Projects" },
    "dfit-lepad": { folder: "LEPAD", file: "dfit.json", title: "Hospital admission of leprosy patients with complications – DFIT Projects" },
    "sup-lepad": { folder: "LEPAD", file: "sup.json", title: "Hospital admission of leprosy patients with complications  – Supported Projects" },

    "tp-lepbed": { folder: "LEPBED", file: "tp.json", title: "Leprosy Patients Bed occupancy – Total Projects" },
    "dfit-lepbed": { folder: "LEPBED", file: "dfit.json", title: "Leprosy Patients Bed occupancy – DFIT Projects" },
    "sup-lepbed": { folder: "LEPBED", file: "sup.json", title: "Leprosy Patients Bed occupancy – Supported Projects" },

    "tp-pretb": { folder: "PRETB", file: "tp.json", title: "Presumptive TB cases sputum examination – Total Projects" },
    "dfit-pretb": { folder: "PRETB", file: "dfit.json", title: "Presumptive TB cases sputum examination – DFIT Projects" },
    "sup-pretb": { folder: "PRETB", file: "sup.json", title: "Presumptive TB cases sputum examination – Supported Projects" },

    "tp-tb": { folder: "TB", file: "tp.json", title: "Total TB cases Diagnosed – Total Projects" },
    "dfit-tb": { folder: "TB", file: "dfit.json", title: "Total TB cases Diagnosed – DFIT Projects" },
    "sup-tb": { folder: "TB", file: "sup.json", title: "Total TB cases Diagnosed – Supported Projects" },

    "tp-nsp": { folder: "NSP", file: "tp.json", title: "Outcomes of TB-NSP Cured Rate  – Total Projects" },
    "dfit-nsp": { folder: "NSP", file: "dfit.json", title: "Outcomes of TB-NSP Cured Rate – DFIT Projects" },
    "sup-nsp": { folder: "NSP", file: "sup.json", title: "Outcomes of TB-NSP Cured Rate – Supported Projects" },


    "tp-rt": { folder: "RT", file: "tp.json", title: "Outcomes of TB-RT Cured Rate  – Total Projects" },
    "dfit-rt": { folder: "RT", file: "dfit.json", title: "Outcomes of TB-RT Cured Rate – DFIT Projects" },
    "sup-rt": { folder: "RT", file: "sup.json", title: "Outcomes of TB-RT Cured Rate – Supported Projects" },

  };
  Object.entries(annualGraphLinks).forEach(([id, config]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", e => {
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

        let html = `<div class="table-container"><h2>Livelihood Enhancement Program Report - ${selectedYears.join(", ")}</h2>`;
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

        let html = `<div class="table-container"><h2>Nutritional Support Report - ${selectedYears.join(", ")}</h2>`;
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
        let html = `<h2>DELHI DRTB SERVICES (${selectedYears.join(", ")})</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>Particulars</th>`;

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

        let html = `<h2>BIHAR DRTB SERVICES (${validYears.join(", ")})</h2>`;
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

          let html = `<h2>${lab.toUpperCase()} IRL Overview (${selectedYears.join(", ")})</h2>`;
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
          let html = `<h2>${heading} DPMR Overview (${validYears.join(", ")})</h2>`;
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
    "gii": ["/data/gii_OPD.json", "New Leprosy Cases With OPD"],
    "lepra": ["/data/lepra_reaction.json", "Lepra Reactions Cases"],
    "rcs": ["/data/rcs_done_cases.json", "RCS Cases Done"],
    "lep-adm": ["/data/lep_admissions.json", "Leprosy Admissions"],
    "lep-bed": ["/data/lep_bed_days.json", "Leprosy Bed Days"],
    "pre-tb": ["/data/pre_tb.json", "Presumptive TB cases"],
    "tot-tb": ["/data/tb_cases.json", "Total TB cases"],
    "nsp-tb": ["/data/nsp.json", "NSP CURED TB Cases %"],
    "rt-tb": ["/data/rt.json", "RT CURED TB Cases %"],
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