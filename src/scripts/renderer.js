//  This is a basic css renderer that uses a modified version of the three.js CSS3DRenderer.
//  Having the renderer in a seperate file allows us to abstract all the visual components
//  of the cube in a simple, straightforward way.

//  THREE.JS HACK

//  You can actually use a THREE.Object3D as a Scene like object
//  and render it with the THREE.CSS3DRenderer. For projects with filesize restrictions,
//  this is useful as it allows you to exclude the THREE.Scene and all it's dependancies entirely.
//  The only caveat is that we need to temporarily define/re-define a dummy Scene object


var SceneType = THREE.Scene;
THREE.Scene = SceneType || function(){};

ThreeTwist.renderers = ThreeTwist.renderers || {};
ThreeTwist.renderers.CSS3D = function( cube ){

  var cubelets = cube.cubelets; // This used to be passed in.
  
  // SCENE + RENDERER
  var renderer = new THREE.CSS3DRenderer(),
    scene = new THREE.Object3D();
  renderer.scene = scene;

  // Add the cube 3D object to the scene
  scene.add( cube.autoRotateObj3D ); // This holds the actual cube Object3D.
  scene.add( cube.camera );

  function showItem( item ){
    item.style.display = 'block';
  }
  function hideItem( item ){
    item.style.display = 'none';
  }

  // TODO: move this somewhere outside this constructor
  ThreeTwist.extend( ThreeTwist.Cubelet.prototype, ThreeTwist.renderers.CSS3DCubelet.methods );

  //   Then we use the CSS3DCubelet function to create all the dom elements.
  cubelets.forEach( ThreeTwist.renderers.CSS3DCubelet );

  // RENDER LOOP
  function render(){

    // Don't do anything unless this cube's container is attached to the DOM.
    // TODO: There is probably a better way to check if it's really attached.
    if( cube.domElement.parentNode ){

      var parentWidth = cube.domElement.parentNode.clientWidth;
      var parentHeight = cube.domElement.parentNode.clientHeight;

      if( cube.domElement.parentNode && ( cube.domElement.clientWidth !== parentWidth ||
          cube.domElement.clientHeight !== parentHeight )){
        cube.setSize( parentWidth, parentHeight );
      }

      renderer.render( scene, cube.camera );
    }

    requestAnimationFrame( render );

  }

  requestAnimationFrame( render );

  // We'll need to set the scene object back to it's original type
  if( SceneType ) {
    THREE.Scene = SceneType;
  }

  // All renderers must return an object containing a domElement and a setSize method,
  // in most instances this is the renderer object itself.

  return renderer;

};


ThreeTwist.renderers.CSS3DCubelet = (function(){

  // TODO: why the closure? Maybe there used to be private variables here?

  return function( cubelet ){

    var domElement = document.createElement( 'div' );
    domElement.classList.add( 'cubelet' );
    domElement.classList.add( 'cubeletId-' + cubelet.id );
    cubelet.css3DObject = new THREE.CSS3DObject( domElement );

    cubelet.css3DObject.name = 'css3DObject-' + cubelet.id;
    cubelet.add( cubelet.css3DObject );

    // This is just enough to push the cubelet faces outward,
    // so that they form a cube:
    var faceSpacing = cubelet.size / 2;

    // F U R D L B
    var transformMap = [
      "rotateX(   0deg ) translateZ( "+faceSpacing+"px ) rotateZ(   0deg )",
      "rotateX(  90deg ) translateZ( "+faceSpacing+"px ) rotateZ(   0deg )",
      "rotateY(  90deg ) translateZ( "+faceSpacing+"px ) rotateZ(   0deg )",
      "rotateX( -90deg ) translateZ( "+faceSpacing+"px ) rotateZ(  90deg )",
      "rotateY( -90deg ) translateZ( "+faceSpacing+"px ) rotateZ( -90deg )",
      "rotateY( 180deg ) translateZ( "+faceSpacing+"px ) rotateZ( -90deg )"
    ];

    var axisMap = [
      'axisZ',
      'axisY',
      'axisX',
      'axisY',
      'axisX',
      'axisZ'
    ];

    //  CUBELET FACES

    //  We're about to loop through our 6 faces
    //  and create visual dom elements for each

    cubelet.faces.forEach( function( face ) {

      //  FACE CONTAINER.
      //  This face of our Cubelet needs a DOM element for all the
      //  related DOM elements to be attached to.

      face.element = document.createElement( 'div' );
      face.element.classList.add( 'face' );
      face.element.classList.add( axisMap[ face.id ]);
      face.element.classList.add( 'face' +
        ThreeTwist.Direction.getNameById( face.id ).capitalize() );
      cubelet.css3DObject.element.appendChild( face.element );

      // Each face has a different orientation represented by a CSS 3D transform.
      // Here we select and apply the correct one.

      var cssTransform = transformMap[ face.id ],
        style = face.element.style;
      
      style.OTransform = cssTransform;
      style.MozTransform = cssTransform;
      style.WebkitTransform = cssTransform;
      style.transform = cssTransform;

      //  INTROVERTED FACES.
      //  If this face has no color sticker then it must be interior to the Cube.
      //  That means in a normal state (no twisting happening) it is entirely hidden.
      /*if( face.isIntrovert ){
        face.element.classList.add( 'faceIntroverted' );
        face.element.appendChild( document.createElement( 'div' ));
      }*/

      //  EXTROVERTED FACES.
      //  But if this face does have a color then we need to
      //  create a sticker with that color
      //  and also allow text to be placed on it.
      //else {
      if (!face.isIntrovert) {
        face.element.classList.add( 'faceExtroverted' );

        //  STICKER.
        var stickerElement = document.createElement( 'div' );
        stickerElement.classList.add( 'sticker' );
        stickerElement.classList.add( face.color.name );
        face.element.appendChild( stickerElement );

      }

    });

    //  These will perform their actions, of course,
    //  but also setup their own boolean toggles.
    cubelet.show();
    cubelet.showPlastics();
    cubelet.showStickers();
    
  };

}());

