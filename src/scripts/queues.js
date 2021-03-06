/*

  QUEUES

  Queues are glorified Arrays and rather useful for things like our
  cube.twistQueue, cube.taskQueue, etc.

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith

*/


ThreeTwist.Queue = function( validation ){

  //  Do we want to run a validation routine on objects being stored in
  //  this ThreeTwist.Queue? If so you can send the function as an argument to the
  //  constructor or create this property later on your own.

  if( validation !== undefined && validation instanceof Function ) {
    this.validate = validation;
  }

  //  The rest is vanilla.

  this.history = [];
  this.useHistory = true;
  this.future  = [];
  this.isReady = true;
  this.isLooping = false;

};


//  The idea here with .add() is that .validate() will always return an Array.
//  The reason for this is that the validator may decide it needs to add more
//  than one element to the ThreeTwist.Queue. This allows it to do so.
ThreeTwist.Queue.prototype.add = function(){

  var elements = Array.prototype.slice.call( arguments );

  if( this.validate !== undefined && this.validate instanceof Function ) {
    elements = this.validate.apply(this, elements);
  }

  if( elements instanceof Array ){

    elements.forEach( function( element ){

      this.future.push( element );

    }.bind( this ));

  }

  return this.future;

};

ThreeTwist.Queue.prototype.remove = function(){

  var  elements = Array.prototype.slice.call( arguments );

  if( elements instanceof Array ){

    elements.forEach( function( element ){

      this.future = this.future.filter( function( futureElement ){
        return futureElement !== element;
      });

    }.bind( this ));

  }

  return this.future;

};

ThreeTwist.Queue.prototype.purge = function(){

  var elements = Array.prototype.slice.call( arguments );

  if( elements instanceof Array ){

    elements.forEach( function( element ){

      this.history = this.history.filter( function( historyElement ){
        return historyElement !== element;
      });

    }.bind( this ));

  }

  return this.history;

};

ThreeTwist.Queue.prototype.empty = function( emptyHistory ){

  this.future = [];
  if( emptyHistory ) {
    this.history = [];
  }

};

ThreeTwist.Queue.prototype.dequeue = function(){

  if( this.future.length ){

    var element = this.future.shift();
    if( this.useHistory ) {
      this.history.push( element );
    }
    return element;

  }
  else if( this.isLooping ){

    this.future  = this.history.slice();
    this.history = [];
  }

};

ThreeTwist.Queue.prototype.undo = function(){

  if( this.history.length ){

    var element = this.history.pop();
    this.future.unshift( element );
    return element;

  }

};
ThreeTwist.Queue.prototype.redo = function(){

  return this.dequeue();

};
