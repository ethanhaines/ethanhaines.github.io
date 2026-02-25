# Portfolio Hypercube Frontend (NEST)

React + Three.js portfolio frontend for your NEST (Nearest Extant Similarity Tool) pollen embedding export package.

## Stack

- Vite
- React
- `@react-three/fiber` + `three`
- `@react-three/drei`

## Run

```bash
npm install
npm run dev
```

## Data Package Refresh Workflow

This app treats `hypercube_test/` as Vite's `publicDir`, so the exported JSON files are served directly by the frontend.

When you regenerate the package from `export_hypercube_package.py`, replace:

- `hypercube_test/manifest.json`
- `hypercube_test/nodes.json`
- `hypercube_test/edges.json`
- `hypercube_test/species.json`

Then refresh the page or click the in-app `Reload Data` button.

## Notes

- The loader is manifest-driven and uses `manifest.generated_files.*`.
- The UI is scaffolded for your portfolio tabs (`NEST`, `ALAN`, `Algorithmic Trading Bot`), with NEST as the default interactive view.
