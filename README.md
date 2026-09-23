# Balance Planner

A weekly time-management tool that schedules fun as a fixed commitment, not leftover time. Study and fixed commitments (internship, class, campus roles) get placed around a protected fun and sleep budget, with a weekly balance score.

## Features

- Weekly timetable grid covering the full 24 hours with four block types: Study, Fun, Fixed, Sleep
- Add/remove blocks with title, day, start time, and duration
- Set weekly fun and sleep targets
- Balance score panel that flags when fun or sleep is under target
- Saves to the browser via `localStorage` — no backend or account needed

## Running locally

No build step. Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Files

- `index.html` — page structure
- `style.css` — layout and design tokens (CSS variables for colors, spacing)
- `script.js` — scheduling logic, rendering, and localStorage persistence

## Roadmap

- [ ] Canvas API sync for assignment deadlines
- [ ] Google Calendar sync for fixed commitments
- [ ] Drag-to-resize blocks
- [ ] "Smart suggest" for where to fit a new study session around existing fun/sleep blocks
