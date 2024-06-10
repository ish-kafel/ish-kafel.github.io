//translate from Github mnowotka/chembl_ikey

var t26 = []
var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" //ascii_uppercase
for (var i = 0; i <= 25; i++) {
  if (a[i] == "E") continue
  for (var j = 0; j <= 25; j++) {
    for (var k = 0; k <= 25; k++) {
      var d = "" + a[i] + a[j] + a[k]
      if (d >= 'TAA' && d <= 'TTV') continue
      t26.push(d)
    }
  }
}

var d26 = []
for (var i = 0; i <= 25; i++) {
  for (var j = 0; j <= 25; j++) {
    var d = "" + a[i] + a[j]
    d26.push(d)
  }
}

function base26Triplet1(a) {
  var b0 = a[0]
  var b1 = a[1] & 0x3f
  var h = b0 | b1 << 8
  return t26[h]
}

function base26Triplet2(a) {
  var b0 = a[1] & 0xc0
  var b1 = a[2]
  var b2 = a[3] & 0x0f
  var h = (b0 | b1 << 8 | b2 << 16) >> 6
  return t26[h]
}

function base26Triplet3(a) {
  var b0 = a[3] & 0xf0
  var b1 = a[4]
  var b2 = a[5] & 0x03
  var h = (b0 | b1 << 8 | b2 << 16) >> 4
  return t26[h]
}

function base26Triplet4(a) {
  var b0 = a[5] & 0xfc
  var b1 = a[6]
  var h = (b0 | b1 << 8) >> 2
  return t26[h]
}

function base26DubletForBits28To36(a) {
  var b0 = a[3] & 0xf0
  var b1 = a[4] & 0x1f
  var h = (b0 | b1 << 8) >> 4
  return d26[h]
}

function base26DubletForBits56To64(a) {
  var b0 = a[7]
  var b1 = a[8] & 0x01
  var h = b0 | b1 << 8
  return d26[h]
}

var INCHI_STRING_PREFIX = "InChI="
var LEN_INCHI_STRING_PREFIX = INCHI_STRING_PREFIX.length

function inchiToInchiKey(szINCHISource) {

  var flagstd = 'S'
  var flagnonstd = 'N'
  var flagver = 'A'
  var flagproto = 'N'
  var pplus = "OPQRSTUVWXYZ"
  var pminus = "MLKJIHGFEDCB"

  if (!szINCHISource) return null

  var slen = szINCHISource.length
  if (slen < LEN_INCHI_STRING_PREFIX + 3) return null

  if (!szINCHISource.startsWith(INCHI_STRING_PREFIX)) return null

  if (szINCHISource[LEN_INCHI_STRING_PREFIX] != '1') return null

  var bStdFormat = null
  var pos_slash1 = LEN_INCHI_STRING_PREFIX + 1

  if (szINCHISource[pos_slash1] == 'S') {
    bStdFormat = 1
    pos_slash1++
  }

  if (szINCHISource[pos_slash1] != '/') return null

  if (szINCHISource[pos_slash1 + 1].match(/[^a-zA-Z0-9\/]/g)) return null

  var string = szINCHISource.substr(LEN_INCHI_STRING_PREFIX)

  if (!string) return null

  var aux = string.substr((pos_slash1 - LEN_INCHI_STRING_PREFIX) + 1)
  var slen = aux.length
  var proto = false
  var end = 0
  var idx = 0
  for (; idx < slen; idx++) {
    var cn
    if (aux[idx] == '/') {
      cn = aux[idx + 1]
      if (cn == 'c' || cn == 'h' || cn == 'q') continue
      if (cn == 'p') {
        proto = idx
        continue
      }
      if (cn == 'f' || cn == 'r') return null
      end = idx
      break
    }
  }
  if (end == (slen - 1)) end++

  var smajor
  if (!proto) {
    smajor = aux.substr(0, end)
  } else {
    smajor = aux.substr(0, proto)
  }

  var nprotons
  if (proto) {
    nprotons = Number(aux.substring(proto + 2, end))
    if (nprotons > 0) {
      if (nprotons > 12) {
        flagproto = 'A'
      } else {
        flagproto = pplus[nprotons - 1]
      }
    }
    else if (nprotons < 0) {
      if (nprotons < -12) {
        flagproto = 'A'
      }
      else {
        flagproto = pminus[-nprotons - 1]
      }
    }
    else return null
  }
  var sminor = ''
  if (end != slen) {
    sminor = aux.substr(end)
  }
  if (sminor.length < 255) {
    sminor += sminor
  }
  var flag = bStdFormat ? flagstd : flagnonstd

  var majorHash = sha256.update(smajor)
  var minorHash = sha256.update(sminor)
  var digestMajor = majorHash.array()
  var digestMinor = minorHash.array()
  var major = base26Triplet1(digestMajor) + base26Triplet2(digestMajor) + base26Triplet3(digestMajor) + base26Triplet4(digestMajor) + base26DubletForBits56To64(digestMajor)
  var minor = base26Triplet1(digestMinor) + base26Triplet2(digestMinor) + base26DubletForBits28To36(digestMinor)
  return `${major}-${minor}${flag}${flagver}-${flagproto}`
}