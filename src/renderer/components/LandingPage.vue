<template>
    <el-container>
        <el-main>
            <el-row>
                <el-col :span="12">
                    <h1>OPS</h1>
                    <h3>
                        <el-button type="primary" @click="listAllUSB">查看所有 USB Port</el-button>
                    </h3>
                    <h3>
                        USB 列表：
                        <el-select v-model="port" placeholder="- 請選擇 -" @change="setUSB">
                            <el-option v-for="(item, index) in ports" :key="index" :label="item.comName" :value="item.comName"/>
                        </el-select>
                    </h3>
                    <h3>
                        <el-button type="success" @click="getState">讀取</el-button>
                        <el-button type="primary" @click="setConfig">寫入設定</el-button>
                        <el-button type="warning" @click="getMap">get MAP</el-button>
                        <el-button v-if="type === 'R74'" type="warning" @click="setMiniMap">set Mini MAP</el-button>
                        <el-button v-if="type === 'R74'" type="danger" @click="flush">flush</el-button>
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
                    <el-form :model="config" :rules="rules" ref="configForm" label-width="100px">
                        <el-form-item label="DCType" prop="dctype">
                            <el-input v-model.number="config.dctype" placeholder="DCType"/>
                        </el-form-item>
                        <el-form-item label="Offset" prop="offset">
                            <el-input v-model.number="config.offset" placeholder="Offset"/>
                        </el-form-item>
                        <el-form-item label="Cylinders" prop="cylinders">
                            <el-input v-model.number="config.cylinders" placeholder="Cylinders"/>
                        </el-form-item>
                        <el-form-item label="TempType" prop="temptype">
                            <el-input v-model.number="config.temptype" placeholder="TempType"/>
                        </el-form-item>
                    </el-form>
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
            maps: Array(7).fill(Array(3).fill(Array(120).fill(0))),
            mapIndex: 0,
            sectionIndex: 0,
            callback: () => {},
            pointer: 0,
            type: '',
            uuid: null,
            rpm: 0,
            temperature: 0,
            sensor1: 0,
            sensor2: 0,
            sensor3: 0,
            sensor4: 0,
            config: {
                dctype: 0,
                offset: 0,
                cylinders: 0,
                temptype: 0
            },
            rules: {
                dctype: [
                    { required: true, type: 'number', min: 0, max: 255, message: 'dctype error', trigger: 'blur' }
                ],
                offset: [
                    { required: true, type: 'number', min: 0, max: 255, message: 'offset error', trigger: 'blur' }
                ],
                cylinders: [
                    { required: true, type: 'number', min: 0, max: 255, message: 'cylinders error', trigger: 'blur' }
                ],
                temptype: [
                    { required: true, type: 'number', min: 0, max: 1, message: 'temptype error', trigger: 'blur' }
                ]
            }
        }
    },
    methods: {
        listAllUSB() {
            this.ports = []
            this.port = null
            this.resetAll()
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
        initSP() {
            this.sp = new SerialPort(this.port, {
                baudRate: 115200,
                lock: false
            })

            // 強制每次通訊的 byte 數爲 24 個
            // const parsers = SerialPort.parsers
            // const parser = this.sp.pipe(new parsers.ByteLength({ length: 8 }))
            // parser.on('data', data => {
            //     this.buffer[this.pointer++] = Buffer.from(data).toString('hex')
            // })

            this.sp.on('open', aaa => {
                console.log('port open!')
                this.getState()
            })
            this.sp.on('error', err => console.log('Error: ' + err.message))
            this.sp.on('data', data => {
                console.log(data)
                // console.log(Buffer.from(data).toString('hex'))
                // this.buffer[this.pointer++] = Array.from(data)
                // this.buffer[this.pointer++] = data
                this.buffer[this.pointer++] = Buffer.from(data).toString('hex')
                setTimeout(() => {
                    this.parserBuffer()
                }, 50)
            })
            this.sp.on('close', () => {
                console.log('port close!')
                this.$message.error('USB 中斷連接')
                this.resetAll()
            })

            return this.sp
        },
        checkSerailPort() {
            if (this.port === null) {
                this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                this.resetAll()
                return false
            }
            return true
        },
        setUSB() {
            this.resetAll()
            if (!this.checkSerailPort()) {
                return false
            }
            this.initSP()
        },
        getState() {
            if (!this.checkSerailPort()) {
                return false
            }
            this.callback = this.cbGetState
            this.sp.write(this.makeCRC([1, 2, 0]))
        },
        cbGetState(result) {
            if (result.length < 1) {
                return false
            }
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
            this.config.dctype = Number(result[11])
            this.config.offset = Number(result[12])
            this.config.cylinders = Number(result[13])
            this.config.temptype = Number(result[14]) // 0~150, 0~1200

            console.log('cb: 111')
        },
        setConfig() {
            if (!this.checkSerailPort()) {
                return false
            }
            this.$refs['configForm'].validate(valid => {
                if (valid) {
                    let a = [
                        44,
                        8,
                        8,
                        this.config.dctype || 0,
                        this.config.offset || 0,
                        this.config.cylinders || 0,
                        this.config.temptype || 0,
                        0,
                        66,
                        66,
                        66
                    ]
                    this.callback = this.getState
                    this.sp.write(this.makeCRC(a))
                }
            })
        },
        getMap() {
            if (!this.checkSerailPort()) {
                return false
            }
            this.callback = this.cbGetMap
            // this.mapIndex = 1
            // let a = parseInt(2 + 3 * this.mapIndex)
            let a = [2, 0, 0]
            this.sp.write(this.makeCRC(a))
            // this.sp.write(this.makeCRC([a + 1, 0, 0]))
            // this.sp.write(this.makeCRC([a + 2, 0, 0]))

            // for (let section = 0; section < 3; section++) {
            //     this.sp.write(this.cmdGetMap(0, section), () => {
            //         // setTimeout(() => {
            //         this.parserBuffer().then(result => {
            //             // this.maps[0][section] = result
            //             console.log(result)
            //         })
            //         // }, 100)
            //     })
            // }
        },
        setMiniMap() {
            if (!this.checkSerailPort()) {
                return false
            }
            this.callback = this.cbGetMap
            // this.mapIndex = 1
            // let a = parseInt(2 + 3 * this.mapIndex)
            let a = [46, 40, 0]
            for (let i = 40; i > 0; i--) {
                a.push(i)
            }
            // for (let i = 1; i < 41; i++) {
            //     a.push(i)
            // }

            this.sp.write(this.makeCRC(a))
        },
        flush() {
            if (!this.checkSerailPort()) {
                return false
            }
            this.callback = this.cbGetMap
            let a = [45, 2, 0]
            this.sp.write(this.makeCRC(a))
        },
        cbGetMap(result) {
            // this.maps[this.mapIndex][this.sectionIndex++] = result
            console.log('cb:222')
        },
        resetAll() {
            this.sp = null
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
            this.config = {
                dctype: 0,
                offset: 0,
                cylinders: 0,
                temptype: 0
            }
        },
        parserBuffer() {
            if (this.buffer.length < 1) {
                return false
            }

            let hex = ''
            let input = []
            for (let i = 0; i < this.pointer; i++) {
                hex += this.buffer[i]
            }

            console.log(hex, hex.length)

            for (let j = 0; j < hex.length; j += 2) {
                input.push(parseInt(hex[j] + hex[j + 1], 16))
            }

            console.log('Before: ', input)

            let check = input[input.length - 1]
            for (let k = 0; k < input.length - 1; k++) {
                input[k] ^= check
            }

            console.log('After: ', input)
            this.pointer = 0
            this.buffer = []
            // return input
            this.callback(input)
        },
        makeCRC(a) {
            console.log('Before CRC:', a)
            let c
            let b = 0
            for (c = parseInt(256 * Math.random()), a.push(c), c = 0; c < a.length; c++) {
                b ^= a[c]
            }

            for (let j = 0; j < a.length; j++) {
                a[j] ^= b
            }

            a.push(b)
            // console.log('After CRC:', a)
            return a
        }
    }
}
</script>
