import { VerilogExpressionEvaluator } from './verilogExpressionEvaluator';

export interface VGASignal {
    hsync: boolean;
    vsync: boolean;
    red: number[];
    green: number[];
    blue: number[];
    video_active: boolean;
    pix_x: number;
    pix_y: number;
    sound: boolean;
}

export interface VGAFrame {
    width: number;
    height: number;
    pixels: Uint8ClampedArray; // RGBA data
    frameNumber: number;
    clockCount: number;
}

export interface SimulationState {
    clock: number;
    frame: number;
    h_count: number;
    v_count: number;
    hsync: boolean;
    vsync: boolean;
    video_active: boolean;
    pix_x: number;
    pix_y: number;
    red: number[];
    green: number[];
    blue: number[];
    sound: boolean;
    counter: number;
    moving_x: number;
}

export class VerilogSimulator {
    private state: SimulationState;
    private modules: Map<string, any>;
    private signals: Map<string, any>;
    private assignments: Map<string, string>;
    private alwaysBlocks: any[];
    private clockRate: number = 25_000_000; // 25MHz clock
    private frameTime: number = 1 / 60; // 60Hz refresh rate
    private evaluator: VerilogExpressionEvaluator;

    constructor() {
        this.state = {
            clock: 0,
            frame: 0,
            h_count: 0,
            v_count: 0,
            hsync: true,
            vsync: true,
            video_active: false,
            pix_x: 0,
            pix_y: 0,
            red: [0, 0],
            green: [0, 0],
            blue: [0, 0],
            sound: false,
            counter: 0,
            moving_x: 0
        };
        this.modules = new Map();
        this.signals = new Map();
        this.assignments = new Map();
        this.alwaysBlocks = [];
        this.evaluator = new VerilogExpressionEvaluator(this.signals, this.state);
    }

    compile(verilogContent: string): boolean {
        try {
            this.parseVerilog(verilogContent);
            return true;
        } catch (error) {
            console.error('Verilog compilation failed:', error);
            return false;
        }
    }

