# Centipede

A classic-faithful Centipede clone in a single HTML file. Zero dependencies —
plain HTML5 `<canvas>` and JavaScript with geometric-shape graphics.

## Run

Open `index.html` in any modern browser:

```
xdg-open index.html
```

…or serve the directory and visit it:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Controls

| Key                   | Action       |
| --------------------- | ------------ |
| Arrow keys / `WASD`   | Move         |
| `Space`               | Fire         |
| `P`                   | Pause        |
| `R`                   | Restart (after game over) |

The player can move only in the bottom band of the field.

## Gameplay

- A segmented centipede enters from the top and weaves down the field,
  descending and reversing each time it hits a wall or mushroom.
- Bullets damage mushrooms (4 hits to destroy, 1 point each) and split the
  centipede when they hit a body segment, leaving a fresh mushroom at the
  hit point.
- Scoring: head segment **100**, body segment **10**, mushroom destroyed
  **1**, spider **300 / 600 / 900** (closer = more).
- Clear all centipede segments to advance to the next level — speed
  increases, a few extra mushrooms scatter, damaged mushrooms are restored
  (bonus points).
- Touching the centipede or the spider costs a life. You start with 3.
