import { renderTable } from './table.js';
import { roundUp } from './utils.js';

let items = [];

window.addItem = function() {
   // your logic here
   renderTable(items, deleteItem);
};

window.deleteItem = function(index) {
   items.splice(index, 1);
   renderTable(items, deleteItem);
};
