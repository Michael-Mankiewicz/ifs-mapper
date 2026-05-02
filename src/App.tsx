import { useEffect, useLayoutEffect, useRef, useState } from "react";

type PartType = "Exile" | "Manager" | "Firefighter";
type FieldKey = "imagery" | "age" | "role" | "body" | "wants" | "fears" ;

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
    },
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

  const [parts, setParts] = useState<Part[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [createPart()];

    try {
      const data = JSON.parse(saved) as MapData;
      return (data.parts ?? [createPart()]).map(normalizePart);
    } catch {
      return [createPart()];
    }
  });

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

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();

    const zoomSpeed = 0.0015;
    const nextScale = Math.min(
      Math.max(scale * (1 - e.deltaY * zoomSpeed), 0.35),
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
    setParts((current) => [
      ...current,
      {
        ...createPart(),
        x: 140 + current.length * 40,
        y: 140 + current.length * 40,
      },
    ]);
  }

  function updatePart(id: string, updates: Partial<Part>) {
    setParts((current) =>
      current.map((part) => (part.id === id ? { ...part, ...updates } : part))
    );
  }

  function updatePartField(id: string, key: FieldKey, value: string) {
    setParts((current) =>
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

  function updateProtectedParts(id: string, protectedPartIds: string[]) {
    setParts((current) =>
      current.map((part) =>
        part.id === id ? { ...part, protectedPartIds } : part
      )
    );
  }

  function removePart(id: string) {
    setParts((current) =>
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
        
      </div>

      <div
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
        className="relative h-screen w-screen overflow-hidden cursor-move"
      >
        <div
          className="relative h-full w-full origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <ProtectionArrowLayer parts={parts} sizes={sizes} />

          {parts.map((part) => (
            <DraggableCard
              key={part.id}
              x={part.x}
              y={part.y}
              scale={scale}
              onMove={(x, y) => updatePart(part.id, { x, y })}
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
                onRemove={() => removePart(part.id)}
                fontScale={fontScale}
              />
            </DraggableCard>
          ))}
        </div>
      </div>
      <div className="fixed bottom-3 left-4 z-50 rounded-md bg-black/30 px-2 py-1 text-xs text-slate-300 backdrop-blur">
        v1.0
      </div>
    </main>
    
  );
}

function ProtectionArrowLayer({
  parts,
  sizes,
}: {
  parts: Part[];
  sizes: Record<string, CardSize>;
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
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,12 L12,6 z" fill={colors.arrow} />
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

          return (
            <path
              key={`${part.id}-${protectedId}`}
              d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
              fill="none"
              stroke={colors.arrow}
              strokeWidth="3"
              markerEnd={`url(#protected-arrow-${part.partType})`}
            />
          );
        })
      )}
    </svg>
  );
}

function DraggableCard({
  x,
  y,
  scale,
  onMove,
  children,
}: {
  x: number;
  y: number;
  scale: number;
  onMove: (x: number, y: number) => void;
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
}: {
  part: Part;
  allParts: Part[];
  onMeasure: (size: CardSize) => void;
  onUpdate: (updates: Partial<Part>) => void;
  onUpdateField: (key: FieldKey, value: string) => void;
  onUpdateProtectedParts: (protectedPartIds: string[]) => void;
  onRemove: () => void;
  fontScale: number;
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
      className={`w-[500px] rounded-2xl ${colors.outer} p-4 shadow-xl`}
    >
      <div className={`overflow-hidden rounded-xl ${colors.inner}`}>
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

        {part.partType !== "Exile" && (
          <ProtectedPartsSelector
            part={part}
            allParts={allParts}
            chipClassName={colors.chip}
            fontScale={fontScale}
            onChange={onUpdateProtectedParts}
          />
        )}

        <FieldRow
          label="Visual Description"
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

function ProtectedPartsSelector({
  part,
  allParts,
  chipClassName,
  onChange,
  fontScale,
}: {
  part: Part;
  allParts: Part[];
  chipClassName: string;
  onChange: (protectedPartIds: string[]) => void;
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
          <button
            key={protectedPart.id}
            type="button"
            onClick={() => unprotectPart(protectedPart.id)}
            className={`rounded-full px-2 py-0.5 ${chipClassName}`}
            style={{ fontSize: `${0.75 * fontScale}rem` }}
            title="Click to remove"
          >
            {protectedPart.title || "Untitled"} ×
          </button>
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