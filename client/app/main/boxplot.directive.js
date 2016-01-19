'use strict';

angular.module('fatalvisApp')
  .directive('boxPlot', function() {
    function link(scope, el, attr) {
      var margin = {top: 10, right: 50, bottom: 20, left: 50},
          width = 120 - margin.left - margin.right,
          height = 230 - margin.top - margin.bottom;
      var min = Infinity,
          max = -Infinity;
          console.log(height)
      var chart = d3.box()
          .whiskers(iqr( 10.5 ))
          .width(width)
          .height(height);

      var data = [scope.data] 

      chart.domain([d3.min(data[0]), d3.max(data[0])] );

      var svg = d3.select(el[0]).selectAll("svg")
        .data(data)
      .enter().append("svg")
        .attr("class", "box")
        .attr("width", "110%" )
        .attr("height", "20%")
      .append("g")
        .attr("transform", "translate(" + 0 + "," + margin.top + ")" + " rotate(90 90 113)")
        .call(chart);
      var check = false; // Flag to make sure the watch function doesn't update domain onload

      scope.$watch('data', function (data){
        if (check && data.length){
          chart.domain([d3.min(data), d3.max(data)] );
          svg.datum(data).call(chart.duration(1000));
        }
        check = true;
      }, true) 

      var check2 = false; // Flag to make sure watch function doesn't update box whiskers onload
      scope.$watch('out', function (out){
        if (check2 && data.length){
          chart.whiskers(iqr(Number (scope.out) || 10.5  ))
          svg.datum(scope.data).call(chart.duration(1000));
        }
        check2 = true ;
      }, true )

      // A function to compute the interquartile range.
      function iqr(k) {
        return function(d, i) {
          var q1 = d.quartiles[0],
              q3 = d.quartiles[2],
              iqr = (q3 - q1) * k,
              i = -1,
              j = d.length;

              scope.med = d.quartiles[1].toFixed(2)
              scope.count = j;
              scope.iqr = (q3 - q1).toFixed(2);

          while (d[++i] < q1 - iqr);
          while (d[--j] > q3 + iqr);
          return [i, j];
        };
      }
    }
    return {
      link: link,
      restrict: 'E',
      template:'<h5 style="text-align: center;" > <b>Count</b>:{{count}} <b>Median</b>:{{med}} <b>IQR</b>:{{iqr}}</h5>',
      scope: { data: '=' , out : '=' }
    };
});
