/**
 * Whistler.js
 * Rebuilt Core Logic
 */

class WhistlerApp {
    constructor() {
        this.state = {
            projects: [],
            files: [],
            collections: [],
            timestamps: [],
            activeProjectId: null,
            activeFileId: null,
            activeCollectionId: null,
            isPipActive: false
        };

        // Modules
        this.storage = new StorageManager(this);
        this.router = new Router(this);
        this.player = new Player(this);
        this.ui = new UIManager(this);
        this.modals = new ModalManager(this);

        this.init();
    }

    init() {
        this.storage.load();
        this.router.init();
        this.modals.init(); // Restore Modals
        this.ui.setupNavigation();
        this.ui.renderProjectDropdown(); // Initialize Dropdown & Auto-select
    }
}

class StorageManager {
    constructor(app) {
        this.app = app;
        this.KEY = 'whistler_v2_data';
    }

    save() {
        const data = {
            projects: this.app.state.projects,
            files: this.app.state.files,
            collections: this.app.state.collections,
            timestamps: this.app.state.timestamps
        };
        localStorage.setItem(this.KEY, JSON.stringify(data));
    }

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.app.state.projects = data.projects || [];
                this.app.state.files = data.files || [];
                // Ensure legacy or new structure compatibility if needed (none for rebuild)
                this.app.state.collections = data.collections || [];
                this.app.state.timestamps = data.timestamps || [];
            }
        } catch (e) {
            console.error("Load failed", e);
        }
    }

    // CRUD
    // CRUD
    addProject(name) {
        const p = { id: crypto.randomUUID(), name, created: Date.now() };
        this.app.state.projects.push(p);
        this.save();
        return p;
    }

    addFile(name, url, type, parentId = null) {
        if (!this.app.state.activeProjectId) return;

        // Get max order
        const siblings = this.getItems(this.app.state.activeProjectId, parentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order || 0)) : -1;

        const f = {
            id: crypto.randomUUID(),
            projectId: this.app.state.activeProjectId,
            parentId: parentId, // null = root
            name,
            url,
            type, // 'catbox', 'youtube', 'dropbox', 'drive', 'folder'
            order: maxOrder + 1,
            created: Date.now()
        };
        this.app.state.files.push(f);
        this.save();
        return f;
    }

    addFolder(name, parentId = null) {
        return this.addFile(name, null, 'folder', parentId);
    }

    addCollection(name, color) {
        if (!this.app.state.activeProjectId) return;
        const c = {
            id: crypto.randomUUID(),
            projectId: this.app.state.activeProjectId,
            name,
            color,
            created: Date.now()
        };
        this.app.state.collections.push(c);
        this.save();
        return c;
    }

    addTimestamp(collectionId, fileId, start, end, note) {
        const t = {
            id: crypto.randomUUID(),
            collectionId,
            fileId,
            start, end, note,
            created: Date.now()
        };
        this.app.state.timestamps.push(t);
        this.save();
        return t;
    }

    deleteFile(id) {
        // Recursive delete if folder
        const toDelete = [id];

        if (this.app.state.files.find(f => f.id === id)?.type === 'folder') {
            const children = this.app.state.files.filter(f => f.parentId === id);
            children.forEach(c => this.deleteFile(c.id)); // Recurse
        }

        this.app.state.files = this.app.state.files.filter(f => f.id !== id);
        this.app.state.timestamps = this.app.state.timestamps.filter(t => t.fileId !== id);
        this.save();
    }

    updateFile(id, updates) {
        const f = this.app.state.files.find(x => x.id === id);
        if (f) {
            Object.assign(f, updates);
            this.save();
        }
    }

    moveFile(id, targetParentId) {
        const f = this.app.state.files.find(x => x.id === id);
        if (f && f.id !== targetParentId) { // Prevent self-parenting
            f.parentId = targetParentId;
            // Append to end of new list
            const siblings = this.getItems(f.projectId, targetParentId);
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order || 0)) : -1;
            f.order = maxOrder + 1;
            this.save();
        }
    }

    reorderItems(projectId, parentId, orderedIds) {
        const items = this.getItems(projectId, parentId);
        items.forEach(item => {
            const index = orderedIds.indexOf(item.id);
            if (index !== -1) {
                item.order = index;
            }
        });
        this.save();
    }

    getItems(projectId, parentId = null) {
        let items = this.app.state.files.filter(f => f.projectId === projectId && (f.parentId === parentId || (!f.parentId && parentId === null)));
        // Sort by order
        return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    deleteTimestamp(id) {
        this.app.state.timestamps = this.app.state.timestamps.filter(t => t.id !== id);
        this.save();
    }

    updateTimestamp(id, updates) {
        const t = this.app.state.timestamps.find(x => x.id === id);
        if (t) {
            Object.assign(t, updates);
            this.save();
        } else {
            console.error("Timestamp not found for update:", id);
        }
    }
}

class Router {
    constructor(app) {
        this.app = app;
        this.views = {
            storage: document.getElementById('view-storage'),
            collection: document.getElementById('view-collection')
        };
    }

    init() {
        document.getElementById('nav-storage').onclick = () => this.goTo('storage');
    }

    goTo(viewName) {
        // Hide all
        Object.values(this.views).forEach(el => el.classList.add('hidden'));

        // Logic
        if (viewName === 'projects') {
            this.app.state.activeProjectId = null;
            this.app.ui.resetSidebar();
            // this.app.ui.renderProjects(); // Removed in refactor
            // this.views.projects.classList.remove('hidden'); // Removed
        } else if (viewName === 'storage') {
            if (!this.app.state.activeProjectId) {
                // return this.goTo('projects'); // Projects view gone
                return;
            }
            this.app.state.activeCollectionId = null; // Clear active collection

            this.app.ui.updateSidebarForProject();
            this.app.ui.renderStorage();

            // Ensure sidebar state
            document.getElementById('nav-storage').classList.add('active');
            this.app.ui.renderCollectionsList(); // Re-render to clear active collections

            this.views.storage.classList.remove('hidden');
        } else if (viewName === 'collection') {
            this.app.ui.renderCollectionView();
            this.views.collection.classList.remove('hidden');

            // Update sidebar state
            document.getElementById('nav-storage').classList.remove('active');
            this.app.ui.renderCollectionsList(); // Re-render to highlight active collection
        }
    }

    openProject(id) {
        this.app.state.activeProjectId = id;
        this.goTo('storage');
    }

    openCollection(id) {
        this.app.state.activeCollectionId = id;
        this.goTo('collection');
    }
}

class Player {
    constructor(app) {
        this.app = app;
        this.els = {
            overlay: document.getElementById('player-overlay'),
            playerContent: document.querySelector('.player-content'), // Added for Fullscreen
            playerStage: document.getElementById('player-stage'),
            videoWrapper: document.getElementById('video-wrapper'),
            video: document.getElementById('main-video'),
            youtubePlace: document.getElementById('youtube-placeholder'),
            sidebarList: document.getElementById('timestamps-list'),

            // ... (keep existing) ...
            btnClose: document.getElementById('player-btn-close'),
            timeDisplay: document.getElementById('time-display'),
            btnPlay: document.getElementById('btn-play-pause'),
            btnFullscreen: document.getElementById('btn-fullscreen'), // Add this
            seekContainer: document.getElementById('seek-container'),
            seekFill: document.getElementById('seek-fill'),
            seekThumb: document.getElementById('seek-thumb'),
            filename: document.getElementById('player-filename'),
            btnPip: document.getElementById('btn-pip-toggle'),
            pipContainer: document.getElementById('pip-container'),
            pipStage: document.getElementById('pip-video-stage'),
            pipClose: document.getElementById('pip-close'),
            pipExpand: document.getElementById('pip-expand'),
            seekContainer: document.getElementById('seek-container'),
            seekTrack: document.getElementById('seek-track'),
            seekFill: document.getElementById('seek-fill'),
            seekMarkers: document.getElementById('seek-markers'),

            btnVolume: document.getElementById('btn-volume'),
            volumeSlider: document.getElementById('volume-slider'),

            // Speed
            btnSpeed: document.getElementById('btn-speed'),
            speedMenu: document.getElementById('speed-menu'),
            speedDisplay: document.getElementById('speed-display'),
            speedSlider: document.getElementById('speed-slider'),
            btnSpeedMinus: document.getElementById('btn-speed-minus'),
            btnSpeedPlus: document.getElementById('btn-speed-plus'),
            speedPresets: document.querySelectorAll('.speed-preset'),

            sidebar: document.getElementById('player-sidebar'),
            infoSidebar: document.getElementById('info-sidebar'),
            btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),

            // PDF Elements
            pdfStage: document.getElementById('pdf-stage'),
            pdfRender: document.getElementById('pdf-render'),
            pdfTextLayer: document.getElementById('pdf-text-layer'),
            pdfControls: document.getElementById('pdf-controls'),
            btnPdfPrev: document.getElementById('btn-pdf-prev'),
            btnPdfNext: document.getElementById('btn-pdf-next'),
            pdfPageNum: document.getElementById('pdf-page-num'),
            pdfPopover: document.getElementById('pdf-popover'),
            btnAddMark: document.getElementById('btn-add-mark'),
        };

