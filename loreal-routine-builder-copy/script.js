// Add the URL for your class Cloudflare Worker here when it is provided.
const WORKER_URL = "https://bitter-lab-f286loreal-api.kimjose9.workers.dev/";
const STORAGE_KEY = "loreal-routine-studio-selected-products";
const SYSTEM_MESSAGE = "You are a warm, upbeat L'Oréal group beauty routine advisor. Help the user feel welcome and confident, celebrate small steps, and keep your tone friendly and positive without overdoing exclamation marks or emojis. Use the user's selected product details and the full conversation to give practical, easy-to-follow guidance. Organize longer answers with short headings and concise bullet lists; use **bold** for product names or key steps. Keep answers limited to the routine, its products, skincare, haircare, makeup, fragrance, and closely related beauty topics. Politely redirect unrelated questions. Do not diagnose or claim to replace a medical professional. Do not claim to have searched the live web unless search results and citations are provided by the server.";

// Find the page controls so the functions below can update them.
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const productCount = document.getElementById("productCount");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const clearSelectionsButton = document.getElementById("clearSelections");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const chatWindow = document.getElementById("chatWindow");
const directionToggle = document.getElementById("directionToggle");
const statusMessage = document.getElementById("statusMessage");

let products = [];
let selectedProducts = [];
let messages = [{ role: "system", content: SYSTEM_MESSAGE }];
let routineCreated = false;
let isSending = false;

// Keep product text safe when it is added to the product-card markup.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const characters = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return characters[character];
  });
}

// Use the product data to make the category menu match the catalog.
function buildCategoryOptions() {
  const categories = [...new Set(products.map((product) => product.category))].sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category.replace(/\b\w/g, (letter) => letter.toUpperCase());
    categoryFilter.append(option);
  });
}

