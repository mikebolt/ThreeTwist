/*


  COLORS

  Here's a little bootstrapping to create our Color constants.
  At first it seemed like overkill, but then as the solvers and inspectors
  moved forward having these objects available became highly desirable.
  Sure, ES5 doesn't really have constants but the all-caps alerts you
  to the fact that them thar variables ought not to be messed with.

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith


*/









ThreeTwist.Color = function( name, initial, hex, styleF, styleB ){

  this.name    = name;
  this.initial = initial;
  this.hex     = hex;
  this.styleF  = styleF;
  this.styleB  = styleB;
};


//  Global constants to describe sticker colors.

var W,
  O,
  B,
  R,
  G,
  Y,
  COLOURLESS;

W = ThreeTwist.WHITE = new ThreeTwist.Color(

  'white',
  'W',
  '#FFF',
  'font-weight: bold; color: #888',
  'background-color: #F3F3F3; color: rgba( 0, 0, 0, 0.5 )'
),
O = ThreeTwist.ORANGE = new ThreeTwist.Color(

  'orange',
  'O',
  '#F60',
  'font-weight: bold; color: #F60',
  'background-color: #F60; color: rgba( 255, 255, 255, 0.9 )'
),
B = ThreeTwist.BLUE = new ThreeTwist.Color(

  'blue',
  'B',
  '#00D',
  'font-weight: bold; color: #00D',
  'background-color: #00D; color: rgba( 255, 255, 255, 0.9 )'
),
R = ThreeTwist.RED = new ThreeTwist.Color(

  'red',
  'R',
  '#F00',
  'font-weight: bold; color: #F00',
  'background-color: #F00; color: rgba( 255, 255, 255, 0.9 )'
),
G = ThreeTwist.GREEN = new ThreeTwist.Color(

  'green',
  'G',
  '#0A0',
  'font-weight: bold; color: #0A0',
  'background-color: #0A0; color: rgba( 255, 255, 255, 0.9 )'
),
Y = ThreeTwist.YELLOW = new ThreeTwist.Color(

  'yellow',
  'Y',
  '#FE0',
  'font-weight: bold; color: #ED0',
  'background-color: #FE0; color: rgba( 0, 0, 0, 0.5 )'
),
ThreeTwist.COLORLESS = new ThreeTwist.Color(

  'NA',
  'X',
  '#DDD',
  'color: #EEE',
  'color: #DDD'
);
