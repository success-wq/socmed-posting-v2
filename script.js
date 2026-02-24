// Configuration
const CONFIG = {
    WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbwsPqtiXoC6vNF6BNYQPGqhbazL_tvn5KD07GIOuyZtzhmqPAeL1JTk7IztpPyh5b6h/exec',
    N8N_TEXT_WEBHOOK: 'https://bsmteam.app.n8n.cloud/webhook/3b3d73f0-e739-420c-bd72-e30f590726a4',
    N8N_IMAGE_WEBHOOK: 'https://bsmteam.app.n8n.cloud/webhook/7af9b7d7-aa02-42e4-8c71-32e9a298c749',
    N8N_PUBLISH_WEBHOOK: 'https://bsmteam.app.n8n.cloud/webhook/2a8b5dcf-f1b8-4683-b73a-f2e9f7adc498',
    GHL_LOCATION_ID: '',
    GHL_TOKEN: '',
    GHL_USER_ID: ''
};

// State
let forms = [];
let currentFormIndex = 0;
let accounts = [];
let spreadsheetData = [];
let areas = []; // Store unique areas
let availableImageUrls = []; // Store image URLs from n8n for manual loading

// DOM Elements
const formsContainer = document.getElementById('formsContainer');
const formTabs = document.getElementById('formTabs');
const addFormBtn = document.getElementById('addFormBtn');
const submitAllBtn = document.getElementById('submitAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Load Spreadsheet Data
async function loadSpreadsheetData() {
    try {
        console.log('🔄 Fetching spreadsheet data from:', CONFIG.WEBAPP_URL);
        const response = await fetch(CONFIG.WEBAPP_URL);
        const data = await response.json();
        
        console.log('📥 Raw response:', data);
        
        if (data && data.length > 0) {
            spreadsheetData = data;
            
            // Extract unique areas
            areas = [...new Set(data.map(row => row.area).filter(Boolean))];
            console.log('📍 Areas found:', areas);
            
            // Set CONFIG values from first row
            const firstRow = data[0];
            CONFIG.GHL_LOCATION_ID = firstRow.ghlLocationId || '';
            CONFIG.GHL_TOKEN = firstRow.ghlApiKey || '';
            CONFIG.GHL_USER_ID = firstRow.ghlLocationId || '';
            
            console.log('✅ Spreadsheet data loaded:', data.length, 'rows');
        } else {
            console.error('❌ No data returned from spreadsheet');
        }
    } catch (error) {
        console.error('❌ Error loading spreadsheet data:', error);
        alert('Error loading spreadsheet data. Please check your webapp URL.');
    }
}

// Initialize
async function init() {
    await loadSpreadsheetData();
    await loadAccounts();
    createForm();
    setupEventListeners();
}

// Load GHL Accounts
async function loadAccounts(selectedArea = null) {
    try {
        console.log('📋 Loading accounts from spreadsheet data...');
        
        // Filter by area if specified
        const filteredData = selectedArea 
            ? spreadsheetData.filter(row => row.area === selectedArea)
            : spreadsheetData;
        
        // Transform spreadsheet data to accounts array
        accounts = filteredData.map((row, index) => ({
            id: `page-${index}`,
            name: row.pageTitle || '',
            platform: row.area || 'Page',
            area: row.area || ''
        }));
        
        console.log('✅ Accounts array populated:', accounts.length, 'items');
        console.log('📋 Accounts:', accounts);
        
    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        accounts = [];
    }
}

// Setup Event Listeners
function setupEventListeners() {
    addFormBtn.addEventListener('click', createForm);
    submitAllBtn.addEventListener('click', submitAllForms);
    clearAllBtn.addEventListener('click', clearAllForms);
}

// Create Form
function createForm() {
    const formId = forms.length + 1;
    const form = {
        id: formId,
        selectedArea: '',
        pageMode: 'select',
        pages: [],
        pageTitles: [],
        platform: 'facebook', // Changed from platforms array to single platform
        postPrompt: '',
        mediaType: 'none', // 'none', 'video', or 'image'
        videoType: 'prompt',
        videoPrompt: '',
        videoUrl: '',
        imageType: 'prompt',
        imagePrompt: '',
        drafts: []
    };
    
    forms.push(form);
    renderForm(form);
    renderTabs();
    switchToForm(formId - 1);
}

// Render Form
function renderForm(form) {
    const formHTML = `
        <div class="form-item" data-form-id="${form.id}">
            <div class="form-header">
                <h2 class="form-title">Form ${form.id}</h2>
                ${forms.length > 1 ? `<button class="delete-form-btn" onclick="deleteForm(${form.id})">Delete Form</button>` : ''}
            </div>
            
            <div class="form-grid">
                <!-- Area Selection -->
                <div class="form-section">
                    <label class="section-label">
                        Select Area
                        <span class="required-indicator">*</span>
                    </label>
                    <select class="select-input" data-field="area">
                        <option value="">Choose area...</option>
                        ${areas.map(area => `
                            <option value="${area}">${area}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Platform - Changed to Radio Buttons -->
                <div class="form-section">
                    <label class="section-label">
                        Platform
                        <span class="required-indicator">*</span>
                    </label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="platform-${form.id}" data-field="platform" value="facebook" checked>
                            <span class="radio-label">Facebook</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="platform-${form.id}" data-field="platform" value="linkedin">
                            <span class="radio-label">LinkedIn</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="platform-${form.id}" data-field="platform" value="instagram">
                            <span class="radio-label">Instagram</span>
                        </label>
                    </div>
                </div>

                <!-- Page Mode Selection -->
                <div class="form-section">
                    <label class="section-label">
                        Page Selection Mode
                        <span class="required-indicator">*</span>
                    </label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="pageMode-${form.id}" data-field="pageMode" value="select" checked>
                            <span class="radio-label">Select Pages</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="pageMode-${form.id}" data-field="pageMode" value="all">
                            <span class="radio-label">All Pages</span>
                        </label>
                    </div>
                </div>

                <!-- Page Select -->
                <div class="form-section">
                    <label class="section-label">
                        Select Pages
                        <span class="required-indicator">*</span>
                    </label>
                    <div class="multiselect-wrapper" data-multiselect="${form.id}">
                        <div class="multiselect-display" data-multiselect-display="${form.id}">
                            <div class="multiselect-placeholder">Choose area first...</div>
                            <div class="multiselect-tags" data-multiselect-tags="${form.id}"></div>
                            <div class="multiselect-controls">
                                <button type="button" class="multiselect-clear" data-multiselect-clear="${form.id}" style="display: none;">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </button>
                                <div class="multiselect-arrow">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="multiselect-dropdown" data-multiselect-dropdown="${form.id}">
                            <div class="multiselect-search">
                                <input 
                                    type="text" 
                                    class="multiselect-search-input" 
                                    data-multiselect-search="${form.id}"
                                    placeholder="Search pages..."
                                >
                            </div>
                            <div class="multiselect-options" data-multiselect-options="${form.id}">
                                <!-- Options will be populated based on area selection -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Post Content -->
                <div class="form-section full-width">
                    <label class="section-label">
                        Post Content
                        <span class="required-indicator">*</span>
                    </label>
                    <textarea 
                        class="textarea-input" 
                        data-field="postPrompt" 
                        placeholder="Enter your post content or prompt..."
                        rows="4"
                    ></textarea>
                </div>

                <!-- Media Type - Changed to Radio Buttons -->
                <div class="form-section full-width">
                    <label class="section-label">Media Type</label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="mediaType-${form.id}" data-field="mediaType" value="none" checked>
                            <span class="radio-label">None</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="mediaType-${form.id}" data-field="mediaType" value="video">
                            <span class="radio-label">Video</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="mediaType-${form.id}" data-field="mediaType" value="image">
                            <span class="radio-label">Image</span>
                        </label>
                    </div>
                </div>

                <!-- Video Settings -->
                <div class="form-section full-width media-settings" data-media-settings="video" style="display: none;">
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="videoType-${form.id}" data-field="videoType" value="prompt" checked>
                            <span class="radio-label">Generate from Prompt</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="videoType-${form.id}" data-field="videoType" value="upload">
                            <span class="radio-label">Upload Video</span>
                        </label>
                    </div>
                    
                    <div class="conditional-field" data-condition="videoType" data-value="prompt">
                        <textarea 
                            class="textarea-input" 
                            data-field="videoPrompt" 
                            placeholder="Describe the video you want to generate..."
                            rows="3"
                        ></textarea>
                    </div>
                    
                    <div class="conditional-field" data-condition="videoType" data-value="upload" style="display: none;">
                        <input 
                            type="url" 
                            class="text-input" 
                            data-field="videoUrl" 
                            placeholder="Enter video URL or upload video..."
                        >
                        <p class="help-text">Video upload functionality coming soon</p>
                    </div>
                </div>

                <!-- Image Settings -->
                <div class="form-section full-width media-settings" data-media-settings="image" style="display: none;">
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="imageType-${form.id}" data-field="imageType" value="prompt" checked>
                            <span class="radio-label">Generate from Prompt</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" class="radio-input" name="imageType-${form.id}" data-field="imageType" value="upload">
                            <span class="radio-label">Upload Image</span>
                        </label>
                    </div>
                    
                    <div class="conditional-field" data-condition="imageType" data-value="prompt">
                        <textarea 
                            class="textarea-input" 
                            data-field="imagePrompt" 
                            placeholder="Describe the image you want to generate..."
                            rows="3"
                        ></textarea>
                    </div>
                    
                    <div class="conditional-field" data-condition="imageType" data-value="upload" style="display: none;">
                        <input 
                            type="file" 
                            class="file-input" 
                            accept="image/*"
                        >
                    </div>
                </div>
            </div>

            <!-- Drafts Section -->
            <div class="drafts-section" data-drafts="${form.id}">
                <!-- Drafts will be rendered here -->
            </div>
        </div>
    `;
    
    formsContainer.insertAdjacentHTML('beforeend', formHTML);
    setupFormListeners(form);
}

// Setup Form Listeners
function setupFormListeners(form) {
    const formElement = document.querySelector(`[data-form-id="${form.id}"]`);
    
    // Area select
    const areaSelect = formElement.querySelector('[data-field="area"]');
    areaSelect.addEventListener('change', async (e) => {
        form.selectedArea = e.target.value;
        form.pages = [];
        form.pageTitles = [];
        
        // Reload accounts filtered by area
        await loadAccounts(form.selectedArea);
        
        // Update multiselect options (pass current platform so filtering applies immediately)
        updateMultiselectOptions(form.id, form.platform);
        updateMultiselectDisplay(form.id);
    });
    
    // Page mode radio
    formElement.querySelectorAll('input[name^="pageMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            form.pageMode = e.target.value;
            updateMultiselectVisibility(form.id);
        });
    });
    
    // Platform radio buttons
    formElement.querySelectorAll('[data-field="platform"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            form.platform = e.target.value;
            if (form.selectedArea) {
                // Only remove currently selected pages that don't qualify for the new platform
                // Keep the ones that do have the new platform's ID filled
                const toKeepIndices = form.pageTitles.reduce((acc, title, i) => {
                    const row = spreadsheetData.find(r => r.pageTitle === title);
                    let qualifies = true;
                    if (row) {
                        if (form.platform === 'facebook') {
                            qualifies = row.metaPageId && row.metaPageId.toString().trim() !== '';
                        } else if (form.platform === 'instagram') {
                            qualifies = row.igMetaPageId && row.igMetaPageId.toString().trim() !== '';
                        } else if (form.platform === 'linkedin') {
                            qualifies = row.linkedinMetaPageId && row.linkedinMetaPageId.toString().trim() !== '';
                        }
                        // twitter/tiktok: all qualify
                    }
                    if (qualifies) acc.push(i);
                    return acc;
                }, []);

                // Update form selections to only the qualifying ones
                form.pages = toKeepIndices.map(i => form.pages[i]);
                form.pageTitles = toKeepIndices.map(i => form.pageTitles[i]);

                // Deselect removed options in the dropdown UI
                const optionsContainer = document.querySelector(`[data-multiselect-options="${form.id}"]`);
                if (optionsContainer) {
                    optionsContainer.querySelectorAll('.multiselect-option.selected').forEach(opt => {
                        if (!form.pages.includes(opt.dataset.optionId)) {
                            opt.classList.remove('selected');
                        }
                    });
                }

                // Re-render available options and tags
                updateMultiselectOptions(form.id, form.platform);
                updateMultiselectDisplay(form.id);
            }
        });
    });
    
    // Post prompt textarea
    const postPromptField = formElement.querySelector('[data-field="postPrompt"]');
    postPromptField.addEventListener('input', (e) => {
        form.postPrompt = e.target.value;
    });
    
    // Media type radio buttons
    formElement.querySelectorAll('[data-field="mediaType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            form.mediaType = e.target.value;
            updateMediaSettings(form.id, e.target.value);
        });
    });
    
    // Video type radio
    formElement.querySelectorAll('input[name^="videoType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            form.videoType = e.target.value;
            updateConditionalFields(formElement, 'videoType', e.target.value);
        });
    });
    
    // Video prompt textarea
    const videoPromptField = formElement.querySelector('[data-field="videoPrompt"]');
    videoPromptField.addEventListener('input', (e) => {
        form.videoPrompt = e.target.value;
    });
    
    // Video URL input
    const videoUrlField = formElement.querySelector('[data-field="videoUrl"]');
    videoUrlField.addEventListener('input', (e) => {
        form.videoUrl = e.target.value;
    });
    
    // Image type radio
    formElement.querySelectorAll('input[name^="imageType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            form.imageType = e.target.value;
            updateConditionalFields(formElement, 'imageType', e.target.value);
        });
    });
    
    // Image prompt textarea
    const imagePromptField = formElement.querySelector('[data-field="imagePrompt"]');
    imagePromptField.addEventListener('input', (e) => {
        form.imagePrompt = e.target.value;
    });
    
    // Setup multiselect
    setupMultiselect(form.id);
}

// Update Media Settings Visibility
function updateMediaSettings(formId, mediaType) {
    const formElement = document.querySelector(`[data-form-id="${formId}"]`);
    
    formElement.querySelectorAll('[data-media-settings]').forEach(section => {
        section.style.display = section.dataset.mediaSettings === mediaType ? 'block' : 'none';
    });
}

// Update Multiselect Options
function updateMultiselectOptions(formId, platform) {
    const form = forms.find(f => f.id === formId);
    const optionsContainer = document.querySelector(`[data-multiselect-options="${formId}"]`);
    const currentPlatform = platform !== undefined ? platform : form.platform;

    // Filter accounts based on selected platform and whether the platform-specific ID column is filled
    const filteredAccounts = accounts.filter(acc => {
        if (!currentPlatform) return true; // No platform selected yet — show all
        const row = spreadsheetData.find(r => r.pageTitle === acc.name);
        if (!row) return true;

        if (currentPlatform === 'facebook') {
            return row.metaPageId && row.metaPageId.toString().trim() !== '';
        }
        if (currentPlatform === 'instagram') {
            return row.igMetaPageId && row.igMetaPageId.toString().trim() !== '';
        }
        if (currentPlatform === 'linkedin') {
            return row.linkedinMetaPageId && row.linkedinMetaPageId.toString().trim() !== '';
        }
        // twitter, tiktok — no dedicated ID column check, show all
        return true;
    });

    optionsContainer.innerHTML = filteredAccounts.map(acc => {
        const isSelected = form.pages.includes(acc.id);
        return '<div class="multiselect-option' + (isSelected ? ' selected' : '') + '" data-option-id="' + acc.id + '" data-option-name="' + acc.name + ' (' + acc.platform + ')">' +
            acc.name + ' (' + acc.platform + ')' +
            '</div>';
    }).join('');
}

// Update Multiselect Visibility
function updateMultiselectVisibility(formId) {
    const form = forms.find(f => f.id === formId);
    const wrapper = document.querySelector(`[data-multiselect="${formId}"]`);
    
    if (form.pageMode === 'all') {
        wrapper.style.display = 'none';
        // Apply same platform filtering as the dropdown when selecting all pages
        const currentPlatform = form.platform;
        const filteredAccounts = accounts.filter(acc => {
            if (!currentPlatform) return true;
            const row = spreadsheetData.find(r => r.pageTitle === acc.name);
            if (!row) return true;
            if (currentPlatform === 'facebook') return row.metaPageId && row.metaPageId.toString().trim() !== '';
            if (currentPlatform === 'instagram') return row.igMetaPageId && row.igMetaPageId.toString().trim() !== '';
            if (currentPlatform === 'linkedin') return row.linkedinMetaPageId && row.linkedinMetaPageId.toString().trim() !== '';
            return true;
        });
        form.pages = filteredAccounts.map(acc => acc.id);
        form.pageTitles = filteredAccounts.map(acc => acc.name);
    } else {
        wrapper.style.display = 'block';
    }
}

// Update Conditional Fields
function updateConditionalFields(formElement, condition, value) {
    formElement.querySelectorAll(`[data-condition="${condition}"]`).forEach(field => {
        field.style.display = field.dataset.value === value ? 'block' : 'none';
    });
}

// Setup Multiselect
function setupMultiselect(formId) {
    const form = forms.find(f => f.id === formId);
    const wrapper = document.querySelector(`[data-multiselect="${formId}"]`);
    const display = document.querySelector(`[data-multiselect-display="${formId}"]`);
    const dropdown = document.querySelector(`[data-multiselect-dropdown="${formId}"]`);
    const searchInput = document.querySelector(`[data-multiselect-search="${formId}"]`);
    const optionsContainer = document.querySelector(`[data-multiselect-options="${formId}"]`);
    const tagsContainer = document.querySelector(`[data-multiselect-tags="${formId}"]`);
    const placeholder = display.querySelector('.multiselect-placeholder');
    const clearBtn = document.querySelector(`[data-multiselect-clear="${formId}"]`);
    
    // Toggle dropdown
    display.addEventListener('click', (e) => {
        if (e.target.closest('.multiselect-clear')) return;
        if (!form.selectedArea) {
            alert('Please select an area first');
            return;
        }
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const options = optionsContainer.querySelectorAll('.multiselect-option');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });
    
    // Option selection
    optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.multiselect-option');
        if (!option) return;
        
        const optionId = option.dataset.optionId;
        const optionName = option.dataset.optionName;
        const account = accounts.find(acc => acc.id === optionId);
        
        if (option.classList.contains('selected')) {
            // Deselect
            option.classList.remove('selected');
            form.pages = form.pages.filter(id => id !== optionId);
            form.pageTitles = form.pageTitles.filter(name => name !== account.name);
        } else {
            // Select
            option.classList.add('selected');
            form.pages.push(optionId);
            form.pageTitles.push(account.name);
        }
        
        updateMultiselectDisplay(formId);
    });
    
    // Clear button
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        form.pages = [];
        form.pageTitles = [];
        optionsContainer.querySelectorAll('.multiselect-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        updateMultiselectDisplay(formId);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Update Multiselect Display
function updateMultiselectDisplay(formId) {
    const form = forms.find(f => f.id === formId);
    const tagsContainer = document.querySelector(`[data-multiselect-tags="${formId}"]`);
    const placeholder = document.querySelector(`[data-multiselect-display="${formId}"] .multiselect-placeholder`);
    const clearBtn = document.querySelector(`[data-multiselect-clear="${formId}"]`);
    
    if (form.pages.length === 0) {
        tagsContainer.innerHTML = '';
        placeholder.style.display = 'block';
        placeholder.textContent = form.selectedArea ? 'Choose pages...' : 'Choose area first...';
        clearBtn.style.display = 'none';
    } else {
        placeholder.style.display = 'none';
        clearBtn.style.display = 'block';
        
        tagsContainer.innerHTML = form.pageTitles.map((title, index) => {
            const account = accounts.find(acc => acc.name === title);
            return `
                <div class="multiselect-tag">
                    <span>${title}</span>
                    <button type="button" class="multiselect-tag-remove" data-remove-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
        
        // Setup remove tag listeners
        tagsContainer.querySelectorAll('.multiselect-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.removeIndex);
                const pageId = form.pages[index];
                const pageTitle = form.pageTitles[index];
                
                form.pages.splice(index, 1);
                form.pageTitles.splice(index, 1);
                
                // Deselect in options
                const option = document.querySelector(`[data-multiselect="${formId}"] [data-option-id="${pageId}"]`);
                if (option) option.classList.remove('selected');
                
                updateMultiselectDisplay(formId);
            });
        });
    }
}

