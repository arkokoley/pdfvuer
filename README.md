# Pdfvuer

> A PDF viewer for Vue using Mozilla's PDF.js

## Install
```
npm install --save vue-pdf
```

## Example - basic
```
<template>
  <pdf src="./static/relativity.pdf" :page=1></pdf>
</template>

<script>
import pdf from 'pdfvuer'

export default {
  components: {
    pdf
  }
}
```


## API

### Props

#### :src <sup>String / Object - default: ''<sup>
The url of the pdf file. `src` may also be a `string|TypedArray|DocumentInitParameters|PDFDataRangeTransport` for more details, see [`PDFJS.getDocument()`](https://github.com/mozilla/pdf.js/blob/8ff1fbe7f819513e7d0023df961e3d223b35aefa/src/display/api.js#L117).

#### :page <sup>Number - default: 1<sup>
The page number to display.

#### :rotate <sup>Number - default: 0<sup>
The page rotation in degrees, only multiple of 90 are valid.

#### :scale <sup>Number / String - default: 'page-width'</sup>
The scaling factor. By default, the pdf will be scaled to match the page width
with the container width.

### Events

#### @numpages <sup>Number<sup>
The total number of pages of the pdf.

### Public static methods

#### createLoadingTask(src)
  * `src`: see `:src` prop  
  This function creates a PDFJS loading task that can be used and reused as `:src` property.  

## Public Demo
[Used in production by Gratiato](https://goodwill.zense.co.in/resources/1)

> Made with :heart: at [IIIT Bangalore](http://iiitb.ac.in)

## License 
MIT &copy; [Gaurav Koley](https://gaurav.koley.in), 2018
