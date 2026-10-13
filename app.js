const STORAGE_KEY = "meu-mapa-de-videos-v1";
const themeIcons = {
  "Jogos": "🎮", "Geek": "🤓", "Filmes": "🎬", "Papos web": "💬", "Terror": "👻",
  "Histórias e livros": "📚", "Video essays": "🧠", "Exploração": "🧭", "Viagens": "🌍",
  "Documentários": "🎥", "História": "🏛️", "Daily vlog / lifestyle": "📹", "IRL": "🎤"
};
const oldSymbolIcons = new Set(["◈", "✦", "▣", "◌", "☾", "▤", "▧", "⌖", "⌁", "▥", "⌛", "◷", "◎"]);
const topicIcon = (topic) => themeIcons[topic.name] || (oldSymbolIcons.has(topic.icon) ? "✨" : topic.icon || "📌");
const defaultConfig = JSON.parse(document.querySelector("#defaultConfig").textContent);
const cloneDefaults = () => JSON.parse(JSON.stringify(defaultConfig.topics));
let topics = loadTopics();

function loadTopics() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved; // Migra dados salvos pela primeira versão do site.
    if (saved?.format === "youtube-video-map" && Array.isArray(saved.topics)) return saved.topics;
    return cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

function hasSavedTopics() {
  try { return Boolean(localStorage.getItem(STORAGE_KEY)); }
  catch { return false; }
}

function saveTopics() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ format: "youtube-video-map", schemaVersion: defaultConfig.schemaVersion, topics }));
    document.querySelector("#saveStatus").textContent = "Salvo neste navegador";
  } catch {
    document.querySelector("#saveStatus").textContent = "Não foi possível salvar";
  }
}

const searchUrl = (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query || "")}`;
document.querySelector("#rootSearch").addEventListener("click", () => window.open(searchUrl("vídeos variados entretenimento jogos documentários viagens"), "_blank", "noopener"));

function makeVideoCard(item, onEdit, onRemove) {
  const card = document.createElement("article");
  card.className = "video-card";
  const link = document.createElement("a");
  link.className = "video-link";
  link.href = item.playlistId
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(item.playlistId)}`
    : item.id ? `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}` : searchUrl(item.query || item.title);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${item.playlistId ? "Abrir playlist" : "Assistir"}: ${item.title}`);
  const thumb = document.createElement("div");
  thumb.className = `thumb-wrap${item.id || (item.playlistId && item.thumb) ? "" : " text-thumb"}`;
  if (item.id || (item.playlistId && item.thumb)) {
    const image = document.createElement("img");
    image.src = item.thumb || (item.id ? `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg` : "");
    image.alt = `Miniatura: ${item.title}`;
    image.loading = "lazy";
    image.addEventListener("error", () => { if (item.id && !image.src.includes("hqdefault.jpg")) image.src = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`; });
    thumb.append(image);
  }
  const play = document.createElement("span");
  play.className = "play";
  play.setAttribute("aria-hidden", "true");
  play.textContent = "▶";
  thumb.append(play);
  const title = document.createElement("span");
  title.className = "video-name";
  title.textContent = item.title;
  link.append(thumb, title);

  const tools = document.createElement("div");
  tools.className = "video-tools";
  tools.append(makeIconButton("Editar vídeo", "✎", () => onEdit(item)), makeIconButton("Remover vídeo", "×", () => onRemove(item)));
  card.append(link, tools);
  return card;
}

function makeIconButton(label, icon, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.textContent = icon;
  button.addEventListener("click", action);
  return button;
}

function makeSearchButton(label, query, className, glyph) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (glyph) {
    const mark = document.createElement("span");
    mark.className = className === "theme-head" ? "theme-glyph" : "subtheme-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = glyph;
    button.append(mark);
  }
  const name = document.createElement("span");
  name.className = className === "theme-head" ? "theme-title" : "subtheme-title";
  name.textContent = label;
  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.textContent = "↗";
  arrow.setAttribute("aria-label", "Abrir no YouTube");
  button.append(name, arrow);
  button.addEventListener("click", () => window.open(searchUrl(query), "_blank", "noopener"));
  return button;
}

