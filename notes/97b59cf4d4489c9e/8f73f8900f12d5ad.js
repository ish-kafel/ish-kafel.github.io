$(document).ready(function() {
  function e(n) {
    if (-40 == scroll) {
      $(".album").fadeIn(1000, function() {
        $(this).hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({ opacity: "1" })
        })
      })
      $("#ar").delay(400).fadeIn(1400)
      $("#as").delay(800).fadeIn(1400)
      $("#at").delay(1200).fadeIn(1400)
      $("#au").children().delay(2200).each(function(e) {
        $(this).delay(200 * e).fadeIn(1000, function() {
          $("#au img").hover(function() {
            $(this).css({
              opacity: "0.6",
              "transition-duration": "0.2s"
            })
          }, function() {
            $(this).css({ opacity: "1" })
          })
        })
      })
      window.removeEventListener("wheel", e)
    }
  }
  function touchshow1(n) {
    if (-120 > dy) {
      $(".album").fadeIn(1000, function() {
        $(this).hover(function() {
          $(this).css({
            opacity: "0.6",
            "transition-duration": "0.2s"
          })
        }, function() {
          $(this).css({ opacity: "1" })
        })
      })
      $("#ar").delay(400).fadeIn(1400)
      $("#as").delay(800).fadeIn(1400)
      $("#at").delay(1200).fadeIn(1400)
      $("#au").children().delay(2200).each(function(e) {
        $(this).delay(200 * e).fadeIn(1000, function() {
          $("#au img").hover(function() {
            $(this).css({
              opacity: "0.6",
              "transition-duration": "0.2s"
            })
          }, function() {
            $(this).css({ opacity: "1" })
          })
        })
      })
      window.removeEventListener("touchmove", touchshow1)
    }
  }
  setTimeout(function() {
    $("#ret").load('97b59cf4d4489c9e/f9a59aa722e934b4.html div#663e12a7baf56641')
  }, 1e3)
  $(n).unbind("mouseenter mouseleave click").css({ "transition-duration": "" })
  $("#nexta").prop("onclick", null).fadeOut(1e3)
  $("#logo").delay(400).animate({
    width: "4vh",
    "margin-top": "5vh"
  }, 4e3, function() {
    $("#widget").css({
      "margin-top": "82vh"
    })
    $("#title p:eq(0)").delay(200).fadeIn(1400)
    $("#title p:eq(1)").delay(600).fadeIn(1400)
    $("#connect").delay(600).animate({ height: "toggle" }, 2e3)
  })
  a = ["", "", 82, "", -910]
  setTimeout(function() {
    window.addEventListener("wheel", screnabled)
    window.addEventListener("wheel", e)
    window.addEventListener("wheel", widget)
    window.addEventListener("touchmove", screnabled1)
    window.addEventListener("touchmove", touchshow1)
    window.addEventListener("touchmove", widget)
  }, 7e3)
});
