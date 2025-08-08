module tt_um_vga_example (
    input wire [7:0] ui_in,      // Dedicated inputs
    output wire [7:0] uo_out,    // Dedicated outputs
    input wire [7:0] uio_in,     // IOs: Input path
    output wire [7:0] uio_out,   // IOs: Output path
    output wire [7:0] uio_oe,    // IOs: Enable path (active high: 0=input, 1=output)
    input wire ena,               // always 1 when the design is powered, so you can ignore it
    input wire clk,               // clock
    input wire rst_n              // reset_n - low to reset
);

    // VGA signals
    wire hsync;
    wire vsync;
    wire [1:0] R;
    wire [1:0] G;
    wire [1:0] B;
    wire video_active;
    wire [9:0] pix_x;
    wire [9:0] pix_y;
    wire sound;

    // Assign outputs
    assign uo_out = {hsync, B[0], G[0], R[0], vsync, B[1], G[1], R[1]};
    assign uio_out = 8'b0;
    assign uio_oe = 8'b0;

    // Suppress unused signals warning
    wire _unused_ok = &{ui_in, uio_in, ena};

    // Counter for pattern generation
    reg [9:0] counter;

    // VGA timing generator
    vga_timing vga_timing_inst (
        .clk(clk),
        .rst_n(rst_n),
        .hsync(hsync),
        .vsync(vsync),
        .video_active(video_active),
        .pix_x(pix_x),
        .pix_y(pix_y)
    );

    // Color pattern generator
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            counter <= 10'b0;
        end else begin
            counter <= counter + 1;
        end
    end

    // Generate color stripes pattern
    assign R = (pix_x < 80) ? 2'b11 : 
               (pix_x < 160) ? 2'b10 : 
               (pix_x < 240) ? 2'b01 : 2'b00;
    
    assign G = (pix_x < 80) ? 2'b11 : 
               (pix_x < 160) ? 2'b11 : 
               (pix_x < 240) ? 2'b00 : 2'b00;
    
    assign B = (pix_x < 80) ? 2'b11 : 
               (pix_x < 160) ? 2'b00 : 
               (pix_x < 240) ? 2'b11 : 2'b11;

    // Sound generation (simple beep)
    assign sound = counter[8]; // 256Hz tone

endmodule

// VGA timing module
module vga_timing (
    input wire clk,
    input wire rst_n,
    output reg hsync,
    output reg vsync,
    output reg video_active,
    output reg [9:0] pix_x,
    output reg [9:0] pix_y
);

    // VGA timing constants (640x480 @ 60Hz)
    parameter H_SYNC_PULSE = 96;
    parameter H_BACK_PORCH = 48;
    parameter H_DISPLAY = 640;
    parameter H_FRONT_PORCH = 16;
    parameter H_TOTAL = H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY + H_FRONT_PORCH;
    
    parameter V_SYNC_PULSE = 2;
    parameter V_BACK_PORCH = 33;
    parameter V_DISPLAY = 480;
    parameter V_FRONT_PORCH = 10;
    parameter V_TOTAL = V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY + V_FRONT_PORCH;

    reg [9:0] h_count;
    reg [9:0] v_count;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            h_count <= 10'b0;
            v_count <= 10'b0;
            hsync <= 1'b1;
            vsync <= 1'b1;
            video_active <= 1'b0;
            pix_x <= 10'b0;
            pix_y <= 10'b0;
        end else begin
            // Horizontal counter
            if (h_count == H_TOTAL - 1) begin
                h_count <= 10'b0;
                // Vertical counter
                if (v_count == V_TOTAL - 1) begin
                    v_count <= 10'b0;
                end else begin
                    v_count <= v_count + 1;
                end
            end else begin
                h_count <= h_count + 1;
            end

            // Horizontal sync
            hsync <= (h_count >= H_SYNC_PULSE);

            // Vertical sync
            vsync <= (v_count >= V_SYNC_PULSE);

            // Video active
            video_active <= (h_count >= H_SYNC_PULSE + H_BACK_PORCH) && 
                           (h_count < H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY) &&
                           (v_count >= V_SYNC_PULSE + V_BACK_PORCH) && 
                           (v_count < V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY);

            // Pixel coordinates
            if (video_active) begin
                pix_x <= h_count - (H_SYNC_PULSE + H_BACK_PORCH);
                pix_y <= v_count - (V_SYNC_PULSE + V_BACK_PORCH);
            end else begin
                pix_x <= 10'b0;
                pix_y <= 10'b0;
            end
        end
    end

endmodule 