var tstle = new omdMod.Observable()
.target("placeholder")
.showValues(false)
.mode("ojs")
.text(`
<!--  -->
<!--  -->
link=document.getElementById('link').innerText
sdata2 = {
    return await d3.text(
      link.substr(0, link.indexOf("/edit")) + "/export?format=html"
    );
  }
  

style = find_all(/<head/g, "<style", "</style>")[0].replace(
    '<style type="text/css">',
    ""
)
to_resolve = {
    var fruits = [];
    for (let elm = 0; elm < ids.length; ++elm) {
      fruits.push(
        the_cleaner_sc(sdata2)
          .substring(get_span_pos(the_cleaner_sc(sdata2), elm), get_span_pos(the_cleaner_sc(sdata2), elm + 1))
          .replace(ids[elm], "")
          .replace("</span></h5>", "")
      );
    }
    return fruits;
  }

  ids = {
    var span_ = find_all(/<h5/g, "[", "</span>");
    return span_;
  }

  span = {
    var span_ = find_all(/<span/g, ">", "<");
    var span = [];
    for (const value of span_) {
      if (value != ">") {
        span.push(value.slice(1, value.lenght));
      }
    }
    return span;
  }

/* ---------------------------- pulizia caratteri --------------------------- */
    major = {
    var minor_ = find_all(/(&gt;)/gi, "&gt", ";");
    var fruits = [];
    for (const value of minor_) {
    fruits.push(value + ";");
    }
    return fruits;
    }
    minor = {
    var minor_ = find_all(/(&lt;)/gi, "&lt", ";");
    var fruits = [];
    for (const value of minor_) {
    fruits.push(value + ";");
    }
    return fruits;
    }
    quotes = {
    var d = find_all(/(&quot;)/gi, "&quot", ";");
    var fruits = [];
    for (const value of d) {
    fruits.push(value + ";");
    }
    return fruits;
    }

    
/* ------------------------------------ - ----------------------------------- */

<!-- ----------------------------------------------------------------------- -->
<!--                               custom html                               -->
<!-- ----------------------------------------------------------------------- -->

<!--  -->

htl.html\`<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type"><style type="text/css"> \${style}</style>\`

{
    for (let index = 0; index < ids.length; ++index) {
      var div = document.getElementById(
        ids[index].replace("[", "").replace("]", "")
      );
  
      try {
        div.innerHTML = to_resolve[index];
      } catch (error) {
        console.log(error);
      }
    }
  }






<!--  -->
  <!-- ----------------------------------------------------------------------- -->
  <!--                                functions                                -->
  <!-- ----------------------------------------------------------------------- -->
  function find_all(regexp, start, end) {
    var prl = [];
    var array = [...sdata2.matchAll(regexp)];
    for (let cc = 0; cc < array.length; ++cc) {
      prl.push(
        extractword(
          sdata2.slice(array[cc]["index"], sdata2.length),
          start,
          end
        )[0]
      );
    }
    return prl;
  }
  function extractword(str, start, end) {
    var startindex = str.indexOf(start);
    var endindex = str.indexOf(end, startindex);
    const fruits = [];
    if (startindex != -1 && endindex != -1 && endindex > startindex)
      fruits.push(str.substring(startindex, endindex));
    return fruits;
  }
  function get_span_pos(data, params) {
    var h5 = find_all(/<h5/g, "[", "]");
  
    if (data.indexOf(h5[params]) != -1) {
      return data.indexOf(h5[params]);
    } else {
      return data.length - 14;
    }
  }

  function clean_style(_string, list,replace) {
    for (let dd = 0; dd < list.length; ++dd) {
    _string = _string.replace(list[dd], replace);
    }
    return _string;
    }

  function the_cleaner_sc(sdata2) {
    var tmp1 = clean_style(
    clean_style(clean_style(sdata2, minor, "<"), major, ">"),
    quotes,
    '"'
    );
    return tmp1;
    }
<!--  -->
`)
        ;


doResize();

function doResize() {
    if (tstle) {
        tstle
            .resize()
            .lazyRender()
            ;
    }
}