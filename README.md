# LCD Matrix Studio

A professional-grade, web-based bitmap editor designed specifically for embedded developers working with monochrome LCD/OLED displays (SSD1306, SH1106, Nokia 5110, etc.).

## Features

### 🎨 Visual Editor
*   **Tools**: Pen, Eraser, and Selection Box.
*   **Floating Layers**: Select, Cut, Copy, and Paste regions. Move selections effortlessly before committing them to the grid.
*   **Drag & Drop**: Import existing images (PNG, JPG, BMP, SVG) directly onto the canvas.
*   **Zoom & Grid**: High-precision editing with configurable zoom and pixel grid.
*   **Color Profiles**: Simulate different display backlights (Cyan, Green, Blue, White, Yellow).

### 💻 Code Generation & Import
*   **Real-time Export**: Generates C-style `PROGMEM` arrays instantly as you draw.
*   **Two-Way Editing**: Paste an existing C array into the "Import" tab to visualize and edit it.
*   **Format Support**:
    *   **Scan Modes**: Horizontal Raster (CRT style) and Vertical Page (SSD1306 style).
    *   **Byte Order**: MSB First and LSB First.
    *   **Dimensions**: Custom width/height with presets for common modules (128x64, 84x48, etc.).

### 🛠 Workflow
*   **History**: Full Undo/Redo stack.
*   **Clipboard**: Internal clipboard for copying pixel data between different areas.
*   **Keyboard Shortcuts**:
    *   `Ctrl+Z` / `Ctrl+Y`: Undo / Redo
    *   `Ctrl+C` / `Ctrl+V` / `Ctrl+X`: Copy / Paste / Cut
    *   `Shift + Drag`: Lift selection (Cut & Move)
    *   `Enter`: Commit selection/paste
    *   `Esc`: Cancel selection/paste

## Differentiators

Unlike generic pixel art tools, **LCD Matrix Studio** is built for hardware interfacing:

1.  **Vertical Page Addressing**: Most generic tools export raster (row-by-row) data. This tool natively supports the "Vertical Page" addressing mode used by SSD1306 and similar OLED controllers, saving you from writing complex runtime conversion logic on your microcontroller.
2.  **Code Import**: It's not just an image-to-code converter; it's a code-to-image converter too. You can recover lost assets from source code.
3.  **Floating Selections**: Advanced editing capabilities often found only in desktop image editors, allowing for complex composition of UI elements.

## Tech Stack
*   React 19
*   TypeScript
*   Tailwind CSS
*   Lucide React Icons

## License
MIT