"use client";

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  name: string;
  email?: string;
  data: any;
  x?: number;
  y?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface RelationshipGraphProps {
  data: GraphData | null;
  participantId: number;
}

const NODE_COLORS = {
  participant: "#6366f1", // indigo-500
  contingent: "#10b981", // emerald-500
  team: "#8b5cf6", // violet-500
  contestant: "#3b82f6", // blue-500
  "contestants-group": "#60a5fa", // blue-400
  contest: "#f59e0b", // amber-500
  manager: "#ef4444", // red-500
};

const NODE_RADIUS = {
  participant: 25,
  contingent: 20,
  team: 18,
  contestant: 15,
  "contestants-group": 22,
  contest: 18,
  manager: 15,
};

const LINK_COLORS = {
  owner: "#059669", // emerald-600
  manager: "#4f46e5", // indigo-700
  member: "#2563eb", // blue-600
  "has-members": "#2563eb", // blue-600
  participation: "#d97706", // amber-600
  sample: "#94a3b8", // slate-400
  default: "#6b7280", // gray-500
};

export default function RelationshipGraph({
  data,
  participantId,
}: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
  
  // Debug state to show if data is available
  const [debug, setDebug] = useState<{hasData: boolean, nodeCount: number, linkCount: number}>({
    hasData: false,
    nodeCount: 0,
    linkCount: 0
  });

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && svgRef.current.parentElement) {
        // Get parent dimensions
        const { width, height } = svgRef.current.parentElement.getBoundingClientRect();
        // Set minimum dimensions to ensure visibility
        const safeWidth = Math.max(width, 800);
        const safeHeight = Math.max(height, 600);
        setDimensions({ width: safeWidth, height: safeHeight });
      }
    };

    // Initial size calculation
    handleResize();
    
    // Add resize listener
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Set debug info when data changes
  useEffect(() => {
    if (data) {
      setDebug({
        hasData: true,
        nodeCount: data.nodes.length,
        linkCount: data.links.length
      });
    }
  }, [data]);

  // D3 graph creation
  useEffect(() => {
    // Early return if requirements aren't met
    if (!svgRef.current || !data) {
      console.log("Missing required refs or data for D3 graph", {
        svgRef: !!svgRef.current,
        data: !!data,
        dimensions: dimensions
      });
      return;
    }
    
    // Ensure we have nodes to display
    if (!data.nodes || data.nodes.length === 0) {
      console.log("No nodes available to display");
      return;
    }

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", [0, 0, dimensions.width, dimensions.height]);
    
    // Create a container group
    const g = svg.append("g");
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Reset the view to the center
    svg.call(zoom.transform, d3.zoomIdentity);

    // Helper function to get node by id
    const getNodeById = (id: string) => {
      return data.nodes.find(node => node.id === id);
    };

    // Process links to ensure they reference node objects
    const processedLinks = data.links.map(link => {
      return {
        ...link,
        source: typeof link.source === "string" ? getNodeById(link.source) || link.source : link.source,
        target: typeof link.target === "string" ? getNodeById(link.target) || link.target : link.target,
      };
    }).filter(link => 
      typeof link.source !== "string" && 
      typeof link.target !== "string"
    ) as { source: Node; target: Node; type: string }[];

    // Create a force simulation
    const simulation = d3
      .forceSimulation(data.nodes)
      .force("link", 
        d3.forceLink<Node, Link>(processedLinks)
          .id(d => d.id)
          .distance(d => {
            // Adjust link distance based on node types
            if (d.type === "owner") return 150;
            if (d.type === "manager") return 130;
            if (d.type === "member") return 100;
            return 120;
          })
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("x", d3.forceX(dimensions.width / 2).strength(0.05))
      .force("y", d3.forceY(dimensions.height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius(d => NODE_RADIUS[d.type as keyof typeof NODE_RADIUS] + 10));

    // Create arrow markers for different link types
    const arrowTypes = Object.keys(LINK_COLORS);
    
    arrowTypes.forEach(type => {
      svg.append("defs")
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", LINK_COLORS[type as keyof typeof LINK_COLORS] || LINK_COLORS.default)
        .attr("d", "M0,-5L10,0L0,5");
    });

    // Draw links
    const link = g
      .append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(processedLinks)
      .join("line")
      .attr("stroke", d => LINK_COLORS[d.type as keyof typeof LINK_COLORS] || LINK_COLORS.default)
      .attr("stroke-width", 2)
      .attr("marker-end", d => `url(#arrow-${d.type})`)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke-width", 3);
        
        setTooltip({
          visible: true,
          content: `${d.type.charAt(0).toUpperCase() + d.type.slice(1)} relationship`,
          x: event.pageX,
          y: event.pageY,
        });
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("stroke-width", 2);
        setTooltip({ ...tooltip, visible: false });
      });

    // Draw nodes
    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3.drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      )
      .on("mouseover", (event, d) => {
        let content = `<strong>${d.name}</strong><br/>Type: ${d.type.replace('-group', ' Group')}`;
        
        if (d.type === "participant" && d.email) {
          content += `<br/>Email: ${d.email}`;
        }
        
        if (d.type === "contingent") {
          content += `<br/>Members: ${d.data.contestants?.length || 0}`;
        }
        
        if (d.type === "team") {
          content += `<br/>Contest: ${d.data.contest?.name || "None"}`;
          content += `<br/>Members: ${d.data.members?.length || 0}`;
        }
        
        if (d.type === "contestant") {
          content += `<br/>Contingent: ${d.data.contingent?.name || "None"}`;
        }
        
        if (d.type === "contestants-group") {
          content += `<br/>Number of contestants: ${d.data.count || 0}`;
          content += `<br/>Contingent ID: ${d.data.contingentId || "Unknown"}`;
        }
        
        if (d.type === "contest") {
          content += `<br/>Type: ${d.data.contestType || ""}`;
          content += `<br/>Name: ${d.data.name || d.name}`;
        }
        
        setTooltip({
          visible: true,
          content: content,
          x: event.pageX,
          y: event.pageY,
        });
      })
      .on("mouseout", () => {
        setTooltip({ ...tooltip, visible: false });
      });

    // Add circles to nodes
    nodeGroup
      .append("circle")
      .attr("r", d => NODE_RADIUS[(d as Node).type as keyof typeof NODE_RADIUS] || 15)
      .attr("fill", d => NODE_COLORS[(d as Node).type as keyof typeof NODE_COLORS] || "#94a3b8")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      // Highlight the main participant
      .attr("stroke-width", d => {
        return (d as Node).id === `participant-${participantId}` ? 3 : 2;
      })
      .attr("stroke", d => {
        return (d as Node).id === `participant-${participantId}` ? "#f472b6" : "#ffffff";
      });

    // Add node labels
    nodeGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("fill", "#ffffff")
      .attr("font-weight", "bold")
      .attr("font-size", d => {
        if ((d as Node).type === "participant") return "12px";
        return "10px";
      })
      .text(d => {
        const node = d as Node;
        const nodeData = d as Node;
        if (nodeData.type === "participant") return "P";
        if (nodeData.type === "contingent") return "CT";
        if (nodeData.type === "team") return "TM";
        if (nodeData.type === "contestant") return "CO";
        if (nodeData.type === "contestants-group") return nodeData.data?.count || "CO";
        if (nodeData.type === "contest") return "CS";
        return node.type.charAt(0).toUpperCase();
      });
    
    // Add node name labels below
    nodeGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => NODE_RADIUS[(d as Node).type as keyof typeof NODE_RADIUS] + 16)
      .attr("fill", "#374151")
      .attr("font-size", "11px")
      .text(d => {
        // Trim long names
        const node = d as Node;
        return node.name.length > 20 ? node.name.substring(0, 18) + "..." : node.name;
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x!)
        .attr("y1", d => d.source.y!)
        .attr("x2", d => d.target.x!)
        .attr("y2", d => d.target.y!);

      nodeGroup.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(20, ${dimensions.height - 160})`);
    
    const nodeTypes = Object.keys(NODE_COLORS);
    const linkTypes = Object.keys(LINK_COLORS);
    
    // Node legend
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("Node Types")
      .attr("font-weight", "bold")
      .attr("font-size", "14px");
    
    nodeTypes.forEach((type, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 20 + 20})`);
      
      g.append("circle")
        .attr("r", 8)
        .attr("fill", NODE_COLORS[type as keyof typeof NODE_COLORS]);
      
      g.append("text")
        .attr("x", 15)
        .attr("y", 4)
        .text(type.charAt(0).toUpperCase() + type.slice(1))
        .attr("font-size", "12px");
    });
    
    // Link legend
    legend
      .append("text")
      .attr("x", 120)
      .attr("y", 0)
      .text("Relationship Types")
      .attr("font-weight", "bold")
      .attr("font-size", "14px");
      
    // Add special note for contestants group
    svg
      .append("text")
      .attr("x", 20)
      .attr("y", 20)
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .text("Note: Contestants are grouped by contingent");
    
    linkTypes.forEach((type, i) => {
      if (type === 'default') return;
      
      const g = legend.append("g").attr("transform", `translate(120, ${i * 20 + 20})`);
      
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 30)
        .attr("y2", 0)
        .attr("stroke", LINK_COLORS[type as keyof typeof LINK_COLORS])
        .attr("stroke-width", 2)
        .attr("marker-end", `url(#arrow-${type})`);
      
      g.append("text")
        .attr("x", 35)
        .attr("y", 4)
        .text(type.charAt(0).toUpperCase() + type.slice(1))
        .attr("font-size", "12px");
    });

    // Cleanup when component unmounts
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, participantId]);

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[600px] w-full flex flex-col justify-center items-center">
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show debug information if no nodes are present
  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center p-6 border rounded-md bg-gray-50">
        <div className="text-lg font-semibold text-red-500 mb-4">No relationship data available to display</div>
        <div className="text-sm text-gray-500">
          <p>This participant doesn't have any connected entities in the system.</p>
          <p className="mt-2">Try adding some contingents, teams, or contestants associated with this participant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Debug info for development */}
      {debug.hasData && (
        <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-xs z-10">
          <div>Nodes: {debug.nodeCount}</div>
          <div>Links: {debug.linkCount}</div>
        </div>
      )}
      
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {tooltip.visible && (
        <div
          className="absolute bg-white shadow-md p-3 rounded-md text-sm z-50"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            transform: "translateY(-100%)",
            maxWidth: "300px",
            pointerEvents: "none",
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}
