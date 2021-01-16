    /*
    * This is a MakeCode (pxt) extension for the colour sensor type TCS34725 connected to a micro:bit via the i2c bus. 
    * The TCS34725 sensor is assumeed to be part of an Adafruit TCS34725 colour sensor board with inbuilt illumination LED. 
    * Five blocks provide the following data: 
    * red light component, green light component, blue light component, total light intensity and the colour of a M & M confectionery (0-6).
    * The colour component readings are normalised against the total light reading.
    * Interrupts are disabled in the sensor and no provision is made to control the inbuilt white illumination LED. Refer to Adafruit docs and tutorial for more information. 
    * The M & M colour block is used in conjunction with a software controlled M & M colour sorting machine and returns a number between 0 and 6. 
    * 
    */
    
namespace TCS34725 {
    /**
    * TCS34725: Color sensor register address and control bit definitions 
    */
    const TCS34725_ADDRESS: number = 0x29;          // I2C bus address of TCS34725 sensor (0x39 for TCS34721)
    const REG_TCS34725_COMMAND_BIT: number = 0x80;  // Command register access bit
    const REG_TCS34725_ENABLE: number = 0X00;       // Enable register address
    const REG_TCS34725_TIMING: number = 0X01;       // RGBC timing register address
    const REG_TCS34725_WAIT: number = 0x03;         // Wait time register address
    const REG_TCS34725_CONFIG: number = 0x0D;       // Configuration register address
    const REG_TCS34725_CONTROL: number = 0x0F;      // Control register address, sets gain
    const REG_TCS34725_ID: number = 0x12;           // ID register address, should contain 0x44 for TCS34725 or 0x4D for TCS34725
    const REG_TCS34725_STATUS: number = 0x13;       // Status register address
    const REG_CLEAR_CHANNEL_L: number = 0X14;       // Clear data low byte register address
    const REG_RED_CHANNEL_L: number = 0X16;         // Red data low byte register address
    const REG_GREEN_CHANNEL_L: number = 0X18;       // Green data low byte register address
    const REG_BLUE_CHANNEL_L: number = 0X1A;        // Blue data low byte register address
    const TCS34725_AIEN: number = 0X10;             // Enable register RGBC interrupt enable bit, 0 = IRQ not enabled, 1 = IRQ enabled
    const TCS34725_PON: number = 0X01;              // Enable register PON bit, 0 = power off, 1 = power on
    const TCS34725_AEN: number = 0X02;              // Enable register RGBC enable bit, 0 = disable AtoD conversion, 1 = enable AtoD conversion
    const TCS34725_ID: number = 0x44;               // Sensor ID = 0x44 or 68 decimal
    const TCS34729_ID: number = 0x4D;               // Sensor ID = 0x4D or 77 decimal

    /*
    * TSC34725: M and M colour encoding
    */
    const BLANK: number = 0;
    const BROWN: number = 1;
    const RED: number = 2;
    const ORANGE: number = 3;
    const YELLOW: number = 4;
    const GREEN: number = 5;
    const BLUE: number = 6;
    const UNKNOWN: number = 9;                      // Not used, kept for testing purposes

    /*
    * TCS34725: Colour sensor data storage and flag definitions
    */
    let RGBC_C: number = 0;                         // Clear light raw data storage
    let RGBC_R: number = 0;                         // Red light raw data storage
    let RGBC_G: number = 0;                         // Green light raw data storage
    let RGBC_B: number = 0;                         // Blue light raw data storage
    let TCS34725_INIT: number = 0;                  // TSC34725 sensor initialisation flag, 0 = not initialised, 1 = initialised

