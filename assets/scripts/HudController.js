cc.Class({
    extends: cc.Component,

    properties: {
        scoreLabel: {
            default: null,
            type: cc.Label
        },
        multiplierLabel: {
            default: null,
            type: cc.Label
        },
        splashNode: {
            default: null,
            type: cc.Node
        },
        timerNode: {
            default: null,
            type: cc.Node
        },
        score: {
            default: 0,
            visible: false,
            readonly: false
        },
        timer: {
            default: 120,
            visible: true,
            readonly: true
        },
        multiplier: {
            default: 1,
            visible: true,
            readonly: true
        }
    },

    // use this for initialization
    onLoad: function () {
        //this.score = 0;
        //this.time = 120;
        //this._running = false;
        
         this.timeup_event = new cc.Event.EventCustom('TIME_UP',true);
    },

    upMultiplier: function() {
        this.multiplier++;
        this.multiplierLabel.string = 'x' + this.multiplier;
        
        // add a multiplier ping
        var newnode = new cc.Node();
        var newlabel = newnode.addComponent(cc.Label);
        newlabel.string = this.multiplierLabel.string;
        newnode.parent = this.multiplierLabel.node;
        newnode.position = this.multiplierLabel.node.position;
        newnode.runAction( cc.sequence(
            cc.spawn(
                cc.scaleBy(1.0,10),
                cc.fadeOut(1.0)
            ),
            cc.delayTime(1.0),
            cc.removeSelf()
        ));
        
    },
    
    downMultiplier: function() {
        this.multiplier--;
        if( this.multiplier<1 ) this.multiplier=1;
        this.multiplierLabel.string = 'x' + this.multiplier;
    },
    
    setScore: function (val) {
        this.score = val;
    },
    
    addScore: function (val) {
        this.score += val * this.multiplier;
    },
    
    addScoreAction: function( node, val ) {
        this.score += val * this.multiplier;
    },
    
    setTimer: function ( seconds ) {
    	this.timer = seconds;
    },
    
    startTimer: function () {
    	this._countdown = this.timer;
    	this._running = true;
    },
    
    stopTimer: function() {
        this._running = false;
    },
    
    getTimeRemaining: function() {
        return this._countdown;
    },
    
    getElapsedTime: function() {
        return this.timer - this._countdown;
    },
    
    update: function (dt) {
        this.scoreLabel.string = this.score.toString();
        
        // countdown...
        if( this._running && this._countdown > 0 ) {
        	this._countdown -= dt;
        	if( this._countdown<0 ) {
        	    this._countdown = 0;
        	    this._running = false;
        	    this.node.dispatchEvent(this.timeup_event);
        	}
        }
        this.timerNode.rotation = (this.timer-this._countdown)/this.timer*(-180);
    },

	// bonus scores show an animation
	bonus: function (node,val) {
		// create a new text node to show the bonus
		var bonusNode = new cc.Node();
		var bonusLabel = bonusNode.addComponent(cc.Label);
		if( val>0 ) {
		    bonusLabel.string = '+' + (val*this.multiplier);
		} else {
		    bonusLabel.string = '-' + (val*this.multiplier);
		}
		bonusNode.setParent(this.node);
		bonusNode.position = node.position;
		var countdelay = 0.02 * val;
		bonusNode.runAction( cc.sequence(
		    cc.scaleTo(0,0.5,0.5),
		    cc.spawn(
		        cc.fadeIn(countdelay),
    		    cc.scaleTo(countdelay,1.0,1.0),
    		    cc.moveBy(countdelay,0,50.0)
		    ),
		    cc.delayTime(countdelay),
		    cc.spawn(
		        cc.scaleTo(0.5,2.0,2.0),
		        cc.moveBy(0.5,0.0,100.0),
		        cc.fadeOut(0.5)
		    ),
		    cc.delayTime(0.5),
		    cc.removeSelf(true)
		) );
		
		// add the score against the scoreLabel's node
		this.scoreLabel.node.runAction(
		    cc.repeat( 
				cc.sequence(
					cc.callFunc(this.addScoreAction,this,1),
					cc.delayTime(0.02)
				),val 
			)
		);
	},
	
    splashMessage: function(node,str) {
        // show a splash message with the given str  
        if( this.splashNode ) {
			// create a new node at the splash location, with the same size....
			var msgNode = cc.instantiate( this.splashNode );
			msgNode.setParent(this.node);
			msgNode.position = this.splashNode.position;
			msgNode.active = true;
			msgNode.getComponent(cc.Label).string = str;
            msgNode.scale = 0.01;
            msgNode.runAction( cc.sequence(
                cc.spawn(cc.fadeIn(0.5), cc.scaleTo(1.0,1.0)),
                cc.delayTime(1.0),
                cc.spawn(cc.scaleTo(1.0,3.0),cc.fadeOut(0.5)),
				cc.delayTime(1.0),
				cc.removeSelf(true)
            ));
        }
    },
    
    hideSplash: function(node) {
        // hides any current splash
        if( this.splashNode ) {
            this.splashNode.removeAllChildren(true);
        }
    }
    
    
    
});
