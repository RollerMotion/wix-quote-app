let items = [];

export function getItems() {
    return items;
}

export function addItem(item) {
    items.push(item);
}

export function removeItem(index) {
    items.splice(index, 1);
}

export function reorder(oldIndex, newIndex) {
    const moved = items.splice(oldIndex, 1)[0];
    items.splice(newIndex, 0, moved);
}
