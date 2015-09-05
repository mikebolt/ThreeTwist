
/**
 * Based on THREE.CSSRenderer http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
 *
 * The IeCss3DRenderer is a heavily influenced/modified version of the THREE.CSS3DRenderer. It is designed to circumvent
 * the annoyingly problematic fact that IE 10/11 does not support the 'preserve-3d' property which means we need to calculate
 * and apply the model view matrix to each dom elements individually. Not only this, but it needs a manual depth sorting
 * routine. Painter sort just doesn't cut the mustard.
 *
 * For those reasons, this renderer is not general purpose, it only works with Cuber. It makes a lot of assumptions about
 * the elements it's rendering. It could be possible to refactor this into a generalised CSS 3D renderer for IE, but not
 * without some significant work.
 *
 * NOTE: This isn't entirely bug free. There are some visible glitches when the depth sorting is incorrect.
 *
 */


THREE.CSS3DObject = function ( element ) {

  THREE.Object3D.call( this );

  this.element = element;
  this.element.style.position = 'absolute';

  this.addEventListener( 'removed', function ( event ) {

    if ( this.element.parentNode !== null ) {

      this.element.parentNode.removeChild( this.element );

      for ( var i = 0, l = this.children.length; i < l; i ++ ) {

        this.children[ i ].dispatchEvent( event );

      }

    }

  } );

};

THREE.CSS3DObject.prototype = Object.create( THREE.Object3D.prototype );

THREE.CSS3DSprite = function ( element ) {

  THREE.CSS3DObject.call( this, element );

};

THREE.CSS3DSprite.prototype = Object.create( THREE.CSS3DObject.prototype );



