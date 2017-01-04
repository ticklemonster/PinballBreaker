const GAME_MODE_SCORE = 'SCORE';
const GAME_MODE_TIME  = 'TIME';
const BEST_SCORE_KEY = 'nTopScore';
const BEST_TIME_KEY = 'nBestTime';

cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
		
		result: {
			default: 0,
			visible: false
		}
    },

    // use this for initialization
    onLoad: function () {
		cc.log('GameoverController:onLoad', this);
		        
        // init. the dialog box content
        this.gameModeLabel = this.node.getChildByName('GameMode').getComponent(cc.Label);
        this.resultLabel = this.node.getChildByName('MyScore').getComponent(cc.Label);
        this.bestLabel = this.node.getChildByName('BestScore').getComponent(cc.Label);	
		this.newRecord = this.node.getChildByName('NewRecord');
		
		// set the initial state
		this.gameModeLabel.string = "???";
		this.bestLabel.string = "-BEST-";
		this.resultLabel.string = "-RESULT-";
		
		// start from off-screen to the right...
		this.node.setPosition( cc.winSize.width + this.node.width, this.node.y );
		this.runAnimation = false;

    },

    formatTime: function(t) {
		cc.log('formatTime('+t+')');
		if( parseInt(t) < 0 ) return "D.N.F";
		
        var rval = Math.floor(t/60) + ':';
        if( t%60 < 10 ) rval += '0';
        rval += (t%60).toFixed(0);
        
        return rval;    
    },
    
	setMode: function(gamemode) {		
		if( gamemode == GAME_MODE_TIME ) {
			this.gameMode = GAME_MODE_TIME;
		} else {
			this.gameMode = GAME_MODE_SCORE;
		}
	},
	
	setResult: function(resultval, bestval ) {
		if( !resultval ) return;
		if( !parseInt(resultval) ) return;
	
		this.result = parseInt(resultval);
		if( bestval ) {
			this.best = parseInt(bestval);
		} else {
			this.best = (this.gameMode==GAME_MODE_TIME)?120:100;
		}
	},
	
	animate: function( ) {
		// set the initial values
		if( this.gameMode == GAME_MODE_TIME ) {
			this.gameModeLabel.string = "Zero Hero"
			this.bestLabel.string = this.formatTime(this.best);
			this.resultLabel.string = this.formatTime(this.result);
		} else {
			this.gameModeLabel.string = "Big Shot";
			this.bestLabel.string = this.best;
			this.resultLabel.string = this.result;
		} 

		// slide in
		var slideIn = cc.sequence(
			cc.delayTime(2.0),	// allow any message to finish
			cc.moveTo(1.0, 0,this.node.y).easing(cc.easeBounceOut()),
			cc.callFunc(this.animateHS,this)
			);
		this.node.runAction( slideIn );
		
	},
	
	animateHS: function( ) {
		// is this a new best score?
		if( this.gameMode == GAME_MODE_TIME && this.result < this.best && this.result > 0 ) 
		{
			// this is a best time!
			cc.sys.localStorage.setItem(BEST_TIME_KEY,this.result);
			this.runAnimation = true;
		}
		else if( this.gameMode == GAME_MODE_SCORE && this.result > this.best ) 
		{
			// this is a new best score
			cc.sys.localStorage.setItem(BEST_SCORE_KEY,this.result);
			this.runAnimation = true;
		}
	},
	
	closeButtonClicked: function(e) {
		this.destroy();
		cc.director.loadScene("menu");
	},
	
    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
		if( !this.runAnimation )	return;
		
		if( this.result == this.best ) {
			// finished incrementing.
			this.newRecord.runAction( cc.fadeIn(0.1) );
			this.runAnimation = false;
		}
		else if( this.result > this.best ) {
			this.best += Math.max(Math.floor((this.result-this.best)/20),1.0);
		}
		else {
			this.best--;
		}
		
		this.bestLabel.string = (this.gameMode == GAME_MODE_TIME)?this.formatTime(this.best):this.best;
    },
});
