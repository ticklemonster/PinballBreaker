cc.Class({
    extends: cc.Component,

    properties: {
        
        spin_max: 4.0,
        spin_min: 0.001,
        spin_damping: 0.95,
        tile: 0,
        spin_tiles: {
            default: [],
            type: [cc.SpriteFrame]
        },
        burst_tiles: {
            default: [],
            type: [cc.SpriteFrame]
        },
        bonus: 10,
        rolloverAudio: {
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
        this._spin = 0;
        this._pos  = 0;
        this.node.getComponent(cc.Sprite).spriteFrame = this.spin_tiles[this.tile];
        
        this._event = new cc.Event.EventCustom('ROLLOVER',true);
        this._burstAction = cc.sequence(
            cc.spawn(cc.scaleBy(0.3,4,4),cc.fadeOut(0.3)),
            cc.delayTime(0.35),
            cc.removeSelf(true)
        );
    },

    // rollover with a specified velocity
    spin: function() {
        this._spin = Math.random() * this.spin_max;
    },
    
    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        if( this._spin !== 0 ) {
            // update the spinning sprite...
            this._pos += this._spin;
            this.tile = Math.trunc(Math.abs( this._pos % this.spin_tiles.length));
            this.node.getComponent(cc.Sprite).spriteFrame = this.spin_tiles[this.tile];
            
            // adjust the tile scale based on the _pos
            var frac = this._pos % 1;
            if( frac <= 0.5 ) {
                this.node.scaleY = 2*frac;
            } else  {
                this.node.scaleY = 2*(1-frac);
            }

            // update the spinning velocity
            this._spin = this._spin * this.spin_damping;
            if( Math.abs(this._spin) < this.spin_min ) {
                // finish spinning - quickly burst the result
                this._spin = 0;
                this.node.scaleY = 1;
                this._event.setUserData( { tile: this.tile } );
                this.node.dispatchEvent( this._event );
            }
        }
    },
    
    isSpinning: function () {
        return this._spin!==0;
    },
    
    getTileNum: function () {
        return this.tile;
    },

    showBurst: function () {
        // create a new node to show the burst sprite with animation
        var burst = new cc.Node();
        burst.parent = this.node;
        var burstSprite = burst.addComponent(cc.Sprite);
        burstSprite.spriteFrame = this.burst_tiles[this.tile];
        burst.stopAllActions();
        burst.runAction( this._burstAction.clone() );
    },
    
});
