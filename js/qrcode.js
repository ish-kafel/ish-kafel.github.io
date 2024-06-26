/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 * 
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */
var QRCode;
var maxLen = 0;
var lowMax = Infinity;
(function() {
  //---------------------------------------------------------------------
  // QRCode for JavaScript
  //
  // Copyright (c) 2009 Kazuhiko Arase
  //
  // URL: http://www.d-project.com/
  //
  // Licensed under the MIT license:
  //   http://www.opensource.org/licenses/mit-license.php
  //
  // The word "QR Code" is registered trademark of 
  // DENSO WAVE INCORPORATED
  //   http://www.denso-wave.com/qrcode/faqpatent-e.html
  //
  //---------------------------------------------------------------------
  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE
    this.data = data
    this.parsedData = []
    var SMP = false

    //转 UTF-8
    for (var i = 0, l = this.data.length; i < l; i++) {
      var byteArray = []
      var code = this.data.codePointAt(i) //支持辅助平面文字(SMP)(大于U+FFFF)
      var utf8 = false

      if (SMP) { //SMP字符用codePointAt产生两部分，取第一部分为Unicode值
        SMP = !SMP
        continue
      } else if (code >= 0x10000) {
        SMP = !SMP
        byteArray[0] = code >>> 18 & 0x7 | 0xF0 //运算顺序 >>>,&,|
        byteArray[1] = code >>> 12 & 0x3F | 0x80
        byteArray[2] = code >>> 6 & 0x3F | 0x80
        byteArray[3] = code & 0x3F | 0x80
      } else if (code > 0x800) {
        byteArray[0] = code >>> 12 & 0xF | 0xE0
        byteArray[1] = code >>> 6 & 0x3F | 0x80
        byteArray[2] = code & 0x3F | 0x80
      } else if (code > 0x80) {
        if (!utf8) utf8 = !utf8
        byteArray[0] = code >>> 6 & 0x1F | 0xC0
        byteArray[1] = code & 0x3F | 0x80
      } else {
        byteArray[0] = code
      }

      this.parsedData.push(byteArray)
    }

    //数据降维合并
    this.parsedData = Array.prototype.concat.apply([], this.parsedData)

    //如果有0x80以上的字符，加bom头
    if (utf8) {
      this.parsedData.unshift(239, 187, 191)
    }
  }

  //添加QR8bitByte原型方法:读取长度与写入
  QR8bitByte.prototype = {
    getLength: function(buffer) { //返回位流长度
      return this.parsedData.length
    },
    write: function(buffer) {
      for (var i = 0, l = this.parsedData.length; i < l; i++) {
        buffer.put(this.parsedData[i], 8)
      }
    }
  }

  //添加版本号和纠错等级
  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber
    this.errorCorrectLevel = errorCorrectLevel
    this.modules = null
    this.moduleCount = 0
    this.dataCache = null
    this.dataList = []
  }

  QRCodeModel.prototype = {
    addData: function(data) {
      var newData = new QR8bitByte(data)
      this.dataList.push(newData)
      this.dataCache = null
    },
    isDark: function(row, col) { //返回某个位置数据
      if (row < 0 || this.moduleCount <= row ||
        col < 0 || this.moduleCount <= col) {
        return undefined //throw new Error(row + ',' + col)
      }
      return this.modules[row][col]
    },
    getModuleCount: function() {
      return this.moduleCount
    },
    make: function() { //最终掩膜
      this.makeImpl(false, this.getBestMaskPattern())
    },
    makeImpl: function(test, maskPattern) { //测试掩膜及应用
      this.moduleCount = this.typeNumber * 4 + 17
      this.modules = new Array(this.moduleCount)
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount)
        for (var col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null
        }
      }
      //左上、右上和左下设置三个位置探测图形
      this.setupPositionProbePattern(0, 0)
      this.setupPositionProbePattern(this.moduleCount - 7, 0)
      this.setupPositionProbePattern(0, this.moduleCount - 7)
      this.setupPositionAdjustPattern()
      this.setupTimingPattern()
      this.setupTypeInfo(test, maskPattern)
      if (this.typeNumber >= 7) {
        this.setupTypeNumber(test)
      }
      if (this.dataCache == null) {
        this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)
      }
      this.mapData(this.dataCache, maskPattern)
    },
    //设置位置探测图形，给出图形左上角位置
    setupPositionProbePattern: function(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) {
          continue
        }
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) {
            continue
          }
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
            (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true
          } else {
            this.modules[row + r][col + c] = false
          }
        }
      }
    },
    //获取最低分掩膜图案
    getBestMaskPattern: function() {
      var minLostPoint = 0
      var pattern = 0
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i)
        var lostPoint = QRUtil.getLostPoint(this)
        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint
          pattern = i //pattern应该是i
        }
      }
      return pattern
    },
    createMovieClip: function(target_mc, instance_name, depth) {
      var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth)
      var cs = 1
      this.make()
      for (var row = 0; row < this.modules.length; row++) {
        var y = row * cs
        for (var col = 0; col < this.modules[row].length; col++) {
          var x = col * cs
          var dark = this.modules[row][col]
          if (dark) {
            qr_mc.beginFill(0, 100)
            qr_mc.moveTo(x, y)
            qr_mc.lineTo(x + cs, y)
            qr_mc.lineTo(x + cs, y + cs)
            qr_mc.lineTo(x, y + cs)
            qr_mc.endFill()
          }
        }
      }
      return qr_mc
    },
    //设置定位图形
    setupTimingPattern: function() {
      for (var rAc = 8; rAc < this.moduleCount - 8; rAc++) {
        this.modules[rAc][6] = rAc % 2 == 0
        this.modules[6][rAc] = rAc % 2 == 0
      }
    },
    //设置校正图形
    setupPositionAdjustPattern: function() {
      var pos = QRUtil.getPatternPosition(this.typeNumber)
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i]
          var col = pos[j]
          if (this.modules[row][col] != null) {
            continue
          }
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 ||
                c == -2 || c == 2 ||
                (r == 0 && c == 0)) {
                this.modules[row + r][col + c] = true
              } else {
                this.modules[row + r][col + c] = false
              }
            }
          }
        }
      }
    },
    //设置版本号
    setupTypeNumber: function(test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber)
      for (var i = 0; i < 18; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1)
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod
      }
      for (i = 0; i < 18; i++) {
        mod = (!test && ((bits >> i) & 1) == 1)
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod
      }
    },
    //设置版本信息 BCH(15,5)
    setupTypeInfo: function(test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern
      var bits = QRUtil.getBCHTypeInfo(data)
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1)
        if (i < 6) {
          this.modules[i][8] = mod
        } else if (i < 8) {
          this.modules[i + 1][8] = mod
        } else {
          this.modules[this.moduleCount - 15 + i][8] = mod
        }
      }
      for (i = 0; i < 15; i++) {
        mod = (!test && ((bits >> i) & 1) == 1)
        if (i < 8) {
          this.modules[8][this.moduleCount - i - 1] = mod
        } else if (i < 9) {
          this.modules[8][15 - i - 1 + 1] = mod
        } else {
          this.modules[8][15 - i - 1] = mod
        }
      }
      this.modules[this.moduleCount - 8][8] = (!test)
    },
    mapData: function(data, maskPattern) {
      var inc = -1
      var row = this.moduleCount - 1
      var bitIndex = 7
      var byteIndex = 0
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false
              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1)
              }
              var mask = QRUtil.getMask(maskPattern, row, col - c)
              if (mask) {
                dark = !dark
              }
              this.modules[row][col - c] = dark
              bitIndex--
              if (bitIndex == -1) {
                byteIndex++
                bitIndex = 7
              }
            }
          }
          row += inc
          if (row < 0 || this.moduleCount <= row) {
            row -= inc
            inc = -inc
            break
          }
        }
      }
    }
  }

  QRCodeModel.PAD0 = 0xEC
  QRCodeModel.PAD1 = 0x11
  QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel)
    var buffer = new QRBitBuffer()
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i]
      buffer.put(data.mode, 4)
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber))
      data.write(buffer)
    }
    var totalDataCount = 0
    for (i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount
    }
    /*
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('code length overflow. (' + buffer.getLengthInBits() + '>' + totalDataCount * 10 + ')')
    }
    */
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4)
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false)
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCodeModel.PAD0, 8)
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCodeModel.PAD1, 8)
    }
    return QRCodeModel.createBytes(buffer, rsBlocks)
  }

  QRCodeModel.createBytes = function(buffer, rsBlocks) {
    var offset = 0
    var maxDcCount = 0
    var maxEcCount = 0
    var dcdata = new Array(rsBlocks.length)
    var ecdata = new Array(rsBlocks.length)
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount
      var ecCount = rsBlocks[r].totalCount - dcCount
      maxDcCount = Math.max(maxDcCount, dcCount)
      maxEcCount = Math.max(maxEcCount, ecCount)
      dcdata[r] = new Array(dcCount)
      for (var i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset]
      }
      offset += dcCount
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount)
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1)
      var modPoly = rawPoly.mod(rsPoly)
      ecdata[r] = new Array(rsPoly.getLength() - 1)
      for (i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0
      }
    }
    var totalCodeCount = 0
    for (i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount
    }
    var data = new Array(totalCodeCount)
    var index = 0
    for (i = 0; i < maxDcCount; i++) {
      for (r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i]
        }
      }
    }
    for (i = 0; i < maxEcCount; i++) {
      for (r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i]
        }
      }
    }
    return data
  }

  var QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  }

  var QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  }

  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  }

  var QRUtil = {
    PATTERN_POSITION_TABLE: [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ],
    G15: 0b10100110111,
    G18: 0b1111100100101,
    G15_MASK: 0b101010000010010,
    getBCHTypeInfo: function(data) {
      var d = data << 10
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)))
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK
    },
    getBCHTypeNumber: function(data) {
      var d = data << 12
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)))
      }
      return (data << 12) | d
    },
    getBCHDigit: function(data) {
      var digit = 0
      while (data != 0) {
        digit++
        data >>>= 1
      }
      return digit
    },
    getPatternPosition: function(typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1]
    },
    getMask: function(maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i + j) % 2 == 0
        case QRMaskPattern.PATTERN001:
          return i % 2 == 0
        case QRMaskPattern.PATTERN010:
          return j % 3 == 0
        case QRMaskPattern.PATTERN011:
          return (i + j) % 3 == 0
        case QRMaskPattern.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0
        case QRMaskPattern.PATTERN101:
          return (i * j) % 2 + (i * j) % 3 == 0
        case QRMaskPattern.PATTERN110:
          return ((i * j) % 2 + (i * j) % 3) % 2 == 0
        case QRMaskPattern.PATTERN111:
          return ((i * j) % 3 + (i + j) % 2) % 2 == 0
        default:
          throw new Error('bad maskPattern:' + maskPattern)
      }
    },
    getErrorCorrectPolynomial: function(errorCorrectLength) {
      var a = new QRPolynomial([1], 0)
      for (var i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0))
      }
      return a
    },
    getLengthInBits: function(mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 10
          case QRMode.MODE_ALPHA_NUM:
            return 9
          case QRMode.MODE_8BIT_BYTE:
            return 8
          case QRMode.MODE_KANJI:
            return 8
          default:
            throw new Error('mode:' + mode)
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 12
          case QRMode.MODE_ALPHA_NUM:
            return 11
          case QRMode.MODE_8BIT_BYTE:
            return 16
          case QRMode.MODE_KANJI:
            return 10
          default:
            throw new Error('mode:' + mode)
        }
      } else if (type < 41) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 14
          case QRMode.MODE_ALPHA_NUM:
            return 13
          case QRMode.MODE_8BIT_BYTE:
            return 16
          case QRMode.MODE_KANJI:
            return 12
          default:
            throw new Error('mode:' + mode)
        }
      } else {
        throw new Error('type:' + type)
      }
    },
    getLostPoint: function(qrCode) {
      let moduleCount = qrCode.getModuleCount()
      let lostPoint = 0
      let darkCount = 0
      for (let row = 0; row < moduleCount; row++) {
        let rowhead = qrCode.isDark(row, 0)
        let colhead = qrCode.isDark(0, row)
        let rowcount = 0
        let colcount = 0
        for (let col = 0; col < moduleCount; col++) {
          //sameCount
          let dark = qrCode.isDark(row, col)
          let dark01 = qrCode.isDark(row, col + 1)
          let dark10 = qrCode.isDark(row + 1, col)
          if (dark == rowhead) {
            rowcount++
          } else {
            rowcount = 1
            rowhead = dark
          }
          if (rowcount >= 5) lostPoint += rowcount === 5 ? 3 : 1
          if (qrCode.isDark(col, row) == colhead) {
            colcount++
          } else {
            colcount = 1
            colhead = qrCode.isDark(col, row)
          }
          if (colcount >= 5) lostPoint += colcount === 5 ? 3 : 1
          //2x2 count
          if (row < moduleCount - 1 && col < moduleCount - 1) {
            let count = 0
            if (dark) count++
            if (dark01) count++
            if (dark10) count++
            if (qrCode.isDark(row + 1, col + 1)) count++
            if (count == 0 || count == 4) {
              lostPoint += 3
            }
          }
          //row pattern count
          if (col < moduleCount - 6) {
            if (dark &&
              !dark01 &&
              qrCode.isDark(row, col + 2) &&
              qrCode.isDark(row, col + 3) &&
              qrCode.isDark(row, col + 4) &&
              !qrCode.isDark(row, col + 5) &&
              qrCode.isDark(row, col + 6)) {
              lostPoint += 40
            }
          }
          //col pattern count
          if (row < moduleCount - 6) {
            if (dark &&
              !dark10 &&
              qrCode.isDark(row + 2, col) &&
              qrCode.isDark(row + 3, col) &&
              qrCode.isDark(row + 4, col) &&
              !qrCode.isDark(row + 5, col) &&
              qrCode.isDark(row + 6, col)) {
              lostPoint += 40
            }
          }
          //dark count
          if (dark) {
            darkCount++
          }
        }
      }
      lostPoint += Math.abs(100 * darkCount / moduleCount / moduleCount - 50) * 2
      return lostPoint
    }
  }

  var QRMath = {
    glog: function(n) {
      if (n < 1) {
        throw new Error('glog(' + n + ')')
      }
      return QRMath.LOG_TABLE[n]
    },
    gexp: function(n) {
      while (n < 0) {
        n += 255
      }
      while (n >= 256) {
        n -= 255
      }
      return QRMath.EXP_TABLE[n]
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  }

  for (var i = 0; i < 8; i++) {
    QRMath.EXP_TABLE[i] = 1 << i
  }

  for (i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8]
  }

  for (i = 0; i < 255; i++) {
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i
  }

  function QRPolynomial(num, shift) {
    if (num.length == undefined) {
      throw new Error(num.length + '/' + shift)
    }
    var offset = 0
    while (offset < num.length && num[offset] == 0) {
      offset++
    }
    this.num = new Array(num.length - offset + shift)
    for (var i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset]
    }
  }

  QRPolynomial.prototype = {
    get: function(index) {
      return this.num[index]
    },
    getLength: function() {
      return this.num.length
    },
    multiply: function(e) {
      var num = new Array(this.getLength() + e.getLength() - 1)
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)))
        }
      }
      return new QRPolynomial(num, 0)
    },
    mod: function(e) {
      if (this.getLength() - e.getLength() < 0) {
        return this
      }
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
      var num = new Array(this.getLength())
      for (var i = 0; i < this.getLength(); i++) {
        num[i] = this.get(i)
      }
      for (i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
      }
      return new QRPolynomial(num, 0).mod(e)
    }
  }

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount
    this.dataCount = dataCount
  }

  QRRSBlock.RS_BLOCK_TABLE = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],

    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],

    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],

    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],

    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],

    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],

    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],

    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],

    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],

    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],

    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],

    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],

    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],

    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],

    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],

    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],

    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],

    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],

    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],

    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],

    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],

    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],

    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],

    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],

    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],

    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],

    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],

    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],

    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],

    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],

    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],

    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],

    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],

    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],

    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],

    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],

    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],

    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],

    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],

    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ]

  QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel)
    if (rsBlock == undefined) {
      throw new Error('bad rs block @ typeNumber:' + typeNumber + '/errorCorrectLevel:' + errorCorrectLevel)
    }
    var length = rsBlock.length / 3
    var list = []
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0]
      var totalCount = rsBlock[i * 3 + 1]
      var dataCount = rsBlock[i * 3 + 2]
      for (var j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount))
      }
    }
    return list
  }

  QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0]
      case QRErrorCorrectLevel.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1]
      case QRErrorCorrectLevel.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2]
      case QRErrorCorrectLevel.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3]
      default:
        return undefined
    }
  }

  function QRBitBuffer() {
    this.buffer = []
    this.length = 0
  }

  QRBitBuffer.prototype = {
    get: function(index) {
      var bufIndex = Math.floor(index / 8)
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1
    },
    put: function(num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) == 1)
      }
    },
    getLengthInBits: function() {
      return this.length
    },
    putBit: function(bit) {
      var bufIndex = Math.floor(this.length / 8)
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0)
      }
      if (bit) {
        this.buffer[bufIndex] |= 0x80 >>> (this.length % 8)
      }
      this.length++
    }
  }

  var QRCodeLimitLength = [
    [17, 14, 11, 7],
    [32, 26, 20, 14],
    [53, 42, 32, 24],
    [78, 62, 46, 34],
    [106, 84, 60, 44],
    [134, 106, 74, 58],
    [154, 122, 86, 64],
    [192, 152, 108, 84],
    [230, 180, 130, 98],
    [271, 213, 151, 119],
    [321, 251, 177, 137],
    [367, 287, 203, 155],
    [425, 331, 241, 177],
    [458, 362, 258, 194],
    [520, 412, 292, 220],
    [586, 450, 322, 250],
    [644, 504, 364, 280],
    [718, 560, 394, 310],
    [792, 624, 442, 338],
    [858, 666, 482, 382],
    [929, 711, 509, 403],
    [1003, 779, 565, 439],
    [1091, 857, 611, 461],
    [1171, 911, 661, 511],
    [1273, 997, 715, 535],
    [1367, 1059, 751, 593],
    [1465, 1125, 805, 625],
    [1528, 1190, 868, 658],
    [1628, 1264, 908, 698],
    [1732, 1370, 982, 742],
    [1840, 1452, 1030, 790],
    [1952, 1538, 1112, 842],
    [2068, 1628, 1168, 898],
    [2188, 1722, 1228, 958],
    [2303, 1809, 1283, 983],
    [2431, 1911, 1351, 1051],
    [2563, 1989, 1423, 1093],
    [2699, 2099, 1499, 1139],
    [2809, 2213, 1579, 1219],
    [2953, 2331, 1663, 1273]
  ]

  // android 2.x doesn't support Data-URI spec
  function _getAndroid() {
    var android = false
    var sAgent = navigator.userAgent

    if (/android/i.test(sAgent)) { // android
      android = true
      var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i)

      if (aMat && aMat[1]) {
        android = parseFloat(aMat[1])
      }
    }

    return android
  }

  var svgDrawer = (function() {

    var Drawing = function(el, htOption) {
      this._el = el
      this._htOption = htOption
    }

    Drawing.prototype.draw = function(oQRCode) {
      var _htOption = this._htOption
      var _el = this._el
      var nCount = oQRCode.getModuleCount()
      let wid = _htOption.width
      let hei = _htOption.height
      var nWidth = Math.floor(wid / nCount)
      var nHeight = Math.floor(hei / nCount)
      this.clear()

      function makeSVG(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag)
        const m = new Map([['stda', 'stroke-dasharray'], ['stdo', 'stroke-dashoffset'], ['stlc', 'stroke-linecap'], ['stlj', 'stroke-linejoin'], ['stml', 'stroke-miterlimit'], ['sto', 'stroke-opacity'], ['stw', 'stroke-width']])
        for (var k in attrs)
          if (attrs.hasOwnProperty(k)) el.setAttribute(m.get(k) ?? k, attrs[k])
        return el
      }
      var svg = makeSVG('svg', {
        viewBox: `0 0 ${nCount} ${nCount}`,
        width: wid,
        height: hei,
        fill: _htOption.colorLight
      })
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg')
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink')
      _el.appendChild(svg)

      svg.appendChild(makeSVG('rect', {
        fill: _htOption.colorLight,
        width: '100%',
        height: '100%'
      }))

      if (_htOption.pathCombine) {
        let coordArr = []
        let cornerMap = new Map()
        for (var col = 0; col <= nCount; col++) {
          let rowArr = []
          for (var row = 0; row <= nCount; row++) {
            let n = 0
            oQRCode.isDark(col, row) && n++;
            oQRCode.isDark(col - 1, row) && n++;
            oQRCode.isDark(col, row - 1) && n++;
            oQRCode.isDark(col - 1, row - 1) && n++;
            if (n % 2) {
              cornerMap.set(String([row, col]), n)
            }
            if (n === 2 && oQRCode.isDark(col, row) === oQRCode.isDark(col - 1, row - 1)) {
              rowArr.push("x")
            } else {
              rowArr.push(n)
            }
          }
          coordArr.push(rowArr)
        }
        let pathStr = '',
          cornerArr = [],
          key = ''
        let turnRight
        let directArr = ['h', 'v', 'h-', 'v-']
        let cornerIter = cornerMap.entries()
        let x, y, thisLen = 0,
          thisMax = 0
        while (cornerMap.size) {
          cornerArr = cornerIter.next().value
          key = cornerArr[0];
          [x, y] = key.split(',')
          x = +x
          y = +y
          let direct = 0
          let straight = 1
          turnRight = coordArr[y][x]
          pathStr += `M${x} ${y}h`
          x++
          cornerMap.delete(key)
          while (true) {
            let state = coordArr[y][x]
            if (state == 2) {
              straight++
            } else if (state == 'x') {
              turnRight = 4 - turnRight //过交叉点转向方向改变
              straight++
            } else if (state == 1 || state == 3) {
              pathStr += straight
              if (cornerMap.has('' + x + ',' + y)) {
                if (state == turnRight) {
                  ++direct
                  direct > 3 && (direct = 0)
                } else {
                  --direct
                  direct < 0 && (direct = 3)
                }
                thisLen += straight
                pathStr += directArr[direct]
                cornerMap.delete('' + x + ',' + y)
                straight = 1
              } else {
                thisLen += straight
                if (thisLen > maxLen) maxLen = thisLen
                if (thisLen > thisMax) thisMax = thisLen
                thisLen = 0
                pathStr += 'z'
                break
              }
            }
            switch (direct) {
              case 0:
                x++
                break;
              case 1:
                y++
                break;
              case 2:
                x--
                break;
              case 3:
                y--;
                break;
              default:
                throw new Error('Invalid direct.')
            }
          }
        }
        if (_htOption.animeSVG) {
          let path = makeSVG('path', {
            style: `stroke:#000;fill-rule:evenodd;fill:#000;fill-opacity:0;`,
            'stroke-width': 0.1,
            'stroke-dasharray': thisMax,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            d: pathStr
          })
          path.appendChild(makeSVG('animate', {
            id: 'dash',
            attributeName: 'stroke-dashoffset',
            attributeType: 'CSS',
            begin: '0s',
            dur: thisMax * 0.018 + 's',
            from: thisMax,
            to: 0,
            fill: 'freeze'
          }))
          path.appendChild(makeSVG('animate', {
            attributeName: 'fill-opacity',
            attributeType: 'CSS',
            begin: 'dash.end',
            dur: '1s',
            from: 0,
            to: 1,
            fill: 'freeze'
          }))
          path.appendChild(makeSVG('animate', {
            attributeName: 'stroke-width',
            attributeType: 'CSS',
            begin: 'dash.end',
            dur: '1s',
            to: 0,
            fill: 'freeze'
          }))
          svg.appendChild(path)
        } else if (_htOption.anime1SVG) {
          let patharr = []
          let pathStri = pathStr.split(/(?<=z)(?=M)/)
          let l = pathStri.length - 1
          for (let i = 0; i < pathStri.length; i++) {
            let path = makeSVG('path', {
              style: `fill-rule:evenodd;fill:#fff;fill-opacity:0;mix-blend-mode:difference`,
              stroke: '#fff',
              stw: 0.1,
              stlj: 'round',
              stlc: 'round',
              d: pathStri[i]
            })
            let len = path.getTotalLength()
            path.setAttribute('stroke-dasharray', len)
            path.setAttribute('stroke-dashoffset', len)
            patharr.push([path, len])
          }
          patharr.sort((b, a) => a[1] - b[1])
          patharr.forEach((path, i) => {
            path[0].appendChild(makeSVG('animate', {
              id: 'dash' + i,
              attributeName: 'stroke-dashoffset',
              attributeType: 'CSS',
              begin: (i == 0) ? '0s' : 'dash' + (i - 1) + '.end',
              dur: path[1] * 0.007 + 's',
              from: path[1],
              to: 0,
              fill: 'freeze'
            }))
            path[0].appendChild(makeSVG('animate', {
              attributeName: 'fill-opacity',
              begin: 'dash' + i + '.end',
              dur: '0.5s',
              from: 0,
              to: 1,
              fill: 'freeze'
            }))
            path[0].appendChild(makeSVG('animate', {
              attributeName: 'stroke-width',
              begin: 'dash' + i + '.end',
              dur: '0.5s',
              to: 0,
              fill: 'freeze'
            }))
            svg.appendChild(path[0])
          })
        } else if (_htOption.spreadSVG || _htOption.spread1SVG) {
          let pathStri = pathStr.split(/(?<=z)(?=M)/)
          let parr = pathStri.map(d => makeSVG('path', { style: 'fill-rule:evenodd;fill:fff;mix-blend-mode:difference', d }))
          let tmpdl = []
          parr.forEach(e => {
            tmpdl.push([e.getAttribute('d'), e.getTotalLength()])
            e.setAttribute('d', '')
          })
          tmpdl.sort((a, b) => b[1] - a[1])
          parr.forEach((e, ii) => {
            let [endp, plen] = tmpdl[ii]
            endp = endp.replace(/([hv]-?)(\d+)/g, function(sub, g1, g2) {
              return (g1 + 1).repeat(g2)
            })
            let end = endp.split(/(?<=\d)(?=[vhz])/g)
            end.pop()
            let h = [],
              v = [],
              hm = [],
              vm = [],
              vd = [],
              hd = [],
              vv = [],
              hh = []
            end.forEach((e, i) => {
              if (e[0] == 'v') {
                vd.push(e[1] == '-' ? 'vm' : 'v')
                vv.push(i)
              } else if (e[0] == 'h') {
                hd.push(e[1] == '-' ? 'hm' : 'h')
                hh.push(i)
              }
            })
            let ind = Array(end.length - 1).fill(0).map((_, i) => i + 1)
            let vmove = []
            let hmove = []
            for (let k = 2; vv.length || hh.length;) {
              let change = false
              let delcoll = []
              for (let i = 0; i < vv.length; i++) {
                if (vd[i] != vd[(i + 1) % vd.length]) {
                  let va = ind.indexOf(vv[i])
                  let vb = ind.indexOf(vv[(i + 1) % vv.length])
                  let d = Math.abs(va - vb)
                  if (d == k || d == ind.length - k) {
                    vmove.push(d == k ? undefined : vd[0] == 'v' ? -1 : 1)
                    v.push(vv.splice(i, 1))
                    vm.push(vv.splice(i % vv.length, 1))
                    vd.splice(i, 1)
                    vd.splice(i % vd.length, 1)
                    delcoll.push(va, vb)
                    change = true
                    i--
                  }
                }
              }
              for (let i = 0; i < hh.length; i++) {
                if (hd[i] != hd[(i + 1) % hd.length]) {
                  let ha = ind.indexOf(hh[i])
                  let hb = ind.indexOf(hh[(i + 1) % hh.length])
                  let d = Math.abs(ha - hb)
                  if (d == k || d == ind.length - k) {
                    hmove.push(d == k ? undefined : hd[0] == 'h' ? -1 : 1)
                    h.push(hh.splice(i, 1))
                    hm.push(hh.splice(i % hh.length, 1))
                    hd.splice(i, 1)
                    hd.splice(i % hd.length, 1)
                    delcoll.push(ha, hb)
                    change = true
                    i--
                  }
                }
              }
              delcoll.sort((a, b) => b - a).forEach(e => ind.splice(e, 1))
              change ? (k = 1) : ++k
            }
            let res = [end.join('')]
            let t = Math.ceil(plen / 6)
            let durr = plen ** (1 / 4)
            if (plen < 200) durr *= plen / 200
            const ht = Math.max(1, Math.floor(h.length / t))
            const vt = Math.max(1, Math.floor(v.length / t))
            const vl = v.length
            const hl = h.length
            let ktcount = []
            let m0 = end[0].match(/M(\d+) (\d+)/).slice(1).map(e => +e)
            for (let i = 0, jv = 0, jh = 0; i < t; i++) {
              let count = 0
              if (vl < t) {
                if (i == Math.floor(jv * t / vl)) {
                  end[v[0]] = end[vm[0]] = 'v0'
                  m0[1] -= vmove[0] ?? 0
                  v.shift()
                  vm.shift()
                  vmove.shift()
                  jv++
                  count++
                }
              } else {
                for (let j = 0; j < vt + (i < vl % t); j++) {
                  end[v[0]] = end[vm[0]] = 'v0'
                  m0[1] -= vmove[0] ?? 0
                  v.shift()
                  vm.shift()
                  vmove.shift()
                  count++
                }
              }
              if (hl < t) {
                if (i == Math.floor(jh * t / hl)) {
                  end[h[0]] = end[hm[0]] = 'h0'
                  m0[0] -= hmove[0] ?? 0
                  h.shift()
                  hm.shift()
                  hmove.shift()
                  jh++
                  count++
                }
              } else {
                for (let j = 0; j < ht + (i < hl % t); j++) {
                  end[h[0]] = end[hm[0]] = 'h0'
                  m0[0] -= hmove[0] ?? 0
                  h.shift()
                  hm.shift()
                  hmove.shift()
                  count++
                }
              }
              ktcount.push(count)
              end[0] = 'M' + m0.join(' ')
              res.push(end.join(''))
            }
            let kt = [0]
            let sum = ktcount.reverse().reduce((p, c) => {
              kt.push(p + c)
              return p + c
            }, 0)
            kt = kt.map(e => e / sum)
            res.reverse()
            let ani = makeSVG('animate', {
              id: 'sp' + ii,
              begin: _htOption.spreadSVG ? '0s' : (ii == 0) ? '0s' : 'sp' + (ii - 1) + '.end',
              attributeName: 'd',
              values: res.join(';'),
              keyTimes: kt.join(';'),
              dur: durr + 's'
            })
            ani.onbegin = function() {
              e.setAttribute('d', tmpdl[ii][0])
            }
            e.appendChild(ani)
            svg.appendChild(e)
          })
        } else {
          svg.appendChild(makeSVG('path', {
            fill: _htOption.colorDark,
            style: 'fill-rule:evenodd',
            d: pathStr
          }))
        }
      } else {
        svg.appendChild(makeSVG('rect', {
          fill: _htOption.colorDark,
          width: '1',
          height: '1',
          id: 'template'
        }))
        for (var row = 0; row < nCount; row++) {
          for (var col = 0; col < nCount; col++) {
            if (oQRCode.isDark(row, col)) {
              var child = makeSVG('use', {
                x: String(col),
                y: String(row)
              })
              child.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#template')
              svg.appendChild(child)
            }
          }
        }
      }
    }
    Drawing.prototype.clear = function() {
      while (this._el.hasChildNodes())
        this._el.removeChild(this._el.lastChild)
    }
    return Drawing
  })()

  // Drawing in DOM by using Table tag 

  var tableDrawer = (function() {
    var Drawing = function(el, htOption) {
      this._el = el
      this._htOption = htOption
    }

    /**
     * Draw the QRCode
     * 
     * @param {QRCode} oQRCode
     */
    Drawing.prototype.draw = function(oQRCode) {
      var _htOption = this._htOption
      var _el = this._el
      var nCount = oQRCode.getModuleCount()
      var nWidth = Math.floor(_htOption.width / nCount)
      var nHeight = Math.floor(_htOption.height / nCount)
      var aHTML = ['<table style="border:0;border-collapse:collapse;">']

      for (var row = 0; row < nCount; row++) {
        aHTML.push('<tr>')

        for (var col = 0; col < nCount; col++) {
          aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>')
        }

        aHTML.push('</tr>')
      }

      aHTML.push('</table>')
      _el.innerHTML = aHTML.join('')

      // Fix the margin values as real size.
      var elTable = _el.childNodes[0]
      var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2
      var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2

      if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
        elTable.style.margin = nTopMarginTable + 'px ' + nLeftMarginTable + 'px'
      }
    }

    /**
     * Clear the QRCode
     */
    Drawing.prototype.clear = function() {
      this._el.innerHTML = ''
    }

    return Drawing
  })()

  var canvasDrawer = (function() { // Drawing in Canvas
    function _onMakeImage() {
      this._elImage.src = this._elCanvas.toDataURL('image/png')
      this._elImage.style.display = 'block'
      this._elCanvas.style.display = 'none'
    }

    // Android 2.1 bug workaround
    // http://code.google.com/p/android/issues/detail?id=5141
    if (this._android && this._android <= 2.1) {
      var factor = 1 / window.devicePixelRatio
      var drawImage = CanvasRenderingContext2D.prototype.drawImage
      CanvasRenderingContext2D.prototype.drawImage = function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (('nodeName' in image) && /img/i.test(image.nodeName)) {
          for (var i = arguments.length - 1; i >= 1; i--) {
            arguments[i] = arguments[i] * factor
          }
        } else if (typeof dw == 'undefined') {
          arguments[1] *= factor
          arguments[2] *= factor
          arguments[3] *= factor
          arguments[4] *= factor
        }

        drawImage.apply(this, arguments)
      }
    }

    /**
     * Check whether the user's browser supports Data URI or not
     * 
     * @private
     * @param {Function} fSuccess Occurs if it supports Data URI
     * @param {Function} fFail Occurs if it doesn't support Data URI
     */
    function _safeSetDataURL(fSuccess, fFail) {
      var self = this
      self._fFail = fFail
      self._fSuccess = fSuccess

      // Check it just once
      if (self._bSupportDataURL === null) {
        var el = document.createElement('img')
        var fOnError = function() {
          self._bSupportDataURL = false

          if (self._fFail) {
            self._fFail.call(self)
          }
        }
        var fOnSuccess = function() {
          self._bSupportDataURL = true

          if (self._fSuccess) {
            self._fSuccess.call(self)
          }
        }

        el.onabort = fOnError
        el.onerror = fOnError
        el.onload = fOnSuccess
        el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' // the Image contains 1px data.
        return
      } else if (self._bSupportDataURL === true && self._fSuccess) {
        self._fSuccess.call(self)
      } else if (self._bSupportDataURL === false && self._fFail) {
        self._fFail.call(self)
      }
    }

    /**
     * Drawing QRCode by using canvas
     * 
     * @constructor
     * @param {HTMLElement} el
     * @param {Object} htOption QRCode Options 
     */
    var Drawing = function(el, htOption) {
      this._bIsPainted = false
      this._android = _getAndroid()

      this._htOption = htOption
      this._elCanvas = document.createElement('canvas')
      this._elCanvas.width = htOption.width
      this._elCanvas.height = htOption.height
      el.appendChild(this._elCanvas)

      this._el = el
      this._oContext = this._elCanvas.getContext('2d')
      this._bIsPainted = false
      this._elImage = document.createElement('img')
      this._elImage.alt = 'Scan me!'
      this._elImage.style.display = 'none'
      this._el.appendChild(this._elImage)

      this._bSupportDataURL = null
    }

    /**
     * Draw the QRCode
     * 
     * @param {QRCode} oQRCode 
     */
    Drawing.prototype.draw = function(oQRCode) {
      var _elImage = this._elImage
      var _oContext = this._oContext
      var _htOption = this._htOption

      var nCount = oQRCode.getModuleCount()
      var nWidth = _htOption.width / nCount
      var nHeight = _htOption.height / nCount
      var nRoundedWidth = Math.round(nWidth)
      var nRoundedHeight = Math.round(nHeight)

      _elImage.style.display = 'none'
      this.clear()

      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          var bIsDark = oQRCode.isDark(row, col)
          var nLeft = col * nWidth
          var nTop = row * nHeight
          _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight
          _oContext.lineWidth = 1
          _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight
          _oContext.fillRect(nLeft, nTop, nWidth, nHeight)

          // 안티 앨리어싱 방지 처리
          _oContext.strokeRect(
            Math.floor(nLeft) + 0.5,
            Math.floor(nTop) + 0.5,
            nRoundedWidth,
            nRoundedHeight
          )

          _oContext.strokeRect(
            Math.ceil(nLeft) - 0.5,
            Math.ceil(nTop) - 0.5,
            nRoundedWidth,
            nRoundedHeight
          )
        }
      }

      this._bIsPainted = true
    }

    /**
     * Make the image from Canvas if the browser supports Data URI.
     */
    Drawing.prototype.makeImage = function() {
      if (this._bIsPainted) {
        _safeSetDataURL.call(this, _onMakeImage)
      }
    }

    /**
     * Return whether the QRCode is painted or not
     * 
     * @return {Boolean}
     */
    Drawing.prototype.isPainted = function() {
      return this._bIsPainted
    }

    /**
     * Clear the QRCode
     */
    Drawing.prototype.clear = function() {
      this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height)
      this._bIsPainted = false
    }

    /**
     * @private
     * @param {Number} nNumber
     */
    Drawing.prototype.round = function(nNumber) {
      if (!nNumber) {
        return nNumber
      }

      return Math.floor(nNumber * 1000) / 1000
    }

    return Drawing
  })()

  /**
   * Get the type by string length
   * 
   * @private
   * @param {String} sText
   * @param {Number} nCorrectLevel
   * @return {Number} type
   */
  function _getTypeNumber(sText, nCorrectLevel) {
    var nType = 1
    var length = _getUTF8Length(sText)

    for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
      var nLimit = 0

      switch (nCorrectLevel) {
        case QRErrorCorrectLevel.L:
          nLimit = QRCodeLimitLength[i][0]
          break
        case QRErrorCorrectLevel.M:
          nLimit = QRCodeLimitLength[i][1]
          break
        case QRErrorCorrectLevel.Q:
          nLimit = QRCodeLimitLength[i][2]
          break
        case QRErrorCorrectLevel.H:
          nLimit = QRCodeLimitLength[i][3]
          break
      }

      if (length <= nLimit) {
        break
      } else {
        nType++
      }
    }

    if (nType > QRCodeLimitLength.length) {
      throw new Error('Too long data')
    }

    return nType
  }

  function _getUTF8Length(sText) {
    var replacedText = encodeURI(sText).toString().replace(/%[0-9a-fA-F]{2}/g, 'a')
    return replacedText.length + (replacedText.length != sText ? 3 : 0)
  }

  function _isSupportCanvas() {
    return typeof CanvasRenderingContext2D != 'undefined'
  }

  /**
   * @class QRCode
   * @constructor
   * @example 
   * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
   *
   * @example
   * var oQRCode = new QRCode("test", {
   *    text : "http://naver.com",
   *    width : 128,
   *    height : 128
   * });
   * 
   * oQRCode.clear(); // Clear the QRCode.
   * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
   *
   * @param {HTMLElement|String} el target element or 'id' attribute of element.
   * @param {Object|String} vOption
   * @param {String} vOption.text QRCode link data
   * @param {Number} [vOption.width=256]
   * @param {Number} [vOption.height=256]
   * @param {String} [vOption.colorDark="#000000"]
   * @param {String} [vOption.colorLight="#ffffff"]
   * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H] 
   * @param {pathCombine} [vOption.pathCombine=true]
   */
  QRCode = function(el, vOption) {
    this._htOption = {
      width: 256,
      height: 256,
      typeNumber: 1,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRErrorCorrectLevel.H,
      pathCombine: false
    }

    if (typeof vOption === 'string') {
      vOption = {
        text: vOption
      }
    }

    // Overwrites options
    if (vOption) {
      for (var i in vOption) {
        this._htOption[i] = vOption[i]
      }
    }

    if (typeof el == 'string') {
      el = document.getElementById(el)
    }

    Drawing = this._htOption.useSVG ? svgDrawer : _isSupportCanvas() ? canvasDrawer : tableDrawer

    this._android = _getAndroid()
    this._el = el
    this._oQRCode = null
    this._oDrawing = new Drawing(this._el, this._htOption)

    if (this._htOption.text) {
      this.makeCode(this._htOption.text)
    }
  }

  /**
   * Make the QRCode
   * 
   * @param {String} sText link data
   */
  QRCode.prototype.makeCode = function(sText) {
    this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel)
    this._oQRCode.addData(sText)
    this._oQRCode.make()
    //this._el.title = sText
    this._oDrawing.draw(this._oQRCode)
    this.makeImage()
  }

  /**
   * Make the Image from Canvas element
   * - It occurs automatically
   * - Android below 3 doesn't support Data-URI spec.
   * 
   * @private
   */
  QRCode.prototype.makeImage = function() {
    if (typeof this._oDrawing.makeImage == 'function' && (!this._android || this._android >= 3)) {
      this._oDrawing.makeImage()
    }
  }

  /**
   * Clear the QRCode
   */
  QRCode.prototype.clear = function() {
    this._oDrawing.clear()
  }

  /**
   * @name QRCode.CorrectLevel
   */
  QRCode.CorrectLevel = QRErrorCorrectLevel
})()