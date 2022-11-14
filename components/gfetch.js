var tstle = new omdMod.Observable()
    .target("placeholder")
    .showValues(false)
    .mode("ojs")
    .text(`
<!--  -->
/* -------------------------------------------------------------------------- */
/*                                   modules                                  */
/* -------------------------------------------------------------------------- */
import {icon,counter,link,header} from './components/pages/update_link.ojs';

header



/* -------------------------------------------------------------------------- */
/*                                   gfetch                                  */
/* -------------------------------------------------------------------------- */

link


data = {
    return await d3.text(
      link.substr(0, link.indexOf("/edit")) + "/export?format=html"
    );
  }
  

  style = find_all(/<head/g, "<style", "</style>")[0]
  .replace('<style type="text/css">', "")
  .replace(new RegExp("pt;", "g"), "px;")
  .replace(new RegExp("pt}", "g"), "px}")

  
  to_resolve = {
    var render = {
      tag: [],
      html: []
    };
    var fruits = [];
    for (let elm = 0; elm < ids_.length; ++elm) {
      render.html.push(
        the_cleaner_sc(data)
          .substring(
            get_span_pos(the_cleaner_sc(data), elm),
            get_span_pos(the_cleaner_sc(data), elm + 1)
          )
          .replace(ids_[elm], "")
          .replace(new RegExp("</span></h5>", "g"), "")
          .replace(new RegExp(">>", "g"), ">")
      );
      render.tag.push(ids_[elm]);
    }
    return render;
  }

  ids_ = {
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

  ids = {
    var ids = [];
    for (const value of ids_) {
      console.log(value);
      if (value.includes("-src") != true) {
        ids.push(value);
      }
    }
    return ids;
  }
  ids_src = {
    var ids_src = [];
    for (const value of ids_) {
      if (value.includes("-src")) {
        ids_src.push(value);
      }
    }
    return ids_src;
  }

  src = {
    var src = find_all(/<img/g, "src=", '" style');
    var _src = [];
    for (const value of src) {
      _src.push(value.slice(5, value.length));
    }
    return _src;
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

    h5 = {
        var h5 = find_all(/<h5/g, "", ">");
        return h5;
      }
/* ------------------------------------ - ----------------------------------- */

<!-- ----------------------------------------------------------------------- -->
<!--                              rendering custom html                      -->
<!-- ----------------------------------------------------------------------- -->

<!--  -->

htl.html\`<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type"><style type="text/css"> \${style}</style>\`

{
    var iter_src = 0;
    for (let index = 0; index < to_resolve.tag.length; ++index) {
      if (ids.includes(to_resolve.tag[index])) {
        var div = document.getElementById(
          to_resolve.tag[index].replace("[", "").replace("]", "")
        );
  
        try {
          div.innerHTML = to_resolve.html[index];
        } catch (error) {
          console.log(error);
        }
      } else if (ids_src.includes(to_resolve.tag[index])) {
        var img = document.getElementById(
          to_resolve.tag[index].replace("[", "").replace("]", "")
        );
  
        try {
          img.src = src[iter_src];
          iter_src++;
        } catch (error) {
          console.log(error);
        }
      }
    }
  }



<!--  -->
  <!-- ----------------------------------------------------------------------- -->
  <!--                                functions                                -->
  <!-- ----------------------------------------------------------------------- -->
  function find_all(regexp, start, end) {
    var prl = [];
    var array = [...data.matchAll(regexp)];
    for (let cc = 0; cc < array.length; ++cc) {
      prl.push(
        extractword(
          data.slice(array[cc]["index"], data.length),
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
  function get_span_pos(text, params) {
    var h5 = find_all(/<h5/g, "[", "]");
  
    if (text.indexOf(h5[params]) != -1) {
      return text.indexOf(h5[params]);
    } else {
      return text.length - 14;
    }
  }

  function clean_style(_string, list,replace) {
    for (let dd = 0; dd < list.length; ++dd) {
    _string = _string.replace(list[dd], replace);
    }
    return _string;
    }

    function the_cleaner_sc(data) {
        var tmp1 = clean_style(
          clean_style(
            clean_style(clean_style(data, minor, "<"), major, ">"),
            quotes,
            '"'
          ),
          h5,
          ""
        );
        return tmp1;
      }
<!--  -->
`);


doResize();

function doResize() {
    if (tstle) {
        tstle
            .resize()
            .lazyRender();
    }
}