import { useRef, useState, type ReactElement, type ReactNode } from "react";
import { WarningOctagon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DestructiveConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  subjectLabel: string;
  subjectContent: ReactNode;
  extraContent?: ReactNode;
  confirmLabel?: string;
  dismissLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
}

export function DestructiveConfirmDialog({
  trigger,
  title,
  description,
  subjectLabel,
  subjectContent,
  extraContent,
  confirmLabel = "Delete",
  dismissLabel = "Cancel",
  confirmDisabled = false,
  onConfirm,
}: DestructiveConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const ignoreNextCloseRef = useRef(false);

  const isSelectPortalEvent = (event: Event) => {
    const originalEvent = (event as CustomEvent<{ originalEvent?: Event }>)
      .detail?.originalEvent;
    const target = originalEvent?.target ?? event.target;
    const path =
      typeof event.composedPath === "function" ? event.composedPath() : [];
    const hasActiveSelectContent =
      typeof document !== "undefined" &&
      document.querySelector('[data-slot="select-content"]') !== null;

    return (
      hasActiveSelectContent ||
      path.some(
        (node) =>
          node instanceof Element &&
          (node.closest('[data-slot="select-content"]') ||
            node.closest('[data-slot="select-item"]') ||
            node.getAttribute("role") === "option"),
      ) ||
      (target instanceof Element &&
        Boolean(
          target.closest('[data-slot="select-content"]') ||
          target.closest('[data-slot="select-item"]') ||
          target.closest('[role="option"]'),
        ))
    );
  };

  const keepOpenForSelectPortalEvent = (event: Event) => {
    if (!isSelectPortalEvent(event)) {
      return;
    }

    ignoreNextCloseRef.current = true;
    event.preventDefault();

    window.setTimeout(() => {
      ignoreNextCloseRef.current = false;
    }, 0);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && ignoreNextCloseRef.current) {
      return;
    }

    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white"
        onInteractOutside={keepOpenForSelectPortalEvent}
        onPointerDownOutside={keepOpenForSelectPortalEvent}
        onFocusOutside={keepOpenForSelectPortalEvent}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">{subjectLabel}</Label>
            <div className="flex min-h-9 items-center gap-3 border border-red-500/25 bg-red-500/6 px-3 text-sm text-zinc-200">
              <WarningOctagon
                size={16}
                weight="fill"
                className="shrink-0 text-red-400"
              />
              <div className="min-w-0 flex-1 truncate font-medium text-white">
                {subjectContent}
              </div>
            </div>
          </div>
          {extraContent}
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4 sm:justify-between">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setOpen(false)}
            className="hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            {dismissLabel}
          </Button>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="destructive"
              type="button"
              disabled={confirmDisabled}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
