import { formatCurrency } from './utils.js';
import { getItems, removeItem, reorder } from './state.js';

export function renderTable() {
    const tbody = document.getElementById("quoteBody");
    const items = getItems();
    tbody.innerHTML = "";

    let total = 0;

    items.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.type}</td>
            <td>${item.length ?? item.originalWidth}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(lineTotal)}</td>
            <td><button data-index="${index}" class="delete-btn">X</button></td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("grandTotal").textContent = formatCurrency(total);
}

export function initDeleteHandler() {
    document.getElementById("quoteBody").addEventListener("click", e => {
        if (e.target.classList.contains("delete-btn")) {
            removeItem(Number(e.target.dataset.index));
            renderTable();
        }
    });
}

export function initDrag() {
    new Sortable(document.getElementById("quoteBody"), {
        animation: 150,
        onEnd: evt => {
            reorder(evt.oldIndex, evt.newIndex);
            renderTable();
        }
    });
}
