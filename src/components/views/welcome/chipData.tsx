/**
 * ─── chipData.tsx ─────────────────────────────────────────────────────────────
 *
 * Chip data arrays for each FeatureSection on the WelcomeView landing page.
 * Each array defines the interactive chip toggles that let users explore
 * different sub-features of a section.
 *
 * Each chip has:
 *   - label:   button text shown in the chip bar
 *   - title:   heading shown in the detail panel when active
 *   - desc:    description paragraph
 *   - mockup:  JSX mockup component rendered as the visual
 *
 * Arrays: mediaChips, orgChips, highlightChips, collectionChips,
 *         graphChips, docChips, spotlightChips, securityChips
 *
 * Used by: WelcomeView.tsx (passed to <FeatureSection chips={...} />)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Play, NotePencil, Tag, LinkSimple } from "@phosphor-icons/react";
import type { ChipDetail } from "./FeatureSection";

import {
    VideoChipMockup,
    AudioChipMockup,
    ImageChipMockup,
    PdfChipMockup,
    YoutubeChipMockup,
    DragDropMockup,
    GridListMockup,
    MultiSelectMockup,
    BulkActionsMockup,
    SearchFilterMockup,
    TimeRangeMockup,
    PdfSelectionMockup,
    ImageRegionMockup,
    NotesColorsMockup,
    makeNodeMockup,
    EdgeDrawingMockup,
    BucketsFoldersMockup,
    ColorIconMockup,
    DragReorderMockup,
    ViewModeCollMockup,
    HighlightGroupMockup,
    RichFormattingMockup,
    FileEmbedsMockup,
    AutoSaveMockup,
    ViewModesMockup,
    FuzzySearchMockup,
    CommandPaletteMockup,
    GroupedResultsMockup,
    KeyboardNavMockup,
    NumericCodeMockup,
    TwoFactorMockup,
    PasskeyMockup,
    EncryptionMockup,
} from "./mockups";

/* ═══════════════════════════════════════════════════════
   MEDIA CHIPS
   ═══════════════════════════════════════════════════════ */

export const mediaChips: ChipDetail[] = [
    { label: "Video", title: "Video player", desc: "Variable speed playback from 0.25x to 4x, A–B looping to repeat a section, per-file zoom, fullscreen mode, and automatic resume from your last playback position.", mockup: <VideoChipMockup /> },
    { label: "Audio", title: "Audio player", desc: "Waveform-style progress visualization, skip forward and back by 10 seconds, loop toggle, and playback speed adjustment between 0.5x and 2x. Volume is remembered per file.", mockup: <AudioChipMockup /> },
    { label: "Images", title: "Image viewer", desc: "Pan by clicking and dragging. Zoom with mouse wheel, pinch, or toolbar buttons. Draw rectangular region highlights directly on the image. Supports fullscreen viewing.", mockup: <ImageChipMockup /> },
    { label: "PDFs", title: "PDF viewer", desc: "Page-by-page navigation with keyboard and buttons. Zoom in and out with mouse wheel support. Select text to create annotations stored with the exact character range.", mockup: <PdfChipMockup /> },
    { label: "YouTube", title: "YouTube playback", desc: "Paste a YouTube URL and it plays inline using the YouTube IFrame API. Supports play, pause, seek, volume, and playback rate controls from within the app.", mockup: <YoutubeChipMockup /> },
];

/* ═══════════════════════════════════════════════════════
   ORGANIZATION CHIPS
   ═══════════════════════════════════════════════════════ */

export const orgChips: ChipDetail[] = [
    { label: "Drag & drop", title: "Drag and drop", desc: "Reorder files and folders by dragging them. Move items between folders by dropping them on a folder target. Powered by dnd-kit for smooth, accessible drag interactions.", mockup: <DragDropMockup /> },
    { label: "Grid / list view", title: "Grid and list views", desc: "Switch between a grid view with visual thumbnail cards and a compact list view. Your view preference is remembered per storage and collection.", mockup: <GridListMockup /> },
    { label: "Multi-select", title: "Multi-select", desc: "Click to select individual items, or use shift-click to select a range. Selected items are highlighted and a selection count is shown above the file list.", mockup: <MultiSelectMockup /> },
    { label: "Bulk actions", title: "Bulk actions", desc: "With multiple items selected, perform actions on all of them at once — move to a folder, delete, or open. Saves time when reorganizing large projects.", mockup: <BulkActionsMockup /> },
    { label: "Search & filter", title: "Search and filter", desc: "Search files by name within the current storage or folder. Filter by file type (video, audio, image, PDF) to narrow results. The filter bar sits above the file list.", mockup: <SearchFilterMockup /> },
];

