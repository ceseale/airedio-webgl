'use strict';
(function () {
  class MainController {
    constructor($scope, $http, $mdToast) {
      this.scope = $scope;
      this.scope.y1 = [];
      this.scope.y2 = [];
      this.scope.runBayes = () => {
        if (this.scope.y1.length && this.scope.y2.length) {
          this.scope.toast('Sampling Data!')
          this.startBayes(this.scope.y1, this.scope.y2);
        } else {
          this.scope.toast("One of your data boxes doesn't have data!")
        }
        
      }
      const setData = (data) => {
        this.data = data.data;
        return true;
      }
      this.scope.toast = (message) => {
        $mdToast.show(
        $mdToast.simple()
          .textContent(message)
          .position("top right")
          .hideDelay(3000)
      )};

      const hideLoading = data => {
        $scope.doneLoading = true;
      }
      $http.get('api/data').then(setData).then(hideLoading).then(this.renderMap.bind(this));
    }
    log(stuff) {
      console.log(stuff);
    }
    renderMap() {
      var layerArr = [];
      var dataNames = ['y1', 'y2'];
      var boxColors = ['']
      // Setting up crossfilter
      var ndx = crossfilter(this.data);
      ndx.groupAll()
      var latDim = ndx.dimension(data => {
        return data.lat;
      });
      var lngDim = ndx.dimension(data => {
          return data.lng;
        })
        // Creating Map
      var leafletMap = L.map('map', {
        zoomControl: false
      }).setView([37.784554114444994, -122.40520477294922], 5);
      L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png").addTo(leafletMap);
      // Adding webgl layer to map
      //add zoom control with your options
      L.control.zoom({
        position: 'topright'
      }).addTo(leafletMap);
      var glLayer = L.canvasOverlay().drawing(drawingOnCanvas).addTo(leafletMap);
      var canvas = glLayer.canvas();
      glLayer.canvas.width = canvas.clientWidth;
      glLayer.canvas.height = canvas.clientHeight;
      // Getting canvas element
      var gl = canvas.getContext('experimental-webgl', {
        antialias: true
      });
      var pixelsToWebGLMatrix = new Float32Array(16);
      var mapMatrix = new Float32Array(16);
      // -- WebGl setup
      var vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, document.getElementById('vshader').text);
      gl.compileShader(vertexShader);
      var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, document.getElementById('fshader').text);
      gl.compileShader(fragmentShader);
      // link shaders to create our program
      var program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.useProgram(program);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      //  gl.disable(gl.DEPTH_TEST);
      // ----------------------------
      // look up the locations for the inputs to our shaders.
      var u_matLoc = gl.getUniformLocation(program, "u_matrix");
      var colorLoc = gl.getAttribLocation(program, "a_color");
      var vertLoc = gl.getAttribLocation(program, "a_vertex");
      gl.aPointSize = gl.getAttribLocation(program, "a_pointSize");
      // Set the matrix to some that makes 1 unit 1 pixel.
      pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniformMatrix4fv(u_matLoc, false, pixelsToWebGLMatrix);
      // -- data
      var verts = [];
      var colorScale = d3.scale.linear().domain(d3.extent(this.data.map(d => { return d.lag_seconds; }))).range(['rgb(0,0,204)','rgb(189,0,38)']);
      this.data.map(function (d, i) {
        var pixel = LatLongToPixelXY(d.lat, d.lng);
        //-- 2 coord, 3 rgb colors interleaved buffer
        var rgb = d3.rgb(colorScale(d.lag_seconds *  60));
        verts.push(pixel.x, pixel.y, rgb.r/255, rgb.g/255, rgb.b/255);
      });
      var numPoints = this.data.length;
      var vertBuffer = gl.createBuffer();
      var vertArray = new Float32Array(verts);
      var fsize = vertArray.BYTES_PER_ELEMENT;
      gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);
      gl.vertexAttribPointer(vertLoc, 2, gl.FLOAT, false, fsize * 5, 0);
      gl.enableVertexAttribArray(vertLoc);
      // -- offset for color buffer
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, fsize * 5, fsize * 2);
      gl.enableVertexAttribArray(colorLoc);
      glLayer.redraw();
      // Drawing Controls
      var drawnItems = new L.FeatureGroup();
      leafletMap.addLayer(drawnItems);
      // Set the title to show on the polygon button
      var drawControl = new L.Control.Draw({
        draw: {
          polyline: false,
          polygon: false,
          circle: false,
          marker: false
        }
      });
      leafletMap.addControl(drawControl);
      const updateRectData = (layer) => {
        this.scope.$apply(() => {
          this.scope[layer.dataName] = layer.data.map(d => {
            return d.lag_seconds
          })
        });
      }
      leafletMap.on('draw:created', (e) => {
        var type = e.layerType,
          layer = e.layer;
        var coordinates = layer.getLatLngs();
        var bounds = {
          ne: coordinates[2],
          sw: coordinates[0]
        }
        latDim.filterRange([bounds.sw.lat, bounds.ne.lat]);
        lngDim.filterRange([bounds.sw.lng, bounds.ne.lng]);
        layer.data = (lngDim.top(Infinity));
        // add push layer id to an array 
        layer.on('click', function (u) {
          dataNames.push(layer.dataName);
          // indexof and layer id and splice from the list
          layerArr.splice(layerArr.indexOf(drawnItems.getLayerId(layer)), 1);
          drawnItems.removeLayer(layer);
        });
        if (Object.keys(drawnItems._layers).length < 2) {

          layer.dataName = dataNames.shift();
          layerArr.push(drawnItems.getLayerId(layer));
          drawnItems.addLayer(layer);
          updateRectData(layer);
        } else {
          var lastLayer = drawnItems.getLayer(layerArr.shift());
          dataNames.push(lastLayer.dataName);
          layer.dataName = dataNames.shift();
          layerArr.push(drawnItems.getLayerId(layer));
          drawnItems.removeLayer(lastLayer);
          drawnItems.addLayer(layer);
          updateRectData(layer);
        } 
      });

      function drawingOnCanvas(canvasOverlay, params) {
        if (gl == null) return;
        gl.clear(gl.COLOR_BUFFER_BIT);
        pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
        gl.viewport(0, 0, canvas.width, canvas.height);
        var pointSize = Math.max(leafletMap.getZoom() - 4.0, 1.0);
        gl.vertexAttrib1f(gl.aPointSize, pointSize);
        // -- set base matrix to translate canvas pixel coordinates -> webgl coordinates
        mapMatrix.set(pixelsToWebGLMatrix);
        var bounds = leafletMap.getBounds();
        var topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest());
        var offset = LatLongToPixelXY(topLeft.lat, topLeft.lng);
        // -- Scale to current zoom
        var scale = Math.pow(2, leafletMap.getZoom());
        scaleMatrix(mapMatrix, scale, scale);
        translateMatrix(mapMatrix, -offset.x, -offset.y);
        // -- attach matrix value to 'mapMatrix' uniform in shader
        gl.uniformMatrix4fv(u_matLoc, false, mapMatrix);
        gl.drawArrays(gl.POINTS, 0, numPoints);
      }
      // Returns a random integer from 0 to range - 1.
      function randomInt(range) {
        return Math.floor(Math.random() * range);
      }

      function LatLongToPixelXY(latitude, longitude) {
        var pi_180 = Math.PI / 180.0;
        var pi_4 = Math.PI * 4;
        var sinLatitude = Math.sin(latitude * pi_180);
        var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (pi_4)) * 256;
        var pixelX = ((longitude + 180) / 360) * 256;
        var pixel = {
          x: pixelX,
          y: pixelY
        };
        return pixel;
      }

      function translateMatrix(matrix, tx, ty) {
        // translation is in last column of matrix
        matrix[12] += matrix[0] * tx + matrix[4] * ty;
        matrix[13] += matrix[1] * tx + matrix[5] * ty;
        matrix[14] += matrix[2] * tx + matrix[6] * ty;
        matrix[15] += matrix[3] * tx + matrix[7] * ty;
      }

      function scaleMatrix(matrix, scaleX, scaleY) {
        // scaling x and y, which is just scaling first two columns of matrix
        matrix[0] *= scaleX;
        matrix[1] *= scaleX;
        matrix[2] *= scaleX;
        matrix[3] *= scaleX;
        matrix[4] *= scaleY;
        matrix[5] *= scaleY;
        matrix[6] *= scaleY;
        matrix[7] *= scaleY;
      }
    }
    startBayes(y1, y2) {
     var burn_timeout_id, sample_timeout_id, plot_timeout_id;
      var runbayes = function () {
        var n_samples = 40000;
        var n_burnin = 40000;
        var posterior = make_BEST_posterior_func(y1, y2)
        var data_calc = function (params) {
          var mu_diff = params[0] - params[1]
          var sd_diff = params[2] - params[3]
          var effect_size = (params[0] - params[1]) / Math.sqrt((Math.pow(params[2], 2) + Math.pow(params[3], 2)) / 2)
          var normality = Math.log(params[4]) / Math.LN10
          return [mu_diff, sd_diff, normality, effect_size]
        }
        var inits = [jStat.mean(y1), jStat.mean(y2), jStat.stdev(y1), jStat.stdev(y2), 5]
        var sampler = new amwg(inits, posterior, data_calc)
        var count = 0.0;

        function burn_asynch(n) {
          // scope.$apply(function () {
          //   scope.percentDone = "Percent Done\n" + (count / (n_burnin / 500.0) * 100).toFixed(0) + "%"
          // })
          sampler.burn(500)
          count = count + 1;
          if (n > 0) {
            burn_timeout_id = setTimeout(function () {
              burn_asynch(n - 1)
            }, 0)
          } else {
            console.log("\n-- Finished Burn in phase --\n")
            console.log("\n-- Started sampling phase --\n")
            $('#group_diff_plot').css('width', window.innerWidth * .35 );
            $('#group_diff_hist').css('width', window.innerWidth * .35);
            // $("#diff_plots_div").css('z-index', 2);
            // $("#diff_plots_div").show();
            sample_timeout_id = sampler.n_samples_asynch(n_samples, 50)
            plot_asynch()
          }
        }

        function plot_asynch() {
          var plot_start_time = new Date()
          var chain = sampler.get_chain()
          var plot_data = chain_to_plot_data(chain, Math.ceil(n_samples / 1000))
          plot_mcmc_chain("group_diff_plot", plot_data[5], "samples")
            //plot_mcmc_chain("plot3", plot_data[2] , "title2")
            //plot_mcmc_chain("plot5", plot_data[4], "title3")
          plot_mcmc_hist("group_diff_hist", param_chain(chain, 5), true, 0)
            //plot_mcmc_hist("plot4", param_chain(sampler.get_chain(), 2), true)
            //plot_mcmc_hist("plot6", param_chain(sampler.get_chain(), 4), true)
          var plot_time = (new Date()) - plot_start_time
          if (sampler.is_running_asynch()) {
            plot_timeout_id = setTimeout(function () {
              plot_asynch()
            }, plot_time * 2)
          } else {
            //c// $("#more_results_wrapper_div").show();
            //c// log_t_test()
          }
        }
        burn_asynch(Math.ceil(n_burnin / 500));
      }
      runbayes();
    }
  }
  angular.module('fatalvisApp').controller('MainController', MainController);
})();
