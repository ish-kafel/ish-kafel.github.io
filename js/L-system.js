function lSystem(axiom, rules, drawV, constV, depth) {
  var l = constV.length
  var tempDraw = ['@', '#', '$', '%', '&']
  for (var k = 0; k < depth; k++) {
    for (var i = 0; i < l - 1; i++) {
      axiom = axiom.replace(new RegExp(constV[i], 'g'), tempDraw[i])
    }
    axiom = axiom.replace(new RegExp(constV[l - 1], 'g'), rules[l - 1])
    for (var j = 0; j < l - 1; j++) {
      axiom = axiom.replace(new RegExp(tempDraw[j], 'g'), rules[j])
    }
  }
  return axiom.replace(new RegExp('[^+-' + drawV.join('') + ']', 'g'), '')
}

function drawGnr(init, angle, gnrStr, drawV) {
  var s = []
  if (['u', 'r', 'd', 'l'].indexOf(init) + 1) {
    init = ['u', 'r', 'd', 'l'].indexOf(init) * 90
  }
  gnrStr = gnrStr.split('')
  for (var i = 0; i < gnrStr.length; i++) {
    if (drawV.indexOf(gnrStr[i]) + 1) s.push(init)
    else if (gnrStr[i] == '+') init = (init + angle) % 360
    else init = (init - angle + 360) % 360
  }
  return s
}

function sumLen(gnrStr, drawV) {
  return gnrStr.replace(new RegExp('[^' + drawV.join('') + ']', 'g'), '').length
}