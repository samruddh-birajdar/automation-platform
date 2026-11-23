import { Fragment, useEffect, useState, useCallback } from 'react';
import api from './api';
import { Plus, Trash2, Play, Activity, X, CreditCard, Loader2, ScrollText, Workflow } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

/* ---------- shared styles ---------- */
const btn =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost = `${btn} border border-line bg-ink-800/60 text-fg hover:bg-ink-700`;
const btnPrimary = `${btn} bg-accent font-semibold text-ink-950 hover:brightness-110`;
const input =
  'w-full rounded-lg border border-line bg-ink-950/70 px-3.5 py-2.5 text-sm text-fg placeholder:text-dim transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15';

const STATUS = {
  completed: { dot: 'bg-ok', pill: 'bg-ok/10 text-ok' },
  failed: { dot: 'bg-bad', pill: 'bg-bad/10 text-bad' },
  pending: { dot: 'bg-warn', pill: 'bg-warn/10 text-warn' },
};

/* ---------- small pieces ---------- */
function Pipeline({ steps }) {
  const list = Array.isArray(steps) ? steps : [];
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;

  return (
    <div className="mt-5 flex items-center gap-2 overflow-hidden font-mono text-xs text-muted">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-accent">
        <span className="size-1.5 rounded-full bg-accent" /> webhook
      </span>
      {shown.map((s, i) => (
        <Fragment key={i}>
          <span className="h-px w-4 shrink-0 bg-line" />
          <span className="shrink-0 rounded-md border border-line bg-ink-800 px-2 py-1">{s?.type || 'step'}</span>
        </Fragment>
      ))}
      {extra > 0 && <span className="shrink-0 text-dim">+{extra} more</span>}
      {list.length === 0 && <span className="text-dim">no steps yet</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-ink-900/70 p-5">
      <div className="h-5 w-2/3 rounded bg-ink-700" />
      <div className="mt-3 h-4 w-1/2 rounded bg-ink-800" />
      <div className="mt-6 h-7 w-3/4 rounded bg-ink-800" />
      <div className="mt-6 h-9 w-full rounded bg-ink-800" />
    </div>
  );
}

/* ---------- app ---------- */
function App() {
  const [workflows, setWorkflows] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showLogs, setShowLogs] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await api.get('/api/workflows/');
      setWorkflows(res.data);
    } catch (error) {
      toast.error('Failed to fetch workflows');
    } finally {
      setIsLoadingList(false);
    }
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

  // Esc closes the drawer / dialog
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowLogs(false);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.post('/api/workflows/', {
        name,
        description,
        steps: [{ type: 'http', url: 'https://jsonplaceholder.typicode.com/posts' }],
      });
      toast.success('Workflow created!');
      setName('');
      setDescription('');
      setIsCreating(false);
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to create workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async (id) => {
    if (runningId) return;
    setRunningId(id);
    try {
      await api.post(`/webhook/${id}`, { data: { message: 'Manual trigger' } });
      toast.success('Event queued for processing.');
    } catch (error) {
      toast.error('Failed to trigger workflow');
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeleteTarget(null);
    try {
      await api.delete(`/api/workflows/${id}`);
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
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
    <div className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141722',
            color: '#e8eaf2',
            border: '1px solid #262b3d',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      {/* header */}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-accent/30 bg-linear-to-br from-accent/25 to-accent/5 text-accent shadow-[0_0_40px_-8px] shadow-accent/50">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Automation Engine</h1>
            <p className="mt-0.5 text-sm text-muted">
              {isLoadingList
                ? 'Loading your workflows'
                : `${workflows.length} ${workflows.length === 1 ? 'workflow' : 'workflows'}`}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowLogs(true)} className={btnGhost}>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            Live logs
          </button>
          <button onClick={() => setIsCreating(!isCreating)} className={btnPrimary}>
            {isCreating ? <X size={16} /> : <Plus size={16} />}
            {isCreating ? 'Close' : 'New workflow'}
          </button>
        </div>
      </header>

      {/* create form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="mb-10 animate-pop rounded-2xl border border-line bg-ink-900/80 p-6 backdrop-blur"
        >
          <h2 className="font-display text-xl font-semibold">Create a workflow</h2>
          <p className="mt-1 text-sm text-muted">
            New workflows start with one HTTP step that calls a sample API.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted">Name</span>
              <input
                type="text"
                placeholder="Send welcome email"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted">Description</span>
              <input
                type="text"
                placeholder="What does this workflow do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={input}
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={isSaving} className={btnPrimary}>
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              Save workflow
            </button>
            <button type="button" onClick={() => setIsCreating(false)} className={btnGhost}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* empty state */}
      {!isLoadingList && workflows.length === 0 && !isCreating && (
        <div className="mx-auto mt-16 flex max-w-sm flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-line bg-ink-900 text-muted">
            <Workflow size={24} />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold">No workflows yet</h2>
          <p className="mt-1.5 text-sm text-muted">
            A workflow runs a set of steps whenever its webhook fires. Create your first one to get going.
          </p>
          <button onClick={() => setIsCreating(true)} className={`${btnPrimary} mt-6`}>
            <Plus size={16} /> New workflow
          </button>
        </div>
      )}

      {/* workflow grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingList && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}

        {workflows.map((wf) => (
          <article
            key={wf.id}
            className="flex flex-col rounded-2xl border border-line bg-ink-900/70 p-5 transition-colors hover:border-white/15"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold leading-snug">{wf.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{wf.description || 'No description'}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(wf)}
                className="-mr-1.5 -mt-1 rounded-lg p-2 text-dim transition hover:bg-bad/10 hover:text-bad"
                title="Delete workflow"
                aria-label={`Delete ${wf.name}`}
              >
                <Trash2 size={17} />
              </button>
            </div>

            <Pipeline steps={wf.steps} />

            <div className="mt-auto flex items-center gap-2 pt-6">
              <button
                onClick={() => handleRun(wf.id)}
                disabled={runningId === wf.id}
                className={btnGhost}
                title="Run now without payment"
              >
                {runningId === wf.id ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Run
              </button>
              <button
                onClick={() => handlePay(wf)}
                disabled={payingId === wf.id}
                className={btnPrimary}
                title="Pay, then run"
              >
                {payingId === wf.id ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                Pay &amp; run
              </button>
              <span className="ml-auto font-mono text-xs text-dim">#{wf.id}</span>
            </div>
          </article>
        ))}
      </div>

      {/* delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div
            role="alertdialog"
            aria-label="Confirm delete"
            className="relative w-full max-w-sm animate-pop rounded-2xl border border-line bg-ink-900 p-6"
          >
            <h2 className="font-display text-lg font-semibold">Delete “{deleteTarget.name}”?</h2>
            <p className="mt-2 text-sm text-muted">This removes the workflow for good. You can’t undo it.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className={btnGhost}>
                Keep it
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className={`${btn} bg-bad font-semibold text-ink-950 hover:brightness-110`}
              >
                Delete workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* live logs drawer */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogs(false)}
          />
          <aside
            role="dialog"
            aria-label="Live logs"
            className="relative flex h-full w-full max-w-xl animate-drawer flex-col border-l border-line bg-ink-900"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-ok" />
                  </span>
                  Live logs
                </h2>
                <p className="mt-0.5 text-xs text-muted">Refreshes every 2 seconds</p>
              </div>
              <button
                onClick={() => setShowLogs(false)}
                className="rounded-lg p-2 text-muted transition hover:bg-ink-700 hover:text-fg"
                aria-label="Close logs"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingLogs && events.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-dim" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <ScrollText size={26} className="text-dim" />
                  <p className="mt-3 text-sm font-medium">No events yet</p>
                  <p className="mt-1 text-sm text-muted">Run a workflow and its events will show up here.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {events.map((ev) => {
                    const st = STATUS[ev.status] || STATUS.pending;
                    return (
                      <li key={ev.id} className="rounded-xl border border-line bg-ink-950/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className={`size-2 shrink-0 rounded-full ${st.dot}`} />
                            <span className="truncate text-sm font-medium">{ev.event_type}</span>
                          </div>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${st.pill}`}>
                            {ev.status || 'unknown'}
                          </span>
                        </div>
                        <p className="mt-1.5 pl-[18px] font-mono text-xs text-dim">
                          Event #{ev.id} on workflow #{ev.workflow_id}
                        </p>

                        {ev.error_log && (
                          <p className="mt-3 rounded-lg bg-bad/10 p-2.5 font-mono text-xs leading-relaxed text-bad">
                            Error: {ev.error_log}
                          </p>
                        )}

                        {ev.result_data && (
                          <details className="group mt-3">
                            <summary className="cursor-pointer text-xs font-medium text-muted transition hover:text-fg">
                              View result
                            </summary>
                            <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-fg/90">
                              {JSON.stringify(ev.result_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;