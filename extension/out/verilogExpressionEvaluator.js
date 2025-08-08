"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerilogExpressionEvaluator = void 0;
class VerilogExpressionEvaluator {
    constructor(signals, state) {
        this.signals = signals;
        this.state = state;
    }
    evaluateExpression(expression) {
        // Remove extra whitespace
        expression = expression.trim();
        // Handle concatenation {a, b, c}
        const concatMatch = expression.match(/^\{([^}]+)\}$/);
        if (concatMatch) {
            return this.evaluateConcatenation(concatMatch[1]);
        }
        // Handle ternary operators a ? b : c
        const ternaryMatch = expression.match(/^(.+)\s*\?\s*(.+)\s*:\s*(.+)$/);
        if (ternaryMatch) {
            const condition = this.evaluateExpression(ternaryMatch[1]);
            const trueValue = this.evaluateExpression(ternaryMatch[2]);
            const falseValue = this.evaluateExpression(ternaryMatch[3]);
            return condition ? trueValue : falseValue;
        }
        // Handle comparisons
        if (expression.includes('<')) {
            const [left, right] = expression.split('<');
            const leftVal = this.evaluateExpression(left.trim());
            const rightVal = this.evaluateExpression(right.trim());
            return leftVal < rightVal ? 1 : 0;
        }
        if (expression.includes('>')) {
            const [left, right] = expression.split('>');
            const leftVal = this.evaluateExpression(left.trim());
            const rightVal = this.evaluateExpression(right.trim());
            return leftVal > rightVal ? 1 : 0;
        }
        if (expression.includes('==')) {
            const [left, right] = expression.split('==');
            const leftVal = this.evaluateExpression(left.trim());
            const rightVal = this.evaluateExpression(right.trim());
            return leftVal === rightVal ? 1 : 0;
        }
        // Handle arithmetic
        if (expression.includes('+')) {
            const [left, right] = expression.split('+');
            return this.evaluateExpression(left.trim()) + this.evaluateExpression(right.trim());
        }
        if (expression.includes('-')) {
            const [left, right] = expression.split('-');
            return this.evaluateExpression(left.trim()) - this.evaluateExpression(right.trim());
        }
        // Handle bitwise operations
        if (expression.includes('&')) {
            const [left, right] = expression.split('&');
            return this.evaluateExpression(left.trim()) & this.evaluateExpression(right.trim());
        }
        if (expression.includes('|')) {
            const [left, right] = expression.split('|');
            return this.evaluateExpression(left.trim()) | this.evaluateExpression(right.trim());
        }
        // Handle signal references with bit selection
        const signalMatch = expression.match(/^(\w+)\[(\d+)\]$/);
        if (signalMatch) {
            const signalName = signalMatch[1];
            const bitIndex = parseInt(signalMatch[2]);
            return this.getSignalBit(signalName, bitIndex);
        }
        // Handle signal references without bit selection
        const simpleSignalMatch = expression.match(/^(\w+)$/);
        if (simpleSignalMatch) {
            const signalName = simpleSignalMatch[1];
            return this.getSignalValue(signalName);
        }
        // Handle binary constants (e.g., 2'b11)
        const binaryMatch = expression.match(/^(\d+)'b([01]+)$/);
        if (binaryMatch) {
            const width = parseInt(binaryMatch[1]);
            const value = parseInt(binaryMatch[2], 2);
            return value;
        }
        // Handle decimal constants
        const decimalMatch = expression.match(/^(\d+)$/);
        if (decimalMatch) {
            return parseInt(decimalMatch[1]);
        }
        // Handle hex constants (e.g., 8'hFF)
        const hexMatch = expression.match(/^(\d+)'h([0-9A-Fa-f]+)$/);
        if (hexMatch) {
            const width = parseInt(hexMatch[1]);
            const value = parseInt(hexMatch[2], 16);
            return value;
        }
        return 0;
    }
    evaluateConcatenation(concatExpr) {
        const parts = concatExpr.split(',').map(part => part.trim());
        let result = 0;
        let bitPosition = 0;
        for (const part of parts) {
            const value = this.evaluateExpression(part);
            result |= (value << bitPosition);
            bitPosition += this.getBitWidth(part);
        }
        return result;
    }
    getBitWidth(expression) {
        // For simple signals, try to get their width
        const signalMatch = expression.match(/^(\w+)$/);
        if (signalMatch) {
            const signalName = signalMatch[1];
            const signal = this.signals.get(signalName);
            if (signal && Array.isArray(signal)) {
                return signal.length;
            }
        }
        // For bit selections, return 1
        const bitMatch = expression.match(/^(\w+)\[(\d+)\]$/);
        if (bitMatch) {
            return 1;
        }
        // For constants, try to determine width
        const constMatch = expression.match(/^(\d+)'[bh]?([0-9A-Fa-f]+)$/);
        if (constMatch) {
            return parseInt(constMatch[1]);
        }
        return 1; // Default to 1 bit
    }
    getSignalBit(signalName, bitIndex) {
        // Check if it's a state variable
        if (signalName === 'pix_x' && this.state.pix_x !== undefined) {
            return (this.state.pix_x >> bitIndex) & 1;
        }
        if (signalName === 'pix_y' && this.state.pix_y !== undefined) {
            return (this.state.pix_y >> bitIndex) & 1;
        }
        if (signalName === 'moving_x' && this.state.moving_x !== undefined) {
            return (this.state.moving_x >> bitIndex) & 1;
        }
        // Check if it's a signal
        const signal = this.signals.get(signalName);
        if (signal && Array.isArray(signal) && signal[bitIndex] !== undefined) {
            return signal[bitIndex];
        }
        return 0;
    }
    getSignalValue(signalName) {
        // Check if it's a state variable
        if (signalName === 'pix_x' && this.state.pix_x !== undefined) {
            return this.state.pix_x;
        }
        if (signalName === 'pix_y' && this.state.pix_y !== undefined) {
            return this.state.pix_y;
        }
        if (signalName === 'moving_x' && this.state.moving_x !== undefined) {
            return this.state.moving_x;
        }
        if (signalName === 'video_active' && this.state.video_active !== undefined) {
            return this.state.video_active ? 1 : 0;
        }
        // Check if it's a signal
        const signal = this.signals.get(signalName);
        if (signal && Array.isArray(signal)) {
            // Convert array to number
            let value = 0;
            for (let i = 0; i < signal.length; i++) {
                value |= (signal[i] << i);
            }
            return value;
        }
        return 0;
    }
}
exports.VerilogExpressionEvaluator = VerilogExpressionEvaluator;
//# sourceMappingURL=verilogExpressionEvaluator.js.map