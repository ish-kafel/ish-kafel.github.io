var scroll = 0;

function screnabled(t) {
  if (t.deltaY < 0) {
    if (0 == scroll) return;
    scroll += 10
    $("body").css({ transform: "translateY(" + scroll + "vh)" })
    $("#widget,#overlay,#playbar").css({ transform: "translateY(" + -scroll + "vh)" })
  } else if (t.deltaY > 0) {
    if (-460 == scroll) return;
    scroll -= 10
    $("body").css({ transform: "translateY(" + scroll + "vh)" })
    $("#widget,#overlay,#playbar").css({ transform: "translateY(" + -scroll + "vh)" })
  }
}
let x, y, dy = 0

function touchon(t) {
  let touch = t.touches[0]
  x = touch.pageX
  y = touch.clientY - dy
}
window.addEventListener("touchstart", touchon)

function screnabled1(t) {
  let touch = t.touches[0]
  dy = touch.clientY - y
  if (dy > 0) dy = 0
  $("body").css({
    transform: "translateY(" + dy + "px)"
  })
  $("#widget,#overlay").css({
    transform: "translateY(" + -dy + "px)"
  })
}

function widget(t) {
  if (0 == scroll) $("#widget").fadeOut();
  else {
    if (-10 != scroll) return;
    $("#widget").fadeIn()
  }
}

function widget1(t) {
  if (-350 > scroll) {
    $("#widget").fadeOut();
  } else {
    //if (-10 != scroll) return;
    $("#widget").fadeIn()
  }
}
$(document).ready(function() {
  setTimeout(function() {
    $("#aq,#as,#au").children().each(function(t) {
      $(this).delay(200 * t).fadeIn(1400, function() {
        $("#aq img").hover(function() {
          $(this).css({ opacity: "0.6", "transition-duration": "0.2s" })
        }, function() {
          $(this).css({ opacity: "1" })
        })
      })
    })
    setTimeout(function() {
      window.addEventListener("wheel", function(t) {
        screnabled(t), widget(t)
      })
      window.addEventListener("touchmove", function(t) {
        screnabled1(t), widget1(t)
      })
    }, 1e3)
  }, 1e3)
  $("#widget").click(function() {
    $("body").css({ transform: "translateY(0)" })
    $("#widget").css({ transform: "translateY(0)" })
    $("#widget").fadeOut()
    scroll = 0
    dy = 0
  })
  $("#aq img").click(function() {
    var t = $("#aq img").index(this); -
    1 !== [0, 1, 4].indexOf(t) ? $("#oveb").css({ width: "100vw" }) : $("#oveb").css({ width: "100vw" })
    1 == t ? ($("#oveb img:eq(1)").hide(), $("#oveb video").show()) : ($("#oveb video").hide(), $("#oveb img:eq(1)").show(), $("#oveb img:eq(1)").prop("src", $(this).prop("src")))
    $("#oveb p").text($(this).prop("title"))
    $("#overlay").css({ "margin-top": "-2vh" }).show().animate({ opacity: 1, "margin-top": "-7vh" })
  })
  $("#oveb img:eq(0)").click(function() {
    $("#overlay").animate({ opacity: 0, "margin-top": "-2vh" }, function() { $(this).hide() })
  })
});
