function oc(x){
 if(x.value==x.id){x.value=""}
}
function bl(x){
 if(x.value==""){x.value=x.id}
}
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

function draw(){
  var depth=$("#depth").value
  var len=+$("#len").value
  var direct=$("#direct").value
  var m=+$("#dx").value
  var n=+$("#dy").value
  var name = ["depth","len","direct","dx","dy"]
  for(var i=0;i<name.length;i++){
     if($("#"+name[i]).value==name[i]){alert("请输入"+name[i])}
  }
  if(direct.match(/[^dlru]/)){alert("初始方向请输入u,d,l或r")}
  else{
    var a=[],x=[],y=[]

    var Color = net.brehaut.Color;
    a=dIteration(direct,depth)
    var cx=ca.getContext("2d")
    cx.clearRect(0,0,ca.width,ca.height);  
    cx.lineWidth=2

    for(var ll=0;ll<a.length;ll++){
      x[ll]=a[ll]=="r"?len:(a[ll]=="l"?-len:0)
      y[ll]=a[ll]=="d"?len:(a[ll]=="u"?-len:0)
    }

    for(var k=0;k<a.length;k++){
      cx.beginPath();
      cx.moveTo(m,n)
      cx.strokeStyle=Color("hsl("+360*k/a.length+", 100%, 50%)")
      m+=x[k]
      n+=y[k]
      cx.lineTo(m,n)
      cx.stroke()
    }
  }
}
