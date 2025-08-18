// ✅ Logout button logic
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "login.html";
    });
  }

  // ⛔ Redirect to login if not logged in
  const allowedPages = ["index.html"]; // You can extend this
  const currentPage = window.location.pathname.split("/").pop();

  if (allowedPages.includes(currentPage)) {
    const user = sessionStorage.getItem("username");
    if (!user) {
      window.location.href = "login.html";
    }
  }
});

// Redirect to login if not logged in
if (!sessionStorage.getItem("username")) {
  window.location.href = "login.html";
}
function isAllowedToView(key) {
  const user = sessionStorage.getItem("username");

  if (!user || user === "admin") return true;

  const commonAllowed = ["total_projects", "dfit_projects", "supported_projects"];

  // map of username -> prefixes they can see
  const projectAccess = {
    nellore: ["nellore", "nel-"], // Nellore Hospital
    delhi: ["delhi", "del-"],     // Delhi Hospital
    dos: ["dos"],
    bihar: ["bihar"],                 // DOS Hospital
    polambakkam: ["pol"],         // Polambakkam Rehabilitation Centre
    dhanbad: ["dan"],             // Dhanbad Hospital
    amda: ["amd"],                // Amda Hospital
    arasipalayam: ["ars"],        // Arasipalayam Hospital
    fathimanagar: ["fat"],        // Fathimanagar Hospital
    nagepalli: ["nag"],           // Nagepalli Hospital
    pavagada: ["pav"],            // Pavagada Hospital
    belatanr: ["bel"],            // Belatanr Hospital
    popejohngarden: ["pop"],      // Pope John Garden Hospital
    chilakalapalli: ["chi"],      // Chilakala Palli Hospital
    trivandrum: ["tri"],          // Trivandrum Hospital
    andipatti: ["and"],           // Andipatti Hospital
    ambalamoola: ["amb"]          // Ambalamoola Hospital
  };


  const prefixes = projectAccess[user];
  if (prefixes) {
    return prefixes.some(p => key.toLowerCase().startsWith(p)) ||
      commonAllowed.includes(key.toLowerCase());
  }

  return false;
}