// Render Tabs
function renderTabs() {
    formTabs.innerHTML = forms.map((form, index) => `
        <button 
            class="form-tab ${index === currentFormIndex ? 'active' : ''}" 
            onclick="switchToForm(${index})"
        >
            Form ${form.id}
        </button>
    `).join('');
}

// Switch Form
function switchToForm(index) {
    currentFormIndex = index;
    
    // Update tab active states
    document.querySelectorAll('.form-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // Update form visibility
    document.querySelectorAll('.form-item').forEach((formEl, i) => {
        formEl.style.display = i === index ? 'block' : 'none';
    });
}

// Delete Form
function deleteForm(formId) {
    if (!confirm('Delete this form?')) return;
    
    const index = forms.findIndex(f => f.id === formId);
    forms.splice(index, 1);
    
    const formElement = document.querySelector(`[data-form-id="${formId}"]`);
    formElement.remove();
    
    renderTabs();
    
    if (forms.length > 0) {
        switchToForm(Math.min(currentFormIndex, forms.length - 1));
    }
}

// Clear All Forms
function clearAllForms() {
    if (!confirm('Clear all forms?')) return;
    
    forms = [];
    currentFormIndex = 0;
    formsContainer.innerHTML = '';
    formTabs.innerHTML = '';
    
    createForm();
}

// Transform N8N Response
function transformN8nResponse(data, form) {
    console.log('🔄 Transforming n8n response:', data);
    
    return {
        pageId: (Array.isArray(data.pageID) ? data.pageID[0] : data.pageID) || data.body?.forms?.[0]?.pages?.[0] || '',
        title: (Array.isArray(data.pageTitle) ? data.pageTitle[0] : data.pageTitle) || data.body?.forms?.[0]?.pageTitles?.[0] || 'Untitled',
        text: (Array.isArray(data.content) ? data.content[0] : data.content) || data.output?.[1]?.text || data.body?.forms?.[0]?.postPrompt || '',
        image: (Array.isArray(data.image) ? data.image[0] : data.image) || data.url || '',
        video: (Array.isArray(data.video) ? data.video[0] : data.video) || '',
        platform: data.platform || form.platform || 'facebook',
        published: false,
        loadingMedia: false,
        editData: {
            postPrompt: form.postPrompt,
            mediaType: form.mediaType,
            videoType: form.videoType,
            videoPrompt: form.videoPrompt,
            videoUrl: form.videoUrl,
            imageType: form.imageType,
            imagePrompt: form.imagePrompt
        }
    };
}

// Add Draft
function addDraft(formId, draftData) {
    const form = forms.find(f => f.id === formId);
    
    const draft = {
        id: Date.now() + Math.random(),
        ...draftData,
        collapsed: true,
        editing: false
    };
    
    form.drafts.push(draft);
    renderDrafts(formId);
}

// Render Drafts
function renderDrafts(formId) {
    const form = forms.find(f => f.id === formId);
    const container = document.querySelector(`[data-drafts="${formId}"]`);
    
    if (form.drafts.length === 0) {
        container.innerHTML = '<p class="no-drafts">No drafts yet. Submit the form to generate posts.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="drafts-header">
            <h3 class="drafts-title">Generated Posts (${form.drafts.length})</h3>
            <button class="btn-primary" onclick="publishAllDrafts(${formId})">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14.667 1.333L7.333 8.667M14.667 1.333l-4 12-3.334-5.333-5.333-3.333 12-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Publish All
            </button>
        </div>
        <div class="drafts-grid">
            ${form.drafts.map(draft => `
                <div class="draft-card" data-draft-id="${draft.id}" data-collapsed="${draft.collapsed || false}">
                    <div class="draft-header" onclick="toggleDraftCollapse(${formId}, ${draft.id})" style="cursor: pointer;">
                        <div class="draft-info">
                            <h4 class="draft-title">${escapeHtml(draft.title)}</h4>
                            <span class="draft-platform">${draft.platform}</span>
                        </div>
                        <div class="draft-actions" onclick="event.stopPropagation()">
                            ${!draft.editing ? `
                                <button class="icon-btn" onclick="editDraft(${formId}, ${draft.id})" title="Edit">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.334 2A2.828 2.828 0 0 1 15 5.667L5.5 15.167l-4.167.833.833-4.167L11.334 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <button class="icon-btn" onclick="deleteDraft(${formId}, ${draft.id})" title="Delete">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            ` : `
                                <button class="icon-btn" onclick="cancelEdit(${formId}, ${draft.id})" title="Close Edit">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            `}
                        </div>
                    </div>
                    
                    <div class="draft-content">
                        ${draft.editing ? `
                            <div class="draft-edit-section">
                                <p style="font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #6b7280;">Edit Text</p>
                                <textarea class="draft-text-edit" data-draft-text="${draft.id}">${escapeHtml(draft.text)}</textarea>
                                <button class="btn-secondary" onclick="saveTextEdit(${formId}, ${draft.id})" style="margin-top: 8px;">Save Text</button>
                            </div>
                            <div class="draft-edit-section" style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                                <p style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #6b7280;">Edit Media</p>
                                <div class="radio-group" style="margin-bottom: 8px;">
                                    <label class="radio-item">
                                        <input type="radio" class="radio-input" name="mediaEditType-${draft.id}" value="image" ${draft.mediaEditType === 'image' ? 'checked' : ''} onchange="updateDraftMediaEditType(${formId}, ${draft.id}, 'image')">
                                        <span class="radio-label">Image</span>
                                    </label>
                                    <label class="radio-item">
                                        <input type="radio" class="radio-input" name="mediaEditType-${draft.id}" value="video" ${draft.mediaEditType === 'video' ? 'checked' : ''} onchange="updateDraftMediaEditType(${formId}, ${draft.id}, 'video')">
                                        <span class="radio-label">Video</span>
                                    </label>
                                </div>
                                <div class="radio-group" style="margin-bottom: 10px;">
                                    <label class="radio-item">
                                        <input type="radio" class="radio-input" name="mediaEditInput-${draft.id}" value="prompt" ${draft.mediaEditInputType === 'prompt' ? 'checked' : ''} onchange="updateDraftMediaEditInput(${formId}, ${draft.id}, 'prompt')">
                                        <span class="radio-label">Generate from Prompt</span>
                                    </label>
                                    <label class="radio-item">
                                        <input type="radio" class="radio-input" name="mediaEditInput-${draft.id}" value="upload" ${draft.mediaEditInputType === 'upload' ? 'checked' : ''} onchange="updateDraftMediaEditInput(${formId}, ${draft.id}, 'upload')">
                                        <span class="radio-label">Upload URL</span>
                                    </label>
                                </div>
                                ${draft.mediaEditInputType === 'prompt' ? `
                                    <textarea class="draft-text-edit" data-draft-media-prompt="${draft.id}" placeholder="Describe the ${draft.mediaEditType} you want to generate..." rows="3">${escapeHtml(draft.mediaEditPrompt || '')}</textarea>
                                ` : `
                                    <input type="url" class="text-input" data-draft-media-url="${draft.id}" placeholder="Enter ${draft.mediaEditType} URL..." value="${escapeHtml(draft.mediaEditUrl || '')}">
                                `}
                                <button class="btn-secondary" onclick="generateMediaEdit(${formId}, ${draft.id})" style="margin-top: 8px;">
                                    Generate ${draft.mediaEditType === 'image' ? 'Image' : 'Video'}
                                </button>
                            </div>
                        ` : `
                            <p class="draft-text">${escapeHtml(draft.text).replace(/\n/g, '<br>')}</p>
                        `}
                        
                        ${draft.loadingMedia ? `
                            <div class="draft-media-loading">
                                <div class="spinner-small"></div>
                                <p>${draft.editData.mediaType === 'image' ? 'Image' : 'Video'} loading... please wait...</p>
                                <button class="btn-secondary" disabled style="margin-top: 10px; opacity: 0.5; cursor: not-allowed;">
                                    Load Image (Waiting for n8n...)
                                </button>
                            </div>
                        ` : ''}
                        
                        ${!draft.loadingMedia && !draft.image && draft.editData?.mediaType === 'image' ? `
                            <div class="draft-media-loading">
                                <p>Image ready! Click button to load.</p>
                                <button class="btn-secondary" onclick="loadImageForDraft(${formId}, ${draft.id})" style="margin-top: 10px;">
                                    📥 Load Image
                                </button>
                            </div>
                        ` : ''}
                        
                        ${draft.image && !draft.loadingMedia ? `
                            <div class="draft-media">
                                <img src="${draft.image}" alt="Post image" class="draft-image">
                            </div>
                        ` : ''}
                        
                        ${draft.video && !draft.loadingMedia ? `
                            <div class="draft-media">
                                <video controls class="draft-video">
                                    <source src="${draft.video}">
                                </video>
                            </div>
                        ` : ''}
                        
                        ${!draft.editing ? `
                            <div class="draft-footer">
                                <button class="btn-primary ${draft.published ? 'published' : ''}" onclick="publishDraft(${formId}, ${draft.id})">
                                    ${draft.published ? `
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="color: #22c55e;">
                                            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
                                            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    ` : ''}
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M14.667 1.333L7.333 8.667M14.667 1.333l-4 12-3.334-5.333-5.333-3.333 12-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Publish
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Edit Draft
function editDraft(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    draft.editing = true;
    // Initialize media edit state if not already set
    if (!draft.mediaEditType) draft.mediaEditType = 'image';
    if (!draft.mediaEditInputType) draft.mediaEditInputType = 'prompt';
    if (draft.mediaEditPrompt === undefined) draft.mediaEditPrompt = '';
    if (draft.mediaEditUrl === undefined) draft.mediaEditUrl = '';
    renderDrafts(formId);
}

// Save Text Edit (local only - no n8n call, keeps edit panel open)
function saveTextEdit(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    const textarea = document.querySelector(`[data-draft-text="${draftId}"]`);
    draft.text = textarea.value;
    // Preserve media edit prompt/url from DOM before re-render
    const mediaPromptEl = document.querySelector(`[data-draft-media-prompt="${draftId}"]`);
    const mediaUrlEl = document.querySelector(`[data-draft-media-url="${draftId}"]`);
    if (mediaPromptEl) draft.mediaEditPrompt = mediaPromptEl.value;
    if (mediaUrlEl) draft.mediaEditUrl = mediaUrlEl.value;
    renderDrafts(formId);
}

// Cancel Edit
function cancelEdit(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    draft.editing = false;
    renderDrafts(formId);
}

// Update media edit type selection (image/video) - preserves prompt/url before re-render
function updateDraftMediaEditType(formId, draftId, type) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    const mediaPromptEl = document.querySelector(`[data-draft-media-prompt="${draftId}"]`);
    const mediaUrlEl = document.querySelector(`[data-draft-media-url="${draftId}"]`);
    if (mediaPromptEl) draft.mediaEditPrompt = mediaPromptEl.value;
    if (mediaUrlEl) draft.mediaEditUrl = mediaUrlEl.value;
    draft.mediaEditType = type;
    renderDrafts(formId);
}

// Update media edit input type selection (prompt/upload) - preserves prompt/url before re-render
function updateDraftMediaEditInput(formId, draftId, inputType) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    const mediaPromptEl = document.querySelector(`[data-draft-media-prompt="${draftId}"]`);
    const mediaUrlEl = document.querySelector(`[data-draft-media-url="${draftId}"]`);
    if (mediaPromptEl) draft.mediaEditPrompt = mediaPromptEl.value;
    if (mediaUrlEl) draft.mediaEditUrl = mediaUrlEl.value;
    draft.mediaEditInputType = inputType;
    renderDrafts(formId);
}

// Generate Media Edit - sends prompt to n8n image webhook and updates draft media
async function generateMediaEdit(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);

    // Read current values from DOM before any re-render
    const mediaPromptEl = document.querySelector(`[data-draft-media-prompt="${draftId}"]`);
    const mediaUrlEl = document.querySelector(`[data-draft-media-url="${draftId}"]`);
    if (mediaPromptEl) draft.mediaEditPrompt = mediaPromptEl.value;
    if (mediaUrlEl) draft.mediaEditUrl = mediaUrlEl.value;

    const mediaType = draft.mediaEditType;       // 'image' or 'video'
    const inputType = draft.mediaEditInputType;  // 'prompt' or 'upload'

    // Upload mode - just set the URL directly, no n8n call
    if (inputType === 'upload') {
        const url = (draft.mediaEditUrl || '').trim();
        if (!url) { alert('Please enter a URL'); return; }
        if (mediaType === 'image') {
            draft.image = url;
        } else {
            draft.video = url;
        }
        renderDrafts(formId);
        return;
    }

    // Prompt mode - send to n8n image webhook
    const prompt = (draft.mediaEditPrompt || '').trim();
    if (!prompt) { alert('Please enter a prompt'); return; }

    const spreadsheetRow = spreadsheetData.find(row => row.pageTitle === draft.title) || {};

    const singlePageForm = {
        id: form.id,
        pageMode: 'select',
        pages: [draft.pageId],
        pageTitles: [draft.title],
        platform: draft.platform,
        postPrompt: draft.text,
        mediaType: mediaType,
        imageType: mediaType === 'image' ? 'prompt' : 'prompt',
        videoType: mediaType === 'video' ? 'prompt' : 'prompt',
        imagePrompt: mediaType === 'image' ? prompt : '',
        videoPrompt: mediaType === 'video' ? prompt : '',
        areas: [spreadsheetRow.area || ''],
        metaPageIds: [spreadsheetRow.metaPageId || ''],
        ghlLocationIds: [spreadsheetRow.ghlLocationId || ''],
        ghlApiKeys: [spreadsheetRow.ghlApiKey || '']
    };

    draft.loadingMedia = true;
    renderDrafts(formId);

    try {
        const response = await fetch(CONFIG.N8N_IMAGE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                forms: [singlePageForm],
                userId: CONFIG.GHL_USER_ID,
                locationId: CONFIG.GHL_LOCATION_ID
            })
        });

        if (response.ok) {
            const responseText = await response.text();
            if (responseText && responseText.trim()) {
                const result = JSON.parse(responseText);
                const mediaData = Array.isArray(result) ? result[0] : result;
                if (mediaType === 'image') {
                    draft.image = mediaData.image || mediaData.url || '';
                } else {
                    draft.video = mediaData.video || '';
                }
            }
        } else {
            alert('Failed to generate media. Please try again.');
        }
    } catch (error) {
        console.error('❌ Error generating media:', error);
        alert('Error generating media. Please try again.');
    } finally {
        draft.loadingMedia = false;
        renderDrafts(formId);
    }
}

