<template>
	<div>
		<slot v-if="loading" name="loading"/>
		<div id="viewerContainer" ref="container">
			<div id="viewer" class="pdfViewer"></div>
			<resizeSensor :initial="true" @resize="resizeScale"/>
		</div>
	</div>
</template>
<script>
'use strict';

import 'pdfjs-dist/web/pdf_viewer.css';
import pdfjsLib from 'pdfjs-dist/webpack.js';
import {PDFLinkService, PDFPageView, PDFFindController, DefaultAnnotationLayerFactory, DefaultTextLayerFactory } from 'pdfjs-dist/web/pdf_viewer.js';
import resizeSensor from 'vue-resize-sensor'

const DEFAULT_SCALE_DELTA = 1.1;
const MIN_SCALE = 0.25;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE_VALUE = 'auto';
const CSS_UNITS = 96.0 / 72.0;

function isPDFDocumentLoadingTask(obj) {
	return typeof(obj) === 'object' && obj !== null && obj.__PDFDocumentLoadingTask === true;
}

function createLoadingTask(src, options) {
	var source;
	if ( typeof(src) === 'string' )
		source = { url: src };
	else
	if ( typeof(src) === 'object' && src !== null )
		source = Object.assign({}, src);
	else
		throw new TypeError('invalid src type');

	// see https://github.com/mozilla/pdf.js/blob/628e70fbb5dea3b9066aa5c34cca70aaafef8db2/src/display/dom_utils.js#L64
	source.CMapReaderFactory = function() {

		this.fetch = function(query) {

			return import('raw-loader!pdfjs-dist/cmaps/'+query.name+'.bcmap' /* webpackChunkName: "noprefetch-[request]" */)
			.then(function(bcmap) {

				return {
					cMapData: bcmap,
					compressionType: pdfjsLib.CMapCompressionType.BINARY,
				};
			});
		}
	};


	var loadingTask = pdfjsLib.getDocument(source);
	loadingTask.__PDFDocumentLoadingTask = true; // since PDFDocumentLoadingTask is not public

	if ( options && options.onPassword )
		loadingTask.onPassword = options.onPassword;

	if ( options && options.onProgress )
		loadingTask.onProgress = options.onProgress;

	return loadingTask;
}

export default {
	createLoadingTask: createLoadingTask,
	components: {
		resizeSensor
	},
	data() {
		return {
			internalSrc: this.src,
			pdf: null,
			pdfViewer: null,
			loading: true,
		}
	},
	props: {
		src: {
			type: [String, Object],
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
			default: 1,
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
	watch: {
		pdf: function(val) {
			var pdfInfo = val.pdfInfo || val._pdfInfo
      		this.$emit('numpages', pdfInfo.numPages);
		},
		page: function(val) {
			var self = this;
			this.pdf.getPage(val).then(function (pdfPage) {
		    self.pdfViewer.setPdfPage(pdfPage);
				self.pdfViewer.draw();
			});
		},
    scale: function(val) {
			this.drawScaled(val);
		},
		rotate: function(newRotate) {
			if (this.pdfViewer) {
				this.pdfViewer.update(this.scale,newRotate);
				this.pdfViewer.draw();
			}
		},
	},
  methods: {
		calculateScale: function(width=-1, height=-1) {
			this.pdfViewer.update(1,this.rotate); // Reset scaling to 1 so that "this.pdfViewer.viewport.width" gives proper width;
			if(width === -1 && height === -1){
				width = this.$refs.container.offsetWidth;
				height = this.$refs.container.height;
			}
			let pageWidthScale = width / this.pdfViewer.viewport.width * 1;
			let pageHeightScale = height / this.pdfViewer.viewport.height * 1;
			return pageWidthScale;
		},
		drawScaled: function(newScale) {
			if (this.pdfViewer) {
				if(newScale === 'page-width') {
					newScale = this.calculateScale();
					this.$emit("update:scale", newScale);
				}
				this.pdfViewer.update(newScale,this.rotate);
				this.pdfViewer.draw();
				this.loading = false;
				this.$emit('loading', false);
			}
		},
		resizeScale: function(size) {
			if(this.resize) {
				this.drawScaled('page-width');
			}
		}
  },
	// doc: mounted hook is not called during server-side rendering.
	mounted: function() {
		var self = this;
		if(!isPDFDocumentLoadingTask(self.internalSrc)){
				self.internalSrc = createLoadingTask(self.internalSrc);
        self.$emit('loading', true);
		}

		var SEARCH_FOR = 'Mozilla'; // try 'Mozilla';

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
		if(self.annotation){
			annotationLayer = new DefaultAnnotationLayerFactory();
		}
		if(self.text){
			textLayer = new DefaultTextLayerFactory();
		}

		self.internalSrc
		.then(function(pdfDocument) {
		  // Document loaded, retrieving the page.
			self.pdf = pdfDocument;
		  return pdfDocument.getPage(self.page)
		}).then(function (pdfPage) {
	    // Creating the page view with default parameters.
	    self.pdfViewer = new PDFPageView({
	      container: container,
	      id: self.page,
	      scale: 1,
	      defaultViewport: pdfPage.getViewport(1),
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
}
</script>
