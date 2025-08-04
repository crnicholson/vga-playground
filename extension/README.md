# VGA Playground VS Code Extension

A VS Code extension for writing and simulating Verilog code that generates VGA signals, with integration for Tiny Tapeout manufacturing.

## Features

- **Verilog Editor**: Full syntax highlighting and language support for Verilog files
- **Real-time VGA Simulation**: Visual preview of your VGA output as you code
- **Example Projects**: Built-in examples to get you started (stripes, checkerboard, etc.)
- **Live Updates**: Simulation updates as you modify your code
- **Tiny Tapeout Integration**: Prepare your designs for physical manufacturing

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the TypeScript:
   ```bash
   npm run compile
   ```
4. Press `F5` to open a new VS Code window with the extension loaded

### From VS Code Marketplace

*(Coming soon)*

## Usage

1. **Open a Verilog file** (`.v` extension)
2. **Open the VGA Simulator**: 
   - Use the command palette (`Ctrl+Shift+P`) and search for "Open VGA Simulator"
   - Or click the "Open VGA Simulator" button in the editor toolbar when viewing a `.v` file
3. **Start simulating**: Click the "Simulate" button in the simulator panel
4. **Try examples**: Use the "Select Example" dropdown to load pre-built examples

## Supported VGA Patterns

The simulator currently supports several common VGA patterns:

- **Stripes**: Colorful vertical stripes based on pixel X coordinate
- **Checkerboard**: Alternating black and white squares
- **Custom patterns**: Write your own Verilog code to generate unique patterns

## File Structure

```
vga-playground/
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── vgaSimulatorPanel.ts  # VGA simulator webview panel
├── media/
│   ├── vgaSimulator.js       # Frontend simulation logic
│   └── vgaSimulator.css      # Simulator styling
├── syntaxes/
│   └── verilog.tmLanguage.json # Verilog syntax highlighting
├── examples/
│   ├── stripes.v             # Stripe pattern example
│   └── checkerboard.v        # Checkerboard pattern example
├── package.json              # Extension manifest
└── tsconfig.json            # TypeScript configuration
```

## Development

### Prerequisites

- Node.js (v16 or higher)
- VS Code (v1.74 or higher)

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

### Testing

Press `F5` in VS Code to launch a new Extension Development Host window with the extension loaded.

### Debugging

1. Set breakpoints in the TypeScript code
2. Press `F5` to start debugging
3. The extension will run in a new VS Code window
4. Debug output appears in the original window's Debug Console

## Example Verilog Code

Here's a simple example that creates vertical stripes:

```verilog
module tt_um_vga_example(
    input  wire [7:0] ui_in,
    output wire [7:0] uo_out,
    input  wire       clk,
    input  wire       rst_n
);

  wire hsync, vsync, video_active;
  wire [9:0] pix_x, pix_y;
  wire [1:0] R, G, B;

  // VGA sync generator
  hvsync_generator hvsync_gen(
    .clk(clk),
    .reset(~rst_n),
    .hsync(hsync),
    .vsync(vsync),
    .display_on(video_active),
    .hpos(pix_x),
    .vpos(pix_y)
  );

  // Generate colorful stripes
  assign R = video_active ? pix_x[4:3] : 2'b00;
  assign G = video_active ? pix_x[6:5] : 2'b00;
  assign B = video_active ? pix_x[8:7] : 2'b00;

  // Output to TinyVGA PMOD
  assign uo_out = {hsync, B[0], G[0], R[0], vsync, B[1], G[1], R[1]};

endmodule
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

## Related Projects

- [VGA Playground Web](https://vga-playground.com/) - The original web-based version
- [Tiny Tapeout](https://tinytapeout.com/) - Platform for manufacturing your designs

## Roadmap

- [ ] Advanced Verilog compilation and simulation
- [ ] Audio output simulation
- [ ] Gamepad input simulation
- [ ] More built-in examples
- [ ] Integration with external simulators (Verilator, etc.)
- [ ] Export to Tiny Tapeout format
- [ ] Real-time collaboration features