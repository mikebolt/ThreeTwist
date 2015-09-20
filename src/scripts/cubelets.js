/*

  CUBELETS

  Faces are mapped in a clockwise spiral from Front to Back:


                  Back
                   5
              -----------
            /    Up     /|
           /     1     / |
           -----------  Right
          |           |  2
    Left  |   Front   |  .
     4    |     0     | /
          |           |/
           -----------
               Down
                3


  The faces[] Array is mapped to names for convenience:

    this.faces[ 0 ] === this.front
    this.faces[ 1 ] === this.up
    this.faces[ 2 ] === this.right
    this.faces[ 3 ] === this.down
    this.faces[ 4 ] === this.left
    this.faces[ 5 ] === this.back

  Each Cubelet has an Index which is assigned during Cube creation
  and an Address which changes as the Cubelet changes location.
  Additionally an AddressX, AddressY, and AddressZ are calculated
  from the Address and represent the Cubelet's location relative
  to the Cube's core with integer values ranging from -1 to +1.
  For an overview of the Cubelet's data from the browser's console:

    this.inspect()

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith

*/


ThreeTwist.Cubelet = function( cube, id, visibleDirections ){

  THREE.Object3D.call( this );

  //  Our Cube can directly address its Cubelet children,
  //  only fair the Cubelet can address their parent Cube!

  this.cube = cube;

  //  Our Cubelet's ID is its unique number on the Cube.
  //  Each Cube has Cubelets numbered 0 through N^3 - 1.
  //  Even if we're debugging (and not attached to an actual Cube)
  //  we need an ID number for later below
  //  when we derive positions and rotations for the Cubelet faces.

  this.id = id || 0;
  
  this.visibleDirections = visibleDirections;

  //  Our Cubelet's address is its current location on the Cube.
  //  When the Cubelet is initialized its ID and address are the same.
  //  This method will also set the X, Y, and Z components of the
  //  Cubelet's address on the Cube.

  this.setAddress( this.id );

  //  We're going to build cubes that are (a total of 360) pixels square.
  //  Yup. This size is hardwired in Cube.
  //  It is also hard-wired into the CSS, but we can't simply
  //  grab the style.getBoundingClientRect() value because
  //  that's a 2D measurement -- doesn't account for pos and rot.

  this.size = cube.cubeletSize || 120 * 3.0 / this.cube.order;

  //  Now we can find our Cubelet's X, Y, and Z position in space.
  //  We only need this momentarily to create our Object3D so
  //  there's no need to attach these properties to our Cubelet object.

  var epsilon = 0.1, // Epsilon is the gap size. TODO: causing problems?
  x = (this.addressX - (this.cube.order - 1) / 2) * ( this.size + epsilon ),
  y = (this.addressY - (this.cube.order - 1) / 2) * ( this.size + epsilon ),
  z = (this.addressZ - (this.cube.order - 1) / 2) * ( this.size + epsilon );

  this.position.set( x, y, z );
  this.matrixSlice = new THREE.Matrix4().makeTranslation( x, y, z );
  this.updateMatrix();

  // Add the cubelet to the cube object
  this.cube.object3D.add( this );

  //  We're about to loop through our colors[] Array
  //  to build the six faces of our Cubelet.
  //  Here's our overhead for that:

  var extrovertedFaces = 0;
  this.faces = [];

  //  Now let's map one color per side based on colors[].
  //  Undefined values are allowed (and anticipated).
  //  We need to loop through the colors[] Array "manually"
  //  because Array.forEach() would skip the undefined entries.

  for( var i = 0; i < ThreeTwist.Direction.numDirections; i++ ){

    //  Before we create our face's THREE object
    //  we need to know where it should be positioned and rotated.
    // (This is based on our above positions and rotations map.)

    var direction = ThreeTwist.Direction.getDirectionById(i);
    var visible = visibleDirections.indexOf(direction) !== -1;
    var color = cube.colors[ i ];
    if (!visible) {
      color = ThreeTwist.COLORLESS;
    }

    //  Each face is an object and keeps track of its original ID number
    // (which is important because its address will change with each rotation)
    //  its current color, and so on.

    this.faces[ i ] = {};
    this.faces[ i ].id = i;
    this.faces[ i ].color = color;

    //  We're going to keep track of what face was what at the moment of initialization,
    //  mostly for solving purposes.
    //  This is particularly useful for Striegel's solver
    //  which requires an UP normal.

    // TODO: investigate the side effects of changing this
    this.faces[i].solvedDirection = direction;
    // OLD: this.faces[ i ].normal = direction.name;

    //  INTROVERTED FACES.
    //  If this face has no color sticker then it must be interior to the Cube.
    //  That means in a normal state (no twisting happening) it is entirely hidden.

    this.faces[ i ].isIntrovert = !visible;

    if( visible ){

      //  EXTROVERTED FACES.
      //  But if this face does have a color then we need to
      //  create a sticker with that color
      //  and also allow text to be placed on it.

      //  We're going to use the number of exposed sides
      //  to determine below what 'type' of Cubelet this is:
      //  Core, Center, Edge, or Corner.

      extrovertedFaces ++;

    }
  }

  //  Now that we've run through our colors[] Array
  //  and counted the number of extroverted sides
  //  we can determine what 'type' of Cubelet this is.

  this.type = ThreeTwist.Cubelet.types[extrovertedFaces];

  //  Convience accessors for the Cubelet's faces.
  //  What color is the left face? this.left() !!

  this.front  = this.faces[ 0 ];
  this.up     = this.faces[ 1 ];
  this.right  = this.faces[ 2 ];
  this.down   = this.faces[ 3 ];
  this.left   = this.faces[ 4 ];
  this.back   = this.faces[ 5 ];
  this.colors =
    ( this.faces[ 0 ].color ? this.faces[ 0 ].color.initial : '-' ) +
    ( this.faces[ 1 ].color ? this.faces[ 1 ].color.initial : '-' ) +
    ( this.faces[ 2 ].color ? this.faces[ 2 ].color.initial : '-' ) +
    ( this.faces[ 3 ].color ? this.faces[ 3 ].color.initial : '-' ) +
    ( this.faces[ 4 ].color ? this.faces[ 4 ].color.initial : '-' ) +
    ( this.faces[ 5 ].color ? this.faces[ 5 ].color.initial : '-' );

  //  If this happens to be our logo-bearing Cubelet
  //  we had better attach the logo to it!

  this.isStickerCubelet =
    this.front.color && this.front.color.name === 'white' && this.type === 'center';

  //  We need to know if we're "engaged" on an axis
  //  which at first seems identical to isTweening,
  //  until you consider partial rotations.

  this.isEngagedX = false;
  this.isEngagedY = false;
  this.isEngagedZ = false;

  //  These will perform their actions, of course,
  //  but also setup their own boolean toggles.

  //  During a rotation animation this Cubelet marks itself as
  //  this.isTweening = true.
  //  Very useful. Let's try it out.

  this.isTweening = false;

  //  Some fun tweenable properties.

  this.opacity = 1;
  this.radius  = 0;

};


