// DOM Elements
const blogImgUploadArea = document.getElementById("blogImgUploadArea");
const blogImgInput = document.getElementById("blogImgInput");
const blogImgPreviewContainer = document.getElementById("blogImgPreviewContainer");
const imageTextsContainer = document.getElementById("imageTextsContainer");
const adminBlogFrom = document.getElementById("adminBlogFrom");
const cancelBtn = document.getElementById("cancelBtn");
const submitBtn = document.getElementById("submitBtn");
const pageTitle = document.querySelector(".admin-blog-card-header h1");
const pageSubtitle = document.querySelector(".admin-blog-card-header p");

// Form Inputs
const blogTitleInput = document.getElementById("blogTitle");
const shortDescriptionInput = document.getElementById("shortDescription");
const authorNameInput = document.getElementById("authorName");
const authorQuoteInput = document.getElementById("authorQuote");
const timeDurationInput = document.getElementById("timeDuration");

// Error Elements
const blogTitleError = document.getElementById("blogTitleError");
const shortDescriptionError = document.getElementById("shortDescriptionError");
const authorNameError = document.getElementById("authorNameError");
const timeDurationError = document.getElementById("timeDurationError");
const editorError = document.getElementById("editorError");

// Global Variables
let editor;
let uploadedImages = []; // New images to upload
let existingImages = []; // For edit mode: existing images from DB
let imagesToDelete = []; // For edit mode: images marked for deletion
let isEditMode = false;
let currentBlogId = null;

/* ================= Initialize Page ================= */
document.addEventListener("DOMContentLoaded", async () => {
    // Check authentication
    if (!localStorage.getItem("token")) {
        alert("Please login");
        window.location.href = "../admin.html";
        return;
    }

    // Check if we're in edit mode (check URL for id parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const blogId = urlParams.get("id");

    if (blogId) {
        // Edit mode
        isEditMode = true;
        currentBlogId = blogId;
        await loadBlogForEdit(blogId);
    } else {
        // Add mode
        isEditMode = false;
        initializeAddMode();
    }

    // Initialize CKEditor
    initializeCKEditor();
});

/* ================= Initialize Add Mode ================= */
function initializeAddMode() {
    pageTitle.textContent = "Add New Blog Post";
    pageSubtitle.textContent = "Fill in the details below to create a new blog post";
    submitBtn.textContent = "Publish Blog";
    resetForm();
}

/* ================= Initialize Edit Mode ================= */
async function loadBlogForEdit(blogId) {
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        submitBtn.disabled = true;

        const token = localStorage.getItem("token");

        const response = await fetch(`${config.backendBaseUrl}/api/allBlogs`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load blogs");
        }

        const blogs = await response.json();

        // ✅ filter blog by id
        const blog = blogs.find(b => b._id === blogId);

        if (!blog) {
            throw new Error("Blog not found");
        }

        populateForm(blog);

        pageTitle.textContent = "Edit Blog Post";
        pageSubtitle.textContent = "Update your blog post details below";
        submitBtn.textContent = "Update Blog";

    } catch (error) {
        console.error("Error loading blog:", error);
        alert("Failed to load blog. Redirecting to add mode.");
        initializeAddMode();
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Update Blog";
    }
}


/* ================= Populate Form with Blog Data ================= */
function populateForm(blog) {
    // Set form values
    blogTitleInput.value = blog.title || "";
    shortDescriptionInput.value = blog.shortDescription || "";
    authorNameInput.value = blog.authorName || "";
    authorQuoteInput.value = blog.authorQuote || "";
    timeDurationInput.value = blog.timeDuration || "";

    // Store existing images
    existingImages = blog.images || [];

    // Set editor content
    if (editor) {
        editor.setData(blog.content || "");
    } else {
        setTimeout(() => {
            if (editor) editor.setData(blog.content || "");
        }, 500);
    }

    // ✅ VERY IMPORTANT
    updateImagePreviews();      // show existing images
    updateImageTextInputs();    // if any new images later
}


/* ================= Initialize CKEditor ================= */
function initializeCKEditor() {
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

            // If in edit mode and we have content, set it
            if (isEditMode && !editor.getData()) {
                // We'll set content when form is populated
            }
        })
        .catch((error) => {
            console.error(error);
            document.getElementById("editorContainer").innerHTML = `
            <textarea id="fallbackEditor" class="thm-input" rows="10"
                placeholder="Start writing your blog content here..."></textarea>
        `;
        });
}

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

