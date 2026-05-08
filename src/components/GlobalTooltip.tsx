import { useEffect, useState } from "react";

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

  useEffect(() => {
    const show = (event: PointerEvent | FocusEvent) => {
      const text = tooltipText(event.target);
      if (!text) return;
      const point = "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : (() => {
            const element = event.target instanceof Element ? event.target.getBoundingClientRect() : null;
            return element ? { x: element.left + element.width / 2, y: element.top } : { x: 0, y: 0 };
          })();
      setTooltip({ text, x: point.x, y: point.y });
    };

    const move = (event: PointerEvent) => {
      const text = tooltipText(event.target);
      if (!text) return;
      setTooltip({ text, x: event.clientX, y: event.clientY });
    };

    const hide = () => setTooltip(null);

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
