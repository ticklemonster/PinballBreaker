const GAME_MODE_SCORE = 'SCORE';
const GAME_MODE_TIME  = 'TIME';
const BEST_SCORE_KEY = 'nTopScore';
const BEST_TIME_KEY = 'nBestTime';

cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        topscoreLabel: {
            default: null,
            type:   cc.Label
        },
        
        besttimeLabel: {
            default: null,
            type: cc.Label
        },
        
        sfxButton: {
            default: null,
            type: cc.Node
        }

    },

    // use this for initialization
    onLoad: function () {
        //load top scores from local storage
        this._ls = cc.sys.localStorage;
    
        this.topscore = parseInt(this._ls.getItem(BEST_SCORE_KEY));
        if( isNaN(this.topscore) || this.topscore===null ) {
            this.topscore = 100;
            this._ls.setItem(BEST_SCORE_KEY,100);
        }
        
        this.besttime = parseInt(this._ls.getItem(BEST_TIME_KEY));
        if( isNaN(this.besttime) || this.besttime===null ) {
            this.besttime = 300;
            this._ls.setItem(BEST_TIME_KEY,300);
        }
        
        
        // display the top scores
        this.topscoreLabel.string = this.topscore;
        this.besttimeLabel.string = this.formatTime(this.besttime);
        
        // show/hide mute synmbol
        this.displayMute();        
    },

    formatTime: function() {
        var rval = Math.floor(this.besttime/60) + ':';
        if( this.besttime%60 < 10 ) rval += '0';
        rval += (this.besttime%60).toFixed(0);
        
        return rval;    
    },
    
    btnHighScoreMode: function (event) { 
		var self = this;
        cc.director.loadScene('play', function(err,res) {
			if(!err) {
				res.getChildByName('Canvas')
					.getComponent('PlayController')
					.startGame(GAME_MODE_SCORE,self.topscore);
				res.getChildByName('Canvas').getComponent('PlayController')
					.setVolume(cc.audioEngine.getEffectsVolume());
			} else {
				cc.log('ERROR staring play: ', err);
			}
		});
    },
    
    btnZeroTimeMode: function () {
		var self = this;
        cc.director.loadScene('play', function(err,res) {
			if(!err) {
				res.getChildByName('Canvas')
					.getComponent('PlayController')
					.startGame(GAME_MODE_TIME,self.besttime);
				
				res.getChildByName('Canvas').getComponent('PlayController')
					.setVolume(cc.audioEngine.getEffectsVolume());
			} else {
				cc.log('ERROR staring play: ', err);
			}
		});
    },
    
    btnMute: function (event) {
        var vol = 1-cc.audioEngine.getEffectsVolume();
        cc.audioEngine.setEffectsVolume(vol);
        this.displayMute();
    },
    
    displayMute : function () {
        for( var c in this.sfxButton.children ) { 
            this.sfxButton.children[c].getComponent(cc.Sprite).enabled = (cc.audioEngine.getEffectsVolume()===0);
        }
    },
    
    btnPower: function () {
        cc.log('Ending on user request');
        cc.game.end();
    }
    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
    
});
