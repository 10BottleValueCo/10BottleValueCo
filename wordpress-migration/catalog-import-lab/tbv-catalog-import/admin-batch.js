(() => {
  const cfg = window.tbviJob;
  const progress = document.getElementById('tbvi-progress');
  const message = document.getElementById('tbvi-message');
  const resume = document.getElementById('tbvi-resume');
  const cancel = document.getElementById('tbvi-cancel');
  if (!cfg || !progress || !message || !resume || !cancel) return;
  let running = false;
  let stopRequested = false;
  async function request(action) {
    const body = new URLSearchParams({action, job_id: cfg.id, nonce: cfg.nonce});
    const response = await fetch(cfg.url, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body});
    let data;
    try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response. Inspect the job before resuming.'); }
    if (!response.ok || !data.success) throw new Error(data?.data?.message || 'The step failed. Inspect the job before resuming.');
    return data.data;
  }
  function render(state) {
    progress.textContent = `${state.cursor} / ${state.total} offers — ${state.status}`;
    message.textContent = state.last_error || '';
    cfg.status = state.status;
    if (state.status === 'complete' || state.status === 'cancelled') { resume.disabled = true; cancel.disabled = true; }
  }
  async function stop() {
    const state = await request('tbvi_cancel');
    render(state);
  }
  async function run() {
    if (running || resume.disabled) return;
    running = true; stopRequested = false; resume.disabled = true;
    try {
      while (!stopRequested) {
        const state = await request('tbvi_batch');
        render(state);
        if (state.status === 'complete' || state.status === 'cancelled') return;
      }
      await stop();
    } catch (error) {
      message.textContent = `${error.message} No automatic retry was attempted.`;
    } finally {
      running = false;
      if (cfg.status !== 'complete' && cfg.status !== 'cancelled') resume.disabled = false;
    }
  }
  resume.addEventListener('click', run);
  cancel.addEventListener('click', async () => {
    stopRequested = true;
    if (running) { message.textContent = 'Stopping after the current batch…'; return; }
    try { await stop(); } catch (error) { message.textContent = error.message; }
  });
  if (cfg.status === 'ready' || cfg.status === 'running') run();
})();
