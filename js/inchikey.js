//translate from Github mnowotka/chembl_ikey

import sha256 from './sha256.js'
const c26 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
let t26 = [],
  d26 = []
for (let i of c26) {
  for (let j of c26) {
    if (i != 'E') {
      for (let k of c26) {
        let d = i + j + k
        if (d >= 'TAA' && d <= 'TTV') continue
        t26.push(d)
      }
    }
    d26.push(i + j)
  }
}

const base26Triplet1 = a => {
  let b0 = a[0]
  let b1 = a[1] & 0x3f
  let h = b0 | b1 << 8
  return t26[h]
}

const base26Triplet2 = a => {
  let b0 = a[1] & 0xc0
  let b1 = a[2]
  let b2 = a[3] & 0x0f
  let h = (b0 | b1 << 8 | b2 << 16) >> 6
  return t26[h]
}

const base26Triplet3 = a => {
  let b0 = a[3] & 0xf0
  let b1 = a[4]
  let b2 = a[5] & 0x03
  let h = (b0 | b1 << 8 | b2 << 16) >> 4
  return t26[h]
}

const base26Triplet4 = a => {
  let b0 = a[5] & 0xfc
  let b1 = a[6]
  let h = (b0 | b1 << 8) >> 2
  return t26[h]
}

const base26DubletForBits28To36 = a => {
  let b0 = a[3] & 0xf0
  let b1 = a[4] & 0x1f
  let h = (b0 | b1 << 8) >> 4
  return d26[h]
}

const base26DubletForBits56To64 = a => {
  let b0 = a[7]
  let b1 = a[8] & 0x01
  let h = b0 | b1 << 8
  return d26[h]
}

const INCHI_STRING_PREFIX = "InChI="
const LEN_INCHI_STRING_PREFIX = INCHI_STRING_PREFIX.length

export default szINCHISource => {
  let flagstd = 'S'
  let flagnonstd = 'N'
  let flagver = 'A'
  let flagproto = 'N'
  let pplus = "OPQRSTUVWXYZ"
  let pminus = "MLKJIHGFEDCB"

  if (!szINCHISource) return new Error('There are no InChI string')

  let slen = szINCHISource.length
  if (slen < LEN_INCHI_STRING_PREFIX + 3) return null
  if (!szINCHISource.startsWith(INCHI_STRING_PREFIX)) return new Error('InChI string must starts with "InChI="')
  if (szINCHISource[LEN_INCHI_STRING_PREFIX] != '1') return null

  let bStdFormat = null
  let pos_slash1 = LEN_INCHI_STRING_PREFIX + 1

  if (szINCHISource[pos_slash1] == 'S') {
    bStdFormat = 1
    pos_slash1++
  }

  if (szINCHISource[pos_slash1] != '/') return null

  if (szINCHISource[pos_slash1 + 1].match(/[^a-zA-Z0-9\/]/g)) return null

  let string = szINCHISource.substr(LEN_INCHI_STRING_PREFIX)

  if (!string) return null

  let aux = string.substr(pos_slash1 - LEN_INCHI_STRING_PREFIX + 1)
  slen = aux.length
  let proto = false
  let end = 0
  for (let idx = 0; idx < slen; idx++) {
    let cn
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
  if (end == 0) end = slen

  let smajor
  if (!proto) {
    smajor = aux.substr(0, end)
  } else {
    smajor = aux.substr(0, proto)
  }
  let nprotons
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
    else {
      return null
    }
  }
  let sminor = ''
  if (end != slen) {
    sminor = aux.substr(end)
  }
  if (sminor.length < 255) {
    sminor += sminor
  }
  let flag = bStdFormat ? flagstd : flagnonstd
  let digestMajor = sha256(smajor)
  let digestMinor = sha256(sminor)
  let major = base26Triplet1(digestMajor) + base26Triplet2(digestMajor) + base26Triplet3(digestMajor) + base26Triplet4(digestMajor) + base26DubletForBits56To64(digestMajor)
  let minor = base26Triplet1(digestMinor) + base26Triplet2(digestMinor) + base26DubletForBits28To36(digestMinor)
  return `${major}-${minor}${flag}${flagver}-${flagproto}`
}