import { useStore } from "@/store/useStore";
import { GraphNode } from "@/types";
import { Button } from "@/components/ui/button";
import {
    File as FileIcon,
    FolderOpen,
    Clock,
    Link as LinkIcon,
    Note,
    PencilSimple,
    X
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NodePreviewCardProps {
    node: GraphNode;
    onClose: () => void;
    onEdit: () => void;
    style?: React.CSSProperties;
    className?: string;
}

export function NodePreviewCard({ node, onClose, onEdit, style, className }: NodePreviewCardProps) {
    const { files, collections, timestamps, docs } = useStore();
    const navigate = useNavigate();

    const type = node.type;
    const title = node.title;
    
    // Resolve linked items
    const selectedFile = type === 'file' && node.linkedId ? files.find(f => f.id === node.linkedId) : null;
    const selectedCollection = type === 'collection' && node.linkedId ? collections.find(c => c.id === node.linkedId) : null;
    const selectedDoc = type === 'doc' && node.linkedId ? docs.find(d => d.id === node.linkedId) : null;
    const selectedTimestamp = type === 'timestamp' && node.linkedId ? timestamps.find(t => t.id === node.linkedId) : null;
    const selectedTimestampFile = selectedTimestamp ? files.find(f => f.id === selectedTimestamp.fileId) : null;
    const linkUrl = type === 'link' ? node.url || "" : "";

    const canOpen = 
        (type === 'file' && selectedFile) ||
        (type === 'collection' && selectedCollection) ||
        (type === 'doc' && selectedDoc) ||
        (type === 'timestamp' && selectedTimestamp && selectedTimestampFile) ||
        (type === 'link' && linkUrl);

    const handleOpen = () => {
        if (type === 'file' && selectedFile) {
            navigate(`/file/${selectedFile.id}`);
        } else if (type === 'collection' && selectedCollection) {
            useStore.setState({ activeCollectionId: selectedCollection.id });
            navigate("/collections");
        } else if (type === 'doc' && selectedDoc) {
            useStore.setState({ activeDocId: selectedDoc.id });
            navigate("/docs");
        } else if (type === 'timestamp' && selectedTimestamp) {
            navigate(`/file/${selectedTimestamp.fileId}?t=${selectedTimestamp.start}`);
        } else if (type === 'link' && linkUrl) {
            window.open(linkUrl, "_blank", "noopener,noreferrer");
        }
        onClose();
    };

    return (
        <div 
            className={cn(
                "absolute z-50 w-72 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-3 text-white",
                className
            )}
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {type} Node
                </span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={onEdit} title="Edit Node">
                        <PencilSimple size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={onClose} title="Close">
                        <X size={14} />
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-muted-foreground">
                        {type === 'file' && <FileIcon size={20} />}
                        {type === 'collection' && <FolderOpen size={20} />}
                        {type === 'timestamp' && <Clock size={20} className="text-amber-400" />}
                        {type === 'doc' && <FileIcon size={20} />}
                        {type === 'link' && <LinkIcon size={20} />}
                        {type === 'note' && <Note size={20} />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground break-words leading-tight">
                            {type === 'note' ? title : (
                                <>
                                    {type === 'file' && (selectedFile?.name || "Unknown File")}
                                    {type === 'collection' && (selectedCollection?.name || "Unknown Collection")}
                                    {type === 'doc' && (selectedDoc?.name || "Unknown Doc")}
                                    {type === 'timestamp' && (selectedTimestamp?.note || selectedTimestampFile?.name || "Unknown Timestamp")}
                                    {type === 'link' && (linkUrl || "No URL")}
                                </>
                            )}
                        </div>
                        
                        {type === 'timestamp' && selectedTimestamp && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {(() => {
                                    const mins = Math.floor(selectedTimestamp.start / 60);
                                    const secs = Math.floor(selectedTimestamp.start % 60);
                                    return `${mins}:${secs.toString().padStart(2, "0")}`;
                                })()} • {selectedTimestampFile?.name}
                            </div>
                        )}

                        {(type !== 'note' && type !== 'timestamp') && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {title !== (
                                    type === 'file' ? selectedFile?.name :
                                    type === 'collection' ? selectedCollection?.name :
                                    type === 'doc' ? selectedDoc?.name :
                                    type === 'link' ? linkUrl : 
                                    title
                                ) ? title : null}
                            </div>
                        )}
                    </div>
                </div>

                {canOpen && (
                    <Button 
                        size="sm" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleOpen}
                    >
                        Open
                    </Button>
                )}
            </div>
        </div>
    );
}
