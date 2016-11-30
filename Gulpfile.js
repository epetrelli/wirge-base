var gulp = require('gulp');
var gls = require('gulp-live-server');
var wiredep = require('wiredep').stream;
var angularFilesort = require('gulp-angular-filesort');
var inject = require('gulp-inject');
var rename = require("gulp-rename");
var clean = require('gulp-clean');
var rev = require('gulp-rev');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css')
var mainBowerFiles = require('gulp-main-bower-files');
var gulpFilter = require('gulp-filter');
var flatten = require('gulp-flatten');
var modifyCssUrls = require('gulp-modify-css-urls');
var jshint = require('gulp-jshint');
var ngAnnotate = require('gulp-ng-annotate')
var imagemin = require('gulp-imagemin');
var htmlmin = require('gulp-htmlmin');
var templateCache = require('gulp-angular-templatecache');

var DEV_DIR = './src/main/webapp/';
var INJECT_SCRIPTS = [DEV_DIR + 'app/**/*.js'];
var PUBLISH_PORT = 8081;

var server;

gulp.task('default', ['index-clean', 'index-rename', 'inject', 'serve_dev']);

gulp.task('index-clean', function () {

    //Deletes index.html

    var stream = gulp
        .src('./src/main/webapp/index.html')
        .pipe(clean());
    return stream;
});

gulp.task('index-rename', ['index-clean'], function () {

    //Rename index.clean.html -> index.html

    var stream = gulp.src('./src/main/webapp/index.clean.html')
        .pipe(rename('index.html'))
        .pipe(gulp.dest('./src/main/webapp/'));
    return stream;

});

gulp.task('inject', ['index-clean', 'index-rename'], function () {

    // injects bower and app components

    gulp.src('./src/main/webapp/index.html')

        .pipe(wiredep())

        .pipe(gulp.dest(DEV_DIR))
        .pipe(inject(gulp.src(INJECT_SCRIPTS, {read: true}).pipe(angularFilesort()), {relative: true}))
        .pipe(inject(gulp.src([DEV_DIR + 'styles/**/*.css', DEV_DIR + 'bower_components/ekko-lightbox/**/*.min.css'], {read: false}), {relative: true}))
        .pipe(gulp.dest(DEV_DIR));
});

gulp.task('serve_dev', ['index-clean', 'index-rename', 'inject'], function () {

    server = gls.static(DEV_DIR, PUBLISH_PORT);
    server.start();
    console.log("Serving folder " + DEV_DIR + " on port " + PUBLISH_PORT + ".");


    //gulp.watch([DEV_DIR + '**/*.css', DEV_DIR + '**/*.js', DEV_DIR + '**/*.html', '!' + DEV_DIR + '**/index.html'], function (file) {
    //
    //    server.notify.apply(server, [file]);
    //    console.log("Changes applied");
    //});

    gulp.watch([DEV_DIR + '**/*.css', DEV_DIR + '**/*.js', DEV_DIR + '**/*.html', '!' + DEV_DIR + '**/index.html'],
        ['index-clean', 'index-rename', 'inject', function(file){
            server.notify.apply(server, [file]);
            console.log("Changes applied");
        }]);

    console.log("Watching...")

});


// DIST tasks:

var bases = {
    app: 'src/main/webapp/',
    dist: 'target/dist/',
    tmp : 'target/tmp/'
};

var paths = {
    js: [
        bases.app + 'app/**/*.js',
        bases.app + 'scripts/jquery.seatmap.js',
        '!' + bases.app + 'app/**/*_dev.js'
    ],
    html: [
        bases.app + '**/*.html',
        '!' + bases.app + 'swagger/**/*.html',
        '!' + bases.app + 'bower_components/**/*.html'
    ],
    fonts: [
        bases.app + '**/*.eot',
        bases.app + '**/*.svg',
        bases.app + '**/*.ttf',
        bases.app + '**/*.woff',
        bases.app + '**/*.woff2',
    ],
    json : [
        bases.app + '**/*.json',
        '!' + bases.app + 'bower_components/**/*.json'
    ],
    images: [
        bases.app + 'images/*.png',
        bases.app + '*.ico',
        bases.app + 'images/*.cur',
        bases.app + 'images/*.jpg'
    ],
    scripts : [bases.app + 'scripts/**/*.js'],
    scriptsLocale : [bases.app + 'scripts/angular-locale_??.js'],
    scriptsSeatmap : [bases.app + 'scripts/jquery.seatmap.js'],
    scriptsOIDC : [bases.app + 'scripts/oidc-token-manager.js']
};

