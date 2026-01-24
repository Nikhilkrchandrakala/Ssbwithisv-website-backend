document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem('token');
  const tableBody = document.getElementById('numberMonitorTableBody');
  // const addEntryForm = document.getElementById('addEntryForm');


  // Fetch all entries
  const fetchEntries = async () => {
    const response = await fetch(`${config.backendBaseUrl}/api/allNumberMonitors`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      tableBody.innerHTML = '';
      data.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="text" value="${entry.officerSelection}" data-id="${entry._id}" class="officerSelection"></td>
          <td><input type="number" value="${entry.yearService}" data-id="${entry._id}" class="yearService"></td>
          <td><input type="number" value="${entry.facultyExperience}" data-id="${entry._id}" class="facultyExperience"></td>
          <td><input type="number" value="${entry.totalFaculty}" data-id="${entry._id}" class="totalFaculty"></td>
          <td><button onclick="saveEntry('${entry._id}')">Save</button></td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      alert('Failed to fetch entries');
    }
  };


  // Save entry
  window.saveEntry = async (id) => {
    const officerSelection = document.querySelector(`.officerSelection[data-id="${id}"]`).value;
    const yearService = document.querySelector(`.yearService[data-id="${id}"]`).value;
    const facultyExperience = document.querySelector(`.facultyExperience[data-id="${id}"]`).value;
    const totalFaculty = document.querySelector(`.totalFaculty[data-id="${id}"]`).value;

    const updatedEntry = {
      officerSelection,
      yearService,
      facultyExperience,
      totalFaculty,
    };

    const token = localStorage.getItem("token"); // ensure token exists
    console.log("TOKEN:", token);

    const response = await fetch(`${config.backendBaseUrl}/api/updateNumberMonitor/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,   // ✅ correct header
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedEntry),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Entry updated successfully!');
      fetchEntries();
    } else {
      alert(result.message || 'Failed to update entry');
    }
  };

  // Fetch entries on load
  fetchEntries();
});
