<template>
    <el-container>
        <el-main>
            <el-row>
                <el-col :span="12">
                    <h1>OPS</h1>
                    <h3>
                        <el-button type="primary" @click="listUsb">查看所有 USB Port</el-button>
                    </h3>
                    <h3>
                        USB 列表：
                        <el-select v-model="port" placeholder="- 請選擇 -" @change="readUSB">
                            <el-option v-for="(item, index) in ports" :key="index" :label="item.comName" :value="item.comName"/>
                        </el-select>
                    </h3>
                    <h3>
                        <el-button type="success" @click="sendUSB">讀取</el-button>
                        <!-- <el-button type="info" @click="parserBuffer">Parser</el-button> -->
                    </h3>
                </el-col>
                <el-col :span="6">
                    <h3>
                        Type: {{ type }}
                    </h3>
                    <h3>
                        UUID: {{ uuid }}
                    </h3>
                    <h3>
                        RPM: {{ rpm }}
                    </h3>
                    <h3>
                        溫度: {{ temperature }}
                    </h3>
                    <h3>
                        Sensor1: {{ sensor1 }}
                    </h3>
                    <h3>
                        Sensor2: {{ sensor2 }}
                    </h3>
                    <h3>
                        Sensor3: {{ sensor3 }}
                    </h3>
                    <h3>
                        Sensor4: {{ sensor4 }}
                    </h3>
                </el-col>
                <el-col :span="6">
                    <h3>
                        DCTYPE: {{ dctype }}
                    </h3>
                    <h3>
                        Offset: {{ offset }}
                    </h3>
                    <h3>
                        Cylinders: {{ cylinders }}
                    </h3>
                    <h3>
                        TempType: {{ temptype }}
                    </h3>
                </el-col>
            </el-row>
        </el-main>
    </el-container>
</template>

<script>
import SerialPort from 'serialport'

