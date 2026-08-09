export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #0a1a1f; color: #e2e8f0; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; text-align: center; }
      h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
      p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
      a { display: inline-block; padding: 0.5rem 1rem; border-radius: 0.5rem; background: #e11d48; color: white; text-decoration: none; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. Please try refreshing or head back home.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
}
// code:4ce0