        this.currentFile = null;
        this.lastVolume = 1;
        this.showRemainingTime = false; // Toggle state

        // PDF State
        this.pdfDoc = null;
        this.pdfPageNum = 1;
        this.pdfScale = 1.5;
        this.isPdf = false;

        // Collection Mode State
        this.isCollectionMode = false;
        this.currentTimestamp = null;
        this.playbackRange = null; // { start, end }
        this.currentCollection = null;

        this.setupListeners();
        this.setupPDFListeners();
        this.setupCollectionModeListeners();
    }

    setupListeners() {
        if (this.els.btnClose) this.els.btnClose.onclick = () => this.close();
        if (this.els.btnPlay) this.els.btnPlay.onclick = () => this.togglePlay();
        if (this.els.video) this.els.video.onclick = () => this.togglePlay();
        if (this.els.btnFullscreen) this.els.btnFullscreen.onclick = () => this.toggleFullscreen();
        if (this.els.btnSidebarToggle) this.els.btnSidebarToggle.onclick = () => this.toggleSidebar();

        // Time Display Toggle
        if (this.els.timeDisplay) {
            this.els.timeDisplay.onclick = () => {
                this.showRemainingTime = !this.showRemainingTime;
                this.updateProgress(); // Refresh immediately
            };
        }

        // Fullscreen Sync
        document.addEventListener('fullscreenchange', () => {
            if (!this.els.btnFullscreen) return;
            if (document.fullscreenElement) {
                this.els.btnFullscreen.innerHTML = '<i class="ph-bold ph-corners-in"></i>';
            } else {
                this.els.btnFullscreen.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
            }
        });

        // Copy URL
        document.getElementById('player-btn-copy').onclick = () => {
            const url = this.currentFile.url;
            navigator.clipboard.writeText(url).then(() => {
                // Could add toast here, but for now just console or relying on user knowing
                const btn = document.getElementById('player-btn-copy');
                const icon = btn.querySelector('i');
                const original = icon.className;
                icon.className = 'ph-bold ph-check';
                setTimeout(() => icon.className = original, 1500);
            });
        };

        // Share
        document.getElementById('player-btn-share').onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: this.currentFile.name,
                    url: this.currentFile.url
                }).catch(console.error);
            } else {
                // Fallback to copy behavior or alert
                alert("Share not supported on this device/browser.");
            }
        };

        // Clickable URL link
        document.getElementById('player-link').onclick = () => {
            const url = this.currentFile.url;
            this.app.modals.confirm(
                "Open External Link",
                `You are about to leave Whistler and visit:\n\n${url}\n\nContinue?`,
                () => window.open(url, '_blank'),
                'Continue',
                false
            );
        };

        this.els.video.addEventListener('timeupdate', () => this.updateProgress());
        this.els.video.addEventListener('loadedmetadata', () => {
            this.renderSeekMarkers();
            this.updateProgress();
        });

        // Loader Events
        const showLoader = () => document.getElementById('video-loader').classList.remove('hidden');
        const hideLoader = () => document.getElementById('video-loader').classList.add('hidden');

        this.els.video.addEventListener('loadstart', showLoader);
        this.els.video.addEventListener('waiting', showLoader);
        this.els.video.addEventListener('canplay', hideLoader);
        this.els.video.addEventListener('playing', hideLoader);
        this.els.video.addEventListener('error', hideLoader);
        this.els.video.addEventListener('ended', () => {
            this.els.btnPlay.innerHTML = '<i class="ph-bold ph-arrow-counter-clockwise"></i>';
        });

        // Seek
        let isDragging = false;
        const handleDrag = (e) => {
            const rect = this.els.seekContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

            if (this.playbackRange) {
                // Collection mode: seek within range
                const { start, end } = this.playbackRange;
                const rangeDuration = end - start;
                this.els.video.currentTime = start + (pos * rangeDuration);
            } else if (this.els.video.duration) {
                // Normal mode
                this.els.video.currentTime = pos * this.els.video.duration;
            }
            this.updateUIProgress(pos * 100);
        };

        this.els.seekContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleDrag(e);
            const move = (ev) => isDragging && handleDrag(ev);
            const up = () => { isDragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });

        // Seek Preview (optimized with debounce)
        const seekPreview = document.getElementById('seek-preview');
        const seekPreviewCanvas = document.getElementById('seek-preview-canvas');
        const seekPreviewTime = document.getElementById('seek-preview-time');
        const previewCtx = seekPreviewCanvas.getContext('2d');
        let previewVideo = null;
        let previewDebounce = null;
        let lastSeekTime = -1;

        this.els.seekContainer.addEventListener('mousemove', (e) => {
            const rect = this.els.seekContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const time = pos * this.els.video.duration;

            // Position preview (instant)
            const previewWidth = 168;
            let leftPos = e.clientX - rect.left;
            leftPos = Math.max(previewWidth / 2, Math.min(rect.width - previewWidth / 2, leftPos));
            seekPreview.style.left = leftPos + 'px';

            // Update time label (instant)
            seekPreviewTime.textContent = this.fmt(time);

            // Debounce the video seek (only update frame after pause)
            clearTimeout(previewDebounce);
            previewDebounce = setTimeout(() => {
                // Skip if time hasn't changed significantly (>0.5s)
                if (Math.abs(time - lastSeekTime) < 0.5) return;
                lastSeekTime = time;

                if (this.els.video.readyState >= 2) {
                    if (!previewVideo) {
                        previewVideo = document.createElement('video');
                        previewVideo.src = this.els.video.src;
                        previewVideo.muted = true;
                        previewVideo.preload = 'auto';
                    }

                    previewVideo.currentTime = time;
                    previewVideo.onseeked = () => {
                        previewCtx.drawImage(previewVideo, 0, 0, 160, 90);
                    };
                }
            }, 100); // 100ms debounce
        });

        this.els.seekContainer.addEventListener('mouseleave', () => {
            clearTimeout(previewDebounce);
            if (previewVideo) {
                previewVideo.onseeked = null;
            }
        });

        // PiP
        this.els.btnPip.onclick = () => this.togglePiP();
        this.els.pipExpand.onclick = () => this.restoreFromPiP();
        this.els.pipClose.onclick = () => this.closePiP();

        // Speed Menu Logic
        const toggleSpeedMenu = (e) => {
            if (e) e.stopPropagation();
            this.els.speedMenu.classList.toggle('hidden');
        };

        const updateSpeed = (rate) => {
            rate = parseFloat(rate).toFixed(2);
            // Clamp rate
            if (rate < 0.25) rate = 0.25;
            if (rate > 8) rate = 8;

            this.els.video.playbackRate = parseFloat(rate);
            this.els.speedDisplay.innerText = rate + 'x';
            this.els.btnSpeed.innerText = rate + 'x';
            this.els.speedSlider.value = rate;

            // Update presets
            this.els.speedPresets.forEach(btn => {
                if (parseFloat(btn.innerText) == parseFloat(rate)) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        };

        this.els.btnSpeed.onclick = toggleSpeedMenu;

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.els.speedMenu.contains(e.target) && e.target !== this.els.btnSpeed) {
                this.els.speedMenu.classList.add('hidden');
            }
        });

        // Prevent closing when clicking inside menu
        this.els.speedMenu.onclick = (e) => e.stopPropagation();

        // Slider
        this.els.speedSlider.oninput = (e) => updateSpeed(e.target.value);

        // Buttons
        this.els.btnSpeedMinus.onclick = () => updateSpeed(this.els.video.playbackRate - 0.25);
        this.els.btnSpeedPlus.onclick = () => updateSpeed(this.els.video.playbackRate + 0.25);

        // Presets
        this.els.speedPresets.forEach(btn => {
            btn.onclick = () => updateSpeed(btn.innerText);
        });

        // Volume
        this.els.btnVolume.onclick = () => {
            if (this.els.video.muted) {
                this.els.video.muted = false;
                this.els.volumeSlider.value = this.lastVolume || 0.5;
            } else {
                if (this.els.video.volume > 0) {
                    this.lastVolume = this.els.video.volume;
                    this.els.video.muted = true;
                    this.els.volumeSlider.value = 0;
                } else {
                    this.els.video.muted = false;
                    this.els.video.volume = this.lastVolume || 1;
                    this.els.volumeSlider.value = this.els.video.volume;
                }
            }
            this.updateVolumeUI();
        };

        this.els.volumeSlider.oninput = (e) => {
            const v = parseFloat(e.target.value);
            this.els.video.volume = v;
            this.els.video.muted = (v === 0);
            this.updateVolumeUI();
        };

        this.els.video.addEventListener('volumechange', () => this.updateVolumeUI());

        this.els.video.addEventListener('volumechange', () => this.updateVolumeUI());

        // Edit Title
        document.getElementById('group-filename').onclick = () => {
            this.app.modals.prompt("Rename File", this.currentFile.name, (newName) => {
                this.app.storage.updateFile(this.currentFile.id, { name: newName });
                this.els.filename.textContent = newName;
                this.app.ui.renderStorage(); // Refresh grid
            });
        };

        // Edit Description
        document.getElementById('group-description').onclick = () => {
            this.app.modals.prompt("Video Description", this.currentFile.description || "", (newDesc) => {
                this.app.storage.updateFile(this.currentFile.id, { description: newDesc });

                const el = document.getElementById('player-description');
                const display = newDesc || "Click to add description";
                el.textContent = display.length > 60 ? display.substring(0, 60) + '...' : display;
                el.style.fontStyle = newDesc ? 'normal' : 'italic';
                // el.title = newDesc || "";
                el.dataset.fullDescription = newDesc || "";
            }, true); // Enable textarea
        };

        document.getElementById('player-btn-delete').onclick = () => {
            this.app.modals.confirm("Delete File", "Are you sure you want to delete this file? This cannot be undone.", () => {
                this.close();
                this.app.storage.deleteFile(this.currentFile.id);
                this.app.router.goTo('storage');
            });
        };

        // Move File
        // Move File
        const btnMove = document.getElementById('player-btn-move');
        if (btnMove) {
            btnMove.onclick = () => {
                if (this.currentFile) {
                    this.app.modals.openMoveFile(this.currentFile);
                }
            };
        }

        const btnAddTs = document.getElementById('btn-add-timestamp');
        if (btnAddTs) {
            btnAddTs.onclick = () => {
                if (this.isPdf) {
                    this.openMarkModal(this.pdfPageNum, "");
                } else {
                    this.app.modals.openTimestamp(this.els.video.currentTime);
                }
            };
        }
    }

    setupPDFListeners() {
        if (this.els.btnPdfPrev) this.els.btnPdfPrev.onclick = () => this.prevPage();
        if (this.els.btnPdfNext) this.els.btnPdfNext.onclick = () => this.nextPage();

        // Text Selection for Marking
        if (this.els.pdfTextLayer) {
            this.els.pdfTextLayer.addEventListener('mouseup', () => this.handleTextSelection());
        }

        if (this.els.btnAddMark) {
            this.els.btnAddMark.onclick = () => {
                const selection = window.getSelection();
                const text = selection.toString();
                this.openMarkModal(this.pdfPageNum, text);
                if (this.els.pdfPopover) this.els.pdfPopover.classList.add('hidden');
                selection.removeAllRanges();
            };
        }

        // Hide popover on click elsewhere
        document.addEventListener('mousedown', (e) => {
            if (!this.els.pdfPopover || !this.els.pdfTextLayer) return;
            if (!this.els.pdfPopover.contains(e.target) && !this.els.pdfTextLayer.contains(e.target)) {
                this.els.pdfPopover.classList.add('hidden');
            }
        });
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0) {
            // Position popover
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            this.els.pdfPopover.style.top = (rect.bottom + window.scrollY + 10) + 'px';
            this.els.pdfPopover.style.left = (rect.left + rect.width / 2) + 'px'; // center but simple
            this.els.pdfPopover.classList.remove('hidden');
        } else {
            this.els.pdfPopover.classList.add('hidden');
        }
    }

    openMarkModal(page, text) {
        // reuse timestamp modal logic but slightly different?
        // Actually we can reuse "Add Timestamp" modal but repurpose fields
        // Since modal logic is separate, let's call a specific method on Modals if needed
        // Or just create a new specialized one. For now, reuse.
        this.app.modals.openTimestamp(page, text, true); // true = isPdf
    }

    load(file) {
        this.currentFile = file;
        this.els.filename.textContent = file.name;
        // document.getElementById('player-link').textContent = file.url; // Removed for button style

        const descEl = document.getElementById('player-description');
        const descText = file.description || "Click to add description";
        const truncated = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;

        descEl.textContent = truncated;
        descEl.style.fontStyle = file.description ? 'normal' : 'italic';
        // descEl.title = file.description || ""; // Removed default tooltip
        descEl.dataset.fullDescription = file.description || "";

        // Custom Tooltip Logic
        const tooltip = document.getElementById('video-desc-tooltip');

        descEl.onmouseenter = () => {
            const text = descEl.dataset.fullDescription;
            if (!text) return;
            tooltip.textContent = text;
            tooltip.classList.remove('hidden');

            // Position it
            const rect = descEl.getBoundingClientRect();
            tooltip.style.top = (rect.bottom + 10) + 'px';
            tooltip.style.left = rect.left + 'px';
        };

        descEl.onmouseleave = () => {
            tooltip.classList.add('hidden');
        };

        // Reset Logic
        this.els.youtubePlace.innerHTML = '';
        this.els.video.classList.remove('hidden');
        this.els.youtubePlace.classList.add('hidden');
        this.els.video.pause();
        this.els.video.src = '';

        // PiP cleanup
        if (this.app.state.isPipActive) {
            this.closePiP();
        }

        if (file.url.toLowerCase().split('.').pop() === 'pdf') {
            this.isPdf = true;
            this.togglePDFMode(true);
            this.renderPDF(file.url);
        } else if (file.type === 'youtube' || file.type === 'drive') {
            this.isPdf = false;
            this.togglePDFMode(false);
            this.els.video.classList.add('hidden');
            this.els.youtubePlace.classList.remove('hidden');

            let embedSrc = '';
            if (file.type === 'youtube') {
                embedSrc = `https://www.youtube.com/embed/${this.extractYoutubeId(file.url)}?enablejsapi=1`;
            } else if (file.type === 'drive') {
                const id = this.extractDriveId(file.url);
                embedSrc = `https://drive.google.com/file/d/${id}/preview`;
            }

            const iframe = document.createElement('iframe');
            iframe.className = 'youtube-frame';
            iframe.src = embedSrc;
            iframe.allow = "autoplay; encrypted-media; fullscreen";
            this.els.youtubePlace.appendChild(iframe);
        } else {
            this.isPdf = false;
            this.togglePDFMode(false);
            let src = file.url;
            if (file.type === 'dropbox') {
                src = src.replace('dl=0', 'raw=1');
            }
            this.els.video.src = src;
            this.els.video.play().catch(e => console.log("Autoplay blocked"));
            this.els.btnPlay.innerHTML = '<i class="ph-fill ph-pause"></i>';
        }

        this.renderTimestamps();
        this.renderSeekMarkers();
        this.els.overlay.classList.remove('hidden');
    }

    togglePDFMode(active) {
        const bottomBar = document.querySelector('.player-bottom-bar');
        const controlsLeft = document.querySelector('.controls-left');

        if (active) {
            document.getElementById('main-video').classList.add('hidden');
            document.getElementById('youtube-placeholder').classList.add('hidden');
            this.els.pdfStage.classList.remove('hidden');

            this.els.seekContainer.classList.add('hidden');

            // Hide entire left controls (Play + Volume + Time)
            if (controlsLeft) controlsLeft.classList.add('hidden');
            this.els.timeDisplay.classList.add('hidden');

            this.els.speedMenu.classList.add('hidden');
            document.getElementById('btn-speed').classList.add('hidden');

            this.els.pdfControls.classList.remove('hidden');
            this.els.btnPip.classList.add('hidden');

            // Slim Bar Class
            if (bottomBar) bottomBar.classList.add('pdf-slim-bar');
        } else {
            document.getElementById('main-video').classList.remove('hidden');
            this.els.pdfStage.classList.add('hidden');

            this.els.seekContainer.classList.remove('hidden');

            if (controlsLeft) controlsLeft.classList.remove('hidden');
            this.els.timeDisplay.classList.remove('hidden');

            document.getElementById('btn-speed').classList.remove('hidden');

            this.els.pdfControls.classList.add('hidden');
            this.els.btnPip.classList.remove('hidden');

            if (bottomBar) bottomBar.classList.remove('pdf-slim-bar');
        }
    }

    async renderPDF(url) {
        this.pdfPageNum = 1;
        this.els.pdfTextLayer.innerHTML = '';
        const loadingTask = pdfjsLib.getDocument(url);
        this.pdfDoc = await loadingTask.promise;
        this.els.pdfPageNum.textContent = `${this.pdfPageNum} / ${this.pdfDoc.numPages}`;
        this.renderPage(this.pdfPageNum);
    }

    async renderPage(num) {
        const page = await this.pdfDoc.getPage(num);
        const availableWidth = this.els.pdfStage.clientWidth - 80;
        const viewport = page.getViewport({ scale: 1 });
        const scale = availableWidth / viewport.width;
        const finalViewport = page.getViewport({ scale: scale });

        const canvas = this.els.pdfRender;
        const context = canvas.getContext('2d');
        canvas.height = finalViewport.height;
        canvas.width = finalViewport.width;

        await page.render({ canvasContext: context, viewport: finalViewport }).promise;

        this.els.pdfTextLayer.innerHTML = '';
        this.els.pdfTextLayer.style.height = canvas.height + 'px';
        this.els.pdfTextLayer.style.width = canvas.width + 'px';
        this.els.pdfTextLayer.style.setProperty('--scale-factor', scale);

        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: this.els.pdfTextLayer,
            viewport: finalViewport,
            textDivs: []
        });

        this.els.pdfPageNum.textContent = `${num} / ${this.pdfDoc.numPages}`;
    }

    prevPage() {
        if (this.pdfPageNum > 1) {
            this.pdfPageNum--;
            this.renderPage(this.pdfPageNum);
        }
    }

    nextPage() {
        if (this.pdfPageNum < this.pdfDoc.numPages) {
            this.pdfPageNum++;
            this.renderPage(this.pdfPageNum);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.els.playerContent.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            this.els.btnFullscreen.innerHTML = '<i class="ph-bold ph-corners-in"></i>';
        } else {
            document.exitFullscreen();
            this.els.btnFullscreen.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
        }
    }

    toggleSidebar() {
        if (this.isCollectionMode && this.els.infoSidebar) {
            this.els.infoSidebar.classList.toggle('collapsed');
        } else if (this.els.sidebar) {
            this.els.sidebar.classList.toggle('collapsed');
        }

        if (this.els.playerContent) {
            this.els.playerContent.classList.toggle('sidebar-closed');
        }
    }

    extractYoutubeId(url) {
        const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(reg);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    extractDriveId(url) {
        // pattern: /file/d/ID/view or /open?id=ID
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
        return match2 ? match2[1] : null;
    }

    close() {
        if (!this.app.state.isPipActive) {
            this.els.video.pause();
        }
        this.els.overlay.classList.add('hidden');
    }

    togglePlay() {
        if (this.els.video.paused) {
            this.els.video.play();
            this.els.btnPlay.innerHTML = '<i class="ph-fill ph-pause"></i>';
        } else {
            this.els.video.pause();
            this.els.btnPlay.innerHTML = '<i class="ph-fill ph-play"></i>';
        }
    }

    updateProgress() {
        // Check if in collection mode first
        if (this.updateProgressCollectionAware()) {
            return; // Collection mode handled it
        }

        const cur = this.els.video.currentTime || 0;
        const dur = this.els.video.duration || 1; // Avoid div by zero
        // Calc percentage
        const pct = (cur / dur) * 100;
        this.updateUIProgress(pct);

        if (this.showRemainingTime) {
            // Show remaining: -1:30 / 3:00
            const remaining = dur - cur;
            this.els.timeDisplay.innerText = `-${this.fmt(remaining)} / ${this.fmt(dur)}`;
        } else {
            // Show standard: 1:30 / 3:00
            this.els.timeDisplay.innerText = `${this.fmt(cur)} / ${this.fmt(dur)}`;
        }
    }

    updateUIProgress(pct) {
        this.els.seekFill.style.width = pct + '%';
        this.els.seekThumb.style.left = pct + '%';
    }

    fmt(s) {
        if (!s || isNaN(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    renderSeekMarkers() {
        const div = this.els.seekMarkers;
        div.innerHTML = '';
        if (!this.currentFile) return;

        // In collection mode, the seekbar represents the single timestamp itself.
        // We don't want to overlay markers (which are relative to full video duration).
        if (this.isCollectionMode) return;

        const dur = this.els.video.duration;
        if (!dur) return;

        let ts = this.app.state.timestamps.filter(t => t.fileId === this.currentFile.id);
        if (this.isCollectionMode && this.currentCollection) {
            ts = ts.filter(t => t.collectionId === this.currentCollection.id);
        }
        ts.forEach(t => {
            const col = this.app.state.collections.find(c => c.id === t.collectionId);
            const color = col ? col.color : '#fff';

            let startPct = (t.start / dur) * 100;
            let endPct = (t.end / dur) * 100;
            let width = endPct - startPct;

            // Min width for visibility if start == end
            if (width < 0.5) width = 0.5;

            const m = document.createElement('div');
            m.className = 'seek-marker';
            m.style.left = startPct + '%';
            m.style.width = width + '%';
            m.style.backgroundColor = color;
            m.title = t.note;
            div.appendChild(m);
        });
    }

    renderTimestamps() {
        const list = this.els.sidebarList;
        list.innerHTML = '';
        if (!this.currentFile) return;

        const ts = this.app.state.timestamps.filter(t => t.fileId === this.currentFile.id);

        ts.forEach(t => {
            const col = this.app.state.collections.find(c => c.id === t.collectionId);
            const color = col ? col.color : 'transparent';
            const colName = col ? col.name : '';

            const el = document.createElement('div');
            el.className = 'timestamp-item';
            el.style.borderLeftColor = color;
            el.innerHTML = `
                <div class="ts-header">
                    <div class="ts-meta-group">
                        <span class="ts-time" style="color:${color}">${this.fmt(t.start)} - ${this.fmt(t.end)}</span>
                        <span class="ts-collection" style="color:${color}">${colName}</span>
                    </div>
                    <div class="ts-actions">
                        <button class="ts-action-btn btn-open-ts" data-tooltip="Open clip" data-tooltip-pos="left">
                            <i class="ph-bold ph-play-circle"></i>
                        </button>
                        <button class="ts-action-btn btn-edit-ts" data-tooltip="Edit" data-tooltip-pos="left">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button class="ts-action-btn btn-delete-ts" data-tooltip="Delete" data-tooltip-pos="left">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
                <span class="ts-note">${t.note}</span>
            `;

            // Delegate logic
            el.onclick = (e) => {
                // IMPORTANT: Stop propagation for button clicks to prevent list item click logic (seek)
                if (e.target.closest('.btn-open-ts')) {
                    e.stopPropagation();
                    if (col) {
                        this.loadTimestamp(t, col);
                    }
                    return;
                }
                if (e.target.closest('.btn-edit-ts')) {
                    e.stopPropagation();
                    this.app.modals.openTimestamp(null, t);
                    return;
                }
                if (e.target.closest('.btn-delete-ts')) {
                    e.stopPropagation();
                    this.app.modals.confirm("Delete Timestamp", "Are you sure?", () => {
                        this.app.storage.deleteTimestamp(t.id);
                        this.renderTimestamps();
                        this.renderSeekMarkers();
                    });
                    return;
                }

                // Seek if main card clicked
                this.els.video.currentTime = t.start;
                this.els.video.play();
            };
            list.appendChild(el);
        });
    }

    // PiP
    togglePiP() {
        if (this.app.state.isPipActive) {
            this.restoreFromPiP();
        } else {
            this.activatePiP();
        }
    }

    activatePiP() {
        this.app.state.isPipActive = true;
        this.els.videoWrapper.classList.add('pip-active');
        this.els.pipContainer.classList.remove('hidden');

        // Hide the main player overlay
        this.els.overlay.classList.add('hidden');

        // Move video element to PiP stage
        this.els.pipStage.prepend(this.els.videoWrapper);

        // PiP Controls - simplified
        const pipPlay = document.getElementById('pip-play-pause');
        const pipRewind = document.getElementById('pip-rewind');
        const pipForward = document.getElementById('pip-forward');

        const updatePiPButton = () => {
            if (pipPlay) {
                pipPlay.innerHTML = this.els.video.paused ?
                    '<i class="ph-fill ph-play"></i>' :
                    '<i class="ph-fill ph-pause"></i>';
            }
        };

        if (pipPlay) {
            pipPlay.onclick = (e) => {
                e.stopPropagation();
                this.togglePlay();
                updatePiPButton();
            };
        }
        if (pipRewind) {
            pipRewind.onclick = (e) => {
                e.stopPropagation();
                this.els.video.currentTime -= 10;
            };
        }
        if (pipForward) {
            pipForward.onclick = (e) => {
                e.stopPropagation();
                this.els.video.currentTime += 10;
            };
        }

        // Sync with video state events
        this.els.video.addEventListener('play', updatePiPButton);
        this.els.video.addEventListener('pause', updatePiPButton);

        // Initial state
        updatePiPButton();
    }

    restoreFromPiP() {
        this.app.state.isPipActive = false;
        this.els.overlay.classList.remove('hidden');
        this.els.pipContainer.classList.add('hidden');
        this.els.videoWrapper.classList.remove('pip-active');

        // Move video back
        this.els.playerStage.insertBefore(this.els.videoWrapper, this.els.playerStage.firstChild);
    }

    closePiP() {
        this.app.state.isPipActive = false;
        this.els.video.pause();
        this.els.pipContainer.classList.add('hidden');
        this.els.videoWrapper.classList.remove('pip-active');

        // Move video back (same as restore)
        this.els.playerStage.insertBefore(this.els.videoWrapper, this.els.playerStage.firstChild);
    }

    // =====================
    // Collection Mode Methods
    // =====================

    setupCollectionModeListeners() {
        const btnCloseView = document.getElementById('btn-close-collection-view');
        const btnDeleteTs = document.getElementById('btn-delete-timestamp');
        const btnMoveCol = document.getElementById('btn-move-collection');

        if (btnCloseView) {
            btnCloseView.onclick = () => {
                const colId = this.currentTimestamp?.collectionId;
                this.exitCollectionMode();
                this.close();
                if (colId) this.app.router.openCollection(colId);
            };
        }

        if (btnDeleteTs) {
            btnDeleteTs.onclick = () => {
                this.app.modals.confirm("Delete Timestamp", "Delete this timestamp?", () => {
                    const colId = this.currentTimestamp?.collectionId;
                    this.app.storage.deleteTimestamp(this.currentTimestamp.id);
                    this.exitCollectionMode();
                    this.close();
                    if (colId) {
                        this.app.router.openCollection(colId);
                        this.app.ui.renderCollectionView();
                    }
                });
            };
        }

        if (btnMoveCol) {
            btnMoveCol.onclick = () => {
                if (this.currentTimestamp) {
                    this.app.modals.openMoveTimestamp(this.currentTimestamp);
                }
            };
        }
    }

    loadTimestamp(timestamp, collection) {
        const file = this.app.state.files.find(f => f.id === timestamp.fileId);
        if (!file) return;

        this.isCollectionMode = true;
        this.currentTimestamp = timestamp;
        this.playbackRange = { start: timestamp.start, end: timestamp.end };
        this.currentCollection = collection;

        // Load the file but in collection mode
        this.load(file);

        // Set video to start time after a brief delay for load
        setTimeout(() => {
            this.els.video.currentTime = timestamp.start;
            this.els.video.play();
        }, 100);

        // Switch to collection mode UI
        this.enterCollectionMode(timestamp, collection);
    }

    enterCollectionMode(timestamp, collection) {
        this.els.overlay.classList.add('collection-mode');

        // Set collection color
        this.els.overlay.style.setProperty('--collection-color', collection.color);

        // Populate info sidebar
        const file = this.app.state.files.find(f => f.id === timestamp.fileId);
        document.getElementById('info-time-range').textContent =
            `${this.fmt(timestamp.start)} - ${this.fmt(timestamp.end)}`;
        document.getElementById('info-note').textContent = timestamp.note || 'No note';
        document.getElementById('info-file').innerHTML =
            `<i class="ph-bold ph-film-strip"></i> ${file?.name || 'Unknown'}`;
        document.getElementById('info-sidebar-title').textContent = collection.name;

        // Wire up "View original" button to exit collection mode and open the base player
        const btnViewOriginal = document.getElementById('btn-view-original');
        if (btnViewOriginal) {
            btnViewOriginal.onclick = () => {
                // Exit collection mode visuals
                this.exitCollectionMode();
                // Load the underlying file in normal player mode
                if (file) {
                    this.load(file);
                    // Optionally seek to the start of this timestamp for context
                    setTimeout(() => {
                        if (this.els.video && !isNaN(timestamp.start)) {
                            this.els.video.currentTime = timestamp.start;
                            this.updateProgress();
                        }
                    }, 100);
                }
            };
        }
    }

    exitCollectionMode() {
        this.isCollectionMode = false;
        this.currentTimestamp = null;
        this.playbackRange = null;
        this.currentCollection = null;

        this.els.overlay.classList.remove('collection-mode');
        this.els.overlay.style.removeProperty('--collection-color');
    }

    // Override updateProgress to handle collection mode
    updateProgressCollectionAware() {
        if (!this.isCollectionMode || !this.playbackRange) {
            return false; // Use normal progress
        }

        const cur = this.els.video.currentTime;
        const { start, end } = this.playbackRange;
        const rangeDuration = end - start;

        // Constrain playback
        if (cur >= end) {
            this.els.video.pause();
            this.els.video.currentTime = start;
            this.els.btnPlay.innerHTML = '<i class="ph-fill ph-play"></i>';
            return true;
        }

        if (cur < start) {
            this.els.video.currentTime = start;
        }

        // Update seekbar relative to range
        const elapsed = Math.max(0, cur - start);
        const pct = (elapsed / rangeDuration) * 100;
        this.updateUIProgress(pct);

        // Update time display
        this.els.timeDisplay.innerText = `${this.fmt(elapsed)} / ${this.fmt(rangeDuration)}`;

        return true;
    }
}

class UIManager {
    constructor(app) {
        this.app = app;
    }

    setupNavigation() {
        this.setupSearch();

        // Project Dropdown Logic
        this.setupCustomDropdown('project-dropdown', (value) => {
            if (value === 'NEW_PROJECT') {
                this.app.modals.openProject();
            } else {
                this.app.router.openProject(value);
            }
        });

        // Source Switcher Logic
        this.setupCustomDropdown('source-dropdown', (value) => {
            const triggerText = document.getElementById('source-trigger-text');
            const map = {
                'catbox': 'Catbox',
                'youtube': 'YouTube',
                'dropbox': 'Dropbox',
                'drive': 'Drive'
            };
            if (map[value]) triggerText.textContent = map[value];
            document.getElementById('source-dropdown').dataset.value = value;
        });

        // Default source value
        document.getElementById('source-dropdown').dataset.value = 'catbox';

        document.getElementById('btn-add-collection').onclick = () => this.app.modals.openCollection();

        // Expandable Add Bar Logic
        const btnExpand = document.getElementById('btn-expand-add');
        const quickBar = document.getElementById('quick-add-bar');

        const toggleAddBar = (show) => {
            if (show) {
                document.getElementById('search-bar-container').classList.add('hidden'); // Close search
                quickBar.classList.remove('hidden');
                document.getElementById('input-add-url').focus();
            } else {
                quickBar.classList.add('hidden');
            }
        };

        btnExpand.onclick = (e) => {
            e.stopPropagation();
            const isHidden = quickBar.classList.contains('hidden');
            toggleAddBar(isHidden);
        };

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!quickBar.contains(e.target) && !btnExpand.contains(e.target) && !quickBar.classList.contains('hidden')) {
                // Check if we are clicking a dropdown inside
                if (!e.target.closest('.custom-select-menu')) {
                    toggleAddBar(false);
                }
            }
        });


        // New Folder
        document.getElementById('btn-add-folder').onclick = () => {
            if (!this.app.state.activeProjectId) return;
            this.app.modals.prompt("New Folder", "New Folder", (name) => {
                if (name) {
                    this.app.storage.addFolder(name, this.app.state.currentFolderId);
                    this.renderStorage();
                    toggleAddBar(false);
                }
            });
        };

        document.getElementById('btn-add-media').onclick = () => {
            if (!this.app.state.activeProjectId) return;

            const type = document.getElementById('source-dropdown').dataset.value || 'catbox';
            const url = document.getElementById('input-add-url').value;
            if (!url) return;

            const name = "New File " + Math.floor(Math.random() * 1000);
            this.app.storage.addFile(name, url, type, this.app.state.currentFolderId);
            document.getElementById('input-add-url').value = '';
            this.renderStorage();
            toggleAddBar(false);
        };
    }

    setupSearch() {
        const toggleBtn = document.getElementById('btn-search-toggle');
        const container = document.getElementById('search-bar-container');
        const input = document.getElementById('search-input');
        const results = document.getElementById('search-results');

        // Exclusive toggling
        const closeAddBar = () => {
            document.getElementById('quick-add-bar').classList.add('hidden');
        };

        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isHidden = container.classList.contains('hidden');
            if (isHidden) {
                closeAddBar();
                container.classList.remove('hidden');
                input.focus();
            } else {
                container.classList.add('hidden');
            }
        };

        // Close on click outside
        window.addEventListener('click', (e) => {
            if (!container.classList.contains('hidden') && !container.contains(e.target) && e.target !== toggleBtn) {
                container.classList.add('hidden');
                toggleBtn.style.display = 'flex';
                input.value = '';
                results.classList.add('hidden');
            }
        });

        input.oninput = (e) => this.handleSearch(e.target.value);
    }

    handleSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!query || query.trim().length === 0) {
            resultsContainer.classList.add('hidden');
            resultsContainer.innerHTML = '';
            return;
        }

        const term = query.toLowerCase();
        // Search all files active project
        const projectFiles = this.app.state.files.filter(f => f.projectId === this.app.state.activeProjectId);

        const matches = projectFiles.filter(f => f.name.toLowerCase().includes(term));

        this.renderSearchResults(matches.slice(0, 10)); // Limit 10
    }

    renderSearchResults(matches) {
        const container = document.getElementById('search-results');
        container.innerHTML = '';

        if (matches.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:var(--text-muted); font-size:12px; text-align:center;">No results found.</div>';
            container.classList.remove('hidden');
            return;
        }

        matches.forEach(f => {
            const item = document.createElement('div');
            item.className = 'search-result-item';

            let icon = 'ph-file';
            if (f.type === 'folder') icon = 'ph-folder';
            else if (f.type === 'youtube') icon = 'ph-youtube-logo';
            else if (f.type === 'image') icon = 'ph-image';

            // Construct pseudo path (parent name)
            let pathHint = '';
            if (f.parentId) {
                const parent = this.app.state.files.find(p => p.id === f.parentId);
                if (parent) pathHint = parent.name;
            } else {
                pathHint = '/';
            }

            item.innerHTML = `
                <i class="ph-bold ${icon}"></i>
                <span>${f.name}</span>
                <span class="search-result-path">${pathHint}</span>
            `;

            item.onclick = () => {
                if (f.type === 'folder') {
                    this.app.state.currentFolderId = f.id;
                    this.renderStorage();
                } else {
                    this.app.player.load(f);
                }
                // Close search
                document.getElementById('search-bar-container').classList.add('hidden');
                document.getElementById('search-input').value = '';
                container.classList.add('hidden');
            };

            container.appendChild(item);
        });

        container.classList.remove('hidden');
    }

    setupCustomDropdown(id, onSelect) {
        const wrapper = document.getElementById(id);
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const menu = wrapper.querySelector('.custom-select-menu');

        trigger.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-menu').forEach(el => {
                if (el !== menu) el.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        };

        menu.onclick = (e) => {
            const item = e.target.closest('.custom-select-item');
            if (!item || item.classList.contains('separator')) return;

            const value = item.dataset.value;
            onSelect(value);
            menu.classList.add('hidden');

            menu.querySelectorAll('.custom-select-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        };

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }

    renderProjectDropdown() {
        const menu = document.getElementById('project-menu');
        const triggerText = document.getElementById('project-trigger-text');
        menu.innerHTML = '';

        const currentId = this.app.state.activeProjectId;

        if (currentId) {
            const p = this.app.state.projects.find(x => x.id === currentId);
            if (p) triggerText.textContent = p.name;
        } else {
            triggerText.textContent = "Select Project";
        }

        this.app.state.projects.forEach(p => {
            const item = document.createElement('div');
            item.className = 'custom-select-item';
            if (p.id === currentId) item.classList.add('selected');
            item.dataset.value = p.id;
            item.textContent = p.name;
            menu.appendChild(item);
        });

        const sep = document.createElement('div');
        sep.className = 'custom-select-item separator';
        menu.appendChild(sep);

        const newItem = document.createElement('div');
        newItem.className = 'custom-select-item';
        newItem.style.color = 'var(--accent)';
        newItem.style.fontWeight = '600';
        newItem.dataset.value = 'NEW_PROJECT';
        newItem.innerHTML = '<i class="ph-bold ph-plus" style="margin-right:6px"></i> New Project...';
        menu.appendChild(newItem);

        if (!this.app.state.activeProjectId && this.app.state.projects.length > 0) {
            this.app.router.openProject(this.app.state.projects[0].id);
        }
    }

    updateSidebarForProject() {
        this.renderProjectDropdown();
        document.getElementById('project-nav-items').classList.remove('hidden');
        document.getElementById('nav-storage').classList.add('active');
        this.renderCollectionsList();
    }

    renderCollectionsList() {
        const list = document.getElementById('collections-list');
        list.innerHTML = '';
        const cols = this.app.state.collections.filter(c => c.projectId === this.app.state.activeProjectId);

        cols.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'nav-item';

            // Set dynamic color variable
            if (c.color) {
                btn.style.setProperty('--item-color', c.color);
            }

            if (c.id === this.app.state.activeCollectionId) {
                btn.classList.add('active');
            }
            btn.innerHTML = `<span style="color:${c.color || '#6366f1'}">●</span> ${c.name}`;
            btn.onclick = () => {
                this.app.router.openCollection(c.id);
                // Manually update active state to reflect immediately if router doesn't full re-render sidebar
                this.renderCollectionsList();
            };
            list.appendChild(btn);
        });
    }

    renderStorage() {
        const grid = document.getElementById('storage-grid');
        grid.innerHTML = '';

        // Breadcrumbs
        this.renderBreadcrumbs();

        if (!this.app.state.activeProjectId) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color: var(--text-muted); padding-top: 40px;">No project selected.</div>';
            return;
        }

        const files = this.app.storage.getItems(this.app.state.activeProjectId, this.app.state.currentFolderId);

        files.forEach(f => {
            let icon = 'ph-file';
            let isFolder = false;
            if (f.type === 'youtube') icon = 'ph-youtube-logo';
            else if (f.type === 'dropbox') icon = 'ph-dropbox-logo';
            else if (f.type === 'drive') icon = 'ph-google-drive-logo';
            else if (f.type === 'catbox') {
                if (f.url && f.url.toLowerCase().split('.').pop() === 'pdf') {
                    icon = 'ph-file-pdf';
                } else {
                    icon = 'ph-film-strip';
                }
            }
            else if (f.type === 'folder') {
                icon = 'ph-folder-simple';
                isFolder = true;
            }

            const card = document.createElement('div');
            card.className = 'card';
            if (isFolder) card.classList.add('card-folder');

            // DRAG AND DROP ATTRIBUTES
            card.draggable = true;
            card.dataset.id = f.id;
            card.dataset.type = f.type;

            const desc = f.description || '';
            const truncDesc = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;

            // Different layout for folder vs file? reusing same for consistency
            card.innerHTML = `
                <div class="card-thumbnail">
                    <i class="ph-duotone ${icon} card-thumb-icon" style="${isFolder ? 'color: var(--accent);' : ''}"></i>
                </div>
                <div class="card-text">
                    <span class="card-title">${f.name}</span>
                    <span class="card-description">${isFolder ? 'Folder' : (truncDesc || 'No description')}</span>
                </div>
                <span class="card-meta">${new Date(f.created).toLocaleDateString()}</span>
                <div class="card-actions">
                    ${!isFolder ? `
                    <button class="card-action-btn" data-action="open" data-tooltip="Open Link"><i class="ph-bold ph-arrow-square-out"></i></button>
                    <button class="card-action-btn" data-action="copy" data-tooltip="Copy URL"><i class="ph-bold ph-copy"></i></button>
                    <button class="card-action-btn" data-action="share" data-tooltip="Share"><i class="ph-bold ph-share-network"></i></button>
                    <button class="card-action-btn" data-action="move" data-tooltip="Move to Folder"><i class="ph-bold ph-folder-notch-plus"></i></button>
                    ` : ''}
                    <button class="card-action-btn" data-action="edit-title" data-tooltip="Rename"><i class="ph-bold ph-pencil-simple"></i></button>
                    ${!isFolder ? `<button class="card-action-btn" data-action="edit-desc" data-tooltip="Edit Description"><i class="ph-bold ph-note-pencil"></i></button>` : ''}
                    <button class="card-action-btn card-action-danger" data-action="delete" data-tooltip="Delete"><i class="ph-bold ph-trash"></i></button>
                </div>
             `;

            // Main card click
            card.onclick = (e) => {
                if (e.target.closest('.card-actions')) return;
                if (isFolder) {
                    this.app.state.currentFolderId = f.id;
                    this.renderStorage();
                } else {
                    this.app.player.load(f);
                }
            };

            // DnD Handlers (Card Source)
            card.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', f.id);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            };

            card.ondragend = (e) => {
                card.classList.remove('dragging');
                document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over-folder'));
            };

            card.ondragover = (e) => {
                e.preventDefault();
                if (isFolder && !card.classList.contains('dragging')) {
                    card.classList.add('drag-over-folder');
                }
            };

            card.ondragleave = (e) => {
                card.classList.remove('drag-over-folder');
            };

            card.ondrop = (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId === f.id) return;

                if (isFolder) {
                    this.app.storage.moveFile(draggedId, f.id);
                    this.renderStorage();
                } else {
                    // Reorder logic (simplified insert before)
                    const allCards = Array.from(grid.children);
                    const currentIds = allCards.map(c => c.dataset.id).filter(id => id !== draggedId);
                    const dropIndex = currentIds.indexOf(f.id);

                    if (dropIndex !== -1) {
                        currentIds.splice(dropIndex, 0, draggedId);
                        this.app.storage.reorderItems(this.app.state.activeProjectId, this.app.state.currentFolderId, currentIds);
                        this.renderStorage();
                    }
                }
            };

            // Buttons...
            const bindAction = (sel, fn) => {
                const el = card.querySelector(sel);
                if (el) el.onclick = (e) => { e.stopPropagation(); fn(e); };
            };

            bindAction('[data-action="open"]', () => window.open(f.url, '_blank'));
            bindAction('[data-action="copy"]', (e) => {
                navigator.clipboard.writeText(f.url).then(() => {
                    // feedback
                });
            });
            bindAction('[data-action="share"]', () => {
                if (navigator.share) navigator.share({ title: f.name, url: f.url });
                else navigator.clipboard.writeText(f.url);
            });
            bindAction('[data-action="move"]', () => {
                this.app.modals.openMoveFile(f);
            });
            bindAction('[data-action="edit-title"]', () => {
                this.app.modals.prompt("Rename", f.name, (newName) => {
                    this.app.storage.updateFile(f.id, { name: newName });
                    this.renderStorage();
                });
            });
            bindAction('[data-action="edit-desc"]', () => {
                this.app.modals.prompt("Description", f.description || "", (newDesc) => {
                    this.app.storage.updateFile(f.id, { description: newDesc });
                    this.renderStorage();
                }, true);
            });
            bindAction('[data-action="delete"]', () => {
                this.app.modals.confirm("Delete", "Are you sure?", () => {
                    this.app.storage.deleteFile(f.id);
                    this.renderStorage();
                });
            });

            grid.appendChild(card);

            if (f.type === 'catbox' && f.url && !isFolder) {
                this.generateVideoThumbnail(f.url, card.querySelector('.card-thumbnail'));
            }
        });
    }

    renderBreadcrumbs() {
        const container = document.getElementById('breadcrumb-list');
        container.innerHTML = '';

        const path = [];
        let curr = this.app.state.currentFolderId;

        // Build Path: [Root, ...Folders]
        // Root Item
        const rootName = this.app.state.activeProjectId ?
            this.app.state.projects.find(p => p.id === this.app.state.activeProjectId)?.name : "Storage";

        path.push({ id: null, name: rootName || "Storage" });

        // Traverse Up
        const tempStack = [];
        while (curr) {
            const f = this.app.state.files.find(x => x.id === curr);
            if (f) {
                tempStack.unshift({ id: f.id, name: f.name });
                curr = f.parentId;
            } else {
                curr = null;
            }
        }

        const fullPath = path.concat(tempStack);

        fullPath.forEach((item, index) => {
            const isLast = index === fullPath.length - 1;

            const el = document.createElement('div');
            el.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
            el.textContent = item.name;

            if (!isLast) {
                el.onclick = () => {
                    this.app.state.currentFolderId = item.id;
                    this.renderStorage();
                };

                // Drag Drop Target
                el.ondragover = (e) => {
                    e.preventDefault();
                    el.classList.add('drag-over');
                };
                el.ondragleave = () => el.classList.remove('drag-over');
                el.ondrop = (e) => {
                    e.preventDefault();
                    el.classList.remove('drag-over');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId) {
                        this.app.storage.moveFile(draggedId, item.id);
                        this.renderStorage();
                    }
                };
            }

            container.appendChild(el);

            if (!isLast) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-separator';
                sep.innerHTML = '<i class="ph-bold ph-caret-right"></i>';
                container.appendChild(sep);
            }
        });
    }

    generateVideoThumbnail(url, container) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';

        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration * 0.1);
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 80;
                canvas.height = 45;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/jpeg', 0.7);
                img.className = 'card-thumb-img';

                container.innerHTML = '';
                container.appendChild(img);
            } catch (e) {
                console.log('Could not generate thumbnail:', e);
            }
            video.remove();
        };

        video.onerror = () => video.remove();
        video.src = url;
    }

    renderCollectionView() {
        const grid = document.getElementById('collection-items-grid');
        const title = document.getElementById('collection-title');
        const col = this.app.state.collections.find(c => c.id === this.app.state.activeCollectionId);
        if (!col) return;

        title.textContent = col.name;
        grid.innerHTML = '';

        const ts = this.app.state.timestamps.filter(t => t.collectionId === col.id);

        ts.forEach(t => {
            const file = this.app.state.files.find(f => f.id === t.fileId);
            const card = document.createElement('div');
            card.className = 'card';
            card.style.borderColor = col.color;
            card.innerHTML = `
                <span class="card-title" style="font-size:14px;">"${t.note}"</span>
                <span class="card-meta">${file ? file.name : 'Unknown File'}</span>
                <span class="card-meta" style="color:${col.color}">${this.app.player.fmt(t.start)}</span>
            `;
            card.onclick = () => {
                if (file) {
                    this.app.player.loadTimestamp(t, col);
                }
            };
            grid.appendChild(card);
        });
    }
}

