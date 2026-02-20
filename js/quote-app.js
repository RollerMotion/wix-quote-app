document.addEventListener("DOMContentLoaded", function () {
    console.log("QUOTE APP BOOTED");
});


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
function roundUp(value) {
    return Math.ceil(value / 100) * 100;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ---------------------
// Auto-fill date input in dd/mm/yyyy format
// ---------------------
const today = new Date();
const formattedDate = String(today.getDate()).padStart(2, '0') + '/' +
                      String(today.getMonth() + 1).padStart(2, '0') + '/' +
                      today.getFullYear();
quoteDateInput.value = formattedDate;

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

    if(pricing === "PricingTypeML") {
        const length = parseFloat(lengthInput.value);
        if(isNaN(length) || length <= 0) return alert("Ingrese Largo válido");
        itemData.length = length;        // for calculation
        itemData.originalWidth = length; // for display in table

        requestCounter++;
        itemData.requestId = requestCounter;

        // Ask Wix backend for unit price
        window.parent.postMessage({
            type: "GET_ML_PRICE",
            itemType: type,
            requestId: requestCounter
        }, "*");

    } else {
        const width = parseFloat(widthInput.value);
        const height = parseFloat(heightInput.value);
        if(isNaN(width) || width <= 0 || isNaN(height) || height <= 0) return alert("Ingrese Ancho y Alto válidos");

        itemData.width = roundUp(width);   // for pricing calculation
        itemData.height = roundUp(height); // for pricing calculation
        itemData.originalWidth = width;    // store original for display
        itemData.originalHeight = height;  // store original for display

        requestCounter++;
        itemData.requestId = requestCounter;

        window.parent.postMessage({
            type: "GET_PRICE",
            itemType: type,
            width: itemData.width,
            height: itemData.height,
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
        // Display values: ML items use length in Ancho, Table items use originalWidth
        const displayWidth = item.pricing === "PricingTypeML" ? item.length : (item.originalWidth || "");
        const displayHeight = item.pricing === "PricingTypeML" ? "" : (item.originalHeight || "");

        const price = item.price || 0;
        const lineTotal = price * item.quantity;
        total += lineTotal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.type}</td>
            <td>${displayWidth}</td>
            <td>${displayHeight}</td>
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
window.addEventListener("message", (data) => {
    const msg = data.data;

    // When Wix returns PRICE_RESULT for ML items:
    if(data.type === "PRICE_RESULT") {
        const item = items.find(i => i.requestId === data.requestId);
        if(item) {
            // multiply by length if ML
            if(item.pricing === "PricingTypeML") {
                item.price = data.price * item.length;
            } else {
                item.price = data.price;
            }
            renderTable();
        }
    }

    if(msg.type === "QUOTE_SAVED") {
        saveStatus.textContent = `✅ Presupuesto guardado! ID: ${msg.quoteId}`;
        setTimeout(() => { saveStatus.textContent = ""; }, 3000);

        if(msg.nextQuoteNumber) {
            quoteNumberInput.value = msg.nextQuoteNumber;
        }
    }

    if(msg.type === "QUOTE_SAVE_ERROR") {
        saveStatus.style.color = "red";
        saveStatus.textContent = `Error al guardar: ${msg.error}`;
        setTimeout(() => { saveStatus.textContent = ""; saveStatus.style.color = "green"; }, 5000);
    }

    if(msg.type === "SET_QUOTE_NUMBER") {
        quoteNumberInput.value = msg.quoteNumber;
    }
});

// ---------------------
// Save Quote
// ---------------------
saveQuoteBtn.addEventListener("click", () => {
    console.log("Save button clicked");

    const total = renderTable(); // get current total
    const quoteData = {
        quoteNumber: quoteNumberInput.value,
        customer: customerNameInput.value,
        date: quoteDateInput.value,
        items,
        total
    };

    window.parent.postMessage({ type: "SAVE_QUOTE", quote: quoteData }, "*");
});