// Toggle Draft Collapse
function toggleDraftCollapse(formId, draftId) {
    console.log('🔄 toggleDraftCollapse called:', { formId, draftId });
    
    const form = forms.find(f => f.id === formId);
    if (!form) {
        console.error('❌ Form not found:', formId);
        return;
    }
    
    const draft = form.drafts.find(d => d.id === draftId);
    if (!draft) {
        console.error('❌ Draft not found:', draftId);
        return;
    }
    
    console.log('✅ Before toggle - collapsed:', draft.collapsed);
    draft.collapsed = !draft.collapsed;
    console.log('✅ After toggle - collapsed:', draft.collapsed);
    
    renderDrafts(formId);
}

// Load Image For Draft - Manual Loading
function loadImageForDraft(formId, draftId) {
    console.log('📥 Loading image for draft:', { formId, draftId });
    
    const form = forms.find(f => f.id === formId);
    if (!form) {
        console.error('❌ Form not found:', formId);
        return;
    }
    
    const draft = form.drafts.find(d => d.id === draftId);
    if (!draft) {
        console.error('❌ Draft not found:', draftId);
        return;
    }
    
    console.log('📋 Available image URLs:', availableImageUrls);
    console.log('🎯 Looking for draft with pageId:', draft.pageId);
    
    // Find matching image URL from available URLs by pageID
    const matchingImage = availableImageUrls.find(img => {
        const imgPageId = Array.isArray(img.pageID) ? img.pageID[0] : img.pageID;
        console.log('   Comparing pageIDs:', imgPageId, 'vs', draft.pageId);
        return imgPageId === draft.pageId;
    });
    
    if (matchingImage) {
        const imageUrl = matchingImage.url || matchingImage.image || '';
        console.log('✅ Found matching image:', imageUrl);
        
        draft.image = imageUrl;
        draft.loadingMedia = false;
        
        // Remove this image from available list
        availableImageUrls = availableImageUrls.filter(img => img !== matchingImage);
        
        renderDrafts(formId);
        alert('Image loaded successfully!');
    } else {
        console.warn('⚠️ No matching image found for pageId:', draft.pageId);
        alert('No matching image found. Check console for details.');
    }
}

