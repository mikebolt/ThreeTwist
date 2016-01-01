/**
 * algorithm.js
 *
 * Contains the Algorithm class.
 * The Algorithm class represents an algorithm for the 3x3x3 cube. Algorithms are immutable.
 * The Algorithm class has a static method 'parseAlgorithm' which parses an Algorithm from a string.
 * Identical algorithms which are performed differently will be considered different algorithms
 * according to the equals method, but not the functionallyEquals method.
 *
 * @author Michael Casebolt
 */

(function() {
  ThreeTwist.Algorithm = function(moveArray) {
    if (!(moveArray instanceof Array)) {
      this._moveArray = [];
    }
    else {
      this._moveArray = moveArray;
    }
  };
  
  ThreeTwist.extend(ThreeTwist.Algorithm.prototype, {
    append: function(toAppend) {
      // You can append an entire Algorithm.
      if (toAppend instanceof ThreeTwist.Algorithm) {
        return new ThreeTwist.Algorithm(this._moveArray.concat(toAppend._moveArray));
      }
      // You can also append an individual Twist or an array of Twists.
      else {
        return new ThreeTwist.Algorithm(this._moveArray.concat(toAppend));
      }
    },
    
    inverse: function() {
      var inversedMoves = [];
      for (var i = this._moveArray.length - 1; i >= 0; --i) {
        inversedMoves.push(this._moveArray[i].getInverse());
      }
      return new ThreeTwist.Algorithm(inversedMoves);
    },
    
    repeat: function(n) {
      var repeatedMoves = [];
      for (var i = 0; i < n; ++i) {
        Array.prototype.push.apply(repeatedMoves, this._moveArray);
      }
      return new ThreeTwist.Algorithm(repeatedMoves);
    },
    
    getMoveArray: function() {
      // Return a copy of the internal move array.
      return Array.apply(null, this._moveArray);
    },
    
    // TODO: mirror: function(normalVector) ...
    // TODO: reverseMoveOrder: function() ...
    // TODO: inverseMoves: function() ...
    // TODO: toString: function() ...
    // TODO: simplify: function(shouldPreserveRotationDirection) ...
    // TODO: equals: function(otherAlgorithm) ...
    // TODO: functionallyEquals: function(otherAlgorithm) ...
  });
  
  // Make the parsers here
  var string = Parsimmon.string;
  var optWhitespace = Parsimmon.optWhitespace;
  var seq = Parsimmon.seq;
  var lazy = Parsimmon.lazy;
  var regex = Parsimmon.regex;
  var alt = Parsimmon.alt;
  var succeed = Parsimmon.succeed;
  
  // Faces: F U R B D L
  var frontFace = string('F');
  var upFace = string('U');
  var rightFace = string('R');
  var backFace = string('B');
  var downFace = string('D');
  var leftFace = string('L');
  
  var face = frontFace.or(upFace)
                      .or(rightFace)
                      .or(backFace)
                      .or(downFace)
                      .or(leftFace);
  
  // Center Slices: E M S
  var equatorSlice = string('E');
  var middleSlice = string('M');
  var standingSlice = string('S');
  
  var centerSlice = equatorSlice.or(middleSlice).or(standingSlice);
  
  // Cube Axes: X Y Z
  var x = string('X');
  var y = string('Y');
  var z = string('Z');
  
  var cubeAxis = x.or(y).or(z);
  
  // Deep Cuts: f u r b d l
  // TODO: supporting these will require modifying Twist.js.
  /*
  var frontDeepCut = string('f');
  var upDeepCut = string('u');
  var rightDeepCut = string('r');
  var backDeepCut = string('b');
  var downDeepCut = string('d');
  var leftDeepCut = string('l');
  */
  
  /*
  var deepCut = frontDeepCut.or(upDeepCut)
                            .or(rightDeepCut)
                            .or(backDeepCut)
                            .or(downDeepCut)
                            .or(leftDeepCut);
  */
  
  var inverseMark = string("'");
  var multiplier = regex(/[0-9]+/);
  
  var lparen = string('(');
  var rparen = string(')');
  
  var NO_SUFFIX = "NO_SUFFIX";
  
  var moveSuffix = alt(inverseMark.or(multiplier), succeed(NO_SUFFIX));
  var groupAndAxis = face.or(centerSlice).or(cubeAxis);// .or(deepCut);
  
  // Currently moves like R2' are not valid, but moves like R5 and R0 are valid.
  var move = seq(groupAndAxis, moveSuffix).map(function(moveParts) {
    var groupAndAxis = moveParts[0];
    var suffix = moveParts[1];
    var angle;
    
    // If there is no suffix, assume a 90 degree clockwise turn.
    if (suffix === NO_SUFFIX) {
      angle = 90;
    }
    // If suffix is an inverse mark, then it is a 90 degree counterclockwise turn.
    else if (suffix === "'") {
      angle = -90;
    }
    // Otherwise, if suffix is not an inverse mark, then it must be a multiplier.
    else {
      angle = 90 * parseInt(suffix, 10);
    }
    
    return new ThreeTwist.Twist(groupAndAxis.toUpperCase(), angle);
  });
  
  // This parser must be defined lazily because 'moveGroup' and 'algorithm' are mutually recursive.
  var moveGroup = lazy(function() {
    // The 'results' of the parsers lparen and rparen are stored in the array that gets
    // passed in as the moveGroupParts parameter, but they are ignored.
    return seq(lparen, algorithm, rparen, moveSuffix).map(function(moveGroupParts) {
      var algorithmResult = moveGroupParts[1];
      var suffix = moveGroupParts[3];
      
      if (suffix === NO_SUFFIX) {
        return algorithmResult;
      }
      else if (suffix === "'") {
        return algorithmResult.inverse();
      }
      else {
        var multiplier = parseInt(suffix, 10);
        return algorithmResult.repeat(multiplier);
      }
    });
  });
  
  var algorithm = move.or(moveGroup).many().map(function(algorithmParts) {
    var moveArray = [];
    algorithmParts.forEach(function(algorithmPart) {
      // The moveGroup parser returns an Algorithm.
      if (algorithmPart instanceof ThreeTwist.Algorithm) {
        Array.prototype.push.apply(moveArray, algorithmPart._moveArray);
      }
      // The move parser returns a Twist.
      else if (algorithmPart instanceof ThreeTwist.Twist) {
        moveArray.push(algorithmPart);
      }
    });
    return new ThreeTwist.Algorithm(moveArray);
  });
  
  ThreeTwist.Algorithm.parseAlgorithm = function(algorithmString) {
    var parseResult = algorithm.parse(algorithmString.replace(/\s/g, ''));
    return parseResult.status ? parseResult.value : false;
  };
})();