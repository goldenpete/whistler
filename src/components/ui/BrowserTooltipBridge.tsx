import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TOOLTIP_ARROW_DEPTH,
  TOOLTIP_GAP,
  TooltipSurface,
  type TooltipSide,
} from "@/components/ui/tooltip";
import { useStore } from "@/store/useStore";

const cachedTitles = new WeakMap<HTMLElement, string>();

interface ActiveTooltip {
  element: HTMLElement;
  text: string;
  side: TooltipSide;
  left: number;
  top: number;
}

function resolveTooltipSide(element: HTMLElement): TooltipSide {
  const rect = element.getBoundingClientRect();

  if (rect.left < 96) return "right";
  if (window.innerWidth - rect.right < 96) return "left";
  if (rect.top < 72) return "bottom";
  return "top";
}

function getTooltipPosition(element: HTMLElement, side: TooltipSide) {
  const rect = element.getBoundingClientRect();

  switch (side) {
    case "bottom":
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + TOOLTIP_GAP + TOOLTIP_ARROW_DEPTH,
      };
    case "left":
      return {
        left: rect.left - TOOLTIP_GAP - TOOLTIP_ARROW_DEPTH,
        top: rect.top + rect.height / 2,
      };
    case "right":
      return {
        left: rect.right + TOOLTIP_GAP + TOOLTIP_ARROW_DEPTH,
        top: rect.top + rect.height / 2,
      };
    case "top":
    default:
      return {
        left: rect.left + rect.width / 2,
        top: rect.top - TOOLTIP_GAP - TOOLTIP_ARROW_DEPTH,
      };
  }
}

function clearTooltip(element: HTMLElement) {
  const title = cachedTitles.get(element);
  if (title !== undefined) {
    element.setAttribute("title", title);
    cachedTitles.delete(element);
  }
}

function isButtonLike(element: HTMLElement) {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");

  return (
    tagName === "button" ||
    tagName === "a" ||
    tagName === "summary" ||
    role === "button" ||
    role === "link"
  );
}

function getVisibleText(element: HTMLElement) {
  return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function shouldShowTooltip(element: HTMLElement) {
  if (isButtonLike(element) && getVisibleText(element).length > 0) {
    return false;
  }

  return true;
}

export function BrowserTooltipBridge() {
  const tooltipsEnabled = useStore((state) => state.tooltipsEnabled);
  const [tooltip, setTooltip] = useState<ActiveTooltip | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const tooltipsEnabledRef = useRef(tooltipsEnabled);

  useEffect(() => {
    tooltipsEnabledRef.current = tooltipsEnabled;

    if (!tooltipsEnabled) {
      setTooltip(null);
    }
  }, [tooltipsEnabled]);

  useEffect(() => {
    const hideTooltip = (element?: HTMLElement | null) => {
      const target = element ?? activeElementRef.current;
      if (!target) {
        return;
      }

      clearTooltip(target);

      if (activeElementRef.current === target) {
        activeElementRef.current = null;
      }

      setTooltip((current) => (current?.element === target ? null : current));
    };

    const showTooltip = (element: HTMLElement) => {
      if (element.closest('[data-slot="tooltip-trigger"]')) {
        return;
      }

      const title = element.getAttribute("title")?.trim();
      if (!title) {
        return;
      }

      if (activeElementRef.current && activeElementRef.current !== element) {
        hideTooltip(activeElementRef.current);
      }

      cachedTitles.set(element, title);
      element.removeAttribute("title");

      activeElementRef.current = element;

      if (!tooltipsEnabledRef.current) {
        setTooltip(null);
        return;
      }

      if (!shouldShowTooltip(element)) {
        setTooltip(null);
        return;
      }

      const side = resolveTooltipSide(element);
      const position = getTooltipPosition(element, side);

      setTooltip({
        element,
        text: title,
        side,
        ...position,
      });
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const tooltipHost = target.closest("[title]");
      if (!(tooltipHost instanceof HTMLElement)) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && tooltipHost.contains(relatedTarget)) {
        return;
      }

      showTooltip(tooltipHost);
    };

    const handleMouseOut = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const tooltipHost = activeElementRef.current;
      if (!(tooltipHost instanceof HTMLElement)) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (target instanceof Node && !tooltipHost.contains(target)) {
        return;
      }

      if (relatedTarget instanceof Node && tooltipHost.contains(relatedTarget)) {
        return;
      }

      hideTooltip(tooltipHost);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const tooltipHost = target.closest("[title]");
      if (!(tooltipHost instanceof HTMLElement)) {
        return;
      }

      showTooltip(tooltipHost);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const tooltipHost = activeElementRef.current;
      if (!(tooltipHost instanceof HTMLElement)) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && tooltipHost.contains(relatedTarget)) {
        return;
      }

      hideTooltip(tooltipHost);
    };

    const handlePointerDown = () => {
      hideTooltip();
    };

    window.addEventListener("mouseover", handleMouseOver, true);
    window.addEventListener("mouseout", handleMouseOut, true);
    window.addEventListener("focusin", handleFocusIn, true);
    window.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      hideTooltip();
      window.removeEventListener("mouseover", handleMouseOver, true);
      window.removeEventListener("mouseout", handleMouseOut, true);
      window.removeEventListener("focusin", handleFocusIn, true);
      window.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    if (!tooltip) {
      return;
    }

    const updatePosition = () => {
      if (!tooltip.element.isConnected) {
        clearTooltip(tooltip.element);
        activeElementRef.current = null;
        setTooltip(null);
        return;
      }

      const side = resolveTooltipSide(tooltip.element);
      const position = getTooltipPosition(tooltip.element, side);
      setTooltip((current) =>
        current && current.element === tooltip.element
          ? { ...current, side, ...position }
          : current
      );
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(tooltip.element);
    updatePosition();

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      resizeObserver.disconnect();
    };
  }, [tooltip]);

  if (!tooltip) {
    return null;
  }

  const containerTransforms: Record<TooltipSide, string> = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  };

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70]"
      style={{
        left: tooltip.left,
        top: tooltip.top,
        transform: containerTransforms[tooltip.side],
      }}
    >
      <TooltipSurface side={tooltip.side}>{tooltip.text}</TooltipSurface>
    </div>,
    document.body
  );
}
