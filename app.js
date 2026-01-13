/**
 * Whistlerbox Application Logic
 * 
 * Architecture:
 * - State: Singleton object managing data (Projects, Files, Collections, Timestamps)
 * - Persistence: LocalStorage
 * - Views: Functions to render Dashboard, Player, Sidebars, Collections
 */

// --- State Management ---

const state = {
    projects: [],
    files: [],
    collections: [],
    timestamps: [],

    // UI State
    activeProjectId: null,
    activeFileId: null,
    activeCollectionId: null,

    // Playback State
    playbackRange: null, // { start, end } for constrained playback
    pipFileId: null, // Track file in PiP
    pipEnabled: true, // Default to true
};

// --- Storage Utilities ---

const Storage = {
    save: () => {
        localStorage.setItem('whistler_data', JSON.stringify({
            projects: state.projects,
            files: state.files,
            collections: state.collections,
            timestamps: state.timestamps
        }));
    },
    load: () => {
        const data = localStorage.getItem('whistler_data');
        if (data) {
            const parsed = JSON.parse(data);
            state.projects = parsed.projects || [];
            state.files = parsed.files || [];
            state.collections = parsed.collections || [];
            state.timestamps = parsed.timestamps || [];
        }
    }
};

// --- DOM Elements ---

const elements = {
    app: document.getElementById('app'),
    sidebar: {
        navProjects: document.getElementById('nav-projects'),
        navProjectsIcon: document.getElementById('nav-projects-icon'),
        navProjectsLabel: document.getElementById('nav-projects-label'),
        navStorage: document.getElementById('nav-storage'),
        navCollectionsContainer: document.getElementById('nav-collections-container'),
        collectionList: document.getElementById('collection-list'),
        btnAddCollectionSidebar: document.getElementById('btn-add-collection-sidebar'),
        projectTitle: document.getElementById('sidebar-project-title'),
        toggleBtn: document.getElementById('btn-toggle-sidebar'),
        toggleIcon: document.getElementById('toggle-icon'),
        brandContent: document.querySelector('.brand-content'),
        pipContainer: document.getElementById('sidebar-pip'),
        pipVideoWrapper: document.getElementById('pip-video-wrapper'),
        pipBtnRewind: document.getElementById('pip-btn-rewind'),
        pipBtnPlayPause: document.getElementById('pip-btn-play-pause'),
        pipBtnForward: document.getElementById('pip-btn-forward'),
        pipBtnExpand: document.getElementById('pip-btn-expand'),
        pipBtnClose: document.getElementById('pip-btn-close')
    },
    main: {
        // title: document.getElementById('page-title'), // Removed for breadcrumbs
        projectsView: document.getElementById('projects-view'),
        projectGrid: document.getElementById('project-grid'),

        storageView: document.getElementById('storage-view'),
        storageGrid: document.getElementById('storage-grid'),

        collectionView: document.getElementById('collection-view'),
        collectionHeaderTitle: document.getElementById('collection-header-title'),
        collectionGrid: document.getElementById('collection-grid'),

        playerView: document.getElementById('player-view'),
        video: document.getElementById('main-player'),
        videoContainer: document.getElementById('video-wrapper'),
        playPauseBtn: document.getElementById('btn-play-pause'),
        timeDisplay: document.getElementById('time-display'),
        seekBarContainer: document.getElementById('seek-container'),
        seekBarProgress: document.getElementById('seek-progress'),
        markerLayer: document.getElementById('marker-layer'),
        btnAddTimestamp: document.getElementById('btn-manage-timestamps'),
        activeTimestampsList: document.getElementById('active-timestamps'),
        videoLoader: document.getElementById('video-loader'),
        btnTogglePiP: document.getElementById('btn-toggle-pip'),
        playerHeader: document.getElementById('player-header'),
        playerTitle: document.getElementById('player-title'),
        btnEditFile: document.getElementById('btn-edit-file'),
        btnDeleteFile: document.getElementById('btn-delete-file')
    },
    modals: {
        overlayProject: document.getElementById('modal-project'),
        inputProjectName: document.getElementById('input-project-name'),
        btnSubmitProject: document.getElementById('submit-project'),

        overlayFile: document.getElementById('modal-file'),
        inputFileName: document.getElementById('input-file-name'),
        inputFileUrl: document.getElementById('input-file-url'),
        btnSubmitFile: document.getElementById('submit-file'),

        overlayCollection: document.getElementById('modal-collection'),
        inputCollectionName: document.getElementById('input-collection-name'),
        inputCollectionColor: document.getElementById('input-collection-color'),
        btnSubmitCollection: document.getElementById('submit-collection'),

        // Editor
        overlayTimestamp: document.getElementById('modal-timestamp'),
        inputTimestampCollection: document.getElementById('input-timestamp-collection'),
        inputTimestampNote: document.getElementById('input-timestamp-note'),
        inputTimestampStart: document.getElementById('input-timestamp-start'),
        inputTimestampEnd: document.getElementById('input-timestamp-end'),
        btnSetStart: document.getElementById('btn-set-start'),
        btnSetEnd: document.getElementById('btn-set-end'),
        btnSubmitTimestamp: document.getElementById('submit-timestamp'),

        // New Modals
        overlayPrompt: document.getElementById('modal-prompt'),
        promptTitle: document.getElementById('prompt-title'),
        promptLabel: document.getElementById('prompt-label'),
        inputPromptValue: document.getElementById('input-prompt-value'),
        btnPromptConfirm: document.getElementById('btn-prompt-confirm'),

        overlayConfirm: document.getElementById('modal-confirm'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        btnConfirmYes: document.getElementById('btn-confirm-yes'),

        // Popup Player
        overlayPlayer: document.getElementById('modal-player-popup'),
        popupVideo: document.getElementById('popup-video'),
        popupTitle: document.getElementById('popup-title'),
        popupNote: document.getElementById('popup-note'),
        btnDelete: document.getElementById('btn-delete-timestamp'),
        btnSavePopup: document.getElementById('btn-save-popup'),

        // Custom Popup Controls
        popupPlayBtn: document.getElementById('popup-play-btn'),
        popupSeekBar: document.getElementById('popup-seek-bar'),
        popupProgress: document.getElementById('popup-progress'),
        popupTimeVal: document.getElementById('popup-time-val')
    }
};

// --- Breadcrumbs (Removed) ---


// --- Logic ---

// --- Logic ---

// --- Logic ---

function goToProjects() {
    // Check if we need to enable PiP (before clearing state)
    // Only if pipEnabled is true
    if (state.activeFileId) {
        if (state.pipEnabled && !elements.main.video.paused) {
            state.pipFileId = state.activeFileId;
            enablePiP();
        } else {
            elements.main.video.pause();
            disablePiP(false); // Ensure it's back and hidden
            state.pipFileId = null;
        }
    }

    state.activeProjectId = null;
    state.activeFileId = null;
    state.activeCollectionId = null;
    state.playbackRange = null;

    exitFocusMode();

    hideAllViews();
    elements.main.projectsView.classList.remove('hidden');

    // Sidebar State: Global
    elements.sidebar.navStorage.classList.add('hidden');
    elements.sidebar.navCollectionsContainer.classList.add('hidden');
    elements.sidebar.projectTitle.classList.add('hidden');

    // Reset Projects Button
    elements.sidebar.navProjectsIcon.className = 'ph-bold ph-squares-four';
    elements.sidebar.navProjectsLabel.textContent = 'Projects';
    elements.sidebar.navProjects.onclick = null; // Remove back behavior if any, will be reset in init/active check? 
    // Actually, init sets onclick to goToProjects. We can check logic inside the handler? 
    // OR: we change the handler dynamically. Let's change accordingly.
    elements.sidebar.navProjects.onclick = goToProjects;

    setActiveNav('nav-projects');
    renderProjects();
    // updateBreadcrumbs([{ label: 'Projects' }]);
}

function goToStorage() {
    // Check PiP first
    if (state.activeFileId) {
        if (state.pipEnabled && !elements.main.video.paused) {
            state.pipFileId = state.activeFileId;
            enablePiP();
        } else {
            elements.main.video.pause();
            disablePiP(false);
            state.pipFileId = null;
        }
    }

    state.activeProjectId = null; // View all
    state.activeFileId = null;
    state.activeCollectionId = null;
    state.playbackRange = null;

    exitFocusMode();

    hideAllViews();
    elements.main.storageView.classList.remove('hidden');

    setActiveNav('nav-storage');
    renderStorage();
    // updateBreadcrumbs([{ label: 'Storage' }]);
}

function hideAllViews() {
    elements.main.projectsView.classList.add('hidden');
    elements.main.storageView.classList.add('hidden');
    elements.main.collectionView.classList.add('hidden');
    elements.main.playerView.classList.add('hidden');
}

function setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function init() {
    Storage.load();

    // Navigation Listeners
    elements.sidebar.navProjects.onclick = goToProjects;
    elements.sidebar.navStorage.onclick = goToStorage;

    const btnAddCollection = document.getElementById('btn-add-collection-sidebar');
    if (btnAddCollection) {
        btnAddCollection.onclick = (e) => {
            e.stopPropagation();
            console.log("Add Collection Clicked");
            openModal(elements.modals.overlayCollection);
        };
    } else {
        console.error("Add Collection Button not found in init");
    }

    // Brand click
    if (elements.sidebar.brandContent) {
        elements.sidebar.brandContent.onclick = goToProjects;
    }

    // Sidebar Toggle
    if (elements.sidebar.toggleBtn) {
        elements.sidebar.toggleBtn.onclick = () => {
            const sidebar = document.querySelector('.sidebar');
            const isCollapsed = sidebar.classList.toggle('collapsed');

            // Update Icon
            if (elements.sidebar.toggleIcon) {
                elements.sidebar.toggleIcon.className = isCollapsed ? 'ph-bold ph-caret-right' : 'ph-bold ph-caret-left';
            }
        };
    }

    // Initial Load
    console.log("App Initialized");
    goToProjects();
}

// Modals
// elements.sidebar.btnAddProject.onclick = ... // Removed
// We need buttons inside the views now to add things if sidebar buttons are gone
// For now, let's assuming the "New Project" card handles project creation.
// But we need a way to add files/collections if inside a project view.

// Submissions
elements.modals.btnSubmitProject.onclick = createProject;
elements.modals.btnSubmitFile.onclick = createFile;
elements.modals.btnSubmitCollection.onclick = createCollection;
elements.modals.btnSubmitTimestamp.onclick = saveTimestampFromEditor;

// Timestamp Editor Actions
elements.modals.btnSetStart.onclick = () => {
    elements.modals.inputTimestampStart.value = fmtTime(elements.main.video.currentTime);
};
elements.modals.btnSetEnd.onclick = () => {
    elements.modals.inputTimestampEnd.value = fmtTime(elements.main.video.currentTime);
};

// Player
elements.main.video.removeAttribute('controls'); // Force remove native
elements.main.playPauseBtn.onclick = togglePlay;
elements.main.video.onclick = togglePlay; // Click to toggle
elements.main.video.addEventListener('timeupdate', updateProgress);
elements.main.video.addEventListener('loadedmetadata', () => {
    updateProgress();
    renderProgressBarMarkers();
});
elements.main.seekBarContainer.onclick = seek;

// Popup Player
elements.modals.popupVideo.removeAttribute('controls'); // Force remove native
elements.modals.popupVideo.onclick = togglePopupPlay; // Click to toggle
elements.modals.popupVideo.addEventListener('timeupdate', handlePopupProgress);
elements.modals.btnSavePopup.onclick = updateTimestampFromPopup;
elements.modals.btnDelete.onclick = deleteTimestampFromPopup;
elements.modals.popupPlayBtn.onclick = togglePopupPlay;
elements.modals.popupSeekBar.onclick = seekPopup;

elements.main.btnAddTimestamp.onclick = openTimestampEditor;

// Playback Speed Control
const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let currentSpeedIndex = 2; // Start at 1x

const btnPlaybackSpeed = document.getElementById('btn-playback-speed');
if (btnPlaybackSpeed) {
    btnPlaybackSpeed.onclick = () => {
        currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
        const speed = playbackSpeeds[currentSpeedIndex];
        elements.main.video.playbackRate = speed;
        btnPlaybackSpeed.innerHTML = `<i class="ph-bold ph-gauge"></i> ${speed}x`;
    };
}

// Toggle Notes Sidebar
const timestampSidebar = document.getElementById('timestamp-sidebar');
const btnToggleNotes = document.getElementById('btn-toggle-notes');
const btnCloseNotes = document.getElementById('btn-close-notes');

function toggleNotesSidebar() {
    if (timestampSidebar) {
        timestampSidebar.classList.toggle('hidden');
    }
}

if (btnToggleNotes) {
    btnToggleNotes.onclick = toggleNotesSidebar;
}

if (btnCloseNotes) {
    btnCloseNotes.onclick = toggleNotesSidebar;
}

function enterFocusMode() {
    document.body.classList.add('mode-focus');
}

function exitFocusMode() {
    document.body.classList.remove('mode-focus');
}

// --- Sidebar Toggle Logic ---
// --- Sidebar Toggle Logic (Removed) ---

// --- CRUD Operations ---

function createProject() {
    const name = elements.modals.inputProjectName.value;
    if (!name) return;

    const project = {
        id: crypto.randomUUID(),
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.projects.push(project);
    Storage.save();
    closeModals();
    // renderSidebarProjects(); // Not needed - sidebar is static
    // renderDashboard(); // Use goToProjects instead
    goToProjects();
    elements.modals.inputProjectName.value = '';
}

function createFile() {
    const name = elements.modals.inputFileName.value;
    const url = elements.modals.inputFileUrl.value;

    if (!name || !url) return;

    const file = {
        id: crypto.randomUUID(),
        projectId: state.activeProjectId,
        name: name,
        url: url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.files.push(file);
    Storage.save();
    closeModals();
    // renderSidebarFiles(); // Removed - sidebar is static
    selectProject(state.activeProjectId);
    elements.modals.inputFileName.value = '';
    elements.modals.inputFileUrl.value = '';
}

function createCollection() {
    const name = elements.modals.inputCollectionName.value;
    const color = elements.modals.inputCollectionColor.value;

    if (!name) return;

    const collection = {
        id: crypto.randomUUID(),
        projectId: state.activeProjectId,
        name: name,
        color: color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.collections.push(collection);
    Storage.save();
    closeModals();
    renderSidebarCollections();
    elements.modals.inputCollectionName.value = '';
}

function closeModals() {
    if (elements.modals.overlayProject) elements.modals.overlayProject.classList.remove('open');
    if (elements.modals.overlayFile) elements.modals.overlayFile.classList.remove('open');
    if (elements.modals.overlayCollection) elements.modals.overlayCollection.classList.remove('open');
    if (elements.modals.overlayPlayer) elements.modals.overlayPlayer.classList.remove('open');
    if (elements.modals.overlayTimestamp) elements.modals.overlayTimestamp.classList.remove('open');
    if (elements.modals.overlayPrompt) elements.modals.overlayPrompt.classList.remove('open');
    if (elements.modals.overlayConfirm) elements.modals.overlayConfirm.classList.remove('open');

    // Clear inputs
    if (elements.modals.inputProjectName) elements.modals.inputProjectName.value = '';
    if (elements.modals.inputFileName) elements.modals.inputFileName.value = '';
    if (elements.modals.inputFileUrl) elements.modals.inputFileUrl.value = '';
    if (elements.modals.inputCollectionName) elements.modals.inputCollectionName.value = '';
    if (elements.modals.inputPromptValue) elements.modals.inputPromptValue.value = '';
}

// Helper for Custom Prompt
function showPrompt(title, defaultValue, callback) {
    elements.modals.promptTitle.textContent = title;
    elements.modals.inputPromptValue.value = defaultValue || '';
    elements.modals.overlayPrompt.classList.add('open');
    elements.modals.inputPromptValue.focus();

    // Remove old listener
    const newBtn = elements.modals.btnPromptConfirm.cloneNode(true);
    elements.modals.btnPromptConfirm.parentNode.replaceChild(newBtn, elements.modals.btnPromptConfirm);
    elements.modals.btnPromptConfirm = newBtn;

    newBtn.onclick = () => {
        const value = elements.modals.inputPromptValue.value;
        if (value && value.trim() !== "") {
            callback(value.trim());
            closeModals();
        }
    };
}

// Helper for Custom Confirm
function showConfirm(title, message, callback) {
    elements.modals.confirmTitle.textContent = title;
    elements.modals.confirmMessage.textContent = message;
    elements.modals.overlayConfirm.classList.add('open');

    // Remove old listener
    const newBtn = elements.modals.btnConfirmYes.cloneNode(true);
    elements.modals.btnConfirmYes.parentNode.replaceChild(newBtn, elements.modals.btnConfirmYes);
    elements.modals.btnConfirmYes = newBtn;

    newBtn.onclick = () => {
        callback();
        closeModals();
    };
}

function editFile(fileId) {
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;

    showPrompt("Rename File", file.name, (newName) => {
        file.name = newName;
        Storage.save();
        if (elements.main.playerTitle) elements.main.playerTitle.textContent = file.name;
    });
}

function deleteFile(fileId) {
    showConfirm("Delete File", "Are you sure you want to delete this file? This action cannot be undone.", () => {
        // Remove file
        state.files = state.files.filter(f => f.id !== fileId);
        // Remove associated timestamps
        state.timestamps = state.timestamps.filter(t => t.fileId !== fileId);

        Storage.save();

        // Reset player if active
        if (state.activeFileId === fileId) {
            state.activeFileId = null;
            elements.main.video.src = "";

            // Go back to project
            if (state.activeProjectId) {
                selectProject(state.activeProjectId);
            } else {
                goToProjects();
            }
        }
    });
}

function openTimestampEditor() {
    // Populate collections dropdown
    const select = elements.modals.inputTimestampCollection;
    select.innerHTML = '';
    const projectCollections = state.collections.filter(c => c.projectId === state.activeProjectId);

    if (projectCollections.length === 0) {
        alert("Create a collection first!");
        return;
    }

    projectCollections.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        select.appendChild(option);
    });

    // Default values
    const currentTime = elements.main.video.currentTime;
    elements.modals.inputTimestampStart.value = fmtTime(currentTime);
    elements.modals.inputTimestampEnd.value = fmtTime(currentTime + 5);
    elements.modals.inputTimestampNote.value = '';

    openModal(elements.modals.overlayTimestamp);
}

function saveTimestampFromEditor() {
    const collectionId = elements.modals.inputTimestampCollection.value;
    const note = elements.modals.inputTimestampNote.value;
    const startStr = elements.modals.inputTimestampStart.value;
    const endStr = elements.modals.inputTimestampEnd.value;

    const start = parseTime(startStr);
    const end = parseTime(endStr);

    if (!collectionId || start === null || end === null) {
        alert("Invalid Time Format. Use MM:SS");
        return;
    }

    if (!state.activeFileId) {
        alert("No active file selected. Cannot save timestamp.");
        return;
    }

    const timestamp = {
        id: crypto.randomUUID(),
        file_id: state.activeFileId,
        collection_id: collectionId,
        start_time: start,
        end_time: end,
        note: note,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.timestamps.push(timestamp);
    Storage.save();
    closeModals();
    renderPlayerTimestamps();
    renderProgressBarMarkers();
}

// --- Popup Player Logic ---

let currentPopupTimestampId = null;

function openPlayerModal(timestampId) {
    const timestamp = state.timestamps.find(t => t.id === timestampId);
    if (!timestamp) return;

    const file = state.files.find(f => f.id === timestamp.fileId);
    if (!file) {
        console.error("File not found for timestamp:", timestamp);
        alert("Error: Associated file not found.");
        return;
    }

    const collection = state.collections.find(c => c.id === timestamp.collectionId);

    currentPopupTimestampId = timestampId;
    state.playbackRange = { start: timestamp.startTime, end: timestamp.endTime };

    elements.modals.popupTitle.textContent = collection ? collection.name : 'Unknown Collection';
    elements.modals.popupVideo.src = file.url;
    elements.modals.popupVideo.currentTime = timestamp.startTime;
    elements.modals.popupNote.value = timestamp.note;

    openModal(elements.modals.overlayPlayer);

    elements.modals.popupVideo.play();
    elements.modals.popupPlayBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
}

function togglePopupPlay() {
    const video = elements.modals.popupVideo;
    if (video.paused) {
        video.play();
        elements.modals.popupPlayBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
    } else {
        video.pause();
        elements.modals.popupPlayBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
    }
}

function handlePopupProgress() {
    if (!state.playbackRange) return;

    const video = elements.modals.popupVideo;
    const { start, end } = state.playbackRange;
    const rangeDuration = end - start;

    // Check constraints
    if (video.currentTime > end) {
        video.pause();
        video.currentTime = start;
        elements.modals.popupPlayBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
    } else if (video.currentTime < start - 0.5) {
        video.currentTime = start;
    }

    // Calculate relative progress (0 to 100% of the CLIP range)
    const currentRelative = Math.max(0, video.currentTime - start);
    const percent = Math.min(100, (currentRelative / rangeDuration) * 100);

    elements.modals.popupProgress.style.width = `${percent}%`;
    elements.modals.popupTimeVal.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(end)}`;
}

function seekPopup(e) {
    if (!state.playbackRange) return;

    const bar = elements.modals.popupSeekBar;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = x / width;

    const { start, end } = state.playbackRange;
    const rangeDuration = end - start;

    const targetTime = start + (percent * rangeDuration);
    elements.modals.popupVideo.currentTime = targetTime;
}

function updateTimestampFromPopup() {
    if (!currentPopupTimestampId) return;

    const timestamp = state.timestamps.find(t => t.id === currentPopupTimestampId);
    if (timestamp) {
        timestamp.note = elements.modals.popupNote.value;
        Storage.save();

        // Refresh views if open
        if (state.activeCollectionId) renderCollectionView();
        alert("Note updated!");
    }
}

function deleteTimestampFromPopup() {
    if (!currentPopupTimestampId) return;

    if (confirm("Are you sure you want to delete this moment?")) {
        state.timestamps = state.timestamps.filter(t => t.id !== currentPopupTimestampId);
        Storage.save();
        closeModals();

        // Refresh views
        if (state.activeCollectionId) renderCollectionView();
        if (state.activeFileId) {
            renderPlayerTimestamps();
            renderProgressBarMarkers();
        }
    }
}

// --- Rendering ---

function renderSidebarProjects() {
    const list = elements.sidebar.projectList;
    list.innerHTML = '';

    state.projects.forEach(p => {
        const li = document.createElement('li');
        li.className = `nav-item ${state.activeProjectId === p.id ? 'active' : ''}`;
        li.innerHTML = `<i class="ph-bold ph-folder"></i> ${p.name}`;
        li.onclick = () => selectProject(p.id);
        list.appendChild(li);
    });
}

function renderSidebarFiles() {
    const list = elements.sidebar.fileList;
    list.innerHTML = '';

    const projectFiles = state.files.filter(f => f.projectId === state.activeProjectId);

    projectFiles.forEach(f => {
        const li = document.createElement('li');
        li.className = `nav-item ${state.activeFileId === f.id ? 'active' : ''}`;
        li.innerHTML = `<i class="ph-bold ph-film-strip"></i> ${f.name}`;
        li.onclick = () => selectFile(f.id);
        list.appendChild(li);
    });

    if (projectFiles.length === 0) {
        list.innerHTML = '<li style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;">No files yet.</li>';
    }
}

function renderSidebarCollections() {
    // Re-fetch list to ensure freshness
    const list = document.getElementById('collection-list');
    if (!list) {
        console.error("Collection list element not found");
        return;
    }
    list.innerHTML = '';

    const projectCollections = state.collections.filter(c => c.projectId === state.activeProjectId);
    console.log("Rendering Collections:", projectCollections.length, "for project:", state.activeProjectId);

    projectCollections.forEach(c => {
        const li = document.createElement('li');
        li.className = `nav-item ${state.activeCollectionId === c.id ? 'active' : ''}`;
        li.innerHTML = `
            <span class="collection-dot" style="width: 10px; height: 10px; border-radius: 50%; background-color: ${c.color}; display: inline-block; flex-shrink: 0;"></span>
            <span>${c.name}</span>
        `;
        li.onclick = (e) => {
            e.stopPropagation();
            selectCollection(c.id);
        };
        list.appendChild(li);
    });
}
// Side note: Need to ensure new Add Collection button logic is hooked up in init.


// --- Rendering ---

function renderProjects() {
    const grid = elements.main.projectGrid;
    grid.innerHTML = '';

    state.projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <i class="ph-duotone ph-folder-open" style="font-size: 2rem; color: var(--accent-primary);"></i>
            <span class="card-title">${p.name}</span>
            <span class="card-subtitle">Project</span>
        `;
        card.onclick = () => selectProject(p.id); // Open project
        grid.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'card';
    addCard.style.borderStyle = 'dashed';
    addCard.innerHTML = `
        <i class="ph-bold ph-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
        <span class="card-title" style="color: var(--text-muted);">New Project</span>
    `;
    addCard.onclick = () => openModal(elements.modals.overlayProject);
    grid.appendChild(addCard);
}

function renderStorage() {
    const grid = elements.main.storageGrid;
    grid.innerHTML = '';

    // Filter by active project if set (reusing this view for project details)
    const filesToRender = state.activeProjectId
        ? state.files.filter(f => f.projectId === state.activeProjectId)
        : state.files;

    if (filesToRender.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No files found.</div>';
    }

    filesToRender.forEach(f => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <i class="ph-duotone ph-film-strip" style="font-size: 2rem; color: var(--text-primary);"></i>
            <span class="card-title">${f.name}</span>
            <span class="card-subtitle">Video</span>
        `;
        card.onclick = () => selectFile(f.id);
        grid.appendChild(card);
    });

    // Add "Add File" card
    const addCard = document.createElement('div');
    addCard.className = 'card';
    addCard.style.borderStyle = 'dashed';
    addCard.innerHTML = `
        <i class="ph-bold ph-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
        <span class="card-title" style="color: var(--text-muted);">Add File</span>
    `;
    addCard.onclick = () => openModal(elements.modals.overlayFile);
    grid.appendChild(addCard);
}

// Reuse collection view logic, just ensure header/title is managed
function renderCollectionView() {
    hideAllViews();
    elements.main.collectionView.classList.remove('hidden');

    const collection = state.collections.find(c => c.id === state.activeCollectionId);
    if (!collection) return;

    // elements.main.title.textContent = collection.name; // Handled by selectCollection logic now
    elements.main.collectionHeaderTitle.textContent = collection.name + " Moments";

    const grid = elements.main.collectionGrid;
    grid.innerHTML = '';

    const projectFiles = state.files.filter(f => f.projectId === state.activeProjectId);
    const fileIds = projectFiles.map(f => f.id);

    const relevantTimestamps = state.timestamps.filter(t =>
        t.collectionId === collection.id && fileIds.includes(t.fileId)
    );

    relevantTimestamps.forEach(t => {
        const file = projectFiles.find(f => f.id === t.fileId);

        const card = document.createElement('div');
        card.className = 'timestamp-card';
        card.style.borderTopColor = collection.color;
        card.innerHTML = `
            <div style="font-weight: 500;">${t.note || 'Untitled Note'}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);"><i class="ph-fill ph-film-strip"></i> ${file.name}</div>
            <div class="card-meta">${fmtTime(t.startTime)} - ${fmtTime(t.endTime)}</div>
        `;
        card.onclick = () => openPlayerModal(t.id);
        grid.appendChild(card);
    });

    if (relevantTimestamps.length === 0) {
        grid.innerHTML = '<div style="color: var(--text-muted);">No timestamps in this collection yet.</div>';
    }
}


// --- Actions ---

function selectProject(id) {
    state.activeProjectId = id;
    state.activeFileId = null;
    state.activeCollectionId = null;

    const project = state.projects.find(p => p.id === id);
    if (!project) return;

    // We reuse storage-view to show project files
    hideAllViews();
    elements.main.storageView.classList.remove('hidden');

    // Sidebar State: Contextual
    elements.sidebar.navStorage.classList.remove('hidden');
    elements.sidebar.navCollectionsContainer.classList.remove('hidden');

    // Show Project Title in Sidebar
    elements.sidebar.projectTitle.textContent = project.name;
    elements.sidebar.projectTitle.classList.remove('hidden');

    // Update Projects Button to Back
    elements.sidebar.navProjectsIcon.className = 'ph-bold ph-arrow-left';
    elements.sidebar.navProjectsLabel.textContent = 'Back to Projects';
    elements.sidebar.navProjects.onclick = goToProjects;

    // Auto-select Storage
    setActiveNav('nav-storage');

    // Make Storage button navigate to project storage (not global)
    elements.sidebar.navStorage.onclick = () => {
        state.activeFileId = null;
        state.activeCollectionId = null;
        hideAllViews();
        elements.main.storageView.classList.remove('hidden');
        setActiveNav('nav-storage');
        renderStorage();
        // updateBreadcrumbs([{ label: 'Storage' }]);
    };

    renderSidebarCollections(); // Render collections for this project

    // Update breadcrumbs - just show "Storage"
    // updateBreadcrumbs([{ label: 'Storage' }]);

    // Use renderStorage but it will filter by activeProjectId
    renderStorage();

    // Also, we might want to show Collections here too?
    // To keep it simple per request "just go to the pages", let's stick to files for now or maybe add collections to the grid?
    // User asked for "Storage" tab, which implies files.
    // "Projects" tab -> Project List.
    // Project -> File List.
}

function selectFile(fileId) {
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;

    const project = state.projects.find(p => p.id === file.projectId);
    if (!project) return;

    state.activeFileId = fileId;
    state.activeCollectionId = null;
    state.playbackRange = null;

    // Switch to Player View
    hideAllViews();
    elements.main.playerView.classList.remove('hidden');
    // Ensure header is visible
    if (elements.main.playerHeader) elements.main.playerHeader.classList.remove('hidden');

    // Update Header
    if (elements.main.playerTitle) elements.main.playerTitle.textContent = file.name;

    // Attach Action Listeners - Re-fetch elements to ensure freshness and add stopPropagation
    const btnEdit = document.getElementById('btn-edit-file');
    const btnDelete = document.getElementById('btn-delete-file');

    // Remove old listeners to prevent duplicates (cloning)
    if (btnEdit) {
        const newBtnEdit = btnEdit.cloneNode(true);
        btnEdit.parentNode.replaceChild(newBtnEdit, btnEdit);
        newBtnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Edit button clicked for file:', fileId);
            editFile(fileId);
        });
    }
    if (btnDelete) {
        const newBtnDelete = btnDelete.cloneNode(true);
        btnDelete.parentNode.replaceChild(newBtnDelete, btnDelete);
        newBtnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Delete button clicked for file:', fileId);
            deleteFile(fileId);
        });
    }

    elements.main.video.src = file.url;
    elements.main.video.play();
    elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';

    disablePiP(true); // Ensure video is in main view

    // Initial Render
    renderPlayerTimestamps();
    renderProgressBarMarkers();

    // Breadcrumbs
    // updateBreadcrumbs([
    //     { label: project.name, onclick: () => selectProject(project.id) },
    //     { label: file.name, active: true }
    // ]);
}

function selectCollection(collectionId) {
    const collection = state.collections.find(c => c.id === collectionId);
    if (!collection) return;

    // Check PiP first
    if (state.activeFileId) {
        if (state.pipEnabled && !elements.main.video.paused) {
            state.pipFileId = state.activeFileId;
            enablePiP();
        } else {
            elements.main.video.pause();
            disablePiP(false);
            state.pipFileId = null;
        }
    }

    state.activeCollectionId = collectionId;
    state.activeFileId = null;
    state.playbackRange = null;

    // Switch to Collection View
    hideAllViews();
    renderCollectionView();

    // Update Sidebar Active States
    document.getElementById('nav-storage').classList.remove('active');
    renderSidebarCollections(); // Re-render to update active class

    // Simple breadcrumb - just show the collection name
    // updateBreadcrumbs([{ label: collection.name }]); -> Removed
}


// --- Player Logic ---

function togglePlay() {
    if (elements.main.video.paused) {
        elements.main.video.play();
        elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
    } else {
        elements.main.video.pause();
        elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
    }
}

function updateProgress() {
    const video = elements.main.video;
    const progress = elements.main.seekBarProgress;
    const timeDisplay = elements.main.timeDisplay;
    const thumb = document.querySelector('.seek-thumb');

    // Video Loading / Buffering States
    const videoElement = elements.main.video;
    const loader = elements.main.videoLoader;

    videoElement.addEventListener('waiting', () => {
        loader.classList.remove('hidden');
    });

    videoElement.addEventListener('play', () => {
        // Only hide if we aren't waiting for more data
        if (videoElement.readyState >= 3) {
            loader.classList.add('hidden');
        }
    });

    videoElement.addEventListener('canplay', () => {
        loader.classList.add('hidden');
    });

    videoElement.addEventListener('loadstart', () => {
        loader.classList.remove('hidden');
    });

    let percent = 0;
    if (video.duration > 0) {
        percent = (video.currentTime / video.duration) * 100;
    }

    progress.style.width = `${percent}%`;
    if (thumb) {
        thumb.style.left = `${percent}%`;
    }

    timeDisplay.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
}

function seek(e) {
    const video = elements.main.video;
    const bar = elements.main.seekBarContainer;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = Math.max(0, Math.min(1, x / width)); // Clamp between 0 and 1

    if (video.duration) {
        video.currentTime = percent * video.duration;
        updateProgress(); // Immediately update the visual
    }
}

// Smooth dragging support
let isDraggingSeekbar = false;

elements.main.seekBarContainer.addEventListener('mousedown', (e) => {
    isDraggingSeekbar = true;
    seek(e); // Seek immediately on click
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingSeekbar) {
        seek(e);
    }
});

document.addEventListener('mouseup', () => {
    isDraggingSeekbar = false;
});

function renderProgressBarMarkers() {
    const container = elements.main.markerLayer;
    container.innerHTML = '';

    const fileTimestamps = state.timestamps.filter(t => t.fileId === state.activeFileId);
    const videoDuration = elements.main.video.duration;

    if (!videoDuration) return;

    fileTimestamps.forEach(t => {
        const collection = state.collections.find(c => c.id === t.collectionId);
        if (!collection) return;

        const startPercent = (t.startTime / videoDuration) * 100;
        const endPercent = (t.endTime / videoDuration) * 100;
        const width = endPercent - startPercent;

        const marker = document.createElement('div');
        marker.className = 'marker-range';
        marker.style.left = `${startPercent}%`;
        marker.style.width = `${Math.max(width, 0.5)}%`;
        marker.style.backgroundColor = collection.color;
        marker.title = `${collection.name}: ${t.note} (${fmtTime(t.startTime)} - ${fmtTime(t.endTime)})`;

        marker.onclick = (e) => {
            e.stopPropagation();
            openPlayerModal(t.id);
        };

        container.appendChild(marker);
    });
}

function renderPlayerTimestamps() {
    const list = elements.main.activeTimestampsList;
    list.innerHTML = '';

    const fileTimestamps = state.timestamps.filter(t => t.fileId === state.activeFileId);
    fileTimestamps.sort((a, b) => a.startTime - b.startTime);

    fileTimestamps.forEach(t => {
        const collection = state.collections.find(c => c.id === t.collectionId);
        if (!collection) return;

        const div = document.createElement('div');
        div.className = 'timestamp-item';
        div.style.borderLeftColor = collection.color;
        div.dataset.note = t.note || ''; // Store note in data attribute
        div.onclick = () => openPlayerModal(t.id);

        div.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 500; font-size: 0.9rem;">${collection.name}</div>
            </div>
            <span class="time-badge">${fmtTime(t.startTime)} - ${fmtTime(t.endTime)}</span>
        `;
        list.appendChild(div);
    });

    if (fileTimestamps.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding-top: 20px;">No timestamps for this file.</div>';
    }
}

