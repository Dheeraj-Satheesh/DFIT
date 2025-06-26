document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const yearFilter = document.getElementById("yearFilter");
  let selectedYear = yearFilter.value;

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

  // // Enable PNG Download of Table
  // function enableDownload(name = "dfit_table") {
  //   const btn = document.getElementById("downloadTableBtn");
  //   const container = document.querySelector(".table-container");
  //   if (!btn || !container) return;
  //   btn.style.display = "inline-block";
  //   btn.onclick = () => {
  //     html2canvas(container).then(canvas => {
  //       const link = document.createElement("a");
  //       link.download = `${name}.png`;
  //       link.href = canvas.toDataURL("image/png");
  //       link.click();
  //     });
  //   };
  // }

  // function enableDownload(name = "dfit_table") {
  //   const btn = document.getElementById("downloadTableBtn");
  //   const container = document.querySelector(".table-container");

  //   if (!btn || !container) return;

  //   btn.style.display = "inline-block";

  //   btn.onclick = () => {
  //     // Clone the container
  //     const clone = container.cloneNode(true);
  //     clone.style.position = "absolute";
  //     clone.style.left = "-9999px";
  //     clone.style.top = "0";
  //     clone.style.maxHeight = "none";
  //     clone.style.overflow = "visible";
  //     clone.style.width = container.scrollWidth + "px";
  //     clone.style.height = container.scrollHeight + "px";
  //     document.body.appendChild(clone);

  //     // Capture the fully expanded clone
  //     html2canvas(clone, {
  //       scrollX: 0,
  //       scrollY: 0,
  //       useCORS: true,
  //       allowTaint: true
  //     }).then(canvas => {
  //       document.body.removeChild(clone);

  //       const link = document.createElement("a");
  //       link.download = `${name}.png`;
  //       link.href = canvas.toDataURL("image/png");
  //       link.click();
  //     });
  //   };
  // }

  // // Run on DOM load
  // document.addEventListener("DOMContentLoaded", () => {
  //   enableDownload("dfit_table_full");
  // });

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



  // --- LEP Section ---
  document.getElementById("link-lep")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-lep");
    fetch("LEP/lep.json")
      .then(res => res.json())
      .then(data => {
        const columns = Object.keys(data[0]).filter(k => k !== "Category" && (selectedYear === "All" || k.includes(selectedYear)));
        let html = `<div class="table-container"><h2>Livelihood Enhancement Program Report - ${selectedYear}</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
        data.forEach(row => {
          html += `<tr><td>${row["Category"]}</td>${columns.map(c => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`;
        });
        html += "</tbody></table></div>";
        contentArea.innerHTML = html;
        enableDownload(`LEP_Report_${selectedYear}`);
      });
  });
  // --- NUT Section ---
  document.getElementById("link-nut")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-nut");
    fetch("LEP/nut.json")
      .then(res => res.json())
      .then(data => {
        const columns = Object.keys(data[0]).filter(k => k !== "Category" && (selectedYear === "All" || k.includes(selectedYear)));
        let html = `<div class="table-container"><h2>Nutritional Support Report - ${selectedYear}</h2>`;
        html += `<table><thead><tr><th>Category</th>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
        data.forEach(row => {
          html += `<tr><td>${row["Category"]}</td>${columns.map(c => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`;
        });
        html += "</tbody></table></div>";
        contentArea.innerHTML = html;
        enableDownload(`NUTRITIONAL_Report_${selectedYear}`);
      });
  });

  // --- DRTB Delhi ---
  document.getElementById("link-drtb")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-drtb");
    fetch("delhi_drtb.json").then(res => res.json()).then(data => {
      let html = `<h2>DELHI DRTB SERVICES (${selectedYear})</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>Particulars</th>`;
      html += selectedYear === "All" ? Array.from({ length: 15 }, (_, i) => `<th>${2010 + i}</th>`).join("") : `<th>${selectedYear}</th>`;
      html += "</tr></thead><tbody>";
      data.forEach(row => {
        html += `<tr><td>${row["S.NO"]}</td><td>${row["Particulars"]}</td>`;
        html += selectedYear === "All"
          ? Array.from({ length: 15 }, (_, i) => `<td>${row[2010 + i] ?? ""}</td>`).join("")
          : `<td>${row[selectedYear] ?? ""}</td>`;
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      contentArea.innerHTML = html;
      enableDownload(`DRTB_Report_${selectedYear}`);
    });
  });

  // --- DRTB Bihar ---
  document.getElementById("link-bihar-drtb")?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink("link-bihar-drtb");
    fetch("/DRTB/bihar_drtb.json").then(res => res.json()).then(data => {
      const years = Object.keys(data[0]).filter(k => /^\d{4}$/.test(k) && (selectedYear === "All" || k === selectedYear));
      let html = `<h2>BIHAR DRTB Overview - ${selectedYear}</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>DRTB contents</th>${years.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>`;
      data.forEach(row => {
        html += `<tr><td>${row["S.NO"]}</td><td>${row["DRTB contents"]}</td>${years.map(y => `<td>${row[y] ?? ""}</td>`).join("")}</tr>`;
      });
      html += "</tbody></table></div>";
      contentArea.innerHTML = html;
      enableDownload(`Bihar_DRTB_${selectedYear}`);
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
      fetch(`IRL/${lab}.json`).then(res => res.json()).then(data => {
        const years = Object.keys(data[0]).filter(k => k !== "Contents" && (selectedYear === "All" || k === selectedYear));
        let html = `<h2>${lab.toUpperCase()} IRL Overview - ${selectedYear}</h2><div class="table-container"><table><thead><tr><th>Contents</th>${years.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>`;
        data.forEach(row => {
          html += `<tr><td>${row["Contents"]}</td>${years.map(y => `<td>${row[y] ?? ""}</td>`).join("")}</tr>`;
        });
        html += "</tbody></table></div>";
        contentArea.innerHTML = html;
        enableDownload(`${lab}_IRL_${selectedYear}`);
      });
    });
  });

  // --- DPMR ---
  const dpmrMap = {
    tot: "link-tot", bihar: "link-bihar", jhar: "link-jharkhand",
    kar: "link-karnataka", tn: "link-tn", chat: "link-chhattisgarh", ap: "link-ap"
  };

  Object.entries(dpmrMap).forEach(([key, id]) => {
    document.getElementById(id)?.addEventListener("click", e => {
      e.preventDefault();
      setActiveLink(id);
      fetch(`DPMR/${key}.json`).then(res => res.json()).then(data => {
        const headingMap = {
          tot: "TOTAL", bihar: "Bihar", jhar: "Jharkhand", kar: "Karnataka",
          tn: "Tamil Nadu", chat: "Chhattisgarh", ap: "Andhra Pradesh"
        };
        const heading = headingMap[key] || key;
        const years = selectedYear === "All" ? ["2020", "2021", "2022", "2023", "2024"] : [selectedYear];
        let html = `<h2>${heading} DPMR Overview (${selectedYear})</h2><div class="table-container"><table><thead><tr><th>S.NO</th><th>DPMR Contents</th>${years.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>`;
        data.forEach(row => {
          html += `<tr><td>${row["S.NO"]}</td><td>${row["DPMR Contents"]}</td>${years.map(y => `<td>${row[y] ?? ""}</td>`).join("")}</tr>`;
        });
        html += "</tbody></table></div>";
        contentArea.innerHTML = html;
        enableDownload(`${heading}_DPMR_${selectedYear}`);
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
      "chilakalapalli", "trivendrum", "andipatti", "ambamoola"
    ]
  };

  function renderHospitalOverview(path, key) {
    const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

    if (selectedYear === "All") {
      const cumulativeData = {};
      const order = [];

      Promise.all(
        years.map(year =>
          fetch(`/HOSPITAL/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Missing: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const sno = row["S.NO"] || row["SNO"] || row["Sno"] || "";
                const contents = row["Contents"] || row["Type of cases"] || row["Type of cases "] || row["Type of Cases"] || "";
                const label = `${sno}||${contents}`;

                if (!cumulativeData[label]) {
                  cumulativeData[label] = { SNO: sno, Contents: contents };
                  order.push(label);
                }

                cumulativeData[label][`Annual ${year}`] =
                  row[`Total ${year}`] ??
                  row[`Annual ${year}`] ??
                  row[`ANNUAL ${year}`] ??
                  "";
              });
            })
            .catch(err => console.warn(err.message))
        )
      ).then(() => {
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – All Years</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>S.NO</th><th>Contents</th>`;
        years.forEach(year => html += `<th>Annual ${year}</th>`);
        html += `</tr></thead><tbody>`;

        order.forEach(label => {
          const row = cumulativeData[label];
          html += `<tr><td>${row.SNO || ""}</td><td>${row.Contents || ""}</td>`;
          years.forEach(year => {
            html += `<td>${row[`Annual ${year}`] || ""}</td>`;
          });
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
        enableDownload(`HOSPITAL-REPORT_${selectedYear}`);
      });
    }

    else {
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
          enableDownload(`HOSPITAL-REPORT_${selectedYear}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }


  document.getElementById(hospitalLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderHospitalOverview(`/HOSPITAL/district_wise_${selectedYear}/total_projects.json`, "total_projects");
  });
  document.getElementById(hospitalLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderHospitalOverview(`/HOSPITAL/district_wise_${selectedYear}/dfit_projects.json`, "dfit_projects");
  });
  document.getElementById(hospitalLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderHospitalOverview(`/HOSPITAL/district_wise_${selectedYear}/supported_projects.json`, "supported_projects");
  });

  hospitalLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        renderHospitalOverview(`/HOSPITAL/district_wise_${selectedYear}/${d.toLowerCase()}.json`, d.toLowerCase());
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
      "pavagada", "andipatti", "ambamoola", "belatanr"
    ]
  };

  function renderannexureOverview(path, key) {
    const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

    if (selectedYear === "All") {
      const cumulativeData = {};
      const order = [];

      Promise.all(
        years.map(year =>
          fetch(`/TB_Annexure/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Missing: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const label = row["Annexure M Contents"] || row["Type of cases "] || row["Type of Cases"] || row["Type of cases"];
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
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – All Years</h2>`;
        html += `<div class="table-container"><table><thead><tr><th>Annexure M Contents</th>`;
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
        enableDownload(`TB_ANNEXURE_${selectedYear}`);
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
          enableDownload(`TB_ANNEXURE_${selectedYear}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }


  document.getElementById(tbannexureLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderannexureOverview(`/TB_Annexure/district_wise_${selectedYear}/Total_projects.json`, "total_projects");
  });
  document.getElementById(tbannexureLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderannexureOverview(`/TB_Annexure/district_wise_${selectedYear}/dfit_projects.json`, "dfit_projects");
  });
  document.getElementById(tbannexureLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderannexureOverview(`/TB_Annexure/district_wise_${selectedYear}/supported_projects.json`, "supported_projects");
  });

  tbannexureLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-AN`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        renderannexureOverview(`/TB_Annexure/district_wise_${selectedYear}/${d.toLowerCase()}.json`, d.toLowerCase());
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
      "pavagada", "andipatti", "ambamoola", "belatanr"
    ]
  };

  function rendercaseFindingsOverview(path, key) {
    const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    if (selectedYear === "All") {
      const cumulativeData = {};
      const order = [];

      Promise.all(
        years.map(year =>
          fetch(`/TB_Case_Finding/district_wise_${year}/${key}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Missing: ${year}/${key}.json`);
              return res.json();
            })
            .then(data => {
              data.forEach(row => {
                const label = row["Type of Cases"] || row["Type of Cases "] || row["Type of cases "];
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
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – All Years</h2>`;
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
        enableDownload(`TB_CASE-FINDINGS_${selectedYear}`);
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
          enableDownload(`TB_CASE-FINDINGS_${selectedYear}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }


  document.getElementById(tbcaseFindingLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    rendercaseFindingsOverview(`/TB_Case_Finding/district_wise_${selectedYear}/total_projects.json`, "total_projects");
  });
  document.getElementById(tbcaseFindingLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    rendercaseFindingsOverview(`/TB_Case_Finding/district_wise_${selectedYear}/dfit_projects.json`, "dfit_projects");
  });
  document.getElementById(tbcaseFindingLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    rendercaseFindingsOverview(`/TB_Case_Finding/district_wise_${selectedYear}/supported_projects.json`, "supported_projects");
  });

  tbcaseFindingLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-CF`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        rendercaseFindingsOverview(`/TB_Case_Finding/district_wise_${selectedYear}/${d.toLowerCase()}.json`, d.toLowerCase());
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
      "pavagada", "andipatti", "ambamoola", "belatnr"
    ]
  };

  function renderOutcomesOverview(path, key) {
    const years = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

    if (selectedYear === "All") {
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
                const label = row["Type of cases "] || row["Type of Cases"] || row["Type of cases"];
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
        let html = `<h2>${key.replace(/_/g, " ").toUpperCase()} Annual Overview – All Years</h2>`;
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
        enableDownload(`TB_OUTCOMES_${selectedYear}`);
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
          enableDownload(`TB_OUTCOMES_${selectedYear}`);
        })
        .catch(err => {
          contentArea.innerHTML = `<p style="color:red;">Error loading data: ${err}</p>`;
        });
    }
  }


  document.getElementById(tbOutcomesLinks.total)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/total_projects.json`, "total_projects");
  });
  document.getElementById(tbOutcomesLinks.dfit)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/dfit_projects.json`, "dfit_projects");
  });
  document.getElementById(tbOutcomesLinks.supported)?.addEventListener("click", e => {
    e.preventDefault();
    setActiveLink(e.target);
    renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/supported_projects.json`, "supported_projects");
  });

  tbOutcomesLinks.districts.forEach(d => {
    const el = document.getElementById(`link-${d}-OC`);
    if (el) {
      el.addEventListener("click", e => {
        e.preventDefault();
        setActiveLink(e.target);
        renderOutcomesOverview(`TB_Outcomes/district_wise_${selectedYear}/${d.toLowerCase()}.json`, d.toLowerCase());
      });
    }
  });

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
    "gii": ["/data/gii_disability.json", "New Leprosy Cases With Disability"],
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