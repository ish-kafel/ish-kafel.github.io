var scroll = 0,
  toggle = 0;
$(document).ready(function() {
  var e = new URLSearchParams(window.location.search).get("n");
  let y, dy = 0
  $("#as").load("87281033ea7b2e2b/" + e, function() {
    document.getElementById("as").childNodes.forEach(e => {
      e.addEventListener("wheel", function(t) {
        t.deltaY < 0 ? e.scrollBy(0, .1 * -window.innerHeight) : t.deltaY > 0 && e.scrollBy(0, .1 * window.innerHeight)
      })
      e.addEventListener("touchstart", function(t) {
        let touch = t.touches[0]
        y = touch.clientY - dy
      })
      e.addEventListener("touchmove", function(t) {
        let touch = t.touches[0]
        dy = touch.clientY - y
        if (dy > 0) dy = 0
        if (dy < e.clientHeight - e.scrollHeight) dy = e.clientHeight - e.scrollHeight
        e.scrollTo(0, -dy)
      })
    })
  })
  $.getJSON("87281033ea7b2e2b/num.json", function(t) {
    var n = t[e];
    $("#aq > h1").html(n[0])
    setTimeout(function() {
      $("#aq").children().each(function(e) {
        $(this).delay(300 * e).fadeIn(1400, function() {
          $("#connect").animate({ opacity: "1", width: "40vh" }, 2e3)
        })
      })
    }, 1e3)
  })
  $("#widget").on("click", function e() {
    dy = 0
    var t = $("#widget");
    t.off("click", e);
    setTimeout(function() {
      t.on("click", e)
    }, 2100);
    0 == toggle ? ($("#as div:eq(0)").animate({ left: "-70vh" }, 1e3, function() {
      $(this).hide()
    }), $("#as div:eq(1)").delay(1e3).fadeIn(1e3), t.css({
      "transition-duration": "0.4s",
      "-moz-transform": "rotate(-180deg)",
      "-webkit-transform": "rotate(-180deg)",
      "-o-transform": "rotate(-180deg)",
      "-ms-transform": "rotate(-180deg)",
      transform: "rotate(-180deg)"
    }), setTimeout(function() {
      t.css({ "transition-duration": "" })
    }, 400), toggle = 1) : ($("#as div:eq(1)").fadeOut(400), $("#as div:eq(0)").delay(400).show(function() {
      $(this).animate({ left: "0" }, 1e3)
    }), t.css({
      "transition-duration": "0.4s",
      "-moz-transform": "rotate(0deg)",
      "-webkit-transform": "rotate(0deg)",
      "-o-transform": "rotate(0deg)",
      "-ms-transform": "rotate(0deg)",
      transform: "rotate(0deg)"
    }), setTimeout(function() { t.css({ "transition-duration": "" }) }, 400), toggle = 0)
  })
});
