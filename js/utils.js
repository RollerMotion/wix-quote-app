export function roundUp(value) {
    return Math.ceil(value / 100) * 100;
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

export function generateRequestId() {
    return Date.now() + Math.random();
}