export default {
    name: 'LandingPage',
    components: {},
    data() {
        return {
            sp: null,
            ports: [],
            port: null,
            buffer: [],
            pointer: 0,
            type: '',
            uuid: null,
            rpm: 0,
            temperature: 0,
            sensor1: 0,
            sensor2: 0,
            sensor3: 0,
            sensor4: 0,
            dctype: 0,
            offset: 0,
            cylinders: 0,
            temptype: 0
        }
    },
    methods: {
        initSP() {
            this.sp = new SerialPort(this.port, {
                baudRate: 115200
            })

            // 強制每次通訊的 byte 數爲 24 個
            // const parsers = SerialPort.parsers
            // const parser = this.sp.pipe(new parsers.ByteLength({ length: 8 }))
            // parser.on('data', data => {
            //     this.buffer[this.pointer++] = Buffer.from(data).toString('hex')
            // })

            this.sp.on('open', aaa => {
                console.log('port open!')
            })
            this.sp.on('error', err => console.log(err.message))
            this.sp.on('data', data => {
                console.log(data)
                // console.log(Buffer.from(data).toString('hex'))
                // this.buffer[this.pointer++] = Array.from(data)
                // this.buffer[this.pointer++] = data
                this.buffer[this.pointer++] = Buffer.from(data).toString('hex')
            })
            this.sp.on('close', () => {
                console.log('port close!')
                this.$message.error('USB 中斷連接')
                this.resetAll()
            })
        },

        listUsb() {
            if (this.sp !== null) {
                this.sp.close()
            }
            this.port = null
            SerialPort.list((err, ports) => {
                if (err) {
                    console.log(err)
                }

                this.ports = ports.filter(val => {
                    // return /usb/.test(val.comName)
                    return true
                })

                if (this.ports.length < 1) {
                    this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                } else {
                    this.$message.success(`找到 ${this.ports.length} 個 USB 裝置`)
                }
            })
        },
        readUSB() {
            if (this.port === null) {
                this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                this.resetAll()
                return false
            }

            console.log(this.port)
            this.initSP()
        },
        sendUSB() {
            if (this.sp === null) {
                this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                this.resetAll()
                return false
            }
            this.sp.write(this.readRPM())
            setTimeout(() => {
                this.parserBuffer().then(result => {
                    this.buffer = []
                    this.pointer = 0
                    // console.log('parsered')
                    // console.log(result)
                    this.type = result[15] ? 'R74' : 'X74'

                    if (this.type === 'X74') {
                        let uuid1 = result
                            .slice(16, 21)
                            .map(v => String.fromCharCode(v))
                            .join('')
                        let uuid2 = Number(result[21] * 256) + Number(result[22])
                        this.uuid = uuid1 + uuid2
                    }

                    this.rpm = Number(result[3]) + Number(result[4] * 256)

                    this.temperature = Number(result[9]) + Number(result[10] * 256)
                    this.sensor1 = Number(result[5])
                    this.sensor2 = Number(result[6])
                    this.sensor3 = Number(result[7])
                    this.sensor4 = Number(result[8])
                    this.dctype = Number(result[11])
                    this.offset = Number(result[12])
                    this.cylinders = Number(result[13])
                    this.temptype = Number(result[14])
                })
            }, 500)
        },
        resetAll() {
            this.sp = null
            this.ports = []
            this.port = null
            this.buffer = []
            this.pointer = 0
            this.type = ''
            this.uuid = null
            this.rpm = 0
            this.temperature = 0
            this.sensor1 = 0
            this.sensor2 = 0
            this.sensor3 = 0
            this.sensor4 = 0
            this.dctype = 0
            this.offset = 0
            this.cylinders = 0
            this.temptype = 0
        },
        async parserBuffer() {
            // this.content = this.buffer[this.pointer - 1]
            let hex = ''
            let input = []
            for (let i = 0; i < this.pointer; i++) {
                hex += this.buffer[i]
            }

            console.log(hex, hex.length)

            for (let j = 0; j < hex.length; j += 2) {
                input.push(parseInt(hex[j] + hex[j + 1], 16))
            }

            console.log(input)

            let check = input[input.length - 1]
            for (let k = 0; k < input.length - 1; k++) {
                input[k] ^= check
            }

            // for (b = 0; b < input.length - 1; b++) {
            //     a = input[b] < 16 ? a + ('0x0' + input[b].toString(16) + ' ') : a + ('0x' + input[b].toString(16) + ' ')
            // }
            // for (b = c = 0; b < input.length - 1; b++) {
            //     c ^= input[b]
            // }

            console.log(input)
            return input
        },
        async parserResult() {},
        readRPM() {
            let a = [1, 2, 0]
            return this.makeCRC(a)
        },
        makeCRC(a) {
            // console.log(a)
            let c
            let b = 0
            for (c = parseInt(256 * Math.random()), a.push(c), c = 0; c < a.length; c++) {
                b ^= a[c]
            }

            for (let j = 0; j < a.length; j++) {
                a[j] ^= b
            }

            a.push(b)
            // console.log(a)
            return a
        }
        // getUSB() {
        //     this.sp.open()
        //     this.sp.flush()
        //     let ret = this.sp.read()
        //     console.log(ret, this.sp.get())
        // },
        // timer() {
        //     if (this.timerCount > 0) {
        //         this.timerCount--
        //     }

        //     if (this.timerCount === 1) {
        //         if (this.pointer !== 0) {
        //             let tmp = ''
        //             for (let i = 0; i < this.pointer; i++) {
        //                 tmp += this.buffer[i].toString('hex')
        //             }

        //             let ans = this.parseHexString(tmp)
        //             console.log('Got Data: ')
        //             for (let i = 0; i < ans.length; i++) {
        //                 console.log(ans[i])
        //             }
        //         }
        //         this.pointer = 0
        //     }

        //     this.t++

        //     if (this.timerCount === 0 && this.t % 100 === 0) {
        //         let out = new Array(20)
        //         for (let i = 0; i < 20; i++) {
        //             out[i] = i + 0x30
        //         }

        //         this.PortWrite(out)
        //         this.t = 0
        //         // delete out
        //     }
        //     setTimeout(this.timer, this.timerInterval)
        // },
        // PortWrite(data) {
        //     // console.log('Write: '+data);
        //     this.sp.write(data, function(err) {
        //         if (err) {
        //             console.log('Error on write: ', err.message)
        //         }
        //         // console.log('message written');
        //     })
        // },
        // parseHexString(str) {
        //     var result = []
        //     while (str.length >= 2) {
        //         result.push(parseInt(str.substring(0, 2), 16))
        //         str = str.substring(2, str.length)
        //     }

        //     return result
        // }
    }
}
</script>
