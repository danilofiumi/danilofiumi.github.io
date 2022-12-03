var omdMod = window["@hpcc-js/observable-md"]
var tstle = new omdMod.Observable()
    .target("main")
    .showValues(true)
    .mode("ojs")
    .text(`
<!--  -->
/* -------------------------------------------------------------------------- */
/*                                   modules                                  */
/* -------------------------------------------------------------------------- */

viewof btn = htl.html\`<button class='button btn-cstm' type="button" ><svg width="25" height="28" viewBox="0 0 34 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.1001 27.7999C8.37194 27.7999 2.14648 21.5744 2.14648 13.8463C2.14648 10.4115 3.43451 7.19147 5.68855 4.61542L7.29858 6.01078C5.36654 8.15749 4.29319 10.9482 4.29319 13.8463C4.29319 20.3937 9.55263 25.6532 16.1001 25.6532C17.8174 25.6532 19.4275 25.3311 21.0375 24.5798L21.8962 26.5118C20.0715 27.3705 18.1395 27.7999 16.1001 27.7999ZM26.5116 23.1844L24.9016 21.7891C26.8336 19.6424 27.907 16.8517 27.907 13.9536C27.907 7.40614 22.6475 2.14671 16.1001 2.14671C14.3827 2.14671 12.7727 2.46871 11.1627 3.22006L10.304 1.28802C12.1287 0.429341 14.0607 0 16.1001 0C23.8282 0 30.0537 6.22545 30.0537 13.9536C30.0537 17.281 28.7657 20.6084 26.5116 23.1844Z" fill="#D9D9D9"/>
    <path d="M8.58683 12.7729H6.44012V6.33274H0V4.18604H8.58683V12.7729ZM32.2006 23.5064H23.6138V14.9196H25.7605V21.3597H32.2006V23.5064Z" fill="#D9D9D9"/>
    </svg>
</button>\` 


viewof object = form(html\`<form>
    <div class="has-text-centered"  >
    <label>
    <input required class='centrati' list="programmingLanguages" name="message" type="text" value="" placeholder="Paste your Google Doc link here">
    <datalist id="programmingLanguages">
    <option value="https://docs.google.com/document/d/1r17w8tD5-ZB2Zf3_BB68wv11gq5OCfSxEozNhwXpaGI/edit?usp=sharing">example link</option>
    </datalist>
    \${viewof btn}

    </label></div>
  </form>\`)

d

link={
btn;
return object.message;
}





/* -------------------------------------------------------------------------- */
/*                                   gfetch                                  */
/* -------------------------------------------------------------------------- */




sdata2 = {
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
        the_cleaner_sc(sdata2)
          .substring(
            get_span_pos(the_cleaner_sc(sdata2), elm),
            get_span_pos(the_cleaner_sc(sdata2), elm + 1)
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
          'demo-'+to_resolve.tag[index].replace("[", "").replace("]", "")
        );
  
        try {
          div.innerHTML = to_resolve.html[index];
        } catch (error) {
          console.log(error);
        }
      } else if (ids_src.includes(to_resolve.tag[index])) {
        var img = document.getElementById(
            'demo-'+to_resolve.tag[index].replace("[", "").replace("]", "")
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
          clean_style(
            clean_style(clean_style(sdata2, minor, "<"), major, ">"),
            quotes,
            '"'
          ),
          h5,
          ""
        );
        return tmp1;
      }


      <!-- ----------------------------------------------------------------------- -->
      <!--                                utilities                                -->
      <!-- ----------------------------------------------------------------------- -->
      function formValue(form) {
        const object = {};
        for (const input of form.elements) {
          if (input.disabled || !input.hasAttribute("name")) continue;
          let value = input.value;
          switch (input.type) {
            case "range":
            case "number": {
              value = input.valueAsNumber;
              break;
            }
            case "date": {
              value = input.valueAsDate;
              break;
            }
            case "radio": {
              if (!input.checked) continue;
              break;
            }
            case "checkbox": {
              if (input.checked) value = true;
              else if (input.name in object) continue;
              else value = false;
              break;
            }
            case "file": {
              value = input.multiple ? input.files : input.files[0];
              break;
            }
            case "select-multiple": {
              value = Array.from(input.selectedOptions, option => option.value);
              break;
            }
          }
          object[input.name] = value;
        }
        return object;
      }
      function form(form) {
        const container = html\`<div>\${form}\`;
        form.addEventListener("submit", event => event.preventDefault());
        form.addEventListener("change", () => container.dispatchEvent(new CustomEvent("input")));
        form.addEventListener("input", () => container.value = formValue(form));
        container.value = formValue(form);
        return container
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