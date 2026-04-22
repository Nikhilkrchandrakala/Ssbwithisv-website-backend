// DOM Elements
const blogFormContainer = document.getElementById('blogFormContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const editBlogForm = document.getElementById('editBlogForm');
const blogIdInput = document.getElementById('blogId');

// Form elements
const blogTitleInput = document.getElementById('blogTitle');
const shortDescriptionInput = document.getElementById('shortDescription');
const authorNameInput = document.getElementById('authorName');
const authorQuoteInput = document.getElementById('authorQuote');
const timeDurationInput = document.getElementById('timeDuration');
const imageTextInput = document.getElementById('imageText');

// Error elements
const blogTitleError = document.getElementById('blogTitleError');
const shortDescriptionError = document.getElementById('shortDescriptionError');
const authorNameError = document.getElementById('authorNameError');
const timeDurationError = document.getElementById('timeDurationError');
const editorError = document.getElementById('editorError');

// Image upload elements
const blogImgUploadArea = document.getElementById('blogImgUploadArea');
const blogImgInput = document.getElementById('blogImgInput');
const blogImgPreviewContainer = document.getElementById('blogImgPreviewContainer');
const existingImagesSection = document.getElementById('existingImagesSection');
const existingImagesGrid = document.getElementById('existingImagesGrid');

// Buttons
const cancelBtn = document.getElementById('cancelBtn');
const updateBtn = document.getElementById('updateBtn');

// Global variables
let editor;
let uploadedImages = [];
let existingImages = [];
let imagesToDelete = [];

/* ================= Auth ================= */
function getBlogIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to access this page.');
        window.location.href = '../admin.html';
        return null;
    }
    return token;
}

/* ================= Load Blog ================= */
async function loadBlogData() {
    const token = checkAuth();
    if (!token) return;

    const blogId = getBlogIdFromUrl();
    if (!blogId) return showError('No blog ID provided');

    try {
        loadingSpinner.style.display = 'block';
        blogFormContainer.style.display = 'none';

        const response = await fetch(`${config.backendBaseUrl}/api/allBlogs`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const blogs = await response.json();
        const blog = blogs.find(b => b._id === blogId);
        if (!blog) throw new Error('Blog not found');

        populateForm(blog);
        initializeCKEditor(blog.content);

        loadingSpinner.style.display = 'none';
        blogFormContainer.style.display = 'block';

    } catch (error) {
        loadingSpinner.style.display = 'none';
        showError(error.message);
    }
}

/* ================= Populate ================= */
function populateForm(blog) {
    blogIdInput.value = blog._id;
    blogTitleInput.value = blog.title || '';
    shortDescriptionInput.value = blog.shortDescription || '';
    authorNameInput.value = blog.authorName || '';
    authorQuoteInput.value = blog.authorQuote || '';
    timeDurationInput.value = blog.timeDuration || '';
    imageTextInput.value = blog.imageText || '';

    existingImages = blog.images || [];
    renderExistingImages();
}

/* ================= CKEditor ================= */
function initializeCKEditor(content = '') {
    ClassicEditor.create(document.querySelector("#editorContainer"), {
        toolbar: ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "|", "undo", "redo"],
        placeholder: "Start writing your blog content here...",
        language: "en"
    })
        .then(newEditor => {
            editor = newEditor;
            editor.setData(content);
            editor.model.document.on("change:data", () => hideError(editorError));
        })
        .catch(() => {
            document.getElementById("editorContainer").innerHTML =
                `<textarea id="fallbackEditor" class="thm-input" rows="10">${content}</textarea>`;
        });
}

/* ================= Existing Images ================= */
function renderExistingImages() {
    if (!existingImages.length) {
        existingImagesSection.style.display = 'none';
        return;
    }

    existingImagesSection.style.display = 'block';
    existingImagesGrid.innerHTML = '';

    existingImages.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'existing-image-item';
        div.innerHTML = `
      <img src="${url}" class="existing-image">
      <button class="remove-existing-img" data-index="${index}">×</button>
    `;
        existingImagesGrid.appendChild(div);
    });

    document.querySelectorAll('.remove-existing-img').forEach(btn => {
        btn.onclick = e => {
            const i = e.target.dataset.index;
            imagesToDelete.push(existingImages[i]);
            existingImages.splice(i, 1);
            renderExistingImages();
        };
    });
}

