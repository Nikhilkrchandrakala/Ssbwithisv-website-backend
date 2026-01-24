document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const tableBody = document.getElementById("magazineTableBody");
    const uploadPdfForm = document.getElementById("uploadPdfForm");

    const modal = document.getElementById("editMagazineModal");
    const closeBtn = document.querySelector(".close-button");

    // Close modal on X button click
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Optional: click outside modal to close
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });


    /* ================= SPINNER ================= */
    function showSpinner() {
        document.getElementById("overlay").style.display = "block";
    }

    function hideSpinner() {
        document.getElementById("overlay").style.display = "none";
    }

    /* ================= FETCH MAGAZINES ================= */
    const fetchMagazinePdfs = async () => {
        const response = await fetch(`${config.backendBaseUrl}/api/allMagazinePdfs`);
        const data = await response.json();

        if (!response.ok) {
            alert("Failed to fetch magazine PDFs");
            return;
        }

        tableBody.innerHTML = "";

        data.forEach((pdf) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${pdf.pdfTitle}</td>
                <td>
                  <img src="${config.backendBaseUrl}/${pdf.magazineFrontImage}" width="100"/>
                </td>
                <td>
                  <a href="${config.backendBaseUrl}/${pdf.pdfFilePath}" target="_blank">View PDF</a>
                </td>
                <td>
                 
                  <button onclick="editMagazinePdf('${pdf._id}', '${pdf.pdfTitle}', '${pdf.tags}')">Edit</button>

                  <button onclick="deleteMagazinePdf('${pdf._id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    };

    /* ================= UPLOAD FORM ================= */
    uploadPdfForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // 🔥 PAGE RELOAD STOP
        showSpinner();

        const formData = new FormData();
        formData.append("pdfTitle", document.getElementById("pdfTitle").value);
        formData.append("tags", document.getElementById("tags").value);
        formData.append("magazinePdf", document.getElementById("magazinePdf").files[0]);
        formData.append("magazineFrontImage", document.getElementById("magazineImage").files[0]);

        try {
            const response = await fetch(`${config.backendBaseUrl}/api/addMagazinePdf`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            console.log(response);

            if (response.ok) {
                alert("PDF uploaded successfully!");
                uploadPdfForm.reset();
                fetchMagazinePdfs();
            } else {
                alert(result.message || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Upload error");
        } finally {
            hideSpinner();
        }
    });

    /* ================= EDIT ================= */
    window.editMagazinePdf = (id, currentTitle, currentTags) => {
        document.getElementById("newTitle").value = currentTitle;
        document.getElementById("newTags").value = currentTags; // ✅ set existing tag

        const modal = document.getElementById("editMagazineModal");
        modal.style.display = "block";

        document.getElementById("editMagazineForm").onsubmit = async (e) => {
            e.preventDefault();
            showSpinner();

            const formData = new FormData();
            formData.append("pdfTitle", document.getElementById("newTitle").value);
            formData.append("tags", document.getElementById("newTags").value); // ✅ add tags

            const pdf = document.getElementById("newmagazinePdf").files[0];
            const img = document.getElementById("newmagazineImage").files[0];

            if (pdf) formData.append("magazinePdf", pdf);
            if (img) formData.append("magazineFrontImage", img);

            const response = await fetch(`${config.backendBaseUrl}/api/updateMagazinePdf/${id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                alert("Updated successfully");
                modal.style.display = "none";
                fetchMagazinePdfs();
            } else {
                alert(result.message);
            }

            hideSpinner();
        };
    };

    /* ================= DELETE ================= */
    window.deleteMagazinePdf = async (id) => {
        if (!confirm("Delete this PDF?")) return;

        const response = await fetch(`${config.backendBaseUrl}/api/deleteMagazinePdf/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            alert("Deleted successfully");
            fetchMagazinePdfs();
        } else {
            alert(result.message);
        }
    };

    /* ================= INIT ================= */
    fetchMagazinePdfs();
});
