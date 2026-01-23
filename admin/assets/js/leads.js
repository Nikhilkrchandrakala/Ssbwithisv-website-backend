// Fetch leads from the API and display them in the table
document.addEventListener("DOMContentLoaded", () => {
  fetch(`${config.backendBaseUrl}/api/allLeads`)
    .then(response => response.json())
    .then(data => {
      const tableBody = document.getElementById("leadsTableBody");
      tableBody.innerHTML = "";

      data.forEach(lead => {
        const row = document.createElement("tr");
        const dateObj = new Date(lead.date);

        // Time (HH:MM)
        const timeCell = document.createElement("td");
        timeCell.textContent = dateObj.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
        row.appendChild(timeCell);

        // Date (DD/MM/YYYY)
        const dateCell = document.createElement("td");
        dateCell.textContent = dateObj.toLocaleDateString("en-GB");
        row.appendChild(dateCell);

        // Name
        const nameCell = document.createElement("td");
        nameCell.textContent = lead.name || "-";
        row.appendChild(nameCell);

        // Email
        const emailCell = document.createElement("td");
        emailCell.textContent = lead.email || "-";
        row.appendChild(emailCell);

        // Phone
        const phoneCell = document.createElement("td");
        phoneCell.textContent = lead.phoneNumber || "-";
        row.appendChild(phoneCell);

        tableBody.appendChild(row);
      });
    })
    .catch(error => console.error("Error fetching leads:", error));
});


// Excel Download
document.getElementById("excelDownloadBtn").addEventListener("click", () => {
  fetch(`${config.backendBaseUrl}/api/allLeads`)
    .then(response => response.json())
    .then(data => {

      const filteredData = data.map(lead => {
        const dateObj = new Date(lead.date);

        return {
          Time: dateObj.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }),
          Date: dateObj.toLocaleDateString("en-GB"),
          Name: lead.name || "-",
          Email: lead.email || "-",
          Phone: lead.phoneNumber || "-"
        };
      });

      // Create workbook & worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filteredData);

      XLSX.utils.book_append_sheet(wb, ws, "LeadsData");
      XLSX.writeFile(wb, "LeadsData.xlsx");
    })
    .catch(error =>
      console.error("Error fetching leads for Excel download:", error)
    );
});
