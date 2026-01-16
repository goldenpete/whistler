import {
    FolderPlus, Star, Heart, Flag, Tag, Bookmark, Briefcase, House, User, Users,
    Planet, Rocket, Code, Cpu, Database, GameController, MusicNotes, Image,
    FilmStrip, FileText, Book, Folder
} from "@phosphor-icons/react";

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

export const getIcon = (name?: string) => {
    return iconMap[name || "Folder"] || Folder;
};

export const iconNames = Object.keys(iconMap);
