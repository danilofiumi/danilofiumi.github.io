var app = new omdMod.Observable()
.target("placeholder")
.showValues(false)
.mode("ojs")
.text(`

<!--  -->
link=document.getElementById('link').innerText


sdata2 = {
return await d3.text(
link.substr(0, link.indexOf("/edit")) + "/export?format=html"
);
}

(el.innerHTML = data)

el = {
await new Promise((r) => setTimeout(r, 1000));
return document.createElement("div");
}

el.setAttribute("id", "testid")

clss=["p-6", "has-padding-mobile"]

el.setAttribute("class", "pt-3 pl-6 pr-6 has-padding-mobile")


/* generator(data, el.getElementsByTagName("img")[0].getAttribuCte("src")) */

/* el.getElementsByTagName("table") */

/* abcElements = \$("#testid > * ").each(function () {
return alert.value;
}) */

/* abcElements[13].tagName */


<!--  -->
<!-- utilities -->
function add_ids(sdata2) {
var abcElements = \$("#testid > *").each(function () {
return alert.value;
});
for (var i = 0; i < abcElements.length; i++) abcElements[i].id = "abc-" + i;
}



function change_element(asis, tobe) {
var index;
// Copy the children
while (asis.firstChild) {
tobe.appendChild(asis.firstChild); // *Moves* the child
}

// Copy the attributes
for (index = asis.attributes.length - 1; index >= 0; --index) {
tobe.attributes.setNamedItem(asis.attributes[index].cloneNode());
}

// Replace it
asis.parentNode.replaceChild(tobe, asis);
}

table = el.getElementsByTagName("table")

tobe = "div"

classesToAddclms = ["columns", "is-vcentered"]
classesToAddclm = ["column"]

function fix_table() {
for (let f = 0; f < table.length; ++f) {
for (let h = 0; h < table[f].children.length; ++h) {
for (let z = 0; z < table[f].children[h].children.length; ++z) {
for (
let x = 0;
x < table[f].children[h].children[z].children.length;
++x
) {
table[f].children[h].children[z].children[x].classList.add(...classesToAddclm);
change_element(
table[f].children[h].children[z].children[x],
document.createElement(tobe)
);
}
table[f].children[h].children[z].classList.add(...classesToAddclms);
table[f].children[h].children[z].style.height="100%";
change_element(
table[f].children[h].children[z],
document.createElement(tobe)
);
}
table[f].children[h].classList.add("p-0");
change_element(table[f].children[h], document.createElement(tobe));
}
table[f].classList.add("p-0");
change_element(table[f], document.createElement(tobe));
var x = f;
}
return x;
}

function massive_change(element, tobe) {
for (let f = 0; f < element.length; ++f) {
change_element(element[f], document.createElement(tobe));
var x = f;
}
return x;
}

/* massive_change(table, "div") */

function* generator(variab, elem) {
while (true) {
yield elem;
}
}

{
await new Promise((r) => setTimeout(r, 250));
for (let index = 0; index < 10; ++index) {
massive_change(el.getElementsByTagName("p"), "div");
};

for (let index = 0; index < 10; ++index) {
fix_table();
};
add_ids(data);

}


<!--  -->

regexp = /(height)/gi

array = [...sdata2.matchAll(regexp)]

function extractword(str, start, end) {
var startindex = str.indexOf(start);
var endindex = str.indexOf(end, startindex);
const fruits = [];
if (startindex != -1 && endindex != -1 && endindex > startindex)
fruits.push(str.substring(startindex, endindex));
return fruits;
}

x = extractword(sdata2, ";width:", "pt;")

/* data = sdata2.replace(/(;width:).*pt;/gm, ";") */

function remove_style(regexp,start,end) {
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

width_rm = remove_style(/(width:)/gi, "width:", ";")

height_rm_ = remove_style(/(height)/gi, "height:", "}")
border_rm = remove_style(/(border)/gi, "border", "solid")



results = height_rm_.filter((element) => {
return element !== undefined;
})

height_rm = {
var fruits = [];
for (const value of results) {
if (value.length < 20) {
fruits.push(value);
}
}
return fruits;
}

wdt = {
var wdt = [];
for (const value of width_rm) {
if (value !== undefined){
wdt.push(value)};
}
return wdt;
}

major = {
var minor_ = remove_style(/(&gt;)/gi, "&gt", ";");
var fruits = [];
for (const value of minor_) {
fruits.push(value + ";");
}
return fruits;
}
minor = {
var minor_ = remove_style(/(&lt;)/gi, "&lt", ";");
var fruits = [];
for (const value of minor_) {
fruits.push(value + ";");
}
return fruits;
}
quotes = {
var d = remove_style(/(&quot;)/gi, "&quot", ";");
var fruits = [];
for (const value of d) {
fruits.push(value + ";");
}
return fruits;
}
<!-- padding_rm = remove_style(/(padding-)/gi, "padding", ";") -->

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

function the_cleaner(sdata2) {
var tmp1 = clean_style(
clean_style(
clean_style(
clean_style(
clean_style(clean_style(sdata2, wdt, ""), ["height:0pt"], ""),
border_rm,
""
),
minor,
"<"
),
major,
">"
),
quotes,
'"'
);

return tmp1;
}

h6 = remove_style(/(<h6)/gi, "<h6", "/h6>")

data = {
//inizio
var base = "";
var to_change1 = sdata2.substring(0, sdata2.indexOf(h6[0]));

base = base.concat(the_cleaner(to_change1));

function lp(base) {
for (let mm = 0; mm < h6.length - 1; ++mm) {
var safe = h6[mm];
var len_intermedia = safe.length;

var to_change = sdata2.substring(
sdata2.indexOf(h6[mm]) + len_intermedia,
sdata2.indexOf(h6[mm + 1])
);

base = base.concat(the_cleaner_sc(safe), the_cleaner(to_change));
}
return base;
}
base = lp(base);

//fine
var safe_row2 = h6[h6.length - 1];
var len_intermedia_f = safe_row2.length;

var to_change3 = sdata2.substring(
sdata2.indexOf(safe_row2) + len_intermedia_f,
sdata2.length
);

base = base.concat(the_cleaner_sc(safe_row2), the_cleaner(to_change3));

return base;
}

\$ = require("jquery")




<!--  -->
`)

;

doResize();

function doResize() {
if (app) {
    app
        .resize()
        .lazyRender();
}
}
