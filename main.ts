namespace TCS34725 {
    /**
    * TCS34725: Color sensor register address and control bit definitions 
    */
    const TCS34725_ADDRESS: number = 0x29;          // I2C bus address of TCS34725 sensor
    const REG_TCS34725_ID: number = 0x12;           // ID register address, should contain 0x44 for TSC34725 or 0x4D for TSC34727
    const REG_TCS34725_COMMAND_BIT: number = 0x80;  // Command register access bit
    const REG_TCS34725_ENABLE: number = 0X00;       // Enable register address
    const REG_TCS34725_ATIME: number = 0X01;        // Integration time register address
    const REG_TCS34725_GAIN: number = 0x0F;         // Configuration register address, sets gain
    const REG_CLEAR_CHANNEL_L: number = 0X14;       // Clear data low byte register address
    const REG_RED_CHANNEL_L: number = 0X16;         // Red data low byte register address
    const REG_GREEN_CHANNEL_L: number = 0X18;       // Green data low byte register address
    const REG_BLUE_CHANNEL_L: number = 0X1A;        // Blue data low byte register address
    const TCS34725_ENABLE_AIEN: number = 0X10;      // Enable register RGBC interrupt enable bit, 0 = IRQ not enabled, 1 = IRQ enabled
    const TCS34275_POWER_ON: number = 0X01;         // Enable register PON bit, 0 = power off, 1 = power on
    const TCS34725_ENABLE_AEN: number = 0X02;       // Enable register RGBC enable bit, 0 = disable AtoD conversion, 1 = enable AtoD conversion

    /*
    * TSC34725: Colour sensor data storage and flag definitions
    */
    const BLANK: number = 0;
    const BROWN: number = 1;
    const RED: number = 2;
    const ORANGE: number = 3;
    const YELLOW: number = 4;
    const GREEN: number = 5;
    const BLUE: number = 6;
    const UNKNOWN: number = 9;
    
    let RGBC_C: number = 0;                         // Clear light raw data storage
    let RGBC_R: number = 0;                         // Red light raw data storage
    let RGBC_G: number = 0;                         // Green light raw data storage
    let RGBC_B: number = 0;                         // Blue light raw data storage
    let TCS34725_BEGIN: number = 0;                 // TSC34725 sensor initialisation flag, 0 = not started, 1 = started (initialised)

    /*
    * I2C bus functions: Requires i2c.ts
    */
    function getInt8LE(addr: number, reg: number): number {     // Get 8 bit little-endian integer 
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int8LE);
    }

    function getUInt16LE(addr: number, reg: number): number {   // Get 16 bit little-endian unsigned integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16LE);
    }

    function getInt16LE(addr: number, reg: number): number {    // Get 16 bit little-endian integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int16LE);
    }

    function readReg(addr: number, reg: number): number {       // Read 8 bit big-endian unsigned integer
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    }

    function writeReg(addr: number, reg: number, dat: number) { // Write 8 bit little-endian integer
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(addr, buf)
    }

    /**
     * TCS34725: Color Sensor Initialisation
     */
    function tcs34725_begin(): boolean {
        TCS34725_BEGIN = 0;
        let id = readReg(TCS34725_ADDRESS, REG_TCS34725_ID | REG_TCS34725_COMMAND_BIT);             // Get TCS34725 ID
        if ((id != 0x44) && (id != 0x10)) return false;                                             // Valid ID?
        TCS34725_BEGIN = 1;                                                                         // Sensor is connected
        writeReg(TCS34725_ADDRESS, REG_TCS34725_ATIME | REG_TCS34725_COMMAND_BIT, 0xEB);            // Set integration time
        writeReg(TCS34725_ADDRESS, REG_TCS34725_GAIN | REG_TCS34725_COMMAND_BIT, 0x01);             // Set gain
        writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, 0x01);           // Power on sensor
        basic.pause(3);                                                                             // Need minimum 2.4mS after power on
        writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, 0x01 | 0x02);    // Keep power on, enable RGBC
        return true;
    }

    /**
     * TCS34725: Color Sensor, read red, green, blue and clear raw data
     */
    function getRGBC() {
        /*
        if (!TCS34725_BEGIN) tcs34725_begin();                                                     // Initialise sensor if not already

        RGBC_C = getUInt16LE(TCS34725_ADDRESS, REG_CLEAR_CHANNEL_L | REG_TCS34725_COMMAND_BIT);    // Read natural (clear) light level
        RGBC_R = getUInt16LE(TCS34725_ADDRESS, REG_RED_CHANNEL_L | REG_TCS34725_COMMAND_BIT);      // Read red component of clear light
        RGBC_G = getUInt16LE(TCS34725_ADDRESS, REG_GREEN_CHANNEL_L | REG_TCS34725_COMMAND_BIT);    // Read green component of clear light
        RGBC_B = getUInt16LE(TCS34725_ADDRESS, REG_BLUE_CHANNEL_L | REG_TCS34725_COMMAND_BIT);     // Read blue component of clear light

        basic.pause(50);
        let ret = readReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT)        // Get current status of enable register
        ret |= TCS34725_ENABLE_AIEN;
        writeReg(TCS34725_ADDRESS, REG_TCS34725_ENABLE | REG_TCS34725_COMMAND_BIT, ret)            // Enable RGBC interrupt ?
        */
        RGBC_C = 1000;
        RGBC_R = 500;
        RGBC_G = 300;
        RGBC_B = 200;
    }
    /**
     * TCS34725: Color Sensor, returns the colour of an M & M
     */
        function mColour(): number {
        let mmColour = UNKNOWN;                                                                     // Start with unknown colour
        if ((RGBC_C > 700) && (RGBC_R > 230) && (RGBC_G < 320) && (RGBC_B < 260)) {                 // Brown M & M?
            mmColour = BROWN;                                                                       // Yes
        }
        else if ((RGBC_C > 950) && (RGBC_R > 450) && (RGBC_G < 320) && (RGBC_B < 300)) {            // Red M & M?
            mmColour = RED;                                                                         // Yes
        }
        else if ((RGBC_C > 1300) && (RGBC_R > 700) && (RGBC_G < 500) && (RGBC_B < 400)) {           // Orange M & M?
            mmColour = ORANGE;                                                                      // Yes
        }
        else if ((RGBC_C > 1600) && (RGBC_R > 700) && (RGBC_G > 600) && (RGBC_B < 450)) {           // Yellow M & M?
            mmColour = YELLOW;                                                                      // Yes
        }
        else if ((RGBC_C > 1100) && (RGBC_R < 450) && (RGBC_G > 500) && (RGBC_B < 400)) {           // Green M & M?
            mmColour = GREEN;                                                                       // Yes
        }
        else if ((RGBC_C < 1900) && (RGBC_R < 350) && (RGBC_G < 450) && (RGBC_B > 380)) {           // Blue M & M?
            mmColour = BLUE;                                                                        // Yes
        }
        else {
            mmColour = BLANK;                                                                       // Broken, missing, discoloured or chipped M & M
        }
        return mmColour;
    }

    /**
     * Get the normalised red value from the TCS34725 color sensor
     */
    //% block="red"
    //% weight=60 
    export function getRed(): number {
        getRGBC();                                                      // Get raw light and colour values
        let red = (Math.round(RGBC_R) / Math.round(RGBC_C)) * 255;      // Normalise red value
        return Math.round(red);
    }

    /**
     * Get the normalised green value from the TCS34725 color sensor
     */
    //% block="green"
    //% weight=60 
    export function getGreen(): number {
        getRGBC();                                                      // Get raw light and colour values
        let green = (Math.round(RGBC_G) / Math.round(RGBC_C)) * 255;    // Normalise green value
        return Math.round(green);
    }

    /**
     * Get the normalised blue value from the TCS34725 color sensor
     */
    //% block="blue"
    //% weight=60 
    export function getBlue(): number {
        getRGBC();                                                      // Get raw light and colour values
        let blue = (Math.round(RGBC_B) / Math.round(RGBC_C)) * 255;     // Normalise blue value
        return Math.round(blue)
    }

    /**
     *  Get the natural light value from the TCS34725 color sensor
     */
    //% block="clear"
    //% weight=60 
    export function getC(): number {
        getRGBC();                                                      // Get raw light and colour values
        return Math.round(RGBC_C);                                      // Return clear natural light level
    }

    /**
     * Get M & M colour
     */
    //% block="m & m colour"
    //% weight=60
    export function m_mColour(): number {
        getRGBC();                                                      // Get colour / light information from TSC34725 sensor
        return mColour();                                               // Return colour of M & M
    }
}