function handleImageFiles(files) {
    files.forEach(file => {
        if (!file.type.startsWith("image/")) {
            alert("Only images are allowed!");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("File size should be less than 5MB!");
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            uploadedImages.push({
                id: Date.now() + Math.random(),
                src: e.target.result,
                file: file,
                imageText: ""
            });
            updateImagePreviews();
            updateImageTextInputs();
        };
        reader.readAsDataURL(file);
    });
}

/* ================= Update Image Previews ================= */
function updateImagePreviews() {
    blogImgPreviewContainer.innerHTML = "";

    // Show existing images first (only in edit mode)
    if (isEditMode && existingImages.length > 0) {
        const existingHeader = document.createElement("div");
        existingHeader.className = "existing-images-header mb-3";
        existingHeader.innerHTML = `<h6 style="color: var(--secondary-color);">Existing Images</h6>`;
        blogImgPreviewContainer.appendChild(existingHeader);

        existingImages.forEach((img, index) => {
            const div = document.createElement("div");
            div.className = "admin-blog-ImagePreview existing-image";
            div.dataset.imageUrl = img.imageUrl;

            div.innerHTML = `
                <img src="${img.imageUrl}" class="admin-blog-preview-img"/>
                <button type="button" class="admin-blog-remove-img remove-existing" data-image-url="${img.imageUrl}">×</button>
                <div class="image-text-overlay">${img.imageText || "No text"}</div>
            `;

            blogImgPreviewContainer.appendChild(div);
        });
    }

    // Show new images
    if (uploadedImages.length > 0) {
        const newHeader = document.createElement("div");
        newHeader.className = "new-images-header mb-3";
        newHeader.innerHTML = `<h6 style="color: var(--secondary-color);">New Images</h6>`;
        blogImgPreviewContainer.appendChild(newHeader);

        uploadedImages.forEach((img, index) => {
            const div = document.createElement("div");
            div.className = "admin-blog-ImagePreview new-image";

            div.innerHTML = `
                <img src="${img.src}" class="admin-blog-preview-img"/>
                <button class="admin-blog-remove-img remove-new" data-id="${img.id}">×</button>
            `;

            blogImgPreviewContainer.appendChild(div);
        });
    }

    // Add event listeners for remove buttons
    document.querySelectorAll(".remove-new").forEach(btn => {
        btn.onclick = e => {
            const id = e.target.dataset.id;
            uploadedImages = uploadedImages.filter(i => i.id != id);
            updateImagePreviews();
            updateImageTextInputs();
        };
    });

    document.querySelectorAll(".remove-existing").forEach(btn => {
        btn.onclick = e => {
            const imageUrl = e.target.dataset.imageUrl;
            if (!imagesToDelete.includes(imageUrl)) {
                imagesToDelete.push(imageUrl);
            }
            // Remove from existing images preview
            existingImages = existingImages.filter(img => img.imageUrl !== imageUrl);
            updateImagePreviews();
            updateImageTextInputs();
        };
    });
}

