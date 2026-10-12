import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function JournalHorizontalScroll({ scrollRef, tableRef }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const container = scrollRef.current;
    const table = tableRef.current;
    if (!container || !table) return undefined;
    let frame;
    const update = () => {
      const bounds = container.getBoundingClientRect();
      const tableBounds = table.getBoundingClientRect();
      const left = Math.max(12, bounds.left);
      const right = Math.min(window.innerWidth - 12, bounds.right);
      const maximum = container.scrollWidth - container.clientWidth;
      setPosition(maximum > 0 && right - left > 100 &&
        tableBounds.top < window.innerHeight - 80 && tableBounds.bottom > 80
        ? { left, width: right - left, maximum, value: container.scrollLeft }
        : null);
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    observer.observe(table);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [scrollRef, tableRef]);

  if (!position) return null;
  return createPortal(
    <div className="journal-horizontal-scroll" style={{ left: position.left, width: position.width }}>
      <span aria-hidden="true">↔</span>
      <input
        aria-label="Журналды солго же оңго жылдыруу"
        type="range"
        min={0}
        max={position.maximum}
        value={position.value}
        onChange={(event) => {
          const value = Number(event.target.value);
          scrollRef.current.scrollLeft = value;
          setPosition((current) => ({ ...current, value }));
        }}
      />
    </div>,
    document.body
  );
}