var config = {
    templateCache: {
        file: 'blocks.templates.run.js',
        html: [
            bases.app + 'app/**/*.html'
        ],
        options: {
            module: 'blocks.templates',
            root: 'app/',
            standAlone: false
        }
    }
};

// Delete the dist directory
gulp.task('clean-dist', function () {
    var stream = gulp.src(bases.dist)
        .pipe(clean())
        .pipe(gulp.src(bases.tmp))
        .pipe(clean());
    return stream;
});

// Gulp task for creating template cache
gulp.task('template-cache', function() {

    return gulp
        .src(config.templateCache.html)
        .pipe(htmlmin({collapseWhitespace: true, minifyCSS : true, removeComments : true, removeEmptyAttributes : true, removeRedundantAttributes : true}))
        .pipe(templateCache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(bases.app + 'app/blocks/templates'));
});


// Process app scripts
gulp.task('minify_app_scripts', ['clean-dist'], function () {
    var stream = gulp.src(paths.js)
        /*
        .pipe(jshint())
        .pipe(jshint.reporter('default', { verbose: true }))
        .pipe(jshint.reporter('fail'))
        */
        .pipe(angularFilesort())
        .pipe(ngAnnotate())
        .pipe(uglify())     /*  {mangle: false}  */
        .pipe(concat('20.app.min.js'))
        .pipe(gulp.dest(bases.tmp + 'app/'))
        .pipe(rev())
        .pipe(gulp.dest(bases.dist + 'app/'));
    return stream;
});

// Process lib scripts
gulp.task('minify_lib_scripts', ['clean-dist'], function () {

    var stream = gulp.src('./bower.json')
        .pipe(mainBowerFiles('**/*.js'))
        .pipe(uglify())
        .pipe(concat('10.lib.min.js'))
        .pipe(gulp.dest(bases.tmp + 'app/'))
        .pipe(rev())
        .pipe(gulp.dest(bases.dist + 'app/'));
    return stream;
});

// Process app styles
gulp.task('minify-app-css', ['clean-dist'], function () {
    var stream = gulp.src([bases.app + 'styles/**/*.css'])
        .pipe(concat('20.app.min.css'))
        .pipe(minify())
        .pipe(gulp.dest(bases.tmp + 'css'))
        .pipe(rev())
        .pipe(gulp.dest(bases.dist + 'css'));
    return stream;
});

// Process lib styles
gulp.task('minify-lib-css', ['clean-dist'], function () {
    var out = [];

    var filterFonts = gulpFilter(['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.svg' ]);
    var filterImages = gulpFilter(['**/*.jpg', '**/*.gif', '**/*.png']);
    var filterCss = gulpFilter(['**/*.css', '!**/bootstrap/dist/css/*.css']);

    var patternImages = new RegExp(/(gif|jpg|png)$/i);
    var patternFonts = new RegExp(/(woff|woff2|ttf|eot|svg)/);

    var stream0 = gulp.src('./bower.json')
        .pipe(mainBowerFiles())
        .pipe(filterCss)
        .pipe(concat('10.lib.min.css'))
        .pipe(modifyCssUrls({
            modify: function (url, filePath) {
                var sOut = "unknown/";
                var aUrl = url.split("/");
                var fileName =  aUrl[(aUrl.length-1)];

                if(patternFonts.test(fileName)){
                    //console.log("it's a font: " + fileName)
                    sOut = "fonts/";
                }
                if(patternImages.test(fileName)){
                    //console.log("it's a img: " + fileName)
                    sOut = "img/";
                }
                sOut += fileName;
                //console.log("returning " + sOut);
                return sOut;
            },
            prepend: '',
            append: ''
        }))
        .pipe(minify())
        .pipe(gulp.dest(bases.tmp + 'css'))
        .pipe(rev())
        .pipe(gulp.dest(bases.dist + 'css'));
    out[0] = stream0;

    var stream1 = gulp.src(bases.app + "bower_components/**/*")
        .pipe(filterImages)
        .pipe(flatten())
        .pipe(gulp.dest(bases.dist + 'css/img'));
    out[1] = stream1;

    var stream2 = gulp.src(bases.app + "bower_components/**/*")
        .pipe(filterFonts)
        .pipe(flatten())
        .pipe(gulp.dest(bases.dist + 'css/fonts'));
    out[2] = stream2;


    return out;
});

