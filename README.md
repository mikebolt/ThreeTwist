#ThreeTwist

ThreeTwist is a fork of the Cuber project, which was created for Google's Chrome Cube Lab. If you're
interested in the history of the Cuber project, check out [this link](http://stewd.io/w/rubikscube).

ThreeTwist is licensed under the MIT License included in the LICENSE.md file.

## Demos

Try out ThreeTwist in your browser using one of these links:

[1x1x1](https://mikebolt.github.io/ThreeTwist/examples/example_1.html) [2x2x2](https://mikebolt.github.io/ThreeTwist/examples/example_2.html) [3x3x3](https://mikebolt.github.io/ThreeTwist/examples/example_3.html) [4x4x4](https://mikebolt.github.io/ThreeTwist/examples/example_4.html) [5x5x5](https://mikebolt.github.io/ThreeTwist/examples/example_5.html) [6x6x6](https://mikebolt.github.io/ThreeTwist/examples/example_6.html) [7x7x7](https://mikebolt.github.io/ThreeTwist/examples/example_7.html)

There is a known bug in Firefox that causes inner "introvert" faces to show up due to bad depth ordering, and the result looks terrible. To fix this, you can just hide inner faces, using these steps:

1. Press F12, or CTRL+SHIFT+K, or use the menu to select Tools > Web Developer > Web Console.

2. In the console, enter the following line of JavaScript:

    cube.cubelets.forEach(function(cubelet) { cubelet.hideIntroverts(); });

##Downloading

If you have the git CLI installed, just open a terminal and change directories to a directory where you keep stuff like this and run the command

    git clone https://github.com/mikebolt/ThreeTwist

Otherwise, you can download the project as a zip file by [clicking this link or the "Download ZIP" button to the right](https://github.com/mikebolt/ThreeTwist/archive/master.zip).

##Building

Before building the project, make sure that you have node.js and npm installed. npm usually comes installed with node.js. [Visit this page for instructions on how to install both](https://docs.npmjs.com/getting-started/installing-node).

Next, open up your terminal and change directories to where you saved the ThreeTwist project directory. Then install the ThreeTwist npm package by running the command

    npm install

This just downloads and saves some npm packages (including gulp) into the node_modules directory. These packages are necessary for building this project.

Then run the command `gulp`. This will run all the gulp tasks necessary to build the merged ThreeTwist.js file, build the minified ThreeTwist.min.js file, run the linter, run the unit tests, and generate the documentation.

##Gulp Tasks

You can run the individual gulp tasks by running the command `gulp task-name` in the project directory.

- concat : This concatenates all the source files in the proper order to create ThreeTwist.js in the build directory.

##Wiki Links

[Style Guide](https://github.com/mikebolt/ThreeTwist/wiki/Style-Guide)
