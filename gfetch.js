var omdMod = window["@hpcc-js/observable-md"]
var app = new omdMod.Observable()
    .target("placeholder")
    .showValues(false)
    .mode("ojs")
    .text(`
<!--  -->
/* -------------------------------------------------------------------------- */
/*                                   gfetch                                  */
/* -------------------------------------------------------------------------- */


link = document.getElementById('link').innerText;

async function getResponse(link) {
  const response = await fetch(
    link.substr(0, link.indexOf("/edit")) + "/export?format=html",
    {
      method: "GET"
    }
  );
  const data = await response.text(); // Extracting data as a JSON Object from the response
  return data;
}

data = getResponse(link)
console.log(data)


style = find_all(/<head/g, "<style", "</style>")[0]
  .replace('<style type="text/css">', "")
  .replace(new RegExp("pt;", "g"), "px;")
  .replace(new RegExp("pt}", "g"), "px}")

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

src = {
  var src = find_all(/<img/g, "src=", '" style');
  var _src = [];
  for (const value of src) {
    _src.push(value.slice(5, value.length));
  }
  return _src;
}

ids_ = {
  var tmp_ = find_all(/<h5/g, "[", "</span>");
  return tmp_;
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



major = {
  var minor_ = find_all(/(&gt;)/gi, "&gt", ";");
  var _tmp = [];
  for (const value of minor_) {
    _tmp.push(value + ";");
  }
  return _tmp;
}

minor = {
  var minor_ = find_all(/(&lt;)/gi, "&lt", ";");
  var _tmp = [];
  for (const value of minor_) {
    _tmp.push(value + ";");
  }
  return _tmp;
}

quotes = {
  var d = find_all(/(&quot;)/gi, "&quot", ";");
  var _tmp = [];
  for (const value of d) {
    _tmp.push(value + ";");
  }
  return _tmp;
}

h5 = {
  var h5 = find_all(/<h5/g, "", ">");
  return h5;
}





htl.html\`<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type"><style type="text/css"> \${style}</style>\`

to_resolve = {
  var render = {
    tag: [],
    html: []
  };
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


<!-- ----------------------------------------------------------------------- -->
<!--                                functions                                -->
<!-- ----------------------------------------------------------------------- -->



function find_all(regexp, start, end, string = data) {
  var prl = [];
  var array = [...string.matchAll(regexp)];
  for (let cc = 0; cc < array.length; ++cc) {
    prl.push(
      extractword(
        string.slice(array[cc]["index"], string.length),
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
    if (Array.isArray(replace)) {
      _string = _string.replace(list[dd], replace[dd]);
    } else {
      _string = _string.replace(list[dd], replace);
    }
  }
  return _string;
}

function the_cleaner_sc(data) {
  var tmp1 = 
    clean_style(
      clean_style(
        clean_style(clean_style(data, minor, "<"), major, ">"),
        quotes,
        '"'
      ),
      h5,
      ""
    )
    ;
  return tmp1;
}
`);


doResize();

function doResize() {
    if (app) {
        app
            .resize()
            .lazyRender();
    }
}