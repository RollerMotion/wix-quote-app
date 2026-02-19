import { formatCurrency } from './utils.js';

export function renderTable(items, deleteItem) {
    const tbody = document.getElementById("quoteBody");
    tbody.innerHTML = "";

    let total = 0;

    items.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.type}</td>
            <td>${item.length || item.originalWidth}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(lineTotal)}</td>
            <td><button onclick="deleteItem(${index})">X</button></td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("grandTotal").textContent = formatCurrency(total);
}
