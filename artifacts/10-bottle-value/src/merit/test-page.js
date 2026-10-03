import { loadMeritScripts, verifyAndCreateMeritSession } from "./checkout.js";

const el = id => document.getElementById(id);
const apiUrl = `${import.meta.env.BASE_URL}api/merit-test`;
let config;
let loaded = false;
let busy = false;
let complete = false;

function updateButton() {
  el("verify").disabled = !config?.ready || !loaded || busy || complete;
}
function show(message, state = "") {
  el("result").textContent = message;
  el("result").dataset.state = state;
}

async function refreshConfig() {
  config = null;
  updateButton();
  el("refresh").disabled = true;
  try {
    const response = await fetch(apiUrl, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось проверить сервер.");
    config = data;
    complete = false;
    el("server-status").textContent = `${data.ready ? "Сервер готов." : "Сервер ещё не готов."} ${data.message}\nТестовый origin: ${data.testOrigin}`;
  } catch (error) {
    el("server-status").textContent = error.message || "Не удалось проверить настройки.";
  } finally {
    el("refresh").disabled = false;
    updateButton();
  }
}

el("refresh").addEventListener("click", refreshConfig);
el("load").addEventListener("click", async () => {
  el("load").disabled = true;
  el("scripts-status").textContent = "Загрузка официальных скриптов Merit…";
  try {
    await loadMeritScripts(el("site-token").value);
    loaded = true;
    el("site-token").value = "";
    el("site-token").disabled = true;
    el("scripts-status").textContent = "Gate и OTP загружены. Появление gate зависит от настроек Merit и разрешённого домена.";
  } catch (error) {
    el("scripts-status").textContent = error.message;
    el("load").disabled = false;
  }
  updateButton();
});

el("test-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || complete || !config?.ready || !loaded) return;
  busy = true;
  el("refresh").disabled = true;
  el("email").disabled = true;
  updateButton();
  show("Ожидаем результат проверки Merit…");
  try {
    const result = await verifyAndCreateMeritSession(el("email").value, async proof => {
      show("Проверка завершена. Сервер передаёт доказательство в Merit…");
      const response = await fetch(apiUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ ...proof, csrfToken: config.csrfToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Merit не создал платёжную сессию.");
      if (data.intentCreated !== true || data.paymentConfirmed !== false) throw new Error("Неожиданный ответ тестового сервера.");
      return data;
    });
    if (result.cancelled) {
      show("Проверка отменена. Запрос создания intent не отправлялся.");
    } else {
      complete = true;
      show(`Merit принял доказательство и создал intent.\nТест: ${result.orderId}\nСумма intent: $1.00 USD.\nПлатёж НЕ подтверждён, списания нет. Сверьте эту запись с Merit dashboard.`, "success");
    }
  } catch (error) {
    show(error.name === "TimeoutError" ? "Тестовый сервер не ответил вовремя. Платёж не подтверждался." : error.message, "error");
  } finally {
    busy = false;
    el("refresh").disabled = false;
    el("email").disabled = false;
    updateButton();
  }
});

refreshConfig();