const API_BASE = "https://api.github.com";
const MAX_PAGES = 10;

const state = {
  repos: new Set(),
  filesChecked: 0,
  duplicatesRemoved: 0,
  stopRequested: false,
  sortMode: "source",
  hosts: [],
  users: [],
  proxies: []
};

const el = {
  query: document.getElementById("queryInput"),
  repo: document.getElementById("repoInput"),
  extension: document.getElementById("extensionInput"),
  searchBtn: document.getElementById("searchBtn"),
  stopBtn: document.getElementById("stopBtn"),
  clearBtn: document.getElementById("clearBtn"),
  sortBtn: document.getElementById("sortBtn"),
  progress: document.getElementById("progress"),
  rateLimit: document.getElementById("rateLimit"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  activityBox: document.getElementById("activityBox"),
  hostsBody: document.getElementById("hostsBody"),
  usersBody: document.getElementById("usersBody"),
  proxiesBody: document.getElementById("proxiesBody")
};

function setStatus(online) {
  el.statusDot.style.background = online ? "var(--green)" : "var(--orange)";
  el.statusText.textContent = online ? "API READY" : "API LIMITED";
}

function addActivity(message, success = true) {
  const p = document.createElement("p");
  p.innerHTML = success ? `✓ ${message}` : `! ${message}`;
  el.activityBox.appendChild(p);
  el.activityBox.scrollTop = el.activityBox.scrollHeight;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(repo, path) {
  return `https://github.com/${repo}/blob/HEAD/${path}`;
}

function normalizeRepoName(repo) {
  return String(repo || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
}

function getSourceHTML(repo, path, sourceUrl) {
  const cleanRepo = normalizeRepoName(repo);
  return `<a href="${sourceUrl || safeUrl(cleanRepo, path || "")}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanRepo)}</a>`;
}

function toCsvValue(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function sortBySource(rows) {
  return [...rows].sort((a, b) => {
    const aa = `${a.repo || ""}/${a.path || ""}`.toLowerCase();
    const bb = `${b.repo || ""}/${b.path || ""}`.toLowerCase();
    return aa.localeCompare(bb);
  });
}

function updateStats() {
  document.getElementById("statRepos").textContent = state.repos.size;
  document.getElementById("statFiles").textContent = state.filesChecked;
  document.getElementById("statHosts").textContent = state.hosts.length;
  document.getElementById("statUsers").textContent = state.users.length;
  document.getElementById("statProxies").textContent = state.proxies.length;
  document.getElementById("statDuplicates").textContent = state.duplicatesRemoved || 0;
  document.getElementById("hostCount").textContent = state.hosts.length;
  document.getElementById("userCount").textContent = state.users.length;
  document.getElementById("proxyCount").textContent = state.proxies.length;
}

function renderTable(kind, rows) {
  const target = kind === "hosts" ? el.hostsBody : kind === "users" ? el.usersBody : el.proxiesBody;
  const filterTerm = document.querySelector(`[data-filter="${kind}"]`)?.value?.toLowerCase() || "";

  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(filterTerm));

  if (!filtered.length) {
    target.innerHTML = `<tr><td colspan="${kind === "users" ? 3 : 5}" class="empty">No matching public values found.</td></tr>`;
    return;
  }

  if (kind === "users") {
    target.innerHTML = filtered.map((row) => {
      const sourceUrl = row.sourceUrl || safeUrl(row.repo, row.path);
      return `
        <tr>
          <td>${escapeHtml(row.value || "")}</td>
          <td>${getSourceHTML(row.repo, row.path, sourceUrl)}</td>
          <td><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.path || "")}</a></td>
        </tr>
      `;
    }).join("");
    return;
  }

  target.innerHTML = filtered.map((row) => {
    const sourceUrl = row.sourceUrl || safeUrl(row.repo, row.path);
    return `
      <tr>
        <td>${escapeHtml(row.value || row.host || "")}</td>
        <td>${escapeHtml(row.port || "—")}</td>
        <td>${escapeHtml(row.protocol || "—")}</td>
        <td>${getSourceHTML(row.repo, row.path, sourceUrl)}</td>
        <td><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.path || "")}</a></td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  renderTable("hosts", state.hosts);
  renderTable("users", state.users);
  renderTable("proxies", state.proxies);
  updateStats();
}

function resetState() {
  state.repos = new Set();
  state.filesChecked = 0;
  state.duplicatesRemoved = 0;
  state.stopRequested = false;
  state.hosts = [];
  state.users = [];
  state.proxies = [];
  renderAll();
}

function addUnique(list, keyId, item) {
  const key = `${item.repo || ""}|${item.path || ""}|${keyId}|${item.value || item.host || ""}`;
  const existing = list.some((x) => {
    const xKey = `${x.repo || ""}|${x.path || ""}|${keyId}|${x.value || x.host || ""}`;
    return xKey === key;
  });

  if (existing) {
    state.duplicatesRemoved += 1;
    return false;
  }

  list.push(item);
  return true;
}

function canonicalizeUrl(raw) {
  const value = String(raw || "").trim().replace(/[),;]+$/g, "");
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    // ignore invalid URL
  }
  return null;
}

function extractHostItems(text, repo, path, sourceUrl) {
  const rawUrls = [...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) => canonicalizeUrl(m[0]));
  const seenHosts = new Set();

  rawUrls.filter(Boolean).forEach((url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, "");
      const port = parsed.port || (parsed.protocol === "http:" ? "80" : parsed.protocol === "https:" ? "443" : "");
      const protocol = parsed.protocol.replace(":", "").toUpperCase();
      if (!host) return;
      const key = `${host}:${port || "default"}`;
      if (!seenHosts.has(key)) {
        seenHosts.add(key);
        addUnique(state.hosts, "host", { repo, path, sourceUrl, value: host, host, port, protocol, type: "host" });
      }
    } catch {
      // ignore invalid URL
    }
  });

  const hostRegex = /(?:\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d{1,5})?)\b)(?::\d{1,5})?/g;
  const hostMatches = text.match(hostRegex) || [];

  hostMatches.forEach((match) => {
    let item = match.trim();
    let host = item;
    let port = "";
    let protocol = "—";

    if (item.includes(":")) {
      const idx = item.lastIndexOf(":");
      const maybePort = item.slice(idx + 1);
      if (/^\d{1,5}$/.test(maybePort)) {
        port = maybePort;
        host = item.slice(0, idx);
      }
    }

    if (!host || host === "localhost") return;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) protocol = "IP";

    const key = `${host}:${port || "default"}`;
    if (!seenHosts.has(key)) {
      seenHosts.add(key);
      addUnique(state.hosts, "host", { repo, path, sourceUrl, value: host, host, port, protocol, type: "host" });
    }
  });
}

function extractUserItems(text, repo, path, sourceUrl) {
  const labelRegex = /(?:username|user(?:name)?|login|account|owner|member)\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9._-]{1,31})/gi;
  const matches = [...text.matchAll(labelRegex)];

  matches.forEach((m) => {
    const username = m[1];
    if (!username) return;
    if (/^(true|false|null|undefined|password|admin|root)$/i.test(username)) return;
    addUnique(state.users, "user", { repo, path, sourceUrl, value: username, type: "user" });
  });
}

function extractProxyItems(text, repo, path, sourceUrl) {
  const proxyRegex = /(?:proxy|proxy_url|http_proxy|https_proxy|socks(?:4|5)?(?:_proxy)?|all_proxy)\s*[:=]\s*(?:["']?)(https?:\/\/[^\s"'<>]+|socks(?:4|5)?:\/\/[^\s"'<>]+|(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}|(?:[A-Za-z0-9.-]+\.[A-Za-zA-Z-]+\.[A-Za-zA-Z-]+:\d{1,5}))/gi;
  const matches = [...text.matchAll(proxyRegex)];

  matches.forEach((m) => {
    const candidate = (m[0].split(/[:=]/).slice(1).join(":") || "").trim().replace(/^['"]|['"]$/g, "");
    const out = candidate || m[1];
    if (!out) return;

    let host = out;
    let port = "";
    let protocol = "—";

    if (/^https?:\/\//i.test(out) || /^socks(?:4|5)?:\/\//i.test(out)) {
      try {
        const parsed = new URL(out);
        host = parsed.hostname;
        port = parsed.port || (parsed.protocol === "http:" ? "80" : parsed.protocol === "https:" ? "443" : "");
        protocol = parsed.protocol.replace(":", "").toUpperCase();
      } catch {
        // ignore invalid URL
      }
    } else if (/^[A-Za-z0-9.-]+\.[A-Za-zA-Z-]+\.[A-Za-zA-Z-]+:\d{1,5}$/.test(out)) {
      const parts = out.split(":");
      host = parts.slice(0, -1).join(":");
      port = parts[parts.length - 1] || "";
      protocol = "HTTP";
    } else if (/^(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}$/.test(out)) {
      const parts = out.split(":");
      host = parts.slice(0, -1).join(":");
      port = parts[parts.length - 1] || "";
      protocol = "SOCKS";
    }

    addUnique(state.proxies, "proxy", { repo, path, sourceUrl, value: host, host, port, protocol, type: "proxy" });
  });
}

function parseTextContent(text, repo, path, sourceUrl) {
  const normalized = String(text || "");
  if (!normalized) return;

  const urls = [...normalized.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) => m[0].replace(/[),;]+$/g, ""));
  urls.forEach((raw) => {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname;
      const port = parsed.port || (parsed.protocol === "http:" ? "80" : parsed.protocol === "https:" ? "443" : "");
      if (host) {
        addUnique(state.hosts, "host", { repo, path, sourceUrl, value: host, host, port, protocol: parsed.protocol.replace(":", "").toUpperCase(), type: "host" });
      }
    } catch {
      // ignore invalid URL
    }
  });

  extractHostItems(normalized, repo, path, sourceUrl);
  extractUserItems(normalized, repo, path, sourceUrl);
  extractProxyItems(normalized, repo, path, sourceUrl);
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers
    }
  });

  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining) el.rateLimit.textContent = `RATE LIMIT ${remaining}`;

  if (res.status === 403 || res.status === 429) {
    setStatus(false);
    throw new Error("GitHub rate limit reached. Please try again later or reduce the search scope.");
  }

  if (!res.ok) throw new Error(`GitHub API request failed (${res.status})`);
  return res.json();
}

async function readTextFromRepo(item) {
  try {
    const meta = await fetchJson(item.url);
    const rawUrl = meta.download_url || meta.url;
    if (meta.download_url) {
      const rawRes = await fetch(meta.download_url);
      if (!rawRes.ok) throw new Error("Unable to read raw file");
      return await rawRes.text();
    }

    const contentsUrl = `${API_BASE}/repos/${item.repository.full_name}/contents/${encodeURIComponent(item.path)}?ref=${meta.default_branch || "HEAD"}`;
    const files = await fetchJson(contentsUrl);
    if (files && files.content) return atob(files.content.replace(/\s/g, ""));

    return "";
  } catch (error) {
    addActivity(`Skipped ${item.path}: ${error.message}`, false);
    return "";
  }
}

async function searchGitHub() {
  if (el.searchBtn.disabled) return;

  resetState();
  state.stopRequested = false;

  const query = (el.query.value || "iptv m3u").trim();
  const repoFilter = (el.repo.value || "").trim();
  const extensionFilter = (el.extension.value || "").trim();

  let githubQuery = query + " in:file";
  if (repoFilter) githubQuery += ` repo:${repoFilter}`;
  if (extensionFilter) githubQuery += ` extension:${extensionFilter}`;

  el.searchBtn.disabled = true;
  el.stopBtn.disabled = false;
  el.progress.textContent = "SEARCHING GITHUB…";
  addActivity(`Query: ${githubQuery}`);

  try {
    let page = 1;

    while (!state.stopRequested && page <= MAX_PAGES) {
      const searchUrl = `${API_BASE}/search/code?q=${encodeURIComponent(githubQuery)}&per_page=100&page=${page}`;
      const searchData = await fetchJson(searchUrl);

      if (!searchData.items || searchData.items.length === 0) {
        addActivity("No more public results for this query.", true);
        break;
      }

      for (const item of searchData.items) {
        if (state.stopRequested) break;
        state.repos.add(normalizeRepoName(item.repository.full_name));
        state.filesChecked += 1;

        const text = await readTextFromRepo(item);
        if (!text) continue;

        parseTextContent(text, item.repository.full_name, item.path, safeUrl(item.repository.full_name, item.path));
      }

      renderAll();
      page += 1;
    }

    addActivity(state.stopRequested ? "Stopped by user." : "Search complete.", true);
    setStatus(true);
  } catch (error) {
    addActivity(error.message, false);
    setStatus(false);
  } finally {
    el.searchBtn.disabled = false;
    el.stopBtn.disabled = true;
    el.progress.textContent = "IDLE";
  }
}

function exportCurrent(kind, format) {
  const rows = kind === "hosts" ? state.hosts : kind === "users" ? state.users : state.proxies;
  if (!rows.length) {
    addActivity(`No ${kind} rows to export.`, false);
    return;
  }

  let content = "";

  if (format === "txt") {
    content = rows.map((row) => (kind === "users" ? row.value : row.value || row.host)).join("\n");
  } else if (format === "csv") {
    const headers = kind === "users" ? ["Username", "Source Repository", "Source File", "Source URL"] : ["Value", "Port", "Protocol", "Source Repository", "Source File", "Source URL"];
    const csvRows = [headers, ...rows.map((row) => [row.value || row.host || "", row.port || "", row.protocol || "", row.repo || "", row.path || "", row.sourceUrl || safeUrl(row.repo, row.path)])];
    content = csvRows.map((r) => r.map((cell) => toCsvValue(cell)).join(",")).join("\n");
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `github-iptv-analyzer-${kind}.${format}`;
  link.click();
}

function copyCurrent(kind) {
  const rows = kind === "hosts" ? state.hosts : kind === "users" ? state.users : state.proxies;
  if (!rows.length) return;
  const text = rows.map((row) => (kind === "users" ? row.value : row.value || row.host)).join("\n");
  navigator.clipboard.writeText(text)
    .then(() => addActivity(`${kind.toUpperCase()} copied to clipboard.`, true))
    .catch(() => addActivity(`Clipboard blocked for ${kind}.`, false));
}

function sortResults() {
  if (state.hosts.length || state.users.length || state.proxies.length) {
    state.hosts = sortBySource(state.hosts);
    state.users = sortBySource(state.users);
    state.proxies = sortBySource(state.proxies);
    renderAll();
    addActivity("Sorted by source repository and file.", true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  resetState();
  setStatus(true);

  el.searchBtn.addEventListener("click", searchGitHub);
  el.stopBtn.addEventListener("click", () => {
    state.stopRequested = true;
    el.progress.textContent = "STOPPING…";
  });

  el.clearBtn.addEventListener("click", () => {
    el.query.value = "iptv m3u";
    el.repo.value = "";
    el.extension.value = "";
    el.activityBox.innerHTML = "";
    resetState();
    addActivity("Cleared.", true);
  });

  el.sortBtn.addEventListener("click", sortResults);

  document.querySelectorAll(".filter-input").forEach((input) => {
    input.addEventListener("input", renderAll);
  });

  document.querySelectorAll(".copy").forEach((button) => {
    button.addEventListener("click", () => copyCurrent(button.dataset.kind));
  });

  document.querySelectorAll(".export").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.kind;
      const format = button.dataset.kind === "users" ? "txt" : "csv";
      exportCurrent(kind, format);
    });
  });

  addActivity("Ready. Public GitHub search active.");
});