// Delete Draft
function deleteDraft(formId, draftId) {
    if (!confirm('Delete this draft?')) return;
    
    const form = forms.find(f => f.id === formId);
    form.drafts = form.drafts.filter(d => d.id !== draftId);
    renderDrafts(formId);
}

// Publish Draft
async function publishDraft(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    
    if (draft.published) {
        alert('This draft has already been published');
        return;
    }
    
    if (!confirm(`Publish to ${draft.platform}?`)) return;
    
    showLoading(true);
    
    try {
        const spreadsheetRow = spreadsheetData.find(row => 
            row.pageTitle === draft.title
        ) || {};
        
        // Select the correct meta page ID based on the platform
        let resolvedMetaPageId = '';
        if (draft.platform === 'instagram') {
            resolvedMetaPageId = spreadsheetRow.igMetaPageId || '';
        } else if (draft.platform === 'linkedin') {
            resolvedMetaPageId = spreadsheetRow.linkedinMetaPageId || '';
        } else {
            resolvedMetaPageId = spreadsheetRow.metaPageId || '';
        }

        const response = await fetch(CONFIG.N8N_PUBLISH_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pageId: draft.pageId,
                pageTitle: draft.title,
                platform: draft.platform,
                content: draft.text,
                image: draft.image,
                video: draft.video,
                metaPageId: resolvedMetaPageId,
                ghlLocationId: spreadsheetRow.ghlLocationId || '',
                ghlApiKey: spreadsheetRow.ghlApiKey || ''
            })
        });
        
        if (!response.ok) {
            throw new Error('Publishing failed');
        }
        
        draft.published = true;
        renderDrafts(formId);
        alert('Post published successfully!');
        
    } catch (error) {
        console.error('Error publishing draft:', error);
        alert('Error publishing post. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Publish All Drafts
async function publishAllDrafts(formId) {
    const form = forms.find(f => f.id === formId);
    const unpublishedDrafts = form.drafts.filter(d => !d.published);
    
    if (unpublishedDrafts.length === 0) {
        alert('All drafts have already been published');
        return;
    }
    
    if (!confirm(`Publish ${unpublishedDrafts.length} draft(s)?`)) return;
    
    showLoading(true);
    
    try {
        for (const draft of unpublishedDrafts) {
            const spreadsheetRow = spreadsheetData.find(row => 
                row.pageTitle === draft.title
            ) || {};
            
            // Select the correct meta page ID based on the platform
            let resolvedMetaPageId = '';
            if (draft.platform === 'instagram') {
                resolvedMetaPageId = spreadsheetRow.igMetaPageId || '';
            } else if (draft.platform === 'linkedin') {
                resolvedMetaPageId = spreadsheetRow.linkedinMetaPageId || '';
            } else {
                resolvedMetaPageId = spreadsheetRow.metaPageId || '';
            }

            const response = await fetch(CONFIG.N8N_PUBLISH_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pageId: draft.pageId,
                    pageTitle: draft.title,
                    platform: draft.platform,
                    content: draft.text,
                    image: draft.image,
                    video: draft.video,
                    metaPageId: resolvedMetaPageId,
                    ghlLocationId: spreadsheetRow.ghlLocationId || '',
                    ghlApiKey: spreadsheetRow.ghlApiKey || ''
                })
            });
            
            if (response.ok) {
                draft.published = true;
            }
        }
        
        renderDrafts(formId);
        alert('All drafts published successfully!');
        
    } catch (error) {
        console.error('Error publishing drafts:', error);
        alert('Error publishing some posts. Please check the results.');
    } finally {
        showLoading(false);
    }
}