//  Let's add some functionality to Cubelet's prototype
//  By adding to Cubelet's prototype and not the Cubelet constructor
//  we're keeping instances of Cubelet super clean and light.
ThreeTwist.Cubelet.prototype = Object.create( THREE.Object3D.prototype );

ThreeTwist.extend( ThreeTwist.Cubelet.prototype, {

  //  Aside from initialization this function will be called
  //  by the Cube during remapping.
  //  The raw address is an integer from 0 through N^3 - 1
  //  mapped to the Cube in the same fashion as this.id.
  //  The X, Y, and Z components each range from 0 through N - 1 inclusive.

  setAddress: function( address ){

    this.address  = address || 0;
    this.addressX = Math.floor(address / (this.cube.order * this.cube.order));
    this.addressY = Math.floor(address % (this.cube.order * this.cube.order) / this.cube.order);
    this.addressZ = address % this.cube.order;

  },

  //  Does this Cubelet contain a certain color?
  //  If so, return a String describing what face that color is on.
  //  Otherwise return false.

  hasColor: function( color ){

    var i, face, faceColorRGB,
      colorRGB = _.hexToRgb( color.hex );

    for( i = 0; i < ThreeTwist.Direction.numDirections; i ++ ){

      faceColorRGB = _.hexToRgb( this.faces[ i ].color.hex );

      if( faceColorRGB.r === colorRGB.r &&
          faceColorRGB.g === colorRGB.g &&
          faceColorRGB.b === colorRGB.b ){
        face = i;
        break;
      }
    }
    if( face !== undefined ){

      return [
        'front',
        'up',
        'right',
        'down',
        'left',
        'back'
      ][ face ];

    }
    else {
      return false;
    }
  },

  //  Similar to above, but accepts an arbitrary number of colors.
  //  This function implies AND rather than OR, XOR, etc.

  hasColors: function(){

    var cubelet = this,
        result  = true,
        colors  = Array.prototype.slice.call( arguments );

    colors.forEach( function( color ){

      result = result && !!cubelet.hasColor( color );
    });
    return result;
  },

  getRadius: function(){

    return this.radius;
  },
  setRadius: function( radius, onComplete ){

    //  @@
    //  It's a shame that we can't do this whilst tweening
    //  but it's because the current implementation is altering the actual X, Y, Z
    //  rather than the actual radius. Can fix later.

    //  Current may produce unexpected results while shuffling. For example:
    //    cube.corners.setRadius( 90 )
    //  may cause only 4 corners instead of 6 to setRadius()
    //  because one side is probably engaged in a twist tween.

    if( this.isTweening === false ){

      radius = radius || 0;
      if( this.radius === undefined ) {
        this.radius = 0;
      }

      if( this.radius !== radius ){

        //  Here's some extra cuteness to make the tween's duration
        //  proportional to the distance traveled.

        this.isTweening = true;

        var tweenDuration = ( this.radius - radius ).absolute(),
          obj = {radius:this.radius};

        new TWEEN.Tween( obj )
        .to( { radius: radius }, tweenDuration )
        .easing( TWEEN.Easing.Quartic.Out )
        .onUpdate( function(){

          this.position.set( this.addressX.multiply( this.size + obj.radius  ) + 0.2,
                             this.addressY.multiply( this.size + obj.radius  ) + 0.2,
                             this.addressZ.multiply( this.size + obj.radius  ) + 0.2 );
          this.updateMatrix();
          this.matrixSlice.copy( this.matrix );

          this.radius = obj.radius;

        }.bind( this ))
        .onComplete( function(){

          this.isTweening = false;

          this.position.set( this.addressX.multiply( this.size + obj.radius  ) + 0.2,
                             this.addressY.multiply( this.size + obj.radius  ) + 0.2,
                             this.addressZ.multiply( this.size + obj.radius  ) + 0.2 );
          this.updateMatrix();
          this.matrixSlice.copy( this.matrix );

          this.radius = obj.radius;

          if( onComplete instanceof Function ) {
            onComplete();
          }

        }.bind( this ))
        .start( this.cube.time );

      }

    }

  }

});

// Make a cubelet type array that can be indexed by number of extroverted facelets.
ThreeTwist.Cubelet.types = [
  'inner',
  'center',
  'edge',
  'corner',
  , // There are no order 4 cubelets
  , // or order 5 cubelets,
  'unitary', // but there may be one order 6 cubelet.
];
