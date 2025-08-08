"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerilogParser = void 0;
class VerilogParser {
    parseVGASignals(verilogContent) {
        const signals = {
            hsync: false,
            vsync: false,
            red: [],
            green: [],
            blue: [],
            video_active: false,
            pix_x: false,
            pix_y: false,
            sound: false,
            display_on: false,
            hpos: false,
            vpos: false
        };
        // Parse VGA signals from Verilog code
        const lines = verilogContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Look for VGA signal declarations
            if (trimmedLine.includes('wire hsync') || trimmedLine.includes('reg hsync')) {
                signals.hsync = true;
            }
            if (trimmedLine.includes('wire vsync') || trimmedLine.includes('reg vsync')) {
                signals.vsync = true;
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('R')) {
                signals.red = this.extractBitWidth(trimmedLine);
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('G')) {
                signals.green = this.extractBitWidth(trimmedLine);
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('B')) {
                signals.blue = this.extractBitWidth(trimmedLine);
            }
            if (trimmedLine.includes('wire video_active') || trimmedLine.includes('reg video_active')) {
                signals.video_active = true;
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('pix_x')) {
                signals.pix_x = true;
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('pix_y')) {
                signals.pix_y = true;
            }
            if (trimmedLine.includes('wire sound') || trimmedLine.includes('reg sound')) {
                signals.sound = true;
            }
            if (trimmedLine.includes('wire display_on') || trimmedLine.includes('reg display_on')) {
                signals.display_on = true;
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('hpos')) {
                signals.hpos = true;
            }
            if (trimmedLine.includes('wire [') && trimmedLine.includes('vpos')) {
                signals.vpos = true;
            }
        }
        return signals;
    }
    extractBitWidth(line) {
        const match = line.match(/wire\s+\[(\d+):(\d+)\]/);
        if (match) {
            const msb = parseInt(match[1]);
            const lsb = parseInt(match[2]);
            const width = msb - lsb + 1;
            return new Array(width).fill(0);
        }
        return [0, 0]; // Default 2-bit width
    }
    parseModulePorts(verilogContent) {
        const ports = {
            inputs: [],
            outputs: [],
            inouts: []
        };
        let moduleName = '';
        const lines = verilogContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Extract module name
            if (trimmedLine.startsWith('module ')) {
                const match = trimmedLine.match(/module\s+(\w+)/);
                if (match) {
                    moduleName = match[1];
                }
            }
            // Parse input ports
            if (trimmedLine.includes('input wire')) {
                const inputMatch = trimmedLine.match(/input\s+wire\s+\[?(\d+):(\d+)?\]?\s*(\w+)/);
                if (inputMatch) {
                    const width = inputMatch[2] ? parseInt(inputMatch[1]) - parseInt(inputMatch[2]) + 1 : 1;
                    ports.inputs.push({ name: inputMatch[3], width: width });
                }
            }
            // Parse output ports
            if (trimmedLine.includes('output wire')) {
                const outputMatch = trimmedLine.match(/output\s+wire\s+\[?(\d+):(\d+)?\]?\s*(\w+)/);
                if (outputMatch) {
                    const width = outputMatch[2] ? parseInt(outputMatch[1]) - parseInt(outputMatch[2]) + 1 : 1;
                    ports.outputs.push({ name: outputMatch[3], width: width });
                }
            }
        }
        return { moduleName, ports };
    }
    parseVGAAssignments(verilogContent) {
        const assignments = {
            uo_out: '',
            uio_out: '',
            uio_oe: '',
            R: '',
            G: '',
            B: '',
            hsync: '',
            vsync: '',
            video_active: ''
        };
        const lines = verilogContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('assign uo_out')) {
                assignments.uo_out = trimmedLine.replace('assign uo_out =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign uio_out')) {
                assignments.uio_out = trimmedLine.replace('assign uio_out =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign uio_oe')) {
                assignments.uio_oe = trimmedLine.replace('assign uio_oe =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign R')) {
                assignments.R = trimmedLine.replace('assign R =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign G')) {
                assignments.G = trimmedLine.replace('assign G =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign B')) {
                assignments.B = trimmedLine.replace('assign B =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign hsync')) {
                assignments.hsync = trimmedLine.replace('assign hsync =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign vsync')) {
                assignments.vsync = trimmedLine.replace('assign vsync =', '').trim().replace(';', '');
            }
            if (trimmedLine.startsWith('assign video_active')) {
                assignments.video_active = trimmedLine.replace('assign video_active =', '').trim().replace(';', '');
            }
        }
        return assignments;
    }
    parseModuleInstantiations(verilogContent) {
        const instantiations = [];
        const lines = verilogContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Look for module instantiations
            const moduleMatch = trimmedLine.match(/(\w+)\s+(\w+)\s*\(/);
            if (moduleMatch && !trimmedLine.includes('module') && !trimmedLine.includes('endmodule')) {
                const moduleName = moduleMatch[1];
                const instanceName = moduleMatch[2];
                // Find the closing parenthesis and extract connections
                let fullInstantiation = trimmedLine;
                let parenCount = (trimmedLine.match(/\(/g) || []).length - (trimmedLine.match(/\)/g) || []).length;
                // Continue reading lines until we find the closing parenthesis
                const lineIndex = lines.indexOf(line);
                for (let i = lineIndex + 1; i < lines.length && parenCount > 0; i++) {
                    const nextLine = lines[i].trim();
                    fullInstantiation += ' ' + nextLine;
                    parenCount += (nextLine.match(/\(/g) || []).length - (nextLine.match(/\)/g) || []).length;
                }
                instantiations.push({
                    moduleName: moduleName,
                    instanceName: instanceName,
                    fullInstantiation: fullInstantiation
                });
            }
        }
        return instantiations;
    }
    parseAlwaysBlocks(verilogContent) {
        const alwaysBlocks = [];
        const lines = verilogContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('always @')) {
                const sensitivityMatch = trimmedLine.match(/always\s+@\s*\((.+)\)/);
                if (sensitivityMatch) {
                    alwaysBlocks.push({
                        sensitivity: sensitivityMatch[1],
                        body: []
                    });
                }
            }
        }
        return alwaysBlocks;
    }
}
exports.VerilogParser = VerilogParser;
//# sourceMappingURL=verilogParser.js.map