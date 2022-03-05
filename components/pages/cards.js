        var cards = new omdMod.Observable()
        .target("placeholder")
        .showValues(false)
        .mode("ojs")
        .text(`
<!--  -->
link = "https://docs.google.com/document/d/1PEy7Bfk_z5farrxHhU4tNbj8bX9pfI92Q_YTc5Psy6Q/edit?usp=sharing"
sdata2 = {
return await d3.text(
  link.substr(0, link.indexOf("/edit")) + "/export?format=html"
);
}



ref={
var ref = find_all(/<a/g, "href=", ";");
var _ref = [];
for (const value of ref) {
    _ref.push(value.slice(35, value.length-4));
}

return _ref;
}


src= {
var src = find_all(/<img/g, "src=", '" style');
var _src = [];
for (const value of src) {
  _src.push(value.slice(5, value.length));
}
return _src;
};

span={
var span_ = find_all(/<span/g, ">", "<");
var span=[]
for (const value of span_) {
if (value!=">"){
  span.push(value.slice(1,value.lenght))
}
}return span}

title = {
var title = [];
for (let index = 0; index < span.length; ++index) {
  if (index % 2 != 1) {
    title.push(span[index]);
  }
}
return title;
}

date = {
var title = [];
for (let index = 0; index < span.length; ++index) {
  if (index % 2 == 1) {
    title.push(span[index]);
  }
}
return title;
}


<!-- ----------------------------------------------------------------------- -->
<!--                               custom html                               -->
<!-- ----------------------------------------------------------------------- -->

<!--  -->
div={
    await new Promise((r) => setTimeout(r, 1350));
    
    var portfolio=document.getElementById("portfolio");
    var div = portfolio.appendChild(document.createElement("div"));
    div.classList.add(...["columns", "has-text-centered", "is-multiline"]);
    return div;
  }

function ptf(params) {

if (ref[params]!=undefined){  
        
  var sect = div.appendChild(document.createElement("div"));
  sect.classList.add(...["column", "is-one-quarter", "has-text-centered"]);

  var div1 = sect.appendChild(document.createElement("div"));
  div1.classList.add("has-text-centered");
  div1.style="height:80%;"
  //a
  var a = div1.appendChild(document.createElement("a"));
  a.href = ref[params];
  a.style="color:black; opacity:0.9"
  //img
  var img = a.appendChild(document.createElement("img"));
  img.style="border-radius: 40px; height:185px;"
  img.src = src[params];
  img.classList.add("clip");
  

  //div
  var div_title = a.appendChild(document.createElement("div"));
  div_title.innerText = title[params];

  var div_date = a.appendChild(document.createElement("div"));
  div_date.innerText = date[params];
  div_date.classList.add("is-size-7");
}
}



mutable counter = 0

function add_cards(from, to) {
    for (let index = from; index < to; ++index) {
      ptf(index);
    }
    mutable counter += 1;
  }

  caricati=8
  
  {
    {
      await new Promise((r) => setTimeout(r, 1350));
      

      var sentinel= document.getElementById("sentinel");
      sentinel.classList.add("sentinella")
      sentinel.style="margin-top: 1em;"
      var loader = sentinel.appendChild(document.createElement("div"));
      loader.classList.add("loader")
      
      
    }
  }

  
  


  subject = {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.pop();
        
        if ((entry.intersectionRatio * 100).toFixed(0) == 100) {
            
            setTimeout(function () {
                add_cards(counter*caricati,caricati*(counter+1));
                console.log(counter)
            }, 1000);
            }
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100)
      }
    );
    observer.observe(sentinel);
    invalidation.then(() => observer.disconnect());
    return sentinel;
  }
  {
    
    console.log(counter*caricati)
    console.log(ref.length)
    if  (counter*caricati>=ref.length) {
        sentinel.children[0].classList.remove("loader");
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
`)
        ;

    doResize();

    function doResize() {
        if (cards) {
            cards
                .resize()
                .lazyRender()
                ;
        }
    }