//   The method object contains functionality specific to the CSS3D renderer that we add
//  to the ThreeTwist.Cubelet prototype

ThreeTwist.renderers.CSS3DCubelet.methods = (function(){

  function showItem( item ){
    item.style.display = 'block';
  }

  function hideItem( item ){
    item.style.display = 'none';
  }

  return {
    //  Visual switches.
    getFaceElements: function ( selector ){
      var selectorString = selector || '';
      return Array.prototype.slice.call(
        this.css3DObject.element.querySelectorAll( '.face' + selectorString ));
    },

    show: function(){
      showItem( this.css3DObject.element );
      this.showing = true;
    },
    hide: function(){
      hideItem( this.css3DObject.element );
      this.showing = false;
    },
    showExtroverts: function(){
      this.getFaceElements( '.faceExtroverted' ).forEach( showItem );
      this.showingExtroverts = true;
    },
    hideExtroverts: function(){
      this.getFaceElements( '.faceExtroverted' ).forEach( hideItem );
      this.showingExtroverts = false;
    },
    showIntroverts: function(){
      this.getFaceElements('.faceIntroverted').forEach( showItem );
      this.showingIntroverts = true;
    },
    hideIntroverts: function(){
      this.getFaceElements('.faceIntroverted').forEach( hideItem );
      this.showingIntroverts = false;
    },

    showPlastics: function(){
      this.getFaceElements().forEach( function( item ){
        item.classList.remove( 'faceTransparent' );
      });
      this.showingPlastics = true;
    },
    hidePlastics: function(){
      this.getFaceElements( ).forEach( function( item ){
        item.classList.add( 'faceTransparent' );
      });
      this.showingPlastics = false;
    },
    hideStickers: function(){
      this.getFaceElements( ' .sticker' ).forEach( hideItem );
      this.showingStickers = false;
    },
    showStickers: function(){
      this.getFaceElements( ' .sticker' ).forEach( showItem );
      this.showingStickers = true;
    },
    getOpacity: function(){
      return this.opacity;
    },
    setOpacity: function( opacityTarget, onComplete ){
      if( this.opacityTween ) {
        this.opacityTween.stop();
      }

      if( opacityTarget === undefined ) {
        opacityTarget = 1;
      }

      if( opacityTarget !== this.opacity ){

        var that = this,
          tweenDuration = ( opacityTarget - this.opacity ).absolute().scale( 0, 1, 0, 1000 * 0.2 );

        this.opacityTween = new TWEEN.Tween({ opacity: this.opacity })
        .to({

          opacity: opacityTarget

        }, tweenDuration )
        .easing( TWEEN.Easing.Quadratic.InOut )
        .onUpdate( function(){

          that.css3DObject.element.style.opacity =  this.opacity;
          that.opacity = this.opacity;
        })
        .onComplete( function(){

          if( onComplete instanceof Function ) {
            onComplete();
          }
        })
        .start();

      }
    },
    getStickersOpacity: function(){
      return parseFloat( this.getFaceElements( ' .sticker' )[0].style.opacity );
    },
    setStickersOpacity: function( value ){
      if( value === undefined ) {
        value = 0.2;
      }

      var valueStr = value;
      this.getFaceElements( ' .sticker' ).forEach( function( sticker ){
        sticker.style.opacity = valueStr.toString();
      });
    }
  };
}());
