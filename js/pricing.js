export function requestPrice(data) {
    return new Promise((resolve, reject) => {
        const requestId = data.requestId;

        function handler(event) {
            if (event.data.requestId !== requestId) return;

            if (event.data.type === "PRICE_RESULT") {
                resolve(event.data.price);
            } else {
                reject(event.data.error);
            }

            window.removeEventListener("message", handler);
        }

        window.addEventListener("message", handler);

        window.parent.postMessage(data, "*");
    });
}
