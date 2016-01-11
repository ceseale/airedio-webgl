/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/data              ->  index
 */

'use strict';
var csv = require("fast-csv");
  var dataset = [];
  var headers = [ 'doa', 'lag_seconds', 'lat', 'lng' ];
  csv
   .fromPath(__dirname + "/../../static/data.csv")
   .on("data", function(data) {
       if(data[0] !== 'doa') {
        dataset.push({[headers[0]]: Number(data[0]), [headers[1]]: Number(data[1]), [headers[2]]: Number(data[2]), [headers[3]]: Number(data[3]) })
       }
   })

// Gets Data
export function index(req, res) {
  res.json(dataset);
}
