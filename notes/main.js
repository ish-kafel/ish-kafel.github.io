function addUser(e, t, n, a) {
  for (var o = 0; o < user.length; o++) {
    if (user[o][1] === e) {
      user[o][3] = t
      user[o][4] = n
      user[o][5] = a;
      break
    }
    $("#enemyradar" + e).length || $(document.body).append('<div id="enemyradar' + e + '" style="display: none;position: absolute;left: 0;top: 0;color: #ffffff;width: 0;height: 0;border-style: solid;border-width: 10px 0 10px 20px;border-color: transparent transparent transparent ' + conf.radar.color + ';"></div>');
  }
  var i = window.innerWidth / 2
  var r = window.innerHeight / 2
  var s = getRadian(player_x, player_y, t, n)
  var l = 100 * getDistance(0, 0, player_x - t, (player_y - n) * (16 / 9)) / (conf.maxScreenHeight / 2) / r;
  l > 1 && (l = 1);
  var c = r * l
  var d = i + c * Math.cos(s) - conf.radar.w / 2
  var h = r + c * Math.sin(s) - conf.radar.h / 2;
  $("#enemyradar" + e).css({
    left: d + "px",
    top: h + "px",
    display: null === player_team || player_team !== a ? "block" : "none",
    opacity: l,
    transform: "rotate(" + RtoD(s) + "deg)"
  })
}

function removeUserID(e) {
  for (let t = 0; t < user.length; t++) {
    if (user[t][0] == e) {
      $("#enemyradar" + user[t][1]).remove()
      user.splice(t, 1);
      break
    }
  }
}

function removeUserSID(e) {
  for (let t = 0; t < user.length; t++) {
    if (user[t][1] == e) {
      $("#enemyradar" + user[t][1]).remove()
      user.splice(t, 1);
      break
    }
  }
}
let a
let ready = 0
let n = "#logo img"
let scroll = 0;

function screnabled(e) {
  if (e.deltaY < 0) {
    if (0 == scroll) return;
    scroll += 10
    $("body").css({
      transform: "translateY(" + scroll + "vh)"
    })
    $("#widget,#overlay").css({
      transform: "translateY(" + -scroll + "vh)"
    })
  } else if (e.deltaY > 0) {
    if (scroll == $(a).get(4)) return;
    scroll -= 10
    $("body").css({
      transform: "translateY(" + scroll + "vh)"
    })
    $("#widget,#overlay").css({
      transform: "translateY(" + -scroll + "vh)"
    })
  }
}
let x, y, dy = 0

function touchon(e) {
  let touch = e.touches[0]
  x = touch.pageX
  y = touch.clientY - dy
}
window.addEventListener("touchstart", touchon)

function screnabled1(e) {
  let h = document.getElementById(a[0].split('#')[1]).scrollHeight / a[5] * (a[5] - 260)
  let touch = e.touches[0]
  dy = touch.clientY - y
  if (dy > 0) dy = 0
  if (dy < -h) dy = -h
  //console.log([dy, -h])
  scroll = dy
  $("body").css({ transform: "translateY(" + dy + "px)" })
  $("#widget,#overlay").css({
    transform: "translateY(" + -dy + "px)"
  })
}

function scrshow(e) {
  if (-40 == scroll) {
    $(".album").each(function(e) {
      $(this).delay(200 * e).fadeIn(1000, function() {
        $("#aq img").hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({
            opacity: "1"
          })
        })
      })
    })
    $("#ar").delay(600).fadeIn(1000)
    $("#as").delay(1e3).fadeIn(1000)
    $("#at").delay(1400).fadeIn(1000)
    $("#au h1,#au img").delay(2400).each(function(e) {
      $(this).delay(200 * e).fadeIn(1000, function() {
        $("#au img").hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({
            opacity: "1"
          })
        })
      })
    })
    window.removeEventListener("wheel", scrshow)
  }
}

