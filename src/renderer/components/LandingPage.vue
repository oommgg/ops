<template>
    <el-container>
        <el-main>
            <el-row>
                <el-col :span="24">
                    <h1>OPS</h1>
                    <h3>
                        <el-button type="primary" @click="listUsb">查看所有 USB</el-button>
                    </h3>
                    <h3>
                        USB 列表：
                        <el-select v-model="port" placeholder="- 請選擇 -" @change="readUSB">
                            <el-option v-for="(item, index) in ports" :key="index" :label="item.comName" :value="item.comName"/>
                        </el-select>
                    </h3>
                    <h3>
                        <el-button type="success" @click="sendUSB">Send</el-button>
                        <el-button type="info" @click="getUSB">Read</el-button>
                    </h3>
                    <pre>{{ content }}</pre>
                </el-col>
            </el-row>
        </el-main>
    </el-container>
</template>

<script>
import SerialPort from 'serialport'
// import { dialog } from 'electron'

export default {
    name: 'LandingPage',
    components: {},
    data() {
        return {
            sp: null,
            ports: [],
            port: null,
            content: [],
            buffer: new Array(256),
            timerCount: 0,
            timerInterval: 10,
            pointer: 0,
            t: 0
        }
    },
    methods: {
        // open(link) {
        //     this.$electron.shell.openExternal(link)
        // }
        initSP() {
            this.sp = new SerialPort(this.port, {
                baudRate: 115200
            })

            // const parsers = SerialPort.parsers
            // let parser = new parsers.Readline({
            //     // delimiter: '\r\n'
            // })
            // this.sp.pipe(parser)

            this.sp.on('open', aaa => {
                console.log('port open!')
                this.PortWrite('port open!')
            })
            this.sp.on('error', err => console.log(err.message))
            this.sp.on('data', data => {
                console.log(data)
                this.content.push(data)
                this.timerCount = 5
                this.buffer[this.pointer++] = data
            })
            this.sp.on('close', () => console.log('port close'))
            // this.sp.write('ROBOT PLEASE RESPOND\n')
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
                    // console.log(this.$electron)
                    this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                } else {
                    this.$message.success(`找到 ${this.ports.length} 個 USB 裝置`)
                }
            })
        },
        readUSB() {
            if (this.port === null) {
                this.$electron.remote.dialog.showErrorBox('找不到 USB 連線', '請先確認 USB 連線')
                return false
            }

            console.log(this.port)

            // let sp = new SerialPort(this.port, {
            //     baudRate: 115200
            // })
            this.initSP()

            // this.sp.read(8196)

            setTimeout(this.timer, this.timerInterval)

            // console.log(parser, this.sp)
        },
        sendUSB() {
            let ret = this.sp.write('blah blah!')
            console.log(ret)
        },
        getUSB() {
            this.sp.open()
            this.sp.flush()
            let ret = this.sp.read()
            console.log(ret, this.sp.get())
        },
        timer() {
            if (this.timerCount > 0) {
                this.timerCount--
            }

            if (this.timerCount === 1) {
                if (this.pointer !== 0) {
                    let tmp = ''
                    for (let i = 0; i < this.pointer; i++) {
                        tmp += this.buffer[i].toString('hex')
                    }

                    let ans = this.parseHexString(tmp)
                    console.log('Got Data: ')
                    for (let i = 0; i < ans.length; i++) {
                        console.log(ans[i])
                    }
                }
                this.pointer = 0
            }

            this.t++

            if (this.timerCount === 0 && this.t % 100 === 0) {
                let out = new Array(20)
                for (let i = 0; i < 20; i++) {
                    out[i] = i + 0x30
                }

                this.PortWrite(out)
                this.t = 0
                // delete out
            }
            setTimeout(this.timer, this.timerInterval)
        },
        PortWrite(data) {
            // console.log('Write: '+data);
            this.sp.write(data, function(err) {
                if (err) {
                    console.log('Error on write: ', err.message)
                }
                // console.log('message written');
            })
        },
        parseHexString(str) {
            var result = []
            while (str.length >= 2) {
                result.push(parseInt(str.substring(0, 2), 16))
                str = str.substring(2, str.length)
            }

            return result
        }
    }
}
</script>