// Copy all other files to dist directly
gulp.task('copy-html', ['clean-dist'], function () {
    // Copy html
    var stream = gulp.src(paths.html)
        .pipe(htmlmin({collapseWhitespace: true, minifyCSS : true, removeComments : true, removeEmptyAttributes : true, removeRedundantAttributes : true}))
        .pipe(gulp.dest(bases.dist))
    return stream;
});

gulp.task('copy-fonts', ['clean-dist'], function () {
    var stream = gulp.src(paths.fonts)
        .pipe(gulp.dest(bases.dist));
    return stream;
});

gulp.task('copy-json', ['clean-dist'], function () {
    var stream = gulp.src(paths.json)
        .pipe(gulp.dest(bases.dist));
    return stream;
});

gulp.task('copy-images', ['clean-dist'], function () {
    // Copy images
    var stream = gulp.src(paths.images)
        .pipe(imagemin())
        .pipe(gulp.dest(bases.dist + '/images'));
    return stream;
});

gulp.task('copy-scriptsLocale', ['clean-dist'], function () {
    // Copy scripts for locale mgmt
    var stream = gulp.src(paths.scriptsLocale).pipe(gulp.dest(bases.dist + '/scripts'));
    return stream;
});

gulp.task('copy-scriptsOIDC', ['clean-dist'], function () {
    // Copy oidc (it's already inccluded in lib.js but it is also required by callback which calls it directely
    var stream = gulp.src(paths.scriptsOIDC).pipe(gulp.dest(bases.dist + '/scripts'));
    return stream;
});


gulp.task('dist-index-clean', ['copy-html'], function () {

    // Deletes index.html and index.clean from dist:
    // index.clean will be renamed starting from sources

    var stream = gulp.src([bases.dist + 'index.html', bases.dist + 'index.clean.html'])
        .pipe(clean());
    return stream;
});

gulp.task('dist-index-rename', ['dist-index-clean'], function () {

    //Rename index.clean.html -> index.html

    var stream = gulp.src(bases.app + 'index.clean.html')
        .pipe(rename('index.html'))
        .pipe(gulp.dest(bases.dist));
    return stream;
});

gulp.task('dist-inject', ['dist-index-clean', 'dist-index-rename','minify_app_scripts', 'minify_lib_scripts', 'minify-app-css', 'minify-lib-css'], function () {

    // injects bower and app components

    var stream = gulp.src(bases.dist + 'index.html')
        .pipe(inject(gulp.src([bases.dist + 'app/**/*.js', bases.dist + 'css/**/*.css'], {read: true}), {relative: true}))
        .pipe(gulp.dest(bases.dist));
    return stream;
});

gulp.task('dist-index-minify', ['dist-inject'], function () {

    var stream = gulp.src(bases.dist + 'index.html')
        .pipe(htmlmin({collapseWhitespace: true, minifyCSS : true, removeComments : true, removeEmptyAttributes : true, removeRedundantAttributes : true}))
        .pipe(gulp.dest(bases.dist));
    return stream;
});


gulp.task('dist-serve', ['dist'],
    function () {

    // serves target folder to test the app

    server = gls.static(bases.dist, PUBLISH_PORT);
    server.start();
    console.log("Serving folder " + bases.dist + " on port " + PUBLISH_PORT + ".");


});

// Define the dist task as a sequence of the above tasks
gulp.task('dist', [
    'clean-dist',
    'template-cache',
    'minify_app_scripts',
    'minify_lib_scripts',
    'minify-app-css',
    'minify-lib-css',
    'copy-html',
    'copy-fonts',
    'copy-json',
    'copy-images',
    'copy-scriptsLocale',
    'copy-scriptsOIDC',
    'dist-index-clean',
    'dist-index-rename',
    'dist-inject',
    'dist-index-minify'
]);
