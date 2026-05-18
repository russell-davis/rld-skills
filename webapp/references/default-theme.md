# Default Theme: Ember Dark

When no specific theme is requested, use this warm, dark aesthetic inspired by Anthropic's design language.

## Color Palette

```css
:root {
  /* Backgrounds - warm dark browns */
  --bg-primary: #1a1815;
  --bg-secondary: #201d18;
  --bg-elevated: #282420;
  --bg-hover: #302b26;

  /* Text - warm whites and grays */
  --text-primary: #e8e6e3;
  --text-secondary: #a09d98;
  --text-muted: #6b6863;

  /* Accent - ember orange */
  --accent: #C15F3C;
  --accent-hover: #d4714e;
  --accent-muted: rgba(193, 95, 60, 0.15);

  /* Borders - subtle, low opacity */
  --border: rgba(255, 255, 255, 0.06);
  --border-accent: rgba(193, 95, 60, 0.3);

  /* Semantic colors */
  --positive: #6b9a6b;
  --negative: #c15f5f;
}
```

## Typography

```css
:root {
  --font-serif: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-serif);
  line-height: 1.5;
}
```

**Font pairing:**
- **Body text**: Source Serif 4 (elegant, readable serif)
- **UI elements**: DM Sans (clean, modern sans-serif)
- Labels, buttons, and small text use sans-serif
- Headings and body content use serif

**Google Fonts import:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

## Design Tokens

```css
:root {
  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Transitions */
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Component Patterns

### Labels (uppercase, tracked)
```css
.label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
```

### Cards
```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  transition: border-color var(--transition), background var(--transition);
}

.card:hover {
  border-color: var(--border-accent);
  background: var(--bg-elevated);
}
```

### Buttons
```css
.btn {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--text-muted);
}
```

### Form Inputs
```css
.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: var(--font-serif);
  font-size: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  transition: border-color var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input::placeholder {
  color: var(--text-muted);
}
```

### Tables
```css
.table th {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 500;
  text-align: left;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

.table td {
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.table tr:hover td {
  background: var(--bg-hover);
}
```

## Texture (Optional)

Subtle grain overlay for depth:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 1000;
}
```

## Reset

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

## Key Characteristics

- **Warm, not cool** - browns and oranges, not blues and grays
- **Subtle borders** - very low opacity, appear on hover
- **Accent sparingly** - ember orange for CTAs and active states only
- **Serif for content** - gives a refined, editorial feel
- **Sans for UI** - clean labels and buttons
- **Smooth transitions** - 200ms with ease-out curve
