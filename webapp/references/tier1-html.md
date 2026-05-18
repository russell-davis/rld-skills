# Tier 1: Single HTML File

The simplest possible web app - a single HTML file that opens directly in the browser.

## When to Use

- Quick visual prototype
- Proof of concept
- Client-side only (no secrets, no server logic)
- "I just want to see something"

## Structure

```
project/
└── index.html
```

That's it. One file.

## Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Name</title>
  <style>
    /* CSS here - keep it in the same file for simplicity */
  </style>
</head>
<body>
  <!-- HTML here -->

  <script>
    // JavaScript here - keep it in the same file for simplicity
  </script>
</body>
</html>
```

## Opening in Browser

```bash
# From the project directory
xdg-open index.html

# Or with a specific browser
firefox index.html
google-chrome-stable index.html
```

## Upgrade Signals → Tier 2

Time to upgrade when:
- "I need to save data" (database)
- "I need to call an API with a secret" (server-side fetch)
- "I want hot-reload while I iterate" (websocket dev server)
- "I need server-side logic"

## Notes

- Inline CSS and JS keeps it simple - don't split into separate files unless the user asks
- For quick iteration, the user can just refresh the browser
- No build step, no dependencies, no config