/* ================= Update Image Text Inputs ================= */
function updateImageTextInputs() {
    imageTextsContainer.innerHTML = "";

    /* ===== EXISTING IMAGES TEXT INPUTS (Edit Mode) ===== */
    if (isEditMode && existingImages.length > 0) {
        const header = document.createElement("h5");
        header.className = "mb-3";
        header.style.color = "#fff";
        header.textContent = "Image Text Fields (existing images)";
        imageTextsContainer.appendChild(header);

        existingImages.forEach((img, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "form-group mb-3";

            const previewWrapper = document.createElement("div");
            previewWrapper.className = "d-flex align-items-center mb-2";

            const imgPreview = document.createElement("img");
            imgPreview.src = img.imageUrl;
            imgPreview.className = "img-thumbnail me-3";
            imgPreview.style.width = "60px";
            imgPreview.style.height = "60px";
            imgPreview.style.objectFit = "cover";

            const label = document.createElement("span");
            label.textContent = `Existing Image ${index + 1}`;
            label.style.color = "#fff";

            previewWrapper.appendChild(imgPreview);
            previewWrapper.appendChild(label);

            const input = document.createElement("input");
            input.type = "text";
            input.className = "form-control thm-input image-text-input";
            input.placeholder = "Enter text for this image";
            input.value = img.imageText || "";

            // update existingImages array
            input.addEventListener("input", (e) => {
                existingImages[index].imageText = e.target.value;
            });

            wrapper.appendChild(previewWrapper);
            wrapper.appendChild(input);
            imageTextsContainer.appendChild(wrapper);
        });
    }

    /* ===== NEW UPLOADED IMAGES TEXT INPUTS ===== */
    if (uploadedImages.length > 0) {
        const header2 = document.createElement("h5");
        header2.className = "mb-3 mt-4";
        header2.style.color = "#fff";
        header2.textContent = "Image Text Fields (new images)";
        imageTextsContainer.appendChild(header2);

        uploadedImages.forEach((img, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "form-group mb-3";

            const previewWrapper = document.createElement("div");
            previewWrapper.className = "d-flex align-items-center mb-2";

            const imgPreview = document.createElement("img");
            imgPreview.src = img.src;
            imgPreview.className = "img-thumbnail me-3";
            imgPreview.style.width = "60px";
            imgPreview.style.height = "60px";
            imgPreview.style.objectFit = "cover";

            const label = document.createElement("span");
            label.textContent = `New Image ${index + 1}`;
            label.style.color = "#fff";

            previewWrapper.appendChild(imgPreview);
            previewWrapper.appendChild(label);

            const input = document.createElement("input");
            input.type = "text";
            input.className = "form-control thm-input image-text-input";
            input.placeholder = "Enter text for this image";
            input.value = img.imageText || "";

            input.addEventListener("input", (e) => {
                uploadedImages[index].imageText = e.target.value;
            });

            wrapper.appendChild(previewWrapper);
            wrapper.appendChild(input);
            imageTextsContainer.appendChild(wrapper);
        });
    }
}

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
        window.location.href = "../admin.html";
        return;
    }

    const formData = new FormData();

    // ===== BASIC FIELDS =====
    formData.append("title", blogTitleInput.value.trim());
    formData.append("shortDescription", shortDescriptionInput.value.trim());
    formData.append(
        "content",
        editor ? editor.getData() : document.getElementById("fallbackEditor")?.value || ""
    );
    formData.append("authorName", authorNameInput.value.trim());
    formData.append("authorQuote", authorQuoteInput.value.trim());
    formData.append("timeDuration", timeDurationInput.value.trim());

    // ===== NEW IMAGES + THEIR TEXT =====
    uploadedImages.forEach(img => {
        formData.append("images", img.file);                // file
        formData.append("imageTexts", img.imageText || ""); // text for that image
    });

    // ===== EXISTING IMAGES TEXT (EDIT MODE) =====
    if (isEditMode && existingImages.length > 0) {
        formData.append(
            "existingImageTexts",
            JSON.stringify(
                existingImages.map(img => ({
                    imageUrl: img.imageUrl,
                    imageText: img.imageText || ""
                }))
            )
        );
    }

    // ===== DELETED IMAGES (EDIT MODE) =====
    if (isEditMode && imagesToDelete.length > 0) {
        formData.append("imagesToDelete", JSON.stringify(imagesToDelete));
    }

    submitBtn.innerHTML = isEditMode ? "Updating..." : "Publishing...";
    submitBtn.disabled = true;

    try {
        let url, method;

        if (isEditMode) {
            url = `${config.backendBaseUrl}/api/updateBlog/${currentBlogId}`;
            method = "PUT";
        } else {
            url = `${config.backendBaseUrl}/api/addBlog`;
            method = "POST";
        }

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        alert(`✅ Blog ${isEditMode ? "updated" : "published"} successfully!`);
        resetForm();
        window.location.href = "./BlogList.html";

    } catch (err) {
        alert("❌ " + err.message);
        console.error(err);
    } finally {
        submitBtn.innerHTML = isEditMode ? "Update Blog" : "Publish Blog";
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

/* ================= Reset ================= */
function resetForm() {
    adminBlogFrom.reset();
    if (editor) editor.setData("");
    uploadedImages = [];
    existingImages = [];
    imagesToDelete = [];
    blogImgPreviewContainer.innerHTML = "";
    imageTextsContainer.innerHTML = "";
    document.querySelectorAll(".error-message").forEach(e => e.style.display = "none");

    // Reset to add mode
    isEditMode = false;
    currentBlogId = null;
    pageTitle.textContent = "Add New Blog Post";
    pageSubtitle.textContent = "Fill in the details below to create a new blog post";
    submitBtn.textContent = "Publish Blog";
}