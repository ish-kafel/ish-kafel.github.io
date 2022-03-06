$(document).ready(function() {
  var e, t = -1;

  function a() {
    $("#playb").animate({
        width: "100%"
      },
      1e3 * (e.duration - e.currentTime),
      "linear",
      function() {
        $("#playbar,.play").css({ "pointer-events": "none" })
        setTimeout(function() {
          $("#playb").css({ width: "0" })
          $(".play").css({ "pointer-events": "auto" })
          $(".pause").eq(t).hide()
          $(".play").eq(t).show()
          t = -1
        }, 1e3)
      })
  }
  $(".play").click(function() {
    var n = $(".play").index(this);
    if (t != n && -1 != t && (e.pause(), e.currentTime = 0, $("#playb").stop().css({ width: "0" }), $(".pause").hide(), $(".play").show()), t != n) {
      var i = 20 * Math.random();
      e = 0 < i && i < 1 ? document.getElementById("16") : 10 < i && i < 11 ? document.getElementById("17") : document.getElementById(n)
    }
    $(this).hide()
    $(".pause").eq(n).show()
    t = n
    e.play()
    $("#playbar").css({ "pointer-events": "auto" })
    a()
  })
  $(".pause").click(function() {
    e.pause()
    $("#playb").stop()
    $("#playbar").css({ "pointer-events": "none" })
    $(this).hide()
    $(".play").eq(t).show()
  })
  $("#playbar").click(function(t) {
    var n = t.clientX / $("body").width() * 100;
    $("#playb").stop().css({ width: n + "%" })
    e.currentTime = e.duration / 100 * n
    a()
  })
  $("#playbar").hover(function() {
    $("#playb").css({ opacity: "0.6", height: "20%" })
  }, function() {
    $("#playb").css({ opacity: "1", height: "10%" })
  })
});