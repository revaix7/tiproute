# TipRoute

A trip planner for tip-to-tip journeys: crossing a country from one end to the other, like Land's End to John o' Groats or Cape Sata to Cape Soya. Pick a country and a way to travel, and TipRoute estimates how long it takes, what it costs, and how hard it is.

**Live: https://revaix7.github.io/tiproute/**

## Features

- **Three planning modes.**
  - *I have a route:* estimates the range of days needed to finish the full route.
  - *I have time:* for a set number of days, works out how far you'd get and which checkpoint you'd reach. Checkpoints you don't reach are greyed out.
  - *Find me a trip:* give your days, total budget and the hardest difficulty you want, and it picks a start and an end on the route that fit. If nothing fits, it shows the closest trip and which limit is the problem.
- **Plan your own trip.** Click a start and an end anywhere on the world map for an estimate.
- **12 countries**, each with a real start and end point, an approximate road distance, and checkpoints along the way.
- **4 ways to travel:** motorbike, bicycle, public transit and walking. Each has its own daily distance range and costs.
- **Budget and difficulty.** Combines transport costs with your daily spending budget, and rates difficulty from Easy to Extreme based on the transport mode, distance and trip length.
- **Transport comparison.** The results page lines up all four ways to travel for the same route and budget, and tags the cheapest and the fastest (or, with a fixed number of days, the one that gets farthest).
- **Maps.** The results page draws the start, the end and 40 possible route lines.
- **Trip card and share links.** A summary card of the planned trip. The trip is in the URL, so the share text links to the same trip.

## How the estimates work

All the logic lives in `src/data/tripCalculator.js`:

- **Days needed:** the route distance divided by the mode's fastest and slowest daily distance gives a minimum and maximum day count.
- **Distance reachable:** the mode's average daily distance times the number of days. That distance is mapped onto the checkpoint list to find where you'd end up.
- **Cost:** a fixed daily cost for the mode, plus a per-km cost for the distance covered each day, plus your daily budget.
- **Difficulty:** the mode's base difficulty, with extra points for routes over 3,000 and 5,000 km and trips over 60 and 100 days, capped at 5.

## Tech

React, React Router, Leaflet (OpenStreetMap tiles) and Vite, with Vitest for tests. There's no backend: all country and transport data is in `src/data/countries.js`.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Run the tests with `npm test`.

## Deploying

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages (`.github/workflows/deploy.yml`). The site lives under `/tiproute/`, so the build sets `BASE_PATH=/tiproute/`, and `404.html` is a copy of the app so links like `/tiproute/results?...` open the right page.