// Custom Tooltip System
const customTooltip = document.createElement('div');
customTooltip.id = 'custom-tooltip';
customTooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.85rem;
    color: #fff;
    max-width: 250px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    opacity: 0;
    transform: translate(-100%, -50%);
    transition: opacity 0.15s;
    white-space: pre-wrap;
    word-wrap: break-word;
`;
document.body.appendChild(customTooltip);

document.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.timestamp-item');
    if (item && item.dataset.note) {
        customTooltip.textContent = item.dataset.note;

        const rect = item.getBoundingClientRect();
        customTooltip.style.top = (rect.top + rect.height / 2) + 'px';
        customTooltip.style.left = (rect.left - 15) + 'px';

        customTooltip.style.opacity = '1';
    }
});

document.addEventListener('mouseout', (e) => {
    const item = e.target.closest('.timestamp-item');
    if (item) {
        customTooltip.style.opacity = '0';
    }
});

// --- Helpers ---
function fmtTime(time) {
    if ((!time && time !== 0) || isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function parseTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0]);
    const s = parseInt(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return (m * 60) + s;
}

// --- PiP Logic ---

function enablePiP() {
    // Reparent video to sidebar
    elements.sidebar.pipVideoWrapper.appendChild(elements.main.video);
    elements.sidebar.pipContainer.classList.remove('hidden');

    // Update Play/Pause Icon in PiP
    updatePiPPlayIcon();
}

function disablePiP(restoreToMain = true) {
    elements.sidebar.pipContainer.classList.add('hidden');

    if (restoreToMain) {
        // Move back to main container.
        // We want the order: Header -> Video -> Controls.
        // The Header is static at the top. The Controls are static at the bottom.
        // So we should insert the video BEFORE the controls.
        const controls = elements.main.videoContainer.querySelector('.player-controls');
        if (controls) {
            elements.main.videoContainer.insertBefore(elements.main.video, controls);
        } else {
            elements.main.videoContainer.appendChild(elements.main.video);
        }
        // Ensure loader is also handled if needed, but loader is absolute usually.
        // If loader is in flow, it should be after video.
        const loader = elements.main.videoLoader;
        if (loader && loader.parentNode === elements.main.videoContainer) {
            // Ensure loader is after video (z-index handles visibility, but DOM order helps)
            elements.main.videoContainer.insertBefore(loader, controls);
        }
    }
}

function updatePiPPlayIcon() {
    if (elements.main.video.paused) {
        elements.sidebar.pipBtnPlayPause.innerHTML = '<i class="ph-fill ph-play"></i>';
    } else {
        elements.sidebar.pipBtnPlayPause.innerHTML = '<i class="ph-fill ph-pause"></i>';
    }
}

// PiP Listeners
if (elements.sidebar.pipBtnRewind) {
    elements.sidebar.pipBtnRewind.onclick = (e) => {
        e.stopPropagation();
        elements.main.video.currentTime -= 10;
    };
    elements.sidebar.pipBtnForward.onclick = (e) => {
        e.stopPropagation();
        elements.main.video.currentTime += 10;
    };
    elements.sidebar.pipBtnPlayPause.onclick = (e) => {
        e.stopPropagation();
        if (elements.main.video.paused) {
            elements.main.video.play();
        } else {
            elements.main.video.pause();
        }
        updatePiPPlayIcon();
        // Also update main player icon just in case
        elements.main.playPauseBtn.innerHTML = elements.main.video.paused ? '<i class="ph-fill ph-play"></i>' : '<i class="ph-fill ph-pause"></i>';
    };
    elements.sidebar.pipBtnExpand.onclick = (e) => {
        e.stopPropagation();
        if (state.pipFileId) {
            selectFile(state.pipFileId);
            state.pipFileId = null;
        } else {
            // Fallback: just go to player view?
            disablePiP(true);
            hideAllViews();
            elements.main.playerView.classList.remove('hidden');
        }
    };
    elements.sidebar.pipBtnClose.onclick = (e) => {
        e.stopPropagation();
        elements.main.video.pause();
        disablePiP(true);
        state.pipFileId = null;
    };
}

if (elements.main.btnTogglePiP) {
    elements.main.btnTogglePiP.onclick = () => {
        state.pipEnabled = !state.pipEnabled;
        if (state.pipEnabled) {
            elements.main.btnTogglePiP.innerHTML = '<i class="ph-bold ph-picture-in-picture"></i>';
            elements.main.btnTogglePiP.style.opacity = '1';
        } else {
            // Use "slash" icon or dim it
            elements.main.btnTogglePiP.innerHTML = '<i class="ph-bold ph-picture-in-picture" style="position:relative;"><div style="position:absolute;width:100%;height:2px;background:var(--text-primary);top:50%;left:0;transform:rotate(45deg);"></div></i>';
            // Or simpler:
            elements.main.btnTogglePiP.innerHTML = '<i class="ph-bold ph-monitor-play"></i>'; // Fallback if no specific icon
            // Actually, phosphor has ph-picture-in-picture-slash? Let's assume standard behavior or just dim.
            // Let's use opacity for simplicity + icon change.
            elements.main.btnTogglePiP.innerHTML = '<i class="ph-bold ph-picture-in-picture"></i>';
            elements.main.btnTogglePiP.style.opacity = '0.5';
        }
    };
}


// --- Modals ---

function openModal(modal) {
    // Handle both string IDs and DOM elements
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }
    if (modal && modal.classList) {
        modal.classList.add('open');
    }
}

window.closeModals = function () {
    Object.values(elements.modals).forEach(el => {
        if (el && el.classList) {
            el.classList.remove('open');
            // Check if it was popup player, pause it
            if (el === elements.modals.overlayPlayer) {
                elements.modals.popupVideo.pause();
                state.playbackRange = null;
                currentPopupTimestampId = null;
            }
        }
    });
};

// --- Init ---
window.addEventListener('DOMContentLoaded', init);

// Close modals when clicking the overlay background
document.addEventListener('click', function (event) {
    if (event.target.classList && event.target.classList.contains('modal-overlay') && event.target.classList.contains('open')) {
        closeModals();
    }
});

// Close modals when clicking X button
document.addEventListener('click', function (event) {
    const closeBtn = event.target.closest('.modal-close');
    if (closeBtn) {
        event.stopPropagation();
        closeModals();
    }
});