function renderVideoList(owner, ownerPath) {
  if (!Array.isArray(owner.videos)) owner.videos = [];
  const section = document.createElement("section");
  section.className = "video-section";
  if (owner.videos.length) {
    const list = document.createElement("div");
    list.className = "video-list";
    owner.videos.forEach((item) => list.append(makeVideoCard(
      item,
      () => openVideoEditor(ownerPath, item),
      () => removeVideo(ownerPath, item)
    )));
    section.append(list);
  } else {
    const empty = document.createElement("p");
    empty.className = "no-examples";
    empty.textContent = "Nenhum vídeo de exemplo ainda.";
    section.append(empty);
  }
  const add = document.createElement("button");
  add.type = "button";
  add.className = "text-action";
  add.textContent = "+ Adicionar vídeo";
  add.addEventListener("click", () => openVideoEditor(ownerPath));
  section.append(add);
  return section;
}

function getOwner(path) {
  return path.length === 1 ? topics[path[0]] : topics[path[0]].children[path[1]];
}

function render() {
  const branches = document.querySelector("#branches");
  branches.replaceChildren();
  topics.forEach((topic, topicIndex) => {
    if (!Array.isArray(topic.children)) topic.children = [];
    if (!Array.isArray(topic.videos)) topic.videos = [];
    const path = [topicIndex];
    const branch = document.createElement("article");
    branch.className = "branch";
    const card = document.createElement("div");
    card.className = "theme-card";
    card.id = `theme-anchor-${topicIndex}`;
    const row = document.createElement("div");
    row.className = "item-row theme-row";
    row.append(makeSearchButton(topic.name, topic.query, "theme-head", topicIcon(topic)));
    const tools = document.createElement("div");
    tools.className = "item-tools";
    tools.append(
      makeIconButton("Configurar tema e pesquisa", "⚙", () => openNodeEditor(path)),
      makeIconButton("Remover tema", "×", () => removeNode(path))
    );
    row.append(tools);
    card.append(row, renderVideoList(topic, path));

    const addSubtheme = document.createElement("button");
    addSubtheme.type = "button";
    addSubtheme.className = "text-action add-subtheme";
    addSubtheme.textContent = "+ Adicionar subtema";
    addSubtheme.addEventListener("click", () => openSubthemeEditor(topicIndex));
    card.append(addSubtheme);

    if (topic.children.length) {
      const children = document.createElement("div");
      children.className = "children";
      topic.children.forEach((child, childIndex) => {
        if (!Array.isArray(child.videos)) child.videos = [];
        const childPath = [topicIndex, childIndex];
        const sub = document.createElement("section");
        sub.className = "subtheme";
        const subRow = document.createElement("div");
        subRow.className = "item-row subtheme-row";
        subRow.append(makeSearchButton(child.name, child.query, "subtheme-head", "↳"));
        const subTools = document.createElement("div");
        subTools.className = "item-tools";
        subTools.append(
          makeIconButton("Configurar subtema e pesquisa", "⚙", () => openNodeEditor(childPath)),
          makeIconButton("Remover subtema", "×", () => removeNode(childPath))
        );
        subRow.append(subTools);
        sub.append(subRow, renderVideoList(child, childPath));
        children.append(sub);
      });
      card.append(children);
    }
    branch.append(card);
    branches.append(branch);
  });
  renderThemeNav();
  filterTopics();
}

function renderThemeNav() {
  const nav = document.querySelector("#themeNav");
  nav.replaceChildren();
  topics.forEach((topic, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-nav-item";
    button.setAttribute("aria-label", `Ir para ${topic.name}`);
    const icon = document.createElement("span");
    icon.className = "theme-nav-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = topicIcon(topic);
    const label = document.createElement("span");
    label.textContent = topic.name;
    button.append(icon, label);
    button.addEventListener("click", () => navigateToTheme(index));
    nav.append(button);
  });
}

