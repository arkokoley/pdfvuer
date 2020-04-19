<template>
  <div>
    <slot v-if="loading" name="loading"/>
    <div id="viewerContainer" ref="container">
      <div id="viewer" class="pdfViewer"/>
      <resizeSensor :initial="true" @resize="resizeScale"/>
    </div>
  </div>
</template>
<script>
  'use strict';

  import 'pdfjs-dist/web/pdf_viewer.css';
  import pdfjsLib from 'pdfjs-dist/webpack.js';
  import { DefaultAnnotationLayerFactory, DefaultTextLayerFactory, PDFLinkService, PDFPageView } from 'pdfjs-dist/web/pdf_viewer.js';
  import resizeSensor from 'vue-resize-sensor'

  function isPDFDocumentLoadingTask(obj) {
    return typeof (obj) === 'object' && obj !== null && obj.__PDFDocumentLoadingTask === true;
  }

  function createLoadingTask(src, options) {
    var source;
    if (typeof (src) === 'string')
      source = {url: src};
    else if (typeof (src) === 'object' && src !== null)
      source = Object.assign({}, src);
    else
      throw new TypeError('invalid src type');

    var loadingTask = pdfjsLib.getDocument(source).promise;
    loadingTask.__PDFDocumentLoadingTask = true; // since PDFDocumentLoadingTask is not public

    if (options && options.onPassword)
      loadingTask.onPassword = options.onPassword;

    if (options && options.onProgress)
      loadingTask.onProgress = options.onProgress;

    return loadingTask;
  }

  export default {
    createLoadingTask: createLoadingTask,
    components: {
      resizeSensor
    },
    props: {
      src: {
        type: [String, Object, Promise],
        default: '',
      },
      page: {
        type: Number,
        default: 1,
      },
      rotate: {
        type: Number,
        default: 0,
      },
      scale: {
        type: [Number, String],
        default: 'page-width',
      },
      resize: {
        type: Boolean,
        default: false,
      },
      annotation: {
        type: Boolean,
        default: false,
      },
      text: {
        type: Boolean,
        default: true,
      },
    },
    data: function () {
      return {
        internalSrc: this.src,
        pdf: null,
        pdfViewer: null,
        loading: true,
      }
    },
    watch: {
      pdf: function (val) {
        var pdfInfo = val.pdfInfo || val._pdfInfo
        this.$emit('numpages', pdfInfo.numPages);
      },
      page: function (val) {
        var self = this;
        this.pdf.getPage(val).then(function (pdfPage) {
          self.pdfViewer.setPdfPage(pdfPage);
          self.pdfViewer.draw();
        });
      },
      scale: function (val) {
        this.drawScaled(val);
      },
      rotate: function (newRotate) {
        if (this.pdfViewer) {
          this.pdfViewer.update(this.scale, newRotate);
          this.pdfViewer.draw();
        }
      },
    },
    mounted: function () {
      var self = this;
      if (!isPDFDocumentLoadingTask(self.internalSrc)) {
        self.internalSrc = createLoadingTask(self.internalSrc);
        self.$emit('loading', true);
      }

      var container = this.$refs.container;

      // (Optionally) enable hyperlinks within PDF files.
      var pdfLinkService = new PDFLinkService();

      // self.pdf = pdfSinglePageViewer;
      // console.log(self.pdf.currentScaleValue);
      // pdfLinkService.setViewer(self.pdf);
      //
      // // (Optionally) enable find controller.
      // var pdfFindController = new PDFFindController({
      //   pdfViewer: self.pdf,
      // });
      // self.pdf.setFindController(pdfFindController);
      //
      // container.addEventListener('pagesinit', function () {
      //   // We can use pdfSinglePageViewer now, e.g. let's change default scale.
      //   self.pdf.currentScaleValue = 'page-width';
      //
      //   if (SEARCH_FOR) { // We can try search for things
      //     pdfFindController.executeCommand('find', {query: SEARCH_FOR});
      //   }
      // });
      //
      let annotationLayer = undefined, textLayer = undefined;
      if (self.annotation) {
        annotationLayer = new DefaultAnnotationLayerFactory();
      }
      if (self.text) {
        textLayer = new DefaultTextLayerFactory();
      }

      self.internalSrc
        .then(function (pdfDocument) {
          // Document loaded, retrieving the page.
          self.pdf = pdfDocument;
          return pdfDocument.getPage(self.page)
        }).then(function (pdfPage) {
        // Creating the page view with default parameters.
        self.pdfViewer = new PDFPageView({
          container: container,
          id: self.page,
          scale: 1,
          defaultViewport: pdfPage.getViewport({scale: 1}),
          // We can enable text/annotations layers, if needed
          textLayerFactory: textLayer,
          annotationLayerFactory: annotationLayer,
        });
        // Associates the actual page with the view, and drawing it
        self.pdfViewer.setPdfPage(pdfPage);
        pdfLinkService.setViewer(self.pdfViewer);
        self.drawScaled(self.scale);
      }).catch(err => self.$emit('error', err))
    },
    beforeDestroy() {
      var self = this;
      if (self.pdfViewer) {
        self.pdfViewer.destroy();
        self.pdfViewer = null;
      }
    },
    methods: {
      calculateScale: function (width = -1, height = -1) {
        this.pdfViewer.update(1, this.rotate); // Reset scaling to 1 so that "this.pdfViewer.viewport.width" gives proper width;
        if (width === -1 && height === -1) {
          width = this.$refs.container.offsetWidth;
        }

        return width / this.pdfViewer.viewport.width;
      },
      drawScaled: function (newScale) {
        if (this.pdfViewer) {
          if (newScale === 'page-width') {
            newScale = this.calculateScale();
            this.$emit("update:scale", newScale);
          }
          this.pdfViewer.update(newScale, this.rotate);
          this.pdfViewer.draw();
          this.loading = false;
          this.$emit('loading', false);
        }
      },
      resizeScale: function () {
        if (this.resize) {
          this.drawScaled('page-width');
        }
      }
    }
  }
</script>
