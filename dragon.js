
function dIteration(direct,depth){
  var arr=[]
  arr.push(direct)
  for(var j=0;j<depth;j++){
    var b=arr.slice().reverse()
    b.forEach(function(e,i,ar){
    ar[i]=e=="r"?"u":(e=="u"?"l":(e=="l"?"d":"r"))
    })
    arr=arr.concat(b)
  }
  return arr
}

function dDraw(canvas,arr,startX,startY,leng){
  var x=[],y=[]
  var Color = net.brehaut.Color;

  var cx=canvas.getContext("2d")
  cx.clearRect(0,0,canvas.width,canvas.height);  
  cx.lineWidth=2

  for(var ll=0;ll<arr.length;ll++){
    x[ll]=arr[ll]=="r"?leng:(arr[ll]=="l"?-leng:0)
    y[ll]=arr[ll]=="d"?leng:(arr[ll]=="u"?-leng:0)
  }
  
  for(var k=0;k<arr.length;k++){
    cx.beginPath();
    cx.moveTo(startX,startY)
    cx.strokeStyle=Color("hsl("+360*k/arr.length+", 100%, 50%)")
    startX+=x[k]
    startY+=y[k]
    cx.lineTo(startX,startY)
    cx.stroke()
  }
}

function draw(){
  var depth=$("#depth").value
  var len=+$("#len").value
  var direct=$("#direct").value
  var m=+$("#dx").value
  var n=+$("#dy").value

  var name = ["depth","len","direct","dx","dy"]
  for(var i=0;i<name.length;i++){
     if($("#"+name[i]).value==name[i]){
       alert("请输入"+name[i])
       break;
     }
  }
  if(direct.match(/[^dlru]/)&&direct!="direct"){alert("初始方向请输入u,d,l或r")}
  else if(direct!="direct"){
    a=dIteration(direct,depth)
    dDraw(ca,a,m,n,len)
  }
}
