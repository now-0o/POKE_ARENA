# Pixel arena UI assets

`stadium.png` was generated specifically for this game using the built-in `image_gen` tool (not the fallback CLI). All other PNGs in this folder are original, deterministic pixel assets authored by `scripts/make-ui-assets.py`. The sprite animation assets remain the credited PMDCollab originals under `../sprites/`.

The runtime uses the real PNG assets for the stadium, nine-slice panel frames, buttons, selection cursor, trainer and robot sprites, platforms, logo, VS badge, balls, and type icons. CSS handles responsive layout, image scaling, and animation. Galmuri's local WOFF2 files and license are in `public/fonts/`.

## Final stadium generation prompt

Use case: stylized-concept. Create a PRODUCTION GAME BACKGROUND ASSET, not a UI mockup. A wide 16:9 panoramic arena stadium in authentic Nintendo DS era Pokémon pixel art, very carefully composed for a 2D Pokémon fighting-game character-select screen. True crisp, deliberate square-pixel sprite-art shapes and limited palettes; viewed from spectator eye height, gentle elevated perspective over the arena. A lovely bright sky at the top, enormous teal blue stadium seating stands with tiny multicolour pixel spectators, large left and right striped canopy towers, pastel mountain silhouettes far back. Center the composition on a large grassy and sandstone battle arena in lower center with a subtle red-and-ivory round ball crest embedded in the arena floor. Cream sandstone walls, cobalt/teal roof tiles, red accent banners, lush green plants and trimmed shrubs. Warm late-afternoon light. The lower half arena floor should be relatively simple and quiet to support UI overlays; the upper left and upper right background can be richly detailed. Do not put any Pokemon or other characters in the foreground. No human figures other than tiny abstract spectator pixels. NO TEXT, NO WORDS, NO LOGOS, NO USER INTERFACE, NO PANELS, NO BUTTONS, NO TYPOGRAPHY. High quality richly detailed pixel environment asset, clear pixel grid, hard edges, no anti-aliased digital painting, no 3D rendering. Landscape aspect ratio.

## Screens and controls

- Trainer login: original account authentication and token storage.
- Training lobby: private bot room creation, trainer/CPU VS display.
- Character select: ten sprite tiles, a large animated preview, hidden CPU team, and three member slots.
- Use arrow keys to move the preview, Z to add, and X to remove the highlighted Pokémon. Mouse/touch and native keyboard tab navigation are supported.
- Selected reserves can become the lead using the `선발로` button. Team commands use the existing server protocol.
- Team ready: both three-member teams revealed; edit or leave remains available. Actual combat is still outside this prototype's scope.

## Validation

Production Vite build, server rendering of all five UI states (login, create, lobby, select, ready), ten-tile roster / lead controls, PNG integrity, WOFF2 headers, CSS asset references, and retained API/auth/proxy files checked. Browser layout and live signed-in interactions were not tested in the tool environment.
