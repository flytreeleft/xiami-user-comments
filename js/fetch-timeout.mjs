import fetch from "node-fetch";
import AbortController from 'abort-controller';

export default async function fetchWithTimeout(url, {timeout, ...opts} = {}) {
    if (!timeout || timeout < 0) {
        return await fetch(url, {...opts});
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        return await fetch(url, {signal: controller.signal, ...opts});
    } finally {
        clearTimeout(timer);
    }
}