ThreeTwist.IeCss3DRenderer = function ( cube ) {

  var _width, _height;
  var _widthHalf, _heightHalf;

  var domElement = document.createElement( 'div' );
  domElement.style.overflow = 'hidden';

  this.domElement = domElement;

  var cameraElement = document.createElement( 'div' );

  domElement.appendChild( cameraElement );

  this.setClearColor = function () {

  };

  this.setSize = function ( width, height ) {

    _width = width;
    _height = height;

    _widthHalf = _width / 2;
    _heightHalf = _height / 2;

    domElement.style.width = width + 'px';
    domElement.style.height = height + 'px';;


    cameraElement.style.width = width + 'px';
    cameraElement.style.height = height + 'px';

  };

  var epsilon = function ( value ) {

    return Math.abs( value ) < 0.0001 ? 0 : value;

  };



  var getObjectCSSTransform = function(){


    var position = new THREE.Vector3(),
      scale    = new THREE.Vector3(),
      euler    = new THREE.Euler(),
      quaternion = new THREE.Quaternion();


    euler._quaternion = quaternion;
    quaternion._euler = euler;

    return function ( matrix ) {

      matrix.decompose( position, quaternion, scale );

      var result;

      // Add the translation
      result = 'translate3d(-50%,-50%,0) translate3d(';
      result += epsilon( position.x );
      result += 'px, ';
      result += epsilon( position.y );
      result += 'px, ';
      result += epsilon( position.z );
      result += 'px) ';
      
      // Add the rotation
      result += 'rotateX(';
      result += epsilon( euler.x );
      result += 'rad) rotateY(';
      result += epsilon( euler.y );
      result += 'rad) rotateZ(';
      result += epsilon( euler.z );
      result += 'rad) ';
        
      // Add the scaling
      result += 'scale3d(';
      result += epsilon( scale.x );
      result += ', ';
      result += epsilon( scale.y );
      result += ', ';
      result += epsilon( scale.z );
      result += ')';

      return result;
    };

  }();


  var cameraMatrix = new THREE.Matrix4();
  var matrixWorld = new THREE.Matrix4();

  var projectVector = function(){

    var viewProjectionMatrix = new THREE.Matrix4();

    return function( vector, camera ) {


      viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );

      return vector.applyProjection( viewProjectionMatrix );
      // return vector;//.applyProjection( viewProjectionMatrix );

    };

  }();

  var fovOffset = new THREE.Matrix4();
  var screenCenter = new THREE.Matrix4();
  var fov;

  var renderObject = function ( object ) {


    matrixWorld.multiplyMatrices( cameraMatrix, object.matrixWorld );

    matrixWorld.elements[4] *= -1;
    matrixWorld.elements[5] *= -1;
    matrixWorld.elements[6] *= -1;
    matrixWorld.elements[7] *= -1;


    var style =  getObjectCSSTransform( matrixWorld  );


    var element = object.element;


    element.style.WebkitTransform = style;
    element.style.MozTransform = style;
    element.style.oTransform = style;
    element.style.transform = style;

    element.style.WebkitPerspective = fov + "px";
    element.style.MozPerspective = fov + "px";
    element.style.oPerspective = fov + "px";
    element.style.perspective = fov + "px";


    if ( element.parentNode !== cameraElement ) {

      cameraElement.appendChild( element );

    }
    
  };

  function painterSort( a, b ){
    return a.z - b.z;
  }


  function sortVerts( obj ){

    var halfCubeletSize = cube.cubeletSize * 0.5;
    obj.userData.points[0].set( -halfCubeletSize, -halfCubeletSize, 0 ).applyMatrix4( obj.matrixWorld );
    obj.userData.points[1].set(  halfCubeletSize, -halfCubeletSize, 0 ).applyMatrix4( obj.matrixWorld );
    obj.userData.points[2].set(  halfCubeletSize,  halfCubeletSize, 0 ).applyMatrix4( obj.matrixWorld );
    obj.userData.points[3].set( -halfCubeletSize,  halfCubeletSize, 0 ).applyMatrix4( obj.matrixWorld );

    obj.userData.points.sort( painterSort );

    return obj.userData.points;

  }



  var sameSide = function(){

    var normal = new THREE.Vector3(),
      origin = new THREE.Vector3(),
      delta = new THREE.Vector3(),
      i = 4;

    return function ( a, points ){

      normal.set( 0, 0, 1 ).transformDirection( a.matrixWorld );
      origin.set( 0, 0, 0 ).applyMatrix4( a.matrixWorld );

      i = 4;
      while( i-- > 0 ){

        delta.subVectors( points[i], origin );//.normalize();
        if(  epsilon( normal.dot( delta )) < 0 ) {
          return false;
        }

      }

      return true;


    };
  }();

  function Intersects( P, Q ){

    return   IntersectsProp( P, Q, 'x' ) &&
        IntersectsProp( P, Q, 'y' ) &&
        IntersectsProp( P, Q, 'z' );

  }

  function smallest( v, p ){

    v.copy( p[0] );

    var i = p.length;
    while( i-- > 0 ){

      v.min( p[i] );

    }

    return v;

  }

  function largest( v, p ){

    v.copy( p[0] );

    var i = p.length;
    while( i-- > 0 ){

      v.max( p[i] );

    }

    return v;

  }

  function sharedEdge( a, b ){

    var sharedVertices = 0;

    var p = a.userData.points.length,
      q = b.userData.points.length;

    while( p-- > 0 ){
      q = b.userData.points.length;
      while( q-- > 0 ){

        if( epsilon( a.userData.points[p].distanceTo( b.userData.points[q] )) === 0 ){
          sharedVertices++;
        }

      }

    }

    return sharedVertices > 1;

  }


  function IntersectsProp( P, Q, prop ){

    return Q.userData.max[prop] > P.userData.min[prop] && P.userData.max[prop] > Q.userData.min[prop];

  }

  var firstRender = true;
  var renderList = [];

  this.render = function ( scene, camera ) {

    fov = 0.5 / Math.tan( THREE.Math.degToRad( camera.fov * 0.5 ) ) * _height;

    domElement.style.WebkitPerspective = fov + "px";
    domElement.style.MozPerspective = fov + "px";
    domElement.style.oPerspective = fov + "px";
    domElement.style.perspective = fov + "px";

    scene.updateMatrixWorld();

    if ( camera.parent === undefined ) {
      camera.updateMatrixWorld();
    }

    camera.matrixWorldInverse.getInverse( camera.matrixWorld );

    screenCenter.makeTranslation( _widthHalf, -_heightHalf, 0 );
    fovOffset.makeTranslation( 0, 0, fov );

    cameraMatrix.copy( screenCenter );            // Offset to center screen
    cameraMatrix.multiply( camera.matrixWorldInverse );    // Get view
    cameraMatrix.multiply( fovOffset );            // Add FOV offset


    cameraMatrix.elements[1] *= -1;
    cameraMatrix.elements[5] *= -1;
    cameraMatrix.elements[9] *= -1;
    cameraMatrix.elements[13] *= -1;


    renderList = [];



    cube.cubelets.forEach( function(cubelet){

      cubelet.faces.forEach( function(face){

        if( firstRender ){
          if( face.object3D.userData.min === undefined ){
            face.object3D.userData.min = new THREE.Vector3();
            face.object3D.userData.max = new THREE.Vector3();
            face.object3D.userData.points = [
              new THREE.Vector3(),
              new THREE.Vector3(),
              new THREE.Vector3(),
              new THREE.Vector3()
            ];
          }
        }
        renderList.push( face.object3D );

      });

    });




    var sorted, p1z, p2z;



    // Sort by furthest point
    renderList.sort( function( a, b ){

      sorted = sortVerts( a, camera );
      p1z = sorted[0].z;
      smallest( a.userData.min, sorted );
      largest( a.userData.max, sorted );


      sorted = sortVerts( b, camera );
      p2z = sorted[0].z;
      smallest( b.userData.min, sorted );
      largest( b.userData.max,  sorted );

      a.userData.zIndex = null;
      b.userData.zIndex = null;

      return p1z - p2z;

    });


    var p = renderList.length, q, tmp, l = renderList.length;
    for ( p = 0 ; p < l; p ++ ) {

      q = p;

      var P = renderList[p];

      P.userData.zIndex = ( P.userData.zIndex === null ) ? p : P.userData.zIndex;


      for ( q = p; q < l; q ++ ) {

        var Q = renderList[q];

        Q.userData.zIndex = ( Q.userData.zIndex === null ) ? q : Q.userData.zIndex;


        if( Intersects( P, Q ) ) {

          if( sameSide ( P, Q.userData.points )){

            tmp = P.userData.zIndex;
            P.userData.zIndex = Math.min( P.userData.zIndex, q  );
            Q.userData.zIndex = Math.max( tmp, q );

          }

          else if( sameSide ( Q, P.userData.points )){

            tmp = Q.userData.zIndex;
            Q.userData.zIndex = Math.min( Q.userData.zIndex , P.userData.zIndex );
            P.userData.zIndex = Math.max( P.userData.zIndex, tmp  );
          }
        }

      }
    }




    var cam = new THREE.Vector3( 0, 0, -1 ),
      normal = new THREE.Vector3( 0, 0, -1 ),
      facing = false;
      objWorldPosition = new THREE.Vector3();

    for ( var i = 0, l = renderList.length; i < l; i ++ ) {

      renderObject( renderList[ i ], camera );

      objWorldPosition.set( renderList[i].matrixWorld.elements[12], renderList[i].matrixWorld.elements[13], renderList[i].matrixWorld.elements[14] );
      cam.subVectors( objWorldPosition, camera.position );

      facing =  normal.set( 0, 0, 1 ).transformDirection( renderList[i].matrixWorld ).dot( cam ) < 0;
      renderList[i].element.style.visibility = facing ? 'visible' : 'hidden';

      if( renderList[i] instanceof THREE.CSS3DObject ) {
        renderList[i].element.style.zIndex = renderList[i].userData.zIndex;
      }


    }

    firstRender = false;


  };
};
