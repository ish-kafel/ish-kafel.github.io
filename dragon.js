
function dIteration(direct, depth) {
  var arr = []
  arr.push(direct)
  for (var j = 0; j < depth; j++) {
    var b = arr.slice().reverse()
    b.forEach(function (e, i, ar) {
      ar[i] = e == "r" ? "u" : (e == "u" ? "l" : (e == "l" ? "d" : "r"))
    })
    arr = arr.concat(b)
  }
  return arr
}

function draw() {
  depth = $("#depth").value
  len = +$("#len").value
  direct = $("#direct").value
  m = +$("#dx").value
  n = +$("#dy").value
  var name = ["depth", "len", "direct", "dx", "dy"]
  for (var i = 0; i < name.length; i++) {
    if ($("#" + name[i]).value == name[i]) {
      alert("请输入" + name[i])
      break
    }
  }
  if (direct.match(/[^dlru]/) && direct != "direct") { alert("初始方向请输入u,d,l或r") }
  else if (direct != "direct") {

    drawOn = true
    start.style.display = 'none'
    stop.style.display = 'block'
    pause.style.display = 'block'
    a = dIteration(direct, depth)
    cx.clearRect(0, 0, ca.width, ca.height)
    cx.lineWidth = 2
    for (var ll = 0; ll < a.length; ll++) {
      x[ll] = a[ll] == "r" ? len : (a[ll] == "l" ? -len : 0)
      y[ll] = a[ll] == "d" ? len : (a[ll] == "u" ? -len : 0)
    }
    k = 0
    dDraw()
  }
}

function dDraw() {
  cx.beginPath()
  cx.moveTo(m, n)
  cx.strokeStyle = Color("hsl(" + 360 * k / a.length + ", 100%, 50%)")
  m += x[k]
  n += y[k]
  cx.lineTo(m, n)
  cx.stroke()
  if (k != a.length - 1) {
    if (drawOn == true) {
      setTimeout(dDraw, 30)
      k++
    }
  } else {
    drawOn = false
    start.style.display = 'block'
    pause.style.display = 'none'
    stop.style.display = 'none'
    pause.style.display = 'none'
  }
}