function touchshow(e) {
  if (-120 > dy) {
    $(".album").each(function(e) {
      $(this).delay(200 * e).fadeIn(1000, function() {
        $("#aq img").hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({
            opacity: "1"
          })
        })
      })
    })
    $("#ar").delay(600).fadeIn(1000)
    $("#as").delay(1e3).fadeIn(1000)
    $("#at").delay(1400).fadeIn(1000)
    $("#au h1,#au img").delay(2400).each(function(e) {
      $(this).delay(200 * e).fadeIn(1000, function() {
        $("#au img").hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({
            opacity: "1"
          })
        })
      })
    })
    window.removeEventListener("touchmove", touchshow)
  }
}

function widget(e) {
  if (dy > -500) {
    $("#widget").fadeOut();
  } else {
    //if (-10 != dy) return;
    $("#widget").fadeIn()
  }
}
$(document).ready(function() {
  if (3 == localStorage.length) {
    $("#ret").load('3df37adce26893dc/12ad4c9811af86cf.html div#next')
    $("#logo").css({
      "margin-top": "-8vh"
    })
    setTimeout(function() {
      $("#next").fadeIn(1400)
    }, 1400)
  }
  $(n).hide()
  setTimeout(function() {
    $(n).each(function(e) {
      $(this).delay(100 * e).fadeIn(1000)
    })
    setTimeout(function() {
      $(n).hover(function() {
        $(n).not(this).css({
          opacity: "0.6",
          "transition-duration": "0.4s"
        })
      }, function() {
        $(n).not(this).css({
          opacity: "1"
        })
      })
      ready = 1
    }, 1300)
  }, 1e3)
  $(n).click(function() {
    if (1 == ready) {
      a = [["3df37adce26893dc/12ad4c9811af86cf.html div#boxa", 2, 85, "#1,#2", -680, 2914], ["3df37adce26893dc/30d27baeb71828b0.html div#boxb", -29.5, 116.5, "#2", -860, 3727], ["3df37adce26893dc/f9a59aa722e934b4.html div#boxc", -61.6, 148.6, "", -1020, 4383]][$(n).index(this)]
      localStorage.setItem($(n).index(this), 1)
      $(n).unbind("mouseenter mouseleave click").css({
        "transition-duration": ""
      })
      $("#nexta").prop("onclick", null).fadeOut(1e3)
      setTimeout(function() {
        $("#ret").load(a[0])
      }, 1e3)
      $(n).not(this).animate({
        opacity: 0
      }, 1e3)
      $("#logo").delay(400).animate({
        width: "15vh",
        "margin-top": a[1] + "vh"
      }, 1400, function() {
        $("#widget").css({
          "margin-top": a[2] + "vh"
        })
        $(a[3]).hide()
        setTimeout(function() {
          $("#title p:eq(0)").fadeIn(1e3)
          $("#title p:eq(1)").delay(400).fadeIn(1e3)
          $("#connect").delay(400).animate({
            height: "toggle"
          }, 2e3)
        }, 300)
      })
      setTimeout(function() {
        window.addEventListener("wheel", screnabled)
        window.addEventListener("wheel", scrshow)
        window.addEventListener("wheel", widget)
        window.addEventListener("touchmove", screnabled1)
        window.addEventListener("touchmove", touchshow)
        window.addEventListener("touchmove", widget)
      }, 4e3)
    }
  })
  $("#widget").click(function() {
    $("body").css({
      transform: "translateY(0)"
    })
    $("#widget").css({
      transform: "translateY(0)"
    })
    $("#widget").fadeOut()
    scroll = 0
    dy = 0
  })
  $("body").on("click", "#aq img", function() {
    $("#overlay").css({
      "margin-top": $(a).get(2) - 100 + "vh"
    }).show().animate({
      opacity: "1",
      "margin-top": $(a).get(2) - 105 + "vh"
    })
    $("#oveb img:eq(1)").prop("src", $(this).prop("src"))
    $("#oveb p").text($(this).prop("title"))
  })
  $("body").on("click", "#oveb img:eq(0)", function() {
    $("#overlay").animate({
      opacity: "0",
      "margin-top": a[2] - 100 + "vh"
    }, function() {
      $(this).hide()
    })
  })
});
