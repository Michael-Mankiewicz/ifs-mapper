import { useEffect, useLayoutEffect, useRef, useState } from "react";

type PartType = "Exile" | "Manager" | "Firefighter";
type FieldKey =
  | "imagery"
  | "age"
  | "role"
  | "body"
  | "wants"
  | "fears"
  | "triggers"
  | "thoughts"
  | "feelings"
  | "sensations"
  | "strategies"
  | "needs";

type Part = {
  id: string;
  title: string;
  partType: PartType;
  x: number;
  y: number;
  protectedPartIds: string[];
  fields: Record<FieldKey, string>;
};

type CardSize = {
  width: number;
  height: number;
};

type MapData = {
  version: 1;
  parts: Part[];
};

const STORAGE_KEY = "ifs-map-v1";
const ARROW_PADDING = 10;

function createPart(): Part {
  return {
    id: crypto.randomUUID(),
    title: "New Part",
    partType: "Exile",
    x: 120,
    y: 120,
    protectedPartIds: [],
    fields: {
      imagery: "",
      age: "",
      role: "",
      body: "",
      wants: "",
      fears: "",
      triggers: "",
      thoughts: "",
      feelings: "",
      sensations: "",
      strategies: "",
      needs: "",
    }
  };
}

function normalizePart(part: Part): Part {
  return {
    ...part,
    protectedPartIds: part.protectedPartIds ?? [],
    fields: {
      imagery: part.fields?.imagery ?? "",
      age: part.fields?.age ?? "",
      role: part.fields?.role ?? "",
      body: part.fields?.body ?? "",
      wants: part.fields?.wants ?? "",
      fears: part.fields?.fears ?? "",
      triggers: part.fields?.triggers ?? "",
      thoughts: part.fields?.thoughts ?? "",
      feelings: part.fields?.feelings ?? "",
      sensations: part.fields?.sensations ?? "",
      strategies: part.fields?.strategies ?? "",
      needs: part.fields?.needs ?? "",
    },
  };
}

function getPartColors(partType: PartType) {
  switch (partType) {
    case "Exile":
      return {
        outer: "bg-[#17233a]",
        inner: "bg-[#1e2d4a]",
        label: "bg-[#17233a]",
        title: "text-cyan-200",
        chip: "bg-cyan-400 text-slate-950",
        arrow: "#67e8f9",
      };

    case "Firefighter":
      return {
        outer: "bg-[#3a1717]",
        inner: "bg-[#4a1e1e]",
        label: "bg-[#3a1717]",
        title: "text-red-200",
        chip: "bg-red-400 text-slate-950",
        arrow: "#f87171",
      };

    case "Manager":
      return {
        outer: "bg-[#252933]",
        inner: "bg-[#343946]",
        label: "bg-[#252933]",
        title: "text-slate-200",
        chip: "bg-slate-300 text-slate-950",
        arrow: "#cbd5e1",
      };
  }
}

export default function App() {
  const [scale, setScale] = useState(1);
  const [fontScale, setFontScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sizes, setSizes] = useState<Record<string, CardSize>>({});
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  function loadInitialParts() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [createPart()];

    try {
      const data = JSON.parse(saved) as MapData;
      return (data.parts ?? [createPart()]).map(normalizePart);
    } catch {
      return [createPart()];
    }
  }

  const [history, setHistory] = useState<{
    past: Part[][];
    present: Part[];
    future: Part[][];
  }>(() => ({
    past: [],
    present: loadInitialParts(),
    future: [],
  }));

  const parts = history.present;

  const [linkDrag, setLinkDrag] = useState<{
    fromPartId: string;
    x: number;
    y: number;
    hoverPartId: string | null;
  } | null>(null);

  useLayoutEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        parts,
      })
    );
  }, [parts]);

  useLayoutEffect(() => {
  const saved = localStorage.getItem("fontScale");
  if (saved) setFontScale(Number(saved));
}, []);

useLayoutEffect(() => {
  localStorage.setItem("fontScale", String(fontScale));
}, [fontScale]);

  function updateSize(id: string, size: CardSize) {
    setSizes((current) => {
      const existing = current[id];

      if (
        existing &&
        existing.width === size.width &&
        existing.height === size.height
      ) {
        return current;
      }

      return {
        ...current,
        [id]: size,
      };
    });
  }

useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if (!ctrlOrCmd) return;

    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    ) {
      return;
    }

    const key = e.key.toLowerCase();

    // Undo
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }

    // Redo (Ctrl+Y OR Ctrl+Shift+Z)
    if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [undo, redo]);

  function commitParts(updater: (current: Part[]) => Part[]) {
    setHistory((history) => {
      const next = updater(history.present);

      if (JSON.stringify(next) === JSON.stringify(history.present)) {
        return history;
      }

      return {
        past: [...history.past, history.present].slice(-100),
        present: next,
        future: [],
      };
    });
  }

  function setPartsLive(updater: (current: Part[]) => Part[]) {
    setHistory((history) => ({
      ...history,
      present: updater(history.present),
    }));
  }

  function undo() {
    setHistory((history) => {
      const previous = history.past.at(-1);
      if (!previous) return history;

      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      };
    });
  }

  function redo() {
    setHistory((history) => {
      const next = history.future[0];
      if (!next) return history;

      return {
        past: [...history.past, history.present],
        present: next,
        future: history.future.slice(1),
      };
    });
  }

  function focusPartNetwork(part: Part) {
    const connectedIds = new Set<string>();

    connectedIds.add(part.id);

    // parts this part protects
    part.protectedPartIds.forEach((id) => connectedIds.add(id));

    // parts protecting this part
    parts.forEach((otherPart) => {
      if (otherPart.protectedPartIds.includes(part.id)) {
        connectedIds.add(otherPart.id);
      }
    });

    const connectedParts = parts.filter((p) => connectedIds.has(p.id));

    if (connectedParts.length === 0) return;

    const padding = 220;

    const minX = Math.min(...connectedParts.map((p) => p.x));
    const minY = Math.min(...connectedParts.map((p) => p.y));

    const maxX = Math.max(
      ...connectedParts.map((p) => {
        const size = sizes[p.id] ?? { width: 500, height: 400 };
        return p.x + size.width;
      })
    );

    const maxY = Math.max(
      ...connectedParts.map((p) => {
        const size = sizes[p.id] ?? { width: 500, height: 400 };
        return p.y + size.height;
      })
    );

    const networkWidth = maxX - minX + padding * 2;
    const networkHeight = maxY - minY + padding * 2;

    const sidePanelWidth = selectedPartId ? 380 : 0;
    const availableWidth = window.innerWidth - sidePanelWidth;
    const availableHeight = window.innerHeight;

    const targetScale = Math.min(
      availableWidth / networkWidth,
      availableHeight / networkHeight,
      1.1
    );

    const clampedScale = Math.max(0.2, targetScale);

    const networkCenterX = (minX + maxX) / 2;
    const networkCenterY = (minY + maxY) / 2;

    const targetPan = {
      x: availableWidth / 2 - networkCenterX * clampedScale,
      y: availableHeight / 2 - networkCenterY * clampedScale,
    };

    animateViewport(clampedScale, targetPan);
    setSelectedPartId(part.id);
  }

  function animateViewport(targetScale: number, targetPan: { x: number; y: number }) {
    const startScale = scale;
    const startPan = pan;

    const duration = 450;
    const startTime = performance.now();

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOut(progress);

      setScale(startScale + (targetScale - startScale) * eased);

      setPan({
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  function focusPart(part: Part) {
    const targetScale = 1.1;
    const cardSize = sizes[part.id] ?? { width: 500, height: 400 };

    const sidePanelWidth = selectedPartId ? 380 : 0;
    const availableWidth = window.innerWidth - sidePanelWidth;

    const screenCenterX = availableWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const partCenterX = part.x + cardSize.width / 2;
    const partCenterY = part.y + cardSize.height / 2;

    const startScale = scale;
    const startPan = pan;

    const targetPan = {
      x: screenCenterX - partCenterX * targetScale,
      y: screenCenterY - partCenterY * targetScale,
    };

    const duration = 450;
    const startTime = performance.now();

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOut(progress);

      setScale(startScale + (targetScale - startScale) * eased);

      setPan({
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    setSelectedPartId(part.id);
    requestAnimationFrame(animate);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON"
      ) {
        return;
      }

      if (e.key.toLowerCase() !== "f") return;
      if (!selectedPartId) return;

      const selectedPart = parts.find((part) => part.id === selectedPartId);
      if (!selectedPart) return;

      if (e.shiftKey) {
        focusPartNetwork(selectedPart);
      } else {
        focusPart(selectedPart);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPartId, parts, sizes, scale, pan]);

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();

    const zoomSpeed = 0.0015;
    const nextScale = Math.min(
      Math.max(scale * (1 - e.deltaY * zoomSpeed), 0.1),
      2.5
    );

    const rect = e.currentTarget.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - pan.x) / scale;
    const worldY = (mouseY - pan.y) / scale;

    setScale(nextScale);
    setPan({
      x: mouseX - worldX * nextScale,
      y: mouseY - worldY * nextScale,
    });
  }

  const panStart = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  function handleBackgroundPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (target.closest("[data-card]")) return;
    setSelectedPartId(null);

    e.currentTarget.setPointerCapture(e.pointerId);

    panStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function handleBackgroundPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!panStart.current) return;

    const dx = e.clientX - panStart.current.pointerX;
    const dy = e.clientY - panStart.current.pointerY;

    setPan({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy,
    });
  }

  function handleBackgroundPointerUp() {
    panStart.current = null;
  }

  function addPart() {
    commitParts((current) => [
      ...current,
      {
        ...createPart(),
        x: 140 + current.length * 40,
        y: 140 + current.length * 40,
      },
    ]);
  }


  function startLinkDrag(partId: string, e: React.PointerEvent) {
    if (!e.shiftKey) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    setLinkDrag({
      fromPartId: partId,
      x: (e.clientX - pan.x) / scale,
      y: (e.clientY - pan.y) / scale,
      hoverPartId: null,
    });
  }

  function moveLinkDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!linkDrag) return;

    const elementUnderMouse = document.elementFromPoint(
      e.clientX,
      e.clientY
    ) as HTMLElement | null;

    const cardEl = elementUnderMouse?.closest(
      "[data-part-id]"
    ) as HTMLElement | null;
    const hoverPartId = cardEl?.dataset.partId ?? null;

    const hoverPart =
      hoverPartId ? parts.find((p) => p.id === hoverPartId) : null;

    const fromPart = parts.find((p) => p.id === linkDrag.fromPartId);

    const isValidHover =
      hoverPart &&
      fromPart &&
      hoverPart.id !== fromPart.id &&
      !(fromPart.partType === "Exile" && hoverPart.partType === "Exile");

    setLinkDrag((current) =>
      current
        ? {
            ...current,
            x: (e.clientX - pan.x) / scale,
            y: (e.clientY - pan.y) / scale,
            hoverPartId: isValidHover ? hoverPart.id : null,
          }
        : null
    );
  }

  function finishLinkDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!linkDrag) return;

    const elementUnderMouse = document.elementFromPoint(
      e.clientX,
      e.clientY
    ) as HTMLElement | null;

    const cardEl = elementUnderMouse?.closest(
      "[data-part-id]"
    ) as HTMLElement | null;

    const targetPartId = cardEl?.dataset.partId;

    if (targetPartId && targetPartId !== linkDrag.fromPartId) {
      const fromPart = parts.find((p) => p.id === linkDrag.fromPartId);
      const targetPart = parts.find((p) => p.id === targetPartId);

      if (fromPart && targetPart) {
        if (fromPart.partType === "Exile") {
          // Dragging FROM exile TO manager/firefighter:
          // target protects exile
          if (targetPart.partType !== "Exile") {
            if (!targetPart.protectedPartIds.includes(fromPart.id)) {
              updateProtectedParts(targetPart.id, [
                ...targetPart.protectedPartIds,
                fromPart.id,
              ]);
            }
          }
        } else {
          // Dragging FROM manager/firefighter TO anything:
          // source protects target
          if (!fromPart.protectedPartIds.includes(targetPart.id)) {
            updateProtectedParts(fromPart.id, [
              ...fromPart.protectedPartIds,
              targetPart.id,
            ]);
          }
        }
      }
    }

    setLinkDrag(null);
  }

  function updatePart(id: string, updates: Partial<Part>) {
    commitParts((current) =>
      current.map((part) => (part.id === id ? { ...part, ...updates } : part))
    );
  }

  function updatePartField(id: string, key: FieldKey, value: string) {
    commitParts((current) =>
      current.map((part) =>
        part.id === id
          ? {
              ...part,
              fields: {
                ...part.fields,
                [key]: value,
              },
            }
          : part
      )
    );
  }

  function addProtectorToExile(exileId: string, protectorId: string) {
    commitParts((current) =>
      current.map((part) =>
        part.id === protectorId
          ? {
              ...part,
              protectedPartIds: [...part.protectedPartIds, exileId],
            }
          : part
      )
    );
  }

  function removeProtectorFromExile(exileId: string, protectorId: string) {
    commitParts((current) =>
      current.map((part) =>
        part.id === protectorId
          ? {
              ...part,
              protectedPartIds: part.protectedPartIds.filter(
                (id) => id !== exileId
              ),
            }
          : part
      )
    );
  }

  function updateProtectedParts(id: string, protectedPartIds: string[]) {
    commitParts((current) =>
      current.map((part) =>
        part.id === id ? { ...part, protectedPartIds } : part
      )
    );
  }

  function removePart(id: string) {
    commitParts((current) =>
      current
        .filter((part) => part.id !== id)
        .map((part) => ({
          ...part,
          protectedPartIds: part.protectedPartIds.filter(
            (protectedId) => protectedId !== id
          ),
        }))
    );

    setSizes((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
  }

  function exportJson() {
    const data: MapData = {
      version: 1,
      parts,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "ifs-map.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const text = await file.text();
    const data = JSON.parse(text) as MapData;

    if (!Array.isArray(data.parts)) {
      alert("Invalid IFS map file.");
      return;
    }

    setParts(data.parts.map(normalizePart));
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#0b1220] text-slate-200"
      style={{ fontSize: `${fontScale}rem` }}
    >
      <div className="fixed left-4 top-4 z-50 flex gap-2">
        <button
          onClick={addPart}
          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          Add part
        </button>
        
        <button
          onClick={exportJson}
          className="rounded-lg bg-[#17233a] px-3 py-2 text-sm"
        >
          Export Map
        </button>

        <label className="cursor-pointer rounded-lg bg-[#17233a] px-3 py-2 text-sm">
          Import Map
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
            }}
          />
        </label>

        <div className="rounded-lg bg-[#17233a] px-3 py-2 text-sm">
          Zoom: {Math.round(scale * 100)}%
        </div>

        <button
          onClick={undo}
          disabled={history.past.length === 0}
          className="rounded-lg bg-[#17233a] px-3 py-2 text-sm disabled:opacity-40"
        >
          Undo
        </button>

        <button
          onClick={redo}
          disabled={history.future.length === 0}
          className="rounded-lg bg-[#17233a] px-3 py-2 text-sm disabled:opacity-40"
        >
          Redo
        </button>
      </div>

      <div
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={(e) => {
          if (linkDrag) {
            moveLinkDrag(e);
          } else {
            handleBackgroundPointerMove(e);
          }
        }}
        onPointerUp={(e) => {
          if (linkDrag) {
            finishLinkDrag(e);
          } else {
            handleBackgroundPointerUp(e);
          }
        }}
        className="relative h-screen w-screen overflow-hidden cursor-move"
      >
        <div
          id="map-canvas"
          className="relative h-full w-full origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <ProtectionArrowLayer
            parts={parts}
            sizes={sizes}
            selectedPartId={selectedPartId}
            linkDrag={linkDrag}
          />

          {parts.map((part) => (
            <DraggableCard
              key={part.id}
              x={part.x}
              y={part.y}
              scale={scale}
              onMove={(x, y) =>
                setPartsLive((current) =>
                  current.map((p) =>
                    p.id === part.id ? { ...p, x, y } : p
                  )
                )
              }
              onDoubleClick={() => focusPart(part)}
            >
              <div
                data-part-id={part.id}
                onPointerDown={(e) => startLinkDrag(part.id, e)}
              >
                <PartCard
                  part={part}
                  allParts={parts}
                  onMeasure={(size) => updateSize(part.id, size)}
                  onUpdate={(updates) => updatePart(part.id, updates)}
                  onUpdateField={(key, value) =>
                    updatePartField(part.id, key, value)
                  }
                  onUpdateProtectedParts={(protectedPartIds) =>
                    updateProtectedParts(part.id, protectedPartIds)
                  }
                  onAddProtector={(protectorId) => addProtectorToExile(part.id, protectorId)}
                  onRemoveProtector={(protectorId) =>
                    removeProtectorFromExile(part.id, protectorId)
                  }
                  onRemove={() => removePart(part.id)}
                  fontScale={fontScale}
                  onSelect={() => setSelectedPartId(part.id)}
                  isSelected={selectedPartId === part.id}
                  isLinkHoverTarget={linkDrag?.hoverPartId === part.id}
                  onFocusPart={focusPart}
                />
              </div>
            </DraggableCard>
          ))}
        </div>
      </div>

      <SidePanel
        part={parts.find((part) => part.id === selectedPartId) ?? null}
        onChange={(key, value) => {
          if (!selectedPartId) return;
          updatePartField(selectedPartId, key, value);
        }}
        onClose={() => setSelectedPartId(null)}
      />

      <div className="fixed bottom-3 left-4 z-50 rounded-md bg-black/30 px-2 py-1 text-xs text-slate-300 backdrop-blur">
        v1.1
      </div>
    </main>
    
  );
}

