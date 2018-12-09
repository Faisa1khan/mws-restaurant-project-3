var gulp = require('gulp');
var webp = require('gulp-webp');
var browserify = require('browserify');
var babelify = require('babelify');
var sourcemaps = require('gulp-sourcemaps');
var cleanCSS = require('gulp-clean-css');
var autoprefixer = require('gulp-autoprefixer');
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var uglify = require('gulp-uglify-es').default;
var rename = require('gulp-rename');

var gulpSequence = require('gulp-sequence');
var htmlmin = require('gulp-htmlmin');
var clean = require('gulp-clean');
var minifyInline = require('gulp-minify-inline');
const minifyJs = require('gulp-minify');
const concatJs = require('gulp-concat');

var workboxBuild = require('workbox-build');





// ===================== Default Task =====================
gulp.task('default', ['prod:serve']);

// ===================== Build & Serve Production Build =====================
gulp.task('prod:serve', gulpSequence('build'));

// ===================== Production Build =====================
gulp.task('build', gulpSequence('clean', 'concat-js', 'html:prod', 'styles:prod','copy:prod','webp:prod','pwa-service-worker'));

// Copy app contents to dist directory
gulp.task('copy:prod', function () {
    return gulp.src(['!node_modules/**', '**/*.{png,jpeg}', 'sw.js', 'manifest.json', '!gulpfile.js'])
        .pipe(gulp.dest('./dist'));
});

// ===================== Clean Build =====================
gulp.task('clean', function () {
    return gulp.src('./dist', {
            read: false
        })
        .pipe(clean());
});



/*
 * Progressive Web Apps
 * - pwa-service-worker
 * - pwa-manifest-copy2build
 */

// Create a service worker in build.
gulp.task('pwa-service-worker', () => {
    return workboxBuild.injectManifest({
      swSrc: 'src/js/sw.js',
      swDest: 'dist/sw.js',
      globDirectory: 'dist',
      globPatterns: [
        '**\/*.{html,css,js}',
         'manifest.json'
      ],
      globIgnores: [
        'workbox-config.js',
        'node_modules/**/*'
      ]
    }).then(({count, size, warnings}) => {
      // Optionally, log any warnings and details.
      warnings.forEach(console.warn);
      console.log(
        `[INFO] ${count} files will be precached, totaling ${size} bytes.`);
    }).catch(err => {
      console.log('[ERROR] ' + err);
    });
  });
  

// ===================== Minify HTML =====================
gulp.task('html:prod', function () {
    return gulp.src(['!node_modules/**', '**/*.html'])
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true
        }))
        .pipe(minifyInline())
        .pipe(gulp.dest('./dist'));
});

// ===================== WebP Image Conversion =====================
gulp.task('webp:prod', function () {
    gulp.src('img/*.jpg')
        .pipe(webp({
            method: 6
        }))
        .pipe(gulp.dest('./dist/img/webp'));
});

// ===================== Styles =====================
gulp.task('styles:prod', function () {
    gulp.src('css/styles.css')
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(rename('styles.min.css'))
        .pipe(gulp.dest('./dist/css'));

        gulp.src('css/details.css')
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(rename('details.min.css'))
        .pipe(gulp.dest('./dist/css'));

        gulp.src('css/common.css')
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(rename('common.min.css'))
        .pipe(gulp.dest('./dist/css'));
});


// ===================== Scripts =====================


gulp.task('concat-js', function() {
    gulp.src(['./js/review.js','./js/dbhelper.js','./js/idb.js'])
    //.pipe(sourcemaps.init())
    .pipe(concatJs('review.js'))
    .pipe(minifyJs())
    //.pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js'))
  
    gulp.src('./js/main.js')
    .pipe(concatJs('main.js'))
    .pipe(minifyJs())
    .pipe(gulp.dest('dist/js'))
  
    gulp.src('./js/restaurant_info.js')
    .pipe(concatJs('restaurant_info.js'))
    .pipe(minifyJs())
    .pipe(gulp.dest('dist/js'))
  })

    


  
    