function showToast(message, backgroundColor = "#e63946") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.backgroundColor = backgroundColor;
  toast.className = "toast show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

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
  document.getElementById("selectAllYears").addEventListener("change", function () {
    const allYearBoxes = document.querySelectorAll("#yearCheckboxes input[type='checkbox'][value]");
    allYearBoxes.forEach(cb => cb.checked = this.checked);
  });

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
      // Create wrapper to include title and table
      const wrapper = document.createElement("div");

      // Clone the heading if present
      const heading = container.previousElementSibling?.tagName === "H2"
        ? container.previousElementSibling.cloneNode(true)
        : null;

      if (heading) wrapper.appendChild(heading.cloneNode(true));

      // Clone table
      const clone = container.cloneNode(true);
      clone.style.position = "relative";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.width = container.scrollWidth + "px";
      clone.style.height = container.scrollHeight + "px";

      wrapper.appendChild(clone);

      // Style wrapper and push it off-screen
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.padding = "20px";
      wrapper.style.background = "white";

      document.body.appendChild(wrapper);

      setTimeout(() => {
        html2canvas(wrapper, {
          scrollX: 0,
          scrollY: 0,
          width: wrapper.scrollWidth,
          height: wrapper.scrollHeight,
          windowWidth: wrapper.scrollWidth,
          windowHeight: wrapper.scrollHeight,
          useCORS: true,
          allowTaint: true,
        }).then(canvas => {
          document.body.removeChild(wrapper);
          const link = document.createElement("a");
          link.download = `${name}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      }, 200); // wait for layout
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
      const isTotalRow = contents === "total nsn/nep patients managed"
        || contents === "total nsp patients managed"
        || contents === "total rt+ve pts managed"
        || contents === "total rt neg pts managed"
        || contents === "total ds tb patients diagnosed"
        || contents === "total new leprosy cases detected"
        || contents === "total opd treated"
        || contents === "total adult g ii cases"
        || contents === "total child g ii cases"
        || contents === "total type-i lepra reaction cases"
        || contents === "total type-ii lepra reaction cases"
        || contents === "total major rcs done"
        || contents === "presumptive ds tb found to be positive"
        || contents === "sputum conversion rate for rt patients"
        || contents === "sputum conversion rate for nsp patients"
        || contents === "total beds available for leprosy"
        || contents === "total new patients managed"
        || contents === "total retreatment patients"
        || contents === "total leprosy cases admitted";




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
    if (!isAllowedToView(key)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }
    const years = getSelectedYears();
    const cumulativeData = {};
    const order = [];

    const contentArea = document.getElementById("content-area");

    // Only one heading at the top
    contentArea.innerHTML = `
    <h2>${sectionName} Overview</h2>
    <p>Loading data for years ${years.join(', ')}...</p>
  `;

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
        //  Top heading
        contentArea.innerHTML = `
        <h2>${sectionName} Overview</h2> 
        <div class="table-container">
          ${tableHTML}
        </div>
      `;

        enableDownload(sectionName.replace(/\s+/g, '_'));
      })
      .catch(err => {
        contentArea.innerHTML = `<p>Error loading data for ${sectionName}. Please try again later.</p>`;
        console.error("Multi-year section error:", err);
      });
  }

  // Quarter - wise data display

  function renderQuarterWiseSection(path, key, sectionTitle) {
    if (!isAllowedToView(key)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }
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
        let html = `<h2>${sectionTitle} ${selectedYear}</h2>`;
        html += `<div class="table-container"><table><thead><tr>`;
        html += keys.map(k => `<th>${k}</th>`).join('');
        html += `</tr></thead><tbody>`;

        data.forEach(row => {
          const contents = (
            row["Contents"] ||
            row["Type of cases "] ||
            row["Type of Cases"] ||
            row["Annexure M Contents"] ||
            ""
          ).toString().toLowerCase().trim();

          const isTotalRow =
            contents === "total nsn/nep patients managed" ||
            contents === "total nsp patients managed" ||
            contents === "total rt+ve pts managed" ||
            contents === "total rt neg pts managed" ||
            contents === "total opd treated" ||
            contents === "total new leprosy cases detected" ||
            contents === "total adult g ii cases" ||
            contents === "total child g ii cases" ||
            contents === "total type-i lepra reaction cases" ||
            contents === "total type-ii lepra reaction cases" ||
            contents === "total major rcs done" ||
            contents === "total beds available for leprosy" ||
            contents === "total leprosy cases admitted" ||
            contents === "presumptive ds tb found to be positive" ||
            contents === "sputum conversion rate for rt patients" ||
            contents === "total retreatment patients" ||
            contents === "total ds tb patients diagnosed" ||  // <-- fixed
            contents === "sputum conversion rate for nsp patients" ||           // <-- fixed
            contents === "total new patients managed";

          html += `<tr${isTotalRow ? ' class="highlight-row"' : ''}>`;
          html += keys.map(k => {
            const val = row[k];
            return `<td>${(val !== undefined && val !== null && val.toString().trim() !== "") ? val : "0"}</td>`;
          }).join('');
          html += `</tr>`;
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


  // DPMR SERVICES

  function renderLineDPMR(folder, jsonFile, sectionTitle, suffix) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    let selectedYears = getSelectedYears().filter(y => y >= 2020 && y <= 2024);
    selectedYears.sort();

    const jsonPath = `DPMR-GRAPH/${folder}/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        const labels = selectedYears.map(String);
        const values = selectedYears.map(y => {
          const val = data[0][y];
          return val && val.trim() !== "" ? parseFloat(val) : 0;
        });

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

        const ctx = document.getElementById("annualChart").getContext("2d");
        if (genericChartInstance) genericChartInstance.destroy();

        const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        genericChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: suffix,
              data: values,
              borderColor: color,
              backgroundColor: color + "33",
              pointBackgroundColor: color,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
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
                  lineWidth: 0.5,
                  color: '#ccc'
                },
                ticks: {
                  padding: 10,
                  color: "#000",
                  font: { size: 12, weight: "bold" },
                  callback: value => value.toFixed(0)
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

        enableDownloadBoth(`${sectionTitle.replace(/\s+/g, "_")}_Report`, "#table-section", "#annualChart");
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
        console.error("Fetch error:", err);
      });
  }

  const dpmrFolders = {
    "ut": "UT",
    "lepra": "LEP",
    "self": "SC",
    "mcr": "MCR"
  };

  const states = {
    "tot": { file: "tot.json", name: "DFIT Supported Six States" },
    "bih": { file: "bihar.json", name: "Bihar State DFIT Supported" },
    "jhar": { file: "jhar.json", name: "Jharkhand State DFIT Supported" },
    "chat": { file: "chat.json", name: "Chhattisgarh State DFIT Supported" },
    "kar": { file: "kar.json", name: "Karnataka State DFIT Supported" },
    "tn": { file: "tn.json", name: "Tamil Nadu State DFIT Supported" },
    "ap": { file: "ap.json", name: "Andhra Pradesh State DFIT Supported" }
  };

  const setupDPMREvents = (prefix, folderKey) => {
    Object.keys(states).forEach(stateKey => {
      const id = `${stateKey}-dpmr-${prefix}`;
      const file = states[stateKey].file;
      const stateName = states[stateKey].name;
      const folder = dpmrFolders[folderKey];

      let suffix = "";
      switch (folderKey) {
        case "ut":
          suffix = "Percentage of UT Patients taking regular treatment";
          break;
        case "lepra":
          suffix = "Percentage of Lepra Reactions Patients taking regular treatment";
          break;
        case "self":
          suffix = "Percentage of Practicing self care regularly";
          break;
        case "mcr":
          suffix = "Percentage of Patients wearing appropriate Footwear regularly";
          break;
      }

      const title = `${stateName} DPMR Services`;
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", e => {
          e.preventDefault();
          setActiveLink(e.target);
          renderLineDPMR(folder, file, title, suffix);
        });
      }
    });
  };

  // Set up for each category
  setupDPMREvents("ut", "ut");
  setupDPMREvents("lepra", "lepra");
  setupDPMREvents("self", "self");
  setupDPMREvents("mcr", "mcr");

  // Constants for project codes and names
  const projects1 = [
    { code: "tp", title: "All Projects Quarter-wise" },
    { code: "dfit", title: "DFIT Projects Quarter-wise" },
    { code: "sup", title: "Supported Projects Quarter-wise" },
    { code: "nel", title: "Nellore Hospital Quarter-wise" },
    { code: "del", title: "Delhi Hospital Quarter-wise" },
    { code: "dos", title: "DOS Hospital Quarter-wise" },
    { code: "pol", title: "Polambakkam Rehabilitation Centre Quarter-wise" },
    { code: "dan", title: "Dhanbad Hospital Quarter-wise" },
    { code: "amd", title: "Amda Hospital Quarter-wise" },
    { code: "ars", title: "Arasipalayam Hospital Quarter-wise" },
    { code: "fat", title: "Fathimanagar Hospital Quarter-wise" },
    { code: "nag", title: "Nagepalli Hospital Quarter-wise" },
    { code: "pav", title: "Pavagada Hospital Quarter-wise" },
    { code: "bel", title: "Belatanr Hospital Quarter-wise" },
    { code: "pop", title: "Pope John Garden Hospital Quarter-wise" },
    { code: "chi", title: "Chilakala Palli Hospital Quarter-wise" },
    { code: "tri", title: "Trivandrum Hospital Quarter-wise" },
    { code: "and", title: "Andipatti Hospital Quarter-wise" },
    { code: "amb", title: "Ambalamoola Hospital Quarter-wise" },
  ];

  // Mapping quarter-wise categories
  const qCategories = {
    OPD: "Out-Patients Treated",
    LEPROSY: "New Leprosy Cases Diagnosed",
    DISABILITY: "New G-II Leprosy Cases",
    LEPRA: "Total Lepra Reaction Cases Treated",
    RCS: "Reconstructive Surgeries Done",
    LEPAD: "Leprosy In-patients Managed",
    LEPBED: "Leprosy Bed Days",
    LEPBEDRATE: "Leprosy Patients Bed occupancy rate",
    PRETB: "Presumptive DS TB Cases Sputum Examined",
    TB: "Total DS TB Cases Diagnosed",
    NSP: "NSP Cure Rate",
    RT: "RT Cure Rate",
  };

  // Suffix mapping for HTML IDs (quarter-wise)
  const qSuffixMap = {
    OPD: "qopd",
    LEPROSY: "qlep",
    DISABILITY: "qdis",
    LEPRA: "qlepra",
    RCS: "qrcs",
    LEPAD: "qlepad",
    LEPBED: "qlepbed",
    LEPBEDRATE: "qlepbedr",
    PRETB: "qpretb",
    TB: "qtb",
    NSP: "qnsp",
    RT: "qrt",
  };

  // Building the quarterGraphLinks object
  const quarterGraphLinks = {};
  Object.entries(qCategories).forEach(([folder, prefix]) => {
    const suffix = qSuffixMap[folder];
    projects1.forEach(({ code, title }) => {
      quarterGraphLinks[`${code}-${suffix}`] = {
        folder,
        file: `${code}.json`,
        title: `${title} ${prefix}`,
      };
    });
  });

  Object.entries(quarterGraphLinks).forEach(([id, config]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveLink(e.target);

        // 🔑 Derive projectKey from the ID
        let projectKey = "";
        if (id.startsWith("nel")) projectKey = "nellore";
        else if (id.startsWith("del")) projectKey = "delhi";
        else if (id.startsWith("tp")) projectKey = "total_projects";
        else if (id.startsWith("dfit")) projectKey = "dfit_projects";
        else if (id.startsWith("sup")) projectKey = "supported_projects";
        else if (id.startsWith("dos")) projectKey = "dos";
        else if (id.startsWith("pol")) projectKey = "polambakkam";
        else if (id.startsWith("dan")) projectKey = "dhanbad";
        else if (id.startsWith("amd")) projectKey = "amda";
        else if (id.startsWith("ars")) projectKey = "arasipalayam";
        else if (id.startsWith("fat")) projectKey = "fathimanagar";
        else if (id.startsWith("nag")) projectKey = "nagepalli";
        else if (id.startsWith("pav")) projectKey = "pavagada";
        else if (id.startsWith("bel")) projectKey = "belatanr";
        else if (id.startsWith("pop")) projectKey = "popejohngarden";
        else if (id.startsWith("chi")) projectKey = "chilakalapalli";
        else if (id.startsWith("tri")) projectKey = "trivendrum";
        else if (id.startsWith("and")) projectKey = "andipatti";
        else if (id.startsWith("amb")) projectKey = "ambalamoola";

        const years = getSelectedYears();
        renderQuarterTableAndChart(config.folder, config.file, config.title, projectKey);
      });
    }
  });

  function renderQuarterTableAndChart(folder, fileName, title, projectKey) {
    if (!isAllowedToView(projectKey)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }
    const selectedYears = getSelectedYears().filter(y => y >= 2020 && y <= 2025);
    const container = document.getElementById("content-area");
    container.innerHTML = "<p>Loading...</p>";

    // Destroy old chart if exists
    if (window.quarterChartInstance) {
      window.quarterChartInstance.destroy();
      window.quarterChartInstance = null;
    }

    fetch(`/OUTPUT_QTR/${folder}/${fileName}`)
      .then((res) => res.json())
      .then((fullData) => {
        const quarters = ["Q1", "Q2", "Q3", "Q4"];
        const labels = [];
        const values = [];

        const filteredData = {};
        selectedYears.forEach((year) => {
          if (fullData[year]) {
            filteredData[year] = fullData[year];
          }
        });

        let html = `
  <div class="table-container" id="table-section">
    <h3 style="text-align:center; margin: 10px 0;">${title}</h3>
    <button id="downloadTableBtn" style="display:none; margin-bottom:10px;">Download Table & Chart</button>
    <table class="quarter-table">
      <thead>
        <tr style="background-color: #f7931e; color: white;">
          <th>Year</th>`;
        quarters.forEach(q => {
          html += `<th>${q}</th>`;
        });
        html += `<th>Annual</th></tr>
      </thead>
      <tbody>`;

        selectedYears.forEach((year) => {
          html += `<tr><td>${year}</td>`;
          let sum = 0;
          let count = 0;

          quarters.forEach((q) => {
            const val = filteredData[year]?.[q];
            if (val !== undefined && val !== null && val !== "") {
              html += `<td>${val}</td>`;
              sum += +val;
              count++;
              labels.push(`${q} ${year}`);
              values.push(+val);
            } else {
              html += `<td>-</td>`;
              labels.push(`${q} ${year}`);
              values.push(null);
            }
          });

          // For NSP and RT, calculate average instead of total
          if (["NSP", "RT", "LEPBEDRATE"].includes(folder)) {
            const avg = count > 0 ? (sum / count).toFixed(1) : "-";
            html += `<td>${avg}</td></tr>`;
          } else {
            html += `<td>${sum || "-"}</td></tr>`;
          }
        });

        html += `
      </tbody>
    </table>
  </div>
  <div style="height: 400px;">
    <canvas id="quarterChart"></canvas>
  </div>
`;

        container.innerHTML = html;


        const ctx = document.getElementById("quarterChart").getContext("2d");
        const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // New Chart config with datalabels
        window.quarterChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: title,
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
                right: 30,
              }
            },
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
                },
                padding: 20
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
        // ✅ Combined Download
        enableDownloadBoth(`${title.replace(/\s+/g, "_")}_Report`, "#table-section", "#quarterChart");
      })
      .catch((err) => {
        container.innerHTML = `<p style="color:red;">Error loading data.</p>`;
        console.error(err);
      });
  }





  // Bar Graph for LEP and DPMR
  function renderBar(jsonFile, heading, sectionTitle) {
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";
    let selectedYears = getSelectedYears();

    selectedYears = selectedYears.filter(y => y >= 2014 && y < 2025);
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
  document.getElementById("b-lep").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("lep.json", "Total Livelihood Enhancement Programme(LEP) Supported", "Total Livelihood Enhancement Programme(LEP) Supported");
  });
  document.getElementById("b-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("nsp.json", "Total Nutritional supplements supported for TB Patients", "Total Nutritional supplements supported for TB Patients");
  });
  document.getElementById("del-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("delhi.json", "Delhi project Nutritional supported for TB Patients", "Delhi project Nutritional supplements supported for TB Patients");
  });
  document.getElementById("bih-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("bihar.json", "Bihar project Nutritional supported for TB Patients", "Bihar project Nutritional supplements supported for TB Patients");
  });
  document.getElementById("ap-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderBar("ap.json", "Andhra pradesh project Nutritional supported for TB Patients", "Andhra pradesh project Nutritional supplements supported for TB Patients");
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
    renderLepSupportTrend("lep.json", "Total Projects types of LEP Supported", "leprosySupportChart");
  });
  document.getElementById("three-np").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderLepSupportTrend("nut.json", "State-Wise Nutritional supplements supported for TB Patients", "nutritionSupportChart");
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
              <tr><td>No. of DR TB Presumptive Cases Examined </td>${valuesPresumptive.map(val => `<td>${val}</td>`).join("")}</tr>
              <tr><td>No. of DR TB Follow-up Examined</td>${valuesFollowUp.map(val => `<td>${val}</td>`).join("")}</tr>
              <tr><td>No. of DR TB Cases Confirmed</td>${valuesDRTB.map(val => `<td>${val}</td>`).join("")}</tr>
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
                label: "No. of Presumptive DR TB Cases Exam",
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
                label: "No. of DR TB follow-up Cases Exam",
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
                label: "No. of DR TB cases Confirmed",
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
                label: "No. of Presumptive DR TB Cases Exam",
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
                label: "No. of DR TB follow-up Cases Exam",
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
                label: "No. of DR TB cases Confirmed",
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
    renderIRLMultiTrend("dharbanga_irl.json", "Darbhanga DR TB Lab - Annual Statistics", "dharbangaChart");
  });

  document.getElementById("n-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("nellore_irl.json", "Nellore DR TB Lab - Annual Statistics", "nelloreChart");
  });

  document.getElementById("tp-irl").addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderIRLMultiTrend("total_irl.json", " Nellore & Darbhanga DR TB Laboratories- Annual Statistics", "totalChart");
  });


  // Annual-Wise Analysis

  let genericChartInstance = null;
  function renderAnnualGraphTableAndChart(folder, jsonFile, sectionTitle, projectKey) {
    if (!isAllowedToView(projectKey)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = "<p>Loading data...</p>";

    const selectedYears = getSelectedYears().filter(y => y !== 2025);
    selectedYears.sort();

    const jsonPath = `OUTPUT/${folder}/${jsonFile}`;
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        // ✅ Labels and Values
        const labels = selectedYears.map(String);
        const values = selectedYears.map(y => {
          const val = data[0][y];
          return val && val.trim() !== "" ? parseFloat(val) : 0;

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
    { code: "tp", title: "All Projects" },
    { code: "dfit", title: "DFIT Projects" },
    { code: "sup", title: "Supported Projects" },
    { code: "nel", title: "Nellore Hospital" },
    { code: "del", title: "Delhi Hospital" },
    { code: "dos", title: "DOS Hospital" },
    { code: "pol", title: "Polambakkam Rehabilitation Centre" },
    { code: "dan", title: "Dhanbad Hospital" },
    { code: "amd", title: "Amda Hospital" },
    { code: "ars", title: "Arasipalayam Hospital" },
    { code: "fat", title: "Fathimanagar Hospital" },
    { code: "nag", title: "Nagepalli Hospital" },
    { code: "pav", title: "Pavagada Hospital" },
    { code: "bel", title: "Belatanr Hospital" },
    { code: "pop", title: "Pope John Garden Hospital" },
    { code: "chi", title: "Chilakala Palli Hospital" },
    { code: "tri", title: "Trivandrum Hospital" },
    { code: "and", title: "Andipatti Hospital" },
    { code: "amb", title: "Ambalamoola Hospital" },
  ];

  // Maps for categories
  const categories = {
    OPD: "Out-Patients Treated – Annual Statistics ",
    LEPROSY: "New Leprosy Cases Diagnosed – Annual Statistics",
    DISABILITY: "New Leprosy Cases with Grade II Disabilities Detected – Annual Statistics ",
    LEPRA: "Total Lepra Reaction Cases Treated – Annual Statistics ",
    RCS: "Reconstructive Surgeries Done – Annual Statistics",
    LEPAD: "In-patients Managed for leprosy patients with complications – Annual Statistics",
    LEPBED: "Leprosy Patients Bed occupancy – Annual Statistics",
    LEPBEDRATE: "Leprosy Patients Bed occupancy rate – Annual Statistics",
    PRETB: "Presumptive DS TB Cases sputum examination – Annual Statistics",
    TB: "Total DS TB Cases Diagnosed – Annual Statistics",
    NSP: "Treatment Outcomes of DS TB - NSP Cure Rate – Annual Statistics",
    RT: "Treatment Outcomes of DS TB - RT Cure Rate – Annual Statistics",
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
    LEPBEDRATE: "lepbedr",
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
        title: `${title} ${prefix}`,
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

        // 🔑 Derive projectKey from ID
        let projectKey = "";
        if (id.startsWith("nel")) projectKey = "nellore";
        else if (id.startsWith("del")) projectKey = "delhi";
        else if (id.startsWith("tp")) projectKey = "total_projects";
        else if (id.startsWith("dfit")) projectKey = "dfit_projects";
        else if (id.startsWith("sup")) projectKey = "supported_projects";
        else if (id.startsWith("dos")) projectKey = "dos";
        else if (id.startsWith("pol")) projectKey = "polambakkam";
        else if (id.startsWith("dan")) projectKey = "dhanbad";
        else if (id.startsWith("amd")) projectKey = "amda";
        else if (id.startsWith("ars")) projectKey = "arasipalayam";
        else if (id.startsWith("fat")) projectKey = "fathimanagar";
        else if (id.startsWith("nag")) projectKey = "nagepalli";
        else if (id.startsWith("pav")) projectKey = "pavagada";
        else if (id.startsWith("bel")) projectKey = "belatanr";
        else if (id.startsWith("pop")) projectKey = "popejohngarden";
        else if (id.startsWith("chi")) projectKey = "chilakalapalli";
        else if (id.startsWith("tri")) projectKey = "trivandrum";
        else if (id.startsWith("and")) projectKey = "andipatti";
        else if (id.startsWith("amb")) projectKey = "ambalamoola";

        renderAnnualGraphTableAndChart(config.folder, config.file, config.title, projectKey);
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

        let html = `<div class="table-container"><h2>All Projects Livelihood Enhancement Program(LEP) Supported Report</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;

        data.forEach(row => {
          const isHighlight = (row["Category"] ?? "").trim().toLowerCase() === "total lep (socio-economic support) supported";

          html += `<tr${isHighlight ? ' class="highlight-row"' : ''}>`;
          html += `<td>${row["Category"]}</td>`;
          html += columns.map(c => `<td>${row[c] ?? ""}</td>`).join("");
          html += `</tr>`;
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

        let html = `<div class="table-container"><h2>State-Wise Nutritional Support Report</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;

        data.forEach(row => {
          const isHighlight = (row["Category"] ?? "").trim().toLowerCase() === "total nutritional supplements supported";

          html += `<tr${isHighlight ? ' class="highlight-row"' : ''}>`;
          html += `<td>${row["Category"]}</td>`;
          html += columns.map(c => `<td>${row[c] ?? ""}</td>`).join("");
          html += `</tr>`;
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
    const key = "delhi";
    if (!isAllowedToView(key)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }

    const selectedYear = document.getElementById("yearFilter").value;
    const selectedYears = selectedYear === "All" ? getSelectedYears() : [selectedYear];

    fetch("delhi_drtb.json")
      .then(res => res.json())
      .then(data => {
        let html = `<h2>Delhi DR TB Services Annual Report</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>Particulars</th>`;

        html += selectedYears.map(yr => `<th>${yr}</th>`).join("");
        html += "</tr></thead><tbody>";

        data.forEach(row => {
          const isSuccessRateRow = (row["Particulars"] ?? "").trim().toLowerCase() === "treatment success rate";

          html += `<tr${isSuccessRateRow ? ' class="highlight-row"' : ''}>`;
          html += `<td>${row["S.NO"]}</td><td>${row["Particulars"]}</td>`;
          html += selectedYears.map(yr => `<td>${row[yr] ?? ""}</td>`).join("");
          html += "</tr>";
        });


        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`DELHI DR TB_Annual_Report_${selectedYears.join("_")}`);
      });
  });


  // --- DRTB Bihar ---

  document.getElementById("link-bihar-drtb")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-bihar-drtb");
    const key = "bihar";
    if (!isAllowedToView(key)) {
      showToast("🚫 Access Denied: You are not allowed to view this section.");
      return;
    }
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

        let html = `<h2>Bihar State DR TB Services Annual Report</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>DRTB contents</th>`;
        html += validYears.map(yr => `<th>${yr}</th>`).join("");
        html += "</tr></thead><tbody>";

        const highlightContents = [
          "no. of drtb irregular  patients retrieved.",
          "no. of dr tb cases provided nutritional support.",
          "no. of drtb patients lep supported"
        ];

        data.forEach(row => {
          const content = (row["DRTB contents"] ?? "").trim().toLowerCase();
          const isHighlight = highlightContents.includes(content);

          html += `<tr${isHighlight ? ' class="highlight-row"' : ''}>`;
          html += `<td>${row["S.NO"]}</td><td>${row["DRTB contents"]}</td>`;
          html += validYears.map(yr => `<td>${row[yr] ?? ""}</td>`).join("");
          html += `</tr>`;
        });

        html += "</tbody></table></div>";
        contentArea.innerHTML = html;

        enableDownload(`Bihar State DR TB Services Annual Report_${validYears.join("_")}`);
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

  const labHeadings = {
    total: "Nellore & Darbhanga DR TB LAB Services Annual Report",
    nellore: "Nellore DR TB LAB Services Annual Report",
    darbhanga: "Darbhanga DR TB LAB Services Annual Report"
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

          let html = `<h2>${labHeadings[lab]}</h2>`;
          html += `<div class="table-container"><table><thead><tr><th>Contents</th>`;
          html += selectedYears.map(y => `<th>${y}</th>`).join("");
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            const contents = (row["Contents"] ?? "").trim().toLowerCase();
            const isHighlightRow = contents === "total dr tb patients diagnosed";

            html += `<tr${isHighlightRow ? ' class="highlight-row"' : ''}>`;
            html += `<td>${row["Contents"]}</td>`;
            html += selectedYears.map(y => `<td>${row[y] ?? ""}</td>`).join("");
            html += `</tr>`;
          });

          html += `</tbody></table></div>`;
          contentArea.innerHTML = html;

          enableDownload(`${labHeadings[lab].replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}_${selectedYears.join("_")}`);

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
            tot: "All States",
            bihar: "Bihar State",
            jhar: "Jharkhand State",
            kar: "Karnataka State",
            tn: "Tamil Nadu State",
            chat: "Chhattisgarh State",
            ap: "Andhra Pradesh State"
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
          let html = `<h2>${heading} DPMR Services Annual Report</h2>`;
          html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>DPMR Contents</th>`;
          html += validYears.map(y => `<th>${y}</th>`).join("");
          html += `</tr></thead><tbody>`;

          const highlightContents = [
            "number of patients practising self care regularly",
            "number of patients wearing appropriate foot wear regularly",
            "number of patients rcs done",
            "number of persons received lep support during the year",
            "number of under treatment patients taking regular treatment",
            "number of lepra reaction patients taking regular treatment"
          ];

          data.forEach(row => {
            const content = (row["DPMR Contents"] ?? "").trim().toLowerCase();
            const isHighlight = highlightContents.includes(content);

            html += `<tr${isHighlight ? ' class="highlight-row"' : ''}>`;
            html += `<td>${row["S.NO"]}</td><td>${row["DPMR Contents"]}</td>`;
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
      renderQuarterWiseSection("/HOSPITAL", "total_projects", "All Projects Leprosy Referral Services Quarter-Wise Report");
    } else {
      renderMultiYearSection("/HOSPITAL", "total_projects", "All Projects Leprosy Referral Services Annual Report");
    }
  });

  document.getElementById(hospitalLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/HOSPITAL", "dfit_projects", "DFIT Projects Leprosy Referral Services Quarter-Wise Report ");
    } else {
      renderMultiYearSection("/HOSPITAL", "dfit_projects", "DFIT Projects Leprosy Referral Services Annual Report");
    }
  });
  document.getElementById(hospitalLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/HOSPITAL", "supported_projects", "Supported Projects Leprosy Referral Services Quarter-Wise Report");
    } else {
      renderMultiYearSection("/HOSPITAL", "supported_projects", "Supported Projects Leprosy Referral Services Annual Report");
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

        // Custom title for polambakam
        const isPolambakam = d === "polambakam";
        const titleBase = isPolambakam
          ? "Polambakkam Rehabilitation Centre Leprosy Referral Services"
          : `${d.toUpperCase()} Hospital Leprosy Referral Services`;

        if (selectedQuarterYear !== "All") {
          renderQuarterWiseSection(
            basePath,
            fileName,
            `${titleBase} Quarter-Wise Report`
          );
        } else {
          renderMultiYearSection(
            basePath,
            fileName,
            `${titleBase} Annual Report`
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
      renderQuarterWiseSection("/TB_Annexure", "total_projects", "All Projects DS TB Annexure-M Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Annexure", "total_projects", "All Projects DS TB Annexure-M Annual Report");
    }
  });
  document.getElementById(tbannexureLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Annexure", "dfit_projects", "DFIT Projects DS TB Annexure-M Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Annexure", "dfit_projects", "DFIT Projects DS TB Annexure-M Annual Report");
    }
  });
  document.getElementById(tbannexureLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Annexure", "supported_projects", "Supported Projects DS TB Annexure-M Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Annexure", "supported_projects", "Supported Projects DS TB Annexure-M Annual Report");
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
            d.toUpperCase() + " Hospital DS TB Annexure-M Quarter-Wise Report"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " Hospital DS TB Annexure-M Annual Report"
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
      renderQuarterWiseSection("/TB_Case_Finding", "total_projects", "All Projects DS TB Cases Diagnosed and Sputum Conversion Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "total_projects", "All Projects DS TB Cases Diagnosed and Sputum Conversion Annual Report");
    }
  });
  document.getElementById(tbcaseFindingLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Case_Finding", "dfit_projects", "DFIT Projects DS TB Cases Diagnosed and Sputum Conversion Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "dfit_projects", "DFIT Projects DS TB Cases Diagnosed and Sputum Conversion Annual Report");
    }
  });
  document.getElementById(tbcaseFindingLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Case_Finding", "supported_projects", "Supported Projects DS TB Cases Diagnosed and Sputum Conversion Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Case_Finding", "supported_projects", "Supported Projects DS TB Cases Diagnosed and Sputum Conversion Annual Report");
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
            d.toUpperCase() + " Hospital DS TB Cases Diagnosed and Sputum Conversion Quarter-wise Report"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " Hospital DS TB Cases Diagnosed and Sputum Conversion Annual Report"
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
      renderQuarterWiseSection("/TB_Outcomes", "total_projects", "All Projects DS TB Outcomes Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Outcomes", "total_projects", "All Projects DS TB Outcomes Annual Report");
    }
  });
  document.getElementById(tbOutcomesLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Outcomes", "dfit_projects", "DFIT Projects DS TB Outcomes Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Outcomes", "dfit_projects", "DFIT Projects DS TB Outcomes Annual Report");
    }
  });
  document.getElementById(tbOutcomesLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    const selectedQuarterYear = document.getElementById("yearFilter").value;
    if (selectedQuarterYear !== "All") {
      renderQuarterWiseSection("/TB_Outcomes", "supported_projects", "Supported Projects DS TB Outcomes Quarter-Wise Report");
    } else {
      renderMultiYearSection("/TB_Outcomes", "supported_projects", "Supported Projects DS TB Outcomes Annual Report");
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
            d.toUpperCase() + " Hospital DS TB Outcomes Quarter-Wise Report"
          );

        } else {
          // 👇 THIS IS THE FIXED LINE
          renderMultiYearSection(
            basePath,
            fileName,
            d.toUpperCase() + " Hospital DS TB Outcomes Annual Report"
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
  // 📊 Toggle main OVERALL YEAR-WISE ANALYSIS block
  document.querySelectorAll(".analysis-collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      if (content && content.classList.contains("analysis-collapsible-content")) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });

  // ➢ Toggle Direct Services
  document.querySelectorAll(".analysis-direct-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      if (content && content.classList.contains("analysis-direct-content")) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });

  // 📋 Toggle Outpatients Treated
  document.querySelectorAll(".analysis-contents-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      if (content && content.classList.contains("analysis-contents-content")) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });
  // 📥 Download Table + Graph as a single PNG
  function enableDownloadBoth1(name = "dfit_report", tableSelector, chartSelector) {
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
  // 📥 Download only Title + Graph as PNG (ignore table)
  function enableDownloadBoth(name = "dfit_report", tableSelector, chartSelector) {
    const btn = document.getElementById("downloadTableBtn");
    const chart = document.querySelector(chartSelector);
    if (!btn || !chart) return;

    btn.style.display = "inline-block";
    btn.onclick = async () => {
      try {
        // Capture the chart container (including title above it, if in same div)
        const chartContainer = chart.parentElement;
        const canvas = await html2canvas(chartContainer);

        // Download
        const link = document.createElement("a");
        link.download = `${name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.error("Download error:", err);
        showToast("⚠️ Error capturing chart for download.");
      }
    };
  }

});