/* ═══════════════════════════════════════════════════════
   HIGHLIGHT CHIPS
   ═══════════════════════════════════════════════════════ */

export const highlightChips: ChipDetail[] = [
    { label: "Time ranges", title: "Time-range highlights", desc: "While watching a video or listening to audio, mark a start and end timestamp to create a highlight. The highlighted range is shown on the seek bar and can be clicked to jump back.", mockup: <TimeRangeMockup /> },
    { label: "PDF text selection", title: "PDF text highlights", desc: "Select text directly in the PDF viewer to create an annotation. The exact character range and selected text content are stored so the highlight can be relocated on the page.", mockup: <PdfSelectionMockup /> },
    { label: "Image regions", title: "Image region highlights", desc: "Draw a rectangle on an image to highlight a specific area. The region is stored as normalized coordinates (0–1) so it works at any zoom level. Click a region highlight to pan and zoom to it.", mockup: <ImageRegionMockup /> },
    { label: "Notes & colors", title: "Notes and colors", desc: "Every highlight can have a text note and a color. Choose from multiple color options to organize highlights visually. Highlights can be grouped into collections for review and export.", mockup: <NotesColorsMockup /> },
];

/* ═══════════════════════════════════════════════════════
   COLLECTION CHIPS
   ═══════════════════════════════════════════════════════ */

export const collectionChips: ChipDetail[] = [
    { label: "Buckets & folders", title: "Buckets and folders", desc: "Collections live inside a three-level hierarchy. Buckets are the top level, folders sit inside buckets, and collections sit inside folders. This keeps highlights organized as your project grows.", mockup: <BucketsFoldersMockup /> },
    { label: "Color & icon", title: "Custom color and icon", desc: "Assign a color and icon to any collection for fast visual identification. Choose from 22 icons and a full color palette. The color appears as a dot in lists and as a border in grid view.", mockup: <ColorIconMockup /> },
    { label: "Drag & reorder", title: "Drag and reorder", desc: "Drag collections, folders, and buckets to reorder them within their parent. Move collections between folders by dragging and dropping. The order is saved automatically.", mockup: <DragReorderMockup /> },
    { label: "View modes", title: "Collection view modes", desc: "Switch between grid, list, and card views for collections. Grid shows thumbnail previews, list is compact, and card view shows the most detail. Your preference is remembered.", mockup: <ViewModeCollMockup /> },
    { label: "Highlight grouping", title: "Group highlights", desc: "A collection gathers highlights from different files and media types into one reviewable set. Browse all highlights in a collection, filter by type, and jump directly to the source media.", mockup: <HighlightGroupMockup /> },
];

/* ═══════════════════════════════════════════════════════
   GRAPH CHIPS
   ═══════════════════════════════════════════════════════ */

export const graphChips: ChipDetail[] = [
    { label: "File nodes", title: "File nodes", desc: "Add any file from your storage as a node on the graph canvas. The node shows the file name, type icon, and accent color. Click to open the file in its player.", mockup: makeNodeMockup(Play, "intro.mp4", "border-amber-400/60", "Link files from your storage to the canvas") },
    { label: "Collection nodes", title: "Collection nodes", desc: "Add collections as nodes to visualize how highlights and assets are grouped. The node displays the collection name and its custom icon and color.", mockup: makeNodeMockup(Tag, "B-Roll Assets", "border-sky-400/60", "Visualize collection groupings on the canvas") },
    { label: "Note nodes", title: "Note nodes", desc: "Create standalone text notes directly on the canvas. Useful for adding context, labels, or reminders alongside your connected assets.", mockup: makeNodeMockup(NotePencil, "Director notes", "border-emerald-400/60", "Add text notes anywhere on the canvas") },
    { label: "Link nodes", title: "Link nodes", desc: "Add external URLs as nodes on the graph. Useful for referencing external resources, documentation, or inspiration alongside your project assets.", mockup: makeNodeMockup(LinkSimple, "docs.example.com", "border-violet-400/60", "Reference external URLs on the canvas") },
    { label: "Edge drawing", title: "Edge drawing", desc: "Click and drag from one node to another to draw a connection edge. Edges visually represent relationships between assets. Right-click edges for a context menu to delete them.", mockup: <EdgeDrawingMockup /> },
];

