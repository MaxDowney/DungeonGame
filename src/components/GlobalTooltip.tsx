import { useEffect, useRef, useState } from "react";

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

const tooltipText = (target: EventTarget | null): string | null => {
  const element = target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
  return element?.dataset.tooltip ?? null;
};

export function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const pendingTooltip = useRef<TooltipState | null>(null);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimer.current) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
    };

    const schedule = (state: TooltipState, delay = 420) => {
      pendingTooltip.current = state;
      clearShowTimer();
      showTimer.current = window.setTimeout(() => {
        if (pendingTooltip.current) setTooltip(pendingTooltip.current);
        showTimer.current = null;
      }, delay);
    };

    const show = (event: PointerEvent | FocusEvent) => {
      const text = tooltipText(event.target);
      if (!text) return;
      const point = "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : (() => {
            const element = event.target instanceof Element ? event.target.getBoundingClientRect() : null;
            return element ? { x: element.left + element.width / 2, y: element.top } : { x: 0, y: 0 };
          })();
      schedule({ text, x: point.x, y: point.y }, "clientX" in event ? 420 : 180);
    };

    const move = (event: PointerEvent) => {
      const text = tooltipText(event.target);
      if (!text) return;
      const next = { text, x: event.clientX, y: event.clientY };
      pendingTooltip.current = next;
      setTooltip((current) => (current ? next : current));
    };

    const hide = () => {
      clearShowTimer();
      pendingTooltip.current = null;
      setTooltip(null);
    };

    window.addEventListener("pointerover", show);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerout", hide);
    window.addEventListener("focusin", show);
    window.addEventListener("focusout", hide);
    return () => {
      window.removeEventListener("pointerover", show);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", hide);
      window.removeEventListener("focusin", show);
      window.removeEventListener("focusout", hide);
      clearShowTimer();
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      className="global-tooltip"
      style={{
        left: Math.min(window.innerWidth - 18, tooltip.x + 16),
        top: Math.min(window.innerHeight - 18, tooltip.y + 18),
      }}
    >
      {tooltip.text}
    </div>
  );
}