function navigateToTheme(index) {
  const filter = document.querySelector("#filter");
  if (filter.value) {
    filter.value = "";
    filterTopics();
  }
  const target = document.querySelector(`#theme-anchor-${index}`);
  if (!target) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wasNearCenter = Math.abs(target.getBoundingClientRect().top + target.offsetHeight / 2 - innerHeight / 2) < 120;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  const highlight = () => {
    target.classList.remove("highlight-pulse");
    void target.offsetWidth;
    target.classList.add("highlight-pulse");
    window.setTimeout(() => target.classList.remove("highlight-pulse"), 550);
  };
  if (reducedMotion || wasNearCenter) {
    highlight();
    return;
  }
  let highlighted = false;
  const afterScroll = () => {
    if (highlighted) return;
    highlighted = true;
    clearTimeout(fallback);
    document.removeEventListener("scrollend", afterScroll);
    highlight();
  };
  const fallback = window.setTimeout(afterScroll, 1200);
  document.addEventListener("scrollend", afterScroll, { once: true });
}

function filterTopics() {
  const term = document.querySelector("#filter").value.trim().toLocaleLowerCase("pt-BR");
  let visible = 0;
  document.querySelectorAll(".branch").forEach((branch) => {
    const match = !term || branch.textContent.toLocaleLowerCase("pt-BR").includes(term);
    branch.hidden = !match;
    if (match) visible++;
  });
  document.querySelector("#emptyState").hidden = visible > 0;
  document.querySelector("#branches").classList.toggle("filtered", Boolean(term));
}

const dialog = document.querySelector("#editor");
const form = document.querySelector("#editorForm");
const dialogTitle = document.querySelector("#editorTitle");
const dialogFields = document.querySelector("#editorFields");
const dialogError = document.querySelector("#editorError");
let editorSave = null;

function openForm(title, fields, onSave) {
  dialogTitle.textContent = title;
  dialogError.textContent = "";
  dialogFields.replaceChildren();
  fields.forEach((field) => {
    const label = document.createElement("label");
    label.className = "form-field";
    label.textContent = field.label;
    const input = field.multiline ? document.createElement("textarea") : document.createElement("input");
    input.name = field.name;
    input.value = field.value || "";
    input.placeholder = field.placeholder || "";
    if (field.required) input.required = true;
    if (field.multiline) input.rows = 3;
    label.append(input);
    dialogFields.append(label);
  });
  editorSave = onSave;
  dialog.showModal();
  dialogFields.querySelector("input, textarea")?.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Salvando…";
  dialogError.textContent = "";
  try {
    await editorSave?.(values);
    dialog.close();
  } catch (error) {
    dialogError.textContent = error.message || "Não foi possível salvar. Confira o link e tente novamente.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Salvar";
  }
});
document.querySelector("#cancelEditor").addEventListener("click", () => dialog.close());
document.querySelector("#cancelEditorButton").addEventListener("click", () => dialog.close());

function openNodeEditor(path) {
  const node = getOwner(path);
  openForm("Configurar pesquisa", [
    { name: "name", label: path.length === 1 ? "Nome do tema" : "Nome do subtema", value: node.name, required: true },
    { name: "query", label: "Texto da pesquisa no YouTube", value: node.query, placeholder: "Escreva o que você quer encontrar", required: true, multiline: true }
  ], ({ name, query }) => {
    node.name = name.trim();
    node.query = query.trim();
    saveAndRender();
  });
}

function openSubthemeEditor(topicIndex) {
  openForm("Adicionar subtema", [
    { name: "name", label: "Nome do subtema", placeholder: "Ex.: Sobrevivência", required: true },
    { name: "query", label: "Texto da pesquisa no YouTube", placeholder: "Ex.: vídeos de sobrevivência em jogos", required: true, multiline: true }
  ], ({ name, query }) => {
    topics[topicIndex].children.push({ name: name.trim(), query: query.trim(), videos: [] });
    saveAndRender();
  });
}

