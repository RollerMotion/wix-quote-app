console.log("QUOTE APP LOADED");

// ---------------------
// State
// ---------------------
let items = [];
let requestCounter = 0;

// DOM Elements
const quoteNumberInput = document.getElementById("quoteNumber");
const quoteDateInput = document.getElementById("quoteDate");
const customerNameInput = document.getElementById("customerName");
const itemTypeSelect = document.getElementById("itemType");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const lengthInput = document.getElementById("length");
const quantityInput = document.getElementById("quantity");
const addItemBtn = document.getElementById("addItemBtn");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const quoteBody = document.getElementById("quoteBody");
const grandTotalSpan = document.getElementById("grandTotal");
const saveStatus = document.getElementById("saveStatus");

// ---------------------
// Utilities
// ---------------------
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ---------------------
// Auto-fill date input
// ---------------------
const today = new Date();
quoteDateInput.value = String(today.getDate()).padStart(2,'0') + '/' +
                       String(today.getMonth()+1).padStart(2,'0') + '/' +
                       today.getFullYear();

// ---------------------
// Handle Pricing Type Input Toggle
// ---------------------
function updateInputFields() {
    const selected = itemTypeSelect.selectedOptions[0];
    const pricing = selected.dataset.pricing;

    if(pricing === "PricingTypeML") {
        widthInput.style.display = "none";
        heightInput.style.display = "none";
        lengthInput.style.display = "";
    } else {
        widthInput.style.display = "";
        heightInput.style.display = "";
        lengthInput.style.display = "none";
    }
}
updateInputFields();
itemTypeSelect.addEventListener("change", updateInputFields);

// ---------------------
// Add Item
// ---------------------
addItemBtn.addEventListener("click", () => {
    const type = itemTypeSelect.value;
    const pricing = itemTypeSelect.selectedOptions[0].dataset.pricing;
    const quantity = Math.max(1, parseInt(quantityInput.value) || 1);

    let itemData = { type, pricing, quantity };

    requestCounter++;

    if (pricing === "PricingTypeML") {
        const length = parseFloat(lengthInput.value);
        if (isNaN(length) || length <= 0) return alert("Ingrese Largo válido");

        itemData.length = length;       // store exact value
        itemData.requestId = requestCounter;

        // Send length to Wix for ML pricing
        window.parent.postMessage({
            type: "GET_ML_PRICE",
            itemType: type,
            length: length,             // <--- FIXED
            requestId: requestCounter
        }, "*");

    } else {
        const width = parseFloat(widthInput.value);
        const height = parseFloat(heightInput.value);
        if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) 
            return alert("Ingrese Ancho y Alto válidos");

        itemData.width = width;         // store exact value
        itemData.height = height;
        itemData.requestId = requestCounter;

        // Send rounded values for table pricing
        window.parent.postMessage({
            type: "GET_PRICE",
            itemType: type,
            width: Math.ceil(width / 100) * 100,   // round only for pricing
            height: Math.ceil(height / 100) * 100,
            requestId: requestCounter
        }, "*");
    }

    items.push(itemData);

    // Reset inputs
    widthInput.value = "";
    heightInput.value = "";
    lengthInput.value = "";
    quantityInput.value = 1;
    widthInput.focus();

    renderTable();
});

// ---------------------
// Render Table
// ---------------------
function renderTable() {
    quoteBody.innerHTML = "";
    let total = 0;

    items.forEach((item, index) => {
        const price = item.price || 0;
        const lineTotal = price * item.quantity;
        total += lineTotal;

        const tr = document.createElement("tr");

        // Display length under Ancho for ML items
        const displayWidth = item.pricing === "PricingTypeML" ? item.length : item.width;

        tr.innerHTML = `
            <td>${item.type}</td>
            <td>${displayWidth || ""}</td>
            <td>${item.pricing === "PricingTypeML" ? "" : (item.height || "")}</td>
            <td>${price ? formatCurrency(price) : "..."}</td>
            <td>${item.quantity}</td>
            <td>${price ? formatCurrency(lineTotal) : "..."}</td>
            <td><button class="delete-btn" data-index="${index}">X</button></td>
        `;

        quoteBody.appendChild(tr);
    });

    grandTotalSpan.textContent = formatCurrency(total);

    // Attach delete buttons
    quoteBody.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            items.splice(idx, 1);
            renderTable();
        });
    });

    return total;
}

// ---------------------
// Drag & Drop
// ---------------------
new Sortable(quoteBody, {
    animation: 150
});

// ---------------------
// Handle Messages from Wix
// ---------------------
window.addEventListener("message", async (event) => {
    const data = event.data;

    // Price result
    if (data.type === "PRICE_RESULT") {
        const item = items.find(i => i.requestId === data.requestId);
        if (item) {
            item.price = data.price;
            renderTable();
        }
    }

    // Quote saved
    if (data.type === "QUOTE_SAVED") {
        saveStatus.textContent = `✅ Presupuesto guardado! ID: ${data.quoteId}`;
        setTimeout(() => { saveStatus.textContent = ""; }, 3000);

        if (data.nextQuoteNumber) {
            quoteNumberInput.value = data.nextQuoteNumber;
        }
    }

    // Error
    if (data.type === "QUOTE_SAVE_ERROR") {
        saveStatus.style.color = "red";
        saveStatus.textContent = `Error al guardar: ${data.error}`;
        setTimeout(() => { saveStatus.textContent = ""; saveStatus.style.color = "green"; }, 5000);
    }

    // Initial quote number
    if (data.type === "SET_QUOTE_NUMBER") {
        quoteNumberInput.value = data.quoteNumber;
    }
});

// Save Quote button
saveQuoteBtn.addEventListener("click", function () {
    const quoteData = {
        quoteNumber: quoteNumberInput.value,
        customer: customerNameInput.value,
        date: quoteDateInput.value,
        items: items,
        total: items.reduce((sum, i) => sum + ((i.price || 0) * i.quantity), 0)
    };

    window.parent.postMessage({ type: "SAVE_QUOTE", quote: quoteData }, "*");
});

