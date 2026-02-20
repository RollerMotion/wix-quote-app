document.addEventListener("DOMContentLoaded", function () {

    console.log("QUOTE APP LOADED");

    // ---------------------
    // State
    // ---------------------
    let items = [];
    let requestCounter = 0;

    // ---------------------
    // DOM Elements
    // ---------------------
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
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    function calculateTotal() {
        return items.reduce((sum, item) => {
            return sum + ((item.price || 0) * item.quantity);
        }, 0);
    }

    // ---------------------
    // Auto-fill Date
    // ---------------------
    const today = new Date();
    quoteDateInput.value =
        String(today.getDate()).padStart(2, '0') + '/' +
        String(today.getMonth() + 1).padStart(2, '0') + '/' +
        today.getFullYear();

    // ---------------------
    // Pricing Type Toggle
    // ---------------------
    function updateInputFields() {
        const pricing = itemTypeSelect.selectedOptions[0].dataset.pricing;

        if (pricing === "PricingTypeML") {
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

        if (pricing === "PricingTypeML") {

            const length = parseFloat(lengthInput.value);
            if (!(length > 0)) {
                alert("Ingrese Largo válido");
                return;
            }

            itemData.length = length;

            requestCounter++;

            window.parent.postMessage({
                type: "GET_ML_PRICE",
                itemType: type,
                requestId: requestCounter
            }, "*");

            itemData.requestId = requestCounter;

        } else {

            const width = parseFloat(widthInput.value);
            const height = parseFloat(heightInput.value);

            if (!(width > 0) || !(height > 0)) {
                alert("Ingrese Ancho y Alto válidos");
                return;
            }

            itemData.width = roundUp(width);
            itemData.height = roundUp(height);

            requestCounter++;

            window.parent.postMessage({
                type: "GET_PRICE",
                itemType: type,
                width: itemData.width,
                height: itemData.height,
                requestId: requestCounter
            }, "*");

            itemData.requestId = requestCounter;
        }

        items.push(itemData);

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
        let total = calculateTotal();

        items.forEach((item, index) => {

            const price = item.price || 0;
            const lineTotal = price * item.quantity;

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${item.type}</td>
                <td>${item.width || ""}</td>
                <td>${item.height || ""}</td>
                <td>${item.length || ""}</td>
                <td>${price ? formatCurrency(price) : "..."}</td>
                <td>${item.quantity}</td>
                <td>${price ? formatCurrency(lineTotal) : "..."}</td>
                <td><button class="delete-btn" data-index="${index}">X</button></td>
            `;

            quoteBody.appendChild(tr);
        });

        grandTotalSpan.textContent = formatCurrency(total);

        quoteBody.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index);
                items.splice(idx, 1);
                renderTable();
            });
        });
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
    window.addEventListener("message", (event) => {

        const data = event.data;

        if (data.type === "PRICE_RESULT") {
            const item = items.find(i => i.requestId === data.requestId);
            if (item) {
                item.price = data.price;
                renderTable();
            }
        }

        if (data.type === "SET_QUOTE_NUMBER") {
            quoteNumberInput.value = data.quoteNumber;
        }

        if (data.type === "QUOTE_SAVED") {
            saveStatus.textContent = "✅ Presupuesto guardado!";
            setTimeout(() => { saveStatus.textContent = ""; }, 3000);

            if (data.nextQuoteNumber) {
                quoteNumberInput.value = data.nextQuoteNumber;
            }
        }

        if (data.type === "QUOTE_SAVE_ERROR") {
            saveStatus.style.color = "red";
            saveStatus.textContent = "Error al guardar: " + data.error;
            setTimeout(() => {
                saveStatus.textContent = "";
                saveStatus.style.color = "green";
            }, 5000);
        }
    });

    // ---------------------
    // Save Quote
    // ---------------------
    saveQuoteBtn.addEventListener("click", function () {

        console.log("SAVE BUTTON CLICKED");

        const total = calculateTotal();

        const quoteData = {
            quoteNumber: quoteNumberInput.value,
            customer: customerNameInput.value,
            date: quoteDateInput.value,
            items,
            total
        };

        window.parent.postMessage({
            type: "SAVE_QUOTE",
            quote: quoteData
        }, "*");
    });

});
