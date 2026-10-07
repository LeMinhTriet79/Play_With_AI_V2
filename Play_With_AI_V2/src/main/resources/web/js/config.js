(function() {
    const DEFAULT_BASE = 'https://play-with-ai-v2.onrender.com';
    window.APP_CONFIG = {
        API_BASE: DEFAULT_BASE,
        WS_BASE: DEFAULT_BASE
    };

    // Polyfill fetch for JavaFX WebView (.exe built with launch4j uses jar: protocol)
    // fetch API is known to hang or fail silently on cross-origin requests from jar: protocol.
    window.fetch = function(url, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url, true);
            if (options.headers) {
                for (var k in options.headers) {
                    xhr.setRequestHeader(k, options.headers[k]);
                }
            }
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var status = xhr.status;
                    // If status is 0, it might be a CORS block or network error, but we still resolve it
                    // so the .catch() or .ok checks can handle it properly instead of hanging.
                    resolve({
                        ok: status >= 200 && status < 300,
                        status: status,
                        text: function() { return Promise.resolve(xhr.responseText); },
                        json: function() {
                            try {
                                return Promise.resolve(JSON.parse(xhr.responseText || '{}'));
                            } catch (e) {
                                return Promise.reject(e);
                            }
                        }
                    });
                }
            };
            xhr.onerror = function() {
                reject(new TypeError('Network request failed'));
            };
            xhr.send(options.body || null);
        });
    };
})();