class ModalManager {
    constructor(app) {
        this.app = app;
        this.backdrop = document.getElementById('modal-backdrop');
    }

    openMoveTimestamp(timestamp) {
        const modal = document.getElementById('modal-move-timestamp');
        const list = document.getElementById('move-timestamp-list');
        const btnCancel = document.getElementById('btn-cancel-move-timestamp');

        // Safety check
        if (!modal || !list || !btnCancel) {
            console.error("Move Timestamp modal elements missing");
            return;
        }

        list.innerHTML = '';

        // Populate collections
        const cols = this.app.state.collections.filter(c => c.projectId === this.app.state.activeProjectId);

        cols.forEach(c => {
            if (c.id === timestamp.collectionId) return; // Skip current

            const div = document.createElement('div');
            div.className = 'folder-select-item';
            div.style.borderLeft = `3px solid ${c.color}`;
            div.innerHTML = `
                <i class="ph-bold ph-folder"></i>
                <span>${c.name}</span>
            `;

            div.onclick = (e) => {
                e.stopPropagation();
                // Confirm move
                console.log("Moving timestamp", timestamp.id, "to collection", c.id);
                this.app.storage.updateTimestamp(timestamp.id, { collectionId: c.id });

                // Close modal and exit collection view
                this.close();
                this.app.player.exitCollectionMode();
                this.app.player.close();

                // Go to the new collection
                this.app.router.openCollection(c.id);
            };

            list.appendChild(div);
        });

        if (cols.length <= 1) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">No other collections available.</div>';
        }

