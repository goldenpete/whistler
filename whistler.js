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
        this.exportImport = new ExportImportManager(this);
        this.sync = new SyncManager(this);

        this.init();
    }

    init() {
        this.storage.load();
        this.router.init();
        this.modals.init(); // Restore Modals
        this.exportImport.init(); // Initialize export/import
        this.sync.init(); // Initialize cloud sync
        this.ui.setupNavigation();
        this.ui.renderProjectDropdown(); // Initialize Dropdown & Auto-select
        
        // Show welcome page if no projects, otherwise go to storage
        if (this.state.projects.length === 0) {
            this.router.goTo('welcome');
        } else if (this.state.activeProjectId) {
            this.router.openProject(this.state.activeProjectId);
        } else if (this.state.projects.length > 0) {
            this.router.openProject(this.state.projects[0].id);
        }
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
        
        // Trigger cloud sync on data change
        if (this.app.sync) {
            this.app.sync.onDataChange();
        }
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

    addCollection(name, color, parentId = null) {
        if (!this.app.state.activeProjectId) return;
        const c = {
            id: crypto.randomUUID(),
            projectId: this.app.state.activeProjectId,
            parentId,
            name,
            color,
            created: Date.now()
        };
        this.app.state.collections.push(c);
        this.save();
        return c;
    }

    addTimestamp(collectionId, fileId, start, end, note, text = null) {
        const t = {
            id: crypto.randomUUID(),
            collectionId,
            fileId,
            start, end, note, text,
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

// ============================================
// PDF Controller - Handles all PDF operations
// ============================================
class PDFController {
    constructor(player) {
        this.player = player;
        this.doc = null;
        this.currentPage = 1;
        this.zoomLevel = 1.0;
        this.isLoading = false;

        // Highlight state - single source of truth
        this.highlightState = {
            isolate: false,
            targetText: null,
            targetPage: null
        };

        // DOM elements
        this.els = {
            stage: document.getElementById('pdf-stage'),
            container: document.getElementById('pdf-page-container'),
            canvas: document.getElementById('pdf-render'),
            textLayer: document.getElementById('pdf-text-layer'),
            pageNum: document.getElementById('pdf-page-num'),
            controls: document.getElementById('pdf-controls'),
            btnSave: document.getElementById('btn-pdf-save-highlight')
        };

        // Current selection for saving
        this.currentSelection = null;
    }

    // ============================================
    // Core Loading
    // ============================================

    async load(url, options = {}) {
        this.isLoading = true;

        // Set target page/highlight if provided (from loadTimestamp)
        if (options.targetPage) {
            this.highlightState.targetPage = options.targetPage;
            this.highlightState.targetText = options.targetText || null;
            this.highlightState.isolate = !!options.targetText;
            this.currentPage = options.targetPage;
        } else {
            // Reset for fresh load
            this.currentPage = 1;
            this.highlightState = { isolate: false, targetText: null, targetPage: null };
        }

        this.zoomLevel = 1.0;
        this.els.textLayer.innerHTML = '';

        try {
            const loadingTask = pdfjsLib.getDocument(url);
            this.doc = await loadingTask.promise;

            // Clamp page to valid range
            if (this.currentPage > this.doc.numPages) {
                this.currentPage = this.doc.numPages;
            }
            if (this.currentPage < 1) {
                this.currentPage = 1;
            }

            await this.renderCurrentPage(false); // No animation on initial load
        } catch (err) {
            console.error('PDF load error:', err);
        } finally {
            this.isLoading = false;
        }
    }

    // ============================================
    // Page Navigation
    // ============================================

    async goToPage(pageNum, animate = true) {
        if (!this.doc || pageNum < 1 || pageNum > this.doc.numPages) return;
        if (pageNum === this.currentPage && !this.highlightState.isolate) return;

        this.currentPage = pageNum;
        await this.renderCurrentPage(animate);
    }

    async prevPage() {
        // Clear isolation when manually navigating
        this.clearHighlightTarget();
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.renderCurrentPage(true);
        }
    }

    async nextPage() {
        this.clearHighlightTarget();
        if (this.doc && this.currentPage < this.doc.numPages) {
            this.currentPage++;
            await this.renderCurrentPage(true);
        }
    }

    async jumpToHighlight(page, text) {
        this.setHighlightTarget(page, text);
        this.currentPage = page;
        await this.renderCurrentPage(true);
    }

    // ============================================
    // Zoom
    // ============================================

    async zoomIn() {
        await this.changeZoom(0.25);
    }

    async zoomOut() {
        await this.changeZoom(-0.25);
    }

    async changeZoom(delta) {
        const newZoom = Math.max(0.5, Math.min(3.0, this.zoomLevel + delta));
        if (newZoom === this.zoomLevel) return;

        this.zoomLevel = newZoom;
        // Standard render with existing fade transition
        await this.renderCurrentPage(true);
    }

    // ============================================
    // Rendering
    // ============================================

    async renderCurrentPage(animate = true) {
        if (!this.doc) return;

        const container = this.els.container;

        // Animate out
        if (animate) {
            container.classList.add('pdf-transitioning');
            await this.sleep(150);
        }

        // Render
        const page = await this.doc.getPage(this.currentPage);
        const availableWidth = this.els.stage.clientWidth - 80;
        const viewport = page.getViewport({ scale: 1 });
        const scale = (availableWidth / viewport.width) * this.zoomLevel;
        const finalViewport = page.getViewport({ scale });

        const canvas = this.els.canvas;
        const context = canvas.getContext('2d');
        canvas.height = finalViewport.height;
        canvas.width = finalViewport.width;

        await page.render({ canvasContext: context, viewport: finalViewport }).promise;

        // Render text layer
        this.els.textLayer.innerHTML = '';
        this.els.textLayer.style.height = canvas.height + 'px';
        this.els.textLayer.style.width = canvas.width + 'px';
        this.els.textLayer.style.setProperty('--scale-factor', scale);

        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: this.els.textLayer,
            viewport: finalViewport,
            textDivs: []
        }).promise;

        // Apply highlights
        this.renderHighlights();

        // Update page display
        this.els.pageNum.textContent = `${this.currentPage} / ${this.doc.numPages}`;

        // Animate in
        if (animate) {
            container.classList.remove('pdf-transitioning');
        }
    }

    // ============================================
    // Highlighting
    // ============================================

    setHighlightTarget(page, text) {
        this.highlightState = {
            isolate: true,
            targetText: text,
            targetPage: page
        };
    }

    clearHighlightTarget() {
        this.highlightState = {
            isolate: false,
            targetText: null,
            targetPage: null
        };
    }

    renderHighlights() {
        const pageNum = this.currentPage;
        let highlightTexts = [];

        if (this.highlightState.isolate && this.highlightState.targetText) {
            // Show ONLY the target highlight
            highlightTexts = [this.highlightState.targetText];
        } else {
            // Show all highlights for this page
            const fileId = this.player.currentFile?.id;
            if (fileId) {
                highlightTexts = this.player.app.state.timestamps
                    .filter(t => t.fileId === fileId && t.start === pageNum && t.text)
                    .map(t => t.text);
            }
        }

        if (highlightTexts.length === 0) return;

        const normalize = (str) => str.replace(/\s+/g, ' ').trim();
        const spans = Array.from(this.els.textLayer.children);

        spans.forEach(span => {
            const content = span.textContent;
            const normContent = normalize(content);
            if (!normContent) return;

            const matched = highlightTexts.some(h => {
                const normH = normalize(h);
                return normH && (normH.includes(normContent) || normContent.includes(normH));
            });

            if (matched) {
                span.classList.add('highlighted-text');
                span.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                span.style.borderRadius = '2px';
            }
        });
    }

    // ============================================
    // Text Selection
    // ============================================

    handleTextSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (this.els.btnSave) {
            if (text.length > 0) {
                this.currentSelection = text;
                this.els.btnSave.disabled = false;
                this.els.btnSave.classList.remove('btn-disabled');
                this.els.btnSave.classList.remove('inactive'); // cleanup old class
            } else {
                this.currentSelection = null;
                this.els.btnSave.disabled = true;
                this.els.btnSave.classList.add('btn-disabled');
            }
        }
    }

    getSelectedText() {
        return this.currentSelection;
    }

    isTextSelected() {
        return !!this.currentSelection;
    }

    // ============================================
    // Utilities
    // ============================================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    get numPages() {
        return this.doc ? this.doc.numPages : 0;
    }
}

class Router {
    constructor(app) {
        this.app = app;
        this.views = {
            storage: document.getElementById('view-storage'),
            collection: document.getElementById('view-collection'),
            docs: document.getElementById('view-docs'),
            exportImport: document.getElementById('view-export-import'),
            welcome: document.getElementById('view-welcome')
        };
    }

    init() {
        document.getElementById('nav-storage').onclick = () => this.goTo('storage');
        document.getElementById('nav-docs').onclick = () => this.goTo('docs');
    }

    goTo(viewName) {
        // Hide all
        Object.values(this.views).forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Check if we should show welcome page instead (only for certain views)
        if (viewName === 'storage' || viewName === 'docs' || viewName === 'collection') {
            if (this.app.state.projects.length === 0) {
                this.goTo('welcome');
                return;
            }
        }

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
            document.getElementById('nav-docs').classList.remove('active');
            this.app.ui.renderCollectionsList(); // Re-render to clear active collections

            this.views.storage.classList.remove('hidden');
        } else if (viewName === 'collection') {
            this.app.ui.renderCollectionView();
            this.views.collection.classList.remove('hidden');

            // Update sidebar state
            document.getElementById('nav-storage').classList.remove('active');
            document.getElementById('nav-docs').classList.remove('active');
            this.app.ui.renderCollectionsList(); // Re-render to highlight active collection
        } else if (viewName === 'docs') {
            if (!this.app.state.activeProjectId) return;

            this.app.state.activeCollectionId = null;

            // Update nav state
            document.getElementById('nav-storage').classList.remove('active');
            document.getElementById('nav-docs').classList.add('active');
            this.app.ui.renderCollectionsList();

            // Load and render docs
            this.app.ui.renderDocs();

            this.views.docs.classList.remove('hidden');
        } else if (viewName === 'exportImport') {
            if (this.views.exportImport) {
                this.views.exportImport.classList.remove('hidden');
                // Initialize export/import tab
                this.app.exportImport.initTabs();
            }
        } else if (viewName === 'welcome') {
            if (this.views.welcome) {
                this.views.welcome.classList.remove('hidden');
            }
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

    openDocs() {
        this.goTo('docs');
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

            // PDF Zoom Buttons (inside pdf-controls now)
            btnPdfZoomIn: document.getElementById('btn-pdf-zoom-in'),
            btnPdfZoomOut: document.getElementById('btn-pdf-zoom-out'),
        };

        this.currentFile = null;
        this.lastVolume = 1;
        this.showRemainingTime = false;

        // Initialize PDF Controller
        this.pdf = new PDFController(this);

        // Bind PDF Zoom to controller
        if (this.els.btnPdfZoomIn) {
            this.els.btnPdfZoomIn.onclick = () => {
                if (this.isImage) this.changeImageZoom(0.25);
                else this.pdf.zoomIn();
            };
        }
        if (this.els.btnPdfZoomOut) {
            this.els.btnPdfZoomOut.onclick = () => {
                if (this.isImage) this.changeImageZoom(-0.25);
                else this.pdf.zoomOut();
            };
        }

        // Legacy PDF State
        this.isPdf = false;

        // Collection Mode State
        this.isCollectionMode = false;
        this.currentTimestamp = null;
        this.playbackRange = null;
        this.currentCollection = null;

        this.setupListeners();
        this.setupPDFListeners();
        this.setupCollectionModeListeners();
    }

    changeImageZoom(delta) {
        const img = this.els.youtubePlace.querySelector('img');
        if (!img) return;

        // simple zoom state tracking on the element or class property
        if (!this.imageZoomLevel) this.imageZoomLevel = 1;

        let newZoom = this.imageZoomLevel + delta;
        newZoom = Math.max(0.1, Math.min(newZoom, 5.0));

        this.imageZoomLevel = newZoom;
        img.style.transform = `scale(${newZoom})`;
        img.style.transformOrigin = 'center center';
        img.style.transition = 'transform 0.2s ease';
    }

    setupListeners() {
        if (this.els.btnClose) this.els.btnClose.onclick = () => this.close();
        if (this.els.btnPlay) this.els.btnPlay.onclick = () => this.togglePlay();
        if (this.els.video) this.els.video.onclick = () => this.togglePlay();
        if (this.els.btnFullscreen) this.els.btnFullscreen.onclick = () => this.toggleFullscreen();
        if (this.els.btnSidebarToggle) this.els.btnSidebarToggle.onclick = () => this.toggleSidebar();

        // PDF-specific buttons (inside pdf-controls bar)
        const btnPdfSidebar = document.getElementById('btn-pdf-sidebar-toggle');
        const btnPdfFullscreen = document.getElementById('btn-pdf-fullscreen');
        if (btnPdfSidebar) btnPdfSidebar.onclick = () => this.toggleSidebar();
        if (btnPdfFullscreen) btnPdfFullscreen.onclick = () => this.toggleFullscreen();

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

        // Change Color
        const btnColor = document.getElementById('player-btn-color');
        if (btnColor) {
            btnColor.onclick = () => {
                if (this.currentFile) {
                    const initialColor = this.currentFile.color || '#6366f1';
                    this.app.modals.openColorPicker(initialColor, (newColor) => {
                        if (newColor === null) {
                            this.app.storage.updateFile(this.currentFile.id, { color: undefined });
                        } else {
                            this.app.storage.updateFile(this.currentFile.id, { color: newColor });
                        }
                        this.app.ui.renderStorage();
                    });
                }
            };
        }

        // Sidebar Resizing
        const resizeHandle = document.getElementById('player-resize-handle');
        if (resizeHandle) {
            let isResizingSidebar = false;
            resizeHandle.addEventListener('mousedown', (e) => {
                isResizingSidebar = true;
                resizeHandle.classList.add('active');
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizingSidebar) return;

                // Calculate new width: Total Width - Mouse X
                // Assuming sidebar is on the right
                const containerWidth = document.body.clientWidth;
                let newWidth = containerWidth - e.clientX;

                // Constraints
                if (newWidth < 200) newWidth = 200;
                if (newWidth > 600) newWidth = 600;

                // Determine active sidebar
                let activeSidebar = this.els.sidebar;
                if (this.isCollectionMode && this.els.infoSidebar) {
                    activeSidebar = this.els.infoSidebar;
                }

                if (activeSidebar) {
                    activeSidebar.style.width = `${newWidth}px`;
                }
            });

            document.addEventListener('mouseup', () => {
                if (isResizingSidebar) {
                    isResizingSidebar = false;
                    resizeHandle.classList.remove('active');
                }
            });
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
        // Navigation uses PDFController
        if (this.els.btnPdfPrev) this.els.btnPdfPrev.onclick = () => this.pdf.prevPage();
        if (this.els.btnPdfNext) this.els.btnPdfNext.onclick = () => this.pdf.nextPage();

        // Text Selection uses PDFController
        if (this.els.pdfTextLayer) {
            this.els.pdfTextLayer.addEventListener('mouseup', () => this.pdf.handleTextSelection());
        }

        // Save Highlight Button
        const btnSave = document.getElementById('btn-pdf-save-highlight');
        if (btnSave) {
            this.els.btnPdfSave = btnSave;
            btnSave.onclick = () => {
                const text = this.pdf.getSelectedText();
                if (text) {
                    this.openMarkModal(this.pdf.currentPage, text);
                }
            };
        }
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (this.els.btnPdfSave) {
            if (text.length > 0) {
                this.currentPdfSelection = text;
                this.els.btnPdfSave.disabled = false;
                this.els.btnPdfSave.classList.remove('inactive');
            } else {
                this.currentPdfSelection = null;
                this.els.btnPdfSave.disabled = true;
                this.els.btnPdfSave.classList.add('inactive');
            }
        }
    }

    openMarkModal(page, text) {
        this.app.modals.openTimestamp(page, null, text, true); // true = isPdf
    }

