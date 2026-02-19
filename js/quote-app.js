console.log("QUOTE APP LOADED");

import { roundUp, generateRequestId } from './utils.js';
import { addItem } from './state.js';
import { renderTable, initDeleteHandler, initDrag } from './table.js';
import { requestPrice } from './pricing.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/modular/sortable.esm.js'

window.addEventListener("DOMContentLoaded", () => {
    initDeleteHandler();
    initDrag();

    document.getElementById("addItemBtn").addEventListener("click", handleAdd);
});

async function handleAdd() {
    const type = document.getElementById("itemType").value;
    const length = parseFloat(document.getElementById("length").value);
    const quantity = parseInt(document.getElementById("quantity").value) || 1;

    const requestId = generateRequestId();

    const unitPrice = await requestPrice({
        type: "GET_PRICE",
        pricingType: "PricingTypeML",
        itemType: type,
        requestId
    });

    const price = length * unitPrice;

    addItem({ type, length, price, quantity });
    renderTable();
}
