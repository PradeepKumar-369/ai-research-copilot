import { useMemo, useState } from 'react';
import { aggregateField } from '@/lib/researchUtils';

const TYPE_META = {
  paper: { color: '#4f46e5', label: 'Paper' },
  model: { color: '#0ea5e9', label: 'Model' },
  dataset: { color: '#10b981', label: 'Dataset' },
  method: { color: '#f59e0b', label: 'Method' },
  limitation: { color: '#f43f5e', label: 'Limitation' },
};

const MAX_LABEL = 22;
const truncate = (s) => (s && s.length > MAX_LABEL ? s.slice(0, MAX_LABEL - 1) + '…' : s);

function buildGraph(papers) {
  const nodes = [];
  const indexById = new Map();
  const edges = [];

  const addNode = (id, label, type) => {
    if (!indexById.has(id)) {
      indexById.set(id, nodes.length);
      nodes.push({ id, label, type });
    }
    return indexById.get(id);
  };
  const link = (a, b) => edges.push({ source: a, target: b });

  const completed = papers.filter(p => p.processing_status === 'completed');
  completed.forEach(p => {
    const pIdx = addNode('paper:' + p.id, p.title || p.file_name, 'paper');
    ['models', 'datasets', 'methods', 'limitations'].forEach(field => {
      const top = aggregateField([p], field).slice(0, 3);
      top.forEach(({ name }) => {
        const nIdx = addNode(field + ':' + name, name, field === 'limitations' ? 'limitation' : field.slice(0, -1));
        link(pIdx, nIdx);
      });
    });
  });
  return { nodes, edges };
}

function layout(nodes, edges, width, height, iter = 400) {
  nodes.forEach(n => { n.x = width / 2 + (Math.random() - 0.5) * 300; n.y = height / 2 + (Math.random() - 0.5) * 300; n.vx = 0; n.vy = 0; });
  for (let i = 0; i < iter; i++) {
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = 4200 / (d * d);
        nodes[a].vx += dx / d * f; nodes[a].vy += dy / d * f;
        nodes[b].vx -= dx / d * f; nodes[b].vy -= dy / d * f;
      }
    }
    edges.forEach(e => {
      const a = nodes[e.source], b = nodes[e.target];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 150) * 0.04;
      a.vx += dx / d * f; a.vy += dy / d * f;
      b.vx -= dx / d * f; b.vy -= dy / d * f;
    });
    nodes.forEach(n => { n.vx += (width / 2 - n.x) * 0.006; n.vy += (height / 2 - n.y) * 0.006; });
    nodes.forEach(n => { n.vx *= 0.85; n.vy *= 0.85; n.x += n.vx; n.y += n.vy; });
  }
  const pad = 40;
  nodes.forEach(n => { n.x = Math.min(width - pad, Math.max(pad, n.x)); n.y = Math.min(height - pad, Math.max(pad, n.y)); });
}

export default function KnowledgeGraphTab({ papers }) {
  const [selected, setSelected] = useState(null);

  const { nodes, edges, W, H } = useMemo(() => {
    const g = buildGraph(papers);
    // Scale the canvas with node count so dense graphs don't get crushed together.
    const w = Math.max(900, Math.min(1600, 260 + g.nodes.length * 18));
    const h = Math.max(560, Math.min(1100, 260 + g.nodes.length * 14));
    if (g.nodes.length) layout(g.nodes, g.edges, w, h);
    return { ...g, W: w, H: h };
  }, [papers]);

  if (nodes.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Analyze papers to build the knowledge graph.</p>;
  }

  const connected = selected
    ? new Set(edges.filter(e => e.source === selected || e.target === selected).flatMap(e => [e.source, e.target]))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {Object.values(TYPE_META).map(t => (
          <div key={t.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
            {t.label}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/40 overflow-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-none">
          {edges.map((e, i) => {
            const a = nodes[e.source], b = nodes[e.target];
            if (!a || !b) return null;
            const dim = connected && !(connected.has(e.source) && connected.has(e.target));
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={1.25} opacity={dim ? 0.08 : 0.45} />;
          })}
          {nodes.map((n, i) => {
            const meta = TYPE_META[n.type];
            const dim = connected && !connected.has(i);
            const isSel = selected === i;
            const r = n.type === 'paper' ? 9 : 5;
            const labelY = n.type === 'paper' ? n.y - r - 6 : n.y + r + 12;
            return (
              <g key={n.id} className="cursor-pointer" onClick={() => setSelected(isSel ? null : i)} opacity={dim ? 0.2 : 1}>
                <circle cx={n.x} cy={n.y} r={r + (isSel ? 4 : 0)} fill={meta.color} stroke="white" strokeWidth={2} />
                <text
                  x={n.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize={n.type === 'paper' ? 12 : 10.5}
                  fontWeight={n.type === 'paper' ? 600 : 500}
                  fill="#1e293b"
                  paintOrder="stroke"
                  stroke="#f8fafc"
                  strokeWidth={4}
                  strokeLinejoin="round"
                >
                  {truncate(n.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-slate-400">Click a node to highlight its connections. The graph links each paper to the models, datasets, methods, and limitations it reports.</p>
    </div>
  );
}
