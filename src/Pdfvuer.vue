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

  import { getDocument } from 'pdfjs-dist';
  import {
    DefaultAnnotationLayerFactory,
    DefaultTextLayerFactory,
    PDFFindController,
    PDFLinkService,
    PDFPageView,
    EventBus
  } from 'pdfjs-dist/web/pdf_viewer.js';
  import resizeSensor from 'vue-resize-sensor'
  import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'
  function isPDFDocumentLoadingTask(obj) {
    return typeof (obj) === 'object' && obj !== null && obj.__PDFDocumentLoadingTask === true;
  }

  export function createLoadingTask(src, options) {
    var source;
    if (typeof (src) === 'string')
      source = {
        url: src
      };
    else if (typeof (src) === 'object' && src !== null)
      source = Object.assign({}, src);
    else
      throw new TypeError('invalid src type');

    var loadingTask = getDocument(source).promise;
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
      var eventBus = new EventBus();

      // (Optionally) enable hyperlinks within PDF files.
      self.pdfLinkService = new PDFLinkService({
        eventBus: eventBus,
        externalLinkTarget: 2
      });

      // (Optionally) enable find controller.
      self.pdfFindController = new PDFFindController({
        eventBus: eventBus,
        linkService: self.pdfLinkService
      });

      let annotationLayer = undefined,
        textLayer = undefined;

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
            defaultViewport: pdfPage.getViewport({
              scale: 1
            }),
            eventBus: eventBus,
            textLayerFactory: textLayer,
            annotationLayerFactory: annotationLayer,
          });
          // Associates the actual page with the view, and drawing it
          self.pdfViewer.setPdfPage(pdfPage);
          // Set up a scrollPageIntoView function for our links
          var viewer = {
            scrollPageIntoView: function(params) {
              // Send an event when clicking internal links so we can handle loading/scrolling to the correct page
              self.$emit('link-clicked', params);
            },
          };
          self.pdfLinkService.setDocument(self.pdf);
          self.pdfLinkService.setViewer(viewer);
          self.pdfFindController.setDocument(self.pdf);
          self.drawScaled(self.scale);

          self.loading = false;
          self.$emit('loading', false);
        }).catch(err => {
          self.$emit('error', err)
          self.loading = false
          self.$emit('loading', false);
        })
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
      calculateScaleHeight: function () {
        this.pdfViewer.update(1, this.rotate); // Reset scaling to 1 so that "this.pdfViewer.viewport.width" gives proper width;
        var height = this.$refs.container.offsetHeight;
        var parentel = this.$refs.container.parentElement.parentElement;
        return parentel.offsetHeight / height;
      },
      drawScaled: function (newScale) {
        if (this.pdfViewer) {
          if (newScale === 'page-width') {
            newScale = this.calculateScale();
            this.$emit("update:scale", newScale);
          }
          else if (newScale === 'page-height') {
            newScale = this.calculateScaleHeight();
            this.$emit("update:scale", newScale);
          }
          this.pdfViewer.update(newScale, this.rotate);
          // The SimpleLinkService from the DefaultAnnotationLayerFactory doesn't do anything with links so override with our LinkService after it is created
          if(this.annotation) {
            this.pdfViewer.annotationLayer = this.pdfViewer.annotationLayerFactory.createAnnotationLayerBuilder(this.pdfViewer.div, this.pdfViewer.pdfPage);
            this.pdfViewer.annotationLayer.linkService = this.pdfLinkService;
          }
          this.pdfViewer.draw();
          // The findController needs the text layer to have been created in the Draw() function, so link it in now
          if (this.text) {
            this.pdfViewer.textLayer.findController = this.pdfFindController;
          }
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
<style src="pdfjs-dist/web/pdf_viewer.css"></style>