        btnCancel.onclick = () => this.close();

        if (this.backdrop) this.backdrop.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    init() {
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) this.close();
        });

        // Project
        // Project
        document.getElementById('confirm-project').onclick = () => {
            const name = document.getElementById('input-project-name').value;
            if (name) {
                const newProject = this.app.storage.addProject(name);
                this.app.ui.renderProjectDropdown();
                this.app.router.openProject(newProject.id); // Switch to new project
                this.close();
                document.getElementById('input-project-name').value = '';
            }
        };

        // Collection
        document.getElementById('confirm-collection').onclick = () => {
            const name = document.getElementById('input-col-name').value;
            const color = document.getElementById('input-col-color').value;
            if (name) {
                this.app.storage.addCollection(name, color);
                this.app.ui.renderCollectionsList();
                this.close();
                document.getElementById('input-col-name').value = '';
            }
        };

        // Timestamp
        document.getElementById('btn-grab-start').onclick = () => {
            document.getElementById('input-ts-start').value = this.app.player.fmt(this.app.player.els.video.currentTime);
        };
        document.getElementById('btn-grab-end').onclick = () => {
            document.getElementById('input-ts-end').value = this.app.player.fmt(this.app.player.els.video.currentTime);
        };
        document.getElementById('confirm-timestamp').onclick = () => {
            const colId = this.selectedCollectionId;
            if (!colId) return alert("Please select a collection.");

            const note = document.getElementById('input-ts-note').value;

            // Parse time simple (MM:SS) -> Seconds
            const parse = (str) => {
                const parts = str.split(':');
                if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                if (parts.length === 1) return parseInt(parts[0]);
                return 0;
            };
            const start = parse(document.getElementById('input-ts-start').value);
            const end = parse(document.getElementById('input-ts-end').value);

            if (this.currentTimestampId) {
                this.app.storage.deleteTimestamp(this.currentTimestampId);
            }

            const newTs = this.app.storage.addTimestamp(colId, this.app.player.currentFile.id, start, end, note);

            // Update player current timestamp if it matches the one we just edited/deleted
            if (this.app.player.currentTimestamp && this.app.player.currentTimestamp.id === this.currentTimestampId) {
                this.app.player.currentTimestamp = newTs;
            }

            this.app.player.renderTimestamps();
            this.app.player.renderSeekMarkers();
            this.close();
        };

        // Custom Dropdown Logic
        const trig = document.getElementById('trigger-ts-collection');
        const menu = document.getElementById('menu-ts-collection');
        trig.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
            trig.classList.toggle('active');
        };
        document.addEventListener('click', () => {
            menu.classList.add('hidden');
            trig.classList.remove('active');
        });

        // Delete TS Button inside Modal
        document.getElementById('btn-delete-ts').onclick = () => {
            if (this.currentTimestampId) {
                this.confirm("Delete Timestamp", "Delete this timestamp?", () => {
                    this.app.storage.deleteTimestamp(this.currentTimestampId);
                    this.app.player.renderTimestamps();
                    this.app.player.renderSeekMarkers();
                    this.close();
                });
            }
        };

        // Confirm Yes
        document.getElementById('btn-confirm-yes').onclick = () => {
            if (this.onConfirmCallback) this.onConfirmCallback();
            document.getElementById('modal-confirm').classList.add('hidden');
            this.backdrop.classList.add('hidden');
        };

        // Prompt OK
        document.getElementById('btn-prompt-ok').onclick = () => {
            const inp = document.getElementById('input-prompt-value');
            const area = document.getElementById('input-prompt-textarea');

            const val = this.isPromptTextarea ? area.value : inp.value;

            if (this.onPromptCallback) this.onPromptCallback(val); // Allow empty string
            /* Close logic repeated for safety */
            document.getElementById('modal-prompt').classList.add('hidden');
            this.backdrop.classList.add('hidden');
        };
    }

    confirm(title, msg, callback, buttonText = 'Delete', isDanger = true) {
        this.backdrop.classList.remove('hidden');
        const m = document.getElementById('modal-confirm');
        m.classList.remove('hidden');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = msg;

        const btn = document.getElementById('btn-confirm-yes');
        btn.textContent = buttonText;
        if (isDanger) {
            btn.style.background = '#ef4444';
            btn.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
        } else {
            btn.style.background = '';
            btn.style.boxShadow = '';
        }

        this.onConfirmCallback = callback;
    }

    prompt(title, value, callback, isTextarea = false) {
        this.backdrop.classList.remove('hidden');
        const m = document.getElementById('modal-prompt');
        m.classList.remove('hidden');
        document.getElementById('prompt-title').textContent = title;

        const inp = document.getElementById('input-prompt-value');
        const area = document.getElementById('input-prompt-textarea');

        this.isPromptTextarea = isTextarea;

        if (isTextarea) {
            inp.classList.add('hidden');
            area.classList.remove('hidden');
            area.value = value;
            area.focus();
            m.style.width = '450px'; // Make it wider
        } else {
            area.classList.add('hidden');
            inp.classList.remove('hidden');
            inp.value = value;
            inp.focus();
            m.style.width = ''; // Reset width
        }

        this.onPromptCallback = callback;
    }

    openMoveFile(file) {
        this.backdrop.classList.remove('hidden');
        document.getElementById('modal-move-file').classList.remove('hidden');

        const list = document.getElementById('move-file-list');
        list.innerHTML = '';

        // Get all folders in current project
        const projectId = this.app.state.activeProjectId;
        const allItems = this.app.state.files.filter(f => f.projectId === projectId);
        const folders = allItems.filter(f => f.type === 'folder');

        // Add "Root" option
        const createItem = (id, name, isCurrent) => {
            const el = document.createElement('div');
            el.className = 'folder-select-item';
            if (isCurrent) el.classList.add('current-folder');

            el.innerHTML = `
                <i class="ph-fill ph-folder"></i>
                <span>${name}</span>
            `;

            if (isCurrent) {
                el.innerHTML += `<span class="folder-path-context">Current</span>`;
            } else {
                el.onclick = () => {
                    this.app.storage.moveFile(file.id, id);
                    if (this.app.state.currentFolderId === file.parentId) {
                        this.app.ui.renderStorage(); // Update grid if we moved it out of view
                    }
                    this.close();
                };
            }
            return el;
        };

        // Root
        list.appendChild(createItem(null, "Root Storage", file.parentId === null));

        // Folders
        folders.forEach(f => {
            // Prevent moving into itself if it's a folder (not applicable here since we move files, but safety check)
            if (file.id === f.id) return;
            list.appendChild(createItem(f.id, f.name, file.parentId === f.id));
        });
    }

    openProject() {
        this.close();
        this.backdrop.classList.remove('hidden');
        document.getElementById('modal-project').classList.remove('hidden');
    }

    openCollection() {
        this.close();
        this.backdrop.classList.remove('hidden');
        document.getElementById('modal-collection').classList.remove('hidden');
    }

    openTimestamp(currentTime, existingTs = null) {
        const cols = this.app.state.collections.filter(c => c.projectId === this.app.state.activeProjectId);
        if (cols.length === 0) return alert("Create a collection first!");

        this.close();
        this.backdrop.classList.remove('hidden');
        const m = document.getElementById('modal-timestamp');
        m.classList.remove('hidden');

        // Populate Custom Dropdown logic repeated to ensure clean state
        const menu = document.getElementById('menu-ts-collection');
        const triggerSpan = document.querySelector('#trigger-ts-collection span');
        menu.innerHTML = '';
        this.selectedCollectionId = null;

        const selectCol = (c) => {
            this.selectedCollectionId = c.id;
            triggerSpan.textContent = c.name;
            triggerSpan.style.color = c.color;
            // We'll read this.selectedCollectionId in Confirm
        };

        cols.forEach(c => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<span style="color:${c.color}">●</span> ${c.name}`;
            item.onclick = () => selectCol(c);
            menu.appendChild(item);
        });

        // Initialize State
        if (existingTs) {
            this.currentTimestampId = existingTs.id;
            document.getElementById('ts-modal-title').textContent = "Edit Timestamp";
            document.getElementById('btn-delete-ts').classList.remove('hidden');

            document.getElementById('input-ts-start').value = this.app.player.fmt(existingTs.start);
            document.getElementById('input-ts-end').value = this.app.player.fmt(existingTs.end);
            document.getElementById('input-ts-note').value = existingTs.note;

            const c = cols.find(x => x.id === existingTs.collectionId);
            if (c) selectCol(c);
            else if (cols.length > 0) selectCol(cols[0]); // Fallback
        } else {
            this.currentTimestampId = null;
            document.getElementById('ts-modal-title').textContent = "New Timestamp";
            document.getElementById('btn-delete-ts').classList.add('hidden');

            document.getElementById('input-ts-start').value = this.app.player.fmt(currentTime);
            document.getElementById('input-ts-end').value = this.app.player.fmt(currentTime);
            document.getElementById('input-ts-note').value = '';

            // Default select first
            if (cols.length > 0) selectCol(cols[0]);
        }
    }

    close() {
        this.backdrop.classList.add('hidden');
        document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
    }
}

// Start
const app = new WhistlerApp();