// Display products that match both the category and text search.
function displayProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.trim().toLowerCase();
  const matchingProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const searchText = `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    return matchesCategory && searchText.includes(searchTerm);
  });

  productCount.textContent = `${matchingProducts.length} ${matchingProducts.length === 1 ? "product" : "products"}`;

  if (matchingProducts.length === 0) {
    productsContainer.innerHTML = '<p class="empty-products">No products match those filters. Try another search.</p>';
    return;
  }

  productsContainer.innerHTML = matchingProducts.map((product) => {
    const isSelected = selectedProducts.some((selected) => selected.id === product.id);
    const buttonLabel = isSelected ? `Remove ${product.name} from selection` : `Add ${product.name} to selection`;
    return `
      <article class="product-card${isSelected ? " is-selected" : ""}">
        <button class="product-select" type="button" data-product-id="${Number(product.id)}" aria-pressed="${isSelected}" aria-label="${escapeHtml(buttonLabel)}">
          <span class="product-image-wrap"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" /></span>
          <span class="product-info">
            <span class="product-brand">${escapeHtml(product.brand)}</span>
            <span class="product-name">${escapeHtml(product.name)}</span>
            <span class="select-label">${isSelected ? "Added to your line-up" : "Add to your line-up"}</span>
          </span>
          <span class="selection-indicator" aria-hidden="true"><i class="fa-solid ${isSelected ? "fa-check" : "fa-plus"}"></i></span>
        </button>
        <details class="product-details">
          <summary>Product details</summary>
          <p>${escapeHtml(product.description)}</p>
        </details>
      </article>
    `;
  }).join("");
}

// Save the selected product IDs so the selection survives a page reload.
function saveSelection() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts.map((product) => product.id)));
}

// Refresh the selected-products list and buttons after each selection change.
function displaySelection() {
  selectedProductsList.replaceChildren();
  selectedCount.textContent = selectedProducts.length;
  clearSelectionsButton.disabled = selectedProducts.length === 0;
  generateRoutineButton.disabled = selectedProducts.length === 0 || isSending;

  if (selectedProducts.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "selection-empty";
    emptyMessage.textContent = "Your line-up is waiting for its first pick.";
    selectedProductsList.append(emptyMessage);
    return;
  }

  selectedProducts.forEach((product) => {
    const item = document.createElement("div");
    item.className = "selected-item";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = "";
    image.loading = "lazy";

    const details = document.createElement("div");
    details.className = "selected-item-info";
    const brand = document.createElement("span");
    brand.textContent = product.brand;
    const name = document.createElement("strong");
    name.textContent = product.name;
    details.append(brand, name);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-product";
    removeButton.type = "button";
    removeButton.dataset.productId = product.id;
    removeButton.setAttribute("aria-label", `Remove ${product.name}`);
    removeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    item.append(image, details, removeButton);
    selectedProductsList.append(item);
  });
}

// Add or remove one product, then update the saved list and product grid.
function toggleProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const alreadySelected = selectedProducts.some((item) => item.id === productId);
  selectedProducts = alreadySelected
    ? selectedProducts.filter((item) => item.id !== productId)
    : [...selectedProducts, product];

  saveSelection();
  displaySelection();
  displayProducts();
}

// Add plain text and safe inline bold formatting without treating replies as HTML.
function appendFormattedText(container, content) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  parts.forEach((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(2, -2);
      container.append(strong);
      return;
    }

    container.append(document.createTextNode(part));
  });
}

// Turn common Markdown headings and lists into readable, semantic elements.
function formatAssistantReply(container, content) {
  let currentList = null;

  content.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      currentList = null;
      return;
    }

    const headingMatch = trimmedLine.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      currentList = null;
      const heading = document.createElement("h3");
      appendFormattedText(heading, headingMatch[1]);
      container.append(heading);
      return;
    }

    const listMatch = trimmedLine.match(/^(?:[-*]\s+|\d+\.\s+)(.+)$/);
    if (listMatch) {
      const isNumbered = /^\d+\./.test(trimmedLine);
      const listTag = isNumbered ? "ol" : "ul";
      if (!currentList || currentList.tagName.toLowerCase() !== listTag) {
        currentList = document.createElement(listTag);
        container.append(currentList);
      }

      const item = document.createElement("li");
      appendFormattedText(item, listMatch[1]);
      currentList.append(item);
      return;
    }

    currentList = null;
    const paragraph = document.createElement("p");
    appendFormattedText(paragraph, trimmedLine);
    container.append(paragraph);
  });
}

// Add each chat message with safe, readable formatting.
function addChatMessage(role, content, citations = []) {
  chatWindow.querySelector(".chat-empty")?.remove();
  const message = document.createElement("article");
  message.className = `chat-message ${role === "user" ? "user-message" : "assistant-message"}`;
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "YOUR BEAUTY GUIDE";
  const text = document.createElement("div");
  text.className = "message-body";
  if (role === "user") {
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    text.append(paragraph);
  } else {
    formatAssistantReply(text, content);
  }
  message.append(label, text);

  citations.forEach((citation) => {
    const url = citation.url || citation.url_citation?.url;
    if (!url || !/^https?:\/\//i.test(url)) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = citation.title || citation.url_citation?.title || url;
    link.className = "citation-link";
    message.append(link);
  });

  chatWindow.append(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Send the full message history to the class Worker, which holds the API key.
async function askWorker() {
  if (!WORKER_URL) {
    throw new Error("The Cloudflare Worker URL has not been added to script.js yet.");
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`The routine service returned an error (${response.status}).`);
  }

  const data = await response.json();
  const assistantMessage = data.choices?.[0]?.message;
  const reply = assistantMessage?.content || data.output_text;
  if (!reply) throw new Error("The routine service returned an empty reply.");

  const citations = assistantMessage?.annotations || data.annotations || [];
  return { reply, citations };
}

// Keep the chat and routine button unavailable while a reply is being made.
function setSendingState(sending) {
  isSending = sending;
  generateRoutineButton.disabled = selectedProducts.length === 0 || sending;
  userInput.disabled = !routineCreated || sending;
  sendButton.disabled = !routineCreated || sending;
  sendButton.innerHTML = sending
    ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
}

// Generate a routine using only the selected product details.
async function generateRoutine() {
  if (selectedProducts.length === 0 || isSending) return;

  const routineProducts = selectedProducts.map(({ name, brand, category, description }) => ({
    name,
    brand,
    category,
    description,
  }));
  messages.push({
    role: "user",
    content: `Create a personalized routine using only these selected products. Explain a sensible order and when to use each item. Product data: ${JSON.stringify(routineProducts)}`,
  });

  setSendingState(true);
  statusMessage.textContent = "Generating your routine.";
  try {
    const result = await askWorker();
    messages.push({ role: "assistant", content: result.reply });
    addChatMessage("assistant", result.reply, result.citations);
    routineCreated = true;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
    statusMessage.textContent = "Your routine is ready. You can ask a follow-up question.";
  } catch (error) {
    addChatMessage("assistant", `${error.message} Your selections are saved; try again after the Worker is configured.`);
    statusMessage.textContent = error.message;
  } finally {
    setSendingState(false);
  }
}

// Send follow-up questions together with every earlier message in the chat.
async function sendFollowUp(event) {
  event.preventDefault();
  const question = userInput.value.trim();
  if (!question || !routineCreated || isSending) return;

  messages.push({ role: "user", content: question });
  addChatMessage("user", question);
  userInput.value = "";
  setSendingState(true);

  try {
    const result = await askWorker();
    messages.push({ role: "assistant", content: result.reply });
    addChatMessage("assistant", result.reply, result.citations);
  } catch (error) {
    addChatMessage("assistant", error.message);
  } finally {
    setSendingState(false);
    userInput.focus();
  }
}

// Load the catalog, restore saved selections, then show the initial page.
async function startApp() {
  try {
    const response = await fetch("products.json");
    if (!response.ok) throw new Error("Product data could not be loaded.");
    const data = await response.json();
    products = data.products;

    const savedIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    selectedProducts = products.filter((product) => savedIds.includes(product.id));
    buildCategoryOptions();
    displayProducts();
    displaySelection();
  } catch (error) {
    productsContainer.innerHTML = '<p class="empty-products">The product catalog could not be loaded. Open this page through a local web server and try again.</p>';
    statusMessage.textContent = error.message;
  }
}

// Connect the search, category, selection, and chat controls.
categoryFilter.addEventListener("change", displayProducts);
productSearch.addEventListener("input", displayProducts);
productsContainer.addEventListener("click", (event) => {
  const button = event.target.closest(".product-select");
  if (button) toggleProduct(Number(button.dataset.productId));
});
selectedProductsList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-product");
  if (button) toggleProduct(Number(button.dataset.productId));
});
clearSelectionsButton.addEventListener("click", () => {
  selectedProducts = [];
  saveSelection();
  displaySelection();
  displayProducts();
});
generateRoutineButton.addEventListener("click", generateRoutine);
chatForm.addEventListener("submit", sendFollowUp);
directionToggle.addEventListener("click", () => {
  const isRightToLeft = document.documentElement.dir !== "rtl";
  document.documentElement.dir = isRightToLeft ? "rtl" : "ltr";
  directionToggle.setAttribute("aria-pressed", String(isRightToLeft));
  directionToggle.querySelector("span").textContent = isRightToLeft ? "English / LTR" : "عربي / RTL";
});

startApp();
