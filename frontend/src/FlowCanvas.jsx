import { useCallback } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// This is a dummy workflow to test the canvas
const initialNodes = [
  { id: '1', position: { x: 250, y: 0 }, data: { label: 'Stripe Webhook' }, type: 'input' },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'HTTP Request' } },
  { id: '3', position: { x: 250, y: 200 }, data: { label: 'AI Generation' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

export default function FlowCanvas() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="h-screen w-screen bg-ink-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-ink-900 z-10">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/10 text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Workflow Canvas</h1>
      </div>

      {/* Canvas */}
      <div className="flex-1 h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#202027" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}