    /*
    * TCS34725: I2C bus functions: Requires i2c.ts
    */
    function getInt8LE(addr: number, reg: number): number {     // Get 8 bit little-endian integer 
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int8LE);
    }

    function getUInt16LE(addr: number, reg: number): number {   // Get 16 bit little-endian unsigned integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8LE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16LE);
    }

    function getInt16LE(addr: number, reg: number): number {    // Get 16 bit little-endian integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8LE);
        return pins.i2cReadNumber(addr, NumberFormat.Int16LE);
    }

    function readReg(addr: number, reg: number): number {       // Read 8 bit big-endian unsigned integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8LE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8LE);
    }

    function writeReg(addr: number, reg: number, dat: number) { // Write 8 bit little-endian integer
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(addr, buf);
    }

    /**
     * TCS34725: Color Sensor Initialisation
     */
    function tcs34725_begin() {
        let id = readReg(TCS34725_ADDRESS, REG_TCS34725_ID | REG_TCS34725_COMMAND_BIT);                 // Get TCS34725 ID
        if (id === 0x44) {                                                                              // Valid ID?
            writeReg(TCS34725_ADDRESS, REG_TCS34725_TIMING | REG_TCS34725_COMMAND_BIT, 0xEB);           // Yes, Set integration time
            writeReg(TCS34725_ADDRESS, REG_TCS34725_WAIT | REG_TCS34725_COMMAND_BIT, 0xFF);             // Set wait time to 2.4mS 
            writeReg(TCS34725_ADDRESS, REG_TCS34725_CONFIG | REG_TCS34725_COMMAND_BIT, 0x00);           // Set WLONG to 0
            writeReg(TCS34725_ADDRESS, REG_TCS34725_CONTROL | REG_TCS34725_COMMAND_BIT, 0x01);          // Set gain to 4
            writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, TCS34725_PON);   // Power on sensor, disable wait time, disable interrupts 
            basic.pause(3);                                                                             // Need minimum 2.4mS after power on
            writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, TCS34725_PON | TCS34725_AEN);    // Keep power on, enable RGBC ADC
            TCS34725_INIT = 1;                                                                          // Sensor is connected and initialised
        }
        else {                                                                                          // No
            TCS34725_INIT = 0;                                                                          // Sensor is not connected
        }
    }

    /**
     * TCS34725: Color Sensor, read red, green, blue and clear raw data
     */
    function getRGBC() {
        if (!TCS34725_INIT) {                                                                       // Is the TCS32725 sensor initialised?
             tcs34725_begin();                                                                      // No, then initialise the sensor
        }
        let clear = getUInt16LE(TCS34725_ADDRESS, REG_CLEAR_CHANNEL_L | REG_TCS34725_COMMAND_BIT);  // Read natural (clear) light level
        if (clear == 0) {                                                                           // Prevent divide by zero error if sensor in complete darkness 
            clear = 1; 
        }
        RGBC_C = clear;
        RGBC_R = getUInt16LE(TCS34725_ADDRESS, REG_RED_CHANNEL_L | REG_TCS34725_COMMAND_BIT);      // Read red component of clear light
        RGBC_G = getUInt16LE(TCS34725_ADDRESS, REG_GREEN_CHANNEL_L | REG_TCS34725_COMMAND_BIT);    // Read green component of clear light
        RGBC_B = getUInt16LE(TCS34725_ADDRESS, REG_BLUE_CHANNEL_L | REG_TCS34725_COMMAND_BIT);     // Read blue component of clear light

        basic.pause(50);
        let ret = readReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT)        // Get current status of enable register
        ret |= TCS34725_AIEN;                                                                      // Set AEIN bit ?
        writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, ret)            // Re-enable RGBC interrupt ?

    }
    /**
     * TCS34725: mColour - Returns the colour of an M & M
     */
        function mColour(): number {
        let mmColour = UNKNOWN;                                                                     // Start with unknown colour
        if ((RGBC_C < 670) && (RGBC_R > 190) && (RGBC_G < 240) && (RGBC_B < 200)) {                 // Brown M & M?
            mmColour = BROWN;                                                                       // Yes
        }
        else if ((RGBC_C > 700) && (RGBC_R > 300) && (RGBC_G < 260) && (RGBC_B < 220)) {            // Red M & M?
            mmColour = RED;                                                                         // Yes
        }
        else if ((RGBC_C > 1000) && (RGBC_R > 500) && (RGBC_G < 330) && (RGBC_B < 250)) {           // Orange M & M?
            mmColour = ORANGE;                                                                      // Yes
        }
        else if ((RGBC_C > 1300) && (RGBC_R > 600) && (RGBC_G > 480) && (RGBC_B < 290)) {           // Yellow M & M?
            mmColour = YELLOW;                                                                      // Yes
        }
        else if ((RGBC_C > 800) && (RGBC_R < 280) && (RGBC_G > 380) && (RGBC_B < 270)) {            // Green M & M?
            mmColour = GREEN;                                                                       // Yes
        }
        else if ((RGBC_C < 800) && (RGBC_R < 220) && (RGBC_G < 320) && (RGBC_B > 270)) {            // Blue M & M?
            mmColour = BLUE;                                                                        // Yes
        }
        else {
            mmColour = BLANK;                                                                       // Broken, missing, discoloured or chipped M & M
        }
        return mmColour;
    }

    /**
     * TCS34725: getRed - Reporter block that returns the normalised red value from the TCS34725 color sensor
     */
    //% block="red"
    //% weight=60 
    export function getRed(): number {
        getRGBC();                                                      // Get raw light and colour values
        let red = (Math.round(RGBC_R) / Math.round(RGBC_C)) * 255;      // Normalise red value
        return Math.round(red);
    }

    /**
     * TCS34725: getGreen - Reporter block that returns the normalised green value from the TCS34725 color sensor
     */
    //% block="green"
    //% weight=60 
    export function getGreen(): number {
        getRGBC();                                                      // Get raw light and colour values
        let green = (Math.round(RGBC_G) / Math.round(RGBC_C)) * 255;    // Normalise green value
        return Math.round(green);
    }

    /**
     * TCS34725: getBlue - Reporter block that returns the normalised blue value from the TCS34725 color sensor
     */
    //% block="blue"
    //% weight=60 
    export function getBlue(): number {
        getRGBC();                                                      // Get raw light and colour values
        let blue = (Math.round(RGBC_B) / Math.round(RGBC_C)) * 255;     // Normalise blue value
        return Math.round(blue);
    }

    /**
     *  TCS34725: getClear - Reporter block that returns the natural light value from the TCS34725 color sensor
     */
    //% block="clear"
    //% weight=60 
    export function getClear(): number {
        getRGBC();                                                      // Get raw light and colour values
        return Math.round(RGBC_C);                                      // Return clear natural light level
    }

    /**
     * TCS34725: m_mColour - Reporter block that returns the colour of the M and M
     */
    //% block="m & m colour"
    //% weight=60
    export function m_mColour(): number {
        getRGBC();                                                      // Get colour / light information from TSC34725 sensor
        return mColour();                                               // Return colour of M & M
    }
}
