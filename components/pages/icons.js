var icons = new omdMod.Observable()
.target("placeholder")
.showValues(false)
.mode("ojs")
.text(`
  <!-- ----------------------------------------------------------------------- -->
  <!--                                 custom                                  -->
  <!-- ----------------------------------------------------------------------- -->


  fetch_img = "https://docs.google.com/document/d/1tTU0_X-kBv_Ydg4x8v7LbgfW9E1sSUtmawL1ZbVEbAY/edit?usp=sharing"

  df = {
    return await d3.text(
        fetch_img.substr(0, fetch_img.indexOf("/edit")) + "/export?format=html"
    );
  }
  
  
  function extractword(str, start, end) {
    var startindex = str.indexOf(start);
    var endindex = str.indexOf(end, startindex);
    const fruits = [];
    if (startindex != -1 && endindex != -1 && endindex > startindex)
      fruits.push(str.substring(startindex, endindex));
    return fruits;
  }

  function find_image(regexp, start, end) {
    var prl = [];
    var array = [...df.matchAll(regexp)];
    for (let cc = 0; cc < array.length; ++cc) {
      prl.push(
        extractword(
          df.slice(array[cc]["index"], df.length),
          start,
          end
        )[0]
      );
    }
    return prl;
  };

  src = find_image(/<img/g, "src=", '" style')
  ref = find_image(/<a/g, "href=", ";")


  function clean_src(src) {
    var _src = [];
    for (const value of src) {
      _src.push(value.slice(5, value.length));
    }
    return _src;
  };

  function clean_ref(ref) {
    var _ref = [];
    for (const value of ref) {
        _ref.push(value.slice(35, value.length-4));
    }

    return _ref;
  };

  function icon(params) {
    var cliccable = document.getElementById("cliccabili" + params);
    if (cliccable !== null){
    cliccable.href = clean_ref(ref)[params];
    var img = cliccable.children[0];

  img.src = clean_src(src)[params];
  img.classList.add("clip");
}
}




{
    await new Promise((r) => setTimeout(r, 1350));
    for (let index = 0; index < (ref.length); ++index) {
        icon(index);
        
      };
}
    
\$ = require("jquery")`)

;

doResize();

function doResize() {
if (icons) {
    icons
        .resize()
        .lazyRender();
}
}