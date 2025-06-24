document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value;
  let lastClickedKey = null;
  let lastClickedType = null; // "leprosy" or "tb"

  const links = {
    totalProjects: "link-total-projects",
    dfitProjects: "link-dfit-projects",
    supportedProjects: "link-sup-projects",
    districts: [
      "nellore", "delhi", "dos", "polambakam", "dhanbad", "amda", "arasipalyam",
      "fathimnagar", "nagepalli", "pavagada", "belatanr", "popejohngarden",
      "chilakalapalli", "trivendrum", "andipatti", "ambamoola"
    ],
    totalProjectsAN: "link-total-projects-AN",
    dfitProjectsAN: "link-dfit-projects-AN",
    supportedProjectsAN: "link-sup-projects-AN",
    districtsAN: [
      "nellore", "delhi", "arasipalyam",
      "fathimnagar", "nagepalli", "pavagada", "andipatti", "ambamoola", "belatanr"
    ]
  };

  function setActiveLink(clickedElement) {
    document.querySelectorAll(".sidebar a").forEach(link => {
      link.classList.remove("active-link");
    });
    clickedElement.classList.add("active-link");
  }


  function renderOverview(path, key) {
    lastClickedType = "leprosy";

    if (selectedYear === "All") {
      const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const allData = {};
      let rowOrder = [];

      Promise.all(
        years.map(year =>
          fetch(`district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`File not found: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const sno = row["S.NO"] || row["SNO"];
                const contents = row["Contents"] || row["CONTENT"] || row["contents"];
                const rowKey = `${sno}|||${contents}`;

                if (!allData[rowKey]) {
                  allData[rowKey] = { "S.NO": sno, "Contents": contents };
                  rowOrder.push(rowKey);
                }

                const annualVal = row[`Annual ${year}`] || row[`ANNUAL ${year}`] || "";
                allData[rowKey][`Annual ${year}`] = annualVal;
              });
            })
            .catch(err => {
              console.warn(`Skipping year ${year} due to:`, err.message);
            })
        )
      ).then(() => {
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – ${selectedYear}</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>Contents</th>`;
        years.forEach(y => html += `<th>Annual ${y}</th>`);
        html += `</tr></thead><tbody>`;

        rowOrder.forEach(rowKey => {
          const row = allData[rowKey];
          html += `<tr><td>${row["S.NO"]}</td><td>${row["Contents"]}</td>`;
          years.forEach(y => {
            html += `<td>${row[`Annual ${y}`] ?? ""}</td>`;
          });
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
        enableTableDownload();
      });
    } else {
      fetch(path)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || !data.length) {
            contentArea.innerHTML = "<p>No data available.</p>";
            return;
          }

          const heading = `${key.replace(/_/g, ' ').toUpperCase()} Overview – ${selectedYear}`;
          const keys = Object.keys(data[0]);

          let html = `<div class="table-container"><h2>${heading}</h2><table><thead><tr>`;
          keys.forEach(k => html += `<th>${k}</th>`);
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += "<tr>";
            keys.forEach(k => html += `<td>${row[k] ?? ""}</td>`);
            html += "</tr>";
          });

          html += "</tbody></table></div>";
          contentArea.innerHTML = html;
          enableTableDownload();
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }
  function enableTableDownload() {
    const btn = document.getElementById("downloadTableBtn");
    const tableContainer = document.querySelector(".table-container");

    if (!btn || !tableContainer) return;

    btn.style.display = "inline-block";

    btn.onclick = () => {
      html2canvas(tableContainer).then(canvas => {
        const link = document.createElement("a");
        link.download = "dfit_table.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    };
  }
  // function for tb annexure
  function renderOverviewAN(path, key) {
    lastClickedType = "tb";

    if (selectedYear === "All") {
      const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const allData = {};
      let rowOrder = [];

      Promise.all(
        years.map(year =>
          fetch(`TB_Annexure/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`File not found: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const contents = row["Annexure M Contents"] || row["Contents"] || row["CONTENT"] || row["contents"] || "";
                const rowKey = contents;

                if (!allData[rowKey]) {
                  allData[rowKey] = { "Annexure M Contents": contents };
                  rowOrder.push(rowKey);
                }

                const annualVal = row[`Total ${year}`] || row[`ANNUAL ${year}`] || "";
                allData[rowKey][`Annual ${year}`] = annualVal;
              });
            })
            .catch(err => {
              console.warn(`Skipping year ${year} due to:`, err.message);
            })
        )
      ).then(() => {
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – ${selectedYear}</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>Annexure M Contents</th>`;
        years.forEach(y => html += `<th>Annual ${y}</th>`);
        html += `</tr></thead><tbody>`;

        rowOrder.forEach(rowKey => {
          const row = allData[rowKey];
          html += `<tr><td>${row["Annexure M Contents"]}</td>`;
          years.forEach(y => {
            html += `<td>${row[`Annual ${y}`] ?? ""}</td>`;
          });
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
        enableTableDownload();
      });
    } else {
      fetch(path)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || !data.length) {
            contentArea.innerHTML = "<p>No data available.</p>";
            return;
          }

          const heading = `${key.replace(/_/g, ' ').toUpperCase()} Overview – ${selectedYear}`;
          const keys = Object.keys(data[0]);

          let html = `<div class="table-container"><h2>${heading}</h2><table><thead><tr>`;
          keys.forEach(k => html += `<th>${k}</th>`);
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += "<tr>";
            keys.forEach(k => html += `<td>${row[k] ?? ""}</td>`);
            html += "</tr>";
          });

          html += "</tbody></table></div>";
          contentArea.innerHTML = html;
          enableTableDownload();
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }


  // Year change
  yearFilter.addEventListener("change", () => {
    selectedYear = yearFilter.value;
    if (lastClickedKey && lastClickedType === "leprosy") {
      renderOverview(`district_wise_${selectedYear}/${lastClickedKey}.json`, lastClickedKey);
    } else if (lastClickedKey && lastClickedType === "tb") {
      renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/${lastClickedKey}.json`, lastClickedKey);
    }
  });

  // Leprosy project links
  document.getElementById(links.totalProjects).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "total_projects";
    renderOverview(`district_wise_${selectedYear}/total_projects.json`, lastClickedKey);
  });

  document.getElementById(links.dfitProjects).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "dfit_projects";
    renderOverview(`district_wise_${selectedYear}/dfit_projects.json`, lastClickedKey);
  });

  document.getElementById(links.supportedProjects).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "supported_projects";
    renderOverview(`district_wise_${selectedYear}/supported_projects.json`, lastClickedKey);
  });

  links.districts.forEach(d => {
    const el = document.getElementById(`link-${d}`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        lastClickedKey = d.toLowerCase();
        renderOverview(`district_wise_${selectedYear}/${d.toLowerCase()}.json`, lastClickedKey);
      });
    }
  });

  // TB project links
  // TB ANNEXURE Links
  document.getElementById(links.totalProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "total_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/total_projects.json`, lastClickedKey);
  });

  document.getElementById(links.dfitProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "dfit_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/dfit_projects.json`, lastClickedKey);
  });

  document.getElementById(links.supportedProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "supported_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/supported_projects.json`, lastClickedKey);
  });

  links.districtsAN.forEach(d => {
    const el = document.getElementById(`link-${d}-AN`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        lastClickedKey = d.toLowerCase();
        renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/${d.toLowerCase()}.json`, lastClickedKey);
      });
    }
  });

  // TB ANNEXURE Links
  document.getElementById(links.totalProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "total_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/total_projects.json`, lastClickedKey);
  });

  document.getElementById(links.dfitProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "dfit_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/dfit_projects.json`, lastClickedKey);
  });

  document.getElementById(links.supportedProjectsAN).addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "supported_projects";
    renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/supported_projects.json`, lastClickedKey);
  });

  links.districtsAN.forEach(d => {
    const el = document.getElementById(`link-${d}-AN`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        lastClickedKey = d.toLowerCase();
        renderOverviewAN(`TB_Annexure/district_wise_${selectedYear}/${d.toLowerCase()}.json`, lastClickedKey);
      });
    }
  });
});

// Back end button system
document.addEventListener("DOMContentLoaded", function () {
  // Main collapsibles (Leprosy / TB sections)
  const mainToggles = document.querySelectorAll(".collapsible");
  mainToggles.forEach(toggle => {
    toggle.addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      if (content && content.classList.contains("collapsible-content")) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });

  // Inner subsection titles
  const subsectionTitles = document.querySelectorAll(".subsection-title");
  subsectionTitles.forEach(title => {
    title.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");

      // Close all other subsection contents
      document.querySelectorAll(".subsection-content").forEach(content => {
        if (content.id !== targetId) {
          content.style.display = "none";
        }
      });

      // Toggle selected
      const contentDiv = document.getElementById(targetId);
      if (contentDiv) {
        contentDiv.style.display = (contentDiv.style.display === "block") ? "none" : "block";
      }
    });
  });
});
// TB CASE FINDINGS

document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value;
  let lastClickedKey = null;
  let lastClickedType = null; // "leprosy", "tb", or "tb_case"

  const links = {
    tbCaseFindings: {
      total: "link-total-projects-CF",
      dfit: "link-dfit-projects-CF",
      supported: "link-sup-projects-CF",
      districts: [
        "nellore", "delhi", "arasipalyam", "fathimnagar", "nagepalli", "pavagada", "andipatti", "ambamoola", "belatanr"
      ]
    }
  };

  function setActiveLink(el) {
    document.querySelectorAll(".sidebar a").forEach(link => link.classList.remove("active-link"));
    el.classList.add("active-link");
  }

  function renderCaseFindingOverview(path, key) {
    lastClickedType = "tb_case";

    if (selectedYear === "All") {
      const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const cumulativeData = {};
      const order = [];

      Promise.all(
        years.map(year =>
          fetch(`TB_Case_Finding/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Missing: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const label = row["Type of Cases"];
                if (!cumulativeData[label]) {
                  cumulativeData[label] = { Contents: label };
                  order.push(label);
                }
                cumulativeData[label][`Total ${year}`] = row[`Total ${year}`] || row[`Annual ${year}`] || "";
              });
            })
            .catch(err => {
              console.warn(err.message);
            })
        )
      ).then(() => {
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – ${selectedYear}</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>Type of Cases</th>`;
        years.forEach(year => html += `<th>Total ${year}</th>`);
        html += `</tr></thead><tbody>`;

        order.forEach(label => {
          const row = cumulativeData[label];
          html += `<tr><td>${row.Contents}</td>`;
          years.forEach(year => html += `<td>${row[`Total ${year}`] || ""}</td>`);
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
        enableTableDownload();
      });
    } else {
      fetch(path)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || !data.length) {
            contentArea.innerHTML = "<p>No data available.</p>";
            return;
          }

          const heading = `${key.replace(/_/g, ' ').toUpperCase()} Overview – ${selectedYear}`;
          const keys = Object.keys(data[0]);

          let html = `<div class="table-container"><h2>${heading}</h2><table><thead><tr>`;
          keys.forEach(k => html += `<th>${k}</th>`);
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += "<tr>";
            keys.forEach(k => html += `<td>${row[k] ?? ""}</td>`);
            html += "</tr>";
          });

          html += "</tbody></table></div>";
          contentArea.innerHTML = html;
          enableTableDownload();
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }

  // TB CASE FINDING: Year change listener
  yearFilter.addEventListener("change", () => {
    selectedYear = yearFilter.value;
    if (lastClickedKey && lastClickedType === "tb_case") {
      renderCaseFindingOverview(`TB_Case_Finding/district_wise_${selectedYear}/${lastClickedKey}.json`, lastClickedKey);
    }
  });

  // TB CASE FINDING: Main project links
  document.getElementById(links.tbCaseFindings.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "total_projects";
    renderCaseFindingOverview(`TB_Case_Finding/district_wise_${selectedYear}/total_projects.json`, lastClickedKey);
  });

  document.getElementById(links.tbCaseFindings.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "dfit_projects";
    renderCaseFindingOverview(`TB_Case_Finding/district_wise_${selectedYear}/dfit_projects.json`, lastClickedKey);
  });

  document.getElementById(links.tbCaseFindings.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "supported_projects";
    renderCaseFindingOverview(`TB_Case_Finding/district_wise_${selectedYear}/supported_projects.json`, lastClickedKey);
  });

  // TB CASE FINDING: District-wise links
  links.tbCaseFindings.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-CF`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        lastClickedKey = d.toLowerCase();
        renderCaseFindingOverview(`TB_Case_Finding/district_wise_${selectedYear}/${d.toLowerCase()}.json`, lastClickedKey);
      });
    }
  });

  // Toggle section visibility
  document.getElementById("toggle-casefinding-section")?.addEventListener("click", () => {
    const section = document.getElementById("casefinding-section");
    section.style.display = section.style.display === "block" ? "none" : "block";
  });
});
function enableTableDownload() {
  const btn = document.getElementById("downloadTableBtn");
  const tableContainer = document.querySelector(".table-container");

  if (!btn || !tableContainer) return;

  btn.style.display = "inline-block";

  btn.onclick = () => {
    html2canvas(tableContainer).then(canvas => {
      const link = document.createElement("a");
      link.download = "dfit_table.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  };
}

///// TB OUTCOMES /////

document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value;
  let lastClickedKey = null;
  let lastClickedType = null; // "leprosy", "tb", or "tb_case"

  const links = {
    tbOutcomes: {
      total: "link-total-projects-OC",
      dfit: "link-dfit-projects-OC",
      supported: "link-sup-projects-OC",
      districts: [
        "nellore", "delhi", "arasipalyam", "fathimnagar", "nagepalli", "pavagada", "andipatti", "ambamoola", "belatnr"
      ]
    }
  };

  function setActiveLink(el) {
    document.querySelectorAll(".sidebar a").forEach(link => link.classList.remove("active-link"));
    el.classList.add("active-link");
  }

  function renderOutcomesOverview(path, key) {
    lastClickedType = "tb_out";

    if (selectedYear === "All") {
      const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const cumulativeData = {};
      const order = [];

      Promise.all(
        years.map(year =>
          fetch(`/TB_Outcomes/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Missing: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const label = row["Type of cases "];
                if (!cumulativeData[label]) {
                  cumulativeData[label] = { Contents: label };
                  order.push(label);
                }
                cumulativeData[label][`Total ${year}`] = row[`Total ${year}`] || row[`Annual ${year}`] || "";
              });
            })
            .catch(err => {
              console.warn(err.message);
            })
        )
      ).then(() => {
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – ${selectedYear}</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>Type of Cases</th>`;
        years.forEach(year => html += `<th>Total ${year}</th>`);
        html += `</tr></thead><tbody>`;

        order.forEach(label => {
          const row = cumulativeData[label];
          html += `<tr><td>${row.Contents}</td>`;
          years.forEach(year => html += `<td>${row[`Total ${year}`] || ""}</td>`);
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
        enableTableDownload();

      });
    } else {
      fetch(path)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || !data.length) {
            contentArea.innerHTML = "<p>No data available.</p>";
            return;
          }

          const heading = `${key.replace(/_/g, ' ').toUpperCase()} Overview – ${selectedYear}`;
          const keys = Object.keys(data[0]);

          let html = `<div class="table-container"><h2>${heading}</h2><table><thead><tr>`;
          keys.forEach(k => html += `<th>${k}</th>`);
          html += `</tr></thead><tbody>`;

          data.forEach(row => {
            html += "<tr>";
            keys.forEach(k => html += `<td>${row[k] ?? ""}</td>`);
            html += "</tr>";
          });

          html += "</tbody></table></div>";
          contentArea.innerHTML = html;
          enableTableDownload();
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }

  // TB OUTCOMES : Year change listener
  yearFilter.addEventListener("change", () => {
    selectedYear = yearFilter.value;
    if (lastClickedKey && lastClickedType === "tb_out") {
      renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/${lastClickedKey}.json`, lastClickedKey);
    }
  });

  // TB OUTCOMES : Main project links
  document.getElementById(links.tbOutcomes.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "total_projects";
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/total_projects.json`, lastClickedKey);
  });

  document.getElementById(links.tbOutcomes.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "dfit_projects";
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/dfit_projects.json`, lastClickedKey);
  });

  document.getElementById(links.tbOutcomes.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    lastClickedKey = "supported_projects";
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/supported_projects.json`, lastClickedKey);
  });

  // TB OUTCOMES : District-wise links
  links.tbOutcomes.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-OC`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        lastClickedKey = d.toLowerCase();
        renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/${d.toLowerCase()}.json`, lastClickedKey);
      });
    }
  });

  // Toggle section visibility
  document.getElementById("toggle-tbOutcomes-section")?.addEventListener("click", () => {
    const section = document.getElementById("tbOoutcomes-section");
    section.style.display = section.style.display === "block" ? "none" : "block";
  });
});
function enableTableDownload() {
  const btn = document.getElementById("downloadTableBtn");
  const tableContainer = document.querySelector(".table-container");

  if (!btn || !tableContainer) return;

  btn.style.display = "inline-block";

  btn.onclick = () => {
    html2canvas(tableContainer).then(canvas => {
      const link = document.createElement("a");
      link.download = "dfit_table.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  };
}


// LEP CONTENT

document.addEventListener("DOMContentLoaded", () => {
  const lepLink = document.getElementById("link-lep");
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value; // Track selected year globally

  if (yearFilter) {
    yearFilter.addEventListener("change", () => {
      selectedYear = yearFilter.value;
      if (lastClickedType === "leprosy") {
        fetchLEPData(selectedYear);
      }
      // you can extend here for other types like TB, RCS, etc.
    });
  }

  if (lepLink) {
    lepLink.addEventListener("click", (e) => {
      e.preventDefault();
      lastClickedType = "leprosy";
      fetchLEPData(selectedYear);
    });
  }

  function fetchLEPData(selectedYear = "All") {
    fetch("LEP/lep.json")
      .then((res) => res.json())
      .then((data) => {
        renderLEPTable(data, selectedYear);
      })
      .catch((err) => {
        contentArea.innerHTML = `<p>Error loading LEP data</p>`;
        console.error(err);
      });
  }

  function renderLEPTable(data, selectedYear = "All") {
    if (!Array.isArray(data) || data.length === 0) {
      contentArea.innerHTML = "<p>No LEP data available</p>";
      return;
    }

    const allColumns = Object.keys(data[0]).filter(k => k !== "Category");
    const columns = selectedYear === "All"
      ? allColumns
      : allColumns.filter(col => col.includes(selectedYear));

    if (columns.length === 0) {
      contentArea.innerHTML = `<p>No data available for year ${selectedYear}</p>`;
      return;
    }

    let table = `<div class="table-container"><h2>Livelihood Enhancement Program Report - ${selectedYear}</h2>`;
    table += `<table class="lep-table">
      <thead><tr><th>Category</th>`;

    columns.forEach(col => {
      table += `<th>${col}</th>`;
    });

    table += `</tr></thead><tbody>`;

    data.forEach(row => {
      table += `<tr><td>${row["Category"]}</td>`;
      columns.forEach(col => {
        table += `<td>${row[col] ?? ""}</td>`;
      });
      table += `</tr>`;
    });

    table += `</tbody></table></div>`;

    contentArea.innerHTML = table;
    enableTableDownload(selectedYear);
  }

  function enableTableDownload(selectedYear = "All") {
    const btn = document.getElementById("downloadTableBtn");
    const tableContainer = document.querySelector(".table-container");

    if (btn && tableContainer) {
      btn.style.display = "inline-block";
      btn.onclick = () => {
        html2canvas(tableContainer).then(canvas => {
          const link = document.createElement("a");
          link.download = `LEP_Report_${selectedYear}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      };
    }
  }
});

//  IRL LABS OVERVIEW///
document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let currentLabJson = "";
  let currentHeading = "";

  // Helper to set active link
  function setActiveLink(linkId) {
    document.querySelectorAll(".sidebar a").forEach(link => {
      link.classList.remove("active-link");
    });
    const clickedLink = document.getElementById(linkId);
    if (clickedLink) clickedLink.classList.add("active-link");
  }

  document.getElementById("link-total-labs").addEventListener("click", (e) => {
    e.preventDefault();
    setActiveLink("link-total-labs");
    currentLabJson = "IRL/total.json";
    currentHeading = "TOTAL IRL Overview";
    renderIRLLabData(currentLabJson, currentHeading);
  });

  document.getElementById("link-nlr-lab").addEventListener("click", (e) => {
    e.preventDefault();
    setActiveLink("link-nlr-lab");
    currentLabJson = "IRL/nellore.json";
    currentHeading = "Nellore IRL Overview";
    renderIRLLabData(currentLabJson, currentHeading);
  });

  document.getElementById("link-dar-lab").addEventListener("click", (e) => {
    e.preventDefault();
    setActiveLink("link-dar-lab");
    currentLabJson = "IRL/darbhanga.json";
    currentHeading = "Darbhanga IRL Overview";
    renderIRLLabData(currentLabJson, currentHeading);
  });

  if (yearFilter) {
    yearFilter.addEventListener("change", () => {
      if (currentLabJson) {
        renderIRLLabData(currentLabJson, currentHeading);
      }
    });
  }

  function renderIRLLabData(jsonPath, heading) {
    const selectedYear = yearFilter.value;

    fetch(jsonPath)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          contentArea.innerHTML = "<p>No IRL data available</p>";
          return;
        }

        const allYears = Object.keys(data[0]).filter(key => key !== "Contents");
        const filteredYears = selectedYear === "All" ? allYears : allYears.filter(y => y === selectedYear);

        let tableHTML = `
          <h2>${heading} - ${selectedYear}</h2>
          <div class="table-container">
            <table class="styled-table">
              <thead>
                <tr>
                  <th>Contents</th>
                  ${filteredYears.map(year => `<th>${year}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr>
                    <td>${row["Contents"].trim()}</td>
                    ${filteredYears.map(year => `<td>${row[year] ?? ""}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
        contentArea.innerHTML = tableHTML;
        enableTableDownload();
      })
      .catch((err) => {
        contentArea.innerHTML = "<p>Error loading IRL LAB data.</p>";
        console.error(err);
      });
  }

  function enableTableDownload() {
    const btn = document.getElementById("downloadTableBtn");
    const tableContainer = document.querySelector(".table-container");

    if (!btn || !tableContainer) return;

    btn.style.display = "inline-block";

    btn.onclick = () => {
      html2canvas(tableContainer).then(canvas => {
        const link = document.createElement("a");
        link.download = "dfit_table.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    };
  }
});

//  DPMR SECTION

document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value;
  let lastClickedKey = null;
  let lastClickedType = null;

  // Year filter change listener
  yearFilter.addEventListener("change", () => {
    selectedYear = yearFilter.value;
    if (lastClickedKey && lastClickedType === "dpmr") {
      renderDpmrOverview(lastClickedKey);
    }
  });

  // Event listeners for sidebar links
  document.getElementById("link-tot").addEventListener("click", () => {
    lastClickedKey = "total_dpmr";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-bihar").addEventListener("click", () => {
    lastClickedKey = "bihar";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-jharkhand").addEventListener("click", () => {
    lastClickedKey = "jhar";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-karnataka").addEventListener("click", () => {
    lastClickedKey = "kar";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-tn").addEventListener("click", () => {
    lastClickedKey = "tn";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-chhattisgarh").addEventListener("click", () => {
    lastClickedKey = "chat";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  document.getElementById("link-ap").addEventListener("click", () => {
    lastClickedKey = "ap";
    lastClickedType = "dpmr";
    renderDpmrOverview(lastClickedKey);
  });

  // Main render function
  function renderDpmrOverview(fileKey) {
    fetch(`DPMR/${fileKey}.json`)
      .then(response => response.json())
      .then(data => {
        const regionTitles = {
          "total_dpmr": "TOTAL DPMR Overview",
          "bihar": "Bihar DPMR Overview",
          "jhar": "Jharkhand DPMR Overview",
          "kar": "Karnataka DPMR Overview",
          "tn": "Tamil Nadu DPMR Overview",
          "chat": "Chhattisgarh DPMR Overview",
          "ap": "Andhra Pradesh DPMR Overview"
        };

        const heading = regionTitles[fileKey] || "DPMR Overview";
        let html = `<h2 style="margin: 10px 0;">${heading} (${selectedYear})</h2>`;

        if (selectedYear === "All") {
          html += `
            <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>DPMR Contents</th>
                  <th>2020</th>
                  <th>2021</th>
                  <th>2022</th>
                  <th>2023</th>
                  <th>2024</th>
                </tr>
              </thead>
              <tbody>
          `;

          data.forEach(row => {
            html += `
              <tr>
                <td>${row["S.NO"]}</td>
                <td>${row["DPMR Contents"]}</td>
                <td>${row["2020"]}</td>
                <td>${row["2021"]}</td>
                <td>${row["2022"]}</td>
                <td>${row["2023"]}</td>
                <td>${row["2024"]}</td>
              </tr>
            `;
          });

          html += "</tbody></table>";
        } else {
          html += `
            <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>DPMR Contents</th>
                  <th>${selectedYear}</th>
                </tr>
              </thead>
              <tbody>
          `;

          data.forEach(row => {
            html += `
              <tr>
                <td>${row["S.NO"]}</td>
                <td>${row["DPMR Contents"]}</td>
                <td>${row[selectedYear]}</td>
              </tr>
            `;
          });

          html += "</tbody></table>";
        }

        contentArea.innerHTML = html;
      })
      .catch(err => {
        contentArea.innerHTML = `<p style="color: red;">Error loading data: ${err.message}</p>`;
      });
  }

  // Table download logic
  const downloadBtn = document.getElementById("downloadTableBtn");
  downloadBtn.addEventListener("click", () => {
    const section = document.getElementById("content-area");
    html2canvas(section).then(canvas => {
      const link = document.createElement("a");
      link.download = "DPMR_Overview.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });
});

///--------------------- DELHI DRTB SERVICES --------------///

document.addEventListener("DOMContentLoaded", () => {
  const drtbLink = document.getElementById("link-drtb");
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");

  let selectedYear = yearFilter.value; // Track selected year globally
  let lastClickedType = null;

  if (yearFilter) {
    yearFilter.addEventListener("change", () => {
      selectedYear = yearFilter.value;
      if (lastClickedType === "leprosy") {
        fetchDRTBData(selectedYear);
      }
      // you can extend here for other types like TB, RCS, etc.
    });
  }

  if (drtbLink) {
    drtbLink.addEventListener("click", (e) => {
      e.preventDefault();
      lastClickedType = "leprosy";
      fetchDRTBData(selectedYear);
    });
  }

  function fetchDRTBData(selectedYear = "All") {
    fetch("delhi_drtb.json")
      .then((res) => res.json())
      .then((data) => {
        renderDRTBTable(data, selectedYear);
      })
      .catch((err) => {
        contentArea.innerHTML = `<p>Error loading DRTB data</p>`;
        console.error(err);
      });
  }

  function renderDRTBTable(data, selectedYear = "All") {
    if (!Array.isArray(data) || data.length === 0) {
      contentArea.innerHTML = "<p>No DRTB data available</p>";
      return;
    }

    let html = `<h2 style="margin: 10px 0;">DELHI DRTB SERVICES (${selectedYear})</h2>`;

    if (selectedYear === "All") {
      html += `
      <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead>
          <tr>
            <th>S.NO</th>
            <th>Particulars</th>
            ${Array.from({ length: 15 }, (_, i) => `<th>${2010 + i}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
    `;

      data.forEach(row => {
        html += `
        <tr>
          <td>${row["S.NO"]}</td>
          <td>${row["Particulars"]}</td>
          ${Array.from({ length: 15 }, (_, i) => `<td>${row[2010 + i] ?? ""}</td>`).join("")}
        </tr>
      `;
      });

      html += "</tbody></table>";
    } else {
      html += `
      <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead>
          <tr>
            <th>S.NO</th>
            <th>Particulars</th>
            <th>${selectedYear}</th>
          </tr>
        </thead>
        <tbody>
    `;

      data.forEach(row => {
        html += `
        <tr>
          <td>${row["S.NO"]}</td>
          <td>${row["Particulars"]}</td>
          <td>${row[selectedYear] ?? ""}</td>
        </tr>
      `;
      });

      html += "</tbody></table>";
    }

    contentArea.innerHTML = html;
    enableTableDownload(selectedYear);
  }

  function enableTableDownload(selectedYear = "All") {
    const btn = document.getElementById("downloadTableBtn");
    const tableContainer = document.querySelector(".table-container");

    if (btn && tableContainer) {
      btn.style.display = "inline-block";
      btn.onclick = () => {
        html2canvas(tableContainer).then(canvas => {
          const link = document.createElement("a");
          link.download = `DRTB_Report_${selectedYear}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      };
    }
  }
});


// ------------------------- DRTB SERIVECS ---------------------///

document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");
  const biharDRTBLink = document.getElementById("link-bihar-drtb");

  let selectedYear = yearFilter.value;

  if (yearFilter) {
    yearFilter.addEventListener("change", () => {
      selectedYear = yearFilter.value;
      if (lastClickedKey === "bihar_drtb") {
        fetchBiharDRTBData(selectedYear);
      }
    });
  }

  if (biharDRTBLink) {
    biharDRTBLink.addEventListener("click", (e) => {
      e.preventDefault();
      lastClickedKey = "bihar_drtb";
      fetchBiharDRTBData(selectedYear);
    });
  }

  function fetchBiharDRTBData(selectedYear = "All") {
    fetch("/DRTB/bihar_drtb.json")
      .then(res => res.json())
      .then(data => {
        renderBiharDRTBTable(data, selectedYear);
      })
      .catch(err => {
        contentArea.innerHTML = "<p>Error loading Bihar DRTB data</p>";
        console.error(err);
      });
  }

  function renderBiharDRTBTable(data, selectedYear = "All") {
    if (!Array.isArray(data) || data.length === 0) {
      contentArea.innerHTML = "<p>No Bihar DRTB data available</p>";
      return;
    }

    const allYears = Object.keys(data[0]).filter(k => /^\d{4}$/.test(k));
    const yearsToShow = selectedYear === "All"
      ? allYears
      : allYears.filter(y => y === selectedYear);

    let table = `<div class="table-container"><h2>BIHAR DRTB Overview - ${selectedYear}</h2>`;
    table += `<table class="drtb-table"><thead><tr>
                <th>S.No</th><th>DRTB contents</th>`;

    yearsToShow.forEach(year => {
      table += `<th>${year}</th>`;
    });

    table += `</tr></thead><tbody>`;

    data.forEach(row => {
      table += `<tr><td>${row["S.NO"] ?? ""}</td><td>${row["DRTB contents"]}</td>`;
      yearsToShow.forEach(year => {
        table += `<td>${row[year] ?? ""}</td>`;
      });
      table += `</tr>`;
    });

    table += `</tbody></table></div>`;
    contentArea.innerHTML = table;
    enableTableDownload(selectedYear);
  }

  function enableTableDownload(selectedYear = "All") {
    const btn = document.getElementById("downloadTableBtn");
    const tableContainer = document.querySelector(".table-container");

    if (btn && tableContainer) {
      btn.style.display = "inline-block";
      btn.onclick = () => {
        html2canvas(tableContainer).then(canvas => {
          const link = document.createElement("a");
          link.download = `Bihar_DRTB_Report_${selectedYear}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      };
    }
  }
});



// ----------------------------  GRAPHS AND TABLE QUARTER WISE SECTION ----------------///////////////
let chartInstance = null;
function renderQuarterlySection(jsonPath, sectionTitle, containerId) {
  const contentArea = document.getElementById(containerId);
  const selectedYear = document.getElementById("yearFilter").value;

  fetch(jsonPath)
    .then(res => res.json())
    .then(data => {
      const filtered = selectedYear === "All" ? data : data.filter(d => d.year == selectedYear);

      // TABLE
      let tableHTML = `<h2>${sectionTitle} – ${selectedYear}</h2>
  <div style="margin-bottom: 20px;">
  <table class="styled-table">
    <thead><tr><th>Year</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th></tr></thead>
    <tbody>`;
      filtered.forEach(d => {
        const total = [d.Q1, d.Q2, d.Q3, d.Q4].reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        tableHTML += `<tr>
    <td>${d.year}</td>
    <td>${d.Q1 ?? "-"}</td>
    <td>${d.Q2 ?? "-"}</td>
    <td>${d.Q3 ?? "-"}</td>
    <td>${d.Q4 ?? "-"}</td>
    <td>${total}</td>
  </tr>`;
      });
      tableHTML += `</tbody></table></div>
  <div style="margin-top: 30px;"><canvas id="chart-${containerId}" style="max-height: 400px;"></canvas></div>`;

      contentArea.innerHTML = tableHTML;


      // CHART
      const labels = [];
      const values = [];
      filtered.forEach(entry => {
        const year = entry.year;
        ["Q1", "Q2", "Q3", "Q4"].forEach(q => {
          if (entry[q] !== null && entry[q] !== undefined) {
            labels.push(`${q} ${year}`);
            values.push(entry[q]);
          }
        });
      });

      const ctx = document.getElementById(`chart-${containerId}`).getContext("2d");
      if (chartInstance) chartInstance.destroy();


      // 🎨 Random color each time
      const colorPalette = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];
      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: sectionTitle,
            data: values,
            borderColor: randomColor,
            backgroundColor: randomColor + 33,
            pointBackgroundColor: randomColor,
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          plugins: {
            datalabels: {
              align: "top",
              anchor: "end",
              color: "#000",
              // font: {
              //   weight: "bold"
              // }
            },
            tooltip: {
              titleFont: {
                weight: "bold"
              },
              bodyFont: {
                weight: "bold"
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true, ticks: { color: "#000" }, font: {
                weight: "bold"
              }
            },
            x: {
              ticks: { color: "#000" }, font: {
                weight: "bold"
              }
            }
          },
          responsive: true,
          maintainAspectRatio: false
        },
        plugins: [ChartDataLabels]
      });
    });
}

// SECTION CLICK EVENTS
document.getElementById("opd").addEventListener("click", () => {
  setActive("opd");
  renderQuarterlySection("/data/opd.json", "Out Patients Statistics", "content-area");
});
document.getElementById("new-lep").addEventListener("click", () => {
  setActive("new-lep");
  renderQuarterlySection("/data/new_lep_cases.json", "New Leprosy Cases", "content-area");
});
document.getElementById("gii").addEventListener("click", () => {
  setActive("gii");
  renderQuarterlySection("/data/gii_disability.json", "New Leprosy Cases With Disability", "content-area");
});
document.getElementById("lepra").addEventListener("click", () => {
  setActive("lepra");
  renderQuarterlySection("/data/lepra_reaction.json", "Lepra Reactions Cases", "content-area");
});
document.getElementById("rcs").addEventListener("click", () => {
  setActive("rcs");
  renderQuarterlySection("/data/rcs_done_cases.json", "RCS Cases Done", "content-area");
});
document.getElementById("lep-adm").addEventListener("click", () => {
  setActive("lep-adm");
  renderQuarterlySection("/data/lep_admissions.json", "Leprosy Admissions", "content-area");
});
document.getElementById("lep-bed").addEventListener("click", () => {
  setActive("lep-bed");
  renderQuarterlySection("/data/lep_bed_days.json", "Leprosy Bed Days", "content-area");
});
document.getElementById("pre-tb").addEventListener("click", () => {
  setActive("pre-tb");
  renderQuarterlySection("/data/pre_tb.json", "Presumptive TB cases", "content-area");
});
document.getElementById("tot-tb").addEventListener("click", () => {
  setActive("tot-tb");
  renderQuarterlySection("/data/tb_cases.json", "Total TB cases", "content-area");
});
document.getElementById("nsp-tb").addEventListener("click", () => {
  setActive("nsp-tb");
  renderQuarterlySection("/data/nsp.json", "NSP CURED TB Cases %", "content-area");
});
document.getElementById("rt-tb").addEventListener("click", () => {
  setActive("rt-tb");
  renderQuarterlySection("/data/rt.json", "RT CURED TB Cases %", "content-area");
});
document.getElementById("tb-bed").addEventListener("click", () => {
  setActive("tb-bed");
  renderQuarterlySection("/data/tb_bed_days.json", "TUBERCULOSIS Bed Days", "content-area");
});

// ACTIVE LINK STYLE
function setActive(id) {
  document.querySelectorAll(".subsection-title").forEach(el => {
    el.classList.remove("active-link");
  });
  document.getElementById(id).classList.add("active-link");
}

// YEAR FILTER LOGIC
document.getElementById("yearFilter").addEventListener("change", () => {
  const current = document.querySelector(".subsection-title.active-link");
  if (!current) return;

  const id = current.id;
  if (id === "opd") {
    renderQuarterlySection("/data/opd.json", "Out Patients Statistics", "content-area");
  } else if (id === "new-lep") {
    renderQuarterlySection("/data/new_lep_cases.json", "New Leprosy Cases", "content-area");
  } else if (id === "gii") {
    renderQuarterlySection("/data/gii_disability.json", "New Leprosy Cases With Disability", "content-area");
  } else if (id === "lepra") {
    renderQuarterlySection("/data/lepra_reaction.json", "Lepra Reactions Cases", "content-area");
  } else if (id === "rcs") {
    renderQuarterlySection("/data/rcs_done_cases.json", "RCS Cases Done", "content-area");
  } else if (id === "lep-adm") {
    renderQuarterlySection("/data/lep_admissions.json", "Leprosy Admissions", "content-area");
  } else if (id === "lep-bed") {
    renderQuarterlySection("/data/lep_bed_days.json", "Leprosy Bed Days", "content-area");
  } else if (id === "pre-tb") {
    renderQuarterlySection("/data/pre_tb.json", "Presumptive TB cases", "content-area");
  } else if (id === "tot-tb") {
    renderQuarterlySection("/data/tb_cases.json", "Total TB cases", "content-area");
  } else if (id === "nsp-tb") {
    renderQuarterlySection("/data/nsp.json", "NSP CURED TB Cases %", "content-area");
  } else if (id === "rt-tb") {
    renderQuarterlySection("/data/rt.json", "RT CURED TB Cases %", "content-area");
  } else if (id === "tb-bed") {
    renderQuarterlySection("/data/tb_bed_days.json", "TUBERCULOSIS Bed Days", "content-area");
  }
});






