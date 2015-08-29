/*


  DIRECTIONS

  We have six Directions which we map in a spiral around a cube: front, up,
  right, down, left, and back. That's nice on its own but what's important
  is the relationships between faces. For example, What's to the left of the
  Front face? Well that depends on what the Front face considers "up" to
  be. The ThreeTwist.Controls class handles these relationships and calculates clock-
  wise and anticlockwise relationships.


                   -------------
                  |             |
                  |      0      |   opposite
                  |             |
                  |    getUp()  |
                  |             |
     ------------- ------------- -------------
    |             |             |             |
    |      3      |             |      1      |
    |             |             |             |
    |  getLeft()  |    this     |  getRight() |
    |             |             |             |
     ------------- ------------- -------------
                  |             |
                  |      2      |
                  |             |
                  |  getDown()  |
                  |             |
                   -------------


  The following equalities demonstrate how Directions operate:

    FRONT.getOpposite().name === 'back'
    FRONT.getUp().name === 'up'
    FRONT.getUp( LEFT ).name === 'left'
    FRONT.getRight().name === 'right'
    FRONT.getRight( DOWN ).name === 'left'
    FRONT.getClockwise().name === 'right'
    FRONT.getClockwise( RIGHT ).name === 'down'

    RIGHT.getOpposite().name === 'left'
    RIGHT.getUp().name === 'up'
    RIGHT.getUp( FRONT ).name === 'front'
    RIGHT.getRight().name === 'back'
    RIGHT.getRight( DOWN ).name === 'front'
    RIGHT.getClockwise().name === 'back'
    RIGHT.getClockwise( FRONT ).name === 'up'


  Keep in mind that a direction cannot use itself or its opposite as the
  normalized up vector when seeking a direction!

    RIGHT.getUp( RIGHT ) === null
    RIGHT.getUp( LEFT  ) === null


  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith


*/








ThreeTwist.Direction = function( id, name, normal ){

  this.id        = id;
  this.name      = name.toLowerCase();
  this.normal    = normal;
  this.initial   = name.substr( 0, 1 ).toUpperCase();
  this.neighbors = [];
  this.opposite  = null;
};
ThreeTwist.Direction.prototype.setRelationships = function( up, right, down, left, opposite ){

  this.neighbors = [ up, right, down, left ];
  this.opposite  = opposite;
};




ThreeTwist.Direction.getNameById = function( id ){

  return [

    'front',
    'up',
    'right',
    'down',
    'left',
    'back'

  ][ id ];
};
ThreeTwist.Direction.getIdByName = function( name ){

  return {

    front: 0,
    up   : 1,
    right: 2,
    down : 3,
    left : 4,
    back : 5

  }[ name ];
};
ThreeTwist.Direction.getDirectionById = function( id ){

  return [

    ThreeTwist.Direction.FRONT,
    ThreeTwist.Direction.UP,
    ThreeTwist.Direction.RIGHT,
    ThreeTwist.Direction.DOWN,
    ThreeTwist.Direction.LEFT,
    ThreeTwist.Direction.BACK

  ][ id ];
};
ThreeTwist.Direction.getDirectionByInitial = function( initial ){

  return {

    F: ThreeTwist.Direction.FRONT,
    U: ThreeTwist.Direction.UP,
    R: ThreeTwist.Direction.RIGHT,
    D: ThreeTwist.Direction.DOWN,
    L: ThreeTwist.Direction.LEFT,
    B: ThreeTwist.Direction.BACK

  }[ initial.toUpperCase() ];
};
ThreeTwist.Direction.getDirectionByName = function( name ){

  return {

    front: ThreeTwist.Direction.FRONT,
    up   : ThreeTwist.Direction.UP,
    right: ThreeTwist.Direction.RIGHT,
    down : ThreeTwist.Direction.DOWN,
    left : ThreeTwist.Direction.LEFT,
    back : ThreeTwist.Direction.BACK

  }[ name.toLowerCase() ];
};
ThreeTwist.Direction.getDirectionByNormal = function(){

  var vector  = new THREE.Vector3();

  return function ( normal ){

    //  Flatten out any floating point rounding errors ...
    vector.x = Math.round( normal.x );
    vector.y = Math.round( normal.y );
    vector.z = Math.round( normal.z );

    return  vector.equals( ThreeTwist.Direction.FRONT.normal   ) ? ThreeTwist.Direction.FRONT :
        vector.equals( ThreeTwist.Direction.BACK.normal    ) ? ThreeTwist.Direction.BACK  :
        vector.equals( ThreeTwist.Direction.UP.normal   ) ? ThreeTwist.Direction.UP    :
        vector.equals( ThreeTwist.Direction.DOWN.normal   ) ? ThreeTwist.Direction.DOWN  :
        vector.equals( ThreeTwist.Direction.LEFT.normal   ) ? ThreeTwist.Direction.LEFT  :
        vector.equals( ThreeTwist.Direction.RIGHT.normal   ) ? ThreeTwist.Direction.RIGHT :
        null;
  };

}();




