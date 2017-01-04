const COLLISION_BALL = 1;
const COLLISION_COLLECT = 2;
const COLLISION_BOUNDARY = 3;
const COLLISION_BLOCK = 4;
const COLLISION_ROLLOVER = 5;

const CHIPMUNK_PHYSICS = true;

const GAME_MODE_SCORE = 'SCORE';
const GAME_MODE_TIME  = 'TIME';
const BEST_SCORE_KEY = 'nTopScore';
const BEST_TIME_KEY = 'nBestTime';

cc.Class({
    extends: cc.Component,

    properties: {
        ball_mass: 10,
        gravity:   500,
        ball_vmin: 2000,
        ball_vmax: 8000,
        max_balls: 100,
        starting_balls: 100,
        starting_secs: 120,
		
        ballPrefab: {
            default: null,
            type: cc.Prefab
        },
        pinPrefab: {
            default: null,
            type: cc.Prefab
        },
        rolloverPrefab: {
            default: null,
            type: cc.Prefab
        },
        ballLaunchNode: {
            default: null,
            type: cc.Node
        },
        hudNode: {
            default: null,
            type: cc.Node
        },
        buckets: {
            default: null,
            type: cc.Node
        },
        obstacles: {
            default: null,
            type: cc.Node
        },
        rollovers: {
            default: null,
            type: cc.Node
        },
        
        gameOverBox: {
        	default: null,
        	type: cc.Prefab
        },
        
        pingAudio: {
            default: null,
            url: cc.AudioClip
        },


    },

    // use this for initialization
    onLoad: function () {
        // Initialise the game
        cc.log("PlayController: onLoad");
        this._actionMgr = new cc.ActionManager();
        
        // Set up an array of currently active balls
        this.ballPool = new cc.NodePool(this.BallPoolHandler);
        for( var i=0; i<this.max_balls; i++ ) {
            this.ballPool.put( cc.instantiate(this.ballPrefab) );
        }
        this.ballsInPlay = [];
        this.ballsToDel  = [];
        
        // listen for game events
        this.node.on('ROLLOVER',this.rolloverEventHandler,this);
        this.node.on('TIME_UP', this.timeUpEventHandler,  this);        
    },
    
    BallPoolHandler: function() {
        return {
            unuse: function() {
                //cc.log('BallPoolHandler:unuse');
            },
            reuse: function() {
                //cc.log('BallPoolHandler:reuse');
            }
        };
    },
	
	setVolume: function( volume ) {
		cc.log('set Volume: ' + volume);
		cc.audioEngine.setEffectsVolume(volume);
			
	},
	
	startGame: function(gamemode,bestscore) {
        cc.log("PlayController: startGame(" + gamemode + "," + bestscore + ")");

        this.hud = this.hudNode.getComponent("HudController");
        this.hud.setScore( this.starting_balls );

		if( gamemode == GAME_MODE_TIME ) {
			// set up a time-based game - starting from the current record...
			this._gamemode = GAME_MODE_TIME;
			this._bestresult = parseInt(bestscore);
            this.hud.setTimer( bestscore );			
		} else {
			this._gamemode = GAME_MODE_SCORE;
			this._bestresult = parseInt(bestscore);
			this.hud.setTimer( this.starting_secs );
			
		}
                
        // Get ready for user input
        this._holdTime = -1;
        this._isPlaying = false;
        this._isTimeUp =  false;                

        // load interactive objects from data files
		var self = this;
        cc.loader.loadRes("level1", function(err,res) {
            if(err) {
                cc.log('ERROR when loading pins! ', err);
            } else {
                // create the objects
                for( var loc in res.pin_locations ) {
                    var pin = cc.instantiate(self.pinPrefab);
                    pin.parent = self.obstacles;
                    pin.setPosition(res.pin_locations[loc]);
                }
                for( var rloc in res.rollover_locations ) {
                    var rollo = cc.instantiate(self.rolloverPrefab);
                    rollo.parent = self.rollovers;
                    rollo.setPosition(res.rollover_locations[rloc]);
                }

                // apply physics/colliders
				if( CHIPMUNK_PHYSICS ) {
					self.initPhysics();
				} else {
					self.initColliders();
				}         
				
				// now we're ready to start...
				cc.log('Loaded level data - start playing...');
				self.startPlaying();
            }
        });
		
	},

    initPhysics: function() {
        // Setup the physics engine
        this._space = new cp.Space();
        this._space.gravity = cp.v(0,-this.gravity); 
        this._space.damping = 1.0;
        
        // add static boundaries
        var halfH = cc.winSize.height / 2;   //320
        var halfW = cc.winSize.width / 2;  //480
        var wallL = new cp.SegmentShape(this._space.staticBody,cp.v(-halfW-5,-halfH),cp.v(-halfW-5, halfH),8);
        var wallR = new cp.SegmentShape(this._space.staticBody,cp.v( halfW+5,-halfH),cp.v( halfW+5, halfH),8);
        var wallT = new cp.SegmentShape(this._space.staticBody,cp.v(-halfW, halfH+5),cp.v( halfW, halfH+5),8);
        var wallB = new cp.SegmentShape(this._space.staticBody,cp.v(-halfW,-halfH-5),cp.v( halfW,-halfH-5),8);
        wallT.setElasticity(0.8); wallT.setFriction(0.1); wallT.setCollisionType(COLLISION_BOUNDARY);
        wallL.setElasticity(0.8); wallL.setFriction(0.1); wallL.setCollisionType(COLLISION_BOUNDARY);
        wallR.setElasticity(0.8); wallR.setFriction(0.1); wallR.setCollisionType(COLLISION_BOUNDARY);
        wallB.setElasticity(0);   wallB.setFriction(1);   wallB.setCollisionType(COLLISION_BOUNDARY);
        this._space.addStaticShape(wallL);
        this._space.addStaticShape(wallR);
        this._space.addStaticShape(wallT);
        this._space.addStaticShape(wallB);
        
        // Add the buckets to collect balls...
        for( var bn in this.buckets.children ) {
            var bucket = this.buckets.children[bn];
            var bverts = [ 
                -bucket.width/2, +bucket.height/2,
                +bucket.width/2, +bucket.height/2,
                +bucket.width/2, -bucket.height/2,
                -bucket.width/2, -bucket.height/2 ];
            var bshape = new cp.PolyShape(this._space.staticBody,bverts,bucket.position);
            bshape.setElasticity(0.0); bshape.setFriction(1.0);
            bshape.setCollisionType(COLLISION_COLLECT);
            bshape.sensor = true;  
            bshape.ccNode = bucket;
            this._space.addStaticShape(bshape);
        }
        this._space.addCollisionHandler(COLLISION_COLLECT,COLLISION_BALL,this.cpCollectBegin,null,null,null);

        // Add the rollover areas ...
        for( var rn in this.rollovers.children ) {
            var ro = this.rollovers.children[rn];
            var verts = [ 
                -ro.width/2, +ro.height/2,
                +ro.width/2, +ro.height/2,
                +ro.width/2, -ro.height/2,
                -ro.width/2, -ro.height/2
                ];
            var roshape = new cp.PolyShape(this._space.staticBody,verts,ro.position);
            roshape.setCollisionType(COLLISION_ROLLOVER);
            roshape.sensor = true;  
            roshape.ccNode = ro;
            this._space.addStaticShape(roshape);
        }
        this._space.addCollisionHandler(COLLISION_ROLLOVER,COLLISION_BALL,this.cpRolloverBegin,null,null,null);
        
        
        // Add physics to the obstacles
        for( var c in this.obstacles.children ) {
            //cc.log('child ' + c + ':',this.obstacles.children[c] );
            var pegNode = this.obstacles.children[c];
            
            var polygon = pegNode.getComponent(cc.PolygonCollider);
            if( polygon===null ) {
                var pegshape = new cp.CircleShape(this._space.staticBody,
                    pegNode.width/2,
                    pegNode.position
                );
				//pshape.setElasticity(0.8); pshape.setFriction(0);
                pegshape.setCollisionType(COLLISION_BLOCK);
				this._space.addStaticShape(pegshape);
            } else {
                // build the poly shape (from possibly more than one PolygonCollider)...
                var polyColliders = pegNode.getComponents(cc.PolygonCollider);
                for( var pc in polyColliders ) {
                	var thispoly = polyColliders[pc];
					//cc.log('Obstacle ' + pegNode.name + ' polygon #' + pc + ': ', thispoly);
					
					var flatpoints = [];
					for( var p in thispoly.points ) {
						flatpoints.push(thispoly.points[p].x);
						flatpoints.push(thispoly.points[p].y);
					}
					var pshape = new cp.PolyShape(this._space.staticBody,
						flatpoints,
						pegNode.position
					);
					//pshape.setElasticity(0.8); pshape.setFriction(0);
					pshape.setCollisionType(COLLISION_BLOCK);
					this._space.addStaticShape(pshape);
				}
            }
            
        }
        this._space.addCollisionHandler(COLLISION_BLOCK,COLLISION_BALL,null,null,null,this.cpBounced);

    },
    
    initColliders: function() {
        // manage collisions with built-in colliders (not real physics)
        
    },
    
    initUserInput: function() {
    	// user input will be a space/enter/touch to launch
    	// left/right or accel as a way to bump
    
        // listen for keyboard events
        var self = this;
        this._kblistener = cc.eventManager.addListener({
            event:         cc.EventListener.KEYBOARD,
            onKeyPressed:  function(kcode, e) {
                switch(kcode) {
                    case cc.KEY.left: 
                        break;
                    case cc.KEY.right:
                        break;
                    case cc.KEY.space:
                    case cc.KEY.enter:
                        self.onTouchStart( e );
                        break;
                }
            },
            onKeyReleased: function(kcode, e) {
                switch(kcode) {
                    case cc.KEY.left:
                    case cc.KEY.right:
                        break;
                    case cc.KEY.space:
                    case cc.KEY.enter:
                        self.onTouchEnd( e );
                    	break;
                }
                
            }
        }, this.node );
        
        this.node.on( cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on( cc.Node.EventType.TOUCH_END,   this.onTouchEnd,   this);

    },
    
	startPlaying: function () {
		cc.log('Game is starting!');
		this.hud.splashMessage(this.node,"Go!");
		this.initUserInput();
		this._isPlaying = true;
		this.hud.startTimer();
	},
	
    stopUserInput: function () {
        //cc.eventManager.removeAllListeners(this._kblistener);
        this.node.off( cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off( cc.Node.EventType.TOUCH_END,   this.onTouchEnd,   this);
    },

    onTouchStart: function(event) {
        //var node = event.target || event.currentTarget;
        //var self = node.getComponent('PlayController') ;
    	if( !this._isPlaying || this._isTimeUp ) return;
    	
    	if( this._holdTime<0 ) this._holdTime = 0;
    },
    
    onTouchEnd: function(event) {
        //var node = event.target || event.currentTarget;
        //var self = node.getComponent('PlayController') ;
    	
    	if( !this._isPlaying || this._isTimeUp ) return;
    	
        this.ballLaunchNode.setColor( cc.color(255,255,255) );
        this.launchBall( this._holdTime );
        this._holdTime = -1;
    },
    
    
	//
	// CHIPMUNK PHYSICS COLLISION EVENTS
	//
    cpCollectBegin: function(arbiter, space) {
        //cc.log('collection begins: ', arbiter.a, arbiter.b);
        // static object should always come second
        var self = cc.find('Canvas').getComponent('PlayController');
		
		// IGNORE THE COLLECTION FOR NOW!!
		//return true;
		
        for( var b in self.ballsInPlay ) {
            if( arbiter.a.ccNode === self.ballsInPlay[b] ) {
                // found the colliding ball node 
                
                // move Cocos ball object to the delete pile...
                self.ballsInPlay.splice(b,1);   // remove from array
                self.ballsToDel.push(arbiter.a.ccNode)

				// use callback to remove physics objects (and Cocos, too)
		        space.addPostStepCallback( self.cleanupPhysics );
                
                // what did we hit?
                //cc.log('active ball has been reclaimed after hitting ', arbiter.b.ccNode );
                var special = arbiter.b.ccNode.getComponent('BucketController').collect();

				/*
				 * AUDIO IS MOVED TO THE BUCKET COMPONENT
				 * - will volume work reliably?
				 */
//                if( special ) {
//                    cc.audioEngine.playEffect(self.bonusAudio);
//                } else {
//                    cc.audioEngine.playEffect(self.collectAudio);
//                }
                
                return false;
            }
        }
        
    },

    cpRolloverBegin: function(arbiter, space) {
		//cc.log('rollover:  ', arbiter.a );
		var rc = arbiter.b.ccNode.getComponent('RolloverController');
		if( rc ) rc.spin();
	},
	
	cpBounced: function(arbiter,space) {
	    // collision has finished - add the sound
        var self = cc.find('Canvas').getComponent('PlayController');
		
		// LIMIT TO ONE SOUND AT A TIME - TEST FOR ANDROID
		if( self.pingAudioID ) cc.audioEngine.stopEffect( self.pingAudioID );
	    self.pingAudioID = cc.audioEngine.playEffect(self.pingAudio,false);
	},

	cleanupPhysics: function() {
        var self = cc.find('Canvas').getComponent('PlayController');

        while( self.ballsToDel.length > 0 ) {
            var ball = self.ballsToDel.shift();
            self._space.removeShape(ball.shape);    // only shape
            self._space.removeBody(ball.body);
            self.ballPool.put(ball);
        }

    },
    

	
	// 
	// CUSTOM MESSAGE HANDLERS
	//
	rolloverEventHandler: function ( event ) {
	    var eventData = event.getUserData();

        var count = 0;
	    for( var rn in this.rollovers.children ) {
	        var roc = this.rollovers.children[rn].getComponent('RolloverController');
	        if( roc.getTileNum() == eventData.tile ) {
	            count++;
	            roc.showBurst();    	            // show a burst on this node
	        }
	    }
	    
        //cc.log('Rollover: ' + count + ' nodes are #' + eventData.tile );
		if( count>=3 ) cc.audioEngine.playEffect(this.rolloverAudio);
        if( count==3 ) {
            this.hud.bonus(event.target,3);
        }
        if( count==4 ) {
            this.hud.bonus(event.target,10);
        }
        if( count==5 ) {
            this.hud.bonus(event.target,50);
        }

	},
	
	timeUpEventHandler: function( event ) {
	    cc.log('timeUp event!');
	    this._isTimeUp = true;
	},
	
    launchBall: function( ratio ) {
    	if( this.hud.score < 1 ) return;
    	if( undefined === ratio || !ratio ) ratio = 0;
    	
    	var mag = cc.lerp(this.ball_vmin,this.ball_vmax, ratio);
        //cc.log('launchBall(' + ratio + ') with v=' + mag  );
    	
        var newBall = this.ballPool.get();
        while( newBall===null ) {
            cc.log('+too many balls in play - wait');
            return;
        }
            
        newBall.position = this.ballLaunchNode.position;
        newBall.parent = this.node;

        // Add physics to the ball
        var ballBody = new cp.Body( this.ball_mass, 
            cp.momentForCircle(this.ball_mass,0,newBall.width/2,cp.vzero)
            );
        var ballShape = new cp.CircleShape(ballBody,newBall.width/2,cp.vzero);
        ballShape.setElasticity(0.9);
        ballShape.setFriction(0.1);
        ballShape.setCollisionType(COLLISION_BALL);
        ballShape.ccNode = newBall;
        ballBody.p = newBall.position;
        newBall.body = this._space.addBody(ballBody);
        newBall.shape = this._space.addShape(ballShape);
        
        // Add this to the balls in play and start it moving!
        this.hud.score--;
        this.ballsInPlay.push( newBall );
        var imp = cc.v2(0,mag).rotate((-this.ballLaunchNode.rotation) * Math.PI / 180.0);
        //var imp = cp.v.forangle((90-this.ballLaunchNode.rotation) * Math.PI / 180.0 ).mult(mag);
        newBall.body.applyImpulse( imp, cp.vzero );

    },

    // playerBump: function( arbiter, space ) {
    //     // pre-collision handler for Chipmunk collisions between ball and playerBump
        
    //     if( arbiter.isFirstContact() ) {
    //         //cc.log('first contact @ ', arbiter.contacts[0], arbiter );
    //         var offset = arbiter.body_b.p.x - arbiter.contacts[0].p.x;
    //         var radians = (Math.PI/2) * offset / (arbiter.b.bb_r - arbiter.b.bb_l);
    //         cc.log('    x_offset = ' +  offset + ' (' ,radians, ')');
            
    //         var impulse = cp.v(0,1000);
    //         impulse.rotate( cp.v.forangle(radians) );
    //         impulse.mult(this.ball_mass);
    //         arbiter.body_a.applyImpulse( impulse, cp.vzero );

    //         return false;   // don't use physics for the paddle!
    //     } else {
    //         //cc.log('separating from contact ', arbiter );

            
    //     }
    //     //arbiter.body_a.applyImpulse( cp.body_a.v.v(0,100), cp.v(0,0) );
    // },
    

    endGame: function() {
        cc.log('play:endGame ' + this._gamemode);
        this._isPlaying = false;
        this.stopUserInput();
        this.hud.stopTimer();
        
		// prepare the game-over results box
		var dlgbox = cc.instantiate( this.gameOverBox );
		dlgbox.getComponent("GameoverController").setMode( this._gamemode );
		if( this._gamemode == GAME_MODE_SCORE ) {
			dlgbox.getComponent("GameoverController").setResult( this.hud.score, this._bestresult );
		} else { // GAME_MODE_TIME
			var yourtime = parseInt(this.hud.getElapsedTime());
			if( this.hud.score>0 ) yourtime = -1;  // did not finish
			dlgbox.getComponent("GameoverController").setResult( yourtime, this._bestresult );
		}

		dlgbox.parent = this.hudNode;
		cc.log('endGame: kicking off gameover animations');
		dlgbox.getComponent("GameoverController").animate( );
		//cc.director.loadScene('menu');

    },
    
    backToMenu: function() {
        // store the best score or best time...
        cc.director.loadScene("menu");
    },    
	
    // called every frame
    update: function (dt) {
        if( !this._isPlaying ) return;
        
        // is there time left?
        if( this.hud.getTimeRemaining() == 0 ) {
            this.stopUserInput();
            this._isTimeUp = true;
            this.hud.splashMessage(this.node,'T I M E   U P !');
        }
        
        // are we pressing a button?
        if( this._holdTime >= 0 && this._holdTime < 1 ) {
            this._holdTime = Math.min(this._holdTime + dt,1.0);
            var tint = 255*(1-this._holdTime);
            this.ballLaunchNode.setColor( cc.color(255,tint,tint) );
        }
        
        // update physics
		if( CHIPMUNK_PHYSICS )
        	this._space.step(dt);
    
        // adjust the nodes to match their physics objects
        for( var b in this.ballsInPlay ) {
        	var ball = this.ballsInPlay[b];
        	
            ball.position = ball.body.p;
            if( ball.position.x < -310 || ball.position.x > 310 ) {
            	//cc.log('Ball out of bounds!',ball);
				ball.position.x = cc.clampf(ball.position.x,-310,310);
				ball.body.p.x = ball.position.x;
			}

            if( ball.body.vx*ball.body.vx+ball.body.vy*ball.body.vy < 0.001 ) {
                if( !ball.body.idleTime ) ball.body.idleTime=0;
                ball.body.idleTime += dt;
                if( ball.body.idleTime >= 2 && ball.body.idleTime-dt < 2 ) { 
                    //cc.log('ball ' + ball + ' has fallen asleep');
                    ball.runAction( cc.blink(2,3) );
                    //ball.body.applyImpulse( cp.v(cc.randomMinus1To1()*20 ,80), cp.vzero );
                }
                else if( ball.body.idleTime > 4 ) {
                    //cc.log('ball ' + ball + ' is still stuck. kill it!');

                	// remove the ball from the active list and recycle
     				this._space.removeShape(ball.shape);
                	this._space.removeBody(ball.body);
                	this.ballsInPlay.splice(b,1);
                	this.ballPool.put(ball);
                    //ball.body.applyImpulse( cp.v(cc.randomMinus1To1()*200,2000), cp.vzero );
                }
            }
			
            if( ball.position.y < -450 ) {
            	// lost this ball...
            	// remove physics
 				this._space.removeShape(ball.shape);
            	this._space.removeBody(ball.body);
            	
            	// remove the ball from the active list and recycle
            	this.ballsInPlay.splice(b,1);
            	this.ballPool.put(ball);
            	
            	// play a lost ball sound?
            	
            	//cc.log('lost ball #' + b + ': now have ' + this.ballsInPlay.length);
            }
            
            this.cleanupPhysics();
            
        }
        
        // check for end of game from no balls...
        if( (this.hud.score <= 0 || this._isTimeUp) 
            && this.ballsInPlay.length == 0 
        	&& !this.rollovers.children[0].getComponent('RolloverController').isSpinning() 
        	&& !this.rollovers.children[1].getComponent('RolloverController').isSpinning() 
        	&& !this.rollovers.children[2].getComponent('RolloverController').isSpinning() 
        	&& !this.rollovers.children[3].getComponent('RolloverController').isSpinning() 
        	&& !this.rollovers.children[4].getComponent('RolloverController').isSpinning() 
        	// && this._actionMgr.numberOfRunningActionsInTarget(this.hud) <= 0
        	) {
        	this.endGame();
        }
    },
});