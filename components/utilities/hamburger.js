var app10 = new omdMod.Observable()
    .target("hamburger")
    .showValues(false)
    .mode("ojs")
    .text(`
<!--  -->


html\`<style>


#\${viewof TripleStripe.id}{
display:flex;
flex-direction:column;
flex-wrap:wrap;
justify-content:space-between;
height:2.5rem;
width:2.5rem;
cursor:pointer;

}


#\${viewof TripleStripe.id}  .bar{
height:5px;
background:black;
border-radius:5px;
margin:3px 0px;
transform-origin:left;
transition:all 0.5s;
}

#\${viewof TripleStripe.id} .close.top {
transform: rotate(45deg);
}

#\${viewof TripleStripe.id} .close.middle {
opacity: 0;
}
#\${viewof TripleStripe.id} .close.bottom {
transform: rotate(-45deg);
}
</style>\`

viewof TripleStripe = {
let refId = DOM.uid('hamburger-menu');
let view = html\`
<div id="\${refId.id}" class="tri-stri">
<div class="bar top"></div>
<div class="bar middle"></div>
<div class="bar bottom"></div>
</div>\`;
view.value = true;
yield view;

d3.select(view).on('click', function() {
let activeState = d3.select(this).classed('active');
// if (activeState === true) {
d3.select(this)
.selectAll('div')
.classed('close', !activeState);
d3.select(this).classed('active', !activeState);
view.value = activeState;
view.value = view.dispatchEvent(new CustomEvent('input'));

// }
});

return view;
}


TripleStripe

hamburger = htl.html\`<div> \${viewof TripleStripe} </div>\`


navs={
    TripleStripe
    while (true) {
      await Promises.delay(300);
      var xx= document.querySelectorAll('.nav');
      return xx;
    }
}



{
    if (TripleStripe==true) {
    /* menu.classList.toggle("active"); */
    
    for (const box of navs) {
        box.classList.remove("active");
      }
    
    }else if (TripleStripe==false){
        for (const box of navs) {
            box.classList.add("active");
          }
    }
     else {
    for (const box of navs) {
        box.classList.remove("active");
      }
    
    }
    }


<!--  -->
`);


doResize();

function doResize() {
    if (app10) {
        app10
            .resize()
            .lazyRender();
    }
}