function ProtectionArrowLayer({
  parts,
  sizes,
  selectedPartId,
  linkDrag,
}: {
  parts: Part[];
  sizes: Record<string, CardSize>;
  selectedPartId: string | null;
  linkDrag: {
    fromPartId: string;
    x: number;
    y: number;
    hoverPartId: string | null;
  } | null;
}) {
  function getCenter(id: string) {
    const part = parts.find((p) => p.id === id);
    const size = sizes[id];

    if (!part || !size) return null;

    return {
      x: part.x + size.width / 2,
      y: part.y + size.height / 2,
    };
  }

  function getEdgePoint(
    from: { x: number; y: number },
    to: { x: number; y: number },
    width: number,
    height: number
  ) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const halfW = width / 2;
    const halfH = height / 2;

    const scale = Math.min(
      Math.abs(halfW / dx || Infinity),
      Math.abs(halfH / dy || Infinity)
    );

    return {
      x: to.x - dx * scale,
      y: to.y - dy * scale,
    };
  }

  function pullBackPoint(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;

    return {
      x: to.x - (dx / length) * ARROW_PADDING,
      y: to.y - (dy / length) * ARROW_PADDING,
    };
  }

  return (
    <svg className="pointer-events-none absolute left-0 top-0 h-[5000px] w-[5000px] overflow-visible">
      <defs>
        {(["Exile", "Firefighter", "Manager"] as PartType[]).map((type) => {
          const colors = getPartColors(type);

          return (
            <marker
              key={type}
              id={`protected-arrow-${type}`}
              markerWidth="40"
              markerHeight="40"
              refX="34"
              refY="20"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L0,40 L40,20 z" fill={colors.arrow} />
            </marker>
          );
        })}
      </defs>

      {parts.flatMap((part) =>
        part.protectedPartIds.map((protectedId) => {
          const fromCenter = getCenter(part.id);
          const toCenter = getCenter(protectedId);

          const fromSize = sizes[part.id];
          const toSize = sizes[protectedId];

          if (!fromCenter || !toCenter || !fromSize || !toSize) return null;

          const from = getEdgePoint(
            toCenter,
            fromCenter,
            fromSize.width,
            fromSize.height
          );

          const rawTo = getEdgePoint(
            fromCenter,
            toCenter,
            toSize.width,
            toSize.height
          );

          const to = pullBackPoint(from, rawTo);

          const protectedPart = parts.find((p) => p.id === protectedId);

          const hasReverseArrow =
            protectedPart?.protectedPartIds.includes(part.id) ?? false;

          const curveAmount = hasReverseArrow ? 80 : 0;

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.sqrt(dx * dx + dy * dy) || 1;

          const normalX = -dy / length;
          const normalY = dx / length;

          const controlX = midX + normalX * curveAmount;
          const controlY = midY + normalY * curveAmount;

          const colors = getPartColors(part.partType);

          const isConnectedToSelected =
          selectedPartId === null ||
          selectedPartId === part.id ||
          selectedPartId === protectedId;

        const opacity = isConnectedToSelected ? 1 : 0.12;
        const strokeWidth = isConnectedToSelected ? 4 : 2;

          return (
            <path
              key={`${part.id}-${protectedId}`}
              d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
              fill="none"
              stroke={colors.arrow}
              strokeWidth={strokeWidth}
              opacity={opacity}
              markerEnd={`url(#protected-arrow-${part.partType})`}
            />
          );
        })
      )}
      {linkDrag && (() => {
        const fromPart = parts.find((p) => p.id === linkDrag.fromPartId);
        if (!fromPart) return null;

        const fromSize = sizes[fromPart.id];
        if (!fromSize) return null;

        const fromCenter = {
          x: fromPart.x + fromSize.width / 2,
          y: fromPart.y + fromSize.height / 2,
        };

        const isExile = fromPart.partType === "Exile";

        const hoverPart = linkDrag.hoverPartId
          ? parts.find((p) => p.id === linkDrag.hoverPartId)
          : null;

        const colors =
          isExile && hoverPart
            ? getPartColors(hoverPart.partType)
            : getPartColors(fromPart.partType);

        const hoverSize = hoverPart ? sizes[hoverPart.id] : null;

        let x1: number;
        let y1: number;
        let x2: number;
        let y2: number;

        if (hoverPart && hoverSize) {
          const hoverCenter = {
            x: hoverPart.x + hoverSize.width / 2,
            y: hoverPart.y + hoverSize.height / 2,
          };

          if (isExile) {
            // hovered card protects exile: hovered card → exile
            const from = getEdgePoint(fromCenter, hoverCenter, hoverSize.width, hoverSize.height);
            const rawTo = getEdgePoint(hoverCenter, fromCenter, fromSize.width, fromSize.height);
            const to = pullBackPoint(from, rawTo);

            x1 = from.x;
            y1 = from.y;
            x2 = to.x;
            y2 = to.y;
          } else {
            // source protects hovered card: source → hovered card
            const from = getEdgePoint(hoverCenter, fromCenter, fromSize.width, fromSize.height);
            const rawTo = getEdgePoint(fromCenter, hoverCenter, hoverSize.width, hoverSize.height);
            const to = pullBackPoint(from, rawTo);

            x1 = from.x;
            y1 = from.y;
            x2 = to.x;
            y2 = to.y;
          }
        } else if (isExile) {
          const rawTo = getEdgePoint(
            { x: linkDrag.x, y: linkDrag.y },
            fromCenter,
            fromSize.width,
            fromSize.height
          );

          const to = pullBackPoint({ x: linkDrag.x, y: linkDrag.y }, rawTo);

          x1 = linkDrag.x;
          y1 = linkDrag.y;
          x2 = to.x;
          y2 = to.y;
        } else {
          const from = getEdgePoint(
            { x: linkDrag.x, y: linkDrag.y },
            fromCenter,
            fromSize.width,
            fromSize.height
          );

          x1 = from.x;
          y1 = from.y;
          x2 = linkDrag.x;
          y2 = linkDrag.y;
        }

        const markerType = isExile && hoverPart ? hoverPart.partType : fromPart.partType;

        return (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={colors.arrow}
            strokeWidth={linkDrag.hoverPartId ? 4 : 3}
            strokeDasharray="8 6"
            opacity={0.95}
            markerEnd={`url(#protected-arrow-${markerType})`}
          />
        );
      })()}
    </svg>
  );
}

