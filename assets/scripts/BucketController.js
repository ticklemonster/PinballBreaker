cc.Class({
    extends: cc.Component,

    properties: {
        bonus_balls: 1,
        jackpot: 0,
        jackpot_timer: 10,
        jackpot_balls: 0,
        
        start_colour: cc.Color.WHITE,
        jackpot_colour: cc.Color.RED,
        
        obstacle: {
            default: null,
            type: cc.Node
        },
        hud: {
            default: null,
            type: cc.Node
        },
		
		collectAudio: {
            default: null,
            url: cc.AudioClip
        },
		bonusAudio: {
            default: null,
            url: cc.AudioClip
        },

        
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },

    // use this for initialization
    onLoad: function () {
        this._collected = 0;
        this._hud = this.hud.getComponent('HudController');
        
        this.setObCol();
    },

    collect: function() {
        this._collected++;
        this.setObCol();
        
		// one sound at a time limit?
		if( this._audioID ) cc.audioEngine.stopEffect(this._audioID );
        if( this.jackpot>0 && this._collected>=this.jackpot ) {
            // Jackpot!!
            this._hud.bonus( this.node, this.jackpot_balls );
            this.node.runAction( cc.sequence(
                cc.callFunc(this.beginJackpot, this),
                cc.delayTime(this.jackpot_timer),
                cc.callFunc(this.endJackpot, this)
            ) );
            this._collected = 0;    
			this._audioID = cc.audioEngine.playEffect(this.bonusAudio,false);
        } else {
            // not a jackpot            
            this._hud.bonus( this.node, this.bonus_balls );
			this._audioID = cc.audioEngine.playEffect(this.collectAudio,false);
        }
		
        return this._collected;
    },
    
    beginJackpot: function(node) {
        //this._hud.splashMessage(node,'JACKPOT!');
        this._hud.upMultiplier();
    },
    
    endJackpot: function(node) {
        this._hud.downMultiplier();
    },
    
    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {
    //     if( this._inJackpot ) {
    //         this._jackpot_countdown -= dt;
    //         if( this._jackpot_countdown <= 0 ) {
    //             this._inJackpot = false;
    //             this._collected = 0;
    //             this.setObCol();
    //         }
    //     }
    // },
    
    setObCol: function() {
        // sets the colour of the obstacle, based on the current status
        var newColor = this.start_colour.lerp(this.jackpot_colour,this._collected/this.jackpot);
		newColor.a = this.obstacle.color.a;
        if(this.obstacle) this.obstacle.color = newColor;
    }
});
