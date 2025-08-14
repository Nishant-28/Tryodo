import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useRef, useState } from 'react';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyDiagramProps {
  data: SankeyData;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  data,
  width = 900,
  height = 500,
  title = "Cash Flow Diagram",
  description = "Visual representation of money flow through the platform"
}) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  // Responsive width handling
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(width);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect) {
        setContainerWidth(Math.max(600, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Layout constants
  const nodeWidth = 40;
  const nodeMinHeight = 24;
  const nodePadding = 18;
  const margin = { top: 50, right: 100, bottom: 40, left: 100 };
  const innerWidth = Math.max(300, containerWidth - margin.left - margin.right);
  const innerHeight = Math.max(200, height - margin.top - margin.bottom);

  // Categorize nodes by their role in the flow
  const sourceNodes = data.nodes.filter(node => node.id.includes('source'));
  const middleNodes = data.nodes.filter(node => node.id.includes('middle'));
  const targetNodes = data.nodes.filter(node => node.id.includes('target'));
  
  // Calculate total value for scaling
  const maxValue = Math.max(...data.nodes.map(n => n.value), 1);
  const totalTargetValue = Math.max(targetNodes.reduce((sum, node) => sum + node.value, 0), 1);
  
  // Precompute heights for targets so they stack within innerHeight
  const targetHeights = useMemo(() => {
    const available = innerHeight * 0.9;
    const paddings = Math.max(targetNodes.length - 1, 0) * nodePadding;
    const scale = (available - paddings) / totalTargetValue;
    return targetNodes.map((n) => Math.max(nodeMinHeight, n.value * scale));
  }, [innerHeight, nodePadding, nodeMinHeight, targetNodes, totalTargetValue]);

  const totalTargetHeight = targetHeights.reduce((s, h) => s + h, 0) + Math.max(targetNodes.length - 1, 0) * nodePadding;
  const targetStartY = margin.top + (innerHeight - totalTargetHeight) / 2;

  // Position nodes in three columns using margins and inner dims
  const positionedNodes = data.nodes.map((node) => {
    let x = margin.left;
    let y = margin.top;
    let nodeHeight = Math.max(nodeMinHeight, (node.value / maxValue) * (innerHeight * 0.6));

    if (node.id.includes('source')) {
      x = margin.left;
      y = margin.top + (innerHeight - nodeHeight) / 2;
    } else if (node.id.includes('middle')) {
      x = margin.left + innerWidth / 2 - nodeWidth / 2;
      y = margin.top + (innerHeight - nodeHeight) / 2;
    } else if (node.id.includes('target')) {
      x = margin.left + innerWidth - nodeWidth;
      const idx = targetNodes.findIndex(n => n.id === node.id);
      const yAcc = targetHeights.slice(0, idx).reduce((s, h) => s + h, 0) + Math.max(idx, 0) * nodePadding;
      nodeHeight = targetHeights[idx] ?? nodeHeight;
      y = targetStartY + yAcc;
    }

    return { ...node, x, y, height: nodeHeight, width: nodeWidth } as const;
  });

  // Create better curved paths for links
  const createPath = (link: SankeyLink) => {
    const sourceNode = positionedNodes.find(n => n.id === link.source);
    const targetNode = positionedNodes.find(n => n.id === link.target);
    
    if (!sourceNode || !targetNode) return null;
    
    // Calculate connection points
    const sourceX = sourceNode.x + sourceNode.width;
    const targetX = targetNode.x;
    
    // For source to middle connections
    let sourceY, targetY;
    if (link.source.includes('source')) {
      sourceY = sourceNode.y + sourceNode.height / 2;
      targetY = targetNode.y + targetNode.height / 2;
    } else {
      // For middle to target connections, calculate proportional positions
      const targetIndex = targetNodes.findIndex(n => n.id === link.target);
      const linkRatio = link.value / maxValue;
      
      sourceY = sourceNode.y + sourceNode.height / 2;
      targetY = targetNode.y + targetNode.height / 2;
    }
    
    // Control points for smooth curve
    const controlX1 = sourceX + (targetX - sourceX) * 0.35;
    const controlX2 = targetX - (targetX - sourceX) * 0.35;
    
    // Calculate stroke width based on value
    const maxLinkValue = Math.max(...data.links.map(l => l.value), 1);
    const strokeWidth = Math.max((link.value / maxLinkValue) * 30, 4);
    
    return {
      path: `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetX} ${targetY}`,
      strokeWidth,
      link,
      sourceX,
      sourceY,
      targetX,
      targetY,
      midX: (sourceX + targetX) / 2,
      midY: (sourceY + targetY) / 2
    };
  };

  const paths = data.links.map(createPath).filter(Boolean) as Array<ReturnType<typeof createPath>>;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full overflow-x-auto bg-gradient-to-br from-gray-50 to-white rounded-lg border">
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${containerWidth} ${height}`}
            className="drop-shadow-sm"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Add gradient definitions */}
            <defs>
              <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
              </linearGradient>
              {/* Flow gradients */}
              <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Background grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

            {/* Render links first (behind nodes) */}
            {paths.map((pathData, index) => (
              <g key={`link-${index}`}>
                {/* Main flow path */}
                <path
                  d={pathData!.path as string}
                  stroke={pathData!.link.color}
                  strokeWidth={pathData!.strokeWidth as number}
                  fill="none"
                  opacity={0.7}
                  style={{
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
                  }}
                />
                
                {/* Flow animation overlay */}
                <path
                  d={pathData!.path as string}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={Math.max((pathData!.strokeWidth as number) * 0.3, 1)}
                  fill="none"
                  opacity={0.8}
                  strokeDasharray="5,10"
                  style={{
                    animation: `flow 3s linear infinite`
                  }}
                />

                {/* Link value label with background */}
                {(pathData!.strokeWidth as number) >= 6 && (
                  <g>
                    <rect
                      x={(pathData!.midX as number) - 35}
                      y={(pathData!.midY as number) - 14 - (index % 2 === 0 ? 8 : -8)}
                      width={70}
                      height={24}
                      fill="white"
                      stroke={pathData!.link.color}
                      strokeWidth={1}
                      rx={12}
                      opacity={0.95}
                      style={{
                        filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.1))'
                      }}
                    />
                    <text
                      x={pathData!.midX as number}
                      y={(pathData!.midY as number) + (index % 2 === 0 ? -10 : 10)}
                      textAnchor="middle"
                      className="text-xs font-semibold"
                      fill={pathData!.link.color}
                    >
                      {formatCompactCurrency(pathData!.link.value)}
                    </text>
                  </g>
                )}
              </g>
            ))}
            
            {/* Render nodes */}
            {positionedNodes.map((node, index) => (
              <g key={`node-${index}`}>
                {/* Node shadow */}
                <rect
                  x={node.x + 2}
                  y={node.y + 2}
                  width={node.width}
                  height={node.height}
                  fill="rgba(0,0,0,0.1)"
                  rx={8}
                  ry={8}
                />
                
                {/* Main node */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  rx={8}
                  ry={8}
                  style={{
                    filter: 'url(#nodeGradient)'
                  }}
                />
                
                {/* Node highlight */}
                <rect
                  x={node.x + 2}
                  y={node.y + 2}
                  width={node.width - 4}
                  height={Math.max(node.height * 0.3, 8)}
                  fill="rgba(255,255,255,0.3)"
                  rx={6}
                  ry={6}
                />

                {/* Node label background */}
                <rect
                  x={node.x - 60}
                  y={Math.max(margin.top + 5, node.y - 35)}
                  width={node.width + 120}
                  height={20}
                  fill="white"
                  stroke={node.color}
                  strokeWidth={1}
                  rx={10}
                  opacity={0.95}
                  style={{
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.1))'
                  }}
                />
                
                {/* Node name */}
                <text
                  x={node.x + node.width / 2}
                  y={Math.max(margin.top + 20, node.y - 20)}
                  textAnchor="middle"
                  className="text-sm font-bold"
                  fill={node.color}
                >
                  {node.name}
                </text>
                
                {/* Node value background */}
                <rect
                  x={node.x - 40}
                  y={node.y + node.height + 10}
                  width={node.width + 80}
                  height={18}
                  fill={node.color}
                  rx={9}
                  opacity={0.9}
                />
                
                {/* Node value */}
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height + 23}
                  textAnchor="middle"
                  className="text-xs font-semibold"
                  fill="white"
                >
                  {formatCompactCurrency(node.value)}
                </text>
              </g>
            ))}

            {/* Flow direction indicators */}
            {paths.map((pathData, index) => (
              <g key={`arrow-${index}`}>
                <polygon
                  points={`${(pathData!.midX as number) + 15},${(pathData!.midY as number) - 3} ${(pathData!.midX as number) + 25},${pathData!.midY} ${(pathData!.midX as number) + 15},${(pathData!.midY as number) + 3}`}
                  fill={pathData!.link.color}
                  opacity={0.8}
                />
              </g>
            ))}
          </svg>
        </div>
        
        {/* Enhanced Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Flow Components</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.nodes.map((node, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-md shadow-sm">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm" 
                  style={{ backgroundColor: node.color }}
                ></div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{node.name}</span>
                  <div className="text-xs text-gray-500">{formatCompactCurrency(node.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add CSS animation */}
        <style>{`
          @keyframes flow {
            0% { stroke-dashoffset: 15; }
            100% { stroke-dashoffset: 0; }
          }
        `}</style>
      </CardContent>
    </Card>
  );
};

export default SankeyDiagram; 