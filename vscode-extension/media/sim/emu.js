"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmuHalt = void 0;
class EmuHalt extends Error {
    constructor(msg, loc) {
        super(msg);
        this.squelchError = true;
        this.$loc = loc;
        Object.setPrototypeOf(this, EmuHalt.prototype);
    }
}
exports.EmuHalt = EmuHalt;
//# sourceMappingURL=emu.js.map