/* ================= Image Upload ================= */
blogImgUploadArea.addEventListener('click', () => blogImgInput.click());

blogImgInput.addEventListener('change', e => {
    handleImageFiles([...e.target.files]);
    blogImgInput.value = '';
});

function handleImageFiles(files) {
    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
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
    blogImgPreviewContainer.innerHTML = '';
    uploadedImages.forEach(img => {
        const div = document.createElement('div');
        div.className = 'admin-blog-ImagePreview';
        div.innerHTML = `
      <img src="${img.src}" class="admin-blog-preview-img">
      <button class="admin-blog-remove-img" data-id="${img.id}">×</button>
    `;
        blogImgPreviewContainer.appendChild(div);
    });

    document.querySelectorAll('.admin-blog-remove-img').forEach(btn => {
        btn.onclick = e => {
            const id = e.target.dataset.id;
            uploadedImages = uploadedImages.filter(i => i.id != id);
            updateImagePreviews();
        };
    });
}

/* ================= Validation ================= */
function validateField(input, errorEl, name) {
    if (!input.value.trim()) {
        showErrorElement(errorEl, `Please enter ${name}`);
        return false;
    }
    hideErrorElement(errorEl);
    return true;
}

function validateForm() {
    let valid = true;

    if (!validateField(blogTitleInput, blogTitleError, "blog title")) valid = false;
    if (!validateField(shortDescriptionInput, shortDescriptionError, "short description")) valid = false;
    if (!validateField(authorNameInput, authorNameError, "author name")) valid = false;
    if (!validateField(timeDurationInput, timeDurationError, "time duration")) valid = false;

    const content = editor ? editor.getData().trim() : document.getElementById('fallbackEditor')?.value.trim();
    if (!content) {
        showErrorElement(editorError, "Please enter blog content");
        valid = false;
    } else hideErrorElement(editorError);

    return valid;
}

function showErrorElement(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
    el.parentElement.classList.add("has-error");
}

function hideErrorElement(el) {
    el.style.display = "none";
    el.parentElement.classList.remove("has-error");
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = "block";
}

/* ================= Submit ================= */
editBlogForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = checkAuth();
    if (!token) return;

    const blogId = blogIdInput.value;
    const formData = new FormData();

    formData.append("title", blogTitleInput.value.trim());
    formData.append("shortDescription", shortDescriptionInput.value.trim());
    formData.append("content", editor ? editor.getData() : "");
    formData.append("authorName", authorNameInput.value.trim());
    formData.append("authorQuote", authorQuoteInput.value.trim());
    formData.append("timeDuration", timeDurationInput.value.trim());
    formData.append("imageText", imageTextInput.value.trim());

    imagesToDelete.forEach(img => formData.append("imagesToDelete", img));
    uploadedImages.forEach(img => formData.append("images", img.file));

    updateBtn.innerHTML = "Updating...";
    updateBtn.disabled = true;

    try {
        const res = await fetch(`${config.backendBaseUrl}/api/updateBlog/${blogId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        alert("✅ Blog updated successfully!");
        window.location.href = "./BlogList.html";

    } catch (err) {
        alert("❌ " + err.message);
    } finally {
        updateBtn.innerHTML = "Update Blog";
        updateBtn.disabled = false;
    }
});

/* ================= Cancel ================= */
cancelBtn.addEventListener('click', () => {
    if (confirm("Cancel editing?")) window.location.href = "./BlogList.html";
});

/* ================= Real-time validation ================= */
blogTitleInput.addEventListener("input", () => validateField(blogTitleInput, blogTitleError, "blog title"));
shortDescriptionInput.addEventListener("input", () => validateField(shortDescriptionInput, shortDescriptionError, "short description"));
authorNameInput.addEventListener("input", () => validateField(authorNameInput, authorNameError, "author name"));
timeDurationInput.addEventListener("input", () => validateField(timeDurationInput, timeDurationError, "time duration"));

/* ================= Load ================= */
document.addEventListener("DOMContentLoaded", loadBlogData);
