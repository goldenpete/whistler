/**
 * Whistler.js
 * Robust Application Logic Reference Implementation
 */

const Whistler = {
    // --- State ---
    state: {
        projects: [],
        files: [],
        collections: [],
        timestamps: [],
        // UI State
        activeProjectId: null,
        activeFileId: null,
        activeCollectionId: null,
        // Playback State
        playbackRange: null,
        pipFileId: null,
        pipEnabled: true
    },

    // --- DOM Elements Helper (Dynamic to prevent null refs) ---
    get elements() {
        return {
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

                // PiP
                pipContainer: document.getElementById('sidebar-pip'),
                pipVideoWrapper: document.getElementById('pip-video-wrapper'),
                pipBtnPlayPause: document.getElementById('pip-btn-play-pause'),
                pipBtnRewind: document.getElementById('pip-btn-rewind'),
                pipBtnForward: document.getElementById('pip-btn-forward'),
                pipBtnExpand: document.getElementById('pip-btn-expand'),
                pipBtnClose: document.getElementById('pip-btn-close')
            },
            main: {
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
                btnEditFile: document.getElementById('btn-edit-file'),
                btnDeleteFile: document.getElementById('btn-delete-file'),
                // New Controls
                timestampSidebar: document.getElementById('timestamp-sidebar'),
                btnToggleNotes: document.getElementById('btn-toggle-notes'),
                btnCloseNotes: document.getElementById('btn-close-notes'),
                btnPlaybackSpeed: document.getElementById('btn-playback-speed')
            },
            modals: {
                // ... Map all modals dynamically ...
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

                overlayTimestamp: document.getElementById('modal-timestamp'),
                inputTimestampCollection: document.getElementById('input-timestamp-collection'),
                inputTimestampNote: document.getElementById('input-timestamp-note'),
                inputTimestampStart: document.getElementById('input-timestamp-start'),
                inputTimestampEnd: document.getElementById('input-timestamp-end'),
                btnSetStart: document.getElementById('btn-set-start'),
                btnSetEnd: document.getElementById('btn-set-end'),
                btnSubmitTimestamp: document.getElementById('submit-timestamp'),

                // Custom Prompts
                overlayPrompt: document.getElementById('modal-prompt'),
                promptTitle: document.getElementById('prompt-title'),
                inputPromptValue: document.getElementById('input-prompt-value'),
                btnPromptConfirm: document.getElementById('btn-prompt-confirm'),

                overlayConfirm: document.getElementById('modal-confirm'),
                confirmTitle: document.getElementById('confirm-title'),
                confirmMessage: document.getElementById('confirm-message'),
                btnConfirmYes: document.getElementById('btn-confirm-yes'),

                // Popup
                overlayPlayer: document.getElementById('modal-player-popup'),
                popupVideo: document.getElementById('popup-video'),
                popupTitle: document.getElementById('popup-title'),
                popupNote: document.getElementById('popup-note'),
                btnDelete: document.getElementById('btn-delete-timestamp'),
                btnSavePopup: document.getElementById('btn-save-popup'),
                popupPlayBtn: document.getElementById('popup-play-btn'),
                popupSeekBar: document.getElementById('popup-seek-bar'),
                popupProgress: document.getElementById('popup-progress'),
                popupTimeVal: document.getElementById('popup-time-val')
            }
        };
    },

    // --- Init ---
    init: function () {
        console.log("Whistler Initializing...");
        Whistler.Storage.load();
        Whistler.Events.setupNavigation();
        Whistler.Events.setupSpecifics();
        Whistler.Router.goToProjects();
    },

    // --- Storage ---
    Storage: {
        save: () => {
            localStorage.setItem('whistler_data', JSON.stringify({
                projects: Whistler.state.projects,
                files: Whistler.state.files,
                collections: Whistler.state.collections,
                timestamps: Whistler.state.timestamps
            }));
        },
        load: () => {
            try {
                const data = localStorage.getItem('whistler_data');
                if (data) {
                    const parsed = JSON.parse(data);
                    Whistler.state.projects = parsed.projects || [];
                    Whistler.state.files = parsed.files || [];
                    Whistler.state.collections = parsed.collections || [];
                    Whistler.state.timestamps = parsed.timestamps || [];
                }
            } catch (e) {
                console.error("Failed to load storage", e);
            }
        }
    },

    // --- Router ---
    Router: {
        hideAllViews: () => {
            const els = Whistler.elements.main;
            if (els.projectsView) els.projectsView.classList.add('hidden');
            if (els.storageView) els.storageView.classList.add('hidden');
            if (els.collectionView) els.collectionView.classList.add('hidden');
            if (els.playerView) els.playerView.classList.add('hidden');
        },
        goToProjects: () => {
            // Handle PiP transition if needed
            if (Whistler.state.activeFileId && Whistler.state.pipEnabled && !Whistler.elements.main.video.paused) {
                Whistler.state.pipFileId = Whistler.state.activeFileId;
                Whistler.PiP.enable();
            } else {
                if (Whistler.elements.main.video) Whistler.elements.main.video.pause();
                Whistler.PiP.disable(false);
                Whistler.state.pipFileId = null;
            }

            Whistler.state.activeProjectId = null;
            Whistler.state.activeFileId = null;
            Whistler.state.activeCollectionId = null;

            Whistler.Router.hideAllViews();
            Whistler.elements.main.projectsView.classList.remove('hidden');

            // Sidebar adjustments
            const sb = Whistler.elements.sidebar;
            sb.navStorage.classList.add('hidden');
            sb.navCollectionsContainer.classList.add('hidden');
            sb.projectTitle.classList.add('hidden');

            sb.navProjectsIcon.className = 'ph-bold ph-squares-four';
            sb.navProjectsLabel.textContent = 'Projects';
            sb.navProjects.onclick = Whistler.Router.goToProjects;

            Whistler.UI.setActiveNav('nav-projects');
            Whistler.UI.renderProjects();
        },
        goToStorage: () => {
            // PiP Logic
            if (Whistler.state.activeFileId && Whistler.state.pipEnabled && !Whistler.elements.main.video.paused) {
                Whistler.state.pipFileId = Whistler.state.activeFileId;
                Whistler.PiP.enable();
            } else {
                if (Whistler.elements.main.video) Whistler.elements.main.video.pause();
                Whistler.PiP.disable(false);
                Whistler.state.pipFileId = null;
            }

            Whistler.state.activeProjectId = null;
            Whistler.state.activeFileId = null;
            Whistler.state.activeCollectionId = null;

            Whistler.Router.hideAllViews();
            Whistler.elements.main.storageView.classList.remove('hidden');
            Whistler.UI.setActiveNav('nav-storage');
            Whistler.UI.renderStorage();
        },
        selectProject: (id) => {
            const project = Whistler.state.projects.find(p => p.id === id);
            if (!project) return;

            Whistler.state.activeProjectId = id;
            Whistler.state.activeFileId = null;

            Whistler.Router.hideAllViews();
            Whistler.elements.main.storageView.classList.remove('hidden');

            // Update Sidebar
            const sb = Whistler.elements.sidebar;
            sb.navStorage.classList.remove('hidden');
            sb.navCollectionsContainer.classList.remove('hidden');
            sb.projectTitle.textContent = project.name;
            sb.projectTitle.classList.remove('hidden');

            sb.navProjectsIcon.className = 'ph-bold ph-arrow-left';
            sb.navProjectsLabel.textContent = 'Back to Projects';
            sb.navProjects.onclick = Whistler.Router.goToProjects;

            // Navigation on Storage Click
            sb.navStorage.onclick = () => {
                Whistler.state.activeFileId = null;
                Whistler.state.activeCollectionId = null;
                Whistler.Router.hideAllViews();
                Whistler.elements.main.storageView.classList.remove('hidden');
                Whistler.UI.setActiveNav('nav-storage');
                Whistler.UI.renderStorage();
            };

            Whistler.UI.setActiveNav('nav-storage');
            Whistler.UI.renderStorage();
            Whistler.UI.renderSidebarCollections();
        },
        selectFile: (fileId) => {
            const file = Whistler.state.files.find(f => f.id === fileId);
            if (!file) return;

            Whistler.state.activeFileId = fileId;
            Whistler.state.activeCollectionId = null;

            // Don't hide storage view - show player as overlay instead
            const storageView = Whistler.elements.main.storageView;
            const playerView = Whistler.elements.main.playerView;

            // Blur storage view
            if (storageView) storageView.classList.add('blurred');

            // Show player as overlay
            if (playerView) playerView.classList.remove('hidden');
            if (Whistler.elements.main.playerHeader) Whistler.elements.main.playerHeader.classList.remove('hidden');

            if (Whistler.elements.main.playerTitle) Whistler.elements.main.playerTitle.textContent = file.name;

            // Attach Player Action Listeners Safely
            const btnEdit = document.getElementById('btn-edit-file');
            if (btnEdit) {
                const newBtn = btnEdit.cloneNode(true);
                btnEdit.parentNode.replaceChild(newBtn, btnEdit);
                newBtn.onclick = (e) => { e.stopPropagation(); Whistler.Actions.editFile(fileId); };
            }
            const btnDelete = document.getElementById('btn-delete-file');
            if (btnDelete) {
                const newBtn = btnDelete.cloneNode(true);
                btnDelete.parentNode.replaceChild(newBtn, btnDelete);
                newBtn.onclick = (e) => { e.stopPropagation(); Whistler.Actions.deleteFile(fileId); };
            }

            const video = Whistler.elements.main.video;

            // Smart Resume Check: If opening the PiP file, don't reset
            const isResumingPip = (Whistler.state.pipFileId === fileId);

            if (isResumingPip) {
                // Ensure video is back in main container (PiP disable handles this if forceMoveBack=true)
                Whistler.PiP.disable(true);
                Whistler.state.pipFileId = null; // Clear PiP state

                // If paused, maybe play? Depends on UX. Let's keep state.
                // Update icon just in case
                if (!video.paused) {
                    Whistler.elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
                } else {
                    Whistler.elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
                }
            } else {
                // Full Load
                Whistler.PiP.disable(true); // Close any existing PiP
                video.src = file.url;
                video.load(); // Ensure fresh load
                video.play();
                Whistler.elements.main.playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
            }

            Whistler.Player.renderTimestamps();
            Whistler.Player.renderMarkers();
            Whistler.Player.setupCloseHandlers();
        },
        selectCollection: (id) => {
            const collection = Whistler.state.collections.find(c => c.id === id);
            if (!collection) return;

            // PiP Check
            if (Whistler.state.activeFileId && Whistler.state.pipEnabled && !Whistler.elements.main.video.paused) {
                Whistler.state.pipFileId = Whistler.state.activeFileId;
                Whistler.PiP.enable();
            } else {
                if (Whistler.elements.main.video) Whistler.elements.main.video.pause();
                Whistler.PiP.disable(false);
                Whistler.state.pipFileId = null;
            }

            Whistler.state.activeCollectionId = id;
            Whistler.state.activeFileId = null;

            Whistler.Router.hideAllViews();
            Whistler.elements.main.collectionView.classList.remove('hidden');

            Whistler.UI.renderCollectionView();
            Whistler.UI.setActiveNav('nav-storage', false); // deactivate storage

            // Update sidebar active state manually
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            Whistler.UI.renderSidebarCollections(); // will set active class based on state
        }
    },

    // --- UI Rendering ---
    UI: {
        setActiveNav: (id, isActive = true) => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const el = document.getElementById(id);
            if (el && isActive) el.classList.add('active');
        },
        renderProjects: () => {
            const grid = Whistler.elements.main.projectGrid;
            if (!grid) return;
            grid.innerHTML = '';

            Whistler.state.projects.forEach(p => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <i class="ph-duotone ph-folder-open" style="font-size: 2rem; color: var(--accent-primary);"></i>
                    <span class="card-title">${p.name}</span>
                    <span class="card-subtitle">Project</span>
                `;
                card.onclick = () => Whistler.Router.selectProject(p.id);
                grid.appendChild(card);
            });

            // Add Project Card
            const addCard = document.createElement('div');
            addCard.className = 'card';
            addCard.style.borderStyle = 'dashed';
            addCard.innerHTML = `
                <i class="ph-bold ph-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
                <span class="card-title" style="color: var(--text-muted);">New Project</span>
            `;
            addCard.onclick = () => Whistler.Modals.open(Whistler.elements.modals.overlayProject);
            grid.appendChild(addCard);
        },
        renderStorage: () => {
            const grid = Whistler.elements.main.storageGrid;
            grid.innerHTML = '';

            const files = Whistler.state.activeProjectId
                ? Whistler.state.files.filter(f => f.projectId === Whistler.state.activeProjectId)
                : Whistler.state.files;

            if (files.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No files found.</div>';
            }

            files.forEach(f => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <i class="ph-duotone ph-film-strip" style="font-size: 2rem; color: var(--text-primary);"></i>
                    <span class="card-title">${f.name}</span>
                    <span class="card-subtitle">Video</span>
                `;
                card.onclick = () => Whistler.Router.selectFile(f.id);
                grid.appendChild(card);
            });

            // Add File Card
            const addCard = document.createElement('div');
            addCard.className = 'card';
            addCard.style.borderStyle = 'dashed';
            addCard.innerHTML = `
                <i class="ph-bold ph-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
                <span class="card-title" style="color: var(--text-muted);">Add File</span>
            `;
            addCard.onclick = () => Whistler.Modals.open(Whistler.elements.modals.overlayFile);
            grid.appendChild(addCard);
        },
        renderCollectionView: () => {
            const collection = Whistler.state.collections.find(c => c.id === Whistler.state.activeCollectionId);
            if (!collection) return;

            if (Whistler.elements.main.collectionHeaderTitle) {
                Whistler.elements.main.collectionHeaderTitle.textContent = collection.name + " Moments";
            }

            const grid = Whistler.elements.main.collectionGrid;
            grid.innerHTML = '';

            const projectFiles = Whistler.state.files.filter(f => f.projectId === Whistler.state.activeProjectId);
            const fileIds = projectFiles.map(f => f.id);

            const timestamps = Whistler.state.timestamps.filter(t => t.collectionId === collection.id && fileIds.includes(t.fileId));

            if (timestamps.length === 0) {
                grid.innerHTML = '<div style="color: var(--text-muted);">No timestamps in this collection yet.</div>';
                return;
            }

            timestamps.forEach(t => {
                const file = projectFiles.find(f => f.id === t.fileId);
                const card = document.createElement('div');
                card.className = 'timestamp-card';
                card.style.borderTopColor = collection.color;
                card.innerHTML = `
                    <div style="font-weight: 500;">${t.note || 'Untitled Note'}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);"><i class="ph-fill ph-film-strip"></i> ${file.name}</div>
                    <div class="card-meta">${Whistler.Utils.fmtTime(t.startTime)} - ${Whistler.Utils.fmtTime(t.endTime)}</div>
                 `;
                card.onclick = () => Whistler.Player.openPopup(t.id);
                grid.appendChild(card);
            });
        },
        renderSidebarCollections: () => {
            const list = document.getElementById('collection-list');
            if (!list) return;
            list.innerHTML = '';

            const cols = Whistler.state.collections.filter(c => c.projectId === Whistler.state.activeProjectId);

            cols.forEach(c => {
                const li = document.createElement('li');
                li.className = `nav-item ${Whistler.state.activeCollectionId === c.id ? 'active' : ''}`;
                li.innerHTML = `
                    <span class="collection-dot" style="width: 10px; height: 10px; border-radius: 50%; background-color: ${c.color}; display: inline-block; flex-shrink: 0;"></span>
                    <span>${c.name}</span>
                 `;
                li.onclick = (e) => {
                    e.stopPropagation();
                    Whistler.Router.selectCollection(c.id);
                };
                list.appendChild(li);
            });
        }
    },

    // --- Actions (CRUD) ---
    Actions: {
        createProject: () => {
            const name = Whistler.elements.modals.inputProjectName.value;
            if (!name) return;
            const p = { id: crypto.randomUUID(), name: name, created_at: new Date().toISOString() };
            Whistler.state.projects.push(p);
            Whistler.Storage.save();
            Whistler.Modals.closeAll();
            Whistler.Router.goToProjects();
            Whistler.elements.modals.inputProjectName.value = '';
        },
        createFile: () => {
            const name = Whistler.elements.modals.inputFileName.value;
            const url = Whistler.elements.modals.inputFileUrl.value;
            if (!name || !url) return;
            const f = { id: crypto.randomUUID(), projectId: Whistler.state.activeProjectId, name: name, url: url, created_at: new Date().toISOString() };
            Whistler.state.files.push(f);
            Whistler.Storage.save();
            Whistler.Modals.closeAll();
            Whistler.Router.selectProject(Whistler.state.activeProjectId);
            Whistler.elements.modals.inputFileName.value = '';
            Whistler.elements.modals.inputFileUrl.value = '';
        },
        createCollection: () => {
            const name = Whistler.elements.modals.inputCollectionName.value;
            const color = Whistler.elements.modals.inputCollectionColor.value;
            if (!name) return;
            const c = { id: crypto.randomUUID(), projectId: Whistler.state.activeProjectId, name: name, color: color, created_at: new Date().toISOString() };
            Whistler.state.collections.push(c);
            Whistler.Storage.save();
            Whistler.Modals.closeAll();
            Whistler.UI.renderSidebarCollections();
            Whistler.elements.modals.inputCollectionName.value = '';
        },
        createTimestamp: () => {
            const colId = Whistler.elements.modals.inputTimestampCollection.value;
            const note = Whistler.elements.modals.inputTimestampNote.value;
            const start = Whistler.Utils.parseTime(Whistler.elements.modals.inputTimestampStart.value);
            const end = Whistler.Utils.parseTime(Whistler.elements.modals.inputTimestampEnd.value);

            if (!colId || start === null || end === null || !Whistler.state.activeFileId) return;

            const t = { id: crypto.randomUUID(), fileId: Whistler.state.activeFileId, collectionId: colId, startTime: start, endTime: end, note: note };
            Whistler.state.timestamps.push(t);
            Whistler.Storage.save();
            Whistler.Modals.closeAll();
            Whistler.Player.renderTimestamps();
            Whistler.Player.renderMarkers();
        },
        editFile: (id) => {
            const file = Whistler.state.files.find(f => f.id === id);
            if (!file) return;
            Whistler.Modals.showPrompt("Rename File", file.name, (newName) => {
                file.name = newName;
                Whistler.Storage.save();
                if (Whistler.elements.main.playerTitle) Whistler.elements.main.playerTitle.textContent = newName;
            });
        },
        deleteFile: (id) => {
            Whistler.Modals.showConfirm("Delete File", "Are you sure? This cannot be undone.", () => {
                Whistler.state.files = Whistler.state.files.filter(f => f.id !== id);
                Whistler.state.timestamps = Whistler.state.timestamps.filter(t => t.fileId !== id);
                Whistler.Storage.save();

                if (Whistler.state.activeFileId === id) {
                    Whistler.state.activeFileId = null;
                    Whistler.elements.main.video.src = "";
                    Whistler.Router.selectProject(Whistler.state.activeProjectId);
                }
            });
        }
    },

    // --- Events ---
    Events: {
        setupNavigation: () => {
            const els = Whistler.elements;
            if (els.sidebar.navProjects) els.sidebar.navProjects.onclick = Whistler.Router.goToProjects;
            if (els.sidebar.navStorage) els.sidebar.navStorage.onclick = Whistler.Router.goToStorage;
            if (els.sidebar.brandContent) els.sidebar.brandContent.onclick = Whistler.Router.goToProjects;

            // Add Collection Button
            const btnAddCol = document.getElementById('btn-add-collection-sidebar');
            if (btnAddCol) {
                btnAddCol.onclick = (e) => {
                    e.stopPropagation();
                    Whistler.Modals.open(Whistler.elements.modals.overlayCollection);
                };
            }

            // Toggle
            if (els.sidebar.toggleBtn) {
                els.sidebar.toggleBtn.onclick = () => {
                    const sb = document.querySelector('.sidebar');
                    sb.classList.toggle('collapsed');
                    if (els.sidebar.toggleIcon) {
                        els.sidebar.toggleIcon.className = sb.classList.contains('collapsed') ? 'ph-bold ph-caret-right' : 'ph-bold ph-caret-left';
                    }
                };
            }

            // Modals
            const m = Whistler.elements.modals;
            if (m.btnSubmitProject) m.btnSubmitProject.onclick = Whistler.Actions.createProject;
            if (m.btnSubmitFile) m.btnSubmitFile.onclick = Whistler.Actions.createFile;
            if (m.btnSubmitCollection) m.btnSubmitCollection.onclick = Whistler.Actions.createCollection;
            if (m.btnSubmitTimestamp) m.btnSubmitTimestamp.onclick = Whistler.Actions.createTimestamp;

            // Global Close for Modals (clicking X)
            document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target === el || el.classList.contains('modal-close')) {
                        Whistler.Modals.closeAll();
                    }
                });
            });

            // Legacy Support for inline onclick="closeModals()"
            window.closeModals = Whistler.Modals.closeAll;
        },
        setupSpecifics: () => {
            const els = Whistler.elements.main;
            const m = Whistler.elements.modals;
            // Player
            if (els.playPauseBtn) els.playPauseBtn.onclick = Whistler.Player.togglePlay;
            if (els.video) {
                els.video.onclick = Whistler.Player.togglePlay;
                els.video.addEventListener('timeupdate', Whistler.Player.updateProgress);
                els.video.addEventListener('loadedmetadata', () => {
                    Whistler.Player.updateProgress();
                    Whistler.Player.renderMarkers();
                });

                // Smooth Seek Loop
                els.video.addEventListener('play', () => {
                    Whistler.Player.startLoop();
                    if (els.playPauseBtn) els.playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
                    Whistler.PiP.updatePlayIcon();
                });
                els.video.addEventListener('pause', () => {
                    Whistler.Player.stopLoop();
                    if (els.playPauseBtn) els.playPauseBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
                    Whistler.PiP.updatePlayIcon();
                });
                els.video.addEventListener('ended', () => {
                    Whistler.Player.stopLoop();
                    if (els.playPauseBtn) els.playPauseBtn.innerHTML = '<i class="ph-fill ph-arrow-counter-clockwise"></i>';
                    Whistler.PiP.updatePlayIcon();
                });
            }
            if (els.seekBarContainer) {
                // Dragging Support
                let isDragging = false;

                const onDrag = (e) => {
                    const rect = els.seekBarContainer.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (els.video && els.video.duration) {
                        els.video.currentTime = pos * els.video.duration;
                    }
                };

                els.seekBarContainer.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    // Dont pause, just seek. If you want pause-seek-resume pattern, add here.
                    // For modern fluid feel, just seeking while playing is often fine, or pause.
                    // Let's pause for smoother drag if loop fights us? 
                    // No, loop updates UI based on currentTime, so if we update currentTime, loop reflects it.
                    onDrag(e);

                    const moveHandler = (moveEvent) => {
                        if (isDragging) onDrag(moveEvent);
                    };
                    const upHandler = () => {
                        isDragging = false;
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', upHandler);
                    };
                    document.addEventListener('mousemove', moveHandler);
                    document.addEventListener('mouseup', upHandler);
                });
            }

            // PiP Toggle
            if (els.btnTogglePiP) {
                els.btnTogglePiP.onclick = (e) => {
                    e.stopPropagation();
                    Whistler.state.pipEnabled = !Whistler.state.pipEnabled;
                    Whistler.elements.main.btnTogglePiP.style.opacity = Whistler.state.pipEnabled ? '1' : '0.4';
                };
                // Set initial state
                els.btnTogglePiP.style.opacity = Whistler.state.pipEnabled ? '1' : '0.4';
            }

            // Editor
            if (els.btnAddTimestamp) els.btnAddTimestamp.onclick = Whistler.Player.openEditor;
            if (m.btnSetStart) m.btnSetStart.onclick = () => {
                if (els.video) m.inputTimestampStart.value = Whistler.Utils.fmtTime(els.video.currentTime);
            };
            if (m.btnSetEnd) m.btnSetEnd.onclick = () => {
                if (els.video) m.inputTimestampEnd.value = Whistler.Utils.fmtTime(els.video.currentTime);
            };

            // Notes Sidebar
            const toggleNotes = () => {
                if (els.timestampSidebar) els.timestampSidebar.classList.toggle('hidden');
            };
            if (els.btnToggleNotes) els.btnToggleNotes.onclick = toggleNotes;

            // Playback Speed
            if (els.btnPlaybackSpeed) {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                let speedIndex = 2; // 1x
                els.btnPlaybackSpeed.onclick = () => {
                    speedIndex = (speedIndex + 1) % speeds.length;
                    const sp = speeds[speedIndex];
                    if (els.video) els.video.playbackRate = sp;
                    els.btnPlaybackSpeed.innerHTML = `<i class="ph-bold ph-gauge"></i> ${sp}x`;
                };
            }

            // Popup Player Controls
            if (m.popupPlayBtn) {
                m.popupPlayBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!m.popupVideo) return;
                    if (m.popupVideo.paused) {
                        m.popupVideo.play();
                        m.popupPlayBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
                    } else {
                        m.popupVideo.pause();
                        m.popupPlayBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
                    }
                };
            }

            if (m.popupSeekBar) {
                m.popupSeekBar.onclick = (e) => {
                    if (!m.popupVideo || !Whistler.state.playbackRange) return;
                    const rect = m.popupSeekBar.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    const r = Whistler.state.playbackRange;
                    const total = r.end - r.start;
                    m.popupVideo.currentTime = r.start + (pos * total);
                };
            }

            if (m.btnDelete) {
                m.btnDelete.onclick = (e) => {
                    e.stopPropagation();
                    const id = Whistler.state.currentPopupTimestampId;
                    if (!id) return;
                    Whistler.Modals.showConfirm("Delete Timestamp", "Are you sure?", () => {
                        Whistler.state.timestamps = Whistler.state.timestamps.filter(t => t.id !== id);
                        Whistler.Storage.save();
                        Whistler.Modals.closeAll();
                        // Refresh if in collection view or player
                        if (Whistler.state.activeCollectionId) {
                            Whistler.UI.renderCollectionView();
                        }
                        if (Whistler.state.activeFileId) {
                            Whistler.Player.renderTimestamps();
                            Whistler.Player.renderMarkers();
                        }
                    });
                };
            }

            if (m.btnSavePopup) {
                m.btnSavePopup.onclick = (e) => {
                    e.stopPropagation();
                    const id = Whistler.state.currentPopupTimestampId;
                    if (!id || !m.popupNote) return;
                    const t = Whistler.state.timestamps.find(x => x.id === id);
                    if (t) {
                        t.note = m.popupNote.value;
                        Whistler.Storage.save();
                        Whistler.Modals.closeAll();
                        // Refresh views
                        if (Whistler.state.activeCollectionId) {
                            Whistler.UI.renderCollectionView();
                        }
                        if (Whistler.state.activeFileId) {
                            Whistler.Player.renderTimestamps();
                        }
                    }
                };
            }
        }
    },

    // --- PiP ---
    PiP: {
        enable: () => {
            const sidebarPip = Whistler.elements.sidebar.pipContainer;
            if (!sidebarPip) return;
            const pipVideoWrapper = Whistler.elements.sidebar.pipVideoWrapper;

            // Prevent duplicate PiP enabling
            if (!sidebarPip.classList.contains('hidden') && pipVideoWrapper.contains(Whistler.elements.main.video)) {
                return;
            }

            sidebarPip.classList.remove('hidden');

            // Move video to PiP wrapper if not already there
            if (!pipVideoWrapper.contains(Whistler.elements.main.video)) {
                pipVideoWrapper.appendChild(Whistler.elements.main.video);
            }

            Whistler.elements.main.video.play();
            Whistler.PiP.updatePlayIcon();

            // Listeners (Ensure only one set exists by overwriting onclick)
            Whistler.elements.sidebar.pipBtnPlayPause.onclick = (e) => {
                e.stopPropagation();
                Whistler.Player.togglePlay();
                Whistler.PiP.updatePlayIcon();
            };

            Whistler.elements.sidebar.pipBtnRewind.onclick = (e) => {
                e.stopPropagation();
                if (Whistler.elements.main.video) Whistler.elements.main.video.currentTime -= 5;
            };

            Whistler.elements.sidebar.pipBtnForward.onclick = (e) => {
                e.stopPropagation();
                if (Whistler.elements.main.video) Whistler.elements.main.video.currentTime += 5;
            };

            Whistler.elements.sidebar.pipBtnExpand.onclick = (e) => {
                e.stopPropagation();
                Whistler.PiP.disable(true);
                // Restore Overlay
                if (Whistler.state.pipFileId) {
                    Whistler.Router.selectFile(Whistler.state.pipFileId);
                }
            };

            Whistler.elements.sidebar.pipBtnClose.onclick = (e) => {
                e.stopPropagation();
                Whistler.PiP.disable(true); // Move back to main container but hidden
                if (Whistler.elements.main.video) {
                    Whistler.elements.main.video.pause();
                    Whistler.elements.main.video.src = '';
                }
                Whistler.state.pipFileId = null;
                Whistler.state.activeFileId = null;
            };
        },
        disable: (forceMoveBack) => {
            const sidebarPip = Whistler.elements.sidebar.pipContainer;
            if (!sidebarPip) return;
            sidebarPip.classList.add('hidden');

            if (forceMoveBack && Whistler.elements.main.videoContainer) {
                // Check if video is actually in PiP wrapper before moving back to avoid errors
                // OR just blindly move it if it exists.
                if (Whistler.elements.main.video) {
                    const controls = Whistler.elements.main.videoContainer.querySelector('.player-controls');
                    if (controls) {
                        Whistler.elements.main.videoContainer.insertBefore(Whistler.elements.main.video, controls);
                    } else {
                        Whistler.elements.main.videoContainer.appendChild(Whistler.elements.main.video);
                    }
                }
            }
        },
        updatePlayIcon: () => {
            if (Whistler.elements.main.video && !Whistler.elements.main.video.paused) {
                Whistler.elements.sidebar.pipBtnPlayPause.innerHTML = '<i class="ph-fill ph-pause"></i>';
            } else {
                Whistler.elements.sidebar.pipBtnPlayPause.innerHTML = '<i class="ph-fill ph-play"></i>';
            }
        }
    },

    // --- Player ---
    Player: {
        togglePlay: () => {
            const v = Whistler.elements.main.video;
            if (v.paused) {
                v.play();
            } else {
                v.pause();
            }
        },
        _rafId: null,
        startLoop: () => {
            if (Whistler.Player._rafId) cancelAnimationFrame(Whistler.Player._rafId);
            const loop = () => {
                Whistler.Player.updateProgress();
                if (Whistler.elements.main.video && !Whistler.elements.main.video.paused) {
                    Whistler.Player._rafId = requestAnimationFrame(loop);
                }
            };
            loop();
        },
        stopLoop: () => {
            if (Whistler.Player._rafId) cancelAnimationFrame(Whistler.Player._rafId);
            Whistler.Player._rafId = null;
        },
        updateProgress: () => {
            const v = Whistler.elements.main.video;
            if (!v || !v.duration) return;
            const p = (v.currentTime / v.duration) * 100;
            if (Whistler.elements.main.seekBarProgress) {
                Whistler.elements.main.seekBarProgress.style.width = `${p}%`;
            }
            if (Whistler.elements.main.timeDisplay) {
                Whistler.elements.main.timeDisplay.textContent = `${Whistler.Utils.fmtTime(v.currentTime)} / ${Whistler.Utils.fmtTime(v.duration)}`;
            }
        },
        seek: (e) => {
            const v = Whistler.elements.main.video;
            const bar = Whistler.elements.main.seekBarContainer;
            const rect = bar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            v.currentTime = pos * v.duration;
        },
        openEditor: () => {
            const cols = Whistler.state.collections.filter(c => c.projectId === Whistler.state.activeProjectId);
            if (cols.length === 0) { alert("Create a collection first!"); return; }

            const sel = Whistler.elements.modals.inputTimestampCollection;
            sel.innerHTML = '';
            cols.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                sel.appendChild(opt);
            });

            const t = Whistler.elements.main.video.currentTime;
            Whistler.elements.modals.inputTimestampStart.value = Whistler.Utils.fmtTime(t);
            Whistler.elements.modals.inputTimestampEnd.value = Whistler.Utils.fmtTime(t + 5);
            Whistler.elements.modals.inputTimestampNote.value = '';
            Whistler.Modals.open(Whistler.elements.modals.overlayTimestamp);
        },
        renderTimestamps: () => {
            const list = Whistler.elements.main.activeTimestampsList;
            if (!list) return;
            list.innerHTML = '';
            const ts = Whistler.state.timestamps.filter(t => t.fileId === Whistler.state.activeFileId);

            if (ts.length === 0) {
                list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding-top: 20px;">No timestamps for this file.</div>';
                return;
            }

            // Sort by start time
            ts.sort((a, b) => a.startTime - b.startTime);

            // Helper to convert hex to rgba
            const hexToRgba = (hex, alpha) => {
                let c = hex.substring(1).split('');
                if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
                c = '0x' + c.join('');
                return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
            };

            ts.forEach(t => {
                const col = Whistler.state.collections.find(c => c.id === t.collectionId);
                if (!col) return;

                const li = document.createElement('div');
                li.className = 'timestamp-item';
                // Glassmorphism Style: Transparent Bg + Solid Border
                li.style.backgroundColor = hexToRgba(col.color, 0.2);
                li.style.border = `1px solid ${col.color}`;
                li.style.color = '#fff';
                li.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';

                li.dataset.note = t.note || '';
                li.onclick = () => Whistler.Player.openPopup(t.id);

                const leftCol = document.createElement('div');
                leftCol.style.flex = '1';
                leftCol.innerHTML = `
                        <div style="font-weight: 600; font-size: 0.9rem;">${col.name}</div>
                        <span class="time-badge" style="background: rgba(0,0,0,0.4); color: white; display: inline-block; margin-top: 4px;">${Whistler.Utils.fmtTime(t.startTime)} - ${Whistler.Utils.fmtTime(t.endTime)}</span>
                `;

                // Delete Button (X) - Styled like seekbar buttons
                const delBtn = document.createElement('button');
                delBtn.className = 'icon-btn';
                delBtn.innerHTML = '<i class="ph-bold ph-x"></i>';
                delBtn.title = 'Delete Timestamp';
                delBtn.style.marginLeft = '8px';
                delBtn.style.opacity = '0.7';
                delBtn.style.width = '24px';
                delBtn.style.height = '24px';
                delBtn.style.padding = '0';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this timestamp?')) {
                        Whistler.state.timestamps = Whistler.state.timestamps.filter(x => x.id !== t.id);
                        Whistler.Storage.save();
                        Whistler.Player.renderTimestamps();
                        Whistler.Player.renderMarkers();
                    }
                };
                // Hover effect for delete button
                delBtn.onmouseenter = () => delBtn.style.opacity = '1';
                delBtn.onmouseleave = () => delBtn.style.opacity = '0.7';

                li.appendChild(leftCol);
                li.appendChild(delBtn);
                list.appendChild(li);
            });
        },
        renderMarkers: () => {
            const layer = Whistler.elements.main.markerLayer;
            if (!layer) return;
            layer.innerHTML = '';
            const v = Whistler.elements.main.video;
            if (!v.duration) return;
            const ts = Whistler.state.timestamps.filter(t => t.fileId === Whistler.state.activeFileId);
            ts.forEach(t => {
                const col = Whistler.state.collections.find(c => c.id === t.collectionId);
                const m = document.createElement('div');
                m.className = 'marker-range'; // Use the range class!
                const startP = (t.startTime / v.duration) * 100;
                const endP = (t.endTime / v.duration) * 100;
                const width = Math.max(0.5, endP - startP); // Ensure at least visible sliver

                m.style.left = `${startP}%`;
                m.style.width = `${width}%`;
                m.style.backgroundColor = col ? col.color : 'var(--primary)';
                m.title = `${col ? col.name : 'Timestamp'}: ${t.note || 'No note'} (${Whistler.Utils.fmtTime(t.startTime)} - ${Whistler.Utils.fmtTime(t.endTime)})`;

                // Make markers clickable to open popup
                m.onclick = (e) => {
                    e.stopPropagation();
                    Whistler.Player.openPopup(t.id);
                };
                layer.appendChild(m);
            });
        },
        openPopup: (id) => {
            const t = Whistler.state.timestamps.find(x => x.id === id);
            if (!t) return;

            const file = Whistler.state.files.find(f => f.id === t.fileId);
            if (!file) { alert("File not found"); return; }

            const col = Whistler.state.collections.find(c => c.id === t.collectionId);

            // Set State for Popup
            Whistler.state.playbackRange = { start: t.startTime, end: t.endTime };
            Whistler.state.currentPopupTimestampId = id; // New state needed if we want to save/edit from popup

            const m = Whistler.elements.modals;
            if (m.popupTitle) m.popupTitle.textContent = col ? col.name : 'Moment';
            if (m.popupVideo) {
                m.popupVideo.src = file.url;
                m.popupVideo.currentTime = t.startTime;
                m.popupVideo.play();
            }
            if (m.popupNote) m.popupNote.value = t.note;
            if (m.popupPlayBtn) m.popupPlayBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';

            Whistler.Modals.open(m.overlayPlayer);

            // Attach Popup listeners if not already (or re-attach to be safe/simple)
            // Ideally we do this in setupSpecifics but we need the specific logic here or global variables.
            // Let's rely on event listeners set up in setupSpecifics IF we add them. 
            // For now, let's just make sure the video handles its own timeupdate for range constraining.
            // We need to add the timeupdate listener for the popup video again if it's missing.

            if (m.popupVideo) {
                m.popupVideo.ontimeupdate = () => {
                    const r = Whistler.state.playbackRange;
                    if (!r) return;
                    if (m.popupVideo.currentTime > r.end) {
                        m.popupVideo.pause();
                        m.popupVideo.currentTime = r.start;
                        if (m.popupPlayBtn) m.popupPlayBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
                    }
                    // Progress Bar
                    const total = r.end - r.start;
                    const current = Math.max(0, m.popupVideo.currentTime - r.start);
                    const p = Math.min(100, (current / total) * 100);
                    if (m.popupProgress) m.popupProgress.style.width = `${p}%`;
                    if (m.popupTimeVal) m.popupTimeVal.textContent = `${Whistler.Utils.fmtTime(m.popupVideo.currentTime)} / ${Whistler.Utils.fmtTime(r.end)}`;
                };
            }
        },
        setupCloseHandlers: () => {
            const playerView = Whistler.elements.main.playerView;

            // Remove old listeners if they exist (using stored reference)
            if (Whistler.Player._escHandler) {
                document.removeEventListener('keydown', Whistler.Player._escHandler);
            }
            if (Whistler.Player._backdropHandler && playerView) {
                playerView.removeEventListener('click', Whistler.Player._backdropHandler);
            }

            // Create new handlers
            Whistler.Player._escHandler = (e) => {
                const pv = Whistler.elements.main.playerView;
                if (e.key === 'Escape' && pv && !pv.classList.contains('hidden')) {
                    Whistler.Player.closePlayer();
                }
            };

            Whistler.Player._backdropHandler = (e) => {
                const pv = Whistler.elements.main.playerView;
                if (e.target === pv) {
                    Whistler.Player.closePlayer();
                }
            };

            // Add new listeners
            document.addEventListener('keydown', Whistler.Player._escHandler);
            if (playerView) playerView.addEventListener('click', Whistler.Player._backdropHandler);
        },
        closePlayer: () => {
            const playerView = Whistler.elements.main.playerView;
            const storageView = Whistler.elements.main.storageView;
            const video = Whistler.elements.main.video;

            // Hide player
            if (playerView) playerView.classList.add('hidden');

            // Remove blur from storage
            if (storageView) storageView.classList.remove('blurred');

            // Move to PiP if enabled and playing
            if (Whistler.state.pipEnabled && Whistler.state.activeFileId && video && !video.ended) {
                Whistler.state.pipFileId = Whistler.state.activeFileId;
                Whistler.PiP.enable();
            } else {
                // Stop video completely
                if (video) {
                    video.pause();
                    video.src = '';
                }
            }

            // Clear active file (main player no longer active)
            Whistler.state.activeFileId = null;
        }
    },

    // --- Modals ---
    Modals: {
        open: (el) => el.classList.add('open'),
        closeAll: () => {
            Object.values(Whistler.elements.modals).forEach(el => {
                if (el && el.classList) el.classList.remove('open');
            });
        },
        showPrompt: (title, defaultValue, callback) => {
            const m = Whistler.elements.modals;
            m.promptTitle.textContent = title;
            m.inputPromptValue.value = defaultValue;
            m.overlayPrompt.classList.add('open');

            // Dynamic Listener
            const newBtn = m.btnPromptConfirm.cloneNode(true);
            m.btnPromptConfirm.parentNode.replaceChild(newBtn, m.btnPromptConfirm);
            m.btnPromptConfirm = newBtn;
            newBtn.onclick = () => {
                if (m.inputPromptValue.value.trim()) {
                    callback(m.inputPromptValue.value.trim());
                    Whistler.Modals.closeAll();
                }
            };
        },
        showConfirm: (title, msg, callback) => {
            const m = Whistler.elements.modals;
            m.confirmTitle.textContent = title;
            m.confirmMessage.textContent = msg;
            m.overlayConfirm.classList.add('open');
            const newBtn = m.btnConfirmYes.cloneNode(true);
            m.btnConfirmYes.parentNode.replaceChild(newBtn, m.btnConfirmYes);
            m.btnConfirmYes = newBtn;
            newBtn.onclick = () => {
                callback();
                Whistler.Modals.closeAll();
            }
        }
    },

    // --- Utils ---
    Utils: {
        fmtTime: (s) => {
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec.toString().padStart(2, '0')}`;
        },
        parseTime: (str) => {
            const p = str.split(':');
            if (p.length !== 2) return null;
            return parseInt(p[0]) * 60 + parseInt(p[1]);
        }
    }
};

// Safe Initialization
document.addEventListener('DOMContentLoaded', Whistler.init);
