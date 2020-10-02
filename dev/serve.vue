<template>
  <div id="pdfvuer">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.9/semantic.min.css">
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
      :scale.sync="scale" style="width:100%;margin:20px auto;">
      <template slot="loading">
        loading content here...
      </template>
    </pdf>
  </div>
</template>

<script>
import pdfvuer from '../src/Pdfvuer'
import $ from "jquery";

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
    getPdf () {
      var self = this;
      self.pdfdata = pdfvuer.createLoadingTask('http://africau.edu/images/default/sample.pdf');
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