// Regenerate Draft
async function regenerateDraft(formId, draftId) {
    const form = forms.find(f => f.id === formId);
    const draft = form.drafts.find(d => d.id === draftId);
    
    if (!draft) return;
    
    if (!confirm('Regenerate draft with new settings?')) return;
    
    showLoading(true);
    
    try {
        const spreadsheetRow = spreadsheetData.find(row => 
            row.pageTitle === draft.title
        ) || {};
        
        // Create temporary form data for regeneration
        const regenerateFormData = {
            id: form.id,
            pageMode: 'select',
            pages: [draft.pageId],
            pageTitles: [draft.title],
            platform: form.platform,
            postPrompt: draft.editData.postPrompt,
            mediaType: draft.editData.mediaType,
            videoType: draft.editData.videoType,
            videoPrompt: draft.editData.videoPrompt,
            videoUrl: draft.editData.videoUrl,
            imageType: draft.editData.imageType,
            imagePrompt: draft.editData.imagePrompt,
            areas: [spreadsheetRow.area || ''],
            metaPageIds: [spreadsheetRow.metaPageId || ''],
            ghlLocationIds: [spreadsheetRow.ghlLocationId || ''],
            ghlApiKeys: [spreadsheetRow.ghlApiKey || '']
        };
        
        console.log('📤 Regenerating draft:', regenerateFormData);
        
        // Send to text webhook first
        const textResponse = await fetch(CONFIG.N8N_TEXT_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                forms: [regenerateFormData],
                userId: CONFIG.GHL_USER_ID,
                locationId: CONFIG.GHL_LOCATION_ID
            })
        });
        
        if (!textResponse.ok) {
            throw new Error('Text generation failed');
        }
        
        const textResult = await textResponse.json();
        console.log('📥 Received text from n8n:', textResult);
        
        // Update draft with text first
        const transformedResult = transformN8nResponse(textResult, form);
        draft.text = transformedResult.text;
        draft.editing = false;
        
        // If media is enabled, show loading and fetch media
        if (draft.editData.mediaType !== 'none') {
            draft.loadingMedia = true;
            renderDrafts(formId);
            
            const mediaResponse = await fetch(CONFIG.N8N_IMAGE_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    forms: [regenerateFormData],
                    userId: CONFIG.GHL_USER_ID,
                    locationId: CONFIG.GHL_LOCATION_ID
                })
            });
            
            if (mediaResponse.ok) {
                const mediaResult = await mediaResponse.json();
                console.log('📥 Received media from n8n:', mediaResult);
                
                if (draft.editData.mediaType === 'image') {
                    draft.image = mediaResult.image || mediaResult.url || '';
                } else if (draft.editData.mediaType === 'video') {
                    draft.video = mediaResult.video || '';
                }
            }
            
            draft.loadingMedia = false;
        }
        
        renderDrafts(formId);
        alert('Draft regenerated successfully!');
        
    } catch (error) {
        console.error('Error regenerating draft:', error);
        alert('Error regenerating draft. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Submit All Forms - SEQUENTIAL TEXT FIRST, THEN INDIVIDUAL PAGE REQUESTS
async function submitAllForms() {
    // Validate all forms
    const validForms = forms.filter(f => {
        const hasValidPage = f.pageMode === 'all' || f.pages.length > 0;
        return hasValidPage && f.platform && f.postPrompt && f.selectedArea;
    });
    
    if (validForms.length === 0) {
        alert('Please complete at least one form before submitting');
        return;
    }
    
    if (!confirm(`Submit ${validForms.length} form(s)?`)) return;
    
    showLoading(true);
    
    // Clear any previous image URLs
    availableImageUrls = [];
    
    try {
        // Generate unique timestamp for this submission
        const timestamp = Date.now();
        console.log('🕐 Generated timestamp for pageIDs:', timestamp);
        
        // Prepare clean forms with ALL data
        const cleanForms = validForms.map(form => {
            const { drafts, ...formData } = form;
            
            // Add timestamp to all page IDs for unique identification
            const uniquePages = formData.pages.map(pageId => `${pageId}_${timestamp}`);
            
            // Add spreadsheet data arrays matching each page
            const spreadsheetArrays = {
                areas: [],
                metaPageIds: [],
                ghlLocationIds: [],
                ghlApiKeys: []
            };
            
            form.pageTitles.forEach((pageTitle, index) => {
                const spreadsheetRow = spreadsheetData.find(row => 
                    row.pageTitle === pageTitle
                ) || {};
                
                spreadsheetArrays.areas.push(spreadsheetRow.area || '');
                spreadsheetArrays.metaPageIds.push(spreadsheetRow.metaPageId || '');
                spreadsheetArrays.ghlLocationIds.push(spreadsheetRow.ghlLocationId || '');
                spreadsheetArrays.ghlApiKeys.push(spreadsheetRow.ghlApiKey || '');
            });
            
            return {
                ...formData,
                pages: uniquePages, // Use timestamped page IDs
                ...spreadsheetArrays
            };
        });
        
        const payload = {
            forms: cleanForms,
            userId: CONFIG.GHL_USER_ID,
            locationId: CONFIG.GHL_LOCATION_ID
        };
        
        console.log('📤 Step 1: Sending to TEXT webhook first...');
        
        // STEP 1: Send to TEXT webhook and wait for response
        const textResponse = await fetch(CONFIG.N8N_TEXT_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!textResponse.ok) {
            throw new Error('Text generation failed');
        }
        
        const textResult = await textResponse.json();
        console.log('📥 Step 1 Complete: Received text from n8n:', textResult);
        
        // Process text results and add drafts
        if (textResult) {
            let resultsArray = Array.isArray(textResult) ? textResult : [textResult];
            
            console.log(`📦 Processing ${resultsArray.length} text result(s)`);
            
            if (validForms.length > 0) {
                const targetForm = validForms[0];
                
                resultsArray.forEach(draftData => {
                    const transformedResult = transformN8nResponse(draftData, targetForm);
                    
                    // Check if media is needed
                    if (targetForm.mediaType !== 'none') {
                        transformedResult.loadingMedia = true;
                    }
                    
                    addDraft(targetForm.id, transformedResult);
                });
            }
        }
        
        // STEP 2: If media is enabled, send INDIVIDUAL REQUESTS per page
        const formsWithMedia = cleanForms.filter(f => f.mediaType !== 'none');
        
        if (formsWithMedia.length > 0) {
            console.log('📤 Step 2: Media detected, sending individual requests per page...');
            
            // Collect all individual page requests
            const individualRequests = [];
            
            formsWithMedia.forEach(form => {
                // Loop through each page in the form
                form.pages.forEach((pageId, index) => {
                    const pageTitle = form.pageTitles[index];
                    const area = form.areas[index];
                    const metaPageId = form.metaPageIds[index];
                    const ghlLocationId = form.ghlLocationIds[index];
                    const ghlApiKey = form.ghlApiKeys[index];
                    
                    // Create individual form with single page
                    individualRequests.push({
                        ...form,
                        pages: [pageId],
                        pageTitles: [pageTitle],
                        areas: [area],
                        metaPageIds: [metaPageId],
                        ghlLocationIds: [ghlLocationId],
                        ghlApiKeys: [ghlApiKey]
                    });
                });
            });
            
            console.log(`📦 Split into ${individualRequests.length} individual page request(s)`);
            
            let requestNumber = 0;
            
            // Send each page as separate request
            for (const singlePageForm of individualRequests) {
                requestNumber++;
                console.log(`📤 Processing page ${requestNumber}/${individualRequests.length}: ${singlePageForm.pageTitles[0]}`);
                
                try {
                    const imageResponse = await fetch(CONFIG.N8N_IMAGE_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            forms: [singlePageForm],
                            userId: CONFIG.GHL_USER_ID,
                            locationId: CONFIG.GHL_LOCATION_ID
                        })
                    });
                    
                    console.log(`📥 Page ${requestNumber} response status:`, imageResponse.status);
                    
                    if (imageResponse.ok) {
                        const responseText = await imageResponse.text();
                        
                        if (responseText && responseText.trim()) {
                            const imageResult = JSON.parse(responseText);
                            console.log(`📥 Page ${requestNumber} result:`, imageResult);
                            
                            // Store URL for manual loading
                            if (imageResult) {
                                const mediaData = Array.isArray(imageResult) ? imageResult[0] : imageResult;
                                availableImageUrls.push(mediaData);
                                console.log('📥 Stored image URL for manual loading:', mediaData);
                            }
                        }
                    } else {
                        console.warn(`⚠️ Page ${requestNumber} failed with status:`, imageResponse.status);
                    }
                } catch (error) {
                    console.error(`❌ Error processing page ${requestNumber}:`, error);
                    // Continue with next page even if this one fails
                }
                
                // Small delay between requests
                if (requestNumber < individualRequests.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Set all drafts to stop loading (enable Load Image button)
            if (validForms.length > 0) {
                const targetForm = validForms[0];
                targetForm.drafts.forEach(d => {
                    if (d.loadingMedia) {
                        d.loadingMedia = false;
                    }
                });
                renderDrafts(targetForm.id);
            }
            
            console.log('✅ All image requests complete. Buttons now active!');
            console.log('📋 Total available URLs:', availableImageUrls.length);
        }
        
        alert('All forms submitted successfully!');
        
    } catch (error) {
        console.error('❌ Error submitting forms:', error);
        alert('Error submitting forms. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Show/Hide Loading
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Make functions globally accessible for onclick handlers
window.toggleDraftCollapse = toggleDraftCollapse;
window.editDraft = editDraft;
window.saveTextEdit = saveTextEdit;
window.cancelEdit = cancelEdit;
window.updateDraftMediaEditType = updateDraftMediaEditType;
window.updateDraftMediaEditInput = updateDraftMediaEditInput;
window.generateMediaEdit = generateMediaEdit;
window.deleteDraft = deleteDraft;
window.publishDraft = publishDraft;
window.publishAllDrafts = publishAllDrafts;
window.loadImageForDraft = loadImageForDraft;
