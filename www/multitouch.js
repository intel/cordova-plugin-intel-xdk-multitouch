/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/


var channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

/**
 * Provides access to the various multitouch features on the device.
 */
module.exports = {
	targets: {},
	touchTargets: {},
	touches: {},	
	listeners: {
		LAT: {}, //used to validate add/remove only - avoid removing for listener that hasnt been added
		length: 0,
		add: function(type, target, listener) {
			if(!this[type]) {
				this[type] = [];
				this.length++;
			}
			this[type].push(target);
			
			if(!this.LAT[type]) {
				this.LAT[type] = [];
			}
			this.LAT[type].push([target, listener]);
		},
		remove: function(type, target, listener) {
			//verify that the LAT contains a valid entry before proceeding with removal
			var valid = false;
			if(this.LAT[type]) {
				for(var i=0;i<this.LAT[type].length;i++) {
					if(this.LAT[type][i][0]==target && this.LAT[type][i][1]==listener) {
						valid = true;
						break;
					}
				}
			}
			if(!valid) {
				//console.log('_AMMT_ '+ 'invalid request to remove '+type+' from '+target+', bailing');
				return;
			}
		
			if(this[type]) {
				var idx = this[type].indexOf(target);
				if(idx!=-1) {
					this[type].splice(idx,1);
					if(this[type].length==0) {
						delete this[type];
						this.length--;
					}
				}
			}
		},
		dump: function() {
			var dump = 'listeners dump:';
			for(t in this) {
				if(typeof this[t] != 'function') {
					if(this[t] instanceof Array) {
						var l = '[';
						for(p in this[t]) {
							l+=p+':'+this[t][p].outerHTML+',';
						}
						l+=']';
						dump+=t+':'+l+'~';
						
					}
				}
			}
			console.log(dump);
		},
	},

	poll: function() {
		if(!this.stopPolling) {  //why is stopPolling never true?
			//get data from native
			exec(function(dataset){
				if(dataset){
					try{
						//console.log(dataset);
						intel.xdk.multitouch.handleTouch(dataset);
						setTimeout(intel.xdk.multitouch.poll, 25);
					} catch(e) {
						alert(e.message);
					}
				}
			}, null, "IntelXDKMultiTouch", "getMultitouchData", []);
		}
	},
	enable: function() {
		//replace existing listeners using the queue
	    for(var index in Node.prototype.ELQueue) {
	    	var EL = Node.prototype.ELQueue[index];
	    	if(EL[0]=='add') {
	    		Node.prototype.removeEventListener_original.call(EL[1], EL[2], EL[3], EL[4]);
				this.add(EL[1], EL[2], EL[3], EL[4]);
	    	} else {
				this.remove(EL[1], EL[2], EL[3], EL[4]);
	    	}
	    }
	    delete Node.prototype.ELQueue;

	    //override list
	    Node.prototype.ELOverrideList = ['touchstart', 'touchmove', 'touchend'];
	    Node.prototype.ELQueue = [];

	    Node.prototype.addEventListener_original = Node.prototype.addEventListener;
	    Node.prototype.removeEventListener_original = Node.prototype.removeEventListener;
	    
		//override Node.add/removeEventListener
		Node.prototype.addEventListener = function(type, listener, useCapture) {
			if(Node.prototype.ELOverrideList.indexOf(type)!=-1) {
				this.add(this, type, listener, useCapture);
			} else {
				Node.prototype.addEventListener_original.call(this, type, listener, useCapture);
			}
		}
		Node.prototype.removeEventListener = function(type, listener, useCapture) {
			if(Node.prototype.ELOverrideList.indexOf(type)!=-1) {
				this.remove(this, type, listener, useCapture);
			} else {
				Node.prototype.removeEventListener_original.call(this, type, listener, useCapture);
			}
		}	
		
		//start the native side
		exec(null, null, "IntelXDKMultiTouch", "enableMultitouch", []);
		//start polling
		this.stopPolling = false;
		this.poll();
	},
	
	/**
	 * @param {element} target
	 * @param {string} type ('touchstart', 'touchend', 'touchmove')
	 * @param {function} listener
	 * @param {boolean} useCapture
	 */
	add: function(target, type, listener, useCapture) {
		//log('Multitouch.add called:target:'+target+' type:'+type);
		target.addEventListener('intelxdk.'+type, listener, useCapture);
		this.listeners.add(type, target, listener);
		//this.listeners.dump();//debug
	},
	
	/**
	 * @param {element} target
	 * @param {string} type ('touchstart', 'touchend', 'touchmove')
	 * @param {function} listener
	 * @param {boolean} useCapture
	 */
	remove: function(target, type, listener, useCapture) {
		target.removeEventListener('intelxdk.'+type, listener, useCapture);
		this.listeners.remove(type, target, listener);
	},
	
	sendTouch: function(data, target, touches, targetTouches, changedTouches) {
		var e = document.createEvent('Events');
		e.initEvent('intelxdk.'+data.type, true, true);
	    e.touches = touches;
	    e.changedTouches = changedTouches;
	    e.targetTouches = targetTouches;
		target.dispatchEvent(e);
		//AppMobi.debug.log("sent "+data.type+" to "+target.id+" touches:"+touches.length+" targetTouches:"+targetTouches.length+" changedTouches:"+changedTouches.length);
	},
	
	handleTouch: function(dataset) {
		try{
			for(var i=0;i<dataset.length;i++) {
				var data = dataset[i];
				if(!data){
					return;
				}
		
				//console.log("{id:"+data.id+", x:"+data.x+", y:"+data.y+", type:"+data.type+"}");
				//console.log("{id:"+data.id+", x:"+data.x+", screen.width:"+screen.width+", AppMobi.device.width:"+AppMobi.device.width+", window.innerWidth:"+window.innerWidth+", type:"+data.type+"}");
			
				//adjust x/y for scale
				//scaleX = screen.width/AppMobi.device.width;
				//scaleY = screen.height/AppMobi.device.height;
				//scaleX = window.innerWidth/AppMobi.device.width;
				//scaleY = window.innerHeight/AppMobi.device.height;
				//data.x *=scaleX;
				//data.y *=scaleY;
				data.x *= screen.width/data.w;
				data.y *= screen.height/data.h;
				
				//get touch and target
				var target, touch;
				if(data.type=='touchstart') {
					//get target at point
				    target = document.elementFromPoint(data.x, data.y);
				    //associate the target with id - the target will be re-used for touchmoves and touchend
				    this.touchTargets[data.id] = target;
					//build touch
					var touch = {};
					touch={};
					touch.identifier=data.id;
					this.touches[data.id] = touch;
				} else {
					target = this.touchTargets[data.id];
					touch = this.touches[data.id];
				}
				
				//if touch is undefined, we got a touchmove or touchend without getting a touchstart first
				if(touch==undefined) {
					//AppMobi.debug.log(data.type+" without touchstart");
					continue;
				}
				
				//if this is a touchmove but x/y hasnt changed, skip it
				if(data.type=='touchmove'&&touch.pageX==data.x&&touch.pageY==data.y) {
					continue;
				}
				
				//only one set of coords - assign to all 3 in touch
				touch.pageX=data.x;
				touch.pageY=data.y;
				touch.clientX=data.x;
				touch.clientY=data.y;
				touch.screenX=data.x;
				touch.screenY=data.y;
		
				//retarget from HTML to document
			    if(target.tagName=='HTML') {
			    	var tmp = target;
			    	target = document;
			    	document.clientWidth = tmp.clientWidth;
			    	document.clientHeight = tmp.clientHeight;
			    }
				
				//check if target has an inline event handler - if so, replace it
				if(target && target['on'+data.type]) {
					var orig = target['on'+data.type];
					target['on'+data.type] = null;
					this.add(target, data.type, orig, false);
				}
				
			    //true if the target is not null and is registered as a listener
			    var targetIsValid = target && this.listeners[data.type] && this.listeners[data.type].indexOf(target)!=-1;
			    
				//AppMobi.debug.log("{touch.identifier:"+touch.identifier+", touch.pageX:"+touch.pageX+", touch.pageY:"+touch.pageY+", target:"+(target?target.id:"undefined")+", targetIsValid:"+targetIsValid+"}");
	
			    
			    //remove the association between id and target
				if(data.type=='touchend') {
					delete this.touchTargets[data.id];
					delete this.touches[data.id];
				}	    
		
				//only send if target is valid
			    if(target || targetIsValid) {
			    	
			    	//touches and targetTouches
					var touches = [];
					var targetTouches = [];
			    	for(var t in this.touches) {
			    		var tt = this.touches[t];
			    		touches.push(tt);
			    		if(this.touchTargets[tt.identifier]==target) {
			    			targetTouches.push(tt);
			    		}
			    	}
			    	//changedTouches
					var changedTouches = [touch];
					
				    this.sendTouch(data, target, touches, targetTouches, changedTouches);
			    }
			}
		} catch(e) {
			//sometimes an exception occurs - handle it so that touches dont break
			console.log("a multiTouch error occurred: "+e.message);
		}
	},
}
		
var me = module.exports;

//channel.createSticky('onCordovaInfoReady');
//channel.waitForInitialization('onCordovaInfoReady');
//channel.onCordovaReady.subscribe(function() {
//});

