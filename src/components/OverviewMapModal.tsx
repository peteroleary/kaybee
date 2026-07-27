import React, { useEffect, useRef, useState } from 'react';
import { X, Network, Sparkles, Filter, Layers, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import * as d3 from 'd3';
import { BoardData, CardItemData } from '../types';

interface OverviewMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardData[];
  activeBoardId: string;
  onSelectCard: (card: CardItemData) => void;
}

interface NodeData extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  status: CardItemData['status'];
  entityType: CardItemData['entityType'];
  priority: CardItemData['priority'];
  listName: string;
  boardName: string;
  cardData: CardItemData;
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  source: string | NodeData;
  target: string | NodeData;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#64748b',   // slate
  todo: '#3b82f6',      // blue
  in_progress: '#f59e0b', // amber
  in_review: '#a855f7',   // purple
  completed: '#10b981',   // emerald
  failed: '#f43f5e',      // rose
};

export const OverviewMapModal: React.FC<OverviewMapModalProps> = ({
  isOpen,
  onClose,
  boards,
  activeBoardId,
  onSelectCard
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [filterScope, setFilterScope] = useState<'current_board' | 'all_boards'>('current_board');
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  useEffect(() => {
    if (!isOpen || !svgRef.current) return;

    // Collect cards based on filter scope
    const targetBoards = filterScope === 'current_board' 
      ? boards.filter(b => b.id === activeBoardId) 
      : boards;

    const nodes: NodeData[] = [];
    const nodeMap = new Map<string, NodeData>();

    targetBoards.forEach(board => {
      board.lists.forEach(list => {
        list.cards.forEach(card => {
          const node: NodeData = {
            id: card.id,
            title: card.title,
            status: card.status,
            entityType: card.entityType,
            priority: card.priority,
            listName: list.title,
            boardName: board.name,
            cardData: card
          };
          nodes.push(node);
          nodeMap.set(card.id, node);
        });
      });
    });

    // Build dependency links
    const links: LinkData[] = [];
    nodes.forEach(node => {
      if (node.cardData.dependsOnCardIds) {
        node.cardData.dependsOnCardIds.forEach(depId => {
          if (nodeMap.has(depId)) {
            links.push({
              source: depId, // Dependent prerequisite task
              target: node.id  // Target card
            });
          }
        });
      }
    });

    const width = 800;
    const height = 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const container = svg
      .attr('viewBox', [0, 0, width, height])
      .append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Define Arrow Marker for Directed Dependency Links
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#818cf8');

    // Force Simulation setup
    const simulation = d3.forceSimulation<NodeData>(nodes)
      .force('link', d3.forceLink<NodeData, LinkData>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Render Links
    const link = container.append('g')
      .attr('stroke', '#6366f1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)')
      .selectAll('line')
      .data(links)
      .join('line');

    // Drag behavior for nodes
    const drag = (sim: d3.Simulation<NodeData, LinkData>) => {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag<SVGGElement, NodeData>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    // Render Node Groups
    const nodeGroup = container.append('g')
      .selectAll<SVGGElement, NodeData>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag(simulation) as any)
      .on('click', (_, d) => {
        onSelectCard(d.cardData);
      })
      .on('mouseover', (_, d) => setHoveredNode(d))
      .on('mouseout', () => setHoveredNode(null));

    // Outer Halo Circle
    nodeGroup.append('circle')
      .attr('r', 18)
      .attr('fill', d => STATUS_COLORS[d.status] || '#64748b')
      .attr('fill-opacity', 0.2)
      .attr('stroke', d => STATUS_COLORS[d.status] || '#64748b')
      .attr('stroke-width', 2);

    // Inner Core Circle
    nodeGroup.append('circle')
      .attr('r', 12)
      .attr('fill', d => STATUS_COLORS[d.status] || '#64748b');

    // Title Labels below Nodes
    nodeGroup.append('text')
      .text(d => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title)
      .attr('x', 0)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none');

    // Status Label Tag
    nodeGroup.append('text')
      .text(d => d.status.replace('_', ' '))
      .attr('x', 0)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none');

    // Simulation Ticks
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeData).x!)
        .attr('y1', d => (d.source as NodeData).y!)
        .attr('x2', d => (d.target as NodeData).x!)
        .attr('y2', d => (d.target as NodeData).y!);

      nodeGroup
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [isOpen, filterScope, boards, activeBoardId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Overview Map & Task Dependency Graph</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  D3 Network Simulation
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Visualize card status nodes and 'Depends On' prerequisite links across your board network.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Scope Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setFilterScope('current_board')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterScope === 'current_board'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Board
              </button>
              <button
                onClick={() => setFilterScope('all_boards')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterScope === 'all_boards'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Workspace Boards
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend Toolbar */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap font-mono">
            <span className="text-slate-400 font-sans font-bold">Status Legend:</span>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-slate-300 capitalize">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-indigo-300 font-mono text-[11px]">
            <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
            <span>Arrow = Depends On Prerequisites</span>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="relative flex-1 bg-slate-950/60 overflow-hidden flex items-center justify-center">
          <svg ref={svgRef} className="w-full h-[520px] cursor-grab active:cursor-grabbing" />

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-900/95 border border-white/20 text-slate-100 shadow-2xl backdrop-blur-xl max-w-xs pointer-events-none space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-indigo-300 truncate">{hoveredNode.title}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: STATUS_COLORS[hoveredNode.status] + '33', color: STATUS_COLORS[hoveredNode.status] }}>
                  {hoveredNode.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{hoveredNode.cardData.description || 'No description'}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                <span>List: {hoveredNode.listName}</span>
                <span>Board: {hoveredNode.boardName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
