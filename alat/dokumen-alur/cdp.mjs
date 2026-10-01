// Pembantu CDP bersama untuk uji demo.
export async function buka() {
  const t = await (await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let n = 0; const w = new Map(); const galat = []; const gagalMuat = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") galat.push(m.params.exceptionDetails.exception?.description?.slice(0,300));
    if (m.method === "Runtime.consoleAPICalled" && ["error","warning"].includes(m.params.type)) galat.push(m.params.type+": "+m.params.args.map(a=>a.value??a.description).join(" ").slice(0,300));
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) gagalMuat.push(m.params.response.status + " " + m.params.response.url);
    if (m.method === "Network.loadingFailed" && !m.params.canceled) gagalMuat.push("GAGAL " + m.params.errorText); };
  const k = (method, params = {}) => new Promise(r => { const id = ++n; w.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const v = async e => { const h = await k("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (h.result.exceptionDetails) return "EXC " + h.result.exceptionDetails.exception?.description; return h.result.result.value; };
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const potret = async (f, penuh) => (await import("node:fs")).writeFileSync(f, Buffer.from((await k("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!penuh })).result.data, "base64"));
  await k("Runtime.enable"); await k("Page.enable"); await k("Network.enable");
  await k("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const pergi = async (url, ms = 2500) => { await k("Page.navigate", { url }); await jeda(ms); };
  const tunggu = async (e, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await v(e)) return true; await jeda(200); } return false; };
  const tutup = () => fetch(`http://127.0.0.1:9333/json/close/${t.id}`);
  return { k, v, jeda, potret, pergi, tunggu, tutup, galat, gagalMuat };
}