function parseYouTubeLink(value) {
  const raw = value.trim();
  if (/^[\w-]{11}$/.test(raw)) return { id: raw };
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (!(host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com"))) return null;
    const playlistId = url.searchParams.get("list") || "";
    if (/^[\w-]{10,}$/.test(playlistId)) return { playlistId };
    const id = url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || (host === "youtu.be" ? url.pathname.slice(1) : "");
    return /^[\w-]{11}$/.test(id) ? { id } : null;
  } catch {
    return null;
  }
}

async function fetchVideoMetadata(link) {
  const videoUrl = link.playlistId
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(link.playlistId)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(link.id)}`;
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", videoUrl);
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(link.playlistId
    ? "Não consegui obter os dados dessa playlist. Confira se ela é pública e tente novamente."
    : "Não consegui encontrar esse vídeo. Confira se o link é público e tente novamente.");
  const metadata = await response.json();
  if (!metadata.title) throw new Error("O YouTube não retornou o título deste vídeo.");
  if (link.playlistId && !metadata.thumbnail_url) throw new Error("O YouTube não retornou a miniatura desta playlist.");
  return metadata;
}

function openVideoEditor(path, existing = null) {
  const initialLink = existing?.playlistId
    ? `https://www.youtube.com/playlist?list=${existing.playlistId}`
    : existing?.id ? `https://www.youtube.com/watch?v=${existing.id}` : "";
  openForm(existing ? "Trocar vídeo ou playlist de exemplo" : "Adicionar vídeo ou playlist", [
    { name: "url", label: "Link de vídeo ou playlist do YouTube", value: initialLink, placeholder: "Cole o link do vídeo ou da playlist", required: true }
  ], async ({ url }) => {
    const link = parseYouTubeLink(url);
    if (!link) throw new Error("Cole um link válido de vídeo ou playlist do YouTube.");
    const metadata = await fetchVideoMetadata(link);
    const owner = getOwner(path);
    const item = link.playlistId
      ? { title: metadata.title, playlistId: link.playlistId, thumb: metadata.thumbnail_url }
      : { title: metadata.title, id: link.id, thumb: metadata.thumbnail_url || `https://img.youtube.com/vi/${link.id}/maxresdefault.jpg` };
    if (existing) owner.videos[owner.videos.indexOf(existing)] = item;
    else owner.videos.push(item);
    saveAndRender();
  });
}

function removeVideo(path, item) {
  if (!confirm(`Remover “${item.title}” deste mapa?`)) return;
  const owner = getOwner(path);
  owner.videos = owner.videos.filter((videoItem) => videoItem !== item);
  saveAndRender();
}

function removeNode(path) {
  const node = getOwner(path);
  const label = path.length === 1 ? "tema" : "subtema";
  if (!confirm(`Remover o ${label} “${node.name}” e seus vídeos?`)) return;
  if (path.length === 1) topics.splice(path[0], 1);
  else topics[path[0]].children.splice(path[1], 1);
  saveAndRender();
}

function saveAndRender() {
  saveTopics();
  render();
}

document.querySelector("#filter").addEventListener("input", filterTopics);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.querySelector("#filter").focus();
  }
});
document.querySelector("#downloadMap").addEventListener("click", () => {
  const config = {
    format: "youtube-video-map",
    schemaVersion: defaultConfig.schemaVersion,
    topics: JSON.parse(JSON.stringify(topics))
  };
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "meus-temas-youtube.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector("#saveStatus").textContent = "JSON baixado";
});

