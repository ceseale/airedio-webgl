'use strict';

(function() {

class MainController {

  constructor($http) {
    const setData = (data) => {
      this.data = data.data;
      return true;
    }
    $http.get('api/data').then(setData).then(this.renderMap.bind(this));
  }

  log(stuff) {
    console.log(stuff);
  }

  renderMap() {

    var leafletMap = L.map('map').setView([37.784554114444994, -122.40520477294922], 5);
        L.tileLayer("http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png")
            .addTo(leafletMap);

        var glLayer = L.canvasOverlay()
                       .drawing(drawingOnCanvas)
                       .addTo(leafletMap);
        var canvas = glLayer.canvas();

        glLayer.canvas.width = canvas.clientWidth;
        glLayer.canvas.height = canvas.clientHeight;

        var gl = canvas.getContext('experimental-webgl', { antialias: true });

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

        this.data.map(function (d, i) {
             var pixel = LatLongToPixelXY(d.lat, d.lng);
            //-- 2 coord, 3 rgb colors interleaved buffer
            verts.push(pixel.x, pixel.y, Math.random(), Math.random(), Math.random());
        });

        var numPoints = this.data.length ;

        var vertBuffer = gl.createBuffer();
        var vertArray = new Float32Array(verts);
        var fsize = vertArray.BYTES_PER_ELEMENT;

        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);
        gl.vertexAttribPointer(vertLoc, 2, gl.FLOAT, false,fsize*5,0);
        gl.enableVertexAttribArray(vertLoc);
        // -- offset for color buffer
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, fsize*5, fsize*2);
        gl.enableVertexAttribArray(colorLoc);

        glLayer.redraw();

        // Drawing Controls

        // var drawnItems = new L.FeatureGroup();
        // leafletMap.addLayer(drawnItems);
        // // Set the title to show on the polygon button
        // L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a sexy polygon!';
        // var drawControl = new L.Control.Draw({
        //   draw: {
        //     polyline: false,
        //     polygon: false,
        //     circle: false,
        //     marker: false
        //   }
        // });

        // leafletMap.addControl(drawControl);
        // leafletMap.on('draw:created', function (e) {
        //   var type = e.layerType,
        //     layer = e.layer;
        //     layer.on('click', function (u) {
        //       drawnItems.removeLayer(layer);
        //     });
        //     console.log(drawnItems)
        //     drawnItems.addLayer(layer);
        // });


        // L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a sexy polygon!';
        // var drawControl = new L.Control.Draw({
        //   draw: {
        //     polyline: false,
        //     polygon: false,
        //     circle: false,
        //     marker: false
        //   }
        // });
        // leafletMap.addControl(drawControl);
        // leafletMap.on('draw:created', function (e) {
        //   var type = e.layerType,
        //     layer = e.layer;
        //     layer.on('click', function (u) {
        //       drawnItems.removeLayer(layer);
        //     });
        //     console.log(drawnItems)
        //     drawnItems.addLayer(layer);
        // });

        // var ele = document.createElement('div');
        // ele.className = 'dashboard leaflet-control';
        // ele.appendChild(document.createElement('button'))
        // document.getElementsByClassName('leaflet-top leaflet-left')[0]
        //         .appendChild(ele);

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

            var pixel = { x: pixelX, y: pixelY };

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
}

angular.module('fatalvisApp')
  .controller('MainController', MainController);

})();
