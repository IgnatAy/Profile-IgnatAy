# Travel globe map

`countries-50m.json` is derived from the `world-atlas@2.0.2` TopoJSON dataset,
using Natural Earth's 1:50m Admin 0 boundaries (Natural Earth 4.1.0).
Shared boundaries are simplified for smooth rotation, while all Hong Kong and
Macao vertices are retained. `provenance.json` records the original checksum.
Regenerate with `node scripts/prepare-travel-map.mjs [optional-original-file]`.

- Download: https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
- Dataset and format: https://github.com/topojson/world-atlas
- Original map: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/
- Natural Earth terms (public domain): https://www.naturalearthdata.com/about/terms-of-use/
- Retrieved: 2026-09-09

The website serves this file locally; no third-party requests are required to
render the globe. ISO numeric IDs used for the owner-confirmed destinations:
156 China, 344 Hong Kong, 446 Macao, 792 Türkiye, 643 Russia, 392 Japan,
784 United Arab Emirates, 860 Uzbekistan.

Hong Kong and Macao use their actual polygon boundaries. Their small point
markers are offset for legibility, with leader lines to their true positions.
Other point markers and the focus coordinates are representative locations
within each destination, not a record of specific cities visited.
