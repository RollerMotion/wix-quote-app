window.addEventListener("message", function(event) {
    if (event.data && event.data.quoteNumber) {
        document.getElementById("quoteNumber").value = event.data.quoteNumber;
    }
});

let items = [];

const today = new Date();
document.getElementById("quoteDate").value = String(today.getDate()).padStart(2,'0') + '/' +
                                           String(today.getMonth()+1).padStart(2,'0') + '/' +
                                           today.getFullYear();

function roundUp(value) { return Math.ceil(value / 100) * 100; }
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(value);
}

function updateTable() {
    const tbody = document.getElementById("quoteBody");
    tbody.innerHTML = "";
    let total = 0;

items.forEach((item, index) => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;

    const row = document.createElement("tr");

    if (item.length !== undefined) {
        // PricingTypeML row
        row.innerHTML = `
            <td>${item.type}</td>
            <td colspan="2">Length: ${item.length}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(lineTotal)}</td>
            <td><button class="delete-btn" onclick="deleteItem(${index})">X</button></td>
        `;
    } else {
        // PricingTypeTable row (now quantity as text)
        row.innerHTML = `
            <td>${item.type}</td>
            <td>${item.originalWidth}</td>
            <td>${item.originalHeight}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(lineTotal)}</td>
            <td><button class="delete-btn" onclick="deleteItem(${index})">X</button></td>
        `;
    }

    tbody.appendChild(row);
});


    document.getElementById("grandTotal").textContent = formatCurrency(total);
}

function deleteItem(index) {
    items.splice(index, 1);
    updateTable();
}

// ENTER key behavior
document.getElementById("width").addEventListener("keydown", e => { if(e.key==="Enter"){e.preventDefault();document.getElementById("height").focus();}});
document.getElementById("height").addEventListener("keydown", e => { if(e.key==="Enter"){e.preventDefault();addItem();}});
document.getElementById("quantity").addEventListener("keydown", e => { if(e.key==="Enter"){e.preventDefault();addItem();}});

// Add item
document.getElementById("addItemBtn").addEventListener("click", addItem);

function addItem() {
    const typeSelect = document.getElementById("itemType");
    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    const type = selectedOption.value;
    const pricingType = selectedOption.dataset.pricing;

    const quantityInput = parseInt(document.getElementById("quantity").value);
    const quantity = Math.max(1, quantityInput || 0);

    if(pricingType === "PricingTypeTable") {
        const width = parseInt(document.getElementById("width").value);
        const height = parseInt(document.getElementById("height").value);

        if(isNaN(width) || isNaN(height)) return;

        const requestId = Date.now();
        window.parent.postMessage({ type: "GET_PRICE", itemType: type, width, height, requestId }, "*");

        function handlePrice(event) {
            if(event.data.requestId !== requestId) return;

            if(event.data.type === "PRICE_RESULT") {
                const roundedWidth = Math.ceil(width / 100) * 100;
                const roundedHeight = Math.ceil(height / 100) * 100;
                const price = event.data.price;

                items.push({ type, originalWidth: width, originalHeight: height, roundedWidth, roundedHeight, price, quantity });
                updateTable();
            } else if(event.data.type === "PRICE_ERROR") {
                alert(event.data.error);
            }

            window.removeEventListener("message", handlePrice);
        }

        window.addEventListener("message", handlePrice);

    } else if(pricingType === "PricingTypeML") {
    const lengthInput = parseFloat(document.getElementById("length").value);
    if (isNaN(lengthInput) || lengthInput <= 0) return;

    const requestId = Date.now();
    // Request unit price from Wix backend
    window.parent.postMessage({
        type: "GET_PRICE",
        pricingType: "PricingTypeML",
        itemType: type,
        requestId
    }, "*");

    function handlePrice(event) {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "PRICE_RESULT") {
            const unitPrice = event.data.price;
            const price = lengthInput * unitPrice;

            items.push({
                type,
                length: lengthInput,
                price,
                quantity
            });

            updateTable();
        } else if(event.data.type === "PRICE_ERROR") {
            alert(event.data.error);
        }

        window.removeEventListener("message", handlePrice);
    }

    window.addEventListener("message", handlePrice);
}

    // Reset inputs
    document.getElementById("width").value = "";
    document.getElementById("height").value = "";
    document.getElementById("length").value = "";
    document.getElementById("quantity").value = 1;
    document.getElementById("width").focus();
}

document.getElementById("saveQuoteBtn").addEventListener("click", async function() {
    const quoteNumber = document.getElementById("quoteNumber").value;
    const customerName = document.getElementById("customerName").value;
    const quoteDate = document.getElementById("quoteDate").value;
    const grandTotal = parseFloat(document.getElementById("grandTotal").textContent.replace(/[$,]/g, ""));

    // Send data to Wix page code
    window.parent.postMessage({
        type: "SAVE_QUOTE",
        data: {
            quoteNumber,
            customerName,
            quoteDate,
            items,
            total: grandTotal
        }
    }, "*");

    console.log("DEBUG: Sent quote data to Wix page", { quoteNumber, customerName, quoteDate, items, total: grandTotal });
});

// Listen for messages from Wix page
window.addEventListener("message", function(event) {
    if (event.data.type === "QUOTE_SAVED") {
        const status = document.getElementById("saveStatus");
        status.textContent = `Quote saved! ID: ${event.data.quoteId}`;
        // Clear message after 3 seconds
        setTimeout(() => { status.textContent = ""; }, 3000);
    } else if (event.data.type === "QUOTE_SAVE_ERROR") {
        const status = document.getElementById("saveStatus");
        status.style.color = "red";
        status.textContent = `Error saving quote: ${event.data.error}`;
        setTimeout(() => { status.textContent = ""; status.style.color = "green"; }, 5000);
    }
});

// Listen for messages from Wix page
window.addEventListener("message", function(event) {
    if (event.data.type === "QUOTE_SAVED") {
        const status = document.getElementById("saveStatus");
        status.textContent = `✅ Quote saved! ID: ${event.data.quoteId}`;
        setTimeout(() => { status.textContent = ""; }, 3000);

        // Update the quote number input to the new number
        if(event.data.nextQuoteNumber) {
            document.getElementById("quoteNumber").value = event.data.nextQuoteNumber;
        }
    } else if (event.data.type === "QUOTE_SAVE_ERROR") {
        const status = document.getElementById("saveStatus");
        status.style.color = "red";
        status.textContent = `Error saving quote: ${event.data.error}`;
        setTimeout(() => { status.textContent = ""; status.style.color = "green"; }, 5000);
    }
});

// Ask Wix page for the next quote number immediately on load
window.parent.postMessage({ type: "REQUEST_NEXT_QUOTE" }, "*");

function updateInputFields() {
    const typeSelect = document.getElementById("itemType");
    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    const pricingType = selectedOption.dataset.pricing;

    if(pricingType === "PricingTypeML") {
        document.getElementById("width").style.display = "none";
        document.getElementById("height").style.display = "none";
        document.getElementById("length").style.display = "inline-block";
    } else {
        document.getElementById("width").style.display = "inline-block";
        document.getElementById("height").style.display = "inline-block";
        document.getElementById("length").style.display = "none";
    }
}

const tbody = document.getElementById("quoteBody");

new Sortable(tbody, {
    animation: 150,
    onEnd: function (evt) {
        const movedItem = items.splice(evt.oldIndex, 1)[0];
        items.splice(evt.newIndex, 0, movedItem);
        updateTable();
    }
});
