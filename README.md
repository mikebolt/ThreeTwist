#ThreeTwist

ThreeTwist is a JavaScript library for simulating, visualizing, and interacting with 3D twisty puzzles.

ThreeTwist is a continuation of the Cuber project created for Google's Chrome Cube Lab. If you're
interested in the history of the Cuber project, check out [this link](http://stewd.io/w/rubikscube).

The ThreeTwist project has the following goals:

- Fixing issues in the codebase
- Adding new features
- Clearly documenting all of the source code
- Integration with a modern build system
- Thorough unit testing
- Open, community-driven development process

ThreeTwist is licensed under the MIT License included in the LICENSE.md file.

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
- copy-stylesheets : This just copies the stylesheets from src/styles into the build/styles directory.
- minify : This concatenates the source files and minifies the result to create ThreeTwist.min.js in the build directory.
- jsdoc-generate : This runs the jsdoc-to-markdown script on the source files in order to turn the jsdoc comments into a complete markdown-formatted documentation.
- jshint : This runs jshint on each individual source file using the options found in the .jshintrc file, and prints out warnings to be heeded by all.

##Wiki Links

[Style Guide](https://github.com/mikebolt/ThreeTwist/wiki/Style-Guide)