function DraggableCard({
  x,
  y,
  scale,
  onMove,
  onDoubleClick,
  children,
}: {
  x: number;
  y: number;
  scale: number;
  onMove: (x: number, y: number) => void;
  onDoubleClick?: () => void;
  children: React.ReactNode;
}) {
  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    cardX: number;
    cardY: number;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "BUTTON"
    ) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      cardX: x,
      cardY: y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;

    const dx = (e.clientX - dragStart.current.pointerX) / scale;
    const dy = (e.clientY - dragStart.current.pointerY) / scale;

    onMove(dragStart.current.cardX + dx, dragStart.current.cardY + dy);
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  return (
    <div
      data-card
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

function PartTypeDropdown({
  value,
  onChange,
  colors,
  fontScale,
}: {
  value: PartType;
  onChange: (value: PartType) => void;
  colors: ReturnType<typeof getPartColors>;
  fontScale: number;
}) {
  const [open, setOpen] = useState(false);

  const options: PartType[] = ["Exile", "Manager", "Firefighter"];

  return (
    <div className="relative">
      {/* BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className={`flex items-center gap-2 rounded-md px-3 py-1 ${colors.inner} text-slate-100 hover:brightness-110`}
        style={{ fontSize: `${0.875 * fontScale}rem` }}
      >
        {value}

        {/* CLEAN ARROW */}
        <svg
          className={`h-4 w-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          className={`absolute left-1/2 top-full z-50 mt-1 w-32 -translate-x-1/2 overflow-hidden rounded-md shadow-lg ${colors.inner}`}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left ${
                option === value
                  ? `${colors.chip}`
                  : "text-slate-200 hover:bg-white/10"
              }`}
              style={{ fontSize: `${0.875 * fontScale}rem` }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PartCard({
  part,
  allParts,
  onMeasure,
  onUpdate,
  onUpdateField,
  onUpdateProtectedParts,
  onRemove,
  fontScale,
  onSelect,
  isSelected,
  onAddProtector,
  onRemoveProtector,
  isLinkHoverTarget,
  onFocusPart,
}: {
  part: Part;
  allParts: Part[];
  onMeasure: (size: CardSize) => void;
  onUpdate: (updates: Partial<Part>) => void;
  onUpdateField: (key: FieldKey, value: string) => void;
  onUpdateProtectedParts: (protectedPartIds: string[]) => void;
  onRemove: () => void;
  fontScale: number;
  onSelect: () => void;
  isSelected: boolean;
  onAddProtector: (protectorId: string) => void;
  onRemoveProtector: (protectorId: string) => void;
  isLinkHoverTarget: boolean;
  onFocusPart: (part: Part) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const colors = getPartColors(part.partType);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const borderBox = entry.borderBoxSize?.[0];

      if (borderBox) {
        onMeasure({
          width: borderBox.inlineSize,
          height: borderBox.blockSize,
        });
        return;
      }

      if (!ref.current) return;

      onMeasure({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      });
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [onMeasure]);

  return (
    <section
      ref={ref}
      onPointerDown={onSelect}
      className={`w-[500px] rounded-2xl p-4 shadow-xl ${
        colors.outer
      } ${isSelected ? "ring-2 ring-white" : ""} ${
        isLinkHoverTarget ? "outline outline-2 outline-dashed outline-white" : ""
      }`}
    >
      <div className={`overflow-visible rounded-xl ${colors.inner}`}>
        <div className="relative  py-3">
          <button
            onClick={onRemove}
            className="absolute right-1 top-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-black/20 hover:text-slate-100"
          >
            remove
          </button>

          <div className="flex justify-center">
            <input
              value={part.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className={`w-full bg-transparent text-center font-semibold outline-none ${colors.title}`}
              style={{ fontSize: `${2.5 * fontScale}rem` }}
              placeholder="Part Name"
            />
          </div>

          <div className="mt-1 flex justify-center">
            <PartTypeDropdown
              value={part.partType}
              colors={colors}
              fontScale={fontScale}
              onChange={(partType) =>
                onUpdate({
                  partType,
                  protectedPartIds:
                    partType === "Exile" ? [] : part.protectedPartIds,
                })
              }
            />
          </div>
        </div>

        {part.partType === "Exile" ? (
          <ProtectedBySelector
            exile={part}
            allParts={allParts}
            chipClassName={colors.chip}
            fontScale={fontScale}
            onAddProtector={onAddProtector}
            onRemoveProtector={onRemoveProtector}
            onFocusPart={onFocusPart}
          />
        ) : (
          <ProtectedPartsSelector
            part={part}
            allParts={allParts}
            chipClassName={colors.chip}
            fontScale={fontScale}
            onChange={onUpdateProtectedParts}
            onFocusPart={onFocusPart}
          />
        )}

        <FieldRow
          label="Visual description"
          value={part.fields.imagery}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("imagery", value)}
        />
        <FieldRow
          label="Age it feels"
          value={part.fields.age}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("age", value)}
        />

        <FieldRow
          label="Role or job"
          value={part.fields.role}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("role", value)}
        />

        <FieldRow
          label="Where felt in body"
          value={part.fields.body}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("body", value)}
        />

        <FieldRow
          label="What it wants for me"
          value={part.fields.wants}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("wants", value)}
        />

        <FieldRow
          label="What it fears would happen if it stopped"
          value={part.fields.fears}
          labelClassName={colors.label}
          fontScale={fontScale}
          onChange={(value) => onUpdateField("fears", value)}
        />
      </div>
    </section>
  );
}

