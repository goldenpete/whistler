/**
 * ─── iconMap.ts ──────────────────────────────────────────────────────────────
 *
 * Maps string icon names to Phosphor icon React components.
 *
 * Collections, storages, files, and graph nodes store their icons as string
 * names (e.g. "Star", "Heart"). This map resolves those strings to the actual
 * Phosphor React component so they can be rendered dynamically:
 *
 *   const Icon = getIcon(collection.icon); // e.g. Star component
 *   <Icon weight="bold" size={16} />
 *
 * To add a new icon option:
 *   1. Import it from @phosphor-icons/react
 *   2. Add an entry to `iconMap` with the key matching the string name
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    FolderPlus, Star, Heart, Flag, Tag, Bookmark, Briefcase, House, User, Users,
    Planet, Rocket, Code, Cpu, Database, GameController, MusicNotes, Image,
    FilmStrip, FileText, Book, Folder
} from "@phosphor-icons/react";

/** String-name → Phosphor component lookup table. */
export const iconMap: Record<string, any> = {
    "FolderPlus": FolderPlus,
    "Star": Star,
    "Heart": Heart,
    "Flag": Flag,
    "Tag": Tag,
    "Bookmark": Bookmark,
    "Briefcase": Briefcase,
    "House": House,
    "User": User,
    "Users": Users,
    "Planet": Planet,
    "Rocket": Rocket,
    "Code": Code,
    "Cpu": Cpu,
    "Database": Database,
    "GameController": GameController,
    "MusicNotes": MusicNotes,
    "Image": Image,
    "FilmStrip": FilmStrip,
    "FileText": FileText,
    "Book": Book,
    "Folder": Folder
};

/** Resolve an icon name to its Phosphor component. Falls back to Folder. */
export const getIcon = (name?: string) => {
    return iconMap[name || "Folder"] || Folder;
};

/** All available icon names for the icon picker UI. */
export const iconNames = Object.keys(iconMap);
