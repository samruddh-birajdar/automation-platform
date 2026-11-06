import { useEffect, useState, useCallback } from 'react';
import api from './api';
import { Plus, Trash2, Play, Activity, X, CreditCard, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [workflows, setWorkflows] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [showLogs, setShowLogs] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [runningId, setRunningId] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await api.get('/api/workflows/');
      setWorkflows(res.data);
    } catch (error) { toast.error('Failed to fetch workflows'); }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    
    const handlePageShow = (event) => {
      if (event.persisted) setPayingId(null);
    };
    window.addEventListener('pageshow', handlePageShow);

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'success') {
      toast.success('Payment received! Your workflow will run shortly.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'canceled') {
      toast.error('Payment canceled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [fetchWorkflows]);

  useEffect(() => {
    if (!showLogs) return;
    let cancelled = false;
    let timeoutId;

    setIsLoadingLogs(true);

    const poll = async () => {
      try {
        const res = await api.get('/api/events/');
        if (!cancelled) setEvents(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setIsLoadingLogs(false);
          timeoutId = setTimeout(poll, 2000);
        }
      }
    };

    poll();

    return () => { 
      cancelled = true; 
      clearTimeout(timeoutId); 
    };
  }, [showLogs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.post('/api/workflows/', {
        name,
        description,
        steps: [{ type: "http", url: "https://jsonplaceholder.typicode.com/posts" }]
      });
      toast.success('Workflow created!');
      setName(''); setDescription(''); setIsCreating(false);
      fetchWorkflows();
    } catch (error) { toast.error('Failed to create workflow'); } 
    finally { setIsSaving(false); }
  };

  const handleRun = async (id) => {
    if (runningId) return;
    setRunningId(id);
    try {
      await api.post(`/webhook/${id}`, { data: { message: "Manual trigger" } });
      toast.success('Event queued for processing.');
    } catch (error) { toast.error('Failed to trigger workflow'); }
    finally { setRunningId(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await api.delete(`/api/workflows/${id}`);
      toast.success('Workflow deleted'); fetchWorkflows();
    } catch (error) { toast.error('Failed to delete workflow'); }
  };

  const handlePay = async (workflow) => {
    if (payingId) return;
    setPayingId(workflow.id);
    try {
      const res = await api.post('/api/checkout/create-checkout-session', {
        workflow_id: workflow.id,
      });
      window.location.href = res.data.url;
    } catch (error) { 
      toast.error('Failed to start payment'); 
      setPayingId(null);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="text-blue-500" /> Automation Engine
        </h1>
        <div className="flex gap-4">
          <button onClick={() => setShowLogs(true)} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">View Live Logs</button>
          <button onClick={() => setIsCreating(!isCreating)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
            {isCreating ? <X size={18} /> : <Plus size={18} />} {isCreating ? 'Close Form' : 'New Workflow'}
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-zinc-900 p-6 rounded-xl mb-8 border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Create New Workflow</h2>
          <div className="flex flex-col gap-4">
            <input type="text" placeholder="Workflow Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500" required />
            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500" />
            <button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg w-max font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSaving && <Loader2 size={18} className="animate-spin" />} Save Workflow
            </button>
          </div>
        </form>
      )}

      {workflows.length === 0 && !isCreating && (
        <div className="text-center text-zinc-500 mt-20">No workflows yet. Create one to get started.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf) => (
          <div key={wf.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{wf.name}</h3>
                <p className="text-zinc-400 text-sm mt-1">{wf.description || 'No description'}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handlePay(wf)} disabled={payingId === wf.id} className="text-zinc-500 hover:text-yellow-500 transition-colors disabled:opacity-50" title="Pay & Run">
                  {payingId === wf.id ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                </button>
                <button onClick={() => handleRun(wf.id)} disabled={runningId === wf.id} className="text-zinc-500 hover:text-green-500 transition-colors disabled:opacity-50" title="Run Workflow Manually">
                  {runningId === wf.id ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                </button>
                <button onClick={() => handleDelete(wf.id)} className="text-zinc-500 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={20} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 mt-4 border-t border-zinc-800 pt-4">
              <span className="text-zinc-600">ID: {wf.id}</span>
            </div>
          </div>
        ))}
      </div>

      {showLogs && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity size={20} className="text-green-500 animate-pulse" /> Live System Logs
              </h2>
              <button onClick={() => setShowLogs(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {isLoadingLogs && events.length === 0 ? (
                <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-zinc-500" /></div>
              ) : events.length === 0 ? (
                <p className="text-zinc-500 text-center">No events logged yet.</p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-zinc-400">
                        Event #{ev.id} | <span className="text-blue-400">{ev.event_type}</span> | Workflow #{ev.workflow_id}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        ev.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                        ev.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ev.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    {ev.error_log && <p className="text-red-400 text-sm mt-2 font-mono bg-red-950/30 p-2 rounded">Error: {ev.error_log}</p>}
                    {ev.result_data && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500 uppercase">Result:</p>
                        <pre className="text-zinc-300 text-sm font-mono bg-black/50 p-2 rounded overflow-x-auto mt-1">{JSON.stringify(ev.result_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