function SidePanel({
  part,
  onChange,
  onClose,
}: {
  part: Part | null;
  onChange: (key: FieldKey, value: string) => void;
  onClose: () => void;
}) {
  const isOpen = part !== null;

  return (
    <aside
      className={`fixed right-0 top-0 z-50 h-screen w-[380px] bg-[#111827] shadow-2xl transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {part && (
        <>
          <div className="flex items-center justify-between border-b border-slate-700 p-4">
            <div>
              <div className="text-lg font-semibold text-slate-100">
                {part.title || "Untitled"}
              </div>
              <div className="text-xs text-slate-400">{part.partType}</div>
            </div>

            <button
              onClick={onClose}
              className="rounded-md bg-white/10 px-2 py-1 text-sm text-slate-300 hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          <div className="h-[calc(100vh-72px)] space-y-4 overflow-y-auto p-4">
            <PanelField
              label="Trigger cues"
              value={part.fields.triggers}
              onChange={(v) => onChange("triggers", v)}
            />

            <PanelField
              label="Thoughts it says"
              value={part.fields.thoughts}
              onChange={(v) => onChange("thoughts", v)}
            />

            <PanelField
              label="Feelings it carries"
              value={part.fields.feelings}
              onChange={(v) => onChange("feelings", v)}
            />

            <PanelField
              label="Body sensations"
              value={part.fields.sensations}
              onChange={(v) => onChange("sensations", v)}
            />

            <PanelField
              label="Strategies it uses"
              value={part.fields.strategies}
              onChange={(v) => onChange("strategies", v)}
            />

            <PanelField
              label="What it needs from me"
              value={part.fields.needs}
              onChange={(v) => onChange("needs", v)}
            />
          </div>
        </>
      )}
    </aside>
  );
}

function PanelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-400">{label}</div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[90px] w-full resize-none overflow-hidden rounded-lg bg-[#1f2937] p-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
      />
    </label>
  );
}

function ProtectedBySelector({
  exile,
  allParts,
  chipClassName,
  onAddProtector,
  onRemoveProtector,
  onFocusPart,
  fontScale,
}: {
  exile: Part;
  allParts: Part[];
  chipClassName: string;
  onAddProtector: (protectorId: string) => void;
  onRemoveProtector: (protectorId: string) => void;
  onFocusPart: (part: Part) => void;
  fontScale: number;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (!containerRef.current) return;

        if (!containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const possibleProtectors = allParts.filter(
      (p) => p.id !== exile.id && p.partType !== "Exile"
    );

    const protectors = possibleProtectors.filter((p) =>
      p.protectedPartIds.includes(exile.id)
    );

    const unselectedProtectors = possibleProtectors.filter(
      (p) => !p.protectedPartIds.includes(exile.id)
    );

    return (
      <div className="border-t border-slate-500/30 px-3 py-2">
        <div
          className="mb-1 text-slate-400"
          style={{ fontSize: `${0.875 * fontScale}rem` }}
        >
          Protected by:
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {protectors.map((protector) => (
            <span
              key={protector.id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chipClassName}`}
              style={{ fontSize: `${0.75 * fontScale}rem` }}
            >
              <button
                type="button"
                onClick={() => onFocusPart(protector)}
                className="hover:underline"
              >
                {protector.title || "Untitled"}
              </button>

              <button
                type="button"
                onClick={() => onRemoveProtector(protector.id)}
                className="font-bold hover:opacity-70"
                title="Remove connection"
              >
                ×
              </button>
            </span>
          ))}

          <div ref={containerRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="rounded-full bg-black/20 px-2 py-0.5 text-slate-300 hover:bg-black/30"
              style={{ fontSize: `${0.75 * fontScale}rem` }}
            >
              + Add
            </button>

            {open && (
              <div
                onWheel={(e) => e.stopPropagation()}
                className="absolute left-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-md bg-[#0b1220] p-1 shadow-lg"
              >
                {unselectedProtectors.length === 0 ? (
                  <div
                    className="px-3 py-2 text-slate-500"
                    style={{ fontSize: `${0.75 * fontScale}rem` }}
                  >
                    No available protectors
                  </div>
                ) : (
                  unselectedProtectors.map((protector) => (
                    <button
                      key={protector.id}
                      type="button"
                      onClick={() => {
                        onAddProtector(protector.id);
                        setOpen(false);
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-slate-200 hover:bg-white/10"
                      style={{ fontSize: `${0.75 * fontScale}rem` }}
                    >
                      {protector.title || "Untitled"}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

function ProtectedPartsSelector({
  part,
  allParts,
  chipClassName,
  onChange,
  fontScale,
  onFocusPart,
}: {
  part: Part;
  allParts: Part[];
  chipClassName: string;
  onChange: (protectedPartIds: string[]) => void;
  fontScale: number;
  onFocusPart: (part: Part) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;

      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const otherParts = allParts.filter((p) => p.id !== part.id);

  const protectedParts = otherParts.filter((p) =>
    part.protectedPartIds.includes(p.id)
  );

  const unprotectedParts = otherParts.filter(
    (p) => !part.protectedPartIds.includes(p.id)
  );

  function protectPart(id: string) {
    onChange([...part.protectedPartIds, id]);
    setOpen(false);
  }

  function unprotectPart(id: string) {
    onChange(part.protectedPartIds.filter((partId) => partId !== id));
  }

  return (
    <div className="border-t border-slate-500/30 px-3 py-2">
      <div
        className="mb-1 text-slate-400"
        style={{ fontSize: `${0.875 * fontScale}rem` }}
      >
        Parts protected:
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {protectedParts.map((protectedPart) => (
          <span
            key={protectedPart.id}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chipClassName}`}
            style={{ fontSize: `${0.75 * fontScale}rem` }}
          >
            <button
              type="button"
              onClick={() => onFocusPart(protectedPart)}
              className="hover:underline"
            >
              {protectedPart.title || "Untitled"}
            </button>

            <button
              type="button"
              onClick={() => unprotectPart(protectedPart.id)}
              className="font-bold hover:opacity-70"
              title="Remove connection"
            >
              ×
            </button>
          </span>
        ))}

        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-full bg-black/20 px-2 py-0.5 text-slate-300 hover:bg-black/30"
            style={{ fontSize: `${0.75 * fontScale}rem` }}
          >
            + Add
          </button>

          {open && (
            <div onWheel={(e) => e.stopPropagation()}
            className="absolute left-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-md bg-[#0b1220] p-1 shadow-lg">
              {unprotectedParts.length === 0 ? (
                <div
                  className="px-3 py-2 text-slate-500"
                  style={{ fontSize: `${0.75 * fontScale}rem` }}
                >
                  No more parts
                </div>
              ) : (
                unprotectedParts.map((otherPart) => (
                  <button
                    key={otherPart.id}
                    type="button"
                    onClick={() => protectPart(otherPart.id)}
                    className="block w-full rounded px-3 py-2 text-left text-slate-200 hover:bg-white/10"
                    style={{ fontSize: `${0.75 * fontScale}rem` }}
                  >
                    {otherPart.title || "Untitled"}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  labelClassName,
  onChange,
  fontScale,
}: {
  label: string;
  value: string;
  labelClassName: string;
  onChange: (value: string) => void;
  fontScale: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="grid grid-cols-[150px_1fr] border-t border-slate-500/30">
      <label className={`${labelClassName} px-4 py-3 text-slate-400`}
            style={{ fontSize: `${0.875 * fontScale}rem` }}>
        {label}:
      </label>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[42px] resize-none overflow-hidden bg-transparent px-4 py-3 text-slate-200 outline-none placeholder:text-slate-500"
        style={{ fontSize: `${0.875 * fontScale}rem` }}
        placeholder=""
      />
    </div>
  );
}