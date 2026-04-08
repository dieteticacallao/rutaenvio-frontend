# Code Style

- User-facing text: Spanish (Argentina)
- Variables/functions: English, camelCase
- NEVER > < & in JSX text. Use words: "mayor que", "menor que", "y"
- async/await always, never callbacks
- try/catch on every endpoint
- Responses: { success: true, data } or { success: false, error: "mensaje" }
- PrismaClient singleton only (src/lib/prisma.js)
- Tailwind CSS for all styling, no custom CSS
- Dark theme: bg-navy-950 base
- react-hot-toast for notifications
- Required form fields marked with *