/* ═══════════════════════════════════════════════════════
   DOCUMENT CHIPS
   ═══════════════════════════════════════════════════════ */

export const docChips: ChipDetail[] = [
    { label: "Rich formatting", title: "Rich text formatting", desc: "The toolbar supports bold, italic, underline, strikethrough, three heading levels, ordered and unordered lists, text alignment, and inline links. Formatting is applied to selected text.", mockup: <RichFormattingMockup /> },
    { label: "File embeds", title: "File embeds", desc: "Insert references to files from your storage directly in the document. A file picker dialog lets you browse and select files. Embedded references appear as clickable inline blocks.", mockup: <FileEmbedsMockup /> },
    { label: "Auto-save", title: "Auto-save", desc: "Documents save automatically as you type with a short debounce. A saved indicator appears in the header. No manual save button is needed — your work is always preserved.", mockup: <AutoSaveMockup /> },
    { label: "3 view modes", title: "Three view modes", desc: "Choose between page mode (fixed-width centered layout), pageless mode (full-width, no page boundaries), and wide mode (pageless with extra-wide content area). Switch modes from the toolbar.", mockup: <ViewModesMockup /> },
];

/* ═══════════════════════════════════════════════════════
   SPOTLIGHT CHIPS
   ═══════════════════════════════════════════════════════ */

export const spotlightChips: ChipDetail[] = [
    { label: "Fuzzy search", title: "Fuzzy matching", desc: "Type partial or abbreviated names and the search engine matches them across all entity types. Results are ranked by relevance so the best match appears first.", mockup: <FuzzySearchMockup /> },
    { label: "Command palette", title: "Command palette", desc: "Type \">\" to switch to command mode. Execute actions like creating a new project, opening settings, or navigating to a specific view — all without leaving the keyboard.", mockup: <CommandPaletteMockup /> },
    { label: "Grouped results", title: "Grouped results", desc: "Search results are organized into sections by type — files, collections, documents, highlights, graphs. Each group has a header and type-specific icons for quick scanning.", mockup: <GroupedResultsMockup /> },
    { label: "Keyboard nav", title: "Keyboard navigation", desc: "Use arrow keys to move between results, Enter to open the selected item, and Escape to dismiss. Tab switches between result groups. No mouse required.", mockup: <KeyboardNavMockup /> },
];

/* ═══════════════════════════════════════════════════════
   SECURITY CHIPS
   ═══════════════════════════════════════════════════════ */

export const securityChips: ChipDetail[] = [
    { label: "Numeric code", title: "Numeric code sign-in", desc: "Your account is a 16-digit number like 4821-7390-5612-8403. No email, no password, no username required. Generate one randomly with a single click, or type your own. Your code is your identity — simple and private.", mockup: <NumericCodeMockup /> },
    { label: "2FA", title: "Two-factor authentication", desc: "Add TOTP-based two-factor authentication using any authenticator app. Scan a QR code during setup, then enter a 6-digit code on each login. You can enable or disable 2FA at any time from settings.", mockup: <TwoFactorMockup /> },
    { label: "Passkeys", title: "Passkey authentication", desc: "Register passkeys using biometrics (Touch ID, Windows Hello) or physical security keys (YubiKey). Passkeys bypass the TOTP step entirely for faster, phishing-resistant sign-in. Manage multiple passkeys from settings.", mockup: <PasskeyMockup /> },
    { label: "Encryption & privacy", title: "Encryption & privacy", desc: "Data is encrypted client-side before upload. There are no trackers, no analytics cookies, and no third-party scripts. Per-entity sync toggles let you choose exactly what leaves your device. Timestamp-based conflict resolution keeps the newest version.", mockup: <EncryptionMockup /> },
];
