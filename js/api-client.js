export async function request(config, { signal } = {}) {
  const started = performance.now();

  let url = config.url;

  try {
    url = new URL(url).toString();
  } catch (error) {
    throw new Error(
      'Invalid URL. Include a scheme such as https://'
    );
  }

  const headers = {};

  for (const h of config.headers || []) {
    if (
      h.enabled !== false &&
      h.key &&
      !Object.keys(headers).some(
        key => key.toLowerCase() === h.key.toLowerCase()
      )
    ) {
      headers[h.key] = h.value || '';
    }
  }

  let body;

  if (!['GET', 'HEAD'].includes(config.method)) {
    const bodyConfig = config.body || {};
    const bodyType = bodyConfig.type;

    if (
      bodyType === 'json' ||
      ['text', 'xml', 'html', 'javascript'].includes(bodyType)
    ) {
      body = bodyConfig.content || '';
    } else if (bodyType === 'form-urlencoded') {
      const params = new URLSearchParams();

      for (const field of bodyConfig.fields || []) {
        if (
          field.enabled !== false &&
          field.key
        ) {
          params.set(
            field.key,
            field.value || ''
          );
        }
      }

      body = params.toString();
    } else if (bodyType === 'multipart') {
      const formData = new FormData();

      for (const field of bodyConfig.fields || []) {
        if (
          field.enabled !== false &&
          field.key
        ) {
          formData.append(
            field.key,
            field.value || ''
          );
        }
      }

      body = formData;
    }
  }

  const controller =
    signal || new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    config.timeout || 30000
  );

  try {
    const response = await fetch(url, {
      method: config.method || 'GET',
      headers,
      body,
      signal: controller.signal,
      redirect: 'follow'
    });

    const buffer = await response.arrayBuffer();

    const duration =
      performance.now() - started;

    const responseHeaders = {};

    response.headers.forEach(
      (value, key) => {
        responseHeaders[key] = value;
      }
    );

    const contentType =
      response.headers.get('content-type') || '';

    let text = '';
    let bodyKind = 'text';

    if (contentType.includes('json')) {
      text = new TextDecoder().decode(buffer);

      try {
        text = JSON.stringify(
          JSON.parse(text),
          null,
          2
        );

        bodyKind = 'json';
      } catch (error) {
        bodyKind = 'text';
      }

    } else if (contentType.includes('xml')) {
      text = new TextDecoder().decode(buffer);
      bodyKind = 'xml';

    } else if (contentType.startsWith('text/')) {
      text = new TextDecoder().decode(buffer);
      bodyKind = 'text';

    } else if (contentType.startsWith('image/')) {
      const blob = new Blob(
        [buffer],
        {
          type: contentType
        }
      );

      text = URL.createObjectURL(blob);
      bodyKind = 'image';

    } else {
      text = new TextDecoder().decode(buffer);
      bodyKind = 'binary';
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: text,
      bodyKind,
      size: buffer.byteLength,
      duration,
      finalUrl: response.url,
      type: contentType,
      redirected: response.redirected
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Request aborted or timed out.'
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Browser security or network failure. ' +
        'The target may reject cross-origin requests (CORS), ' +
        'be offline, or have an invalid hostname.'
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}