    private parseVerilog(code: string): void {
        const lines = code.split('\n');
        let currentModule = '';
        let inModule = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Parse module declaration
            if (trimmedLine.startsWith('module ')) {
                const match = trimmedLine.match(/module\s+(\w+)/);
                if (match) {
                    currentModule = match[1];
                    inModule = true;
                    this.modules.set(currentModule, {});
                }
            }

            // Parse signal declarations
            if (inModule) {
                this.parseSignalDeclarations(trimmedLine);
                this.parseAssignments(trimmedLine);
                this.parseAlwaysBlocks(trimmedLine);
                this.parseWireDeclarations(trimmedLine);
            }

            if (trimmedLine === 'endmodule') {
                inModule = false;
            }
        }
    }

    private parseSignalDeclarations(line: string): void {
        // Parse wire declarations
        const wireMatch = line.match(/wire\s+\[?(\d+):(\d+)?\]?\s*(\w+)/);
        if (wireMatch) {
            const name = wireMatch[3];
            const msb = parseInt(wireMatch[1]);
            const lsb = wireMatch[2] ? parseInt(wireMatch[2]) : 0;
            const width = msb - lsb + 1;
            this.signals.set(name, new Array(width).fill(0));
        }

        // Parse reg declarations
        const regMatch = line.match(/reg\s+\[?(\d+):(\d+)?\]?\s*(\w+)/);
        if (regMatch) {
            const name = regMatch[3];
            const msb = parseInt(regMatch[1]);
            const lsb = regMatch[2] ? parseInt(regMatch[2]) : 0;
            const width = msb - lsb + 1;
            this.signals.set(name, new Array(width).fill(0));
        }
    }

    private parseWireDeclarations(line: string): void {
        // Handle simple wire declarations like "wire hsync;"
        const simpleWireMatch = line.match(/wire\s+(\w+);/);
        if (simpleWireMatch) {
            const name = simpleWireMatch[1];
            this.signals.set(name, [0]); // Single bit wire
        }
    }

    private parseAssignments(line: string): void {
        const assignMatch = line.match(/assign\s+(\w+)\s*=\s*(.+);/);
        if (assignMatch) {
            const signal = assignMatch[1];
            const expression = assignMatch[2];
            this.assignments.set(signal, expression);
        }
    }

    private parseAlwaysBlocks(line: string): void {
        const alwaysMatch = line.match(/always\s+@\s*\((.+)\)/);
        if (alwaysMatch) {
            this.alwaysBlocks.push({
                sensitivity: alwaysMatch[1],
                body: []
            });
        }
    }

    simulate(clockCycles: number): VGASignal {
        for (let i = 0; i < clockCycles; i++) {
            this.state.clock++;
            this.updateVGATiming();
            this.evaluateAssignments();
            this.evaluateAlwaysBlocks();
        }

        return {
            hsync: this.state.hsync,
            vsync: this.state.vsync,
            red: this.state.red,
            green: this.state.green,
            blue: this.state.blue,
            video_active: this.state.video_active,
            pix_x: this.state.pix_x,
            pix_y: this.state.pix_y,
            sound: this.state.sound
        };
    }

    generateFrame(): VGAFrame {
        const width = 640;
        const height = 480;
        const pixels = new Uint8ClampedArray(width * height * 4); // RGBA
        
        // Generate complete frame by simulating all pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Set pixel position
                this.state.pix_x = x;
                this.state.pix_y = y;
                this.state.moving_x = x + this.state.counter;
                
                // Update video_active based on position
                this.state.video_active = true; // Always active for frame generation
                
                // Evaluate assignments for this pixel
                this.evaluateAssignments();
                
                // Get color values
                const r = this.state.red[0] * 255;
                const g = this.state.green[0] * 255;
                const b = this.state.blue[0] * 255;
                
                // Set pixel in array
                const index = (y * width + x) * 4;
                pixels[index] = r;     // Red
                pixels[index + 1] = g; // Green
                pixels[index + 2] = b; // Blue
                pixels[index + 3] = 255; // Alpha
            }
        }
        
        return {
            width: width,
            height: height,
            pixels: pixels,
            frameNumber: this.state.frame,
            clockCount: this.state.clock
        };
    }

    private updateVGATiming(): void {
        // VGA timing constants (640x480 @ 60Hz)
        const H_SYNC_PULSE = 96;
        const H_BACK_PORCH = 48;
        const H_DISPLAY = 640;
        const H_FRONT_PORCH = 16;
        const H_TOTAL = H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY + H_FRONT_PORCH;
        
        const V_SYNC_PULSE = 2;
        const V_BACK_PORCH = 33;
        const V_DISPLAY = 480;
        const V_FRONT_PORCH = 10;
        const V_TOTAL = V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY + V_FRONT_PORCH;

        // Update horizontal counter
        if (this.state.h_count === H_TOTAL - 1) {
            this.state.h_count = 0;
            // Update vertical counter
            if (this.state.v_count === V_TOTAL - 1) {
                this.state.v_count = 0;
                this.state.frame++;
            } else {
                this.state.v_count++;
            }
        } else {
            this.state.h_count++;
        }

        // Update sync signals
        this.state.hsync = this.state.h_count >= H_SYNC_PULSE;
        this.state.vsync = this.state.v_count >= V_SYNC_PULSE;

        // Update video active
        this.state.video_active = 
            this.state.h_count >= H_SYNC_PULSE + H_BACK_PORCH &&
            this.state.h_count < H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY &&
            this.state.v_count >= V_SYNC_PULSE + V_BACK_PORCH &&
            this.state.v_count < V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY;

        // Update pixel coordinates
        if (this.state.video_active) {
            this.state.pix_x = this.state.h_count - (H_SYNC_PULSE + H_BACK_PORCH);
            this.state.pix_y = this.state.v_count - (V_SYNC_PULSE + V_BACK_PORCH);
        } else {
            this.state.pix_x = 0;
            this.state.pix_y = 0;
        }

        // Update moving_x for the user's code
        this.state.moving_x = this.state.pix_x + this.state.counter;
    }

    private evaluateAssignments(): void {
        for (const [signal, expression] of this.assignments) {
            try {
                const value = this.evaluator.evaluateExpression(expression);
                if (signal === 'R') {
                    this.state.red = this.parseColorValue(value);
                } else if (signal === 'G') {
                    this.state.green = this.parseColorValue(value);
                } else if (signal === 'B') {
                    this.state.blue = this.parseColorValue(value);
                } else if (signal === 'sound') {
                    this.state.sound = Boolean(value);
                } else if (signal === 'hsync') {
                    this.state.hsync = Boolean(value);
                } else if (signal === 'vsync') {
                    this.state.vsync = Boolean(value);
                } else if (signal === 'video_active') {
                    this.state.video_active = Boolean(value);
                }
            } catch (error) {
                console.error(`Error evaluating assignment for ${signal}:`, error);
            }
        }
    }

    private parseColorValue(value: number): number[] {
        // Convert numeric value to 2-bit color array
        return [
            (value >> 1) & 1,
            value & 1
        ];
    }

    private evaluateAlwaysBlocks(): void {
        // Evaluate always blocks based on sensitivity list
        for (const block of this.alwaysBlocks) {
            if (this.shouldTriggerAlwaysBlock(block.sensitivity)) {
                this.executeAlwaysBlock(block);
            }
        }
    }

    private shouldTriggerAlwaysBlock(sensitivity: string): boolean {
        // Check for vsync edge trigger (for the user's counter logic)
        if (sensitivity.includes('posedge vsync')) {
            return this.state.vsync && !this.state.vsync; // Simplified edge detection
        }
        // Simplified sensitivity check
        return sensitivity.includes('posedge clk') || sensitivity.includes('negedge rst_n');
    }

    private executeAlwaysBlock(block: any): void {
        // Execute always block logic
        // This is a simplified implementation for the user's counter logic
        if (this.signals.has('counter')) {
            const counter = this.signals.get('counter');
            if (counter) {
                // Increment counter (simplified)
                this.state.counter = (this.state.counter + 1) % 1024; // 10-bit counter
            }
        }
    }

    getSimulationState(): SimulationState {
        return { ...this.state };
    }

    reset(): void {
        this.state = {
            clock: 0,
            frame: 0,
            h_count: 0,
            v_count: 0,
            hsync: true,
            vsync: true,
            video_active: false,
            pix_x: 0,
            pix_y: 0,
            red: [0, 0],
            green: [0, 0],
            blue: [0, 0],
            sound: false,
            counter: 0,
            moving_x: 0
        };
        this.signals.clear();
        this.assignments.clear();
        this.alwaysBlocks = [];
        this.evaluator = new VerilogExpressionEvaluator(this.signals, this.state);
    }
} 