document.querySelector("#resetMap").addEventListener("click", () => {
  if (!confirm("Restaurar os temas padrão? As alterações salvas neste navegador serão apagadas.")) return;
  topics = cloneDefaults();
  try { localStorage.removeItem(STORAGE_KEY); }
  catch { /* Mostra o padrão nesta sessão mesmo se o navegador bloquear o armazenamento. */ }
  document.querySelector("#filter").value = "";
  render();
  document.querySelector("#saveStatus").textContent = "Padrão restaurado";
});

function validateConfig(parsed) {
  if (parsed?.format && parsed.format !== "youtube-video-map") throw new Error("Esse arquivo não é uma configuração deste mapa.");
  const importedTopics = Array.isArray(parsed) ? parsed : parsed?.topics;
  if (!Array.isArray(importedTopics)) throw new Error("O JSON precisa conter uma lista de temas.");
  if (importedTopics.length > 200) throw new Error("O arquivo contém temas demais para importar.");

  const cleanVideo = (item) => {
    if (!item || typeof item.title !== "string" || !item.title.trim()) throw new Error("Há um vídeo sem título no arquivo.");
    if (item.id != null && !/^[\w-]{11}$/.test(String(item.id))) throw new Error(`O ID do vídeo “${item.title}” é inválido.`);
    if (item.playlistId != null && !/^[\w-]{10,}$/.test(String(item.playlistId))) throw new Error(`O ID da playlist “${item.title}” é inválido.`);
    if (!item.id && !item.playlistId && (typeof item.query !== "string" || !item.query.trim())) throw new Error(`O vídeo “${item.title}” precisa de um ID ou texto de busca.`);
    return item.playlistId
      ? { title: item.title.trim(), playlistId: String(item.playlistId), thumb: typeof item.thumb === "string" ? item.thumb : "" }
      : item.id
      ? { title: item.title.trim(), id: String(item.id), thumb: typeof item.thumb === "string" ? item.thumb : `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg` }
      : { title: item.title.trim(), query: item.query.trim() };
  };

  const cleanNode = (node, isTopic = false) => {
    if (!node || typeof node.name !== "string" || !node.name.trim()) throw new Error("Há um tema ou subtema sem nome.");
    if (typeof node.query !== "string" || !node.query.trim()) throw new Error(`Adicione um texto de pesquisa para “${node.name}”.`);
    const children = node.children ?? [];
    const videos = node.videos ?? [];
    if (!Array.isArray(children) || !Array.isArray(videos)) throw new Error(`A lista de vídeos ou subtemas de “${node.name}” está inválida.`);
    if (children.length > 100 || videos.length > 500) throw new Error(`O tema “${node.name}” contém itens demais.`);
    if (!isTopic && children.length) throw new Error(`O subtema “${node.name}” não pode conter outro nível de subtemas.`);
    return {
      name: node.name.trim(),
      icon: typeof node.icon === "string" ? node.icon : "📌",
      query: node.query.trim(),
      videos: videos.map(cleanVideo),
      ...(isTopic ? { children: children.map((child) => cleanNode(child)) } : {})
    };
  };

  return importedTopics.map((topic) => cleanNode(topic, true));
}

const configFile = document.querySelector("#configFile");
document.querySelector("#loadMap").addEventListener("click", () => configFile.click());
configFile.addEventListener("change", async () => {
  const file = configFile.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo excede o limite de 5 MB.");
    const parsed = JSON.parse(await file.text());
    const importedTopics = validateConfig(parsed);
    if (!confirm(`Carregar “${file.name}”? Isso substituirá os temas atuais salvos neste navegador.`)) return;
    topics = importedTopics;
    document.querySelector("#filter").value = "";
    saveTopics();
    render();
    document.querySelector("#saveStatus").textContent = "Temas carregados";
  } catch (error) {
    alert(error.message || "Não foi possível ler esse arquivo JSON.");
  } finally {
    configFile.value = "";
  }
});

render();
document.querySelector("#saveStatus").textContent = hasSavedTopics() ? "Alterações carregadas deste navegador" : "Mapa original";