    load(file, pdfOptions = null) {
        this.currentFile = file;
        this.els.filename.textContent = file.name;

        const descEl = document.getElementById('player-description');
        const descText = file.description || "Click to add description";
        const truncated = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;

        descEl.textContent = truncated;
        descEl.style.fontStyle = file.description ? 'normal' : 'italic';
        descEl.dataset.fullDescription = file.description || "";

        // Custom Tooltip Logic
        const tooltip = document.getElementById('video-desc-tooltip');

        descEl.onmouseenter = () => {
            const text = descEl.dataset.fullDescription;
            if (!text) return;
            tooltip.textContent = text;
            tooltip.classList.remove('hidden');

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

        const ext = file.url.toLowerCase().split('.').pop();
        const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext);

        if (isImg) {
            this.isPdf = false;
            this.isImage = true;
            this.togglePDFMode(true); // Reuse PDF UI layout
            document.getElementById('pdf-controls').classList.add('image-mode');

            // Render Image via youtubePlace (reused as generic content container)
            this.els.pdfStage.classList.add('hidden');
            this.els.video.classList.add('hidden');
            this.els.youtubePlace.classList.remove('hidden');
            this.els.youtubePlace.innerHTML = `<img src="${file.url}" draggable="false" style="width:100%; height:100%; object-fit:contain;">`;

            // Update Sidebar Title
            document.getElementById('sidebar-main-title').textContent = "Marking";

            // Set Header Icon
            const headerIcon = document.querySelector('.player-info i');
            if (headerIcon) headerIcon.className = 'ph-bold ph-image';

        } else if (isAudio) {
            this.isPdf = false;
            this.isImage = false;
            this.isAudio = true;
            this.togglePDFMode(false);
            document.getElementById('pdf-controls').classList.remove('image-mode');
            document.getElementById('sidebar-main-title').textContent = "Timestamps";

            // Audio Playback Setup
            // Hide video visually(handled in togglePDFMode or here) 
            this.els.video.classList.add('hidden');
            this.els.youtubePlace.classList.remove('hidden');

            this.els.youtubePlace.innerHTML = `
                <div class="audio-placeholder" style="display:flex; justify-content:center; align-items:center; height:100%; width:100%; color:var(--text-muted); flex-direction:column; gap:16px;">
                    <i class="ph-fill ph-music-note" style="font-size: 80px; color: var(--accent); opacity: 0.8;"></i>
                    <span style="font-size:16px; font-weight:500; opacity:0.6; letter-spacing:0.5px;">AUDIO PLAYBACK</span>
                </div>
            `;

            let src = file.url;
            if (file.type === 'dropbox') src = src.replace('dl=0', 'raw=1');
            this.els.video.src = src;
            this.els.video.play().catch(e => console.log("Autoplay blocked"));
            this.els.btnPlay.innerHTML = '<i class="ph-fill ph-pause"></i>';

            // Icon
            const headerIcon = document.querySelector('.player-info i');
            if (headerIcon) headerIcon.className = 'ph-bold ph-music-note';

        } else if (ext === 'pdf') {
            this.isPdf = true;
            this.isImage = false;
            this.isAudio = false;
            this.togglePDFMode(true);
            document.getElementById('pdf-controls').classList.remove('image-mode');
            document.getElementById('sidebar-main-title').textContent = "Timestamps";

            // Use PDFController with optional target page/highlight
            this.pdf.load(file.url, pdfOptions || {});
        } else if (file.type === 'youtube' || file.type === 'drive') {
            this.isPdf = false;
            this.isImage = false;
            this.isAudio = false;
            this.togglePDFMode(false);
            document.getElementById('pdf-controls').classList.remove('image-mode');
            document.getElementById('sidebar-main-title').textContent = "Timestamps";

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
            this.isImage = false;
            this.isAudio = false;
            this.togglePDFMode(false);
            document.getElementById('pdf-controls').classList.remove('image-mode');
            document.getElementById('sidebar-main-title').textContent = "Timestamps";

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
        const headerIcon = document.querySelector('.player-info i');

        if (active) {
            if (headerIcon) headerIcon.className = 'ph-bold ph-file-pdf';
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



            const sidebarTitle = document.getElementById('sidebar-main-title');
            if (sidebarTitle) sidebarTitle.textContent = "Highlights";

            // Slim Bar Class
            if (bottomBar) bottomBar.classList.add('pdf-slim-bar');
        } else {
            if (headerIcon) {
                if (this.isAudio) headerIcon.className = 'ph-bold ph-music-note';
                else headerIcon.className = 'ph-bold ph-film-strip';
            }
            if (!this.isAudio) document.getElementById('main-video').classList.remove('hidden');
            else document.getElementById('main-video').classList.add('hidden'); // Ensure hidden for Audio

            this.els.pdfStage.classList.add('hidden');

            this.els.seekContainer.classList.remove('hidden');

            if (controlsLeft) controlsLeft.classList.remove('hidden');
            this.els.timeDisplay.classList.remove('hidden');

            document.getElementById('btn-speed').classList.remove('hidden');

            this.els.pdfControls.classList.add('hidden');



            const sidebarTitle = document.getElementById('sidebar-main-title');
            if (sidebarTitle) sidebarTitle.textContent = "Timestamps";
            this.els.btnPip.classList.remove('hidden');

            if (bottomBar) bottomBar.classList.remove('pdf-slim-bar');
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
        const resizeHandle = document.getElementById('player-resize-handle');
        let activeSidebar = this.els.sidebar;

        if (this.isCollectionMode && this.els.infoSidebar) {
            activeSidebar = this.els.infoSidebar;
        }

        if (activeSidebar) {
            activeSidebar.classList.toggle('collapsed');
            const isCollapsed = activeSidebar.classList.contains('collapsed');

            if (resizeHandle) {
                resizeHandle.classList.toggle('collapsed', isCollapsed);
            }

            if (this.els.playerContent) {
                this.els.playerContent.classList.toggle('sidebar-closed', isCollapsed);
            }
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
                        <span class="ts-time" style="color:${color}">
                            ${t.text ? `Page ${t.start}` : `${this.fmt(t.start)} - ${this.fmt(t.end)}`}
                        </span>
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
                if (t.text) {
                    this.pdf.jumpToHighlight(t.start, t.text);
                } else {
                    this.els.video.currentTime = t.start;
                    this.els.video.play();
                }
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
        // Top bar buttons (legacy - may be hidden)
        const btnCloseView = document.getElementById('btn-close-collection-view');
        const btnDeleteTs = document.getElementById('btn-delete-timestamp');
        const btnMoveCol = document.getElementById('btn-move-collection');

        // New sidebar buttons
        const btnCloseSidebar = document.getElementById('btn-close-collection-sidebar');
        const btnDeleteSidebar = document.getElementById('btn-delete-timestamp-sidebar');
        const btnMoveSidebar = document.getElementById('btn-move-collection-sidebar');
        const btnEditSidebar = document.getElementById('btn-edit-timestamp-sidebar');

        // Close handlers
        const handleClose = () => {
            const colId = this.currentTimestamp?.collectionId;
            this.exitCollectionMode();
            this.close();
            if (colId) this.app.router.openCollection(colId);
        };
        if (btnCloseView) btnCloseView.onclick = handleClose;
        if (btnCloseSidebar) btnCloseSidebar.onclick = handleClose;

        // Delete handlers
        const handleDelete = () => {
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
        if (btnDeleteTs) btnDeleteTs.onclick = handleDelete;
        if (btnDeleteSidebar) btnDeleteSidebar.onclick = handleDelete;

        // Move handlers
        const handleMove = () => {
            if (this.currentTimestamp) {
                this.app.modals.openMoveTimestamp(this.currentTimestamp);
            }
        };
        if (btnMoveCol) btnMoveCol.onclick = handleMove;
        if (btnMoveSidebar) btnMoveSidebar.onclick = handleMove;

        // Edit handler (sidebar only)
        if (btnEditSidebar) {
            btnEditSidebar.onclick = () => {
                if (this.currentTimestamp) {
                    this.app.modals.openTimestamp(null, this.currentTimestamp);
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

        // Check if this is a PDF highlight - Robust check
        const urlExt = file.url ? file.url.toLowerCase().split('.').pop() : '';
        const isPdf = file.type === 'pdf' ||
            file.name.toLowerCase().endsWith('.pdf') ||
            urlExt === 'pdf' ||
            (timestamp.text && timestamp.text.length > 0);

        if (isPdf) {
            // Pass target page and highlight text to PDFController via load()
            this.load(file, {
                targetPage: timestamp.start,
                targetText: timestamp.text
            });
        } else {
            // Load video normally
            this.load(file);
            // Set video to start time after a brief delay for load
            setTimeout(() => {
                this.els.video.currentTime = timestamp.start;
                this.els.video.play();
            }, 100);
        }

        // Switch to collection mode UI
        this.enterCollectionMode(timestamp, collection);
    }

    enterCollectionMode(timestamp, collection) {
        this.els.overlay.classList.add('collection-mode');

        // Set collection color
        this.els.overlay.style.setProperty('--collection-color', collection.color);

        // Populate info sidebar
        const file = this.app.state.files.find(f => f.id === timestamp.fileId);
        const isPdfTs = timestamp.text != null; // Heuristic
        document.getElementById('info-time-range').textContent = isPdfTs ?
            `Page ${timestamp.start}` : `${this.fmt(timestamp.start)} - ${this.fmt(timestamp.end)}`;
        document.getElementById('info-note').textContent = timestamp.note || 'No note';

        const urlExt = file && file.url ? file.url.toLowerCase().split('.').pop() : '';
        const isPdfFile = file && (
            file.type === 'pdf' ||
            file.name.toLowerCase().endsWith('.pdf') ||
            urlExt === 'pdf'
        );
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(urlExt);
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(urlExt);

        let fileIcon = 'ph-film-strip';
        if (isPdfFile) fileIcon = 'ph-file-pdf';
        else if (isImage) fileIcon = 'ph-image';
        else if (isAudio) fileIcon = 'ph-music-note';

        document.getElementById('info-file').innerHTML =
            `<i class="ph-bold ${fileIcon}"></i> ${file?.name || 'Unknown'}`;
        // Populate file description
        const descEl = document.getElementById('info-file-desc');
        if (descEl) {
            if (file && file.description) {
                descEl.textContent = file.description;
                descEl.style.display = 'block';
                descEl.style.fontStyle = 'normal';
                descEl.style.color = 'var(--text-secondary)';
            } else {
                descEl.textContent = "No description";
                descEl.style.fontStyle = 'italic';
                descEl.style.color = 'var(--text-muted)';
            }
        }

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
        // this.setupColorPicker(); // Removed custom nav setup for picker
        this.setupSearch();
        this.initCollectionSearch();

        // Project Dropdown Logic
        this.setupCustomDropdown('project-dropdown', (value) => {
            if (value === 'NEW_PROJECT') {
                this.app.modals.openProject();
            } else {
                this.app.router.openProject(value);
            }
        });

        document.getElementById('btn-add-collection').onclick = () => this.app.modals.openCollection();

        // Add Menu Dropdown Logic
        const btnExpand = document.getElementById('btn-expand-add');
        const addMenu = document.getElementById('add-menu');

        const toggleAddMenu = (show) => {
            if (show) {
                document.getElementById('search-bar-container').classList.add('hidden'); // Close search
                addMenu.classList.remove('hidden');
            } else {
                addMenu.classList.add('hidden');
            }
        };

        btnExpand.onclick = (e) => {
            e.stopPropagation();
            const isHidden = addMenu.classList.contains('hidden');
            toggleAddMenu(isHidden);
        };

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!addMenu.contains(e.target) && !btnExpand.contains(e.target) && !addMenu.classList.contains('hidden')) {
                toggleAddMenu(false);
            }
        });

        // Add File - Open dedicated modal with hosting help
        document.getElementById('add-menu-file').onclick = () => {
            if (!this.app.state.activeProjectId) return;
            toggleAddMenu(false);
            this.app.modals.openAddFile((url) => {
                if (url) {
                    const name = "New File " + Math.floor(Math.random() * 1000);
                    this.app.storage.addFile(name, url, 'catbox', this.app.state.currentFolderId);
                    this.renderStorage();
                }
            });
        };

        // Add Folder - Open folder prompt
        document.getElementById('add-menu-folder').onclick = () => {
            if (!this.app.state.activeProjectId) return;
            toggleAddMenu(false);
            this.app.modals.prompt("New Folder", "", (name) => {
                if (name) {
                    this.app.storage.addFolder(name, this.app.state.currentFolderId);
                    this.renderStorage();
                }
            }, false, "Folder Name");
        };

        // Add Folder button in Collection View
        const btnAddClip = document.getElementById('btn-add-clip');
        if (btnAddClip) {
            btnAddClip.onclick = () => {
                if (!this.app.state.activeCollectionId) return;
                // Prompt for new sub-collection/folder name
                this.app.modals.prompt("New Folder", "Folder Name", (name) => {
                    if (name) {
                        // Get current collection's color as default
                        const currentCol = this.app.state.collections.find(c => c.id === this.app.state.activeCollectionId);
                        const color = currentCol ? currentCol.color : '#6366f1';
                        // Create as sub-collection with parentId
                        this.app.storage.addCollection(name, color, this.app.state.activeCollectionId);
                        this.renderCollectionView();
                    }
                });
            };
        }
    }



    setupSearch() {
        const toggleBtn = document.getElementById('btn-search-toggle');
        const container = document.getElementById('search-bar-container');
        const input = document.getElementById('search-input');
        // const results = document.getElementById('search-results'); // No longer using dropdown results

        // Exclusive toggling - close add menu when search opens
        const closeAddMenu = () => {
            const addMenu = document.getElementById('add-menu');
            if (addMenu) addMenu.classList.add('hidden');
        };

        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isHidden = container.classList.contains('hidden');
            if (isHidden) {
                closeAddMenu();
                container.classList.remove('hidden');
                input.focus();
            } else {
                container.classList.add('hidden');
                input.value = '';
                this.renderStorage(); // Reset view
            }
        };

        // Close on click outside
        window.addEventListener('click', (e) => {
            if (!container.classList.contains('hidden') && !container.contains(e.target) && e.target !== toggleBtn) {
                container.classList.add('hidden');
                toggleBtn.style.display = 'flex';
                input.value = '';
                // results.classList.add('hidden');
                this.renderStorage(); // Reset view
            }
        });

        input.oninput = (e) => this.renderStorage(e.target.value);
    }

    // handleSearch and renderSearchResults are deprecated by unified renderStorage logic

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

            // Only update UI if the DOM wasn't fully replaced by onSelect
            if (menu.contains(item)) {
                menu.querySelectorAll('.custom-select-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            }
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
            item.className = 'custom-select-item project-item';
            if (p.id === currentId) item.classList.add('selected');
            item.dataset.value = p.id;
            
            // Project name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'project-item-name';
            nameSpan.textContent = p.name;
            item.appendChild(nameSpan);
            
            // Action buttons container
            const actions = document.createElement('div');
            actions.className = 'project-item-actions';
            actions.innerHTML = `
                <button class="project-action-btn" data-action="edit" title="Rename"><i class="ph-bold ph-pencil-simple"></i></button>
                <button class="project-action-btn project-action-danger" data-action="delete" title="Delete"><i class="ph-bold ph-trash"></i></button>
            `;
            item.appendChild(actions);
            
            // Handle action button clicks
            actions.onclick = (e) => {
                e.stopPropagation();
                const btn = e.target.closest('.project-action-btn');
                if (!btn) return;
                
                const action = btn.dataset.action;
                if (action === 'edit') {
                    this.app.modals.prompt("Rename Project", p.name, (newName) => {
                        if (newName && newName.trim()) {
                            p.name = newName.trim();
                            this.app.storage.save();
                            this.renderProjectDropdown();
                        }
                    });
                } else if (action === 'delete') {
                    this.app.modals.confirm("Delete Project", `Delete "${p.name}"? All files, collections, and timestamps will be removed.`, () => {
                        // Remove all data associated with this project
                        this.app.state.files = this.app.state.files.filter(f => f.projectId !== p.id);
                        this.app.state.collections = this.app.state.collections.filter(c => c.projectId !== p.id);
                        this.app.state.timestamps = this.app.state.timestamps.filter(t => {
                            const file = this.app.state.files.find(f => f.id === t.fileId);
                            return file; // Only keep timestamps whose files still exist
                        });
                        this.app.state.projects = this.app.state.projects.filter(x => x.id !== p.id);
                        
                        this.app.storage.save();
                        
                        // If deleting active project, switch to another or go to welcome
                        if (this.app.state.activeProjectId === p.id) {
                            this.app.state.activeProjectId = null;
                            if (this.app.state.projects.length > 0) {
                                this.app.router.openProject(this.app.state.projects[0].id);
                            } else {
                                // No projects left, show welcome screen
                                this.app.router.goTo('welcome');
                                this.renderProjectDropdown();
                            }
                        } else {
                            this.renderProjectDropdown();
                        }
                    });
                }
            };
            
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
        // Only show top-level collections (no parentId) in sidebar, sorted by order
        const cols = this.app.state.collections
            .filter(c => c.projectId === this.app.state.activeProjectId && !c.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        cols.forEach(c => {
            const item = document.createElement('div');
            item.className = 'nav-item sidebar-collection-item'; // Added specific class for styling

            // Set dynamic color variable
            if (c.color) {
                item.style.setProperty('--item-color', c.color);
            }

            if (c.id === this.app.state.activeCollectionId) {
                item.classList.add('active');
            }

            // Name content
            const content = document.createElement('div');
            content.className = 'nav-item-content';
            content.style.cssText = 'display:flex; align-items:center; gap:8px; flex:1; overflow:hidden;';
            content.innerHTML = `<span style="color:${c.color || '#6366f1'}">●</span> <span class="nav-item-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</span>`;
            item.appendChild(content);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'sidebar-actions';
            actions.innerHTML = `
                <button class="sidebar-action-btn" title="Color"><i class="ph-bold ph-palette"></i></button>
                <button class="sidebar-action-btn" title="Rename"><i class="ph-bold ph-pencil-simple"></i></button>
                <button class="sidebar-action-btn sidebar-action-danger" title="Delete"><i class="ph-bold ph-trash"></i></button>
            `;
            item.appendChild(actions);
            
            // Drag-drop reordering
            item.setAttribute('draggable', 'true');
            item.dataset.collectionId = c.id;
            
            item.ondragstart = (e) => {
                // Don't start drag from action buttons
                if (e.target.closest('.sidebar-actions')) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', c.id);
                setTimeout(() => item.classList.add('dragging'), 0);
            };
            
            item.ondragend = () => {
                item.classList.remove('dragging');
                // Clean up any lingering drag-over states
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            };
            
            item.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const dragging = list.querySelector('.dragging');
                if (dragging && dragging !== item) {
                    item.classList.add('drag-over');
                }
            };
            
            item.ondragleave = (e) => {
                // Only remove if actually leaving the item (not entering a child)
                if (!item.contains(e.relatedTarget)) {
                    item.classList.remove('drag-over');
                }
            };
            
            item.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId && draggedId !== c.id) {
                    this.reorderCollection(draggedId, c.id);
                }
            };

            // Click behavior
            item.onclick = (e) => {
                // If clicked on action buttons, don't navigate
                if (e.target.closest('.sidebar-actions')) return;

                this.app.router.openCollection(c.id);
                this.renderCollectionsList();
            };
            
            // Bind color picker
            const colorBtn = actions.querySelector('[title="Color"]');
            colorBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.modals.openColorPicker(c.color || '#6366f1', (newColor) => {
                    c.color = newColor;
                    this.app.storage.save();
                    this.renderCollectionsList();
                    if (this.app.state.activeCollectionId === c.id) {
                        this.renderCollectionView();
                    }
                });
            };

            // Bind actions
            const editBtn = actions.querySelector('[title="Rename"]');
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.modals.prompt("Rename Collection", c.name, (newName) => {
                    if (newName) {
                        c.name = newName;
                        this.app.storage.save();
                        this.renderCollectionsList();
                        if (this.app.state.activeCollectionId === c.id) {
                            this.renderCollectionView(); // Update title/breadcrumbs if active
                        }
                    }
                });
            };

            const delBtn = actions.querySelector('[title="Delete"]');
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.modals.confirm("Delete Collection", "Are you sure? This will delete all clips inside.", () => {
                    this.app.state.collections = this.app.state.collections.filter(x => x.id !== c.id);
                    // Also delete sub-collections? 
                    // And timestamps?
                    this.app.state.timestamps = this.app.state.timestamps.filter(t => t.collectionId !== c.id);
                    // Recursive delete of sub-cols is tricky if flat list, but parentId handles reference.
                    // Ideally we should delete children too.
                    const deleteChildren = (parentId) => {
                        const children = this.app.state.collections.filter(k => k.parentId === parentId);
                        children.forEach(child => {
                            this.app.state.collections = this.app.state.collections.filter(k => k.id !== child.id);
                            this.app.state.timestamps = this.app.state.timestamps.filter(t => t.collectionId !== child.id);
                            deleteChildren(child.id);
                        });
                    };
                    deleteChildren(c.id);

                    this.app.storage.save();
                    this.renderCollectionsList();
                    if (this.app.state.activeCollectionId === c.id) {
                        this.app.router.openStorage(); // Go back home
                    }
                });
            };

            list.appendChild(item);
        });
    }
    
    reorderCollection(draggedId, targetId) {
        const collections = this.app.state.collections;
        const projectId = this.app.state.activeProjectId;
        
        // Get top-level collections for this project (sorted by current order)
        const topLevel = collections
            .filter(c => c.projectId === projectId && !c.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const draggedIdx = topLevel.findIndex(c => c.id === draggedId);
        const targetIdx = topLevel.findIndex(c => c.id === targetId);
        
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;
        
        // Remove dragged item and insert at target position
        const [dragged] = topLevel.splice(draggedIdx, 1);
        topLevel.splice(targetIdx, 0, dragged);
        
        // Update order values on the actual collection objects
        topLevel.forEach((c, i) => {
            c.order = i;
        });
        
        this.app.storage.save();
        this.renderCollectionsList();
    }

    renderStorage(searchQuery = '') {
        const grid = document.getElementById('storage-grid');
        grid.innerHTML = '';

        const query = searchQuery ? searchQuery.toLowerCase().trim() : '';

        // Breadcrumbs
        this.renderBreadcrumbs();

        if (!this.app.state.activeProjectId) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color: var(--text-muted); padding-top: 40px;">No project selected.</div>';
            return;
        }

        let files = [];

        if (query) {
            // DEEP SEARCH: Scope to current folder (or root if null)
            const currentScopeId = this.app.state.currentFolderId;

            // Helper: Get all descendant folder IDs starting from a parent
            // If parent is null (Propject Root), we get ALL folders in project
            const getDescendantFolders = (rootId) => {
                let results = [];
                // If rootId is null, start with all top-level folders? No, just all Project folders if Root.
                // Actually to make it easy: Get ALL project folders, build hierarchy?
                // Or recursive from rootId.

                const children = this.app.state.files.filter(f => f.projectId === this.app.state.activeProjectId && f.type === 'folder' && f.parentId === (rootId || null));

                children.forEach(child => {
                    results.push(child);
                    results = results.concat(getDescendantFolders(child.id));
                });
                return results;
            }

            let scopeFolders = [];
            // If we are at root, we search EVERYTHING in project
            if (!currentScopeId) {
                // All folders in project
                scopeFolders = this.app.state.files.filter(f => f.projectId === this.app.state.activeProjectId && f.type === 'folder');
            } else {
                // Current folder + descendants
                scopeFolders = getDescendantFolders(currentScopeId);
                // We also need the current folder itself? No, we filter files by parentId
            }

            // Files to search: 
            // If Root: All files in project
            // If Folder: All files where parentId is in [currentScopeId, ...descendants]

            const scopeIds = scopeFolders.map(f => f.id);
            if (currentScopeId) scopeIds.push(currentScopeId);

            let allProjectFiles = this.app.state.files.filter(f => f.projectId === this.app.state.activeProjectId);

            // Filter by Scope
            if (currentScopeId) {
                allProjectFiles = allProjectFiles.filter(f =>
                    (f.type === 'folder' && scopeIds.includes(f.id)) || // Include scoped folders
                    (f.parentId && scopeIds.includes(f.parentId)) || // Include files in scoped folders
                    (f.parentId === currentScopeId) // Direct children
                );
            }

            files = allProjectFiles.filter(f => f.name.toLowerCase().includes(query));

        } else {
            // STANDARD VIEW
            files = this.app.storage.getItems(this.app.state.activeProjectId, this.app.state.currentFolderId);
        }

        if (query && files.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color: var(--text-muted); padding-top: 40px;">No results found for "${searchQuery}"</div>`;
            return;
        }

        files.forEach(f => {
            let icon = 'ph-file';
            let isFolder = false;
            if (f.type === 'youtube') icon = 'ph-youtube-logo';
            else if (f.type === 'dropbox') icon = 'ph-dropbox-logo';
            else if (f.type === 'drive') icon = 'ph-google-drive-logo';
            else if (f.type === 'catbox') {
                const ext = f.url ? f.url.toLowerCase().split('.').pop() : '';
                if (ext === 'pdf') icon = 'ph-file-pdf';
                else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) icon = 'ph-image';
                else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) icon = 'ph-music-note';
                else icon = 'ph-film-strip';
            }
            else if (f.type === 'folder') {
                icon = 'ph-folder-simple';
                isFolder = true;
            }

            const card = document.createElement('div');
            card.className = 'card';
            if (isFolder) card.classList.add('card-folder');

            // Custom Color Logic
            if (f.color) {
                card.style.setProperty('--card-accent', f.color);
                card.classList.add('has-color');
            }

            // DRAG AND DROP ATTRIBUTES
            card.draggable = true;
            card.dataset.id = f.id;
            card.dataset.type = f.type;

            const desc = f.description || '';
            const truncDesc = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;

            // Context Badge Logic (Deep Search)
            let contextHtml = '';
            if (query && f.parentId !== this.app.state.currentFolderId) {
                // It's from a subfolder (or random place if root search)
                const parent = this.app.state.files.find(p => p.id === f.parentId);
                if (parent) {
                    contextHtml = `<div style="font-size:10px; opacity:0.7; margin-bottom:4px; display:flex; align-items:center; gap:4px;"><i class="ph-bold ph-folder" style="font-size:10px;"></i> ${parent.name}</div>`;
                }
            }


            // Determine Type Text
            let typeText = 'File';
            let typeColor = 'var(--text-muted)'; // Default grey

            if (f.type === 'catbox') {
                const ext = f.url ? f.url.toLowerCase().split('.').pop() : '';
                if (ext === 'pdf') { typeText = 'PDF'; typeColor = '#f43f5e'; }
                else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) { typeText = 'IMAGE'; typeColor = '#a855f7'; }
                else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) { typeText = 'AUDIO'; typeColor = '#06b6d4'; }
                else { typeText = 'VIDEO'; typeColor = '#818cf8'; }
            }
            else if (f.type === 'folder') { typeText = 'Folder'; }
            else if (f.type === 'youtube') { typeText = 'YouTube'; typeColor = '#ef4444'; }
            else if (f.type === 'dropbox') { typeText = 'Dropbox'; typeColor = '#3b82f6'; }
            else if (f.type === 'drive') { typeText = 'Drive'; typeColor = '#10b981'; }

            // Different layout for folder vs file? reusing same for consistency
            card.innerHTML = `
                <div class="card-thumbnail">
                    <i class="ph-duotone ${icon} card-thumb-icon" style="${isFolder ? `color: ${f.color || 'var(--accent)'};` : ''}"></i>
                </div>
                <div class="card-text">
                    ${contextHtml}
                    <span class="card-title">${f.name}</span>
                    <span class="card-description">${isFolder ? 'Folder' : (truncDesc || 'No description')}</span>
                </div>
                <div class="card-meta-group">
                    <span class="card-type-chip" style="color: ${typeColor}">${typeText}</span>
                    <span class="card-meta">${new Date(f.created).toLocaleDateString()}</span>
                </div>
                <div class="card-actions">
                    ${!isFolder ? `
                    <button class="card-action-btn" data-action="open" data-tooltip="Open Link"><i class="ph-bold ph-arrow-square-out"></i></button>
                    <button class="card-action-btn" data-action="copy" data-tooltip="Copy URL"><i class="ph-bold ph-copy"></i></button>
                    <button class="card-action-btn" data-action="share" data-tooltip="Share"><i class="ph-bold ph-share-network"></i></button>
                    <button class="card-action-btn" data-action="move" data-tooltip="Move to Folder"><i class="ph-bold ph-folder-notch-plus"></i></button>
                    ` : ''}
                    <button class="card-action-btn" data-action="edit-title" data-tooltip="Rename"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button class="card-action-btn" data-action="color" data-tooltip="Color"><i class="ph-bold ph-palette"></i></button>
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
            bindAction('[data-action="color"]', () => {
                const initialColor = f.color || '#6366f1';
                this.app.modals.openColorPicker(initialColor, (newColor) => {
                    // null means reset - remove custom color
                    if (newColor === null) {
                        this.app.storage.updateFile(f.id, { color: undefined });
                    } else {
                        this.app.storage.updateFile(f.id, { color: newColor });
                    }
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
        // Match Collection Breadcrumb container styles
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

        const path = [];

        // 1. Root "Storage"
        path.push({ type: 'storage', name: 'Storage', id: 'ROOT' });

        // 2. Project Root
        if (this.app.state.activeProjectId) {
            const proj = this.app.state.projects.find(p => p.id === this.app.state.activeProjectId);
            path.push({ type: 'project', name: proj ? proj.name : 'Unknown Project', id: null });
        }

        // 3. Folders
        let curr = this.app.state.currentFolderId;
        const tempStack = [];
        while (curr) {
            const f = this.app.state.files.find(x => x.id === curr);
            if (f) {
                tempStack.unshift({ type: 'folder', id: f.id, name: f.name });
                curr = f.parentId;
            } else {
                curr = null; // Break if not found
            }
        }

        const fullPath = path.concat(tempStack);

        fullPath.forEach((item, index) => {
            const isLast = index === fullPath.length - 1;

            const el = document.createElement('div');
            el.className = isLast ? 'breadcrumb-current' : 'breadcrumb-link';
            el.textContent = item.name;

            // Apply Styles matching renderCollectionBreadcrumbs
            el.style.fontSize = isLast ? '24px' : '14px';
            el.style.fontWeight = isLast ? '700' : '500';
            el.style.color = isLast ? 'var(--text-primary)' : 'var(--text-secondary)';
            if (!isLast) el.style.cursor = 'pointer';

            if (!isLast) {
                el.onclick = () => {
                    if (item.type === 'storage') {
                        // Go back to "No Project" / Project Selection?
                        this.app.state.activeProjectId = null;
                        this.app.state.currentFolderId = null;
                        this.app.ui.renderProjectDropdown(); // Update dropdown UI
                        this.renderStorage();
                    } else if (item.type === 'project') {
                        this.app.state.currentFolderId = null;
                        this.renderStorage();
                    } else {
                        this.app.state.currentFolderId = item.id;
                        this.renderStorage();
                    }
                };

                // Drag Drop Target
                el.ondragover = (e) => {
                    e.preventDefault();
                    if (item.type !== 'storage') { // Don't strip-tease drop on Storage label
                        el.style.color = 'var(--accent)';
                    }
                };
                el.ondragleave = () => {
                    el.style.color = 'var(--text-secondary)';
                };
                el.ondrop = (e) => {
                    e.preventDefault();
                    el.style.color = 'var(--text-secondary)';

                    if (item.type === 'storage') return; // Cannot drop on "Storage"

                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId) {
                        // Move to folder ID (item.id). For Project root, item.id is null, which works for moveFile(id, null)
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
                sep.style.color = 'var(--text-muted)';
                sep.style.fontSize = '12px';
                container.appendChild(sep);
            }
        });
    }

    generateVideoThumbnail(url, container, timestamp = null) {
        // Normalize URL for local files (Windows support)
        let safeUrl = url;
        if (typeof safeUrl === 'string' && !safeUrl.startsWith('file:') && !safeUrl.startsWith('http') && safeUrl.match(/^[a-zA-Z]:/)) {
            safeUrl = 'file:///' + safeUrl.replace(/\\/g, '/');
        }

        const video = document.createElement('video');
        // Remove crossOrigin for local files to allow loading (will taint canvas but we handle it)
        // video.crossOrigin = 'anonymous'; 
        video.muted = true;
        video.preload = 'metadata';

        video.onloadeddata = () => {
            if (timestamp !== null) {
                video.currentTime = timestamp;
            } else {
                video.currentTime = Math.min(1, video.duration * 0.1);
            }
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                // Higher resolution for background usage
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                try {
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL('image/jpeg', 0.7);
                    img.className = 'card-thumb-img';
                    container.innerHTML = '';
                    container.appendChild(img);
                } catch (err) {
                    // Fallback for tainted canvas (local files)
                    canvas.className = 'card-thumb-img';
                    container.innerHTML = '';
                    container.appendChild(canvas);
                }
            } catch (e) {
                console.log('Could not generate thumbnail:', e);
            }
            video.remove();
        };

        video.onerror = (e) => {
            console.warn('Thumbnail video load error:', safeUrl, e);
            video.remove();
        };
        video.src = safeUrl;
    }

    generatePDFThumbnail(url, container, pageNum = 1) {
        // Normalize URL for local files
        let safeUrl = url;
        if (typeof safeUrl === 'string' && !safeUrl.startsWith('file:') && !safeUrl.startsWith('http') && safeUrl.match(/^[a-zA-Z]:/)) {
            safeUrl = 'file:///' + safeUrl.replace(/\\/g, '/');
        }

        try {
            // Using global pdfjsLib
            const loadingTask = pdfjsLib.getDocument(safeUrl);
            loadingTask.promise.then(pdf => {
                // Determine page (1-based)
                const targetPage = Math.max(1, Math.min(pageNum || 1, pdf.numPages));

                pdf.getPage(targetPage).then(page => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');

                    // Render small thumbnail (width ~320px like video)
                    const viewport = page.getViewport({ scale: 1.0 });
                    const scale = 320 / viewport.width;
                    const scaledViewport = page.getViewport({ scale: scale });

                    canvas.width = scaledViewport.width;
                    canvas.height = scaledViewport.height;
                    canvas.className = 'card-thumb-img';

                    const renderContext = {
                        canvasContext: context,
                        viewport: scaledViewport
                    };

                    page.render(renderContext).promise.then(() => {
                        container.innerHTML = '';
                        container.appendChild(canvas);
                    });
                });
            }).catch(err => {
                console.error('Error loading PDF for thumbnail:', err);
            });
        } catch (e) {
            console.error('Error generating PDF thumbnail:', e);
        }
    }


    initCollectionSearch() {
        const btnSearch = document.getElementById('btn-collection-search');
        const container = document.getElementById('collection-search-container');
        const input = document.getElementById('collection-search-input');

        if (btnSearch && container && input) {
            btnSearch.onclick = (e) => {
                e.stopPropagation();
                // Toggle Hidden (display:none) instead of collapsed
                const isHidden = container.classList.contains('hidden');

                if (isHidden) {
                    container.classList.remove('hidden');
                    input.focus();
                } else {
                    container.classList.add('hidden');
                    input.value = '';
                    this.renderCollectionView(); // Reset on close
                }
            };

            input.oninput = (e) => {
                const query = e.target.value;
                this.renderCollectionView(query);
            };

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target) && !btnSearch.contains(e.target) && !container.classList.contains('hidden')) {
                    container.classList.add('hidden');
                    input.value = '';
                    this.renderCollectionView();
                }
            });
        }
    }

    renderCollectionBreadcrumbs() {
        const container = document.querySelector('#view-collection .header-breadcrumb');
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

        const path = [];
        let curr = this.app.state.collections.find(c => c.id === this.app.state.activeCollectionId);

        // Build path up to root
        while (curr) {
            path.unshift({ id: curr.id, name: curr.name });
            if (curr.parentId) {
                curr = this.app.state.collections.find(c => c.id === curr.parentId);
            } else {
                curr = null;
            }
        }

        // Add "Collection" root
        path.unshift({ id: null, name: 'Collections' });

        path.forEach((item, index) => {
            const isLast = index === path.length - 1;

            const el = document.createElement('div');
            el.className = isLast ? 'breadcrumb-current' : 'breadcrumb-link';
            el.textContent = item.name;

            // Base styles
            el.style.fontSize = isLast ? '24px' : '14px';
            el.style.fontWeight = isLast ? '700' : '500';
            el.style.color = isLast ? 'var(--text-primary)' : 'var(--text-secondary)';
            if (!isLast) el.style.cursor = 'pointer';

            if (!isLast) {
                el.onclick = () => {
                    if (item.id === null) {
                        // Go back to main storage or specific root view? 
                        // For now, maybe just do nothing or close collection view?
                        // Actually, if we are in collection view, "Collections" root might mean top level
                        // But we don't have a "Root Collection View".
                        // So let's make the FIRST actual collection the root of this view effectively 
                        // or provide a way to go to "All Collections" (which is effectively Storage view filtered?)

                        // User request: "port breadcrumb system over". 
                        // If item.id is null, it's the virtual root.
                        // Let's just navigate to the top-most parent of the current chain?
                        // Or if I click "Collections", maybe it should close the viewer?
                        // Let's leave it non-clickable for virtual root for now unless we have a "Root Collection" concept.
                    } else {
                        this.app.router.openCollection(item.id);
                    }
                };

                // Drag Drop Target (Move to parent)
                el.ondragover = (e) => {
                    e.preventDefault();
                    el.style.color = 'var(--accent)';
                };
                el.ondragleave = () => {
                    el.style.color = 'var(--text-secondary)';
                };
                el.ondrop = (e) => {
                    e.preventDefault();
                    el.style.color = 'var(--text-secondary)';

                    const draggedId = e.dataTransfer.getData('text/plain');
                    const draggedType = e.dataTransfer.getData('item-type');

                    if (!draggedId) return;

                    // Support moving both collections and timestamps
                    if (draggedType === 'collection') {
                        // Move sub-collection to this parent
                        if (draggedId !== item.id) {
                            const c = this.app.state.collections.find(x => x.id === draggedId);
                            if (c) {
                                c.parentId = item.id; // item.id can be null (root)
                                this.app.storage.save();
                                this.renderCollectionView();
                            }
                        }
                    } else if (draggedType === 'timestamp') {
                        // Move timestamp to this collection
                        if (item.id) {
                            this.app.storage.updateTimestamp(draggedId, { collectionId: item.id });
                            this.renderCollectionView();
                        }
                    }
                };
            }

            container.appendChild(el);

            if (!isLast) {
                const sep = document.createElement('span');
                sep.innerHTML = '<i class="ph-bold ph-caret-right"></i>';
                sep.style.color = 'var(--text-muted)';
                sep.style.fontSize = '12px';
                container.appendChild(sep);
            }
        });
    }

    renderCollectionView(searchQuery = '') {
        const grid = document.getElementById('collection-items-grid');
        // Breadcrumbs replace the simple title
        // update header directly in renderCollectionBreadcrumbs

        const col = this.app.state.collections.find(c => c.id === this.app.state.activeCollectionId);
        if (!col) return;

        this.renderCollectionBreadcrumbs();
        grid.innerHTML = '';

        // Helper for action button binding
        const bindAction = (card, sel, fn) => {
            const el = card.querySelector(sel);
            if (el) el.onclick = (e) => { e.stopPropagation(); fn(e); };
        };

        const query = searchQuery.toLowerCase().trim();

        let foldersToRender = [];
        let timestampsToRender = [];

        if (query) {
            // DEEP SEARCH MODE
            // 1. Gather all descendant collection IDs
            const getAllSubCols = (rootId) => {
                let results = [];
                const children = this.app.state.collections.filter(c => c.parentId === rootId);
                children.forEach(child => {
                    results.push(child);
                    results = results.concat(getAllSubCols(child.id));
                });
                return results;
            }
            const allDescendants = getAllSubCols(col.id);
            const allScopeIds = [col.id, ...allDescendants.map(c => c.id)];

            // 2. Filter Folders (Descendants)
            foldersToRender = allDescendants.filter(c => c.name.toLowerCase().includes(query));

            // 3. Filter Timestamps (In scope)
            timestampsToRender = this.app.state.timestamps.filter(t =>
                allScopeIds.includes(t.collectionId) &&
                t.note && t.note.toLowerCase().includes(query)
            );

        } else {
            // STANDARD HIERARCHY MODE
            foldersToRender = this.app.state.collections.filter(c => c.parentId === col.id);
            timestampsToRender = this.app.state.timestamps.filter(t => t.collectionId === col.id);
        }

        // RENDER FOLDERS
        foldersToRender.forEach(subCol => {
            const card = document.createElement('div');
            card.className = 'card card-folder';
            card.style.setProperty('--card-accent', subCol.color);
            card.draggable = true;
            card.dataset.id = subCol.id;
            card.dataset.type = 'collection';

            card.innerHTML = `
                <div class="card-thumbnail">
                    <i class="ph-bold ph-folder card-thumb-icon"></i>
                </div>
                <span class="card-title">${subCol.name}</span>
                <span class="card-meta">${this.app.state.timestamps.filter(t => t.collectionId === subCol.id).length} clips</span>
                <div class="collection-actions">
                    <button class="card-action-btn" data-action="edit-title" data-tooltip="Rename"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button class="card-action-btn" data-action="color" data-tooltip="Color"><i class="ph-bold ph-palette"></i></button>
                    <button class="card-action-btn card-action-danger" data-action="delete" data-tooltip="Delete"><i class="ph-bold ph-trash"></i></button>
                </div>
            `;

            // Add context if deep search
            if (query && subCol.parentId !== col.id) {
                // Maybe show parent name? 
                // For now just flat list is fine as per "searches sub-folders"
            }

            card.onclick = (e) => {
                if (e.target.closest('.collection-actions')) return;
                this.app.router.openCollection(subCol.id);
            };

            // Drag handlers for sub-collection
            card.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', subCol.id);
                e.dataTransfer.setData('item-type', 'collection');
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            };
            card.ondragend = () => {
                card.classList.remove('dragging');
                grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over-folder'));
            };
            card.ondragover = (e) => {
                e.preventDefault();
                if (!card.classList.contains('dragging')) {
                    card.classList.add('drag-over-folder');
                }
            };
            card.ondragleave = () => card.classList.remove('drag-over-folder');
            card.ondrop = (e) => {
                e.preventDefault();
                card.classList.remove('drag-over-folder');
                const draggedId = e.dataTransfer.getData('text/plain');
                const draggedType = e.dataTransfer.getData('item-type');
                if (draggedId === subCol.id) return;

                if (draggedType === 'timestamp') {
                    // Move timestamp into this sub-collection
                    this.app.storage.updateTimestamp(draggedId, { collectionId: subCol.id });
                    this.renderCollectionView();
                }
            };

            // Action buttons for sub-collection
            bindAction(card, '[data-action="edit-title"]', () => {
                this.app.modals.prompt("Rename Folder", subCol.name, (newName) => {
                    if (newName) {
                        const c = this.app.state.collections.find(x => x.id === subCol.id);
                        if (c) { c.name = newName; this.app.storage.save(); }
                        this.renderCollectionView(); // This might reset search if not careful? 
                        // Actually renderCollectionView stores no state, so search clears. 
                        // But user action usually implies "done searching". 
                        // To keep search, we'd need to pass query back. 
                        // For now, accept reset.
                    }
                });
            });
            bindAction(card, '[data-action="color"]', () => {
                this.app.modals.openColorPicker(subCol.color, (newColor) => {
                    const c = this.app.state.collections.find(x => x.id === subCol.id);
                    if (c) { c.color = newColor || '#6366f1'; this.app.storage.save(); }
                    this.renderCollectionView();
                });
            });
            bindAction(card, '[data-action="delete"]', () => {
                this.app.modals.confirm("Delete Folder", "This will delete the folder and all clips inside. Are you sure?", () => {
                    // Delete all timestamps in this sub-collection
                    this.app.state.timestamps = this.app.state.timestamps.filter(t => t.collectionId !== subCol.id);
                    // Delete the sub-collection
                    this.app.state.collections = this.app.state.collections.filter(c => c.id !== subCol.id);
                    this.app.storage.save();
                    this.renderCollectionView();
                });
            });

            grid.appendChild(card);
        });

        // RENDER TIMESTAMPS
        if (query && timestampsToRender.length === 0 && foldersToRender.length === 0) {
            grid.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted)">No results found for "${query}"</div>`;
        }

        timestampsToRender.forEach(t => {
            const file = this.app.state.files.find(f => f.id === t.fileId);
            // Resolve source collection for color context
            const sourceCol = this.app.state.collections.find(c => c.id === t.collectionId);
            const displayColor = sourceCol ? (sourceCol.color || '#6366f1') : col.color;

            const card = document.createElement('div');
            card.className = 'card collection-card';
            card.style.borderColor = displayColor;
            card.draggable = true;
            card.dataset.id = t.id;
            card.dataset.type = 'timestamp';

            // Check PDF/Image status
            const urlExt = file && file.url ? file.url.toLowerCase().split('.').pop() : '';
            const isPdf = file && (
                file.type === 'pdf' ||
                file.name.toLowerCase().endsWith('.pdf') ||
                urlExt === 'pdf'
            );
            const isImage = file && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(urlExt);
            const isAudio = file && ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(urlExt);

            let typeIcon = 'ph-film-strip';
            if (isPdf) typeIcon = 'ph-file-pdf';
            if (isImage) typeIcon = 'ph-image';
            if (isAudio) typeIcon = 'ph-music-note';

            let timeDisplay = this.app.player.fmt(t.start);
            if (isPdf) timeDisplay = `Page ${t.start}`;
            if (isImage) timeDisplay = 'Image';
            if (isAudio) timeDisplay = 'Audio';

            // Type Indicator
            const typeInd = document.createElement('div');
            typeInd.className = 'card-type-indicator';
            typeInd.innerHTML = `<i class="ph-bold ${typeIcon}"></i>`;
            card.appendChild(typeInd);

            // Background Preview
            const bg = document.createElement('div');
            bg.className = 'card-bg-preview';
            card.appendChild(bg);

            if (file && file.url) {
                if (isPdf) {
                    this.generatePDFThumbnail(file.url, bg, t.start);
                } else if (isImage) {
                    bg.style.backgroundColor = '#0f0f11';
                    bg.innerHTML = `<img src="${file.url}" style="width:100%; height:100%; object-fit:cover; opacity: 0.3;">`;
                } else if (isAudio) {
                    bg.style.display = 'flex';
                    bg.style.justifyContent = 'center';
                    bg.style.alignItems = 'center';
                    bg.style.backgroundColor = '#0f0f11';
                    bg.innerHTML = '<i class="ph-fill ph-music-note" style="font-size:48px; color: var(--accent); opacity:0.5;"></i>';
                } else {
                    this.generateVideoThumbnail(file.url, bg, t.start);
                }
            }

            // Content
            const content = document.createElement('div');
            content.className = 'card-content';

            // Context Badge implementation
            let contextHtml = '';
            if (sourceCol && sourceCol.id !== col.id) {
                contextHtml = `<span style="font-size:11px; padding:2px 6px; border-radius:4px; background:${displayColor}20; color:${displayColor}; margin-right:6px; font-weight:600;">${sourceCol.name}</span>`;
            }

            content.innerHTML = `
                <div style="display:flex; align-items:center;">
                    ${contextHtml}
                    <span class="card-meta" style="color:${displayColor}">${timeDisplay}</span>
                </div>
                <span class="card-title" style="font-size:14px; margin-top:4px;">"${t.note}"</span>
                <span class="card-meta">${file ? file.name : 'Unknown File'}</span>
            `;
            card.appendChild(content);

            // Action buttons for timestamp
            const actions = document.createElement('div');
            actions.className = 'collection-actions';
            actions.innerHTML = `
                <button class="card-action-btn" data-action="edit-note" data-tooltip="Edit Note"><i class="ph-bold ph-pencil-simple"></i></button>
                <button class="card-action-btn" data-action="move" data-tooltip="Move to Collection"><i class="ph-bold ph-folder-notch-plus"></i></button>
                <button class="card-action-btn card-action-danger" data-action="delete" data-tooltip="Delete"><i class="ph-bold ph-trash"></i></button>
            `;
            card.appendChild(actions);

            card.onclick = (e) => {
                if (e.target.closest('.collection-actions')) return;
                if (file) {
                    this.app.player.loadTimestamp(t, col);
                }
            };

            // Drag handlers for timestamp
            card.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', t.id);
                e.dataTransfer.setData('item-type', 'timestamp');
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            };
            card.ondragend = () => {
                card.classList.remove('dragging');
                grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over-folder'));
            };
            card.ondragover = (e) => e.preventDefault();
            card.ondragleave = () => { };
            card.ondrop = (e) => {
                e.preventDefault();
                // Reorder logic (simplified)
                const draggedId = e.dataTransfer.getData('text/plain');
                const draggedType = e.dataTransfer.getData('item-type');
                if (draggedId === t.id || draggedType !== 'timestamp') return;

                // Simple reorder: swap positions? For now just visual feedback
                // Full reorder would require order property on timestamps
            };

            // Action button handlers for timestamp
            bindAction(card, '[data-action="edit-note"]', () => {
                this.app.modals.prompt("Edit Note", t.note, (newNote) => {
                    if (newNote !== null) {
                        this.app.storage.updateTimestamp(t.id, { note: newNote });
                        this.renderCollectionView();
                    }
                });
            });
            bindAction(card, '[data-action="move"]', () => {
                this.app.modals.openMoveTimestamp(t);
            });
            bindAction(card, '[data-action="delete"]', () => {
                this.app.modals.confirm("Delete Clip", "Are you sure you want to delete this clip?", () => {
                    this.app.storage.deleteTimestamp(t.id);
                    this.renderCollectionView();
                });
            });

            grid.appendChild(card);
        });
    }

    // =============================================
    // DOCS TAB
    // =============================================

    // Helper to get friendly text for internal links
    getInternalLinkFriendlyText(href) {
        if (!href || !href.startsWith('whistler://')) {
            return null;
        }

        const itemValue = href.replace('whistler://', '');
        try {
            const [type, id] = itemValue.split(':');
            if (type === 'file') {
                const file = this.app.state.files.find(f => f.id === id);
                return file?.name || null;
            } else if (type === 'collection') {
                const col = this.app.state.collections.find(c => c.id === id);
                return col?.name || null;
            } else if (type === 'timestamp') {
                const ts = this.app.state.timestamps.find(t => t.id === id);
                return ts?.note || null;
            }
        } catch (err) {
            // Ignore parsing errors
        }
        return null;
    }

    // Process all internal links in editor to show friendly names
    updateInternalLinkTexts(editor) {
        const links = editor.querySelectorAll('a[href^="whistler://"]');
        links.forEach(link => {
            const friendlyText = this.getInternalLinkFriendlyText(link.href);
            if (friendlyText && link.textContent !== friendlyText) {
                // Only update if text is still the raw code or doesn't match friendly name
                const currentText = link.textContent.trim();
                const hrefValue = link.href.replace('whistler://', '');
                // Check if current text looks like raw code (contains the ID pattern)
                if (currentText === hrefValue || currentText.match(/^(file|collection|timestamp):[a-f0-9-]+$/i)) {
                    link.textContent = friendlyText;
                }
            }
        });
    }

    renderDocs() {
        const editor = document.getElementById('docs-editor');
        if (!editor) return;

        // Load content for current project
        const projectId = this.app.state.activeProjectId;
        const project = this.app.state.projects.find(p => p.id === projectId);
        editor.innerHTML = project?.docContent || '';

        // Update all internal links to show friendly names instead of raw codes
        this.updateInternalLinkTexts(editor);

        // Focus editor
        editor.focus();

        // Setup auto-save on input
        if (!editor.dataset.initialized) {
            editor.dataset.initialized = 'true';

            editor.addEventListener('input', () => {
                this.saveDocsContent();
            });

            // Setup toolbar
            this.setupDocsToolbar();
        }
    }

    saveDocsContent() {
        const editor = document.getElementById('docs-editor');
        const projectId = this.app.state.activeProjectId;
        if (!editor || !projectId) return;

        const project = this.app.state.projects.find(p => p.id === projectId);
        if (project) {
            project.docContent = editor.innerHTML;
            this.app.storage.save();
        }
    }

    setupDocsToolbar() {
        // Undo / Redo
        document.getElementById('btn-docs-undo').onclick = () => {
            document.execCommand('undo', false, null);
            document.getElementById('docs-editor').focus();
            updateButtonStates();
        };
        document.getElementById('btn-docs-redo').onclick = () => {
            document.execCommand('redo', false, null);
            document.getElementById('docs-editor').focus();
            updateButtonStates();
        };

        const editor = document.getElementById('docs-editor');

        // Bold
        document.getElementById('btn-docs-bold').onclick = () => {
            const sel = window.getSelection();

            // If collapsed caret inside bold/strong, remove formatting at caret (deterministic)
            if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                const node = sel.anchorNode;
                const el = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
                const boldEl = el && el.closest ? el.closest('b, strong') : null;
                if (boldEl) {
                    const did = removeFormattingAtCaret();
                    if (did) { updateButtonStates(); return; }
                }
            }

            // Otherwise, toggle bold normally
            document.execCommand('bold', false, null);
            editor.focus();
            updateButtonStates();
        };

        // Italic
        document.getElementById('btn-docs-italic').onclick = () => {
            document.execCommand('italic', false, null);
            document.getElementById('docs-editor').focus();
            updateButtonStates();
        };

        // Helpers for robust clear formatting
        const escapeHTML = (str) => {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const sanitizeHTMLToPlainText = (html) => {
            const tmp = document.createElement('div');
            tmp.innerHTML = html || '';

            // Normalize <br> to newline
            tmp.querySelectorAll('br').forEach(b => b.replaceWith('\n'));

            // Add newline after block elements
            tmp.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6').forEach(el => {
                if (el.nextSibling && el.nextSibling.nodeType === Node.TEXT_NODE) {
                    el.after(document.createTextNode('\n'));
                } else if (!el.nextSibling) {
                    el.appendChild(document.createTextNode('\n'));
                } else {
                    el.after(document.createTextNode('\n'));
                }
            });

            let text = tmp.textContent || '';

            // Collapse multiple line breaks to max two and trim
            text = text.replace(/\n{3,}/g, '\n\n');
            // Trim leading/trailing whitespace on each line
            text = text.split('\n').map(l => l.trim()).join('\n');
            // Trim overall
            text = text.replace(/^\s+|\s+$/g, '');

            return text;
        };

        // Caret & formatting helpers
        const getCaretCharacterOffsetWithin = (containerEl) => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            const range = sel.getRangeAt(0).cloneRange();
            const preRange = document.createRange();
            preRange.selectNodeContents(containerEl);
            preRange.setEnd(range.startContainer, range.startOffset);
            return preRange.toString().length;
        };

        const setCaretCharacterOffsetWithin = (containerEl, chars) => {
            if (chars == null) return;
            const nodeStack = [containerEl];
            let node, found = false, count = 0;
            while (nodeStack.length && !found) {
                node = nodeStack.shift();
                if (node.nodeType === Node.TEXT_NODE) {
                    const nextCount = count + node.textContent.length;
                    if (chars <= nextCount) {
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.setStart(node, Math.max(0, chars - count));
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        found = true;
                        break;
                    }
                    count = nextCount;
                } else {
                    // push children in order
                    for (let i = 0; i < node.childNodes.length; i++) nodeStack.push(node.childNodes[i]);
                }
            }
            if (!found) {
                // Fallback: place caret at end
                const range = document.createRange();
                range.selectNodeContents(containerEl);
                range.collapse(false);
                const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            }
        };

        const removeFormattingAtCaret = () => {
            const editor = document.getElementById('docs-editor');
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return false;

            const offset = getCaretCharacterOffsetWithin(editor);
            if (offset == null) return false;

            // Find text node and ancestor at offset
            let remaining = offset;
            const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
            let textNode = null;
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (remaining <= node.textContent.length) { textNode = node; break; }
                remaining -= node.textContent.length;
            }
            if (!textNode) return false;

            // Find nearest formatting ancestor
            let anc = textNode.parentElement;
            const inlineTags = ['a','b','strong','i','em','u','span','font','s','strike','mark','h1','h2','h3','h4','h5','h6'];
            const classTags = ['docs-title','docs-subtitle'];
            while (anc && anc !== editor) {
                if (inlineTags.includes(anc.tagName.toLowerCase()) || classTags.some(cls => anc.classList && anc.classList.contains(cls))) break;
                // also detect heading-like by computed style
                try {
                    const cs = window.getComputedStyle(anc);
                    const fs = parseFloat(cs.fontSize) || 0;
                    const fw = parseInt(cs.fontWeight) || 0;
                    if (fs >= 18 || fw >= 600) break;
                } catch (e) {}
                anc = anc.parentElement;
            }
            if (!anc || anc === editor) return false;

            // Replace ancestor with its plain text
            const text = anc.textContent || '';
            const txtNode = document.createTextNode(text);
            anc.parentNode.replaceChild(txtNode, anc);

            // Restore caret at original offset
            setCaretCharacterOffsetWithin(editor, offset);
            this.saveDocsContent();
            return true;
        };


        // Clear Formatting removed — button deleted from UI. Use Bold/unwrapping or selection sanitization for clearing.


        // Text Size Dropdown
        const sizeDropdown = document.getElementById('docs-size-dropdown');
        if (sizeDropdown) {
            const sizeTrigger = sizeDropdown.querySelector('.docs-dropdown-trigger');
            const sizeMenu = sizeDropdown.querySelector('.docs-dropdown-menu');
            const sizeLabel = document.getElementById('docs-size-label');

            sizeTrigger.onclick = (e) => {
                e.stopPropagation();
                sizeMenu.classList.toggle('hidden');
            };

            const applySizeToSelection = (sizePx) => {
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return;
                const size = parseFloat(sizePx);
                const lineHeight = Math.max(Math.round(size * 1.3), Math.round(size + 2));

                if (!sel.isCollapsed) {
                    const range = sel.getRangeAt(0);
                    const frag = range.cloneContents();
                    const tmp = document.createElement('div'); tmp.appendChild(frag);
                    const inner = tmp.innerHTML || '';
                    const wrapped = `<span style="font-size:${size}px;line-height:${lineHeight}px">${inner}</span>`;
                    try {
                        document.execCommand('insertHTML', false, wrapped);
                    } catch (e) {
                        // Fallback: replace with text and wrap
                        try { document.execCommand('insertText', false, tmp.textContent || ''); } catch (e2) {}
                    }
                } else {
                    // Collapsed caret: insert a temporary styled span with zero-width marker and place caret inside
                    const span = document.createElement('span');
                    span.style.fontSize = size + 'px';
                    span.style.lineHeight = lineHeight + 'px';
                    span.setAttribute('data-docs-size-placeholder', 'true');
                    span.appendChild(document.createTextNode('\u200B'));
                    const range = sel.getRangeAt(0);
                    range.insertNode(span);
                    const r = document.createRange(); r.setStart(span, span.childNodes.length); r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                }

                updateButtonStates();
                this.saveDocsContent();
            };

            sizeMenu.querySelectorAll('[data-size]').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const value = item.dataset.size;
                    applySizeToSelection(value);

                    // Update labels and active state
                    sizeMenu.querySelectorAll('.docs-format-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    sizeLabel.textContent = item.textContent.trim();

                    sizeMenu.classList.add('hidden');
                    document.getElementById('docs-editor').focus();
                };
            });
        }

        // Duplicate size dropdown handler removed — initial size dropdown is already initialized above




        // Underline button
        document.getElementById('btn-docs-underline').onclick = () => {
            document.execCommand('underline', false, null);
            document.getElementById('docs-editor').focus();
            updateButtonStates();
        };

        // Text Color button
        document.getElementById('btn-docs-text-color').onclick = () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                // If no selection, just set color for next typed text
                this.docsSavedRange = null;
            } else {
                this.docsSavedRange = sel.getRangeAt(0).cloneRange();
            }
            this.docsColorType = 'foreColor';
            this.app.modals.openColorPicker('#000000', (color) => {
                if (color) {
                    const editor = document.getElementById('docs-editor');
                    let range = null;
                    if (this.docsSavedRange) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(this.docsSavedRange);
                        range = this.docsSavedRange;
                    } else {
                        const sel = window.getSelection();
                        if (sel.rangeCount > 0) {
                            range = sel.getRangeAt(0);
                        }
                    }
                    if (range) {
                        if (!range.collapsed) {
                            document.execCommand('foreColor', false, color);
                        } else {
                            // Set color for future typing
                            document.execCommand('foreColor', false, color);
                        }
                    }
                    editor.focus();
                    updateButtonStates();
                    this.saveDocsContent();
                }
                this.docsSavedRange = null;
            });
        };

        // Highlighter button
        document.getElementById('btn-docs-highlight').onclick = () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                this.docsSavedRange = null;
            } else {
                this.docsSavedRange = sel.getRangeAt(0).cloneRange();
            }
            this.docsColorType = 'backColor';
            this.app.modals.openColorPicker('#ffff00', (color) => {
                if (color) {
                    const editor = document.getElementById('docs-editor');
                    let range = null;
                    if (this.docsSavedRange) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(this.docsSavedRange);
                        range = this.docsSavedRange;
                    } else {
                        const sel = window.getSelection();
                        if (sel.rangeCount > 0) {
                            range = sel.getRangeAt(0);
                        }
                    }
                    if (range) {
                        if (!range.collapsed) {
                            document.execCommand('backColor', false, color);
                        } else {
                            document.execCommand('backColor', false, color);
                        }
                    }
                    editor.focus();
                    updateButtonStates();
                    this.saveDocsContent();
                }
                this.docsSavedRange = null;
            });
        };



        // Link button
        document.getElementById('btn-docs-link').onclick = () => {
            this.openDocsLinkModal();
        };

        // Prevent image paste - only allow Catbox links
        editor.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    this.app.modals.alert('Image Paste Not Allowed', 'Image paste is not supported. Please insert links to images instead.');
                    return;
                }
            }
        });

        // Prevent image drag & drop
        editor.addEventListener('drop', (e) => {
            const items = e.dataTransfer.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    this.app.modals.alert('Image Drop Not Allowed', 'Image drag & drop is not supported. Please insert links to images instead.');
                    return;
                }
            }
        });

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            const heading = document.getElementById('docs-heading-dropdown'); if (heading) heading.querySelector('.docs-dropdown-menu')?.classList.add('hidden');
            const list = document.getElementById('docs-list-dropdown'); if (list) list.querySelector('.docs-dropdown-menu')?.classList.add('hidden');
            const size = document.getElementById('docs-size-dropdown'); if (size) size.querySelector('.docs-dropdown-menu')?.classList.add('hidden');
        });

        // Setup Link Modal Dropdowns
        // Type Dropdown
        this.setupCustomDropdown('docs-link-type-dropdown', (value) => {
            this.docsLinkType = value;
            const textMap = {
                'file': 'Storage File',
                'collection': 'Collection',
                'timestamp': 'Timestamp / Highlight / Marking'
            };
            document.getElementById('docs-link-type-text').textContent = textMap[value] || 'Select Type';
            this.populateDocsLinkItems();
        });

        // Item Dropdown
        this.setupCustomDropdown('docs-link-item-dropdown', (value) => {
            this.docsLinkItemValue = value;
            // Find label
            const menu = document.getElementById('docs-link-item-menu');
            const item = Array.from(menu.children).find(el => el.dataset.value === value);
            if (item) {
                document.getElementById('docs-link-item-text').textContent = item.textContent;
            }
        });

        // Link pill helpers (shows a floating pill above a link when caret is inside it)
        let docsLinkPill = document.getElementById('docs-link-pill');
        let currAnchor = null;
        const uiManager = this; // Store reference for use in nested functions
        const ensureLinkPill = () => {
            if (!docsLinkPill) {
                docsLinkPill = document.createElement('div');
                docsLinkPill.id = 'docs-link-pill';
                docsLinkPill.className = 'docs-link-pill hidden';
                docsLinkPill.innerHTML = `<span class="docs-link-pill-url" id="docs-link-pill-url"></span><div style="display:flex;gap:8px"><button class="docs-link-pill-open" id="docs-link-pill-open">Open</button><button class="docs-link-pill-edit" id="docs-link-pill-edit" title="Edit"><i class="ph-bold ph-pencil-simple"></i></button><button class="docs-link-pill-delete" id="docs-link-pill-delete" title="Delete"><i class="ph-bold ph-trash"></i></button></div>`;
                document.body.appendChild(docsLinkPill);

                // Open action
                const openBtn = document.getElementById('docs-link-pill-open');
                openBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!currAnchor) return;
                    const hrefAttr = currAnchor.getAttribute('href') || '';

                    // Internal whistler:// links should open in-app
                    if (hrefAttr.startsWith('whistler://')) {
                        const itemValue = hrefAttr.replace('whistler://','');
                        const [type, id] = itemValue.split(':');

                        if (type === 'file') {
                            const file = this.app.state.files.find(f => f.id === id);
                            if (file) {
                                // Ensure project context if available
                                if (file.projectId) this.app.state.activeProjectId = file.projectId;
                                this.app.player.load(file);
                            } else {
                                this.app.modals.alert('Error', 'File not found.');
                            }
                        } else if (type === 'collection') {
                            const col = this.app.state.collections.find(c => c.id === id);
                            if (col) {
                                this.app.router.openCollection(col.id);
                            } else {
                                this.app.modals.alert('Error', 'Collection not found.');
                            }
                        } else if (type === 'timestamp') {
                            const ts = this.app.state.timestamps.find(t => t.id === id);
                            if (ts) {
                                const col = this.app.state.collections.find(c => c.id === ts.collectionId) || null;
                                this.app.player.loadTimestamp(ts, col);
                            } else {
                                this.app.modals.alert('Error', 'Timestamp not found.');
                            }
                        } else {
                            // Unknown internal type, fallback to trying to open
                            try { window.open(hrefAttr, '_blank'); } catch (err) { /* ignore */ }
                        }

                        hideDocsLinkPill();
                        return;
                    }

                    // External URL fallback
                    if (currAnchor.href) {
                        try { window.open(currAnchor.href, '_blank'); } catch (err) { /* ignore */ }
                    }
                };

                // Edit action - open the link modal prefilled for this anchor
                const editBtn = document.getElementById('docs-link-pill-edit');
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!currAnchor) return;

                    // Select the anchor content so the link modal can operate on it
                    try {
                        const range = document.createRange();
                        range.selectNodeContents(currAnchor);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                        this.docsSavedRange = range.cloneRange();
                        this.docsEditingAnchor = currAnchor; // mark for edit

                        // Open the modal
                        this.openDocsLinkModal();

                        // Prefill fields depending on link type
                        const href = currAnchor.getAttribute('href') || currAnchor.href || '';
                        if (/^https?:\/\//i.test(href)) {
                            // External
                            document.querySelectorAll('.docs-link-tab').forEach(t => t.classList.remove('active'));
                            const extTab = document.querySelector('.docs-link-tab[data-tab="external"]');
                            if (extTab) extTab.classList.add('active');
                            document.getElementById('docs-link-external').classList.remove('hidden');
                            document.getElementById('docs-link-internal').classList.add('hidden');
                            document.getElementById('input-docs-link-url').value = href;
                        } else if (href.startsWith('whistler://')) {
                            // Internal
                            const itemValue = href.replace('whistler://','');
                            document.querySelectorAll('.docs-link-tab').forEach(t => t.classList.remove('active'));
                            const intTab = document.querySelector('.docs-link-tab[data-tab="internal"]');
                            if (intTab) intTab.classList.add('active');
                            document.getElementById('docs-link-external').classList.add('hidden');
                            document.getElementById('docs-link-internal').classList.remove('hidden');

                            // Set type & populate items, then set selected item
                            const [type, id] = itemValue.split(':');
                            this.docsLinkType = type || this.docsLinkType;
                            this.populateDocsLinkItems();
                            this.docsLinkItemValue = itemValue;

                            const menu = document.getElementById('docs-link-item-menu');
                            const item = Array.from(menu.children).find(el => el.dataset.value === itemValue);
                            if (item) document.getElementById('docs-link-item-text').textContent = item.textContent;
                        }
                    } catch (err) {
                        console.error('Failed to open link editor', err);
                    }
                };

                // Delete action - remove the anchor but keep the text
                const deleteBtn = document.getElementById('docs-link-pill-delete');
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!currAnchor) return;
                    try {
                        const text = document.createTextNode(currAnchor.textContent || '');
                        currAnchor.parentNode.replaceChild(text, currAnchor);
                        this.saveDocsContent();
                        hideDocsLinkPill();
                        currAnchor = null;
                    } catch (err) { console.error('Failed to delete link', err); }
                };

                // Clicking the pill should not remove focus from editor (prevent side-effects)
                docsLinkPill.onclick = (e) => e.stopPropagation();
            }
        };

        const hideDocsLinkPill = () => {
            if (docsLinkPill) docsLinkPill.classList.add('hidden');
        };

        // Update toolbar button states based on current selection/caret
        function updateButtonStates() {
            const btnBold = document.getElementById('btn-docs-bold');
            const btnItalic = document.getElementById('btn-docs-italic');
            const btnUnderline = document.getElementById('btn-docs-underline');
            const btnLink = document.getElementById('btn-docs-link');

            try {
                const isBold = document.queryCommandState('bold');
                const isItalic = document.queryCommandState('italic');
                const isUnderline = document.queryCommandState('underline');

                if (isBold) btnBold.classList.add('active'); else btnBold.classList.remove('active');
                if (isItalic) btnItalic.classList.add('active'); else btnItalic.classList.remove('active');
                if (isUnderline) btnUnderline.classList.add('active'); else btnUnderline.classList.remove('active');
            } catch (e) {
                // queryCommandState may throw in some contexts — ignore
            }

            // Detect if caret/selection is inside a link
            const sel = window.getSelection();
            let node = sel && sel.anchorNode ? sel.anchorNode : null;
            let anchorEl = null;
            while (node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') { anchorEl = node; break; }
                node = node.parentNode;
            }

            if (anchorEl) btnLink.classList.add('active'); else btnLink.classList.remove('active');

            // Update size dropdown active state based on computed font-size at caret
            try {
                const sizeDropdownEl = document.getElementById('docs-size-dropdown');
                const sizeLabel = document.getElementById('docs-size-label');
                if (sizeDropdownEl && sizeLabel) {
                    let n = sel && sel.anchorNode ? sel.anchorNode : null;
                    if (n && n.nodeType === Node.TEXT_NODE) n = n.parentElement;
                    let found = null;
                    while (n && n !== document.getElementById('docs-editor')) {
                        if (n.nodeType === Node.ELEMENT_NODE) {
                            const cs = window.getComputedStyle(n);
                            const fs = parseFloat(cs.fontSize) || 0;
                            if (fs) { found = fs; break; }
                        }
                        n = n.parentElement;
                    }
                    const menuItems = sizeDropdownEl.querySelectorAll('[data-size]');
                    let matched = null;
                    if (found) {
                        // Match to closest size option
                        menuItems.forEach(mi => {
                            const v = parseFloat(mi.dataset.size) || 0;
                            // choose the smallest size >= found, or closest
                            if (!matched || Math.abs(v - found) < Math.abs(parseFloat(matched.dataset.size) - found)) matched = mi;
                        });
                    }
                    menuItems.forEach(mi => mi.classList.remove('active'));
                    if (matched) { matched.classList.add('active'); sizeLabel.textContent = matched.textContent.trim(); }
                    else { sizeLabel.textContent = 'Normal'; }
                }
            } catch (e) {}


            // Show a floating pill when caret is inside a link and selection is collapsed
            if (sel && sel.isCollapsed && anchorEl) {
                currAnchor = anchorEl;
                ensureLinkPill();
                const urlEl = document.getElementById('docs-link-pill-url');

                // If external link, show the full URL (allow wrapping); if internal, show friendly title
                // Use getAttribute to get the raw href value (browser might expand href property)
                const href = currAnchor.getAttribute('href') || '';
                if (/^https?:\/\//i.test(href)) {
                    urlEl.textContent = href;
                    urlEl.style.whiteSpace = 'normal';
                    // Allow the pill to grow across most of the viewport
                    docsLinkPill.style.maxWidth = 'calc(100% - 48px)';
                } else if (href && href.startsWith('whistler://')) {
                    // Derive friendly text from internal link
                    const itemValue = href.replace('whistler://', '');
                    let friendly = itemValue; // Default to itemValue
                    
                    try {
                        const [type, id] = itemValue.split(':');
                        if (uiManager && uiManager.app && uiManager.app.state) {
                            if (type === 'file') {
                                const file = uiManager.app.state.files.find(f => f.id === id);
                                friendly = file?.name || friendly;
                            } else if (type === 'collection') {
                                const col = uiManager.app.state.collections.find(c => c.id === id);
                                friendly = col?.name || friendly;
                            } else if (type === 'timestamp') {
                                const ts = uiManager.app.state.timestamps.find(t => t.id === id);
                                friendly = ts?.note || friendly;
                            }
                        }
                    } catch (err) {
                        // Keep default friendly value if parsing fails
                    }
                    
                    urlEl.textContent = friendly;
                    urlEl.style.whiteSpace = 'nowrap';
                    docsLinkPill.style.maxWidth = '520px';
                } else {
                    urlEl.textContent = href || '';
                    urlEl.style.whiteSpace = 'normal';
                    docsLinkPill.style.maxWidth = 'calc(100% - 48px)';
                }

                // Compute a rect to position the pill
                let rect = null;
                if (sel.rangeCount > 0) {
                    const r = sel.getRangeAt(0).cloneRange();
                    r.collapse(true);
                    rect = r.getBoundingClientRect();
                }
                if (!rect || (rect.width === 0 && rect.height === 0)) {
                    rect = currAnchor.getBoundingClientRect();
                }

                // Position the pill centered above the rect; fall back below if not enough space
                docsLinkPill.classList.remove('hidden');
                requestAnimationFrame(() => {
                    const pillW = docsLinkPill.offsetWidth;
                    const pillH = docsLinkPill.offsetHeight;
                    let left = rect.left + (rect.width / 2) - (pillW / 2);
                    left = Math.max(8, Math.min(left, window.innerWidth - pillW - 8));
                    let top = rect.top - pillH - 8;
                    if (top < 8) top = rect.bottom + 8; // place below if not enough room above
                    docsLinkPill.style.left = left + 'px';
                    docsLinkPill.style.top = top + 'px';
                });
            } else {
                currAnchor = null;
                hideDocsLinkPill();
            }
        };

        // Update on selection changes and editor interactions
        document.addEventListener('selectionchange', updateButtonStates);
        editor.addEventListener('keyup', updateButtonStates);
        editor.addEventListener('mouseup', updateButtonStates);
        editor.addEventListener('blur', hideDocsLinkPill);
        window.addEventListener('scroll', hideDocsLinkPill);
        window.addEventListener('resize', hideDocsLinkPill);

        // Update on input: refresh toolbar state, cleanup placeholders, and autosave
        editor.addEventListener('input', () => {
            try {
                // Remove size placeholders when user types into them
                const placeholders = editor.querySelectorAll('span[data-docs-size-placeholder]');
                placeholders.forEach(ph => {
                    // If placeholder still has only the zero-width char, keep it until user types; otherwise remove attribute
                    if ((ph.textContent || '') !== '\u200B') {
                        ph.removeAttribute('data-docs-size-placeholder');
                    }
                });
            } catch (e) {}

            try { updateButtonStates(); } catch (e) {}
            try { this.saveDocsContent(); } catch (e) {}
        });

        // Shift+Space handler: insert non-breaking space and keep spacing consistent
        editor.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.shiftKey) {
                e.preventDefault();
                try {
                    document.execCommand('insertText', false, '\u00A0');
                } catch (ex) {
                    document.execCommand('insertHTML', false, '&nbsp;');
                }
                updateButtonStates();
            }

            // Ensure Shift+Enter inserts a <br> (soft break) which preserves spacing
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                try { document.execCommand('insertHTML', false, '<br>'); } catch (ex) {}
                updateButtonStates();
            }
        });

        // Initialize
        updateButtonStates();
        


    }

    openDocsLinkModal() {
        // Save current selection
        const selection = window.getSelection();
        this.docsSavedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        const modal = document.getElementById('modal-docs-link');
        const backdrop = document.getElementById('modal-backdrop');

        // Ensure modal is inside the backdrop container so it receives pointer events reliably
        if (backdrop && modal && modal.parentNode !== backdrop) backdrop.appendChild(modal);

        backdrop.classList.remove('hidden');
        modal.classList.remove('hidden');

        // Reset state
        document.getElementById('input-docs-link-url').value = '';
        document.getElementById('docs-link-external').classList.remove('hidden');
        document.getElementById('docs-link-internal').classList.add('hidden');
        document.querySelectorAll('.docs-link-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.docs-link-tab[data-tab="external"]').classList.add('active');

        // Tab switching
        document.querySelectorAll('.docs-link-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.docs-link-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (tab.dataset.tab === 'external') {
                    document.getElementById('docs-link-external').classList.remove('hidden');
                    document.getElementById('docs-link-internal').classList.add('hidden');
                } else {
                    document.getElementById('docs-link-external').classList.add('hidden');
                    document.getElementById('docs-link-internal').classList.remove('hidden');
                    this.populateDocsLinkItems();
                }
            };
        });

        // Type change (safe-guard in case element isn't present)
        const selTypeEl = document.getElementById('select-docs-link-type');
        if (selTypeEl) {
            selTypeEl.onchange = () => {
                this.populateDocsLinkItems();
            };
        }

        // Cancel
        document.getElementById('btn-docs-link-cancel').onclick = () => {
            this.closeDocsLinkModal();
        };

        // Confirm
        document.getElementById('btn-docs-link-confirm').onclick = () => {
            this.insertDocsLink();
        };
    }

    populateDocsLinkItems() {
        const type = this.docsLinkType || 'file'; // Default
        const menu = document.getElementById('docs-link-item-menu');
        menu.innerHTML = ''; // Clear

        // Reset selection state
        this.docsLinkItemValue = null;
        document.getElementById('docs-link-item-text').textContent = 'Select item...';

        let items = [];

        if (type === 'file') {
            this.app.state.files
                .filter(f => f.projectId === this.app.state.activeProjectId && f.type !== 'folder')
                .forEach(f => {
                    items.push({ value: `file:${f.id}`, label: f.name });
                });
        } else if (type === 'collection') {
            this.app.state.collections
                .filter(c => c.projectId === this.app.state.activeProjectId)
                .forEach(c => {
                    items.push({ value: `collection:${c.id}`, label: c.name });
                });
        } else if (type === 'timestamp') {
            this.app.state.timestamps.forEach(t => {
                const file = this.app.state.files.find(f => f.id === t.fileId);
                const col = this.app.state.collections.find(c => c.id === t.collectionId);
                if (file && col && col.projectId === this.app.state.activeProjectId) {
                    const label = `${t.note || 'Untitled'} (${file.name})`;
                    items.push({ value: `timestamp:${t.id}`, label: label });
                }
            });
        }

        if (items.length === 0) {
            menu.innerHTML = '<div class="custom-select-item" style="pointer-events:none; color:var(--text-muted)">No items found</div>';
        } else {
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'custom-select-item';
                el.dataset.value = item.value;
                el.textContent = item.label;
                menu.appendChild(el);
            });
        }
    }


    insertDocsLink() {
        const activeTab = document.querySelector('.docs-link-tab.active').dataset.tab;
        let url = '';
        let text = '';

        if (activeTab === 'external') {
            url = document.getElementById('input-docs-link-url').value.trim();
            if (!url) {
                this.app.modals.alert("Error", "Please enter a URL");
                return;
            }
            text = url;
            // Prepend https if missing
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
        } else {
            const itemValue = this.docsLinkItemValue;
            if (!itemValue) {
                this.app.modals.alert("Error", "Please select an item");
                return;
            }
            url = `whistler://${itemValue}`;

            // Get display text
            const [itemType, itemId] = itemValue.split(':');
            if (itemType === 'file') {
                const file = this.app.state.files.find(f => f.id === itemId);
                text = file?.name || 'File';
            } else if (itemType === 'collection') {
                const col = this.app.state.collections.find(c => c.id === itemId);
                text = col?.name || 'Collection';
            } else if (itemType === 'timestamp') {
                const ts = this.app.state.timestamps.find(t => t.id === itemId);
                text = ts?.note || 'Timestamp';
            }
        }

        // If we are editing an existing anchor, update it directly
        if (this.docsEditingAnchor) {
            try {
                const a = this.docsEditingAnchor;
                a.href = url;
                // Update visible text to a friendly label
                if (activeTab === 'external') a.textContent = url; else a.textContent = text;
            } catch (err) {
                console.error('Failed to update link', err);
            }
            this.docsEditingAnchor = null;
            this.closeDocsLinkModal();
            this.saveDocsContent();
            return;
        }

        // Restore selection and insert link
        const editor = document.getElementById('docs-editor');
        editor.focus();

        // If saved range disappeared, try to use current selection as fallback
        if (!this.docsSavedRange) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) this.docsSavedRange = sel.getRangeAt(0).cloneRange();
        }

        if (this.docsSavedRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.docsSavedRange);

            // If text is selected, use it; otherwise insert link text
            if (selection.toString().trim()) {
                const selectedText = selection.toString().trim();
                document.execCommand('createLink', false, url);
                
                // After createLink, if it's an internal link, check if we should update the text
                if (url.startsWith('whistler://')) {
                    // Find the link in the current selection
                    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                    if (range) {
                        // Try to find the link in or near the selection
                        let link = range.commonAncestorContainer;
                        if (link.nodeType !== Node.ELEMENT_NODE) {
                            link = link.parentElement;
                        }
                        link = link.closest('a');
                        
                        // If no link found, try finding by URL
                        if (!link || link.href !== url) {
                            link = editor.querySelector(`a[href="${CSS.escape(url)}"]`);
                        }
                        
                        if (link) {
                            const friendlyText = this.getInternalLinkFriendlyText(url);
                            // Only replace text if it looks like raw code
                            const currentText = link.textContent.trim();
                            const itemValue = url.replace('whistler://', '');
                            if (friendlyText && (currentText === itemValue || currentText === selectedText && selectedText.match(/^(file|collection|timestamp):[a-f0-9-]+$/i))) {
                                link.textContent = friendlyText;
                            }
                        }
                    }
                }
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.textContent = text;
                this.docsSavedRange.insertNode(link);
            }
        }

        // After link insertion, update all internal links to ensure they show friendly names
        // This handles cases where createLink was used and the text might be raw code
        setTimeout(() => {
            this.updateInternalLinkTexts(editor);
        }, 0);

        this.closeDocsLinkModal();
        this.saveDocsContent();
    }


    closeDocsLinkModal() {
        document.getElementById('modal-docs-link').classList.add('hidden');
        document.getElementById('modal-backdrop').classList.add('hidden');
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

        // Populate collections - Separated Categories (User Request)
        const cols = this.app.state.collections.filter(c => c.projectId === this.app.state.activeProjectId);
        const topLevel = cols.filter(c => !c.parentId);
        const subFolders = cols.filter(c => c.parentId);

        // Clear default class from container to remove single-box style
        list.className = '';
        list.style.cssText = 'display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow-y: auto; padding-right: 4px;';

        // Helper to create list item
        const createItem = (c) => {
            const isCurrent = c.id === timestamp.collectionId;
            const div = document.createElement('div');
            div.className = 'folder-select-item';
            if (isCurrent) div.classList.add('current-folder');

            div.innerHTML = `
                <i class="ph-fill ph-folder" style="color: ${c.color || 'var(--text-secondary)'}"></i>
                <span>${c.name}</span>
            `;

            if (isCurrent) {
                div.innerHTML += `<span class="folder-path-context">Current</span>`;
            } else {
                div.onclick = (e) => {
                    e.stopPropagation();
                    this.app.storage.updateTimestamp(timestamp.id, { collectionId: c.id });
                    this.close();
                    this.app.player.exitCollectionMode();
                    this.app.player.close();
                    this.app.router.openCollection(c.id);
                };
            }
            return div;
        };

        // Helper to create a section
        const createSection = (title, items) => {
            if (items.length === 0) return;

            // Header (Outside box)
            const header = document.createElement('div');
            header.className = 'context-label'; // Re-use existing label style
            header.style.marginTop = '16px';
            header.style.marginBottom = '8px';
            header.textContent = title;
            list.appendChild(header);

            // Box (The list)
            const box = document.createElement('div');
            box.className = 'folder-select-list'; // Re-use the box style
            box.style.margin = '0'; // Reset margin since we handle spacing via gap/header

            items.forEach(item => {
                box.appendChild(createItem(item));
            });

            list.appendChild(box);
        };

        if (cols.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">No collections found.</div>';
        } else {
            createSection('Collections', topLevel);
            createSection('Sub-folders', subFolders);
        }

        btnCancel.onclick = () => this.close();

        if (this.backdrop) this.backdrop.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    openFileSelector(callback) {
        // Create a reusable modal for selecting video files
        let modal = document.getElementById('modal-file-selector');

        // Create modal if it doesn't exist
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-file-selector';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-header">
                    <h2>Select a Video</h2>
                </div>
                <div id="file-selector-list" class="folder-select-list" style="max-height: 400px; overflow-y: auto;"></div>
                <div class="modal-actions">
                    <button class="btn-secondary" id="btn-cancel-file-selector">Cancel</button>
                </div>
            `;
            // Append inside the backdrop, not body
            this.backdrop.appendChild(modal);
        }

        const list = document.getElementById('file-selector-list');
        const btnCancel = document.getElementById('btn-cancel-file-selector');

        list.innerHTML = '';

        // Get all video files from the current project
        const files = this.app.state.files.filter(f =>
            f.projectId === this.app.state.activeProjectId && f.type !== 'folder'
        );

        if (files.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">No video files in this project. Add videos from the Storage page first.</div>';
        } else {
            files.forEach(f => {
                // Determine icon based on file type
                const isPdf = f.type === 'pdf' || f.name.toLowerCase().endsWith('.pdf');
                const iconClass = isPdf ? 'ph-file-pdf' : 'ph-film-strip';

                const div = document.createElement('div');
                div.className = 'folder-select-item';
                div.innerHTML = `
                    <i class="ph-bold ${iconClass}"></i>
                    <span>${f.name}</span>
                `;

                div.onclick = () => {
                    this.close();
                    if (callback) callback(f);
                };

                list.appendChild(div);
            });
        }

        btnCancel.onclick = () => this.close();

        if (this.backdrop) this.backdrop.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    init() {
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) this.close();
        });

        // Initialize Color Picker Logic
        this.setupColorPickerListeners();

        // Collection Color Trigger
        const colTrigger = document.getElementById('btn-collection-color-trigger');
        if (colTrigger) {
            colTrigger.onclick = () => {
                const input = document.getElementById('input-col-color');
                const preview = document.getElementById('collection-color-preview');
                const currentColor = input.value;

                this.openColorPicker(currentColor, (newColor) => {
                    input.value = newColor;
                    preview.style.backgroundColor = newColor;
                });
                // Set flag to reopen collection modal after color pick
                this.reopenModalAfterColorPick = 'modal-collection';
            };
        }

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

            const text = this.pendingPdfText || null;
            const newTs = this.app.storage.addTimestamp(colId, this.app.player.currentFile.id, start, end, note, text);

            this.pendingPdfText = null; // Clear

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

    prompt(title, value, callback, isTextarea = false, placeholder = '') {
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
            area.placeholder = placeholder;
            area.focus();
            m.style.width = '450px'; // Make it wider
        } else {
            area.classList.add('hidden');
            inp.classList.remove('hidden');
            inp.value = value;
            inp.placeholder = placeholder;
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
        const createItem = (id, name, isCurrent, color) => {
            const el = document.createElement('div');
            el.className = 'folder-select-item';
            if (isCurrent) el.classList.add('current-folder');

            // Use passed color or fallback to accent
            const itemColor = color || 'var(--accent)';
            el.innerHTML = `
                <i class="ph-fill ph-folder" style="color: ${itemColor}"></i>
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
        list.appendChild(createItem(null, "Root Storage", file.parentId === null, 'var(--accent)'));

        // Folders
        folders.forEach(f => {
            // Prevent moving into itself if it's a folder (not applicable here since we move files, but safety check)
            if (file.id === f.id) return;
            list.appendChild(createItem(f.id, f.name, file.parentId === f.id, f.color));
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

    openTimestamp(currentTime, existingTs = null, prefilledNote = null, isPdf = false) {
        if (existingTs && existingTs.text) isPdf = true;

        const cols = this.app.state.collections.filter(c => c.projectId === this.app.state.activeProjectId);
        if (cols.length === 0) return alert("Create a collection first!");

        this.pendingPdfText = isPdf ? (prefilledNote || (existingTs ? existingTs.text : null)) : null;

        this.close();
        this.backdrop.classList.remove('hidden');
        const m = document.getElementById('modal-timestamp');
        m.classList.remove('hidden');

        // Handle PDF vs Video Context
        const timeGroup = m.querySelector('.form-row');
        const textGroup = document.getElementById('group-selected-text');
        const textDisplay = document.getElementById('display-selected-text');
        const confirmBtn = document.getElementById('confirm-timestamp');
        const title = document.getElementById('ts-modal-title');

        const isImage = this.app.player.isImage;

        if (isPdf) {
            if (timeGroup) timeGroup.classList.add('hidden');
            if (textGroup) textGroup.classList.remove('hidden');
            if (textDisplay) textDisplay.textContent = existingTs ? existingTs.text : (this.pendingPdfText || "");

            title.textContent = existingTs ? "Edit Highlight" : "Save Highlight";
            confirmBtn.textContent = existingTs ? "Update Highlight" : "Save Highlight";
        } else if (isImage) {
            if (timeGroup) timeGroup.classList.add('hidden');
            if (textGroup) textGroup.classList.add('hidden');

            title.textContent = existingTs ? "Edit Marking" : "New Marking";
            confirmBtn.textContent = existingTs ? "Update Marking" : "Save Marking";
        } else {
            if (timeGroup) timeGroup.classList.remove('hidden');
            if (textGroup) textGroup.classList.add('hidden');

            title.textContent = existingTs ? "Edit Timestamp" : "New Timestamp";
            confirmBtn.textContent = existingTs ? "Update Timestamp" : "Save Timestamp";
        }

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
            // Title already set above but verifying:
            // document.getElementById('ts-modal-title').textContent = "Edit Timestamp"; // REMOVED to respect context
            document.getElementById('btn-delete-ts').classList.remove('hidden');

            document.getElementById('input-ts-start').value = this.app.player.fmt(existingTs.start);
            document.getElementById('input-ts-end').value = this.app.player.fmt(existingTs.end);
            document.getElementById('input-ts-note').value = existingTs.note;

            const c = cols.find(x => x.id === existingTs.collectionId);
            if (c) selectCol(c);
            else if (cols.length > 0) selectCol(cols[0]); // Fallback
        } else {
            this.currentTimestampId = null;
            document.getElementById('btn-delete-ts').classList.add('hidden');

            document.getElementById('input-ts-start').value = this.app.player.fmt(currentTime);
            document.getElementById('input-ts-end').value = this.app.player.fmt(currentTime);
            document.getElementById('input-ts-note').value = isPdf ? "" : (prefilledNote || "");

            // Default select first
            if (cols.length > 0) selectCol(cols[0]);
        }
    }

    alert(title, message) {
        // Simple alert using confirm modal but only showing OK button
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('btn-confirm-yes');
        
        if (modal && titleEl && messageEl && btnYes) {
            titleEl.textContent = title || 'Alert';
            messageEl.textContent = message || '';
            
            // Store original onclick
            const originalOnClick = btnYes.onclick;
            const newBtn = btnYes.cloneNode(true);
            btnYes.parentNode.replaceChild(newBtn, btnYes);
            document.getElementById('btn-confirm-yes').onclick = () => {
                this.close();
            };
            document.getElementById('btn-confirm-yes').textContent = 'OK';
            
            this.backdrop.classList.remove('hidden');
            modal.classList.remove('hidden');
        } else {
            // Fallback to browser alert
            window.alert(`${title || 'Alert'}: ${message || ''}`);
        }
    }

    openAddFile(callback) {
        this.backdrop.classList.remove('hidden');
        const modal = document.getElementById('modal-add-file');
        modal.classList.remove('hidden');
        
        const input = document.getElementById('input-add-file-url');
        input.value = '';
        input.focus();
        
        this.onAddFileCallback = callback;
        
        // Set up button handlers
        document.getElementById('btn-add-file-ok').onclick = () => {
            const url = input.value.trim();
            if (url && this.onAddFileCallback) {
                this.onAddFileCallback(url);
            }
            this.close();
        };
        
        // Handle Enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const url = input.value.trim();
                if (url && this.onAddFileCallback) {
                    this.onAddFileCallback(url);
                }
                this.close();
            }
        };
    }

    close() {
        this.backdrop.classList.add('hidden');
        document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
    }

    /**
     * Generic show method for modals
     */
    show(type) {
        this.close();
        this.backdrop.classList.remove('hidden');
        const modal = document.getElementById(`modal-${type}`);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // --- Color Picker ---
    openColorPicker(initialColor, callback) {
        this.close();
        this.backdrop.classList.remove('hidden');
        const m = document.getElementById('modal-color-picker');
        m.classList.remove('hidden');

        this.onColorPickCallback = callback;
        this.pickerColor = initialColor || '#6366f1';

        // Reset Tabs to Basic
        this.switchPickerTab('basic');
        this.renderColorPresets();
        this.updateAdvancedPickerUI(this.pickerColor);
    }

    switchPickerTab(tab) {
        document.querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cp-panel').forEach(p => p.classList.add('hidden'));

        document.querySelector(`.cp-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`cp-panel-${tab}`).classList.remove('hidden');
    }

    renderColorPresets() {
        const grid = document.getElementById('cp-basic-grid');
        grid.innerHTML = '';
        const presets = [
            '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
            '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#71717a',
            '#ffffff', '#000000', '#78350f', '#064e3b', '#1e3a8a'
        ];

        presets.forEach(color => {
            const el = document.createElement('div');
            el.className = 'cp-preset';
            el.style.backgroundColor = color;
            if (color.toLowerCase() === this.pickerColor.toLowerCase()) el.classList.add('selected');

            el.onclick = () => {
                this.pickerColor = color;
                // Visual selection update
                document.querySelectorAll('.cp-preset').forEach(p => p.classList.remove('selected'));
                el.classList.add('selected');
                // Also update advanced UI state in background
                this.updateAdvancedPickerUI(color);
            };
            grid.appendChild(el);
        });
    }

    setupColorPickerListeners() {
        // Tabs
        document.querySelectorAll('.cp-tab').forEach(btn => {
            btn.onclick = () => this.switchPickerTab(btn.dataset.tab);
        });

        // Confirm
        document.getElementById('btn-cp-confirm').onclick = () => {
            const reopenModalId = this.reopenModalAfterColorPick;
            if (this.onColorPickCallback) {
                this.onColorPickCallback(this.pickerColor);
            }
            this.close();
            // Reopen a modal if one was specified (for nested modals)
            if (reopenModalId) {
                this.backdrop.classList.remove('hidden');
                document.getElementById(reopenModalId).classList.remove('hidden');
                this.reopenModalAfterColorPick = null;
            }
        };

        // Cancel
        document.getElementById('btn-cp-cancel').onclick = () => {
            const reopenModalId = this.reopenModalAfterColorPick;
            this.close();
            if (reopenModalId) {
                this.backdrop.classList.remove('hidden');
                document.getElementById(reopenModalId).classList.remove('hidden');
                this.reopenModalAfterColorPick = null;
            }
        };

        // Reset to default (remove color)
        document.getElementById('btn-cp-reset').onclick = () => {
            const reopenModalId = this.reopenModalAfterColorPick;
            if (this.onColorPickCallback) this.onColorPickCallback(null);
            this.close();
            if (reopenModalId) {
                this.backdrop.classList.remove('hidden');
                document.getElementById(reopenModalId).classList.remove('hidden');
                this.reopenModalAfterColorPick = null;
            }
        };

        // Advanced Logic with drag support
        const sat = document.getElementById('cp-saturation');
        const hue = document.getElementById('cp-hue-rail');
        const hexInput = document.getElementById('cp-input-hex');

        // Saturation box drag
        const handleSatMove = (e) => {
            e.preventDefault();
            this.handleSatInteraction(e, sat);
        };
        const stopSatDrag = () => {
            document.removeEventListener('mousemove', handleSatMove);
            document.removeEventListener('mouseup', stopSatDrag);
        };
        sat.onmousedown = (e) => {
            this.handleSatInteraction(e, sat);
            document.addEventListener('mousemove', handleSatMove);
            document.addEventListener('mouseup', stopSatDrag);
        };

        // Hue rail drag
        const handleHueMove = (e) => {
            e.preventDefault();
            this.handleHueInteraction(e, hue);
        };
        const stopHueDrag = () => {
            document.removeEventListener('mousemove', handleHueMove);
            document.removeEventListener('mouseup', stopHueDrag);
        };
        hue.onmousedown = (e) => {
            this.handleHueInteraction(e, hue);
            document.addEventListener('mousemove', handleHueMove);
            document.addEventListener('mouseup', stopHueDrag);
        };

        hexInput.onchange = (e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                this.pickerColor = val;
                this.updateAdvancedPickerUI(val);
                this.renderColorPresets(); // Sync basic selection
            }
        };
    }

    // Helper: Parse Hex to HSV would be needed for full bi-directional sync.
    // Simplifying: We rely on HEX for source of truth.
    // Drawing the saturation box requires a hue. 

    updateAdvancedPickerUI(hex) {
        document.getElementById('cp-preview').style.backgroundColor = hex;
        document.getElementById('cp-input-hex').value = hex;

        // Update visual cursors based on hex
        const hsv = this.hexToHsv(hex);
        this.currentHsv = hsv; // Store current HSV state

        // Update Hue Thumb
        const hueRail = document.getElementById('cp-hue-rail');
        const hueThumb = document.getElementById('cp-hue-thumb');
        const huePct = hsv.h / 360;
        hueThumb.style.left = (huePct * 100) + '%';

        // Update Saturation Background (Hue color)
        const satBox = document.getElementById('cp-saturation');
        satBox.style.backgroundColor = `hsl(${hsv.h}, 100%, 50%)`;

        // Update Sat Cursor
        const cursor = document.getElementById('cp-cursor');
        cursor.style.left = (hsv.s * 100) + '%';
        cursor.style.top = (100 - (hsv.v * 100)) + '%';
    }

    handleSatInteraction(e, el) {
        const rect = el.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        const s = x / rect.width;
        const v = 1 - (y / rect.height);

        if (!this.currentHsv) this.currentHsv = { h: 0, s: 1, v: 1 };
        this.currentHsv.s = s;
        this.currentHsv.v = v;

        const hex = this.hsvToHex(this.currentHsv.h, this.currentHsv.s, this.currentHsv.v);
        this.pickerColor = hex;
        this.updateAdvancedPickerUI(hex);
    }

    handleHueInteraction(e, el) {
        const rect = el.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const hue = (x / rect.width) * 360;
        if (!this.currentHsv) this.currentHsv = { h: 0, s: 1, v: 1 };
        this.currentHsv.h = hue;

        const hex = this.hsvToHex(this.currentHsv.h, this.currentHsv.s, this.currentHsv.v);
        this.pickerColor = hex;
        this.updateAdvancedPickerUI(hex);
    }

    // Color Helpers
    hexToHsv(hex) {
        let r = 0, g = 0, b = 0;
        if (!hex) hex = "#000000";
        if (hex.startsWith('#')) hex = hex.slice(1);

        if (hex.length === 3) {
            r = "0x" + hex[0] + hex[0];
            g = "0x" + hex[1] + hex[1];
            b = "0x" + hex[2] + hex[2];
        } else if (hex.length >= 6) {
            r = "0x" + hex.substring(0, 2);
            g = "0x" + hex.substring(2, 4);
            b = "0x" + hex.substring(4, 6);
        }
        r /= 255; g /= 255; b /= 255;

        let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
        let h = 0, s = 0, v = 0;

        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;

        v = cmax;
        s = cmax == 0 ? 0 : delta / cmax;

        return { h, s, v };
    }

    hsvToHex(h, s, v) {
        let r, g, b, i, f, p, q, t;
        h = h / 360;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        const toHex = x => {
            const val = Math.round(x * 255).toString(16);
            return val.length === 1 ? '0' + val : val;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

// ============================================
// SyncManager - Anonymous Cloud Sync
// ============================================
class SyncManager {
    constructor(app) {
        this.app = app;
        
        // Configuration
        this.API_URL = 'https://whistler-sync.peteawesome.workers.dev';
        
        // Turnstile site key
        this.TURNSTILE_SITE_KEY = '0x4AAAAAACL9Ojn2jXAFNaw_';
        
        // Local storage keys
        this.ACCOUNT_KEY = 'whistler_account_id';
        this.TOKEN_KEY = 'whistler_session_token';
        this.LAST_SYNC_KEY = 'whistler_last_sync';
        this.DISPLAY_NAME_KEY = 'whistler_display_name';
        
        // State
        this.accountId = null;
        this.sessionToken = null;
        this.displayName = null;
        this.lastSync = null;
        this.isSyncing = false;
        this.captchaToken = null;
        this.totpEnabled = false;
        this.pendingTotpToken = null;
        this.totpSecret = null;
        
        // Auto-sync interval (5 minutes)
        this.syncInterval = null;
        this.SYNC_INTERVAL_MS = 5 * 60 * 1000;
    }
    
    init() {
        // Load stored credentials
        this.accountId = localStorage.getItem(this.ACCOUNT_KEY);
        this.sessionToken = localStorage.getItem(this.TOKEN_KEY);
        this.lastSync = localStorage.getItem(this.LAST_SYNC_KEY);
        this.displayName = localStorage.getItem(this.DISPLAY_NAME_KEY);
        
        // Setup UI
        this.setupUI();
        
        // Setup global Turnstile callbacks
        window.onTurnstileSuccess = (token) => {
            this.captchaToken = token;
            // Enable login button
            const btn = document.getElementById('btn-sync-login');
            if (btn) btn.disabled = false;
        };
        
        window.onTurnstileExpired = () => {
            this.captchaToken = null;
            // Disable login button
            const btn = document.getElementById('btn-sync-login');
            if (btn) btn.disabled = true;
        };
        
        // Auto-login if we have credentials
        if (this.accountId && this.sessionToken) {
            this.updateUIState(true);
            // Start auto-sync
            this.startAutoSync();
            // Check 2FA status and sync on startup
            setTimeout(async () => {
                await this.check2FAStatus();
                await this.syncFromCloud();
            }, 1000);
        }
    }
    
    setupUI() {
        // Cloud sync button in sidebar
        const btnCloudSync = document.getElementById('btn-cloud-sync');
        if (btnCloudSync) {
            btnCloudSync.onclick = () => this.openSyncModal();
        }
        
        // Generate account ID button
        const btnGenerate = document.getElementById('btn-generate-account-id');
        if (btnGenerate) {
            btnGenerate.onclick = () => this.generateAccountId();
        }
        
        // Login button
        const btnLogin = document.getElementById('btn-sync-login');
        if (btnLogin) {
            btnLogin.onclick = () => this.login();
            // Initially disabled until captcha is solved
            btnLogin.disabled = true;
        }
        
        // Logout button
        const btnLogout = document.getElementById('btn-sync-logout');
        if (btnLogout) {
            btnLogout.onclick = () => this.logout();
        }
        
        // Sync now button
        const btnSyncNow = document.getElementById('btn-sync-now');
        if (btnSyncNow) {
            btnSyncNow.onclick = () => this.syncToCloud();
        }
        
        // Copy account ID button
        const btnCopyId = document.getElementById('btn-copy-account-id');
        if (btnCopyId) {
            btnCopyId.onclick = () => this.copyAccountId();
        }
        
        // Reveal/hide account ID button
        const btnRevealId = document.getElementById('btn-reveal-id');
        if (btnRevealId) {
            btnRevealId.onclick = () => this.toggleRevealAccountId();
        }
        
        // Account ID input formatting
        const inputAccountId = document.getElementById('input-account-id');
        if (inputAccountId) {
            inputAccountId.addEventListener('input', (e) => this.formatAccountIdInput(e));
        }
        
        // 2FA TOTP Verification (during login)
        const btnTotpVerifySubmit = document.getElementById('btn-totp-verify-submit');
        if (btnTotpVerifySubmit) {
            btnTotpVerifySubmit.onclick = () => this.verifyTotpLogin();
        }
        
        const btnTotpVerifyCancel = document.getElementById('btn-totp-verify-cancel');
        if (btnTotpVerifyCancel) {
            btnTotpVerifyCancel.onclick = () => this.cancelTotpVerify();
        }
        
        const inputTotpVerify = document.getElementById('input-totp-verify');
        if (inputTotpVerify) {
            inputTotpVerify.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.verifyTotpLogin();
            });
        }
        
        // 2FA Setup button
        const btnTotpSetup = document.getElementById('btn-totp-setup');
        if (btnTotpSetup) {
            btnTotpSetup.onclick = () => this.startTotpSetup();
        }
        
        // 2FA Setup confirmation
        const btnTotpSetupConfirm = document.getElementById('btn-totp-setup-confirm');
        if (btnTotpSetupConfirm) {
            btnTotpSetupConfirm.onclick = () => this.confirmTotpSetup();
        }
        
        const btnTotpSetupCancel = document.getElementById('btn-totp-setup-cancel');
        if (btnTotpSetupCancel) {
            btnTotpSetupCancel.onclick = () => this.cancelTotpSetup();
        }
        
        const inputTotpSetup = document.getElementById('input-totp-setup');
        if (inputTotpSetup) {
            inputTotpSetup.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.confirmTotpSetup();
            });
        }
        
        // 2FA Disable button
        const btnTotpDisable = document.getElementById('btn-totp-disable');
        if (btnTotpDisable) {
            btnTotpDisable.onclick = () => this.showTotpDisable();
        }
        
        // 2FA Disable confirmation
        const btnTotpDisableConfirm = document.getElementById('btn-totp-disable-confirm');
        if (btnTotpDisableConfirm) {
            btnTotpDisableConfirm.onclick = () => this.confirmTotpDisable();
        }
        
        const btnTotpDisableCancel = document.getElementById('btn-totp-disable-cancel');
        if (btnTotpDisableCancel) {
            btnTotpDisableCancel.onclick = () => this.cancelTotpDisable();
        }
        
        const inputTotpDisable = document.getElementById('input-totp-disable');
        if (inputTotpDisable) {
            inputTotpDisable.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.confirmTotpDisable();
            });
        }
    }
    
    openSyncModal() {
        this.app.modals.show('sync');
        this.showMainSyncView();
        
        // Reset Turnstile when modal opens (if logged out)
        if (!this.accountId && typeof turnstile !== 'undefined') {
            this.captchaToken = null;
            const btn = document.getElementById('btn-sync-login');
            if (btn) btn.disabled = true;
            
            // Reset the widget
            try {
                turnstile.reset('#turnstile-widget');
            } catch (e) {
                // Widget might not be ready yet
            }
        }
        
        // Update 2FA status if logged in
        if (this.sessionToken) {
            this.check2FAStatus();
        }
    }
    
    showMainSyncView() {
        const isLoggedIn = !!this.accountId && !!this.sessionToken;
        
        document.getElementById('sync-logged-out')?.classList.toggle('hidden', isLoggedIn);
        document.getElementById('sync-logged-in')?.classList.toggle('hidden', !isLoggedIn);
        document.getElementById('sync-totp-verify')?.classList.add('hidden');
        document.getElementById('sync-totp-setup')?.classList.add('hidden');
        document.getElementById('sync-totp-disable')?.classList.add('hidden');
        
        if (isLoggedIn) {
            const displayName = document.getElementById('display-account-name');
            if (displayName && this.displayName) {
                displayName.textContent = this.displayName;
                displayName.classList.remove('hidden');
            }
            const displayId = document.getElementById('display-account-id');
            if (displayId) {
                // Show censored by default
                displayId.textContent = '••••-••••-••••-••••';
                displayId.dataset.revealed = 'false';
                displayId.dataset.actualId = this.formatAccountId(this.accountId);
            }
            this.updateSyncStatus();
            this.update2FAStatusUI();
        }
    }
    
    updateUIState(isLoggedIn) {
        const syncIcon = document.getElementById('sync-icon');
        
        if (isLoggedIn) {
            // Update sidebar icon
            if (syncIcon) {
                syncIcon.className = 'ph-fill ph-cloud-check';
            }
        } else {
            // Reset sidebar icon
            if (syncIcon) {
                syncIcon.className = 'ph-bold ph-cloud';
            }
        }
        
        this.showMainSyncView();
    }
    
    updateSyncStatus() {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            if (this.lastSync) {
                const date = new Date(this.lastSync);
                syncStatus.textContent = `Last synced: ${date.toLocaleString()}`;
            } else {
                syncStatus.textContent = 'Last synced: Never';
            }
        }
    }
    
    update2FAStatusUI() {
        const badge = document.getElementById('totp-status-badge');
        const btnSetup = document.getElementById('btn-totp-setup');
        const btnDisable = document.getElementById('btn-totp-disable');
        
        if (this.totpEnabled) {
            if (badge) {
                badge.textContent = 'On';
                badge.style.background = 'rgba(34, 197, 94, 0.2)';
                badge.style.color = '#22c55e';
            }
            btnSetup?.classList.add('hidden');
            btnDisable?.classList.remove('hidden');
        } else {
            if (badge) {
                badge.textContent = 'Off';
                badge.style.background = 'rgba(239, 68, 68, 0.2)';
                badge.style.color = '#ef4444';
            }
            btnSetup?.classList.remove('hidden');
            btnDisable?.classList.add('hidden');
        }
    }
    
    /**
     * Generate a cryptographically random 16-digit account ID
     */
    generateAccountId() {
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        
        // Convert to 16-digit number string
        let id = '';
        for (let i = 0; i < 8; i++) {
            // Each byte contributes 2 digits (00-99)
            const digits = (array[i] % 100).toString().padStart(2, '0');
            id += digits;
        }
        
        const inputAccountId = document.getElementById('input-account-id');
        if (inputAccountId) {
            inputAccountId.value = this.formatAccountId(id);
        }
    }
    
    /**
     * Format account ID as XXXX-XXXX-XXXX-XXXX
     */
    formatAccountId(id) {
        if (!id) return '';
        const clean = id.replace(/\D/g, '').slice(0, 16);
        const parts = [];
        for (let i = 0; i < clean.length; i += 4) {
            parts.push(clean.slice(i, i + 4));
        }
        return parts.join('-');
    }
    
    /**
     * Format the input field as user types
     */
    formatAccountIdInput(e) {
        const input = e.target;
        const cursorPos = input.selectionStart;
        const oldValue = input.value;
        
        // Get just digits
        const digits = oldValue.replace(/\D/g, '').slice(0, 16);
        
        // Format with dashes
        const formatted = this.formatAccountId(digits);
        
        // Only update if changed
        if (formatted !== oldValue) {
            input.value = formatted;
            
            // Try to preserve cursor position
            const digitsBeforeCursor = oldValue.slice(0, cursorPos).replace(/\D/g, '').length;
            let newCursorPos = 0;
            let digitCount = 0;
            for (let i = 0; i < formatted.length && digitCount < digitsBeforeCursor; i++) {
                if (formatted[i] !== '-') digitCount++;
                newCursorPos = i + 1;
            }
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
    
    /**
     * Get clean 16-digit ID from input
     */
    getCleanAccountId() {
        const input = document.getElementById('input-account-id');
        if (!input) return null;
        return input.value.replace(/\D/g, '');
    }
    
    /**
     * Login or register with account ID
     */
    async login() {
        const accountId = this.getCleanAccountId();
        
        if (!accountId || accountId.length !== 16) {
            this.showError('Please enter a valid 16-digit account ID');
            return;
        }
        
        if (!this.captchaToken) {
            this.showError('Please complete the captcha verification');
            return;
        }
        
        try {
            this.setLoading(true);
            
            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    account_id: accountId,
                    captcha_token: this.captchaToken
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Reset captcha on error
                this.resetCaptcha();
                throw new Error(data.error || 'Login failed');
            }
            
            // Clear captcha token after successful login
            this.captchaToken = null;
            
            // Check if 2FA is required
            if (data.requires_totp) {
                // Store pending state
                this.pendingTotpToken = data.pending_token;
                this.accountId = accountId;
                this.pendingDisplayName = data.display_name;
                
                // Show TOTP verification screen
                this.showTotpVerify();
                return;
            }
            
            // No 2FA - complete login
            await this.completeLogin(accountId, data.token, data.is_new, data.display_name);
            
        } catch (err) {
            console.error('Login error:', err);
            this.showError(err.message || 'Failed to connect to sync server');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Show TOTP verification screen
     */
    showTotpVerify() {
        document.getElementById('sync-logged-out')?.classList.add('hidden');
        document.getElementById('sync-logged-in')?.classList.add('hidden');
        document.getElementById('sync-totp-verify')?.classList.remove('hidden');
        document.getElementById('sync-totp-setup')?.classList.add('hidden');
        document.getElementById('sync-totp-disable')?.classList.add('hidden');
        
        // Clear and focus the input
        const input = document.getElementById('input-totp-verify');
        if (input) {
            input.value = '';
            input.focus();
        }
        
        // Hide any previous error
        document.getElementById('totp-verify-error')?.classList.add('hidden');
    }
    
    /**
     * Verify TOTP code during login
     */
    async verifyTotpLogin() {
        const input = document.getElementById('input-totp-verify');
        const code = input?.value?.replace(/\s/g, '');
        
        if (!code || code.length !== 6) {
            this.showTotpVerifyError('Please enter a 6-digit code');
            return;
        }
        
        try {
            const btn = document.getElementById('btn-totp-verify-submit');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i><span>Verifying...</span>';
            }
            
            const response = await fetch(`${this.API_URL}/login/totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pending_token: this.pendingTotpToken,
                    totp_code: code
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }
            
            // Complete login
            this.pendingTotpToken = null;
            const displayName = data.display_name || this.pendingDisplayName;
            this.pendingDisplayName = null;
            await this.completeLogin(this.accountId, data.token, false, displayName);
            
        } catch (err) {
            console.error('TOTP verify error:', err);
            this.showTotpVerifyError(err.message || 'Invalid code');
            
            // Reset button
            const btn = document.getElementById('btn-totp-verify-submit');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-check"></i><span>Verify</span>';
            }
        }
    }
    
    /**
     * Cancel TOTP verification and go back to login
     */
    cancelTotpVerify() {
        this.pendingTotpToken = null;
        this.accountId = null;
        this.showMainSyncView();
        this.resetCaptcha();
    }
    
    showTotpVerifyError(message) {
        const errorDiv = document.getElementById('totp-verify-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }
    
    /**
     * Complete login after credentials are verified
     */
    async completeLogin(accountId, token, isNew, displayName = null) {
        this.accountId = accountId;
        this.sessionToken = token;
        this.displayName = displayName;
        this.totpEnabled = false; // Will be updated by check2FAStatus
        
        localStorage.setItem(this.ACCOUNT_KEY, this.accountId);
        localStorage.setItem(this.TOKEN_KEY, this.sessionToken);
        if (displayName) {
            localStorage.setItem(this.DISPLAY_NAME_KEY, displayName);
        }
        
        // Update UI
        this.updateUIState(true);
        this.hideError();
        
        // Start auto-sync
        this.startAutoSync();
        
        // Check 2FA status
        await this.check2FAStatus();
        
        // If new account, sync local data to cloud
        if (isNew) {
            await this.syncToCloud();
        } else {
            // Existing account - sync from cloud
            await this.syncFromCloud();
        }
    }
    
    /**
     * Check 2FA status from server
     */
    async check2FAStatus() {
        if (!this.sessionToken) return;
        
        try {
            const response = await fetch(`${this.API_URL}/2fa/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.totpEnabled = data.totp_enabled;
                this.update2FAStatusUI();
            }
        } catch (e) {
            console.error('Failed to check 2FA status:', e);
        }
    }
    
    /**
     * Start TOTP setup process
     */
    async startTotpSetup() {
        try {
            const btn = document.getElementById('btn-totp-setup');
            if (btn) btn.disabled = true;
            
            const response = await fetch(`${this.API_URL}/2fa/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Setup failed');
            }
            
            // Store secret for confirmation
            this.totpSecret = data.secret;
            
            // Show setup screen
            document.getElementById('sync-logged-in')?.classList.add('hidden');
            document.getElementById('sync-totp-setup')?.classList.remove('hidden');
            
            // Display secret
            const secretDisplay = document.getElementById('totp-secret-display');
            if (secretDisplay) {
                // Format with spaces for readability
                secretDisplay.textContent = data.secret.match(/.{1,4}/g)?.join(' ') || data.secret;
            }
            
            // Generate QR code
            this.generateQRCode(data.otpauth_url);
            
            // Clear and focus input
            const input = document.getElementById('input-totp-setup');
            if (input) {
                input.value = '';
                input.focus();
            }
            
            // Hide error
            document.getElementById('totp-setup-error')?.classList.add('hidden');
            
        } catch (err) {
            console.error('TOTP setup error:', err);
            alert(err.message || 'Failed to start 2FA setup');
        } finally {
            const btn = document.getElementById('btn-totp-setup');
            if (btn) btn.disabled = false;
        }
    }
    
    /**
     * Generate QR code for TOTP
     */
    generateQRCode(otpauthUrl) {
        const canvas = document.getElementById('totp-qr-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const size = 180;
        
        // Simple QR code generation using a basic encoder
        // For production, you'd want to use a library like qrcode-generator
        // But we can create a URL that Google Charts can render as a backup
        
        // First, let's try to generate it ourselves using a simple approach
        // We'll use a minimal QR code implementation
        
        try {
            // Create a simple visual representation
            // Since we don't have a QR library, show the URL in an alternative way
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);
            
            // Draw a placeholder with instructions
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            
            // For a proper QR code, we'll create an image from an API
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Use QR Server API (free, no-signup needed)
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(otpauthUrl)}`;
            
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
            };
            
            img.onerror = () => {
                // Fallback - show manual entry text
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, size, size);
                ctx.fillStyle = '#666';
                ctx.font = '11px sans-serif';
                ctx.fillText('QR code unavailable', size/2, size/2 - 10);
                ctx.fillText('Use manual entry below', size/2, size/2 + 10);
            };
            
            img.src = qrApiUrl;
            
        } catch (e) {
            console.error('QR generation error:', e);
        }
    }
    
    /**
     * Confirm TOTP setup with verification code
     */
    async confirmTotpSetup() {
        const input = document.getElementById('input-totp-setup');
        const code = input?.value?.replace(/\s/g, '');
        
        if (!code || code.length !== 6) {
            this.showTotpSetupError('Please enter the 6-digit code from your authenticator');
            return;
        }
        
        try {
            const btn = document.getElementById('btn-totp-setup-confirm');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i><span>Enabling...</span>';
            }
            
            const response = await fetch(`${this.API_URL}/2fa/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ totp_code: code })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }
            
            // Success!
            this.totpEnabled = true;
            this.totpSecret = null;
            
            // Go back to main view
            this.showMainSyncView();
            
        } catch (err) {
            console.error('TOTP enable error:', err);
            this.showTotpSetupError(err.message || 'Invalid code. Please try again.');
        } finally {
            const btn = document.getElementById('btn-totp-setup-confirm');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-check"></i><span>Enable 2FA</span>';
            }
        }
    }
    
    /**
     * Cancel TOTP setup
     */
    cancelTotpSetup() {
        this.totpSecret = null;
        this.showMainSyncView();
    }
    
    showTotpSetupError(message) {
        const errorDiv = document.getElementById('totp-setup-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }
    
    /**
     * Show TOTP disable confirmation
     */
    showTotpDisable() {
        document.getElementById('sync-logged-in')?.classList.add('hidden');
        document.getElementById('sync-totp-disable')?.classList.remove('hidden');
        
        // Clear and focus input
        const input = document.getElementById('input-totp-disable');
        if (input) {
            input.value = '';
            input.focus();
        }
        
        // Hide error
        document.getElementById('totp-disable-error')?.classList.add('hidden');
    }
    
    /**
     * Confirm TOTP disable
     */
    async confirmTotpDisable() {
        const input = document.getElementById('input-totp-disable');
        const code = input?.value?.replace(/\s/g, '');
        
        if (!code || code.length !== 6) {
            this.showTotpDisableError('Please enter your current 6-digit code');
            return;
        }
        
        try {
            const btn = document.getElementById('btn-totp-disable-confirm');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i><span>Disabling...</span>';
            }
            
            const response = await fetch(`${this.API_URL}/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ totp_code: code })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to disable 2FA');
            }
            
            // Success!
            this.totpEnabled = false;
            
            // Go back to main view
            this.showMainSyncView();
            
        } catch (err) {
            console.error('TOTP disable error:', err);
            this.showTotpDisableError(err.message || 'Invalid code');
        } finally {
            const btn = document.getElementById('btn-totp-disable-confirm');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-trash"></i><span>Disable 2FA</span>';
            }
        }
    }
    
    /**
     * Cancel TOTP disable
     */
    cancelTotpDisable() {
        this.showMainSyncView();
    }
    
    showTotpDisableError(message) {
        const errorDiv = document.getElementById('totp-disable-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }
    
    /**
     * Reset the Turnstile captcha widget
     */
    resetCaptcha() {
        this.captchaToken = null;
        const btn = document.getElementById('btn-sync-login');
        if (btn) btn.disabled = true;
        
        if (typeof turnstile !== 'undefined') {
            try {
                turnstile.reset('#turnstile-widget');
            } catch (e) {
                console.error('Failed to reset captcha:', e);
            }
        }
    }
    
    /**
     * Logout and clear credentials
     */
    logout() {
        this.accountId = null;
        this.sessionToken = null;
        this.displayName = null;
        this.lastSync = null;
        this.totpEnabled = false;
        
        localStorage.removeItem(this.ACCOUNT_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.DISPLAY_NAME_KEY);
        localStorage.removeItem(this.LAST_SYNC_KEY);
        
        this.stopAutoSync();
        this.updateUIState(false);
        
        // Clear the input
        const input = document.getElementById('input-account-id');
        if (input) input.value = '';
        
        // Hide account name
        const displayName = document.getElementById('display-account-name');
        if (displayName) displayName.classList.add('hidden');
    }
    
    /**
     * Sync local data to cloud
     */
    async syncToCloud() {
        if (!this.sessionToken || this.isSyncing) return;
        
        try {
            this.isSyncing = true;
            this.setSyncingState(true);
            
            // Get all local data
            const data = {
                projects: this.app.state.projects,
                files: this.app.state.files,
                collections: this.app.state.collections,
                timestamps: this.app.state.timestamps
            };
            
            // Save as a single key
            const response = await fetch(`${this.API_URL}/data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    key: 'whistler_data',
                    value: data
                })
            });
            
            if (response.status === 401) {
                // Token expired, try to re-login
                await this.reLogin();
                return;
            }
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Sync failed');
            }
            
            // Update last sync time
            this.lastSync = new Date().toISOString();
            localStorage.setItem(this.LAST_SYNC_KEY, this.lastSync);
            this.updateUIState(true);
            
        } catch (err) {
            console.error('Sync to cloud error:', err);
        } finally {
            this.isSyncing = false;
            this.setSyncingState(false);
        }
    }
    
    /**
     * Sync from cloud to local
     */
    async syncFromCloud() {
        if (!this.sessionToken || this.isSyncing) return;
        
        try {
            this.isSyncing = true;
            this.setSyncingState(true);
            
            const response = await fetch(`${this.API_URL}/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.status === 401) {
                // Token expired, try to re-login
                await this.reLogin();
                return;
            }
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Sync failed');
            }
            
            const result = await response.json();
            
            // Find the whistler_data key
            const dataRow = result.data?.find(d => d.key === 'whistler_data');
            
            if (dataRow && dataRow.value) {
                const cloudData = JSON.parse(dataRow.value);
                
                // Merge or replace local data
                // For now, we'll replace if cloud has data
                if (cloudData.projects?.length > 0 || cloudData.files?.length > 0) {
                    this.app.state.projects = cloudData.projects || [];
                    this.app.state.files = cloudData.files || [];
                    this.app.state.collections = cloudData.collections || [];
                    this.app.state.timestamps = cloudData.timestamps || [];
                    
                    // Save to local storage
                    this.app.storage.save();
                    
                    // Refresh UI
                    this.app.ui.renderProjectDropdown();
                    
                    // If we have projects, open the first one
                    if (this.app.state.projects.length > 0) {
                        if (!this.app.state.activeProjectId) {
                            this.app.router.openProject(this.app.state.projects[0].id);
                        } else {
                            this.app.router.openProject(this.app.state.activeProjectId);
                        }
                    }
                }
            }
            
            // Update last sync time
            this.lastSync = new Date().toISOString();
            localStorage.setItem(this.LAST_SYNC_KEY, this.lastSync);
            this.updateUIState(true);
            
        } catch (err) {
            console.error('Sync from cloud error:', err);
        } finally {
            this.isSyncing = false;
            this.setSyncingState(false);
        }
    }
    
    /**
     * Re-login when token expires
     */
    async reLogin() {
        if (!this.accountId) {
            this.logout();
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: this.accountId })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Re-login failed');
            }
            
            this.sessionToken = data.token;
            localStorage.setItem(this.TOKEN_KEY, this.sessionToken);
            
        } catch (err) {
            console.error('Re-login failed:', err);
            this.logout();
        }
    }
    
    /**
     * Start auto-sync interval
     */
    startAutoSync() {
        this.stopAutoSync();
        this.syncInterval = setInterval(() => {
            this.syncToCloud();
        }, this.SYNC_INTERVAL_MS);
    }
    
    /**
     * Stop auto-sync interval
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    /**
     * Trigger sync when data changes
     */
    onDataChange() {
        // Debounced sync on data change
        if (this.sessionToken) {
            clearTimeout(this.syncDebounce);
            this.syncDebounce = setTimeout(() => {
                this.syncToCloud();
            }, 2000); // Wait 2 seconds after last change
        }
    }
    
    /**
     * Copy account ID to clipboard
     */
    copyAccountId() {
        if (!this.accountId) return;
        
        const formatted = this.formatAccountId(this.accountId);
        navigator.clipboard.writeText(formatted).then(() => {
            const btn = document.getElementById('btn-copy-account-id');
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="ph-bold ph-check"></i><span>Copied!</span>';
                setTimeout(() => {
                    btn.innerHTML = original;
                }, 2000);
            }
        });
    }
    
    /**
     * Toggle reveal/hide account ID
     */
    toggleRevealAccountId() {
        const displayId = document.getElementById('display-account-id');
        const btn = document.getElementById('btn-reveal-id');
        if (!displayId || !btn) return;
        
        const isRevealed = displayId.dataset.revealed === 'true';
        
        if (isRevealed) {
            // Hide it
            displayId.textContent = '••••-••••-••••-••••';
            displayId.dataset.revealed = 'false';
            btn.innerHTML = '<i class="ph-bold ph-eye"></i>';
        } else {
            // Reveal it
            displayId.textContent = displayId.dataset.actualId || this.formatAccountId(this.accountId);
            displayId.dataset.revealed = 'true';
            btn.innerHTML = '<i class="ph-bold ph-eye-slash"></i>';
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('sync-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }
    
    /**
     * Hide error message
     */
    hideError() {
        const errorDiv = document.getElementById('sync-error');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }
    
    /**
     * Set loading state for login button
     */
    setLoading(isLoading) {
        const btn = document.getElementById('btn-sync-login');
        if (btn) {
            if (isLoading) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i><span>Connecting...</span>';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-sign-in"></i><span>Login / Register</span>';
            }
        }
    }
    
    /**
     * Set syncing state for sync button
     */
    setSyncingState(isSyncing) {
        const btn = document.getElementById('btn-sync-now');
        const icon = document.getElementById('sync-icon');
        
        if (btn) {
            if (isSyncing) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise" style="animation: spin 1s linear infinite;"></i><span>Syncing...</span>';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i><span>Sync Now</span>';
            }
        }
        
        if (icon && isSyncing) {
            icon.style.animation = 'spin 1s linear infinite';
        } else if (icon) {
            icon.style.animation = '';
        }
    }
}

class ExportImportManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        // Setup export/import button
        const btnExportImport = document.getElementById('btn-export-import');
        if (btnExportImport) {
            btnExportImport.onclick = () => {
                this.openModal();
            };
        }

        // Setup tab switching
        document.querySelectorAll('#modal-export-import .tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            };
        });

        // Export to file
        const btnExportFile = document.getElementById('btn-export-file');
        if (btnExportFile) {
            btnExportFile.onclick = () => this.exportToFile();
        }

        // Export to URL
        const btnExportUrl = document.getElementById('btn-export-url');
        if (btnExportUrl) {
            btnExportUrl.onclick = () => this.exportToURL();
        }

        // Import from file
        const btnImportFile = document.getElementById('btn-import-file');
        const importFileInput = document.getElementById('import-file-input');
        if (btnImportFile && importFileInput) {
            btnImportFile.onclick = () => importFileInput.click();
            importFileInput.onchange = (e) => this.importFromFile(e.target.files[0]);
        }

        // Import from URL
        const btnImportUrl = document.getElementById('btn-import-url');
        if (btnImportUrl) {
            btnImportUrl.onclick = () => this.importFromURL();
        }

        // Copy URL
        const btnCopyUrl = document.getElementById('btn-copy-url');
        if (btnCopyUrl) {
            btnCopyUrl.onclick = () => this.copyURL();
        }

        // Open URL
        const btnOpenUrl = document.getElementById('btn-open-url');
        if (btnOpenUrl) {
            btnOpenUrl.onclick = () => this.openURL();
        }

        // Welcome page buttons
        const btnWelcomeSignin = document.getElementById('btn-welcome-signin');
        if (btnWelcomeSignin) {
            btnWelcomeSignin.onclick = () => {
                this.app.sync.openSyncModal();
            };
        }
        
        const btnWelcomeCreate = document.getElementById('btn-welcome-create-project');
        if (btnWelcomeCreate) {
            btnWelcomeCreate.onclick = () => {
                this.app.modals.openProject();
            };
        }

        const btnWelcomeImport = document.getElementById('btn-welcome-import');
        if (btnWelcomeImport) {
            btnWelcomeImport.onclick = () => {
                this.openModal('import');
            };
        }

        // Handle URL import on page load
        this.checkURLImport();
    }

    openModal(tab = 'export') {
        this.app.modals.show('export-import');
        this.initTabs();
        this.switchTab(tab);
    }

    initTabs() {
        // Reset to export tab when opening
        this.switchTab('export');
        // Hide URL result
        const urlResult = document.getElementById('export-url-result');
        if (urlResult) urlResult.classList.add('hidden');
        // Clear import errors/success
        const importError = document.getElementById('import-error');
        if (importError) {
            importError.classList.add('hidden');
            importError.textContent = '';
        }
        const importSuccess = document.getElementById('import-success');
        if (importSuccess) {
            importSuccess.classList.add('hidden');
            importSuccess.textContent = '';
        }
        // Clear file name
        const fileName = document.getElementById('import-file-name');
        if (fileName) fileName.textContent = '';
    }

    switchTab(tab) {
        const modal = document.getElementById('modal-export-import');
        if (!modal) return;
        
        // Update tab buttons
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab panels
        modal.querySelectorAll('.tab-panel').forEach(panel => {
            if (panel.id === `tab-${tab}`) {
                panel.classList.remove('hidden');
                panel.classList.add('active');
            } else {
                panel.classList.add('hidden');
                panel.classList.remove('active');
            }
        });
    }

    exportToFile() {
        const data = this.getExportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whistler-export-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportToURL() {
        const data = this.getExportData();
        const json = JSON.stringify(data);
        const base64 = btoa(unescape(encodeURIComponent(json)));
        const url = `${window.location.origin}${window.location.pathname}?import=${base64}`;
        
        const urlInput = document.getElementById('export-url-input');
        const urlResult = document.getElementById('export-url-result');
        if (urlInput && urlResult) {
            urlInput.value = url;
            urlResult.classList.remove('hidden');
        }
    }

    getExportData() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            projects: this.app.state.projects,
            files: this.app.state.files,
            collections: this.app.state.collections,
            timestamps: this.app.state.timestamps
        };
    }

    importFromFile(file) {
        if (!file) return;

        const fileNameDiv = document.getElementById('import-file-name');
        if (fileNameDiv) {
            fileNameDiv.textContent = `Selected: ${file.name}`;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);
                this.importData(data);
            } catch (err) {
                this.showImportError('Invalid file format. Please make sure the file is a valid Whistler export.');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
    }

    async importFromURL() {
        const urlInput = document.getElementById('import-url-input');
        if (!urlInput || !urlInput.value.trim()) {
            this.showImportError('Please enter a valid URL.');
            return;
        }

        try {
            const url = new URL(urlInput.value);
            const base64 = url.searchParams.get('import');
            if (!base64) {
                this.showImportError('Invalid URL format. The URL must contain an "import" parameter.');
                return;
            }

            const json = decodeURIComponent(escape(atob(base64)));
            const data = JSON.parse(json);
            this.importData(data);
            urlInput.value = '';
        } catch (err) {
            this.showImportError('Failed to import from URL. Please check that the URL is valid.');
            console.error('Import error:', err);
        }
    }

    checkURLImport() {
        const params = new URLSearchParams(window.location.search);
        const base64 = params.get('import');
        if (base64) {
            try {
                const json = decodeURIComponent(escape(atob(base64)));
                const data = JSON.parse(json);
                
                // Clear the URL parameter
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Show confirmation before importing
                if (confirm('Import data from URL? This will replace all existing data.')) {
                    this.importData(data);
                }
            } catch (err) {
                console.error('URL import error:', err);
                alert('Failed to import data from URL.');
            }
        }
    }

    importData(data) {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            // Clear existing data
            this.app.state.projects = data.projects || [];
            this.app.state.files = data.files || [];
            this.app.state.collections = data.collections || [];
            this.app.state.timestamps = data.timestamps || [];

            // Reset active states
            this.app.state.activeProjectId = null;
            this.app.state.activeFileId = null;
            this.app.state.activeCollectionId = null;

            // Save to storage
            this.app.storage.save();

            // Refresh UI
            this.app.ui.renderProjectDropdown();
            
            // Close modal
            this.app.modals.close();
            
            // Show welcome page if no projects, otherwise go to storage
            if (this.app.state.projects.length === 0) {
                this.app.router.goTo('welcome');
            } else {
                this.app.router.openProject(this.app.state.projects[0].id);
            }

            // Show success notification
            this.showImportSuccess('Data imported successfully!');
            
        } catch (err) {
            this.showImportError('Failed to import data. The file may be corrupted or in an incompatible format.');
            console.error('Import error:', err);
        }
    }

    showImportSuccess(message) {
        const successDiv = document.getElementById('import-success');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.classList.remove('hidden');
        }
    }

    showImportError(message) {
        const errorDiv = document.getElementById('import-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    copyURL() {
        const urlInput = document.getElementById('export-url-input');
        if (urlInput) {
            urlInput.select();
            urlInput.setSelectionRange(0, 99999); // For mobile
            document.execCommand('copy');
            const btnCopy = document.getElementById('btn-copy-url');
            if (btnCopy) {
                const originalText = btnCopy.innerHTML;
                btnCopy.innerHTML = '<i class="ph-bold ph-check"></i> <span>Copied!</span>';
                setTimeout(() => {
                    btnCopy.innerHTML = originalText;
                }, 2000);
            }
        }
    }

    openURL() {
        const urlInput = document.getElementById('export-url-input');
        if (urlInput && urlInput.value) {
            window.open(urlInput.value, '_blank');
        }
    }
}

// Start
const app = new WhistlerApp();

// Dev: capture runtime errors and show in debug panel (temporary)
window.addEventListener('error', function(ev) {
    try {
        const panel = document.getElementById('debug-errors');
        const body = document.getElementById('debug-errors-body');
        if (panel && body) {
            panel.style.display = 'block';
            const msg = `[Error] ${ev.message} at ${ev.filename}:${ev.lineno}:${ev.colno}\n${ev.error ? ev.error.stack : ''}`;
            body.textContent = (body.textContent || '') + msg + '\n\n';
        }
    } catch (e) {}
    console.error(ev);
});
window.addEventListener('unhandledrejection', function(ev) {
    try {
        const panel = document.getElementById('debug-errors');
        const body = document.getElementById('debug-errors-body');
        if (panel && body) {
            panel.style.display = 'block';
            const msg = `[UnhandledRejection] ${ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)}\n${ev.reason && ev.reason.stack ? ev.reason.stack : ''}`;
            body.textContent = (body.textContent || '') + msg + '\n\n';
        }
    } catch (e) {}
    console.error(ev);
});
