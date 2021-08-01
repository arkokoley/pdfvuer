# Pdfvuer

> A PDF viewer for Vue using Mozilla's PDF.js

[![npm version](https://badge.fury.io/js/pdfvuer.svg)](https://badge.fury.io/js/pdfvuer)

## Install 

For Vue 2:
```
npm install --save pdfvuer
```

For Vue 3:
```
npm i pdfvuer@next --save
```

## Example - basic
```vue
<template>
  <pdf src="./static/relativity.pdf" :page="1">
    <template slot="loading">
      loading content here...
    </template>
  </pdf>
</template>

<script>
import pdf from 'pdfvuer'
import 'pdfjs-dist/build/pdf.worker.entry' // not needed since v1.9.1

export default {
  components: {
    pdf
  }
}
```

## Example - Advanced

```vue
<template>
  <div id="pdfvuer">
    <div id="buttons" class="ui grey three item inverted bottom fixed menu transition hidden">
      <a class="item" @click="page > 1 ? page-- : 1">
        <i class="left chevron icon"></i>
        Back
      </a>
      <a class="ui active item">
        {{page}} / {{ numPages ? numPages : '∞' }}
      </a>
      <a class="item" @click="page < numPages ? page++ : 1">
        Forward
        <i class="right chevron icon"></i>
      </a>
    </div>
    <div id="buttons" class="ui grey three item inverted bottom fixed menu transition hidden">
      <a class="item" @click="scale -= scale > 0.2 ? 0.1 : 0">
        <i class="left chevron icon" />
          Zoom -
      </a>
      <a class="ui active item">
        {{ formattedZoom }} %
      </a>
      <a class="item" @click="scale += scale < 2 ? 0.1 : 0">
        Zoom +
        <i class="right chevron icon" />
      </a>
    </div>
    <pdf :src="pdfdata" v-for="i in numPages" :key="i" :id="i" :page="i"
      :scale.sync="scale" style="width:100%;margin:20px auto;"
        :annotation="true"
        :resize="true"
        @link-clicked="handle_pdf_link">
      <template slot="loading">
        loading content here...
      </template>
    </pdf>
  </div>
</template>

<script>
import pdfvuer from 'pdfvuer'
import 'pdfjs-dist/build/pdf.worker.entry' // not needed since v1.9.1

export default {
  components: {
    pdf: pdfvuer
  },
  data () {
    return {
      page: 1,
      numPages: 0,
      pdfdata: undefined,
      errors: [],
      scale: 'page-width'
    }
  },
  computed: {
    formattedZoom () {
        return Number.parseInt(this.scale * 100);
    },
  },
  mounted () {
    this.getPdf()
  },
  watch: {
    show: function (s) {
      if(s) {
        this.getPdf();
      }
    },
    page: function (p) {
      if( window.pageYOffset <= this.findPos(document.getElementById(p)) || ( document.getElementById(p+1) && window.pageYOffset >= this.findPos(document.getElementById(p+1)) )) {
        // window.scrollTo(0,this.findPos(document.getElementById(p)));
        document.getElementById(p).scrollIntoView();
      }
    }
  },
  methods: {
    handle_pdf_link: function (params) {
      // Scroll to the appropriate place on our page - the Y component of
      // params.destArray * (div height / ???), from the bottom of the page div
      var page = document.getElementById(String(params.pageNumber));
      page.scrollIntoView();
    },
    getPdf () {
      var self = this;
      self.pdfdata = pdfvuer.createLoadingTask('./static/relativity.pdf');
      self.pdfdata.then(pdf => {
        self.numPages = pdf.numPages;
        window.onscroll = function() { 
          changePage() 
          stickyNav()  
        }

        // Get the offset position of the navbar
        var sticky = $('#buttons')[0].offsetTop

        // Add the sticky class to the self.$refs.nav when you reach its scroll position. Remove "sticky" when you leave the scroll position
        function stickyNav() {
          if (window.pageYOffset >= sticky) {
            $('#buttons')[0].classList.remove("hidden")
          } else {
            $('#buttons')[0].classList.add("hidden")
          }
        }

        function changePage () {
          var i = 1, count = Number(pdf.numPages);
          do {
            if(window.pageYOffset >= self.findPos(document.getElementById(i)) && 
                window.pageYOffset <= self.findPos(document.getElementById(i+1))) {
              self.page = i
            }
            i++
          } while ( i < count)
          if (window.pageYOffset >= self.findPos(document.getElementById(i))) {
            self.page = i
          }
        }
      });
    },
    findPos(obj) {
      return obj.offsetTop;
    }
  }
}
</script>
<style src="pdfvuer/dist/pdfvuer.css"></style>
<style lang="css" scoped>
  #buttons {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  /* Page content */
  .content {
    padding: 16px;
  }
</style>

```

## API

### Props

#### :src <sup>String / Object - default: ''<sup>
The url of the pdf file. `src` may also be a `string|TypedArray|DocumentInitParameters|PDFDataRangeTransport` for more details, see [`PDFJS.getDocument()`](https://github.com/mozilla/pdf.js/blob/8ff1fbe7f819513e7d0023df961e3d223b35aefa/src/display/api.js#L117).

#### :page <sup>Number - default: 1<sup>
The page number to display.

#### :rotate <sup>Number - default: 0<sup>
The page rotation in degrees, only multiple of 90 are valid.

#### :scale <sup>Number / String - default: 'page-width' - .sync</sup>
The scaling factor. By default, the pdf will be scaled to match the page width
with the container width.
When passed value `page-width` and / or using `resize` prop, will send back the scale
computed accordingly via `update:scale` event (use it with `scale.sync="scale"`)

#### :resize <sup>Boolean - default: false</sup>
Enable Auto Resizing on window resize. By default, autoresizing is disabled.

#### :annotation <sup>Boolean - default: false</sup>
Show the annotations in the pdf. By default, annotation layer is disabled.

#### :text <sup>Boolean - default: true</sup>
Show the text layer in the pdf. By default, text layer is enabled.

### Events

#### @numpages <sup>Number<sup>
The total number of pages of the pdf.

#### @loading <sup>Boolean<sup>
The provided PDF's loading state

#### @error <sup>Function<sup>
Function handler for errors occurred during loading/drawing PDF source.

#### @link-clicked <sup>Function<sup>
Function handler for errors occurred during loading/drawing PDF source.
Example:
```js
    handle_pdf_link: function (params) {
      // Scroll to the appropriate place on our page - the Y component of
      // params.destArray * (div height / ???), from the bottom of the page div
      var page = document.getElementById(String(params.pageNumber));
      page.scrollIntoView();
    }
```


### Public static methods

#### createLoadingTask(src)
  * `src`: see `:src` prop  
  This function creates a PDFJS loading task that can be used and reused as `:src` property.  

## Public Demo

Advanced Example - [https://arkokoley.github.io/pdfvuer](https://arkokoley.github.io/pdfvuer)

[Used in production by  Gratia](https://goodwill.zense.co.in/resources/1)

> Made with :heart: in Bangalore, India

## License 
MIT &copy; [Gaurav Koley](https://gaurav.koley.in), 2021
