# VGA Verilog Simulator - VS Code Extension

A VS Code extension that provides real-time VGA simulation for Verilog projects with live visual output.

## Features

- **Real-time VGA simulation** with 640x480 display output
- **Verilog compilation** using Verilator WebAssembly
- **Live code editing** with automatic recompilation
- **VGA signal visualization** showing RGB output in real-time
- **Example projects** including stripes, bouncing logos, and more
- **Integrated compilation output** with error reporting
- **Performance monitoring** with FPS counter and simulation statistics

## Installation

### Development Setup

1. Clone this repository
2. Navigate to the `vscode-extension` directory
3. Install dependencies:

   ```bash
   npm install
   ```

4. Compile TypeScript:

   ```bash
   npm run compile
   ```

5. Open in VS Code and press F5 to run the extension in a new Extension Development Host window

### Building VSIX Package

```bash
npm install -g vsce
vsce package
```

## Usage

### Quick Start

1. Open a Verilog file (`.v` or `.sv`)
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to start simulation
3. Or use the Command Palette: `VGA: Simulate Current File`

### Commands

- **VGA: Open Simulator** - Opens the VGA simulator panel
- **VGA: Simulate Current File** - Compiles and simulates the current Verilog file
- **VGA: Load VGA Examples** - Loads built-in example projects

### VGA Module Requirements

Your Verilog module should follow the Tiny Tapeout template format:

```verilog
module tt_um_vga_example(
  input  wire [7:0] ui_in,    // Dedicated inputs
  output wire [7:0] uo_out,   // Dedicated outputs
  input  wire [7:0] uio_in,   // IOs: Input path
  output wire [7:0] uio_out,  // IOs: Output path
  output wire [7:0] uio_oe,   // IOs: Enable path
  input  wire       ena,      // always 1 when powered
  input  wire       clk,      // clock
  input  wire       rst_n     // reset_n - low to reset
);

  // VGA signals
  wire hsync, vsync;
  wire [1:0] R, G, B;
  
  // TinyVGA PMOD output format
  assign uo_out = {hsync, B[0], G[0], R[0], vsync, B[1], G[1], R[1]};
  
  // Your VGA generation logic here...
  
endmodule
```

### VGA Timing

The simulator supports standard VGA 640x480@60Hz timing:

- Horizontal: 640 pixels display, 800 total
- Vertical: 480 pixels display, 525 total
- Pixel clock: 25.175 MHz

## Configuration

Available settings in VS Code preferences:

- `vgaSimulator.autoUpdate`: Automatically update simulation when file changes (default: true)
- `vgaSimulator.framerate`: Simulation framerate in FPS (default: 60)

## Examples

The extension includes several example projects:

1. **Stripes** - Animated color stripes
2. **Bouncing Logo** - Logo bouncing around the screen
3. **Conway's Game of Life** - Cellular automaton
4. **Checkers** - Animated checkerboard pattern
5. **And more...**

## Architecture

- **Frontend**: VS Code webview with HTML5 Canvas for display
- **Compilation**: Verilator WebAssembly for Verilog synthesis
- **Simulation**: Real-time HDL simulation with VGA timing
- **Integration**: VS Code API for file management and commands

## Requirements

- VS Code 1.74.0 or higher
- WebAssembly support (available in all modern browsers/VS Code)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the development setup
5. Submit a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Credits

Based on the VGA Playground project by Uri Shaked and the Tiny Tapeout community.
