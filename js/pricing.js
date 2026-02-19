export function requestPrice(data) {
    window.parent.postMessage(data, "*");
}