//  If we're looking at a particular face
//  and we designate an adjacet side as up
//  then we can calculate what adjacent side would appear to be up
//  if we rotated clockwise or anticlockwise.

ThreeTwist.Direction.prototype.getRotation = function( vector, from, steps ){

  if( from === undefined ) from = this.neighbors[ 0 ];
  if( from === this || from === this.opposite ) return null;
  steps = steps === undefined ? 1 : steps.modulo( 4 );
  for( var i = 0; i < 5; i ++ ){

    if( this.neighbors[ i ] === from ) break;
  }
  return this.neighbors[ i.add( steps * vector ).modulo( 4 )];
};
ThreeTwist.Direction.prototype.getClockwise = function( from, steps ){

  return this.getRotation( +1, from, steps );
};
ThreeTwist.Direction.prototype.getAnticlockwise = function( from, steps ){

  return this.getRotation( -1, from, steps );
};


//  Similar to above,
//  if we're looking at a particular face
//  and we designate an adjacet side as up
//  we can state what sides appear to be to the up, right, down, and left
//  of this face.

ThreeTwist.Direction.prototype.getDirection = function( direction, up ){

  return this.getRotation( 1, up, direction.id - 1 );
};
ThreeTwist.Direction.prototype.getUp = function( up ){

  return this.getDirection( ThreeTwist.Direction.UP, up );
};
ThreeTwist.Direction.prototype.getRight = function( up ){

  return this.getDirection( ThreeTwist.Direction.RIGHT, up );
};
ThreeTwist.Direction.prototype.getDown = function( up ){

  return this.getDirection( ThreeTwist.Direction.DOWN, up );
};
ThreeTwist.Direction.prototype.getLeft = function( up ){

  return this.getDirection( ThreeTwist.Direction.LEFT, up );
};



//  An convenience method that mimics the verbiage
//  of the getRotation() and getDirection() methods.

ThreeTwist.Direction.prototype.getOpposite = function(){

  return this.opposite;
};




//  Create facing directions as global constants this way we can access from
//  anywhere in any scope without big long variables names full of dots and
//  stuff. Sure, ES5 doesn't really have constants but the all-caps alerts you
//  to the fact that them thar variables ought not to be messed with.


ThreeTwist.Direction.FRONT = new ThreeTwist.Direction( 0, 'front', new THREE.Vector3(  0,  0,  1 ));
ThreeTwist.Direction.UP    = new ThreeTwist.Direction( 1, 'up'   , new THREE.Vector3(  0,  1,  0 ));
ThreeTwist.Direction.RIGHT = new ThreeTwist.Direction( 2, 'right', new THREE.Vector3(  1,  0,  0 ));
ThreeTwist.Direction.DOWN  = new ThreeTwist.Direction( 3, 'down' , new THREE.Vector3(  0, -1,  0 ));
ThreeTwist.Direction.LEFT  = new ThreeTwist.Direction( 4, 'left' , new THREE.Vector3( -1,  0,  0 ));
ThreeTwist.Direction.BACK  = new ThreeTwist.Direction( 5, 'back' , new THREE.Vector3(  0,  0, -1 ));


//  Now that they all exist we can
//  establish their relationships to one another.

ThreeTwist.Direction.FRONT.setRelationships( ThreeTwist.Direction.UP,    ThreeTwist.Direction.RIGHT, ThreeTwist.Direction.DOWN,  ThreeTwist.Direction.LEFT,  ThreeTwist.Direction.BACK  );
ThreeTwist.Direction.UP.setRelationships(    ThreeTwist.Direction.BACK,  ThreeTwist.Direction.RIGHT, ThreeTwist.Direction.FRONT, ThreeTwist.Direction.LEFT,  ThreeTwist.Direction.DOWN  );
ThreeTwist.Direction.RIGHT.setRelationships( ThreeTwist.Direction.UP,    ThreeTwist.Direction.BACK,  ThreeTwist.Direction.DOWN,  ThreeTwist.Direction.FRONT, ThreeTwist.Direction.LEFT  );
ThreeTwist.Direction.DOWN.setRelationships(  ThreeTwist.Direction.FRONT, ThreeTwist.Direction.RIGHT, ThreeTwist.Direction.BACK,  ThreeTwist.Direction.LEFT,  ThreeTwist.Direction.UP    );
ThreeTwist.Direction.LEFT.setRelationships(  ThreeTwist.Direction.UP,    ThreeTwist.Direction.FRONT, ThreeTwist.Direction.DOWN,  ThreeTwist.Direction.BACK,  ThreeTwist.Direction.RIGHT );
ThreeTwist.Direction.BACK.setRelationships(  ThreeTwist.Direction.UP,    ThreeTwist.Direction.LEFT,  ThreeTwist.Direction.DOWN,  ThreeTwist.Direction.RIGHT, ThreeTwist.Direction.FRONT );



