// DOM Elements
const blogImgUploadArea = document.getElementById("blogImgUploadArea");
const blogImgInput = document.getElementById("blogImgInput");
const blogImgPreviewContainer = document.getElementById("blogImgPreviewContainer");
const adminBlogFrom = document.getElementById("adminBlogFrom");
const cancelBtn = document.getElementById("cancelBtn");
const submitBtn = document.getElementById("submitBtn");

// New Fields
const timeDurationInput = document.getElementById("timeDuration");
const imageTextInput = document.getElementById("imageText");
const timeDurationError = document.getElementById("timeDurationError");

// Form Inputs
const blogTitleInput = document.getElementById("blogTitle");
const shortDescriptionInput = document.getElementById("shortDescription");
const authorNameInput = document.getElementById("authorName");
const authorQuoteInput = document.getElementById("authorQuote");

// Error Elements
const blogTitleError = document.getElementById("blogTitleError");
const shortDescriptionError = document.getElementById("shortDescriptionError");
const authorNameError = document.getElementById("authorNameError");
const editorError = document.getElementById("editorError");

// Global Variables
let editor;
let uploadedImages = [];

/* ================= CKEditor Init ================= */
ClassicEditor.create(document.querySelector("#editorContainer"), {
    toolbar: [
        "heading", "|", "bold", "italic", "link",
        "bulletedList", "numberedList", "|",
        "outdent", "indent", "|", "undo", "redo",
    ],
    placeholder: "Start writing your blog content here...",
    language: "en",
})
    .then((newEditor) => {
        editor = newEditor;
        editor.model.document.on("change:data", () => hideError(editorError));
    })
    .catch((error) => {
        console.error(error);
        document.getElementById("editorContainer").innerHTML = `
      <textarea id="fallbackEditor" class="thm-input" rows="10"
        placeholder="Start writing your blog content here..."></textarea>
    `;
    });

/* ================= Image Upload ================= */
blogImgUploadArea.addEventListener("click", () => blogImgInput.click());

blogImgInput.addEventListener("change", (e) => {
    handleImageFiles(Array.from(e.target.files));
    blogImgInput.value = "";
});

blogImgUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    blogImgUploadArea.style.borderColor = "var(--secondary-color)";
});

blogImgUploadArea.addEventListener("dragleave", () => {
    blogImgUploadArea.style.borderColor = "rgba(255,255,255,0.25)";
});

blogImgUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    handleImageFiles(Array.from(e.dataTransfer.files));
});

/* ================= Cancel ================= */
cancelBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to cancel?")) {
        resetForm();
        window.location.href = "./BlogList.html";
    }
});

/* ================= Submit ================= */
adminBlogFrom.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first!");
        window.location.href = "./login.html";
        return;
    }

    const formData = new FormData();
    formData.append("title", blogTitleInput.value.trim());
    formData.append("shortDescription", shortDescriptionInput.value.trim());
    formData.append("content", editor ? editor.getData() : document.getElementById("fallbackEditor")?.value || "");
    formData.append("authorName", authorNameInput.value.trim());
    formData.append("authorQuote", authorQuoteInput.value.trim());
    formData.append("timeDuration", timeDurationInput.value.trim());
    formData.append("imageText", imageTextInput.value.trim());

    uploadedImages.forEach(img => formData.append("images", img.file));

    submitBtn.innerHTML = "Publishing...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${config.backendBaseUrl}/api/addBlog`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        alert("✅ Blog published successfully!");
        resetForm();
        window.location.href = "./BlogList.html";

    } catch (err) {
        alert("❌ " + err.message);
    } finally {
        submitBtn.innerHTML = "Publish Blog";
        submitBtn.disabled = false;
    }
});

/* ================= Validation ================= */
function validateForm() {
    let isValid = true;

    if (!validateField(blogTitleInput, blogTitleError, "a blog title")) isValid = false;
    if (!validateField(shortDescriptionInput, shortDescriptionError, "a short description")) isValid = false;
    if (!validateField(authorNameInput, authorNameError, "author name")) isValid = false;
    if (!validateField(timeDurationInput, timeDurationError, "time duration")) isValid = false;

    const content = editor ? editor.getData().trim() : document.getElementById("fallbackEditor")?.value.trim();
    if (!content) {
        showError(editorError, "Please enter blog content");
        isValid = false;
    } else hideError(editorError);

    return isValid;
}

/* ================= Helpers ================= */
function validateField(input, errorElement, fieldName) {
    if (!input.value.trim()) {
        showError(errorElement, `Please enter ${fieldName}`);
        return false;
    }
    hideError(errorElement);
    return true;
}

function showError(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
    el.parentElement.classList.add("has-error");
}

function hideError(el) {
    el.style.display = "none";
    el.parentElement.classList.remove("has-error");
}

/* ================= Images ================= */
function handleImageFiles(files) {
    files.forEach(file => {
        if (!file.type.startsWith("image/")) return alert("Only images allowed");
        if (file.size > 5 * 1024 * 1024) return alert("Max 5MB");

        const reader = new FileReader();
        reader.onload = e => {
            uploadedImages.push({ id: Date.now(), src: e.target.result, file });
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function updateImagePreviews() {
    blogImgPreviewContainer.innerHTML = "";
    uploadedImages.forEach(img => {
        const div = document.createElement("div");
        div.className = "admin-blog-ImagePreview";
        div.innerHTML = `
      <img src="${img.src}" class="admin-blog-preview-img"/>
      <button class="admin-blog-remove-img" data-id="${img.id}">×</button>
    `;
        blogImgPreviewContainer.appendChild(div);
    });

    document.querySelectorAll(".admin-blog-remove-img").forEach(btn => {
        btn.onclick = e => {
            const id = e.target.dataset.id;
            uploadedImages = uploadedImages.filter(i => i.id != id);
            updateImagePreviews();
        };
    });
}

/* ================= Reset ================= */
function resetForm() {
    adminBlogFrom.reset();
    if (editor) editor.setData("");
    uploadedImages = [];
    blogImgPreviewContainer.innerHTML = "";
    document.querySelectorAll(".error-message").forEach(e => e.style.display = "none");
}

/* ================= Auth Check ================= */
document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        alert("Please login");
        window.location.href = "./login.html";
    }
});
