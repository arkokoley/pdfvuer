<style>
@keyframes resizeSensorVisibility {
	from { top: 0; }
}
</style>

<script>
"use strict";
import {h} from 'vue'
export default {
	// thanks to https://github.com/marcj/css-element-queries
	props: {
		initial: {
			type: Boolean,
			default: false,
		}
	},
	data: function() {
		return {
			size: {
				width: -1,
				height: -1
			}
		}
	},
	methods: {
		reset: function() {
			var expand = this.$el.firstChild;
			var shrink = this.$el.lastChild;
			expand.scrollLeft = 100000;
			expand.scrollTop = 100000;
			shrink.scrollLeft = 100000;
			shrink.scrollTop = 100000;
		},
		update: function() {
			
			this.size.width = this.$el.offsetWidth;
			this.size.height = this.$el.offsetHeight;
		}
	},
	watch: {
		size: {
			deep: true,
			handler: function(size) {
				
				this.reset();
				this.$emit('resize', { width: this.size.width, height: this.size.height });
			}
		}
	},
	render: function() {
		var style = 'position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;';
		var styleChild = 'position: absolute; left: 0; top: 0;';
		return h('div', {
			style: style + 'animation-name: resizeSensorVisibility;',
			onanimationstart: this.update
		},[
			h('div', {
				style: style,
				onScroll: this.update
			}, [
				h('div', {
					style: styleChild + 'width: 100000px; height: 100000px;'
				})
			]),
			h('div', {
				style: style,
				onScroll: this.update
			}, [
				h('div', {
					style: styleChild + 'width: 200%; height: 200%;'
				})
			]),
		]);
	},
	beforeDestroy: function() {
		
		this.$emit('resize', { width: 0, height: 0 });
		this.$emit('resizeSensorBeforeDestroy');
	},
	mounted: function() {
		if ( this.initial === true )
			this.$nextTick(this.update);
		
		if ( this.$el.offsetParent !== this.$el.parentNode )
			this.$el.parentNode.style.position = 'relative';
		if ( 'attachEvent' in this.$el && !('AnimationEvent' in window) ) {
			var onresizeHandler = function() {
				this.update();
				removeOnresizeEvent();
			}.bind(this);
		
			var removeOnresizeEvent = function() {
				
				this.$el.detachEvent('onresize', onresizeHandler);
				this.$off('resizeSensorBeforeDestroy', removeOnresizeEvent);
			}.bind(this);
			
			this.$el.attachEvent('onresize', onresizeHandler);
			this.$on('resizeSensorBeforeDestroy', removeOnresizeEvent);
			this.reset();
		}
	}
}
</script>